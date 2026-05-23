import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  listServices,
  getAvailability,
  createAppointment,
  getMyProfile,
  listMyAppointments,
  cancelAppointment,
} from "@/lib/booking.functions";
import { getMyAdminStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar as CalIcon,
  Clock,
  LogIn,
  LogOut,
  MessageCircle,
  Phone,
  Scissors,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CTNSTUDIO — Barbería" },
      { name: "description", content: "Reserva tu corte en CTNSTUDIO. Rápido, sin esperas." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const isAuthed = !!user;

  const fetchAdmin = useServerFn(getMyAdminStatus);
  const { data: adminStatus } = useQuery({
    queryKey: ["admin-status", user?.id],
    queryFn: () => fetchAdmin(),
    enabled: isAuthed,
  });
  const isAdmin = !!adminStatus?.isAdmin;

  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => fetchProfile(),
    enabled: isAuthed,
  });
  const blocked = !!profile?.blocked;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function logout() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <div
      className={cn("min-h-screen", blocked && "blocked-mode")}
      style={{ background: "var(--gradient-hero), var(--background)" }}
    >
      <TopNav
        isAuthed={isAuthed}
        isAdmin={isAdmin}
        loading={loading}
        onLogout={logout}
        onScroll={scrollTo}
      />

      <HeroSection />

      <ReservarSection isAuthed={isAuthed} blocked={blocked} />

      {isAuthed && <MisCitasSection blocked={blocked} />}
    </div>
  );
}

