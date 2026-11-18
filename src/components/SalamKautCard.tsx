"use client";

import { useState } from "react";
import { Gift, QrCode } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SalamKaut } from "@/lib/types";

/**
 * Display only: we never touch money. Shows the couple's DuitNow QR and the recipient's name.
 * Hidden from guests until the QR exists and the card is enabled (see /admin).
 * `preview` lets the admin page render the placeholder state so the section can be checked early.
 */
export function SalamKautCard({ data, preview = false }: { data: SalamKaut; preview?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(preview);

  if (!preview && !(data.enabled && data.qrSrc)) return null;

  return (
    <section className="print rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-wine/10 text-wine">
          <Gift size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.5rem] leading-tight font-semibold text-forest">
            {t("salam.title")}
          </h2>
          <p className="mt-1 text-[0.98rem] leading-snug text-ink-soft">{t("salam.lead")}</p>
        </div>
      </div>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet mt-4 w-full">
          <QrCode size={19} /> {t("salam.show")}
        </button>
      ) : (
        <div className="mt-4 animate-fade">
          <div className="mx-auto grid aspect-square w-full max-w-[17rem] place-items-center rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgb(128_0_32/0.14)]">
            {data.qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied QR, served from our own API
              <img src={data.qrSrc} alt="DuitNow QR" className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-xl border-2 border-dashed border-forest/25 p-4 text-center text-[0.9rem] text-ink-soft">
                DuitNow QR will appear here once it is uploaded.
              </div>
            )}
          </div>
          <p className="eyebrow mt-4 text-center text-ink-soft">{t("salam.recipient")}</p>
          <p className="mt-0.5 text-center font-display text-[1.25rem] leading-snug font-semibold tracking-[0.06em] text-forest">
            {data.recipient}
          </p>
          {data.note && <p className="mt-2 text-center text-[0.98rem] text-ink-soft">{data.note}</p>}
          <p className="mt-3 text-center text-[0.88rem] leading-snug text-ink-soft/90">{t("salam.hint")}</p>
          {!preview && (
            <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet mt-4 w-full">
              {t("salam.hide")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
