import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — CTNSTUDIO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
  }, [nav]);

  async function signIn() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/",
    });
    if (res.error) {
      toast.error("No pudimos entrar con Google");
      setLoading(false);
      return;
    }
    if (res.redirected) return;
    nav({ to: "/" });
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px circle at 20% 10%, rgba(168, 85, 247, 0.18), transparent 55%), radial-gradient(900px circle at 80% 90%, rgba(255, 115, 0, 0.12), transparent 60%), #050505",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-10 text-center space-y-8 backdrop-blur-md border border-white/10"
        style={{
          backgroundColor: "rgba(18, 18, 20, 0.65)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="inline-flex items-center gap-2 text-white/80 tracking-[0.35em] text-xs">
          <Sparkles className="size-4 text-[#a855f7]" />
          <span style={{ fontFamily: "'Archivo Black', sans-serif" }}>CTNSTUDIO</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-white">
          Entra y reserva tu{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #a855f7, #ff7300)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            corte
          </span>
        </h1>
        <p className="text-white/55 text-sm">
          Un solo botón. Sin contraseñas aburridas.
        </p>
        <Button
          onClick={signIn}
          disabled={loading}
          size="lg"
          className="w-full h-12 rounded-xl bg-white text-[#1a1a1a] hover:bg-white/90 font-semibold text-base shadow-lg"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.1-1.6H12z" />
          </svg>
          <span className="ml-3">Continuar con Google</span>
        </Button>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
          Acceso seguro · Privado
        </p>
      </div>
    </div>
  );
}