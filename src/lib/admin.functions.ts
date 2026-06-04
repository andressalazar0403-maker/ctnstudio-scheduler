import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Determina si un userId verificado por el middleware es admin.
 * Usa el email CONFIRMADO de auth.users (no el del JWT) para evitar
 * escalada de privilegios por claims manipulados o emails no verificados.
 */
async function isAdminUserId(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) return false;
  const email = data.user.email;
  if (!email || !data.user.email_confirmed_at) return false;
  const { data: row } = await supabaseAdmin
    .from("admin_emails")
    .select("email")
    .ilike("email", email)
    .maybeSingle();
  return !!row;
}

async function assertAdmin(userId: string): Promise<void> {
  if (!(await isAdminUserId(userId))) throw new Error("No autorizado");
}

/** Lanza un error genérico tras loguear el original en el servidor. */
function failSafe(context: string, error: unknown): never {
  console.error(`[admin.functions:${context}]`, error);
  throw new Error("No se pudo completar la operación");
}

/** El usuario actual: ¿es admin? */
export const getMyAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: await isAdminUserId(context.userId) };
  });

/** Lista citas en un rango (UTC ISO). */
export const adminListAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ fromIso: z.string().datetime(), toIso: z.string().datetime() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select("id, start_at, end_at, status, client_name, client_phone, client_email, client_id, user_id, services(name, slug, duration_minutes, price_cents, color), profiles(full_name, email)")
      .gte("start_at", data.fromIso)
      .lt("start_at", data.toIso)
      .order("start_at", { ascending: true });
    if (error) failSafe("adminListAppointments", error);
    return rows ?? [];
  });

export const adminCreateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      serviceId: z.string().uuid(),
      startAt: z.string().datetime(),
      clientName: z.string().min(1).max(120),
      clientPhone: z.string().min(3).max(40),
      clientEmail: z.string().email().max(160).optional().nullable(),
      clientId: z.string().uuid().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("duration_minutes")
      .eq("id", data.serviceId)
      .single();
    if (!svc) throw new Error("Servicio no encontrado");
    const start = new Date(data.startAt);
    const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
    const { error } = await supabaseAdmin.from("appointments").insert({
      service_id: data.serviceId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      client_name: data.clientName,
      client_phone: data.clientPhone,
      client_email: data.clientEmail ?? null,
      client_id: data.clientId ?? null,
    });
    if (error) failSafe("adminCreateAppointment", error);
    return { ok: true };
  });

export const adminCancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) failSafe("adminCancelAppointment", error);
    return { ok: true };
  });

export const adminMarkNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("user_id, status")
      .eq("id", data.id)
      .single();
    if (!appt) throw new Error("No encontrada");
    await supabaseAdmin.from("appointments").update({ status: "no_show" }).eq("id", data.id);
    if (appt.user_id) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("no_show_count")
        .eq("id", appt.user_id)
        .single();
      const newCount = (p?.no_show_count ?? 0) + 1;
      await supabaseAdmin
        .from("profiles")
        .update({ no_show_count: newCount, blocked: newCount >= 3 })
        .eq("id", appt.user_id);
    }
    return { ok: true };
  });

export const adminListClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, no_show_count, blocked")
      .order("created_at", { ascending: false });
    if (error) failSafe("adminListClients", error);
    return data ?? [];
  });

export const adminSetClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      blocked: z.boolean().optional(),
      no_show_count: z.number().int().min(0).max(99).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const update: { blocked?: boolean; no_show_count?: number } = {};
    if (typeof data.blocked === "boolean") update.blocked = data.blocked;
    if (typeof data.no_show_count === "number") update.no_show_count = data.no_show_count;
    if (!Object.keys(update).length) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", data.userId);
    if (error) failSafe("adminSetClient", error);
    return { ok: true };
  });

/** Elimina un usuario registrado (auth + perfil + citas). */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("No puedes eliminarte a ti mismo");
    }
    if (await isAdminUserId(data.userId)) {
      throw new Error("No se puede eliminar a otro administrador");
    }
    // Borra citas y perfil primero (por si no hay cascada configurada en auth.users)
    await supabaseAdmin.from("appointments").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) failSafe("adminDeleteUser", error);
    return { ok: true };
  });

export const adminUpsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(120),
      duration_minutes: z.number().int().min(5).max(600),
      price_cents: z.number().int().min(0).max(1_000_000),
      sort_order: z.number().int().min(0).max(999),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("services")
        .update({
          slug: data.slug,
          name: data.name,
          duration_minutes: data.duration_minutes,
          price_cents: data.price_cents,
          sort_order: data.sort_order,
          ...(data.color ? { color: data.color } : {}),
        })
        .eq("id", data.id);
      if (error) failSafe("adminUpsertService.update", error);
    } else {
      const { error } = await supabaseAdmin.from("services").insert({
        slug: data.slug,
        name: data.name,
        duration_minutes: data.duration_minutes,
        price_cents: data.price_cents,
        sort_order: data.sort_order,
        ...(data.color ? { color: data.color } : {}),
      });
      if (error) failSafe("adminUpsertService.insert", error);
    }
    return { ok: true };
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("services").delete().eq("id", data.id);
    if (error) failSafe("adminDeleteService", error);
    return { ok: true };
  });

export const adminListBusinessHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("business_hours")
      .select("*")
      .order("day_of_week");
    if (error) failSafe("adminListBusinessHours", error);
    return data ?? [];
  });

export const adminSetBusinessHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      open_time: z.string().regex(/^\d{2}:\d{2}$/),
      close_time: z.string().regex(/^\d{2}:\d{2}$/),
      closed: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("business_hours")
      .update({
        open_time: data.open_time,
        close_time: data.close_time,
        closed: data.closed,
      })
      .eq("day_of_week", data.day_of_week);
    if (error) failSafe("adminSetBusinessHours", error);
    return { ok: true };
  });

/* ============ Fichas de clientes (tabla clients) ============ */

export const adminListClientCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, phone, notes, created_at")
      .order("name", { ascending: true });
    if (error) failSafe("adminListClientCards", error);
    return data ?? [];
  });

export const adminUpsertClientCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(120),
      email: z.string().email().max(160).optional().nullable(),
      phone: z.string().max(40).optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("clients").update(payload).eq("id", data.id);
      if (error) failSafe("adminUpsertClientCard.update", error);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error) failSafe("adminUpsertClientCard.insert", error);
    return { id: row.id };
  });

export const adminDeleteClientCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("clients").delete().eq("id", data.id);
    if (error) failSafe("adminDeleteClientCard", error);
    return { ok: true };
  });

/* ============ Mover cita (drag & drop) ============ */

export const adminMoveAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      startAt: z.string().datetime(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: appt, error: e1 } = await supabaseAdmin
      .from("appointments")
      .select("service_id, services(duration_minutes)")
      .eq("id", data.id)
      .single();
    if (e1 || !appt) {
      if (e1) console.error("[admin.functions:adminMoveAppointment.fetch]", e1);
      throw new Error("Cita no encontrada");
    }
    const svc = Array.isArray(appt.services) ? appt.services[0] : appt.services;
    const duration = svc?.duration_minutes ?? 30;
    const start = new Date(data.startAt);
    const end = new Date(start.getTime() + duration * 60_000);
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ start_at: start.toISOString(), end_at: end.toISOString() })
      .eq("id", data.id);
    if (error) failSafe("adminMoveAppointment.update", error);
    return { ok: true };
  });