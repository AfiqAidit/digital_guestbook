"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Photo } from "@/lib/types";

/**
 * Full-screen viewer. Swipe sideways (native scroll-snap, so it feels right on every phone),
 * tap the X to close. Only the current and neighbouring slides load an image.
 */
export function PhotoViewer({
  photos,
  startIndex,
  onClose,
  adminUi,
  onHideToggle,
  onDelete,
}: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
  adminUi: boolean;
  onHideToggle: (p: Photo) => void;
  onDelete: (p: Photo) => void;
}) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [confirming, setConfirming] = useState(false);
  const raf = useRef(0);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [startIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const el = scroller.current;
      if (!el) return;
      if (e.key === "ArrowRight") el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft") el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf.current);
    };
  }, [onClose]);

  function onScroll() {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex((cur) => {
        if (cur !== i) setConfirming(false);
        return Math.min(Math.max(i, 0), photos.length - 1);
      });
    });
  }

  // If the photo list shrinks (e.g. deleted), keep the index valid.
  const safeIndex = Math.min(index, Math.max(photos.length - 1, 0));
  const current = photos[safeIndex];

  useEffect(() => {
    if (photos.length === 0) onClose();
  }, [photos.length, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink animate-fade" role="dialog" aria-modal="true">
      <div className="pt-safe flex items-center justify-between px-3 pb-2 text-paper">
        <span className="px-2 text-sm font-semibold tracking-widest text-paper/70">
          {safeIndex + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="grid size-12 place-items-center rounded-full active:bg-paper/10"
        >
          <X size={26} />
        </button>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <div key={p.id} className="flex w-full shrink-0 snap-center snap-always items-center justify-center px-1">
            {Math.abs(i - safeIndex) <= 1 && (
              // eslint-disable-next-line @next/next/no-img-element -- photos come from our own API at fixed sizes
              <img
                src={p.src}
                alt={p.caption || t("gallery.by", { name: p.guestName })}
                className="max-h-full max-w-full object-contain"
                decoding="async"
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      <div className="pb-safe px-5 pt-3 text-paper">
        <p className="font-display text-[1.3rem] leading-tight font-semibold italic">
          {t("gallery.by", { name: current.guestName })}
        </p>
        {current.caption && <p className="mt-1 text-[0.98rem] leading-snug text-paper/80">{current.caption}</p>}

        {adminUi && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onHideToggle(current)}
              className="btn min-h-11 flex-1 bg-paper/12 text-paper active:bg-paper/20"
            >
              {current.status === "hidden" ? <Eye size={18} /> : <EyeOff size={18} />}
              {current.status === "hidden" ? "Restore" : "Hide"}
            </button>
            {confirming ? (
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onDelete(current);
                }}
                className="btn btn-wine min-h-11 flex-1"
              >
                <Trash2 size={18} /> Delete for good
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="btn min-h-11 flex-1 bg-paper/12 text-paper active:bg-paper/20"
              >
                <Trash2 size={18} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
