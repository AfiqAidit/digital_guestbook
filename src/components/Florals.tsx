/**
 * The backdrop: two hand-placed clusters of blossoms and leaves in the top-left and bottom-right
 * corners, with a few gold stars. Everything is plain SVG (no image to download).
 *
 * Motion is deliberately small: each cluster sways a couple of degrees over ~9 s, each bloom
 * breathes a few percent, the stars twinkle. Only transform/opacity animate, and
 * `prefers-reduced-motion` stops it all (see globals.css).
 */

const LEAF = "M0 0 C 8 -9 24 -10 36 0 C 24 10 8 9 0 0 Z";
const STAR = "M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z";

const ROSE = "#c9788a";
const BLUSH = "#e8b4bc";
const WINE = "#800020";
const GOLD = "#b8914f";

/** [x, y, rotation, scale, tone] — placed by hand along the stems, slightly irregular on purpose. */
const LEAVES: [number, number, number, number, string][] = [
  [10, 28, 40, 0.9, ROSE],
  [30, 42, -8, 0.85, BLUSH],
  [48, 62, 55, 1, ROSE],
  [62, 92, 8, 0.95, BLUSH],
  [76, 124, 62, 1, ROSE],
  [88, 150, 20, 0.8, BLUSH],
  [30, 8, 15, 0.8, BLUSH],
  [76, 20, 28, 0.9, ROSE],
  [118, 46, 40, 0.95, BLUSH],
  [146, 76, 52, 0.85, ROSE],
  [10, 110, 70, 0.8, BLUSH],
  [28, 146, 100, 0.9, ROSE],
  [38, 188, 78, 0.85, BLUSH],
  [34, 214, 120, 0.7, ROSE],
];

/** [x, y, rotation, scale, delay s, outer colour, inner colour] */
const BLOOMS: [number, number, number, number, number, string, string][] = [
  [92, 168, 10, 1.05, 0, WINE, ROSE],
  [164, 98, -14, 0.82, 1.6, ROSE, BLUSH],
  [38, 226, 24, 0.78, 3, BLUSH, ROSE],
  [124, 54, 5, 0.6, 4.2, WINE, BLUSH],
];

/** [x, y, scale, delay s] */
const STARS: [number, number, number, number][] = [
  [140, 150, 1, 0],
  [60, 120, 0.7, 1.4],
  [180, 40, 0.8, 2.6],
  [20, 176, 0.65, 3.4],
];

const STEMS = [
  "M-6 18 C 48 36 82 92 96 168",
  "M8 -6 C 70 8 124 38 166 100",
  "M-6 96 C 22 124 42 162 40 228",
];

function Cluster({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 220 260" fill="none" aria-hidden className={className}>
      {STEMS.map((d) => (
        <path key={d} d={d} stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      ))}
      {LEAVES.map(([x, y, r, s, c], i) => (
        <path
          key={i}
          d={LEAF}
          fill={c}
          fillOpacity="0.62"
          transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
        />
      ))}
      {BLOOMS.map(([x, y, r, s, delay, outer, inner], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <g className="fl-bloom" style={{ animationDelay: `${delay}s` }}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-13" rx="9" ry="14" fill={outer} fillOpacity="0.78" transform={`rotate(${a})`} />
            ))}
            {[36, 108, 180, 252, 324].map((a) => (
              <ellipse key={a} cx="0" cy="-8" rx="6" ry="9" fill={inner} fillOpacity="0.9" transform={`rotate(${a})`} />
            ))}
            <circle r="3.6" fill={GOLD} />
            <circle r="1.4" fill="#fff4dc" />
          </g>
        </g>
      ))}
      {STARS.map(([x, y, s, delay], i) => (
        <path
          key={i}
          d={STAR}
          fill={GOLD}
          className="fl-twinkle"
          style={{ animationDelay: `${delay}s` }}
          transform={`translate(${x} ${y}) scale(${s})`}
        />
      ))}
    </svg>
  );
}

export function Florals() {
  return (
    <>
      <Cluster className="fl-sway absolute -top-3 -left-5 w-[62%] origin-top-left" />
      {/* Same cluster turned around: the wrapper flips it, the svg inside sways from its own corner. */}
      <div className="absolute -right-5 -bottom-3 w-[56%] rotate-180">
        <Cluster className="fl-sway-alt block w-full origin-top-left" />
      </div>
    </>
  );
}
