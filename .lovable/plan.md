
# CTNSTUDIO — App de reservas para barbería

## Visión general

Web app de reservas en tema oscuro (negro + acentos morado brillante + botones naranja espacial). Solo 3 pantallas accesibles al cliente: **Reservar**, **Mis Citas**, **Ajustes**. Sin pagos. Login con Google. Bloqueo automático tras 3 faltas (no-shows).

---

## Estética

- Fondo negro (`oklch(~0.12 ...)`), superficies un pelín más claras
- Acento principal: morado brillante / neón (`oklch(~0.65 0.27 300)`)
- CTA: naranja espacial (`oklch(~0.72 0.20 50)`)
- Estado "bloqueado": rojo enfadado en toda la UI cuando el usuario llega a 3 faltas
- Tipografía display moderna + sans neutra
- Hero con espacio reservado para la animación de la navaja (40 frames secuenciales en scroll) — dejo un contenedor preparado, el usuario añadirá los frames después

---

## Páginas (rutas TanStack Start)

```
src/routes/
  __root.tsx              # Layout con header + listener de auth + invalidación de queries
  index.tsx               # Landing pública con hero (navaja placeholder) + CTA "Reservar"
  login.tsx               # Botón "Entrar con Google"
  _authenticated.tsx      # Layout que protege rutas privadas
  _authenticated/
    reservar.tsx          # Pantalla 1: elegir servicios + día + hora
    mis-citas.tsx         # Pantalla 2: próximas y pasadas
    ajustes.tsx           # Pantalla 3: foto de Google + cerrar sesión
```

Si el usuario está bloqueado (3 faltas), `reservar.tsx` muestra el estado rojo con mensaje de WhatsApp/teléfono en vez del formulario.

---

## Lógica de servicios y tiempo

Tres servicios fijos:
- Corte → 35 min
- Barba → 20 min
- Corte + Barba → 55 min

UI:
- Selector tipo chips/tarjetas (no se pueden combinar Corte y Barba sueltos: o eliges uno suelto o el combo)
- Contador grande visible que muestra la duración total elegida
- Calendario para elegir día
- Lista de horas disponibles para ese día, calculada en el servidor

### Cálculo de disponibilidad

- Horario laboral fijo configurado en una tabla (ej. L-S 10:00–20:00, domingo cerrado) — el plan inicial mete un horario sensato; el peluquero lo puede ajustar más adelante con un mini admin.
- Slots base cada **15 minutos**.
- Un slot está disponible si **todos** los slots de 15 min que cubren la duración del servicio elegido están libres (no se solapan con citas existentes ni caen fuera del horario).
- El servidor devuelve solo las horas válidas → "nadie tiene que esperar".

---

## Auth + Faltas

### Google login
- Lovable Cloud (Supabase) activado
- Provider Google habilitado vía broker de Lovable (`lovable.auth.signInWithOAuth("google", ...)`)
- Trigger DB que crea fila en `profiles` al registrarse (avatar, nombre, email desde metadata de Google)

### Conteo de faltas (no-shows)
- **Automático**: una server function (llamada al cargar `mis-citas` o `reservar`) marca como `no_show` toda cita `scheduled` cuya hora de fin ya pasó hace más de X minutos sin haberse marcado como `completed`.
- Cada `no_show` suma 1 a `profiles.no_show_count`.
- Cuando `no_show_count >= 3` → `profiles.blocked = true`.
- El usuario puede cancelar una cita con antelación sin penalización (>2h antes).

### Estado bloqueado
- La pantalla **Reservar** se tiñe de rojo, muestra: *"Has acumulado 3 faltas. Ya no puedes reservar online — llama o escribe por WhatsApp"* con botones a `tel:` y `wa.me`.
- El header también marca el estado en rojo.

---

## Backend (Lovable Cloud)

### Tablas

**`profiles`** (1:1 con `auth.users`)
- `id` (uuid, FK auth.users, PK)
- `full_name`, `email`, `avatar_url`
- `no_show_count` (int, default 0)
- `blocked` (bool, default false)
- `created_at`

**`services`** (seed con 3 filas)
- `id`, `slug` (`corte`/`barba`/`combo`), `name`, `duration_minutes`

**`business_hours`** (seed)
- `day_of_week` (0-6), `open_time`, `close_time`, `closed` (bool)

**`appointments`**
- `id` (uuid PK), `user_id` (FK profiles)
- `service_id` (FK services)
- `start_at` (timestamptz), `end_at` (timestamptz)
- `status` (enum: `scheduled` | `completed` | `cancelled` | `no_show`)
- `created_at`

### RLS
- `profiles`: el usuario lee/actualiza solo su fila. `blocked` y `no_show_count` solo escribibles desde server con admin client.
- `appointments`: el usuario ve y cancela solo las suyas. Inserción vía server function (que valida disponibilidad + bloqueo + actualiza no-shows antes).
- `services` y `business_hours`: lectura pública.

### Server functions (`src/lib/*.functions.ts`)

- `getAvailability({ date, serviceSlug })` → devuelve array de slots libres calculados en servidor
- `createAppointment({ serviceSlug, startAt })` → valida (no bloqueado, slot libre), inserta
- `cancelAppointment({ id })` → marca como `cancelled` si es con antelación
- `getMyAppointments()` → próximas + pasadas
- `runNoShowSweep()` → marca no-shows vencidos y actualiza counters/blocked (se llama al cargar las pantallas autenticadas)

---

## Detalles técnicos

- TanStack Start + TanStack Query (`ensureQueryData` en loaders, `useSuspenseQuery` en componentes)
- `_authenticated` layout: `beforeLoad` con `supabase.auth.getUser()` → redirige a `/login` si no hay sesión
- Listener `onAuthStateChange` en `__root.tsx` con `router.invalidate()` + `queryClient.invalidateQueries()`
- `attachSupabaseAuth` en `src/start.ts` para que las server fn lleven el bearer token
- Animación de la navaja: contenedor `<section>` con altura grande, sticky inner, espacio reservado y comentario `TODO: añadir 40 frames secuenciales en scroll` — el usuario la rellena después
- `head()` por ruta con título/descripción específicos (SEO básico)

---

## Pasos de implementación

1. Activar Lovable Cloud + configurar Google OAuth
2. Crear migración: tablas + enum + RLS + seed (servicios, horario)
3. Hook `useAuth` + listener en `__root.tsx` + `attachSupabaseAuth`
4. `/login` con botón Google
5. Layout `_authenticated` con guard
6. Server functions de disponibilidad / citas / no-show sweep
7. Pantalla **Reservar**: selector servicios + contador + calendario + slots + bloqueo rojo
8. Pantalla **Mis Citas**: lista próximas + pasadas + cancelar
9. Pantalla **Ajustes**: avatar + nombre + cerrar sesión
10. Landing pública con hero + placeholder de la animación de navaja
11. Estilos: tokens negro/morado/naranja + variante "blocked" en rojo

---

## Fuera de alcance (confirmado por el usuario)

- Sin pagos / tarjetas / monedas
- Sin panel admin para el peluquero en esta primera versión (horario es seed editable luego)
- La animación de la navaja se monta después con los frames de Cris
