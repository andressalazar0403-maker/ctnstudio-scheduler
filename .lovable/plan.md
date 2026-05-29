## Estado actual

Ya funciona: pre-carga Canvas, login Google premium, panel admin con vistas Día/Semana/Mes, drag & drop, aguja horaria, modal de detalle con WhatsApp/no-show/cancelar, buscador predictivo con autofill, gestión de servicios, horarios, clientes y fichas, inicio/cierre de sesión.

## Lo que falta para llegar al 100%

### 1. Recordatorios automáticos por WhatsApp (cliente)
- Botón "Confirmar por WhatsApp" en cada cita del cliente en `/` (genera link `wa.me` al barbero con resumen de la cita).
- Mensaje de bienvenida automático al crear cita (link `wa.me` abierto en pestaña nueva tras reservar).

### 2. Vista Mes — interacción completa
- Hoy: la vista Mes solo muestra puntos. Falta: click en día → salta a vista Día de esa fecha.
- Contador de citas por día visible (badge con número).

### 3. Hardening del panel admin
- Skeleton/spinner mientras carga la lista de citas (evitar parpadeo al cambiar de día).
- Tecla `Esc` cierra modales; flechas ←/→ navegan días en vista Día.
- Refrescar query tras drag & drop con `invalidateQueries` (ya hay mutación pero conviene confirmar invalidación).

### 4. Estadísticas mínimas en admin
- Tarjetas arriba del calendario: citas hoy, ingresos del día (suma `price_cents`), no-shows del mes, ocupación %.

### 5. Notificaciones in-app
- Toast cuando entra una cita nueva mientras el admin tiene el panel abierto (Supabase Realtime sobre `appointments`).

### 6. QA y limpieza final
- Quitar import muerto `requireSupabaseAuth` no usado en `admin.functions.ts` (sigue importado tras refactor de `getMyAdminStatus`).
- Verificar que `getMyAdminStatus` ya no lanza 401 (fix de turno anterior aplicado).
- Pasar build dev y revisar consola sin errores en `/`, `/login` y `/admin`.

### 7. SEO y meta
- `head()` único por ruta (`/`, `/login`, `/admin`) con título y description coherentes (Admin ya tiene; faltan og:image en home).

## Detalles técnicos

- WhatsApp: número del barbero en variable `BARBER_PHONE` en `src/lib/constants.ts`. Formato `https://wa.me/<phone>?text=<encoded>`.
- Vista Mes: añadir `onClick` en la celda del día que haga `setView("day"); setCursor(date)`.
- Realtime: `supabase.channel("appts").on("postgres_changes", { event: "INSERT", schema: "public", table: "appointments" }, () => { qc.invalidateQueries(); toast("Nueva cita") }).subscribe()`.
- Estadísticas: derivar del array ya cargado por `adminListAppointments` del día/mes — sin queries extra.

## Fuera de alcance (lo dejamos así salvo que pidas)

- Pagos online.
- Notificaciones push reales (PWA).
- Multi-barbero.
