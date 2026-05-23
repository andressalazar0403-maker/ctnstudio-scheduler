# Plan CTNSTUDIO

## 1. Página principal con scroll (1 sola URL `/`)

```text
[ Barra fija arriba: CTNSTUDIO · Reservar · Mis citas · Ajustes · (Admin si jefe) · Salir ]

#inicio       → Espacio reservado para animación de la navaja (40 frames, lo metes tú)
#reservar     → Título XL "CTNSTUDIO" + lista vertical de servicios + calendario + horas
#mis-citas    → Tus citas próximas y pasadas
```

- Una sola ruta `/` con tres secciones `<section id="...">`.
- Click en la barra = scroll suave a la sección.
- `/login` y `/admin` siguen siendo páginas aparte.
- Si no hay sesión: la barra solo muestra "Iniciar sesión" y al hacer click en Reservar/Mis citas redirige a `/login`.

## 2. Servicios (con precio)

Lista vertical, uno debajo del otro:

- Corte — 35 min — €
- Corte + Barba — 55 min — €
- Corte + Barba + Cejas — 65 min — €
- Corte + Cejas — 45 min — €
- Cejas — 10 min — €

El jefe edita nombre, duración y precio desde su panel.

## 3. Mis citas
Lista de citas del cliente: próximas (con botón "Cancelar" si faltan ≥ X horas) y pasadas. Si está bloqueado → modo rojo + WhatsApp/llamar.

## 4. Cancelación
- Cliente puede cancelar su propia cita hasta **X horas antes** (configurable, propongo **2 horas** por defecto, lo puedes cambiar luego en el panel).
- Si no avisa y no aparece, el jefe marca "no-show" en su panel → suma falta. A las 3 faltas el cliente queda bloqueado.

## 5. Panel admin (`/admin`)

**Acceso**: solo `eliot0583@gmail.com`. Al iniciar sesión con Google, si su email coincide ve el botón "Admin" en la barra y puede entrar a `/admin`. Cualquier otro usuario que intente `/admin` → 404.

Secciones del panel:

- **Agenda**: vista día / semana / mes con todas las citas (cliente, servicio, hora).
- **Crear cita manual**: formulario con nombre + teléfono del cliente walk-in + servicio + fecha/hora. Se guarda sin necesidad de que el cliente tenga cuenta.
- **Cancelar cita**: desde la agenda, botón cancelar en cualquier cita.
- **Servicios**: editar nombre, duración (min) y precio. Añadir / borrar servicios.
- **Clientes**: lista con faltas acumuladas. Botones: marcar no-show, desbloquear, resetear contador.
- **Horario**: 24h por defecto, el jefe define qué días y rango de horas trabaja (ej: Lun 10-20, Mar 10-20, etc.). Hasta que lo configure, no hay huecos disponibles → mensaje "el jefe aún no ha configurado horario".

## 6. Detalles técnicos

**Base de datos (cambios):**

- `services`: añadir columna `price_cents int` y permitir que el admin haga INSERT/UPDATE/DELETE (RLS).
- `appointments`: añadir `client_name text` y `client_phone text` nullable (para walk-ins sin cuenta). Si `user_id` está, se ignoran. Añadir status `no_show` y `cancelled`.
- `business_hours`: permitir UPDATE al admin. Por defecto todos los días `closed = true` hasta que el jefe configure.
- Nueva tabla `admin_emails (email text primary key)` con `eliot0583@gmail.com`. Función `is_admin()` security definer que mira si `auth.jwt() ->> 'email'` está ahí. Todas las políticas admin usan `is_admin()`.

**Lógica:**
- `cancelAppointment(id)` server fn: solo el dueño y solo si faltan ≥ 2 h.
- `adminCreateAppointment`, `adminCancelAppointment`, `adminMarkNoShow`, `adminUnblockUser`, `adminUpsertService`, `adminSetBusinessHours`: todas protegidas con `requireSupabaseAuth` + check `is_admin()`.
- `getAvailability` ya respeta `business_hours` (si está cerrado, devuelve [] slots).

**Frontend:**
- Refactor de la página `/`: convertirla en scroll-page con 3 secciones, mover lógica de `/reservar` y nueva sección `mis-citas` ahí.
- Borrar `_authenticated/reservar.tsx` (ya no es ruta).
- Nueva ruta `/admin` (también protegida + check email).
- Hook `useIsAdmin()` que compara `user.email` con lista cliente (la verdad sigue siendo server-side).

## 7. Lo que NO entra en esta entrega

- Animación de los 40 frames (queda el `<div>` placeholder con la altura correcta, tú la enchufas después).
- Pagos / depósitos.
- Notificaciones push o emails de recordatorio.

## Resumen para confirmar

1. Scroll de una página con barra arriba ✅
2. Precios editables por el jefe ✅
3. Cancelación cliente ≥ 2 h antes (luego configurable) ✅
4. Admin = `eliot0583@gmail.com`, ve botón Admin al loguearse ✅
5. Jefe configura horario desde su panel (por defecto cerrado) ✅
6. Citas a mano con nombre + teléfono del walk-in ✅

Si todo esto te encaja, dame luz verde y lo construyo de un tirón.
