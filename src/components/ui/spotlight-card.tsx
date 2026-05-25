import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowColor = "purple" | "orange" | "blue" | "green" | "red";

const COLOR_MAP: Record<GlowColor, { rgb: string; ring: string }> = {
  purple: { rgb: "168, 85, 247", ring: "rgba(168, 85, 247, 0.6)" },
  orange: { rgb: "255, 115, 0", ring: "rgba(255, 115, 0, 0.8)" },
  blue: { rgb: "59, 130, 246", ring: "rgba(59, 130, 246, 0.6)" },
  green: { rgb: "34, 197, 94", ring: "rgba(34, 197, 94, 0.6)" },
  red: { rgb: "239, 68, 68", ring: "rgba(239, 68, 68, 0.6)" },
};

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: GlowColor;
  active?: boolean;
  onClick?: () => void;
  as?: "div" | "button";
}

export function GlowCard({
  children,
  className,
  glowColor = "purple",
  active = false,
  onClick,
  as = "div",
}: GlowCardProps) {
  const ref = useRef<HTMLElement>(null);
  const color = COLOR_MAP[glowColor];

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e && e.touches.length) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    el.style.setProperty("--glow-x", `${clientX - rect.left}px`);
    el.style.setProperty("--glow-y", `${clientY - rect.top}px`);
  }

  const style = {
    "--glow-rgb": color.rgb,
    boxShadow: active ? `0 0 0 1.5px ${color.ring}, 0 0 40px -8px ${color.ring}` : undefined,
  } as CSSProperties;

  const baseClass = cn(
    "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300",
    active ? "border-transparent" : "border-border hover:border-white/20",
    onClick && "cursor-pointer text-left w-full",
    className,
  );

  const inner = (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(var(--glow-rgb), 0.22), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          active ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(260px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(var(--glow-rgb), 0.28), transparent 65%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </>
  );

  if (as === "button" || onClick) {
    return (
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onClick={onClick}
        type="button"
        className={baseClass}
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      className={baseClass}
      style={style}
    >
      {inner}
    </div>
  );
}

export default GlowCard;