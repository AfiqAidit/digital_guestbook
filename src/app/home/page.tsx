"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Images, PenLine } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Monogram } from "@/components/Monogram";
import { SalamKautCard } from "@/components/SalamKautCard";
import { Sprig } from "@/components/Sprig";
import { EVENT, formatWeddingDate } from "@/lib/event";
import { useGuest } from "@/lib/guest";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

export default function Home() {
  const { t, lang } = useI18n();
  const { ready, name } = useGuest();
  const { settings } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (ready && !name) router.replace("/");
  }, [ready, name, router]);

  const uploadsOpen = settings ? settings.uploadsOpen : true;
  const photoCount = settings?.counts.photos ?? 0;
  const stats = [
    { label: t("stats.photos"), n: settings?.counts.photos },
    { label: t("stats.guests"), n: settings?.counts.guests },
    { label: t("stats.wishes"), n: settings?.counts.wishes },
  ];

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-36">
      <header className="pt-safe flex items-center justify-between pb-2">
        <span className="glass-strong grid size-[3.4rem] place-items-center rounded-full">
          <Monogram size={46} tone="forest" />
        </span>
        <LanguageToggle />
      </header>

      <section
        className="glass mt-3 rounded-[2rem] px-5 pt-5 pb-4 animate-rise"
        aria-label={t("home.hello", { name })}
      >
        <p className="eyebrow text-wine">{formatWeddingDate(lang)}</p>
        <h1 className="mt-1.5 font-display text-[2.4rem] leading-[1.02] font-semibold break-words text-forest">
          {name ? t("home.hello", { name }) : "\u00A0"}
        </h1>
        <p className="mt-2 text-[1rem] leading-snug text-ink-soft">{t("home.lead")}</p>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-forest/15 border-t border-forest/10 pt-3.5 text-center">
          {stats.map(({ label, n }) => (
            <div key={label} className="px-2">
              <dd className="font-display text-[1.9rem] leading-none font-semibold text-forest tabular-nums">
                {n === undefined ? "–" : n}
              </dd>
              <dt className="mt-1.5 text-[0.66rem] font-semibold tracking-[0.2em] text-ink-soft uppercase">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-3 grid gap-3">
        {/* Primary action: the one strong green card */}
        {uploadsOpen ? (
          <Link
            href="/upload"
            className="group relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-forest p-5 text-paper active:scale-[0.99] active:bg-forest-deep"
            style={{ animation: "rise 0.5s 0.08s cubic-bezier(0.2,0.7,0.2,1) both" }}
          >
            <Sprig className="pointer-events-none absolute -right-3 -bottom-8 w-24 rotate-[14deg] text-sage/40" flip />
            <span className="grid size-11 place-items-center rounded-full bg-paper/12 ring-1 ring-paper/25">
              <ArrowUpRight size={22} />
            </span>
            <span className="relative">
              <span className="block font-display text-[1.9rem] leading-none font-semibold">{t("home.share")}</span>
              <span className="mt-1.5 block text-[0.98rem] text-paper/75">{t("home.shareSub")}</span>
            </span>
          </Link>
        ) : (
          <div
            className="rounded-[1.75rem] border border-dashed border-forest/30 p-5 text-[1rem] leading-snug text-ink-soft"
            style={{ animation: "rise 0.5s 0.08s cubic-bezier(0.2,0.7,0.2,1) both" }}
          >
            {t("home.closedNote")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3" style={{ animation: "rise 0.5s 0.16s cubic-bezier(0.2,0.7,0.2,1) both" }}>
          <Link
            href="/wishes"
            className="glass flex min-h-[11rem] flex-col gap-5 rounded-3xl p-4 active:scale-[0.99]"
          >
            <PenLine size={24} className="text-wine" />
            <span className="block">
              <span className="block font-display text-[1.4rem] leading-tight font-semibold text-forest">
                {t("home.wish")}
              </span>
              <span className="mt-1 block min-h-[2.6em] text-[0.9rem] leading-snug text-ink-soft">{t("home.wishSub")}</span>
            </span>
          </Link>
          <Link
            href="/gallery"
            className="glass flex min-h-[11rem] flex-col gap-5 rounded-3xl p-4 active:scale-[0.99]"
          >
            <Images size={24} className="text-wine" />
            <span className="block">
              <span className="block font-display text-[1.4rem] leading-tight font-semibold text-forest">
                {t("home.gallery")}
              </span>
              <span className="mt-1 block min-h-[2.6em] text-[0.9rem] leading-snug text-ink-soft">
                {photoCount > 0 ? t("home.gallerySub", { n: photoCount }) : t("home.gallerySubEmpty")}
              </span>
            </span>
          </Link>
        </div>

        {settings && (
          <div style={{ animation: "rise 0.5s 0.24s cubic-bezier(0.2,0.7,0.2,1) both" }}>
            <SalamKautCard data={settings.salamKaut} />
          </div>
        )}
      </div>

      <footer className="glass mx-auto mt-10 rounded-3xl px-6 py-4 text-center">
        <p className="font-script text-[2rem] leading-none text-wine">{t("home.footer")}</p>
        <p className="mt-2 text-[0.72rem] leading-relaxed tracking-[0.18em] text-ink-soft">
          {EVENT.hall}
          <br />
          {EVENT.venue}
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
