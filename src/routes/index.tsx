import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero), var(--background)" }}>
      {/* Hero con espacio reservado para la animación de la navaja */}
      <section className="relative min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-primary font-black tracking-widest">
            <Sparkles className="size-5" />
            CTNSTUDIO
          </div>
          <Link to="/reservar">
            <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              Entrar
            </Button>
          </Link>
        </header>

        <div className="flex-1 grid lg:grid-cols-2 items-center gap-12 px-6 lg:px-16 py-12">
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-7xl font-black leading-[0.95] tracking-tight">
              Barbería de
              <span className="block text-primary" style={{ textShadow: "var(--glow-purple)" }}>
                superhéroes
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Reserva tu corte en segundos. Sin esperas, sin papeles, sin contraseñas.
            </p>
            <div className="flex gap-3">
              <Link to="/reservar">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                  style={{ boxShadow: "var(--glow-orange)" }}
                >
                  <Scissors className="mr-2 size-4" />
                  Reservar ahora
                </Button>
              </Link>
            </div>
          </div>

          {/* Contenedor reservado para la animación de la navaja (40 frames) */}
          <div
            id="razor-animation-slot"
            className="relative aspect-square w-full max-w-md mx-auto rounded-3xl border border-primary/20 bg-card/40"
            style={{ boxShadow: "var(--glow-purple)" }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              {/* TODO: Cris añadirá aquí los 40 frames secuenciales de la navaja */}
              Animación de navaja
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
