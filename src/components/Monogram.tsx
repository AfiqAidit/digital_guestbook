"use client";

import { useRef } from "react";
import { EVENT } from "@/lib/event";
import { useStaff } from "@/lib/staff";

const TAPS_NEEDED = 5;
const WINDOW_MS = 3000;

/**
 * The couple's A & P monogram. It is also the hidden door to staff access:
 * tap it 5 times within ~3 seconds. There is deliberately no visual hint for guests.
 * (It's obscurity, not security. The passcode check on the server is the real lock.)
 */
export function Monogram({ size = 84, tone = "paper" }: { size?: number; tone?: "paper" | "forest" }) {
  const { openSheet, session } = useStaff();
  const taps = useRef<number[]>([]);

  function onTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      if (!session) openSheet();
    }
  }

  const onPaper = tone === "paper"; // medallion sits on a dark surface
  const fill = onPaper ? "var(--color-paper)" : "transparent";
  const ink = "var(--color-forest)";
  const ring = onPaper ? "var(--color-sage)" : "var(--color-forest)";

  return (
    <div
      role="img"
      aria-label={`${EVENT.initials[0]} & ${EVENT.initials[1]}`}
      onClick={onTap}
      className="select-none [touch-action:manipulation]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="pointer-events-none block">
        <circle cx="50" cy="50" r="47" fill={fill} stroke={ring} strokeWidth="1.4" />
        <circle cx="50" cy="50" r="42.5" fill="none" stroke={ring} strokeWidth="0.6" opacity="0.8" />
        <text
          x="31"
          y="62"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="36"
          fontWeight="600"
          fill={ink}
        >
          {EVENT.initials[0]}
        </text>
        <text
          x="69"
          y="62"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="36"
          fontWeight="600"
          fill={ink}
        >
          {EVENT.initials[1]}
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontStyle="italic"
          fontSize="26"
          fontWeight="500"
          fill="var(--color-wine)"
        >
          &amp;
        </text>
      </svg>
    </div>
  );
}
