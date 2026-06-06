# Plan: llevar CTNSTUDIO al 100%

Implemento de una sola tanda todo lo pendiente del `.lovable/plan.md`, sin tocar lo que ya funciona (auth, reservas, drag & drop, gestión de servicios/horarios/clientes, eliminar usuario, etc.).

## 1. WhatsApp para el cliente (en `/`)
- Tras crear una cita: toast con botón **"Confirmar por WhatsApp"** que abre `wa.me/+34625629249` con un mensaje pre-rellenado (servicio, fecha, hora, nombre).
- En la lista "Mis citas" del cliente: botón WhatsApp por cita para reenviar la confirmación al jefe.

## 2. Panel admin — vista Mes interactiva
- Click en un día → cambia a vista **Día** posicionada en esa fecha.
- Badge con el número de citas por día (en lugar de solo puntos).

## 3. Panel admin — UX hardening
- Skeleton mientras carga la lista de citas (evita parpadeo al cambiar día).
- Atajos de teclado: `Esc` cierra modales, `←` / `→` navegan días en vista Día.
- Confirmar que el drag & drop invalida la query (`invalidateQueries`) tras mover una cita.

## 4. Panel admin — estadísticas del día
Tarjetas arriba del calendario, derivadas del array ya cargado (sin queries extra):
- Citas hoy
- Ingresos del día (suma `price_cents`)
- No-shows del mes
- Ocupación % (minutos reservados / minutos disponibles según `business_hours`)

## 5. Notificaciones en tiempo real
- Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments`.
- En `/admin`: suscripción `supabase.channel("appts").on("postgres_changes", ...)` que invalida la query y muestra un toast **"Nueva cita"** cuando entra un `INSERT`.

## 6. SEO / meta
- Verificar que `/`, `/login` y `/admin` tienen `head()` único con title + description + og:image coherentes.

## 7. Limpieza
- Quitar imports muertos en `admin.functions.ts` (`requireSupabaseAuth` no usado tras refactor).
- Revisar consola en `/`, `/login` y `/admin` para confirmar 0 errores.

## Detalles técnicos

- **WhatsApp**: usar la constante `BARBER_PHONE` ya existente en `src/lib/constants.ts`. Formato: `https://wa.me/34625629249?text=${encodeURIComponent(msg)}`.
- **Vista Mes**: en la celda del día, `onClick={() => { setView("day"); setCursor(date); }}`. El badge se calcula con un `Map<dateKey, count>` sobre las citas del mes.
- **Atajos**: `useEffect` global en `/admin` con `window.addEventListener("keydown", ...)`, limpiar en cleanup.
- **Realtime**: un único `useEffect` en el componente admin que crea el canal y lo cierra en cleanup. Usar `queryClient.invalidateQueries({ queryKey: ["admin-appointments"] })`.
- **Estadísticas**: calcular con `useMemo` sobre la lista de citas; no añadir endpoints nuevos.
- **Cuentas admin**: se quedan las 2 actuales (`andressalazar0403@gmail.com`, `eliot0583@gmail.com`). No se tocan.

## Fuera de alcance (no se toca)
- Pagos online.
- Push notifications / PWA.
- Multi-barbero.
- WhatsApp Business API automática (sigue siendo link `wa.me` que abre el chat).

Una vez aprobado, lo implemento todo seguido y te aviso para publicar.
