import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/marca")({
  head: () => ({
    meta: [
      { title: "Aviso legal y marca — CTNSTUDIO" },
      { name: "description", content: "Derechos de marca, propiedad intelectual y aviso legal de CTNSTUDIO · La Navaja." },
      { property: "og:title", content: "Aviso legal y marca — CTNSTUDIO" },
      { property: "og:description", content: "Derechos de marca y propiedad intelectual." },
    ],
  }),
  component: MarcaPage,
});

function MarcaPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero), var(--background)" }}>
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16 space-y-6 text-foreground">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Volver al inicio</Link>
        <h1 className="text-4xl sm:text-5xl font-black text-primary" style={{ textShadow: "var(--glow-purple)" }}>
          Aviso legal y derechos de marca
        </h1>
        <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-ES")}</p>

        <Section title="1. Titularidad">
          <p>
            El nombre comercial <strong>CTNSTUDIO</strong>, la marca <strong>La Navaja</strong>, su
            logotipo, identidad visual, vídeos, fotografías, textos, código fuente y cualquier otro
            contenido de esta aplicación son propiedad exclusiva de sus titulares y están protegidos
            por la legislación vigente en materia de propiedad intelectual e industrial.
          </p>
        </Section>

        <Section title="2. Usos no autorizados">
          <p>Sin autorización expresa y por escrito queda prohibido:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Reproducir, copiar, distribuir o modificar los contenidos.</li>
            <li>Utilizar el nombre o el logotipo en otros productos o servicios.</li>
            <li>Realizar ingeniería inversa del software, scraping masivo o reservas automatizadas.</li>
          </ul>
        </Section>

        <Section title="3. Enlaces a terceros">
          <p>
            Esta web puede contener enlaces a servicios de terceros (WhatsApp, Google). No nos hacemos
            responsables de su contenido ni de sus políticas. Te recomendamos revisar sus condiciones
            antes de utilizarlos.
          </p>
        </Section>

        <Section title="4. Contacto">
          <p>
            Para autorizaciones, colaboraciones o denuncia de infracciones, contacta por WhatsApp al
            <strong> +34 625 629 249</strong>.
          </p>
        </Section>
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-accent">{title}</h2>
      <div className="text-sm sm:text-base text-foreground/90 leading-relaxed">{children}</div>
    </section>
  );
}