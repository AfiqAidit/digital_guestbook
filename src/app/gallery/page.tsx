"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { PhotoViewer } from "@/components/PhotoViewer";
import { Sprig } from "@/components/Sprig";
import { useI18n } from "@/lib/i18n";
import { useIsAdminUi } from "@/lib/staff";
import type { Photo } from "@/lib/types";

type Page = { photos: Photo[]; nextBefore: string | null };
const PAGE = 24;

/** Merge a freshly fetched first page into what we already show, without losing older pages. */
function mergeHead(prev: Photo[], head: Photo[], headHasMore: boolean): Photo[] {
  if (!headHasMore) return head; // the head IS everything
  const oldest = head[head.length - 1]?.createdAt;
  const headIds = new Set(head.map((p) => p.id));
  const tail = prev.filter((p) => !headIds.has(p.id) && oldest !== undefined && p.createdAt < oldest);
  return [...head, ...tail];
}

export default function GalleryPage() {
  const { t } = useI18n();
  const adminUi = useIsAdminUi();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const query = adminUi ? "&all=1" : "";

  const fetchPage = useCallback(
    async (before?: string): Promise<Page> => {
      const url = `/api/photos?limit=${PAGE}${before ? `&before=${encodeURIComponent(before)}` : ""}${query}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      return (await res.json()) as Page;
    },
    [query],
  );

  const loadFirst = useCallback(async () => {
    setState((s) => (s === "ready" ? s : "loading"));
    try {
      const page = await fetchPage();
      setPhotos(page.photos);
      setNextBefore(page.nextBefore);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [fetchPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load / reload when admin mode changes
    void loadFirst();
  }, [loadFirst]);

  // Quietly look for new photos while the page is open.
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible" || state !== "ready") return;
      try {
        const page = await fetchPage();
        setPhotos((prev) => mergeHead(prev, page.photos, page.nextBefore !== null));
        setNextBefore((cur) => (cur === null ? page.nextBefore : cur));
      } catch {
        /* stay quiet; the next tick will try again */
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [fetchPage, state]);

  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextBefore);
      setPhotos((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...page.photos.filter((p) => !ids.has(p.id))];
      });
      setNextBefore(page.nextBefore);
    } catch {
      /* the button below lets them retry */
    } finally {
      setLoadingMore(false);
    }
  }, [nextBefore, loadingMore, fetchPage]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !nextBefore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "600px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [nextBefore, loadMore]);

  /* ---------- moderation (staff only; server re-checks the cookie) ---------- */
  async function toggleHidden(p: Photo) {
    const status = p.status === "hidden" ? "approved" : "hidden";
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    const res = await fetch(`/api/admin/photos/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) void loadFirst();
  }

  async function remove(p: Photo) {
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    const res = await fetch(`/api/admin/photos/${p.id}`, { method: "DELETE" });
    if (!res.ok) void loadFirst();
  }

  /* ---------- masonry: two columns, each photo goes to the shorter one ---------- */
  const columns = useMemo(() => {
    const cols: { p: Photo; i: number }[][] = [[], []];
    const heights = [0, 0];
    photos.forEach((p, i) => {
      const target = heights[0] <= heights[1] ? 0 : 1;
      cols[target].push({ p, i });
      heights[target] += p.height / p.width + 0.18; // + room for the caption strip
    });
    return cols;
  }, [photos]);

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={t("gallery.title")} />

      <div className="flex-1 px-3 pt-4 pb-36">
        {state === "loading" && (
          <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label={t("common.loading")}>
            {[1.25, 0.8, 1, 1.4, 0.9, 1.1].map((r, i) => (
              <div key={i} className="skeleton rounded-2xl" style={{ aspectRatio: `1 / ${r}` }} />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="mx-auto mt-16 max-w-[18rem] text-center">
            <p className="text-ink-soft">{t("gallery.error")}</p>
            <button type="button" onClick={loadFirst} className="btn btn-quiet mt-4">
              {t("gallery.retry")}
            </button>
          </div>
        )}

        {state === "ready" && photos.length === 0 && (
          <div className="mx-auto mt-14 flex max-w-[19rem] flex-col items-center text-center">
            <Sprig className="w-16 text-moss/70" />
            <h2 className="mt-5 font-display text-[1.9rem] leading-tight font-semibold text-forest">
              {t("gallery.emptyTitle")}
            </h2>
            <p className="mt-2 text-ink-soft">{t("gallery.emptyBody")}</p>
          </div>
        )}

        {state === "ready" && photos.length > 0 && (
          <div className="grid grid-cols-2 items-start gap-3">
            {columns.map((col, c) => (
              <div key={c} className="flex flex-col gap-3">
                {col.map(({ p, i }) => (
                  <Tile
                    key={p.id}
                    photo={p}
                    index={i}
                    adminUi={adminUi}
                    onOpen={() => setViewer(i)}
                    onToggleHidden={() => toggleHidden(p)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={sentinel} className="h-8" />
        {nextBefore && (
          <div className="text-center">
            <button type="button" onClick={loadMore} disabled={loadingMore} className="btn btn-quiet">
              {t("gallery.loadMore")}
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      {viewer !== null && (
        <PhotoViewer
          photos={photos}
          startIndex={Math.min(viewer, photos.length - 1)}
          onClose={() => setViewer(null)}
          adminUi={adminUi}
          onHideToggle={toggleHidden}
          onDelete={remove}
        />
      )}
    </main>
  );
}

function Tile({
  photo,
  index,
  adminUi,
  onOpen,
  onToggleHidden,
}: {
  photo: Photo;
  index: number;
  adminUi: boolean;
  onOpen: () => void;
  onToggleHidden: () => void;
}) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  // A whisper of tilt on some prints, like photos laid on a table. Never more than ~1deg.
  const tilt = index % 4 === 1 ? "rotate-[0.7deg]" : index % 5 === 3 ? "-rotate-[0.8deg]" : "";
  const dim = photo.status !== "approved";

  return (
    <div className={`relative ${tilt}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`print block w-full overflow-hidden rounded-2xl p-1.5 text-left active:scale-[0.985] ${dim ? "opacity-60" : ""}`}
      >
        <span
          className="block overflow-hidden rounded-[0.65rem] bg-paper-deep"
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails come from our own API at a fixed size */}
          <img
            src={photo.thumb}
            alt={photo.caption || t("gallery.by", { name: photo.guestName })}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </span>
        <span className="block truncate px-1 pt-1.5 pb-0.5 font-display text-[0.98rem] leading-tight font-medium text-forest italic">
          {photo.guestName}
        </span>
      </button>

      {adminUi && (
        <>
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={photo.status === "hidden" ? "Restore" : "Hide"}
            className="absolute top-2.5 right-2.5 grid size-10 place-items-center rounded-full bg-ink/70 text-paper active:bg-ink"
          >
            {photo.status === "hidden" ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          {dim && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-wine px-2.5 py-1 text-[0.68rem] font-semibold tracking-wider text-paper uppercase">
              {photo.status === "hidden" ? t("gallery.hidden") : t("gallery.pending")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
