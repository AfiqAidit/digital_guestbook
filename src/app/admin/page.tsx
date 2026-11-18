"use client";

/**
 * Staff page (English only, phone layout). Never linked from the guest UI:
 * staff reach it from the floating button, or by typing /admin.
 * Everything here talks to /api/admin/*, which re-checks the signed cookie on every call.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Eye, ImageUp, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SalamKautCard } from "@/components/SalamKautCard";
import { Switch } from "@/components/Switch";
import imageCompression from "browser-image-compression";
import { useSettings } from "@/lib/settings";
import { useStaff } from "@/lib/staff";
import type { AdminSettings, ModerationMode, Photo } from "@/lib/types";

const jsonHeaders = { "Content-Type": "application/json" };

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="print rounded-3xl p-5">
      <h2 className="font-display text-[1.5rem] leading-tight font-semibold text-forest">{title}</h2>
      {hint && <p className="mt-1 text-[0.95rem] leading-snug text-ink-soft">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminPage() {
  const { session, checked, openSheet } = useStaff();
  const { refresh: refreshPublic } = useSettings();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [attention, setAttention] = useState<Photo[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) setSettings((await res.json()) as AdminSettings);
    const ph = await fetch("/api/photos?all=1&limit=60", { cache: "no-store" });
    if (ph.ok) {
      const data = (await ph.json()) as { photos: Photo[] };
      setAttention(data.photos.filter((p) => p.status !== "approved"));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once staff is known
    if (session) void load();
  }, [session, load]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(id);
  }, [flash]);

  async function save(patch: Record<string, unknown>, message = "Saved"): Promise<boolean> {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setFlash("Couldn't save. Are you still logged in?");
      return false;
    }
    const data = (await res.json()) as { settings: AdminSettings };
    setSettings(data.settings);
    setFlash(message);
    void refreshPublic();
    return true;
  }

  async function photoAction(p: Photo, action: "restore" | "delete") {
    if (action === "delete" && !window.confirm("Delete this photo for good?")) return;
    setAttention((prev) => prev.filter((x) => x.id !== p.id));
    const res =
      action === "restore"
        ? await fetch(`/api/admin/photos/${p.id}`, {
            method: "PATCH",
            headers: jsonHeaders,
            body: JSON.stringify({ status: "approved" }),
          })
        : await fetch(`/api/admin/photos/${p.id}`, { method: "DELETE" });
    if (!res.ok) setFlash("That didn't work.");
    void load();
  }

  /* ---------- gates ---------- */
  if (!checked) {
    return (
      <main className="min-h-dvh">
        <PageHeader title="Admin" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-dvh flex-col">
        <PageHeader title="Admin" />
        <section className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
          <h2 className="font-display text-[1.9rem] leading-tight font-semibold text-forest">Wedding team only</h2>
          <p className="mt-2 max-w-[18rem] text-ink-soft">Enter the team passcode to continue.</p>
          <button type="button" onClick={openSheet} className="btn btn-primary mt-6">
            Enter passcode
          </button>
        </section>
      </main>
    );
  }

  const isSuper = session.role === "super_admin";

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="Admin" />

      <div className="flex-1 space-y-4 px-4 pt-4 pb-28">
        {!settings ? (
          <div className="skeleton h-40 rounded-3xl" />
        ) : (
          <>
            <Section title="Overview">
              <dl className="grid grid-cols-2 gap-2.5">
                {[
                  ["Photos", settings.counts.photos],
                  ["Wishes", settings.counts.wishes],
                  ["Hidden", settings.counts.hiddenPhotos + settings.counts.hiddenWishes],
                  ["Waiting", settings.counts.pendingPhotos + settings.counts.pendingWishes],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-2xl bg-paper-deep/70 px-4 py-3">
                    <dd className="font-display text-[2rem] leading-none font-semibold text-forest">{n}</dd>
                    <dt className="mt-1 text-[0.72rem] font-semibold tracking-widest text-ink-soft uppercase">{label}</dt>
                  </div>
                ))}
              </dl>
            </Section>

            {isSuper && (
              <>
                <Section
                  title="Uploads"
                  hint="Switch off to close photo uploads. Guests can still view the gallery and leave wishes."
                >
                  <Switch
                    checked={settings.uploadsOpen}
                    onChange={(on) => save({ uploadsOpen: on }, on ? "Uploads are open" : "Uploads are closed")}
                    label="Photo uploads"
                    onLabel="Open"
                    offLabel="Closed"
                  />
                  <CloseTime settings={settings} onSave={save} />
                </Section>

                <Section
                  title="Moderation"
                  hint="Instant shows new photos and wishes straight away (you can hide any afterwards). Review holds them until you approve."
                >
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moderation mode">
                    {(["instant", "review"] as ModerationMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={settings.moderationMode === m}
                        onClick={() => save({ moderationMode: m }, `Moderation: ${m}`)}
                        className={`btn min-h-12 capitalize ${
                          settings.moderationMode === m ? "btn-primary" : "btn-quiet"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Section>

                <Limits settings={settings} onSave={save} />
                <HeroPhotoAdmin settings={settings} onChanged={load} setFlash={setFlash} refreshPublic={refreshPublic} />
                <SalamKautAdmin settings={settings} onSave={save} onChanged={load} setFlash={setFlash} />
              </>
            )}

            <Section
              title="Needs a look"
              hint={attention.length ? "Hidden or waiting photos. Restore or delete them here." : "Nothing hidden or waiting."}
            >
              {attention.length > 0 && (
                <ul className="grid grid-cols-2 gap-3">
                  {attention.map((p) => (
                    <li key={p.id} className="overflow-hidden rounded-2xl bg-paper-deep/70">
                      {/* eslint-disable-next-line @next/next/no-img-element -- own API thumbnails */}
                      <img src={p.thumb} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                      <div className="flex items-center justify-between gap-1 p-1.5">
                        <span className="rounded-full bg-wine px-2 py-0.5 text-[0.62rem] font-semibold tracking-wider text-paper uppercase">
                          {p.status}
                        </span>
                        <span className="flex">
                          <button
                            type="button"
                            onClick={() => photoAction(p, "restore")}
                            aria-label="Restore"
                            className="grid size-10 place-items-center rounded-full text-forest active:bg-forest/10"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => photoAction(p, "delete")}
                            aria-label="Delete"
                            className="grid size-10 place-items-center rounded-full text-wine active:bg-wine/10"
                          >
                            <Trash2 size={18} />
                          </button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.88rem] text-ink-soft">
                Tip: with Admin mode on, open the gallery or wishes page to hide or delete items directly.
              </p>
            </Section>
          </>
        )}
      </div>

      {flash && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6" role="status">
          <span className="flex animate-fade items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.95rem] text-paper shadow-lg">
            <Check size={17} /> {flash}
          </span>
        </div>
      )}
    </main>
  );
}

type SaveFn = (patch: Record<string, unknown>, message?: string) => Promise<boolean>;

function CloseTime({ settings, onSave }: { settings: AdminSettings; onSave: SaveFn }) {
  const [value, setValue] = useState(toLocalInput(settings.uploadsCloseAt));
  return (
    <div className="mt-3 border-t border-forest/10 pt-3">
      <label htmlFor="close-at" className="mb-1.5 block text-sm font-semibold text-forest">
        Auto-close at (optional)
      </label>
      <input
        id="close-at"
        type="datetime-local"
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-quiet min-h-11"
          onClick={() => {
            setValue("");
            void onSave({ uploadsCloseAt: null }, "Auto-close cleared");
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-11"
          disabled={!value}
          onClick={() => onSave({ uploadsCloseAt: new Date(value).toISOString() }, "Auto-close saved")}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Limits({ settings, onSave }: { settings: AdminSettings; onSave: SaveFn }) {
  const [lib, setLib] = useState(String(settings.maxLibraryPerGuest));
  const [cam, setCam] = useState(String(settings.maxCameraPerGuest));
  return (
    <Section title="Limits" hint="Photos each guest can upload. Keeps free storage from filling up.">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lim-lib" className="mb-1.5 block text-sm font-semibold text-forest">
            From gallery
          </label>
          <input id="lim-lib" className="field" inputMode="numeric" value={lib} onChange={(e) => setLib(e.target.value)} />
        </div>
        <div>
          <label htmlFor="lim-cam" className="mb-1.5 block text-sm font-semibold text-forest">
            From camera
          </label>
          <input id="lim-cam" className="field" inputMode="numeric" value={cam} onChange={(e) => setCam(e.target.value)} />
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary mt-3 w-full"
        onClick={() => onSave({ maxLibraryPerGuest: Number(lib), maxCameraPerGuest: Number(cam) }, "Limits saved")}
      >
        Save limits
      </button>
    </Section>
  );
}

function SalamKautAdmin({
  settings,
  onSave,
  onChanged,
  setFlash,
}: {
  settings: AdminSettings;
  onSave: SaveFn;
  onChanged: () => Promise<void>;
  setFlash: (m: string) => void;
}) {
  const sk = settings.salamKaut;
  const [recipient, setRecipient] = useState(sk.recipient);
  const [note, setNote] = useState(sk.note);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("qr", file);
    const res = await fetch("/api/admin/salam-kaut-qr", { method: "POST", body: form });
    setBusy(false);
    setFlash(res.ok ? "QR uploaded" : "Use a PNG, JPG or WebP under 3 MB");
    await onChanged();
  }

  async function removeQr() {
    if (!window.confirm("Remove the QR image?")) return;
    await fetch("/api/admin/salam-kaut-qr", { method: "DELETE" });
    setFlash("QR removed");
    await onChanged();
  }

  return (
    <Section
      title="Salam Kaut"
      hint="Shows the DuitNow QR to guests as an optional, gentle card. Display only; no money passes through this site."
    >
      <Switch
        checked={sk.enabled}
        onChange={(on) => onSave({ salamKautEnabled: on }, on ? "Card enabled" : "Card hidden")}
        disabled={!sk.qrSrc}
        label="Show to guests"
        hint={sk.qrSrc ? undefined : "Upload the QR first."}
      />

      <div className="mt-3 grid gap-3 border-t border-forest/10 pt-3">
        <div>
          <label htmlFor="sk-recipient" className="mb-1.5 block text-sm font-semibold text-forest">
            Recipient name
          </label>
          <input
            id="sk-recipient"
            className="field uppercase"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <label htmlFor="sk-note" className="mb-1.5 block text-sm font-semibold text-forest">
            Short note (optional)
          </label>
          <textarea
            id="sk-note"
            className="field min-h-20 resize-none py-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={240}
            rows={2}
          />
        </div>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => onSave({ salamKautRecipient: recipient, salamKautNote: note }, "Details saved")}
        >
          Save details
        </button>

        <div className="grid grid-cols-2 gap-2">
          <label className={`btn btn-primary min-h-12 cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <ImageUp size={19} /> {sk.qrSrc ? "Replace QR" : "Upload QR"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="btn btn-quiet min-h-12" disabled={!sk.qrSrc} onClick={removeQr}>
            Remove QR
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="eyebrow mb-2 text-ink-soft">Preview (as guests see it)</p>
        <SalamKautCard data={{ ...sk, enabled: true }} preview />
      </div>
    </Section>
  );
}

function HeroPhotoAdmin({
  settings,
  onChanged,
  setFlash,
  refreshPublic,
}: {
  settings: AdminSettings;
  onChanged: () => Promise<void>;
  setFlash: (m: string) => void;
  refreshPublic: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      // Shrink on the phone first: the welcome photo only ever shows ~250px wide (up to ~3x on retina).
      const small = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1100,
        fileType: "image/jpeg",
        initialQuality: 0.85,
        useWebWorker: false,
      });
      const form = new FormData();
      form.set("photo", small, "hero.jpg");
      const res = await fetch("/api/admin/hero-photo", { method: "POST", body: form });
      setFlash(res.ok ? "Welcome photo updated" : "Couldn't upload that photo");
    } catch {
      setFlash("Couldn't read that photo");
    }
    setBusy(false);
    await onChanged();
    await refreshPublic();
  }

  async function remove() {
    if (!window.confirm("Remove the welcome photo?")) return;
    await fetch("/api/admin/hero-photo", { method: "DELETE" });
    setFlash("Welcome photo removed");
    await onChanged();
    await refreshPublic();
  }

  return (
    <Section
      title="Welcome photo"
      hint="The couple photo guests see in the arch on the first screen. Portrait photos work best. Without one, the monogram shows instead."
    >
      {settings.heroSrc && (
        <div className="mx-auto mb-3 w-32 overflow-hidden rounded-t-[999px] rounded-b-xl bg-paper-deep">
          {/* eslint-disable-next-line @next/next/no-img-element -- own API file */}
          <img src={settings.heroSrc} alt="" className="aspect-[4/4.7] w-full object-cover" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className={`btn btn-primary min-h-12 cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <ImageUp size={19} /> {settings.heroSrc ? "Replace" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" className="btn btn-quiet min-h-12" disabled={!settings.heroSrc || busy} onClick={remove}>
          Remove
        </button>
      </div>
    </Section>
  );
}
