"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";

/** A bottom sheet sized for thumbs. Locks background scroll, closes on backdrop tap or Escape. */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-ink/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[92dvh] w-full max-w-[480px] animate-sheet overflow-y-auto glass-strong rounded-t-[1.75rem] border-b-0 bg-paper/90 px-6 pt-3 pb-safe shadow-[0_-20px_60px_-20px_rgb(30_42_34/0.55)]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-forest/20" aria-hidden />
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-[1.7rem] leading-tight font-semibold text-forest">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-forest/70 active:bg-forest/10"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
