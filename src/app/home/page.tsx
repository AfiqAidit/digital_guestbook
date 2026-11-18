"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, PenLine, Plus } from "lucide-react";
import { Couple } from "@/components/Couple";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Monogram } from "@/components/Monogram";
import { Petals } from "@/components/Petals";
import { SoundButton } from "@/components/SoundButton";
import { SalamKautCard } from "@/components/SalamKautCard";
import { formatWeddingDate } from "@/lib/event";
import { useGuest } from "@/lib/guest";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import type { Photo } from "@/lib/types";

export default function Home() {
  const { t, lang } = useI18n();
  const { ready, name } = useGuest();
  const { settings } = useSettings();
  const router = useRouter();
  const [recent, setRecent] = useState<Photo[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  useEffect(() => {
    if (ready && !name) router.replace("/");
  }, [ready, name, router]);

  // The latest few photos, for the "Latest moments" strip.
  useEffect(() => {
    let off = false;
    fetch("/api/photos?limit=8", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { photos: Photo[] } | null) => {
        if (off) return;
        if (d) setRecent(d.photos);
        setPhotosLoaded(true);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);

  const uploadsOpen = settings ? settings.uploadsOpen : true;

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-10">
      <Petals />

      <header className="pt-safe flex items-center justify-between pb-1">
        <span className="glass-strong grid size-[3.4rem] place-items-center rounded-full">
          <Monogram size={46} tone="forest" to="/" label={t("home.toCover")} />
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <SoundButton />
        </div>
      </header>

      {/* The couple stand on the edge of the greeting card */}
      <Couple className="pointer-events-none relative z-10 mx-auto -mb-2 h-[6rem] animate-rise" />

      <section className="glass rounded-[2rem] px-5 pt-5 pb-5 animate-rise" aria-label={t("home.hello", { name })}>
        <p className="eyebrow text-wine">{formatWeddingDate(lang)}</p>
        <h1 className="mt-1.5 font-display text-[2.4rem] leading-[1.02] font-semibold break-words text-forest">
          {name ? t("home.hello", { name }) : " "}
        </h1>
        <p className="mt-2 text-[1.02rem] leading-snug text-ink-soft">{t("home.lead")}</p>
      </section>

      <div className="mt-4 grid gap-4">
        {/* What others shared, led by the invitation to add yours */}
        <section style={{ animation: "rise 0.5s 0.12s cubic-bezier(0.2,0.7,0.2,1) both" }} aria-label={t("home.latest")}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="eyebrow text-forest">{t("home.latest")}</h2>
            <Link href="/gallery" className="inline-flex min-h-11 items-center gap-1 text-[0.95rem] font-semibold text-forest">
              {t("home.seeAll")} <ArrowRight size={16} />
            </Link>
          </div>

          {uploadsOpen && photosLoaded && recent.length === 0 && (
            <Link
              href="/upload"
              className="flex min-h-[6.5rem] items-center justify-between gap-4 rounded-[1.75rem] bg-forest p-5 text-paper active:scale-[0.99] active:bg-forest-deep"
            >
              <span>
                <span className="block font-display text-[1.8rem] leading-none font-semibold">{t("home.addYours")}</span>
                <span className="mt-2 block text-[0.98rem] leading-snug text-paper/80">{t("home.gallerySubEmpty")}</span>
              </span>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-paper/15 ring-1 ring-paper/30">
                <Plus size={26} />
              </span>
            </Link>
          )}

          {recent.length > 0 && (
            <ul className="-mx-5 -mb-4 flex snap-x gap-3 overflow-x-auto px-5 pt-1 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {uploadsOpen && (
                <li className="w-[7.5rem] shrink-0 snap-start">
                  <Link
                    href="/upload"
                    className="flex size-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl bg-forest text-center text-[0.98rem] leading-tight font-semibold text-paper shadow-[0_10px_22px_-12px_rgb(94_0_24/0.7)] active:scale-[0.98] active:bg-forest-deep"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-paper/15 ring-1 ring-paper/30">
                      <Plus size={22} />
                    </span>
                    {t("home.addYours")}
                  </Link>
                </li>
              )}
              {recent.map((p) => (
                <li key={p.id} className="w-[7.5rem] shrink-0 snap-start">
                  <Link href="/gallery" className="block active:scale-[0.98]">
                    <span className="print block size-[7.5rem] overflow-hidden rounded-2xl p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail from our own API */}
                      <img
                        src={p.thumb}
                        alt={p.caption || p.guestName}
                        width={120}
                        height={120}
                        loading="lazy"
                        decoding="async"
                        className="size-full rounded-xl object-cover"
                      />
                    </span>
                    {/* long captions end in an ellipsis */}
                    <span className="mt-1.5 block truncate px-1 text-[0.9rem] leading-tight text-ink">
                      {p.caption || <span className="font-display text-forest italic">{p.guestName}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/wishes"
          className="glass flex min-h-[5.5rem] items-center justify-between gap-4 rounded-3xl p-5 active:scale-[0.99]"
          style={{ animation: "rise 0.5s 0.2s cubic-bezier(0.2,0.7,0.2,1) both" }}
        >
          <span>
            <span className="block font-display text-[1.5rem] leading-none font-semibold text-forest">{t("home.wish")}</span>
            <span className="mt-1.5 block text-[0.95rem] leading-snug text-ink-soft">{t("home.wishSub")}</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
            <PenLine size={22} />
          </span>
        </Link>

        {settings && (
          <div style={{ animation: "rise 0.5s 0.28s cubic-bezier(0.2,0.7,0.2,1) both" }}>
            <SalamKautCard data={settings.salamKaut} />
          </div>
        )}
      </div>

      <footer className="mt-10 text-center">
        <p className="font-script text-[2.2rem] leading-none text-wine">{t("home.footer")}</p>
        <p className="mx-auto mt-2 max-w-[17rem] text-[0.95rem] leading-snug text-ink-soft">{t("home.footerSub")}</p>
      </footer>
    </main>
  );
}
