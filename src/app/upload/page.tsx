"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Camera, Check, ImagePlus, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PhotoStyleSheet } from "@/components/PhotoStyleSheet";
import { Sprig } from "@/components/Sprig";
import { isImageFile, MAX_INPUT_BYTES, prepareImage } from "@/lib/image";
import { useGuest } from "@/lib/guest";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useStaff } from "@/lib/staff";
import { DEFAULT_STYLE, isDefaultStyle, type PhotoStyle } from "@/lib/photo-style";

type ItemStatus = "ready" | "preparing" | "sending" | "done" | "failed";
type Item = {
  id: string;
  file: File;
  url: string;
  source: "library" | "camera";
  style: PhotoStyle;
  status: ItemStatus;
  progress: number; // 0..1 while sending
  retrying: boolean;
  reason?: "limit" | "closed" | "generic";
  pending?: boolean; // server accepted it but it awaits the couple's approval
};

const MAX_BATCH = 20;
const CONCURRENCY = 2;
const RETRY_DELAYS = [1500, 4000, 9000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type PostResult = { status: number; body: { ok?: boolean; error?: string; cap?: number; photo?: { status: string } } | null };

/** XHR (not fetch) so we can show real upload progress on a slow venue connection. */
function post(form: FormData, onProgress: (p: number) => void): Promise<PostResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: PostResult["body"] = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => resolve({ status: 0, body: null });
    xhr.ontimeout = () => resolve({ status: 0, body: null });
    xhr.timeout = 120_000;
    xhr.send(form);
  });
}

