/**
 * A handful of faint petals drifting down the screen. Decorative: no pointer events, behind the
 * content, transform/opacity only, and `prefers-reduced-motion` stops them (globals.css).
 */
const PETALS: { left: number; size: number; dur: number; delay: number; tone: string }[] = [
  { left: 10, size: 12, dur: 21, delay: -3, tone: "#e8b4bc" },
  { left: 28, size: 9, dur: 26, delay: -14, tone: "#c9788a" },
  { left: 47, size: 14, dur: 23, delay: -8, tone: "#e8b4bc" },
  { left: 66, size: 10, dur: 28, delay: -19, tone: "#b25a6e" },
  { left: 84, size: 13, dur: 24, delay: -11, tone: "#e8b4bc" },
];

export function Petals() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-1/2 -z-[1] w-[min(100%,480px)] -translate-x-1/2 overflow-hidden"
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.tone,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
