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
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--gradient-hero), var(--background)" }}
    >
      <div className="w-full max-w-md text-center space-y-8">
        <div className="inline-flex items-center gap-2 text-primary font-black tracking-widest">
          <Sparkles className="size-5" /> CTNSTUDIO
        </div>
        <h1 className="text-4xl font-black leading-tight">
          Entra y reserva tu <span className="text-primary">corte</span>
        </h1>
        <p className="text-muted-foreground">Un solo botón. Sin contraseñas aburridas.</p>
        <Button
          onClick={signIn}
          disabled={loading}
          size="lg"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base"
          style={{ boxShadow: "var(--glow-orange)" }}
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.1-1.6H12z"/>
          </svg>
          <span className="ml-3">Continuar con Google</span>
        </Button>
      </div>
    </div>
  );
}