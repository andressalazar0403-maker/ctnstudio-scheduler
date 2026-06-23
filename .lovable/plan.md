# Plan: 100% funcional + páginas legales

## 1. Páginas legales nuevas

Tres rutas públicas en `src/routes/` con el mismo header/footer y diseño del sitio:

- **`/terminos`** — Términos y Condiciones
  - Quién es el responsable (CTN Studio / La Navaja Barbería).
  - Uso de la app: reserva de citas, política de cancelación (avisar con X horas), no-show.
  - Cuenta de usuario: login con Google, obligación de datos veraces.
  - Limitación de responsabilidad y modificaciones del servicio.
  - Ley aplicable: España.

- **`/privacidad`** — Política de Privacidad (RGPD)
  - Responsable del tratamiento + email de contacto.
  - Datos recogidos: nombre, email, avatar (Google), historial de citas, teléfono si lo añade.
  - Finalidad: gestionar citas, contactar por WhatsApp, mantener cuenta.
  - Base legal: ejecución de contrato + consentimiento.
  - Encargados: Supabase (hosting BBDD UE), Google (auth), WhatsApp (comunicación).
  - Derechos ARCO-POL (acceso, rectificación, supresión, oposición, portabilidad, limitación) → email del jefe.
  - Plazo de conservación + cookies (solo técnicas de sesión).

- **`/marca`** — Derechos de Marca / Aviso Legal
  - Titularidad: logo, nombre "La Navaja", contenidos, vídeo e imágenes son propiedad de CTN Studio / La Navaja.
  - Prohibido el uso sin autorización.
  - Créditos y contacto.

Enlaces a las 3 páginas en el footer de `index.tsx`. Checkbox "He leído y acepto los términos y la política de privacidad" en el formulario de reserva (bloquea el botón si no se marca) y en el primer login.

## 2. Seguridad de datos del cliente — auditoría final

Estado actual (revisado): RLS activo en todas las tablas, scanner sin findings, `is_admin()` con SECURITY DEFINER, admin gestionado por `admin_emails`. Mejoras pendientes:

- **Validación con Zod en `booking.functions.ts`**: nombre (1-100), email opcional (max 255), teléfono (regex E.164 / nacional, max 20), notas (max 500). Rechazar en `inputValidator` antes de tocar BBDD.
- **Sanitizar el mensaje de WhatsApp**: `encodeURIComponent` en cada campo (nombre, servicio) antes de construir `wa.me/...?text=`. Revisar `index.tsx` y `admin.tsx`.
- **Quitar logs sensibles**: barrer `console.log` que imprima emails, IDs o payloads de cita en `src/lib/*` y rutas.
- **Política RLS de `clients`**: confirmar que solo el admin lee la tabla completa y que un cliente solo ve sus propias filas (`auth.uid() = user_id`).
- **`profiles.email`**: revisar que no esté expuesto a `anon`; solo `authenticated` con `id = auth.uid()` o `is_admin()`.
- **Rate-limit básico de reservas**: en `createAppointment`, rechazar si el mismo `user_id` creó >5 citas en la última hora (consulta count + throw).

## 3. Funcionalidad — últimos remates

- **Confirmación visible al reservar**: tras `createAppointment`, además del toast de WhatsApp, mostrar `AlertDialog` con resumen (servicio, fecha, hora, precio) y botón "Ver mis citas".
- **Recordatorio visual**: en "Mis citas", badge "Hoy" / "Mañana" / "En X días" calculado en cliente.
- **Estado vacío admin**: si no hay citas en el día seleccionado, mostrar ilustración + texto "Sin citas para este día" en lugar de calendario vacío.
- **Favicon + manifest**: verificar que `__root.tsx` apunta a un favicon real (no el de Vite por defecto).
- **404 en español**: traducir `notFoundComponent` de `__root.tsx`.

## 4. Lo que NO se toca

- Pagos online, WhatsApp Business API automática, multi-barbero, push notifications nativas, panel de estadísticas mensual/anual avanzado. Quedan fuera del 100% acordado.

## Detalles técnicos

- Páginas legales: archivos `src/routes/terminos.tsx`, `src/routes/privacidad.tsx`, `src/routes/marca.tsx` con `createFileRoute` y `head()` propio (title + meta description únicos por página).
- Checkbox de aceptación: estado local en el form, no se persiste (basta el acto de marcarlo + timestamp de la cita).
- Zod schemas vivirán en `src/lib/booking.functions.ts` exportados, reutilizados en el front para validación inmediata.
- Rate-limit: query `count` sobre `appointments` filtrado por `user_id` y `created_at > now() - interval '1 hour'` dentro del handler con `requireSupabaseAuth`.
- Footer: componente nuevo `src/components/site-footer.tsx` o sección dentro de `index.tsx` con `<Link to="/terminos">` etc.

## Cuentas admin (sin cambios)

Siguen siendo `andressalazar0403@gmail.com` y `eliot0583@gmail.com`.
