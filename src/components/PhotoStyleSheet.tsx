"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useI18n } from "@/lib/i18n";
import {
  ensureFonts,
  FRAMES,
  loadImage,
  LOOKS,
  renderStyled,
  type Fonts,
  type FrameId,
  type LookId,
  type PhotoStyle,
} from "@/lib/photo-style";

/** Draws a styled version of `img` into a <canvas>. No React state, so nothing re-renders while it paints. */
function StyledCanvas({
  img,
  style,
  maxEdge,
  className,
  label,
  box,
}: {
  img: HTMLImageElement;
  style: PhotoStyle;
  maxEdge: number;
  className?: string;
  label: string;
  /** Largest on-screen size (CSS length) in either direction. The canvas keeps its own aspect ratio. */
  box: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { look, frame } = style;

  useEffect(() => {
    let cancelled = false;
    void ensureFonts().then((fonts: Fonts) => {
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      renderStyled(canvas, img, { look, frame }, maxEdge, fonts);
    });
    return () => {
      cancelled = true;
    };
  }, [img, look, frame, maxEdge]);

  return <canvas ref={ref} role="img" aria-label={label} className={className} style={{ maxWidth: box, maxHeight: box }} />;
}

const PREVIEW_BOX = "min(38dvh, 24rem)";

function Editor({
  src,
  style,
  onChange,
  onApplyAll,
  onDone,
  count,
}: {
  src: string;
  style: PhotoStyle;
  onChange: (s: PhotoStyle) => void;
  onApplyAll: (s: PhotoStyle) => void;
  onDone: () => void;
  count: number;
}) {
  const { t } = useI18n();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"look" | "frame">("look");

  useEffect(() => {
    let cancelled = false;
    loadImage(src)
      .then((i) => !cancelled && setImg(i))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [src]);

  const options: (LookId | FrameId)[] = tab === "look" ? LOOKS : FRAMES;

  return (
    <div>
      <div
        className="mx-auto grid place-items-center rounded-2xl bg-forest/8 p-3"
        style={{ height: PREVIEW_BOX }}
      >
        {failed ? (
          <p className="max-w-[16rem] text-center text-[0.95rem] text-ink-soft">{t("style.noPreview")}</p>
        ) : img ? (
          <StyledCanvas
            img={img}
            style={style}
            maxEdge={760}
            label={t("style.title")}
            box={`calc(${PREVIEW_BOX} - 1.5rem)`}
            className="rounded-md shadow-[0_10px_30px_-10px_rgb(20_30_24/0.6)]"
          />
        ) : (
          <div className="skeleton h-full w-3/4 rounded-xl" />
        )}
      </div>

      {img && (
        <>
          <div role="tablist" aria-label={t("style.title")} className="mt-4 grid grid-cols-2 rounded-full bg-forest/10 p-1">
            {(["look", "frame"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-11 rounded-full text-[0.8rem] font-semibold tracking-[0.2em] uppercase transition-colors ${
                  tab === id ? "bg-forest text-paper" : "text-forest"
                }`}
              >
                {t(id === "look" ? "style.look" : "style.frame")}
              </button>
            ))}
          </div>

          <ul className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pt-1 pb-2" role="listbox" aria-label={t(tab === "look" ? "style.look" : "style.frame")}>
            {options.map((id) => {
              const selected = (tab === "look" ? style.look : style.frame) === id;
              const next: PhotoStyle = tab === "look" ? { ...style, look: id as LookId } : { ...style, frame: id as FrameId };
              // Each chip previews the option applied on top of the current choice for the OTHER tab.
              const label = t(`${tab === "look" ? "look" : "frame"}.${id}` as "look.original");
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onChange(next)}
                    className="flex w-[4.6rem] flex-col items-center gap-1.5"
                  >
                    <span
                      className={`grid h-[4.6rem] w-[4.6rem] place-items-center overflow-hidden rounded-2xl bg-paper-deep p-1 ring-2 transition ${
                        selected ? "ring-forest" : "ring-transparent"
                      }`}
                    >
                      <StyledCanvas img={img} style={next} maxEdge={150} label={label} box="4rem" className="rounded-[0.35rem]" />
                    </span>
                    <span className={`text-[0.78rem] leading-tight ${selected ? "font-semibold text-forest" : "text-ink-soft"}`}>
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-4 grid gap-2.5 pb-1">
        <button type="button" onClick={onDone} className="btn btn-primary w-full">
          <Check size={20} /> {t("style.done")}
        </button>
        {count > 1 && (
          <button type="button" onClick={() => onApplyAll(style)} className="btn btn-quiet w-full">
            {t("style.applyAll", { n: count })}
          </button>
        )}
      </div>
    </div>
  );
}

export function PhotoStyleSheet({
  open,
  src,
  style,
  count,
  onChange,
  onApplyAll,
  onClose,
}: {
  open: boolean;
  src: string | null;
  style: PhotoStyle;
  count: number;
  onChange: (s: PhotoStyle) => void;
  onApplyAll: (s: PhotoStyle) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={open && !!src} onClose={onClose} title={t("style.title")} closeLabel={t("common.close")}>
      {src && <Editor key={src} src={src} style={style} onChange={onChange} onApplyAll={onApplyAll} onDone={onClose} count={count} />}
    </Sheet>
  );
}
