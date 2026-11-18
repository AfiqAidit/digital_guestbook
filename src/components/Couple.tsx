/**
 * The couple, drawn as a small chibi illustration: the groom in a white baju Melayu with songkok
 * and a songket samping (he waves hello every few seconds), the bride in a white baju kurung and
 * hijab holding a bouquet.
 *
 * Plain SVG, decorative only (aria-hidden). Motion is tiny and slow: a soft bob, an occasional
 * blink, the bouquet swaying, and a heart floating up now and then. Only transform/opacity animate,
 * and `prefers-reduced-motion` stops it (globals.css).
 */

const SKIN = "#f6cfae";
const WHITE = "#fffaf6";
const EDGE = "#e3cfca";
const INK = "#2b1519";
const WINE = "#800020";
const ROSE = "#c9788a";
const BLUSH = "#e8b4bc";
const GOLD = "#b8914f";

const HEART = "M0 3 C -6 -2 -5 -7 0 -4 C 5 -7 6 -2 0 3 Z";

function Face({ cx, cy, eye = 8 }: { cx: number; cy: number; eye?: number }) {
  return (
    <g>
      <ellipse className="cp-eye" cx={cx - eye} cy={cy} rx="2.6" ry="3.2" fill={INK} />
      <ellipse className="cp-eye" cx={cx + eye} cy={cy} rx="2.6" ry="3.2" fill={INK} />
      <circle cx={cx - eye - 7} cy={cy + 8} r="4" fill="#f2a0a0" opacity="0.5" />
      <circle cx={cx + eye + 7} cy={cy + 8} r="4" fill="#f2a0a0" opacity="0.5" />
      <path d={`M${cx - 6} ${cy + 10} Q${cx} ${cy + 16} ${cx + 6} ${cy + 10}`} stroke="#7a3b3b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  );
}

export function Couple({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 250" fill="none" aria-hidden className={className}>
      <ellipse cx="110" cy="240" rx="68" ry="5" fill={INK} opacity="0.1" />

      {/* ---------------- groom ---------------- */}
      <g className="cp-bob">
        {/* legs + shoes */}
        <rect x="64" y="184" width="13" height="48" rx="6" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        <rect x="81" y="184" width="13" height="48" rx="6" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        <ellipse cx="70" cy="235" rx="10" ry="5" fill={INK} />
        <ellipse cx="88" cy="235" rx="10" ry="5" fill={INK} />
        {/* left arm */}
        <g className="cp-wave">
          <rect x="40" y="104" width="14" height="48" rx="7" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
          <circle cx="47" cy="153" r="6" fill={SKIN} />
        </g>
        {/* baju */}
        <path d="M52 112 Q52 100 64 98 L92 98 Q104 100 104 112 L106 192 Q78 200 50 192 Z" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        <rect x="69" y="93" width="18" height="9" rx="4" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        {[110, 120, 130].map((y) => (
          <circle key={y} cx="78" cy={y} r="1.9" fill={GOLD} />
        ))}
        {/* samping (songket) */}
        <path d="M51 150 Q78 158 105 150 L106 178 Q78 186 50 178 Z" fill={WINE} />
        <path d="M51 150 Q78 158 105 150 L105.4 156 Q78 164 50.6 156 Z" fill={GOLD} />
        {[62, 78, 94].map((x) => (
          <path key={x} d={`M${x} 166 l4 -4 l4 4 l-4 4 Z`} fill={GOLD} opacity="0.85" />
        ))}
        {/* right arm, reaching for her hand */}
        <rect x="100" y="106" width="14" height="46" rx="7" fill={WHITE} stroke={EDGE} strokeWidth="1.5" transform="rotate(-24 107 106)" />
        <circle cx="120" cy="150" r="6" fill={SKIN} />
        {/* head */}
        <circle cx="54" cy="68" r="4.5" fill={SKIN} />
        <circle cx="102" cy="68" r="4.5" fill={SKIN} />
        <circle cx="78" cy="66" r="24" fill={SKIN} />
        <Face cx={78} cy={68} />
        {/* songkok */}
        <path d="M54 50 L56 28 Q78 20 100 28 L102 50 Q78 43 54 50 Z" fill={INK} />
        <path d="M56 46 Q78 40 100 46" stroke={GOLD} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* ---------------- bride ---------------- */}
      <g className="cp-bob" style={{ animationDelay: "-1.6s" }}>
        {/* baju kurung */}
        <path d="M120 122 Q120 108 134 106 L160 106 Q174 108 174 122 L184 228 Q147 238 110 228 Z" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        <path d="M111 223 Q147 233 183 223" stroke={GOLD} strokeWidth="2" strokeLinecap="round" fill="none" />
        {[130, 147, 164].map((x) => (
          <circle key={x} cx={x} cy="214" r="1.8" fill={GOLD} opacity="0.85" />
        ))}
        {/* left arm, reaching for his hand */}
        <rect x="112" y="108" width="14" height="46" rx="7" fill={WHITE} stroke={EDGE} strokeWidth="1.5" transform="rotate(18 119 108)" />
        <circle cx="121" cy="151" r="5.5" fill={SKIN} />
        {/* hijab */}
        <path d="M120 72 Q120 36 147 36 Q174 36 174 72 Q176 100 168 114 L126 114 Q118 100 120 72 Z" fill={WHITE} stroke={EDGE} strokeWidth="1.5" />
        <path d="M128 112 Q147 122 166 112" stroke={EDGE} strokeWidth="1.5" fill="none" />
        <ellipse cx="147" cy="72" rx="17.5" ry="19.5" fill={SKIN} />
        <Face cx={147} cy={72} eye={7.5} />
        <circle cx="147" cy="104" r="3" fill={GOLD} />
        <circle cx="168" cy="52" r="4" fill={WINE} />
        <circle cx="168" cy="52" r="1.5" fill={GOLD} />
        {/* bouquet + right arm */}
        <rect x="162" y="110" width="13" height="42" rx="6.5" fill={WHITE} stroke={EDGE} strokeWidth="1.5" transform="rotate(-8 168 110)" />
        <g className="cp-bouquet">
          <path d="M155 152 L169 152 L162 172 Z" fill={WHITE} stroke={EDGE} strokeWidth="1.2" />
          <circle cx="162" cy="142" r="7.5" fill={WINE} />
          <circle cx="153" cy="148" r="6" fill={BLUSH} />
          <circle cx="171" cy="148" r="6" fill={ROSE} />
          <circle cx="162" cy="142" r="2.2" fill={GOLD} />
          <circle cx="162" cy="152" r="5.5" fill={SKIN} />
        </g>
      </g>

      {/* a heart now and then */}
      <g transform="translate(112 56)">
        <path className="cp-heart" d={HEART} fill={WINE} />
      </g>
      <g transform="translate(106 60) scale(0.7)">
        <path className="cp-heart" d={HEART} fill={ROSE} style={{ animationDelay: "2.4s" }} />
      </g>
    </svg>
  );
}
