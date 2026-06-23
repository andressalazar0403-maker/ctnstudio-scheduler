import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — CTNSTUDIO" },
      { name: "description", content: "Términos y condiciones de uso del sistema de reservas online de CTNSTUDIO · La Navaja Barbería." },
      { property: "og:title", content: "Términos y Condiciones — CTNSTUDIO" },
      { property: "og:description", content: "Condiciones de uso del sistema de reservas online." },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero), var(--background)" }}>
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16 space-y-6 text-foreground">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Volver al inicio</Link>
        <h1 className="text-4xl sm:text-5xl font-black text-primary" style={{ textShadow: "var(--glow-purple)" }}>
          Términos y Condiciones
        </h1>
        <p className="text-sm text-muted-foreground">Última actualización: {new Date().toLocaleDateString("es-ES")}</p>

        <Section title="1. Identificación del responsable">
          <p>
            Esta aplicación es operada por <strong>CTNSTUDIO</strong>, marca bajo la que opera la barbería
            <strong> La Navaja</strong>. Para cualquier consulta puedes contactar por WhatsApp al
            <strong> +34 625 629 249</strong>.
          </p>
        </Section>

        <Section title="2. Objeto del servicio">
          <p>
            Esta plataforma permite a los clientes consultar servicios, ver disponibilidad y reservar
            citas en la barbería. El servicio presencial se presta en el establecimiento físico de
            La Navaja.
          </p>
        </Section>

        <Section title="3. Cuenta de usuario">
          <ul className="list-disc pl-5 space-y-2">
            <li>El acceso requiere iniciar sesión con una cuenta de Google verificada.</li>
            <li>El usuario se compromete a facilitar datos veraces y mantenerlos actualizados.</li>
            <li>La cuenta es personal e intransferible.</li>
          </ul>
        </Section>

        <Section title="4. Reservas, cancelaciones y faltas">
          <ul className="list-disc pl-5 space-y-2">
            <li>Las reservas se confirman al instante en la app.</li>
            <li>Puedes cancelar una cita hasta <strong>2 horas antes</strong> de la hora reservada.</li>
            <li>
              Si no acudes a una cita reservada se contabiliza como <em>falta</em>. Tras
              <strong> 3 faltas</strong> tu cuenta queda bloqueada para reservar online y deberás
              contactar directamente con el barbero.
            </li>
            <li>La barbería se reserva el derecho de reasignar o anular citas por causas de fuerza mayor.</li>
          </ul>
        </Section>

        <Section title="5. Precios y pago">
          <p>
            Los precios mostrados están en euros e incluyen impuestos. El pago se realiza presencialmente
            en el establecimiento al finalizar el servicio.
          </p>
        </Section>

        <Section title="6. Uso aceptable">
          <p>
            Queda prohibido el uso de la plataforma con fines fraudulentos, automatizar reservas masivas
            o suplantar a otra persona. El incumplimiento puede dar lugar al bloqueo de la cuenta sin
            previo aviso.
          </p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p>
            La plataforma se ofrece &quot;tal cual&quot;. No garantizamos la disponibilidad ininterrumpida
            del servicio online y no nos hacemos responsables de daños indirectos derivados de su uso.
          </p>
        </Section>

        <Section title="8. Modificaciones">
          <p>
            Podemos actualizar estos términos en cualquier momento. La versión publicada en esta página
            es la vigente. El uso continuado de la app tras un cambio implica su aceptación.
          </p>
        </Section>

        <Section title="9. Ley aplicable">
          <p>
            Estos términos se rigen por la legislación española. Para cualquier controversia las partes
            se someten a los juzgados y tribunales del domicilio del establecimiento.
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