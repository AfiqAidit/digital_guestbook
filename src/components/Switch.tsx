"use client";

/** A big, thumb-friendly on/off switch with a label. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  onLabel = "On",
  offLabel = "Off",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-2 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-forest">{label}</span>
        {hint && <span className="block text-[0.92rem] leading-snug text-ink-soft">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span
          className={`w-10 text-right text-[0.78rem] font-semibold tracking-wider uppercase ${
            checked ? "text-forest" : "text-ink-soft/70"
          }`}
        >
          {checked ? onLabel : offLabel}
        </span>
        <span
          className={`relative h-8 w-14 rounded-full transition-colors duration-200 ${
            checked ? "bg-forest" : "bg-forest/20"
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-6 rounded-full bg-paper shadow transition-transform duration-200 ${
              checked ? "translate-x-6" : ""
            }`}
          />
        </span>
      </span>
    </button>
  );
}
