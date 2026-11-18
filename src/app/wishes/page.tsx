"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Send, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Sprig } from "@/components/Sprig";
import { useGuest } from "@/lib/guest";
import { useI18n } from "@/lib/i18n";
import { useIsAdminUi } from "@/lib/staff";
import type { Wish } from "@/lib/types";

const MAX = 500;

export default function WishesPage() {
  const { t } = useI18n();
  const { ready, name, token } = useGuest();
  const adminUi = useIsAdminUi();

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | "sent" | "review" | "limit" | "error">(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/wishes${adminUi ? "?all=1" : ""}`, { cache: "no-store" });
      if (res.ok) setWishes(((await res.json()) as { wishes: Wish[] }).wishes);
    } finally {
      setLoaded(true);
    }
  }, [adminUi]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy || !name) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken: token, guestName: name, message: text }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; wish?: Wish } | null;
      if (res.ok && body?.ok) {
        setMessage("");
        setResult(body.wish?.status === "pending" ? "review" : "sent");
        void load();
      } else if (body?.error === "limit") setResult("limit");
      else setResult("error");
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(w: Wish, status: Wish["status"]) {
    setWishes((prev) => prev.map((x) => (x.id === w.id ? { ...x, status } : x)));
    const res = await fetch(`/api/admin/wishes/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) void load();
  }

  async function remove(w: Wish) {
    if (!window.confirm("Delete this wish for good?")) return;
    setWishes((prev) => prev.filter((x) => x.id !== w.id));
    const res = await fetch(`/api/admin/wishes/${w.id}`, { method: "DELETE" });
    if (!res.ok) void load();
  }

  const left = MAX - message.length;

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={t("wishes.title")} />

      <div className="flex-1 px-5 pt-5 pb-36">
        <form onSubmit={submit} className="glass rounded-3xl p-4" noValidate>
          <p className="font-display text-[1.35rem] leading-snug text-forest italic">{t("wishes.lead")}</p>
          {ready && !name ? (
            <p className="mt-3 text-[0.98rem] text-ink-soft">
              {t("wishes.nameFirst")}{" "}
              <Link href="/" className="font-semibold text-wine underline underline-offset-4">
                {t("welcome.cta")}
              </Link>
            </p>
          ) : (
            <>
              <label htmlFor="wish" className="sr-only">
                {t("wishes.title")}
              </label>
              <textarea
                id="wish"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setResult(null);
                }}
                maxLength={MAX}
                rows={5}
                placeholder={t("wishes.placeholder")}
                className="field mt-3 min-h-[9rem] resize-none py-3 leading-snug"
              />
              <div className="mt-1.5 flex items-center justify-between text-[0.85rem] text-ink-soft">
                <span aria-live="polite" className={left < 40 ? "font-medium text-wine" : ""}>
                  {t("wishes.left", { n: left })}
                </span>
              </div>
              <button type="submit" disabled={busy || !message.trim()} className="btn btn-primary mt-3 w-full">
                <Send size={19} /> {t("wishes.send")}
              </button>
            </>
          )}

          <div aria-live="polite">
            {result === "sent" && <p className="mt-3 text-[0.98rem] font-medium text-forest">{t("wishes.sent")}</p>}
            {result === "review" && <p className="mt-3 text-[0.98rem] font-medium text-forest">{t("wishes.sentReview")}</p>}
            {result === "limit" && <p className="mt-3 text-[0.98rem] font-medium text-wine">{t("wishes.limit")}</p>}
            {result === "error" && <p className="mt-3 text-[0.98rem] font-medium text-wine">{t("common.error")}</p>}
          </div>
        </form>

        <section className="mt-7" aria-label={t("wishes.title")}>
          {loaded && wishes.length === 0 && (
            <div className="mt-8 flex flex-col items-center text-center">
              <Sprig className="w-14 text-moss/70" />
              <p className="mt-4 max-w-[16rem] text-ink-soft">{t("wishes.empty")}</p>
            </div>
          )}

          <ul className="grid gap-4">
            {wishes.map((w, i) => (
              <li
                key={w.id}
                className={`print relative rounded-2xl p-5 pt-6 ${w.status !== "approved" ? "opacity-60" : ""} ${
                  i % 3 === 1 ? "rotate-[0.4deg]" : i % 4 === 3 ? "-rotate-[0.5deg]" : ""
                }`}
              >
                <span aria-hidden className="absolute top-0.5 left-4 font-display text-[3.4rem] leading-none text-wine/70 select-none">
                  “
                </span>
                <p className="pt-3 font-display text-[1.28rem] leading-[1.3] break-words whitespace-pre-line text-ink">
                  {w.message}
                </p>
                <p className="mt-3 text-[0.78rem] font-semibold tracking-[0.18em] text-moss uppercase">{w.guestName}</p>

                {adminUi && (
                  <div className="mt-3 flex items-center gap-2 border-t border-forest/10 pt-3">
                    {w.status !== "approved" && (
                      <span className="mr-auto rounded-full bg-wine px-2.5 py-1 text-[0.68rem] font-semibold tracking-wider text-paper uppercase">
                        {w.status === "hidden" ? t("gallery.hidden") : t("gallery.pending")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setStatus(w, w.status === "hidden" ? "approved" : "hidden")}
                      className="btn ml-auto min-h-11 bg-forest/8 px-4 text-[0.92rem] text-forest"
                    >
                      {w.status === "hidden" ? <Eye size={17} /> : <EyeOff size={17} />}
                      {w.status === "hidden" ? "Restore" : "Hide"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      aria-label="Delete wish"
                      className="grid size-11 place-items-center rounded-xl text-wine active:bg-wine/10"
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
