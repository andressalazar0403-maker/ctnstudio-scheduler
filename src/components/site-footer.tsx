import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center gap-4 text-center">
        <div className="text-sm text-muted-foreground">
          © {year} CTNSTUDIO · La Navaja Barbería. Todos los derechos reservados.
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/terminos" className="text-muted-foreground hover:text-primary transition-colors">
            Términos y condiciones
          </Link>
          <span className="text-border">·</span>
          <Link to="/privacidad" className="text-muted-foreground hover:text-primary transition-colors">
            Privacidad
          </Link>
          <span className="text-border">·</span>
          <Link to="/marca" className="text-muted-foreground hover:text-primary transition-colors">
            Aviso legal y marca
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground/70 max-w-xl">
          Al reservar una cita aceptas nuestros{" "}
          <Link to="/terminos" className="underline hover:text-primary">términos</Link>{" "}
          y la{" "}
          <Link to="/privacidad" className="underline hover:text-primary">política de privacidad</Link>.
        </p>
      </div>
    </footer>
  );
}