"use client";

import { useI18n } from "@/lib/i18n";

/** EN | BM switch. `tone` decides contrast: "light" sits on the dark forest arch, "dark" on paper. */
export function LanguageToggle({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const { lang, setLang } = useI18n();
  const base = "px-3 min-h-9 min-w-11 rounded-full text-[0.8rem] font-semibold tracking-[0.12em] transition-colors";
  const active =
    tone === "light" ? "bg-paper text-forest" : "bg-forest text-paper";
  const idle = tone === "light" ? "text-paper/80" : "text-forest/70";
  return (
    <div
      role="group"
      aria-label="Language / Bahasa"
      className={`inline-flex items-center rounded-full p-0.5 ${
        tone === "light" ? "bg-paper/10 ring-1 ring-paper/25" : "glass-strong"
      }`}
    >
      {(["en", "ms"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`${base} ${lang === l ? active : idle}`}
        >
          {l === "en" ? "EN" : "BM"}
        </button>
      ))}
    </div>
  );
}