export default function UploadPage() {
  const { t } = useI18n();
  const { ready, name, token } = useGuest();
  const { settings, refresh } = useSettings();
  const { session } = useStaff();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");
  const [phase, setPhase] = useState<"pick" | "sending" | "done">("pick");
  const [notice, setNotice] = useState<string | null>(null);
  const [limitCap, setLimitCap] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const stopRef = useRef(false);
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && !name) router.replace("/");
  }, [ready, name, router]);

  // free preview URLs when leaving
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }, []);

  function addFiles(list: FileList | null, source: "library" | "camera") {
    if (!list) return;
    setNotice(null);
    const incoming = Array.from(list);
    const images = incoming.filter((f) => isImageFile(f) && f.size <= MAX_INPUT_BYTES);
    if (images.length < incoming.length) setNotice(t("upload.notImage"));

    setItems((prev) => {
      const seen = new Set(prev.map((i) => `${i.file.name}:${i.file.size}:${i.file.lastModified}`));
      const fresh = images
        .filter((f) => !seen.has(`${f.name}:${f.size}:${f.lastModified}`))
        .slice(0, Math.max(0, MAX_BATCH - prev.length))
        .map<Item>((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          source,
          style: DEFAULT_STYLE,
          status: "ready",
          progress: 0,
          retrying: false,
        }));
      return [...prev, ...fresh];
    });
  }

  const editing = items.find((i) => i.id === editingId) ?? null;

  function removeItem(id: string) {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((i) => i.id !== id);
    });
  }

  const uploadOne = useCallback(
    async (item: Item) => {
      patch(item.id, { status: "preparing", progress: 0, reason: undefined, retrying: false });
      let prepared;
      try {
        prepared = await prepareImage(item.file, item.style);
      } catch {
        patch(item.id, { status: "failed", reason: "generic" });
        return;
      }

      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        if (stopRef.current) return;
        patch(item.id, { status: "sending", progress: 0, retrying: attempt > 0 });

        const form = new FormData();
        form.set("guestToken", token);
        form.set("guestName", name);
        form.set("caption", caption.trim());
        form.set("source", item.source);
        form.set("width", String(prepared.width));
        form.set("height", String(prepared.height));
        form.set("display", prepared.display, "photo.jpg");
        form.set("thumb", prepared.thumb, "thumb.jpg");

        const res = await post(form, (p) => patch(item.id, { progress: p }));

        if (res.status === 200 && res.body?.ok) {
          setSlow(false);
          patch(item.id, { status: "done", progress: 1, pending: res.body.photo?.status === "pending" });
          return;
        }
        if (res.status === 403) {
          stopRef.current = true;
          patch(item.id, { status: "failed", reason: "closed" });
          void refresh();
          return;
        }
        if (res.status === 429 && res.body?.error === "limit") {
          stopRef.current = true;
          setLimitCap(res.body.cap ?? null);
          patch(item.id, { status: "failed", reason: "limit" });
          return;
        }
        const retryable = res.status === 0 || res.status >= 500 || res.status === 429;
        if (!retryable || attempt === RETRY_DELAYS.length) {
          patch(item.id, { status: "failed", reason: "generic" });
          return;
        }
        setSlow(true);
        await sleep(RETRY_DELAYS[attempt]);
      }
    },
    [caption, name, patch, refresh, token],
  );

  const run = useCallback(
    async (targets: Item[]) => {
      stopRef.current = false;
      setPhase("sending");
      const queue = [...targets];
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length && !stopRef.current) {
          const next = queue.shift();
          if (next) await uploadOne(next);
        }
      });
      await Promise.all(workers);
      setSlow(false);
    },
    [uploadOne],
  );

  const start = () => run(items.filter((i) => i.status === "ready" || i.status === "failed"));
  // After a failure (or a stop on "limit"/"closed") pick up everything that never finished.
  const retryRemaining = () =>
    run(itemsRef.current.filter((i) => i.status === "failed" || i.status === "ready"));

  function reset() {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    setCaption("");
    setLimitCap(null);
    setNotice(null);
    setPhase("pick");
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed");
  const unfinished = items.filter((i) => i.status === "failed" || i.status === "ready");
  const allDone = phase === "sending" && items.length > 0 && doneCount === items.length;
  const busy = items.some((i) => i.status === "preparing" || i.status === "sending");
  const anyPending = items.some((i) => i.pending);
  const closed = (settings && !settings.uploadsOpen) || failed.some((i) => i.reason === "closed");

  const totalProgress = useMemo(() => {
    if (!items.length) return 0;
    return (
      items.reduce((acc, i) => acc + (i.status === "done" ? 1 : i.status === "sending" ? i.progress * 0.9 + 0.1 : i.status === "preparing" ? 0.05 : 0), 0) /
      items.length
    );
  }, [items]);

  /* ---------------- closed ---------------- */
  if (closed && !allDone && phase !== "done" && doneCount === 0) {
    return (
      <main className="flex min-h-dvh flex-col">
        <PageHeader title={t("upload.title")} />
        <section className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
          <Sprig className="mb-4 w-14 text-moss/70" />
          <h2 className="font-display text-[2rem] leading-tight font-semibold text-forest">{t("upload.closedTitle")}</h2>
          <p className="mt-3 max-w-[20rem] text-ink-soft">{t("upload.closedBody")}</p>
          <div className="mt-8 grid w-full max-w-[18rem] gap-3">
            <Link href="/gallery" className="btn btn-primary">{t("upload.toGallery")}</Link>
            <Link href="/wishes" className="btn btn-quiet">{t("home.wish")}</Link>
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- done ---------------- */
  if (phase === "done" || allDone) {
    return (
      <main className="flex min-h-dvh flex-col">
        <PageHeader title={t("upload.title")} />
        <section className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
          <span
            className="mb-5 grid size-20 place-items-center rounded-full bg-forest text-paper"
            style={{ animation: "settle 0.6s cubic-bezier(0.2,0.8,0.2,1) both" }}
          >
            <Check size={38} strokeWidth={2.2} />
          </span>
          <h2 className="font-script text-[3.2rem] leading-none text-wine">{t("upload.thanksTitle")}</h2>
          <p className="mt-4 max-w-[19rem] text-[1.1rem] text-ink-soft">
            {anyPending
              ? t("upload.thanksReview")
              : doneCount === 1
                ? t("upload.thanksOne")
                : t("upload.thanksMany", { n: doneCount })}
          </p>
          <div className="mt-9 grid w-full max-w-[18rem] gap-3">
            <Link href="/gallery" className="btn btn-primary">{t("upload.toGallery")}</Link>
            <button type="button" onClick={reset} className="btn btn-quiet">{t("upload.addMore")}</button>
            <Link href="/wishes" className="mt-1 inline-flex min-h-12 items-center justify-center gap-1.5 font-semibold text-wine underline underline-offset-4">
              {t("upload.nextWish")} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  /* ---------------- pick / sending ---------------- */
  const sending = phase === "sending";

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={t("upload.title")} />

      <div className="flex-1 px-5 pt-5 pb-44">
        <input
          ref={libraryInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, "library");
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, "camera");
            e.target.value = "";
          }}
        />

        {!sending && items.length === 0 && (
          <>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => libraryInput.current?.click()}
                className="glass flex min-h-[6.5rem] items-center gap-4 rounded-3xl p-5 text-left active:scale-[0.99]"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-forest text-paper">
                  <ImagePlus size={26} />
                </span>
                <span>
                  <span className="block font-display text-[1.6rem] leading-none font-semibold text-forest">{t("upload.pick")}</span>
                  <span className="mt-1.5 block text-[0.95rem] leading-snug text-ink-soft">{t("upload.pickSub")}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                className="glass flex min-h-[6.5rem] items-center gap-4 rounded-3xl p-5 text-left active:scale-[0.99]"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
                  <Camera size={26} />
                </span>
                <span>
                  <span className="block font-display text-[1.6rem] leading-none font-semibold text-forest">{t("upload.camera")}</span>
                  <span className="mt-1.5 block text-[0.95rem] leading-snug text-ink-soft">{t("upload.cameraSub")}</span>
                </span>
              </button>
            </div>
            <p className="mt-5 px-1 text-center text-[0.95rem] leading-snug text-ink-soft">{t("upload.hint")}</p>
          </>
        )}

        {/* Once photos are chosen, adding more is a quiet pair of buttons so the previews get the room. */}
        {!sending && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => libraryInput.current?.click()}
              disabled={items.length >= MAX_BATCH}
              className="btn btn-quiet glass min-h-14 px-3 text-[0.98rem] disabled:opacity-50"
            >
              <ImagePlus size={20} /> {t("upload.addPhotos")}
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              disabled={items.length >= MAX_BATCH}
              className="btn btn-quiet glass min-h-14 px-3 text-[0.98rem] disabled:opacity-50"
            >
              <Camera size={20} /> {t("upload.camera")}
            </button>
          </div>
        )}

        {notice && (
          <p className="mt-4 flex items-start gap-2 text-[0.95rem] text-wine" role="status">
            <AlertCircle size={18} className="mt-0.5 shrink-0" /> {notice}
          </p>
        )}

        {items.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="eyebrow text-forest">{t("upload.selected", { n: items.length })}</h2>
              {sending && (
                <span className="text-[0.85rem] text-ink-soft">
                  {doneCount}/{items.length}
                </span>
              )}
            </div>

            <ul className="grid grid-cols-3 gap-2.5">
              {items.map((item) => (
                <li key={item.id} className="relative aspect-square overflow-hidden rounded-2xl bg-paper-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={item.url}
                    alt=""
                    className={`h-full w-full object-cover transition ${item.status === "done" ? "opacity-60" : ""}`}
                    decoding="async"
                  />

                  {!sending && item.status === "ready" && (
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      aria-label={t("style.edit")}
                      className="absolute inset-0 flex items-end justify-start p-1.5 active:bg-ink/10"
                    >
                      <span
                        className={`flex min-h-7 items-center gap-1 rounded-full px-2 text-[0.68rem] font-semibold tracking-wider uppercase ${
                          isDefaultStyle(item.style) ? "bg-paper/85 text-forest" : "bg-forest text-paper"
                        }`}
                      >
                        <Sparkles size={13} /> {t("style.edit")}
                      </span>
                    </button>
                  )}

                  {!sending && item.status === "ready" && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={t("upload.remove")}
                      className="absolute top-1 right-1 z-10 grid size-9 place-items-center rounded-full bg-ink/70 text-paper"
                    >
                      <X size={18} />
                    </button>
                  )}

                  {(item.status === "preparing" || item.status === "sending") && (
                    <div className="absolute inset-0 grid place-items-center bg-ink/35">
                      <Loader2 size={26} className="animate-spin text-paper" />
                      {item.status === "sending" && (
                        <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-paper/35">
                          <span
                            className="block h-full rounded-full bg-paper transition-[width] duration-200"
                            style={{ width: `${Math.max(item.progress, 0.04) * 100}%` }}
                          />
                        </span>
                      )}
                    </div>
                  )}

                  {item.status === "done" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-9 place-items-center rounded-full bg-forest text-paper">
                        <Check size={20} />
                      </span>
                    </span>
                  )}

                  {item.status === "failed" && (
                    <span className="absolute inset-0 grid place-items-center bg-wine/55 text-paper">
                      <AlertCircle size={26} />
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {!sending && <p className="mt-3 text-[0.9rem] leading-snug text-ink-soft">{t("style.hint")}</p>}

            {!sending && (
              <div className="mt-5">
                <label htmlFor="caption" className="mb-1.5 block text-sm font-semibold text-forest">
                  {t("upload.captionLabel")}
                </label>
                <textarea
                  id="caption"
                  className="field min-h-[5.5rem] resize-none py-3"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("upload.captionPlaceholder")}
                  maxLength={200}
                  rows={2}
                />
              </div>
            )}
          </section>
        )}

        {slow && (
          <p className="mt-5 rounded-2xl bg-paper-deep px-4 py-3 text-[0.95rem] leading-snug text-ink-soft" role="status">
            {t("upload.slowSignal")}
          </p>
        )}

        {limitCap !== null && (
          <p className="mt-5 text-[0.98rem] font-medium text-wine" role="alert">
            {t("upload.limit", { n: limitCap })}
          </p>
        )}
      </div>

      <PhotoStyleSheet
        open={editing !== null}
        src={editing?.url ?? null}
        style={editing?.style ?? DEFAULT_STYLE}
        count={items.filter((i) => i.status === "ready").length}
        onChange={(style) => editing && patch(editing.id, { style })}
        onApplyAll={(style) =>
          setItems((prev) => prev.map((i) => (i.status === "ready" ? { ...i, style } : i)))
        }
        onClose={() => setEditingId(null)}
      />

      {/* Sticky action bar, in the thumb zone */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <div
            className={`pb-safe glass-strong mx-auto max-w-[480px] rounded-t-[1.75rem] border-b-0 px-5 pt-3 ${
              session ? "pr-20" : ""
            }`}
          >
            {sending && (
              <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-forest/15">
                <div
                  className="h-full rounded-full bg-forest transition-[width] duration-300"
                  style={{ width: `${Math.max(totalProgress, 0.03) * 100}%` }}
                />
              </div>
            )}
            {!sending ? (
              <button type="button" onClick={start} className="btn btn-primary w-full" disabled={!items.length}>
                {t("upload.send")} · {items.length}
              </button>
            ) : busy ? (
              <p className="py-3 text-center text-[0.95rem] text-ink-soft">{t("upload.keepOpen")}</p>
            ) : unfinished.length > 0 ? (
              <button type="button" onClick={retryRemaining} className="btn btn-wine w-full" disabled={limitCap !== null}>
                <RotateCw size={19} /> {t("upload.retry")} · {unfinished.length}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
