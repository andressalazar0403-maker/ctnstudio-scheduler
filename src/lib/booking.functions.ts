import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SLOT_MIN = 15;
const NO_SHOW_GRACE_MIN = 15;
const CANCEL_WINDOW_HOURS = 2;

type Service = { id: string; slug: string; name: string; duration_minutes: number };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Lista pública de servicios. */
export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("id, slug, name, duration_minutes")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
});

/** Barre citas vencidas marcándolas como no_show y actualiza el contador / bloqueo. */
async function sweepNoShowsFor(userId: string) {
  const nowIso = new Date(Date.now() - NO_SHOW_GRACE_MIN * 60_000).toISOString();
  const { data: vencidas, error } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .lt("end_at", nowIso);
  if (error) throw new Error(error.message);
  if (!vencidas?.length) return;

  const ids = vencidas.map((v) => v.id);
  await supabaseAdmin.from("appointments").update({ status: "no_show" }).in("id", ids);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("no_show_count")
    .eq("id", userId)
    .single();
  const newCount = (profile?.no_show_count ?? 0) + ids.length;
  await supabaseAdmin
    .from("profiles")
    .update({ no_show_count: newCount, blocked: newCount >= 3 })
    .eq("id", userId);
}

/** Devuelve el perfil del usuario (incluye blocked). */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await sweepNoShowsFor(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, avatar_url, no_show_count, blocked")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

/** Devuelve los slots de inicio (ISO) disponibles para un día y servicio. */
export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceSlug: z.enum(["corte", "barba", "combo"]),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const [{ data: svc }, { data: hours }] = await Promise.all([
      supabaseAdmin.from("services").select("*").eq("slug", data.serviceSlug).single(),
      supabaseAdmin.from("business_hours").select("*"),
    ]);
    if (!svc) throw new Error("Servicio no encontrado");

    const [y, m, d] = data.date.split("-").map(Number);
    // Trabajamos en hora local del navegador del peluquero — usamos UTC interpretado igual en cliente.
    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const dow = dayStart.getUTCDay();
    const bh = hours?.find((h) => h.day_of_week === dow);
    if (!bh || bh.closed) return { slots: [] as string[], durationMinutes: svc.duration_minutes };

    const [oh, om] = bh.open_time.split(":").map(Number);
    const [ch, cm] = bh.close_time.split(":").map(Number);
    const openMs = Date.UTC(y, m - 1, d, oh, om, 0);
    const closeMs = Date.UTC(y, m - 1, d, ch, cm, 0);
    const durMs = svc.duration_minutes * 60_000;

    // Citas existentes de ese día
    const { data: existing } = await supabaseAdmin
      .from("appointments")
      .select("start_at, end_at, status")
      .gte("start_at", new Date(openMs - durMs).toISOString())
      .lt("start_at", new Date(closeMs).toISOString())
      .in("status", ["scheduled", "completed"]);

    const busy = (existing ?? []).map((a) => ({
      start: new Date(a.start_at).getTime(),
      end: new Date(a.end_at).getTime(),
    }));

    const nowMs = Date.now();
    const slots: string[] = [];
    for (let t = openMs; t + durMs <= closeMs; t += SLOT_MIN * 60_000) {
      if (t < nowMs) continue;
      const end = t + durMs;
      const conflict = busy.some((b) => t < b.end && end > b.start);
      if (!conflict) slots.push(new Date(t).toISOString());
    }
    return { slots, durationMinutes: svc.duration_minutes };
  });

/** Crea una cita validando bloqueo y disponibilidad. */
export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      serviceSlug: z.enum(["corte", "barba", "combo"]),
      startAt: z.string().datetime(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await sweepNoShowsFor(context.userId);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("blocked")
      .eq("id", context.userId)
      .single();
    if (profile?.blocked) throw new Error("Usuario bloqueado. Reserva por teléfono o WhatsApp.");

    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes")
      .eq("slug", data.serviceSlug)
      .single();
    if (!svc) throw new Error("Servicio no encontrado");

    const start = new Date(data.startAt);
    const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
    if (start.getTime() < Date.now()) throw new Error("La hora ya pasó");

    // Comprueba solape
    const { data: overlap } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString())
      .in("status", ["scheduled", "completed"])
      .limit(1);
    if (overlap?.length) throw new Error("Ese hueco ya no está disponible");

    const { data: inserted, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        user_id: context.userId,
        service_id: svc.id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

/** Lista las citas del usuario (pasadas + futuras). */
export const listMyAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await sweepNoShowsFor(context.userId);
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("id, start_at, end_at, status, services(name, slug, duration_minutes)")
      .eq("user_id", context.userId)
      .order("start_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Cancela una cita propia (solo si quedan más de 2h). */
export const cancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, user_id, start_at, status")
      .eq("id", data.id)
      .single();
    if (!appt || appt.user_id !== context.userId) throw new Error("No encontrada");
    if (appt.status !== "scheduled") throw new Error("No se puede cancelar");
    const hoursLeft = (new Date(appt.start_at).getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < CANCEL_WINDOW_HOURS) {
      throw new Error(`Solo se puede cancelar con más de ${CANCEL_WINDOW_HOURS}h de antelación`);
    }
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });