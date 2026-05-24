## Hero scroll-driven con 192 frames

Reemplaza el `<video>` actual por una secuencia de 192 `.webp` servidos desde el bucket público `navaja-video-imagenes`, controlada por scroll con `framer-motion` + `useSpring`. La secuencia vive como fondo fijo a pantalla completa y todo el resto del contenido flota por encima.

### Cambios

**`src/routes/index.tsx`**

1. Borrar `HeroSection` (la del `<video src="/navaja.mp4">`) y crear `HeroSequence`.
2. Reestructurar `HomePage`:
   - Contenedor raíz: `relative min-h-[350vh]`.
   - `<HeroSequence />` (fixed inset-0 -z-10).
   - Wrapper `relative z-10` que contiene `TopNav` + un div con `id="inicio"` y `pt-[110vh]` que envuelve `ReservarSection` y `MisCitasSection`.
3. Quitar el import de `motion` (ya no se usa `motion.div`).

**`HeroSequence` — lógica**

```tsx
const FRAME_COUNT = 192;
const BASE = "https://lgnrmnuwjmewqxmqtwqa.supabase.co/storage/v1/object/public/navaja-video-imagenes";
const urls = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `${BASE}/frame_${String(i).padStart(3, "0")}_delay-0.04s.webp`
);
```

- Precargar las 192 imágenes en un `useRef<HTMLImageElement[]>` dentro de `useEffect` (crea `new Image()`, asigna `src`, las guarda en el array).
- `<canvas>` con `className="fixed inset-0 w-full h-screen object-cover -z-10"` y un `ref`. En el primer load dimensionar el canvas a `window.innerWidth × window.innerHeight` (con `devicePixelRatio`) y redibujar en `resize`.
- `useScroll()` global (sin `target`) → `scrollYProgress`.
- `const smooth = useSpring(scrollYProgress, { damping: 30, stiffness: 200 });`
- `const frame = useTransform(smooth, [0, 0.8], [0, FRAME_COUNT - 1], { clamp: true });`
- `const opacity = useTransform(smooth, [0.8, 1], [1, 0.27]);`
- `useMotionValueEvent(frame, "change", v => drawFrame(Math.round(v)))` — dibuja la imagen precargada con `ctx.drawImage(img, 0, 0, w, h)` usando `object-cover` (calcular escala para cubrir manteniendo ratio).
- `useMotionValueEvent(opacity, "change", v => { canvas.style.opacity = String(v); })`.
- Dibujar frame 0 en cuanto la primera imagen carga.

**Por qué canvas y no `<img>` swap**: cambiar `img.src` 192 veces provoca flicker y reflow; con canvas + preload el cambio de frame es un `drawImage` instantáneo y suave bajo el spring.

### Lo que NO cambia

- `ReservarSection`, `MisCitasSection`, `TopNav`, rutas `/admin` y `/login`, lógica de booking, RLS, base de datos. Solo se toca `src/routes/index.tsx`.
- `public/navaja.mp4` se queda (no estorba, lo borramos si quieres).

### Resultado

- 0–80% scroll: los 192 frames se barren con suavidad milimétrica gracias al spring.
- 80–100% scroll: último frame congelado, fade de opacity 1 → 0.27 para que el contenido flotante se lea bien.
- Fondo edge-to-edge sin bordes, contenedores ni sombras.
