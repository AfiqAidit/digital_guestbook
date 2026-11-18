"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Monogram } from "@/components/Monogram";
import { LeafDivider, Sprig } from "@/components/Sprig";
import { EVENT, formatWeddingDate } from "@/lib/event";
import { useGuest } from "@/lib/guest";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

export default function Welcome() {
  const { t, lang } = useI18n();
  const { ready, name, setName, clearName } = useGuest();
  const { settings } = useSettings();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const returning = ready && name.length > 0;
  const heroSrc = settings?.heroSrc ?? null;

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (returning) {
      router.push("/home");
      return;
    }
    const clean = value.trim();
    if (!clean) {
      setError(true);
      return;
    }
    setName(clean);
    router.push("/home");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="pt-safe flex justify-end px-4 pb-2">
        <LanguageToggle />
      </div>

      {/* The arch: the couple's photo in a frosted frame. Until a photo is uploaded, a forest arch with the monogram. */}
      <section className="relative mx-auto w-[clamp(9rem,25dvh,14rem)] animate-rise">
        {heroSrc ? (
          <>
            <div className="glass-strong rounded-t-[999px] rounded-b-[1.6rem] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- couple's photo from our own API */}
              <img
                src={heroSrc}
                alt={t("welcome.photoAlt")}
                className="aspect-[4/4.7] w-full rounded-t-[999px] rounded-b-[1.15rem] object-cover"
                decoding="async"
              />
            </div>
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full bg-paper p-0.5 shadow-md">
              <Monogram size={56} tone="paper" />
            </div>
          </>
        ) : (
          <div className="relative flex aspect-[4/4.7] items-center justify-center overflow-hidden rounded-t-[999px] rounded-b-[1.6rem] bg-forest">
            <Sprig className="pointer-events-none absolute -bottom-3 -left-5 w-28 rotate-[8deg] text-sage/60" />
            <Sprig
              flip
              className="pointer-events-none absolute -right-5 -bottom-4 w-24 -rotate-[10deg] text-sage/45"
            />
            <div className="relative mt-6">
              <Monogram size={96} tone="paper" />
            </div>
          </div>
        )}
      </section>

      <form
        onSubmit={go}
        className={`glass mx-4 mb-4 flex flex-col rounded-[2rem] px-6 pt-5 pb-5 text-center ${heroSrc ? "mt-9" : "mt-4"}`}
        style={{ animation: "rise 0.6s 0.12s cubic-bezier(0.2,0.7,0.2,1) both" }}
        noValidate
      >
        <p className="eyebrow text-moss">{t("welcome.eyebrow")}</p>

        <h1 className="mt-2.5">
          <span className="block font-display text-[1.18rem] leading-[1.22] font-semibold tracking-[0.1em] text-balance text-forest">
            {EVENT.groom}
          </span>
          <span
            aria-hidden
            className="mx-auto my-1.5 grid size-7 place-items-center rounded-full bg-wine font-display text-[1.1rem] leading-none text-paper italic"
          >
            &amp;
          </span>
          <span className="block font-display text-[1.18rem] leading-[1.22] font-semibold tracking-[0.1em] text-balance text-forest">
            {EVENT.bride}
          </span>
        </h1>

        <div className="mx-auto mt-3 flex items-center justify-center gap-3 text-moss">
          <span className="h-px w-8 bg-current opacity-60" />
          <p className="font-display text-[1.1rem] font-semibold tracking-[0.2em] text-wine">
            {formatWeddingDate(lang)}
          </p>
          <span className="h-px w-8 bg-current opacity-60" />
        </div>
        <p className="mt-1.5 text-[0.75rem] leading-relaxed tracking-[0.16em] text-ink-soft">
          {EVENT.hall}
          <br />
          {EVENT.venue}
        </p>
      
        <LeafDivider className="mx-auto mt-3 mb-2.5 w-20 text-moss" />

        <div className={`min-h-[6.5rem] text-left transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
          {returning ? (
            <div className="text-center">
              <p className="font-display text-[1.6rem] leading-tight font-semibold break-words text-forest">
                {t("welcome.back", { name })}
              </p>
              <button
                type="button"
                onClick={() => {
                  clearName();
                  setValue("");
                }}
                className="mt-2 min-h-11 px-3 text-[0.95rem] text-ink-soft underline decoration-forest/30 underline-offset-4"
              >
                {t("welcome.notYou")}
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="guest-name" className="mb-1.5 block text-sm font-semibold text-forest">
                {t("welcome.nameLabel")}
              </label>
              <input
                id="guest-name"
                className="field"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(false);
                }}
                placeholder={t("welcome.namePlaceholder")}
                maxLength={60}
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="go"
                aria-invalid={error}
                aria-describedby="guest-name-hint"
              />
              <p
                id="guest-name-hint"
                className={`mt-2 text-[0.92rem] ${error ? "font-medium text-wine" : "text-ink-soft"}`}
                role={error ? "alert" : undefined}
              >
                {error ? t("welcome.nameRequired") : t("welcome.nameHint")}
              </p>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary mt-3 w-full text-[1.05rem]" disabled={!ready}>
          {t("welcome.cta")} <ArrowRight size={20} />
        </button>
      </form>
      <div className="pb-safe" />
    </main>
  );
}
