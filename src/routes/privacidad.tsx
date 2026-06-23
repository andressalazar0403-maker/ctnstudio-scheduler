import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — CTNSTUDIO" },
      { name: "description", content: "Cómo CTNSTUDIO · La Navaja trata tus datos personales conforme al RGPD." },
      { property: "og:title", content: "Política de Privacidad — CTNSTUDIO" },
      { property: "og:description", content: "Tratamiento de datos personales conforme al RGPD." },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero), var(--background)" }}>
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16 space-y-6 text-foreground">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Volver al inicio</Link>
        <h1 className="text-4xl sm:text-5xl font-black text-primary" style={{ textShadow: "var(--glow-purple)" }}>
          Política de Privacidad
        </h1>
        <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-ES")}</p>

        <Section title="1. Responsable del tratamiento">
          <p>
            <strong>CTNSTUDIO</strong>, titular de la barbería <strong>La Navaja</strong>, es
            responsable del tratamiento de tus datos. Contacto: WhatsApp <strong>+34 625 629 249</strong>.
          </p>
        </Section>

        <Section title="2. Datos que recogemos">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Identificación:</strong> nombre, email y avatar de tu cuenta de Google.</li>
            <li><strong>Citas:</strong> servicio reservado, fecha y hora, estado (completada, cancelada, falta).</li>
            <li><strong>Comunicación:</strong> mensajes que tú nos envíes voluntariamente por WhatsApp.</li>
            <li><strong>Técnicos:</strong> token de sesión almacenado en tu navegador para mantenerte conectado.</li>
          </ul>
        </Section>

        <Section title="3. Finalidades y base legal">
          <ul className="list-disc pl-5 space-y-2">
            <li>Gestionar tus reservas y el historial de citas — <em>ejecución de un contrato</em>.</li>
            <li>Contactarte cuando confirmas la cita por WhatsApp — <em>consentimiento</em> al pulsar el botón.</li>
            <li>Prevenir el abuso del sistema (bloqueo por faltas reiteradas) — <em>interés legítimo</em>.</li>
          </ul>
        </Section>

        <Section title="4. Destinatarios y encargados">
          <p>No vendemos ni cedemos tus datos. Para prestar el servicio empleamos:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Supabase</strong> (hosting de base de datos y autenticación, infraestructura en la UE).</li>
            <li><strong>Google</strong> (proveedor de identidad para el inicio de sesión).</li>
            <li><strong>WhatsApp / Meta</strong> (canal de comunicación que tú inicias).</li>
          </ul>
        </Section>

        <Section title="5. Plazo de conservación">
          <p>
            Conservamos tus datos mientras tu cuenta permanezca activa. Si solicitas la eliminación,
            borramos tu perfil y citas asociadas en un plazo máximo de 30 días, salvo obligaciones
            legales de conservación.
          </p>
        </Section>

        <Section title="6. Tus derechos (RGPD)">
          <p>
            Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión,
            oposición, limitación y portabilidad, escribiendo por WhatsApp al <strong>+34 625 629 249</strong>.
            Tienes también derecho a presentar una reclamación ante la Agencia Española de Protección
            de Datos (www.aepd.es).
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Solo usamos almacenamiento técnico estrictamente necesario para mantener tu sesión iniciada.
            No utilizamos cookies de analítica ni publicitarias.
          </p>
        </Section>

        <Section title="8. Seguridad">
          <p>
            Aplicamos cifrado en tránsito (HTTPS), control de acceso por filas (RLS) en la base de datos
            y políticas de mínimo privilegio. Aun así, ningún sistema es 100 % infalible: te recomendamos
            cerrar sesión en dispositivos compartidos.
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