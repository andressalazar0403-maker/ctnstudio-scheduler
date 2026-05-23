import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/booking.functions";
import { Sparkles, Calendar, Settings, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });
  const blocked = profile?.blocked;
  return (
    <div className={cn("min-h-screen flex flex-col", blocked && "blocked-mode")} style={{ background: "var(--background)" }}>
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/reservar" className="flex items-center gap-2 text-primary font-black tracking-widest">
            <Sparkles className="size-4" /> CTNSTUDIO
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/reservar" icon={<Scissors className="size-4" />}>Reservar</NavLink>
            <NavLink to="/mis-citas" icon={<Calendar className="size-4" />}>Mis citas</NavLink>
            <NavLink to="/ajustes" icon={<Settings className="size-4" />}>Ajustes</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
      activeProps={{ className: "text-primary bg-primary/10" }}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}