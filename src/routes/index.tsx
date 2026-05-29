import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScroll, useSpring, useTransform, useMotionValueEvent } from "framer-motion";
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
import { waLink, telLink } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { GlowCard } from "@/components/ui/spotlight-card";
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

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [framesReady, setFramesReady] = useState(0);

  // Pre-carga REAL bloqueante de los 96 fotogramas pares con Promise.all
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const promises = EVEN_FRAME_URLS.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          const done = () => {
            loaded += 1;
            if (!cancelled) setFramesReady(loaded);
            resolve();
          };
          img.onload = done;
          img.onerror = done;
          img.src = url;
        }),
    );

    Promise.all(promises).then(() => {
      if (!cancelled) setIsAppLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Bloquear scroll mientras carga
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isAppLoading ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAppLoading]);

  const fetchAdmin = useServerFn(getMyAdminStatus);
  const { data: adminStatus } = useQuery({
    queryKey: ["admin-status", user?.id],
    queryFn: () => fetchAdmin(),
    enabled: isAuthed,
  });
  const isAdmin = !!adminStatus?.isAdmin;

  // Redirección automática del jefe al dashboard exclusivo
  useEffect(() => {
    if (isAdmin && !isAppLoading) {
      nav({ to: "/admin" });
    }
  }, [isAdmin, isAppLoading, nav]);

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
      className={cn("relative min-h-[350vh]", blocked && "blocked-mode")}
      style={{ background: "var(--gradient-hero), var(--background)" }}
    >
      <AppLoadingScreen visible={isAppLoading} progress={framesReady / EVEN_FRAME_COUNT} />
      <HeroSequence />

      <div className="relative z-10">
        <TopNav
          isAuthed={isAuthed}
          isAdmin={isAdmin}
          loading={loading}
          onLogout={logout}
          onScroll={scrollTo}
        />

        <div id="inicio" className="pt-[110vh]">
          <ReservarSection isAuthed={isAuthed} blocked={blocked} />
          {isAuthed && <MisCitasSection blocked={blocked} />}
        </div>
      </div>
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

/* ---------- Hero: secuencia de 192 frames scroll-driven ---------- */
const FRAME_COUNT = 192;
const FRAME_BASE =
  "https://lgnrmnuwjmewqxmqtwqa.supabase.co/storage/v1/object/public/navaja-video-imagenes";
const FRAME_URLS = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `${FRAME_BASE}/frame_${String(i).padStart(3, "0")}_delay-0.04s.webp`,
);

/** Solo frames pares → 96 imágenes para precarga más rápida y suave. */
const EVEN_FRAME_URLS = FRAME_URLS.filter((_, i) => i % 2 === 0);
const EVEN_FRAME_COUNT = EVEN_FRAME_URLS.length;

/* ---------- Pantalla de carga inicial ---------- */
function AppLoadingScreen({ visible, progress }: { visible: boolean; progress: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{ backgroundColor: "#050505" }}
    >
      <div
        className="relative mb-8 h-14 w-14"
        style={{ filter: "drop-shadow(0 0 18px rgba(168, 85, 247, 0.55))" }}
      >
        <span
          className="absolute inset-0 rounded-full border-2 border-white/10"
          aria-hidden
        />
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "#a855f7",
            borderRightColor: "#7c3aed",
            animationDuration: "0.9s",
          }}
          aria-hidden
        />
      </div>
      <div
        className="text-3xl sm:text-4xl text-white tracking-[0.35em]"
        style={{ fontFamily: "'Archivo Black', sans-serif" }}
      >
        CTNSTUDIO
      </div>
      <div className="mt-6 h-px w-40 overflow-hidden bg-white/10">
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #a855f7, #7c3aed)",
          }}
        />
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.4em] text-white/40">
        Cargando experiencia · {pct}%
      </div>
    </div>
  );
}

function HeroSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const opacityRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  // Cargar las 96 imágenes pares una sola vez
  useEffect(() => {
    const imgs: HTMLImageElement[] = EVEN_FRAME_URLS.map((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      return img;
    });
    imagesRef.current = imgs;
  }, []);

  const { scrollYProgress } = useScroll();
  // Spring suave estilo Apple
  const smooth = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    mass: 0.3,
    restDelta: 0.0001,
  });
  const frame = useTransform(smooth, [0, 0.85], [0, EVEN_FRAME_COUNT - 1], { clamp: true });
  const opacity = useTransform(smooth, [0.85, 1], [1, 0.3], { clamp: true });

  // Canvas + DPR + object-cover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const imgs = imagesRef.current;
      const idx = currentFrameRef.current;
      const img = imgs[idx];
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = opacityRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        // object-cover
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = W / H;
        let dw = W, dh = H, dx = 0, dy = 0;
        if (ir > cr) {
          dh = H;
          dw = H * ir;
          dx = (W - dw) / 2;
        } else {
          dw = W;
          dh = W / ir;
          dy = (H - dh) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useMotionValueEvent(frame, "change", (v) => {
    currentFrameRef.current = Math.round(v);
  });
  useMotionValueEvent(opacity, "change", (v) => {
    opacityRef.current = v;
  });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-0 h-screen w-full pointer-events-none select-none"
      style={{ transform: "translateZ(0)", background: "#050505" }}
    />
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
            <GlowCard
              key={s.id}
              onClick={() => setSlug(s.slug)}
              active={active}
              glowColor={active ? "orange" : "purple"}
            >
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg sm:text-xl font-bold">{s.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="size-3" /> {s.duration_minutes} min
                  </div>
                </div>
                <div
                  className={cn(
                    "text-2xl font-black transition-colors",
                    active ? "text-[hsl(24_100%_55%)]" : "text-accent",
                  )}
                >
                  {(s.price_cents / 100).toFixed(2)}€
                </div>
              </div>
            </GlowCard>
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
            <a href={telLink}>
              <Button className="bg-destructive hover:bg-destructive/90">
                <Phone className="size-4 mr-2" /> Llamar
              </Button>
            </a>
            <a href={waLink("Hola, quiero apartar un turno.")} target="_blank" rel="noreferrer">
              <Button variant="outline" className="border-destructive text-destructive">
                <MessageCircle className="size-4 mr-2" /> WhatsApp
              </Button>
            </a>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 sm:p-6 w-full">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="w-full p-0 pointer-events-auto [&_table]:w-full [&_th]:w-[14.28%] [&_td]:w-[14.28%] [&_button]:w-full [&_button]:h-14 [&_button]:text-base"
            />
          </Card>
          <Card className="p-4 sm:p-6 w-full">
            <h3 className="font-bold mb-4 text-lg">
              Horas disponibles {selected && `· ${selected.name}`}
            </h3>
            {loadingSlots ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : !avail?.slots.length ? (
              <p className="text-sm text-muted-foreground">
                No hay huecos ese día.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {avail.slots.map((iso) => {
                  const d = new Date(iso);
                  const label = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  return (
                    <Button
                      key={iso}
                      variant="outline"
                      disabled={submitting}
                      onClick={() => onBook(iso)}
                      className="h-12 border-primary/30 hover:bg-primary/10 hover:border-primary"
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