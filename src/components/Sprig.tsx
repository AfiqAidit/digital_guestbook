/**
 * A single hand-placed leaf sprig, drawn as line art. Leaves are positioned by hand along a curved
 * stem (slightly irregular on purpose, so it doesn't look like a clip-art repeat).
 * Colour comes from `currentColor`; size/rotation from the className.
 */
const LEAF = "M0 0 C 7 -7 19 -8 29 0 C 19 8 7 7 0 0 Z";

// [x, y on stem, rotation, scale]
const LEAVES: [number, number, number, number][] = [
  [28.6, 172.8, -150, 1.15], // left
  [28.6, 172.8, -28, 1.05], // right
  [30.3, 145.1, -158, 1.0],
  [30.3, 145.1, -34, 1.1],
  [35.2, 117, -148, 0.95],
  [35.2, 117, -42, 0.98],
  [43.2, 88.4, -156, 0.82],
  [43.2, 88.4, -48, 0.86],
  [54.4, 59.4, -150, 0.7],
  [54.4, 59.4, -58, 0.72],
  [68.7, 29.9, -140, 0.55],
  [68.7, 29.9, -70, 0.58],
  [80, 10, -80, 0.6],
];

export function Sprig({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 210"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M30 205 Q 20 110 80 10" />
      {LEAVES.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d={LEAF} fill="currentColor" fillOpacity={0.1} />
          <path d="M2 0 L 22 0" strokeWidth={0.8} opacity={0.7} />
        </g>
      ))}
    </svg>
  );
}

/** A small flourish used as a divider between sections. */
export function LeafDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2 8 H48" />
      <path d="M72 8 H118" />
      <g transform="translate(60 8)">
        <path d="M0 0 C -5 -6 -12 -5 -14 0 C -12 5 -5 6 0 0Z" fill="currentColor" fillOpacity={0.12} />
        <path d="M0 0 C 5 -6 12 -5 14 0 C 12 5 5 6 0 0Z" fill="currentColor" fillOpacity={0.12} />
      </g>
    </svg>
  );
}