/* ---------- Top nav ---------- */
function TopNav({
  isAuthed,
  isAdmin,
  loading,
  onLogout,
  onScroll,
}: {
  isAuthed: boolean;
  isAdmin: boolean;
  loading: boolean;
  onLogout: () => void;
  onScroll: (id: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <button
          onClick={() => onScroll("inicio")}
          className="flex items-center gap-2 text-primary font-black tracking-widest"
        >
          <Sparkles className="size-4" />
          <span>CTNSTUDIO</span>
        </button>
        <nav className="flex items-center gap-1">
          <NavBtn icon={<Scissors className="size-4" />} onClick={() => onScroll("reservar")}>
            Reservar
          </NavBtn>
          {isAuthed && (
            <NavBtn icon={<CalIcon className="size-4" />} onClick={() => onScroll("mis-citas")}>
              Mis citas
            </NavBtn>
          )}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="size-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
          {!loading && !isAuthed && (
            <Link to="/login">
              <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            </Link>
          )}
          {isAuthed && (
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavBtn({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="gap-2">
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Button>
  );
}

/* ---------- Sección 1: hero / animación ---------- */
function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-[calc(100vh-60px)] flex items-center justify-center px-6"
    >
      <div
        id="razor-animation-slot"
        className="relative w-full max-w-3xl aspect-square rounded-3xl border border-primary/20 bg-card/30 flex items-center justify-center"
        style={{ boxShadow: "var(--glow-purple)" }}
      >
        {/* TODO: Cris añadirá aquí los 40 frames secuenciales de la navaja */}
        <p className="text-muted-foreground text-sm">Espacio reservado para la animación</p>
      </div>
    </section>
  );
}

/* ---------- Sección 2: Reservar ---------- */
function ReservarSection({ isAuthed, blocked }: { isAuthed: boolean; blocked: boolean }) {
  const qc = useQueryClient();
  const fetchServices = useServerFn(listServices);
  const fetchAvailability = useServerFn(getAvailability);
  const book = useServerFn(createAppointment);

  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  const [slug, setSlug] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug && services?.length) setSlug(services[0].slug);
  }, [services, slug]);

  const selected = useMemo(
    () => services?.find((s) => s.slug === slug) ?? null,
    [services, slug],
  );

  const dateStr = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

  const { data: avail, isLoading: loadingSlots } = useQuery({
    queryKey: ["availability", dateStr, slug],
    queryFn: () => fetchAvailability({ data: { date: dateStr, serviceSlug: slug! } }),
    enabled: !!dateStr && !!slug && isAuthed && !blocked,
  });

  async function onBook(iso: string) {
    if (!slug) return;
    setSubmitting(true);
    try {
      await book({ data: { serviceSlug: slug, startAt: iso } });
      toast.success("¡Cita reservada!");
      qc.invalidateQueries({ queryKey: ["availability"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo reservar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reservar" className="px-4 sm:px-6 py-20 max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <h1
          className="text-6xl sm:text-8xl font-black tracking-tighter text-primary"
          style={{ textShadow: "var(--glow-purple)" }}
        >
          CTNSTUDIO
        </h1>
        <p className="text-muted-foreground text-lg">Elige tu servicio, día y hora.</p>
      </div>

      {/* Lista vertical de servicios */}
      <div className="space-y-3">
        {(services ?? []).map((s) => {
          const active = s.slug === slug;
          return (
            <button
              key={s.id}
              onClick={() => setSlug(s.slug)}
              className={cn(
                "w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-4",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
              style={active ? { boxShadow: "var(--glow-purple)" } : undefined}
            >
              <div>
                <div className="text-lg sm:text-xl font-bold">{s.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="size-3" /> {s.duration_minutes} min
                </div>
              </div>
              <div className="text-2xl font-black text-accent">
                {(s.price_cents / 100).toFixed(2)}€
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA por estado */}
      {!isAuthed ? (
        <Card className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            Inicia sesión con Google para ver huecos disponibles y reservar.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <LogIn className="size-4 mr-2" /> Iniciar sesión
            </Button>
          </Link>
        </Card>
      ) : blocked ? (
        <Card className="p-8 border-destructive bg-destructive/10 text-center space-y-4">
          <AlertTriangle className="size-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-black">Reserva online bloqueada</h2>
          <p className="text-muted-foreground">
            Has acumulado 3 faltas. Llama o escribe por WhatsApp para apartar tu turno.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="tel:+34000000000">
              <Button className="bg-destructive hover:bg-destructive/90">
                <Phone className="size-4 mr-2" /> Llamar
              </Button>
            </a>
            <a href="https://wa.me/34000000000" target="_blank" rel="noreferrer">
              <Button variant="outline" className="border-destructive text-destructive">
                <MessageCircle className="size-4 mr-2" /> WhatsApp
              </Button>
            </a>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="p-3 pointer-events-auto"
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-bold mb-3">
              Horas disponibles {selected && `· ${selected.name}`}
            </h3>
            {loadingSlots ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : !avail?.slots.length ? (
              <p className="text-sm text-muted-foreground">
                No hay huecos ese día. (El jefe quizá no ha configurado el horario aún.)
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                {avail.slots.map((iso) => {
                  const d = new Date(iso);
                  const label = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  return (
                    <Button
                      key={iso}
                      variant="outline"
                      disabled={submitting}
                      onClick={() => onBook(iso)}
                      className="border-primary/30 hover:bg-primary/10 hover:border-primary"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}

/* ---------- Sección 3: Mis citas ---------- */
function MisCitasSection({ blocked }: { blocked: boolean }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyAppointments);
  const cancelFn = useServerFn(cancelAppointment);

  const { data: appts } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => fetchList(),
  });

  const now = Date.now();
  const upcoming = (appts ?? []).filter(
    (a) => a.status === "scheduled" && new Date(a.start_at).getTime() >= now,
  );
  const past = (appts ?? []).filter(
    (a) => a.status !== "scheduled" || new Date(a.start_at).getTime() < now,
  );

  async function onCancel(id: string) {
    try {
      await cancelFn({ data: { id } });
      toast.success("Cita cancelada");
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  return (
    <section id="mis-citas" className="px-4 sm:px-6 py-20 max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-black">Mis citas</h2>
        <p className="text-muted-foreground">Tus reservas, próximas y pasadas.</p>
        {blocked && (
          <p className="text-destructive text-sm mt-2">
            Estás bloqueado para reservar online. Solo el jefe puede gestionar tus citas.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Próximas</h3>
        {!upcoming.length ? (
          <Card className="p-6 text-center text-muted-foreground">No tienes citas pendientes.</Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => {
              const d = new Date(a.start_at);
              const hoursLeft = (d.getTime() - now) / 3_600_000;
              const canCancel = hoursLeft >= 2;
              const svc = Array.isArray(a.services) ? a.services[0] : a.services;
              return (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{svc?.name ?? "Servicio"}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.toLocaleString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canCancel}
                    title={canCancel ? "Cancelar" : "Solo con +2h de antelación"}
                    onClick={() => onCancel(a.id)}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="size-4 mr-1" /> Cancelar
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Pasadas</h3>
        {!past.length ? (
          <Card className="p-6 text-center text-muted-foreground">Sin historial todavía.</Card>
        ) : (
          <div className="space-y-2">
            {past.map((a) => {
              const d = new Date(a.start_at);
              const svc = Array.isArray(a.services) ? a.services[0] : a.services;
              const tag =
                a.status === "no_show"
                  ? { label: "Falta", className: "text-destructive" }
                  : a.status === "cancelled"
                    ? { label: "Cancelada", className: "text-muted-foreground" }
                    : { label: "Completada", className: "text-primary" };
              return (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-3 opacity-80">
                  <div>
                    <div className="font-bold">{svc?.name ?? "Servicio"}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold uppercase", tag.className)}>{tag.label}</span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}