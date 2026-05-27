# Plan: Excelencia Técnica CTNSTUDIO

Esto es un cambio grande (canvas + calendario tipo Google Calendar + BD nueva). Lo divido en fases lógicas que se implementarán todas en este turno, pero en orden para evitar regresiones.

## 1. Hero con Canvas (reemplaza `<img>`)

- `src/routes/index.tsx` → reemplazar `<img>` por `<canvas>` a viewport completo.
- Cargar **96 frames pares** (índices 0, 2, 4… 190) con `Promise.all` + `new Image()`.
- Pantalla negra `#050505` bloquea scroll hasta `Promise.all` resuelto.
- Mapear scroll con `useScroll` + `useSpring({ stiffness: 60, damping: 20 })` → `useTransform` a índice de frame.
- Dibujar con `requestAnimationFrame` + `ctx.drawImage` (object-cover calculado).
- Resize listener para mantener DPR nítido.

## 2. Base de datos — cambios

Migración única que añade:

- `services.color` (text, default `#a855f7`) — color por servicio.
- `clients` (tabla nueva): `id, name, email, phone, created_at`. RLS solo admin (select/insert/update/delete).
- `appointments.client_id` (uuid, nullable) — para vincular cita a ficha de cliente.
- `appointments.client_email` (text) — además de `client_name` y `client_phone` ya existentes.
- GRANTs correctos (`authenticated`, `service_role`).

## 3. Server functions admin nuevas

En `src/lib/admin.functions.ts`:

- `listClients()` — para búsqueda predictiva.
- `upsertClient({ name, email, phone })`.
- `deleteClient({ id })`.
- `updateService({ id, color, name, price_cents, duration_minutes })` — para color.
- `moveAppointment({ id, startAt })` — para drag & drop (recalcula `end_at` con duración del servicio).
- `updateAppointmentDetails` — para edición desde modal.

## 4. Calendario cliente full-width

En `src/routes/index.tsx` → `ReservarSection`:

- Quitar grid `lg:grid-cols-2`. Calendario en `Card` con `w-full` y `Calendar` en escala mayor (`className` con `[&_table]:w-full [&_td]:w-[14.28%] [&_button]:w-full [&_button]:h-14`).
- Slots debajo en grid responsivo amplio.

## 5. Calendario admin pro (`src/routes/admin.tsx`)

Reemplazo total de la pestaña Calendario:

- **Vistas**: tabs `Día | Semana | Mes` con estado local.
- **Navegación**: `<` `>` adaptativos (1 día / 7 días / 1 mes) + botón `Hoy`.
- **Grid Día/Semana**: 8:00–21:00, una columna por día, filas de 30 min (px exactos para cálculo). Full `w-full h-full`.
- **Bloques de cita**: posición absoluta calculada por start/end. Color = `service.color`. Texto blanco/contraste.
- **Click normal en cita** → modal `AppointmentDetailDialog` (dark) con Nombre, Servicio, WhatsApp, Email + botones Cancelar/Marcar falta.
- **Drag & Drop**: `pointerdown` en bloque → seguir cursor con `transform`, `pointerup` calcula nuevo `start_at` snap a 15 min y llama `moveAppointment`. Soporta touch.
- **Aguja horaria**: línea absoluta morada (`#a855f7`) con etiqueta `HH:MM` flotante a la izquierda. `setInterval` cada 60 s recalcula `top`.
- **Vista Mes**: grid 7x6 con conteo de citas por día (click → cambia a vista Día).
- **Click en hueco vacío** → `NewAppointmentDialog` con buscador predictivo de clientes (input + lista filtrada por nombre/email/teléfono → autofill al seleccionar; "+ Crear nuevo" si no existe).

## 6. Pestaña Servicios (admin)

- Añadir `<input type="color">` por servicio + guardar con `updateService`.

## 7. Pestaña Clientes (admin)

- Lista de `clients` con buscador.
- Botón **Eliminar** rojo sutil → `AlertDialog` de confirmación → `deleteClient`.

## 8. Acceso admin

Ya está: `andressalazar0403@gmail.com` en `admin_emails` + redirect en `index.tsx` cuando `isAdmin && !isAppLoading`. Sin cambios.

## Detalles técnicos clave

```text
Canvas hero:
  canvas (fixed inset-0, w-screen h-screen)
  ├─ load: Promise.all(96 even frames as Image objects)
  ├─ scroll → useSpring → frame index (0..95)
  └─ rAF loop: ctx.drawImage(images[idx], computedX, Y, W, H)

Admin calendar day/week:
  Container relative h-[840px] (14h * 60px)
  ├─ Hour rows (absolute top = hour*60)
  ├─ Day columns (flex-1)
  ├─ Appointment blocks: absolute top = (startMin-480)*1px, height = duration*1px
  ├─ Time needle: absolute top = (nowMin-480)*1px, full width
  └─ Drag: pointer events → temporary transform → snap & persist
```

## Archivos tocados

- `src/routes/index.tsx` (canvas hero + calendario cliente full-width)
- `src/routes/admin.tsx` (reescritura calendario + clientes + colores)
- `src/lib/admin.functions.ts` (nuevas server fns)
- `src/lib/booking.functions.ts` (asegurar autofill maneja `client_email`)
- Migración SQL nueva.

## Riesgos / notas

- Es un cambio grande. Si algo se rompe, el hero canvas y la migración son lo primero a validar.
- Drag & drop con pointer events nativo (no librería) para mantener bundle bajo.
- La vista Mes es simple (conteos), no bloques completos, para no inflar más.

¿Apruebo y procedo?
