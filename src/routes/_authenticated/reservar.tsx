import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listServices,
  getAvailability,
  createAppointment,
  getMyProfile,
} from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, Phone, MessageCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reservar")({
  head: () => ({ meta: [{ title: "Reservar — CTNSTUDIO" }] }),
  component: ReservarPage,
});

type Slug = "corte" | "barba" | "combo";

function ReservarPage() {
  const qc = useQueryClient();
  const fetchServices = useServerFn(listServices);
  const fetchAvailability = useServerFn(getAvailability);
  const fetchProfile = useServerFn(getMyProfile);
  const book = useServerFn(createAppointment);

  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const { data: services } = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  const [slug, setSlug] = useState<Slug>("corte");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";

  const { data: avail, isLoading: loadingSlots } = useQuery({
    queryKey: ["availability", dateStr, slug],
    queryFn: () => fetchAvailability({ data: { date: dateStr, serviceSlug: slug } }),
    enabled: !!dateStr && !profile?.blocked,
  });

  if (profile?.blocked) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-8 border-destructive bg-destructive/10 text-center space-y-4">
          <AlertTriangle className="size-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-black">Reserva online bloqueada</h1>
          <p className="text-muted-foreground">
            Has acumulado 3 faltas. Ya no puedes reservar desde la web.
            Llama o escribe por WhatsApp para apartar tu turno.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="tel:+34000000000"><Button className="bg-destructive hover:bg-destructive/90"><Phone className="size-4 mr-2" />Llamar</Button></a>
            <a href="https://wa.me/34000000000" target="_blank" rel="noreferrer">
              <Button variant="outline" className="border-destructive text-destructive"><MessageCircle className="size-4 mr-2" />WhatsApp</Button>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const selectedSvc = services?.find((s) => s.slug === slug);

  async function onBook(iso: string) {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Reservar</h1>
        <p className="text-muted-foreground">Elige servicio, día y hora.</p>
      </div>

      {/* Servicios */}
      <div className="grid sm:grid-cols-3 gap-3">
        {(services ?? []).map((s) => (
          <button
            key={s.slug}
            onClick={() => setSlug(s.slug as Slug)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all",
              slug === s.slug
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40",
            )}
            style={slug === s.slug ? { boxShadow: "var(--glow-purple)" } : undefined}
          >
            <div className="font-bold">{s.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="size-3" /> {s.duration_minutes} min
            </div>
          </button>
        ))}
      </div>

      {/* Contador grande */}
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground">Tiempo total</div>
        <div className="text-5xl font-black text-primary" style={{ textShadow: "var(--glow-purple)" }}>
          {selectedSvc?.duration_minutes ?? 0} <span className="text-2xl text-muted-foreground">min</span>
        </div>
      </Card>

      {/* Calendario + horas */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            className={cn("p-3 pointer-events-auto")}
          />
        </Card>
        <Card className="p-4">
          <h3 className="font-bold mb-3">Horas disponibles</h3>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : !avail?.slots.length ? (
            <p className="text-sm text-muted-foreground">No hay huecos ese día.</p>
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
    </div>
  );
}