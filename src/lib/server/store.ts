/**
 * LOCAL DEV STORE.
 *
 * A tiny JSON-file + folder "database" so the whole app runs on a laptop with zero accounts.
 * Everything the API routes need goes through the functions exported here, so swapping to
 * Supabase (Postgres + Storage) later means re-implementing this one file. See docs/02-architecture.md.
 *
 * NOT for production: Vercel's filesystem is read-only/ephemeral.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  AdminSettings,
  ModerationMode,
  Photo,
  PhotoSource,
  PublicSettings,
  Role,
  Status,
  Wish,
} from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const FILES_DIR = path.join(DATA_DIR, "files");
const DB_FILE = path.join(DATA_DIR, "db.json");

type SettingsRow = {
  uploadsOpen: boolean;
  uploadsCloseAt: string | null;
  moderationMode: ModerationMode;
  maxLibraryPerGuest: number;
  maxCameraPerGuest: number;
  salamKautEnabled: boolean;
  salamKautRecipient: string;
  salamKautNote: string;
  salamKautQrFile: string | null;
  heroPhotoFile: string | null;
};

type PhotoRow = {
  id: string;
  guestToken: string;
  guestName: string;
  caption: string;
  width: number;
  height: number;
  source: PhotoSource;
  status: Status;
  createdAt: string;
};

type WishRow = {
  id: string;
  guestToken: string;
  guestName: string;
  message: string;
  status: Status;
  createdAt: string;
};

type LogRow = {
  id: string;
  role: Role;
  remark: string;
  action: string;
  ipHash: string;
  createdAt: string;
};

type Db = {
  settings: SettingsRow;
  photos: PhotoRow[];
  wishes: WishRow[];
  adminLog: LogRow[];
};

const DEFAULT_DB: Db = {
  settings: {
    uploadsOpen: true,
    uploadsCloseAt: null,
    moderationMode: "instant",
    maxLibraryPerGuest: 20,
    maxCameraPerGuest: 20,
    salamKautEnabled: false,
    salamKautRecipient: "PUTRI SOEFIA BINTI ABD AZIS",
    salamKautNote: "",
    salamKautQrFile: null,
    heroPhotoFile: null,
  },
  photos: [],
  wishes: [],
  adminLog: [],
};

/* ---------- low-level: one write at a time, atomic file replace ---------- */

let queue: Promise<unknown> = Promise.resolve();

async function ensureDirs() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      settings: { ...DEFAULT_DB.settings, ...(parsed.settings ?? {}) },
      photos: parsed.photos ?? [],
      wishes: parsed.wishes ?? [],
      adminLog: parsed.adminLog ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

async function writeDb(db: Db) {
  await ensureDirs();
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

/** Run `fn` against a fresh copy of the DB, then persist. Serialised so writes never interleave. */
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/* ---------- mapping ---------- */

const toPhoto = (r: PhotoRow): Photo => ({
  id: r.id,
  guestName: r.guestName,
  caption: r.caption,
  width: r.width,
  height: r.height,
  source: r.source,
  status: r.status,
  createdAt: r.createdAt,
  src: `/api/files/${r.id}.jpg`,
  thumb: `/api/files/${r.id}.thumb.jpg`,
});

const toWish = (r: WishRow): Wish => ({
  id: r.id,
  guestName: r.guestName,
  message: r.message,
  status: r.status,
  createdAt: r.createdAt,
});

const byNewest = <T extends { createdAt: string }>(a: T, b: T) =>
  a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;

/* ---------- settings ---------- */

export async function getRawSettings(): Promise<SettingsRow> {
  return (await readDb()).settings;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const db = await readDb();
  const s = db.settings;
  return {
    uploadsOpen: isUploadWindowOpen(s),
    moderationMode: s.moderationMode,
    salamKaut: {
      enabled: s.salamKautEnabled && !!s.salamKautQrFile,
      recipient: s.salamKautRecipient,
      note: s.salamKautNote,
      qrSrc: s.salamKautQrFile ? `/api/files/${s.salamKautQrFile}` : null,
    },
    heroSrc: s.heroPhotoFile ? `/api/files/${s.heroPhotoFile}` : null,
    counts: {
      photos: db.photos.filter((p) => p.status === "approved").length,
      wishes: db.wishes.filter((w) => w.status === "approved").length,
      guests: countGuests(db),
    },
  };
}

/** Guests who have shared something visible (a photo or a wish). Counted by anonymous token. */
function countGuests(db: Db): number {
  const tokens = new Set<string>();
  for (const p of db.photos) if (p.status === "approved") tokens.add(p.guestToken);
  for (const w of db.wishes) if (w.status === "approved") tokens.add(w.guestToken);
  return tokens.size;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const db = await readDb();
  const s = db.settings;
  const pub = await getPublicSettings();
  return {
    ...pub,
    // Admins see the real switch, even if an auto-close time has passed.
    uploadsOpen: s.uploadsOpen,
    salamKaut: {
      enabled: s.salamKautEnabled,
      recipient: s.salamKautRecipient,
      note: s.salamKautNote,
      qrSrc: s.salamKautQrFile ? `/api/files/${s.salamKautQrFile}` : null,
    },
    uploadsCloseAt: s.uploadsCloseAt,
    maxLibraryPerGuest: s.maxLibraryPerGuest,
    maxCameraPerGuest: s.maxCameraPerGuest,
    counts: {
      photos: db.photos.filter((p) => p.status === "approved").length,
      wishes: db.wishes.filter((w) => w.status === "approved").length,
      guests: countGuests(db),
      hiddenPhotos: db.photos.filter((p) => p.status === "hidden").length,
      pendingPhotos: db.photos.filter((p) => p.status === "pending").length,
      hiddenWishes: db.wishes.filter((w) => w.status === "hidden").length,
      pendingWishes: db.wishes.filter((w) => w.status === "pending").length,
    },
  };
}

export function isUploadWindowOpen(s: SettingsRow): boolean {
  if (!s.uploadsOpen) return false;
  if (s.uploadsCloseAt && Date.now() >= new Date(s.uploadsCloseAt).getTime()) return false;
  return true;
}

export type SettingsPatch = Partial<
  Pick<
    SettingsRow,
    | "uploadsOpen"
    | "uploadsCloseAt"
    | "moderationMode"
    | "maxLibraryPerGuest"
    | "maxCameraPerGuest"
    | "salamKautEnabled"
    | "salamKautRecipient"
    | "salamKautNote"
  >
>;

export function updateSettings(patch: SettingsPatch) {
  return mutate((db) => {
    db.settings = { ...db.settings, ...patch };
  });
}

/* ---------- photos ---------- */

export async function listPhotos(opts: {
  includeAll: boolean;
  limit: number;
  before?: string;
}): Promise<{ photos: Photo[]; nextBefore: string | null }> {
  const db = await readDb();
  let rows = db.photos.filter((p) => opts.includeAll || p.status === "approved");
  rows = rows.sort(byNewest);
  if (opts.before) rows = rows.filter((p) => p.createdAt < opts.before!);
  const page = rows.slice(0, opts.limit);
  const nextBefore = rows.length > opts.limit ? page[page.length - 1].createdAt : null;
  return { photos: page.map(toPhoto), nextBefore };
}

export async function countGuestPhotos(token: string, source: PhotoSource) {
  const db = await readDb();
  return db.photos.filter((p) => p.guestToken === token && p.source === source).length;
}

export async function addPhoto(input: {
  guestToken: string;
  guestName: string;
  caption: string;
  width: number;
  height: number;
  source: PhotoSource;
  status: Status;
  display: Buffer;
  thumb: Buffer;
}): Promise<Photo> {
  const id = crypto.randomUUID();
  await ensureDirs();
  await fs.writeFile(path.join(FILES_DIR, `${id}.jpg`), input.display);
  await fs.writeFile(path.join(FILES_DIR, `${id}.thumb.jpg`), input.thumb);
  const row: PhotoRow = {
    id,
    guestToken: input.guestToken,
    guestName: input.guestName,
    caption: input.caption,
    width: input.width,
    height: input.height,
    source: input.source,
    status: input.status,
    createdAt: new Date().toISOString(),
  };
  await mutate((db) => {
    db.photos.push(row);
  });
  return toPhoto(row);
}

export function setPhotoStatus(id: string, status: Status) {
  return mutate((db) => {
    const p = db.photos.find((x) => x.id === id);
    if (!p) return false;
    p.status = status;
    return true;
  });
}

export async function deletePhoto(id: string) {
  const found = await mutate((db) => {
    const i = db.photos.findIndex((x) => x.id === id);
    if (i === -1) return false;
    db.photos.splice(i, 1);
    return true;
  });
  if (found) {
    await fs.rm(path.join(FILES_DIR, `${id}.jpg`), { force: true });
    await fs.rm(path.join(FILES_DIR, `${id}.thumb.jpg`), { force: true });
  }
  return found;
}

/* ---------- wishes ---------- */

export async function listWishes(opts: { includeAll: boolean }): Promise<Wish[]> {
  const db = await readDb();
  return db.wishes
    .filter((w) => opts.includeAll || w.status === "approved")
    .sort(byNewest)
    .map(toWish);
}

export async function countGuestWishes(token: string) {
  const db = await readDb();
  return db.wishes.filter((w) => w.guestToken === token).length;
}

export async function addWish(input: {
  guestToken: string;
  guestName: string;
  message: string;
  status: Status;
}): Promise<Wish> {
  const row: WishRow = {
    id: crypto.randomUUID(),
    guestToken: input.guestToken,
    guestName: input.guestName,
    message: input.message,
    status: input.status,
    createdAt: new Date().toISOString(),
  };
  await mutate((db) => {
    db.wishes.push(row);
  });
  return toWish(row);
}

export function setWishStatus(id: string, status: Status) {
  return mutate((db) => {
    const w = db.wishes.find((x) => x.id === id);
    if (!w) return false;
    w.status = status;
    return true;
  });
}

export function deleteWish(id: string) {
  return mutate((db) => {
    const i = db.wishes.findIndex((x) => x.id === id);
    if (i === -1) return false;
    db.wishes.splice(i, 1);
    return true;
  });
}

/* ---------- Salam Kaut QR ---------- */

const QR_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type QrMime = keyof typeof QR_EXT;
export const isQrMime = (m: string): m is QrMime => m in QR_EXT;

export async function saveSalamKautQr(buf: Buffer, mime: QrMime) {
  await ensureDirs();
  const old = (await getRawSettings()).salamKautQrFile;
  // Unique name each time so phones never show a cached old QR.
  const file = `salam-kaut-qr-${Date.now()}.${QR_EXT[mime]}`;
  await fs.writeFile(path.join(FILES_DIR, file), buf);
  await mutate((db) => {
    db.settings.salamKautQrFile = file;
  });
  if (old) await fs.rm(path.join(FILES_DIR, old), { force: true });
}

export async function removeSalamKautQr() {
  const old = (await getRawSettings()).salamKautQrFile;
  await mutate((db) => {
    db.settings.salamKautQrFile = null;
    db.settings.salamKautEnabled = false;
  });
  if (old) await fs.rm(path.join(FILES_DIR, old), { force: true });
}

/* ---------- couple's welcome photo ---------- */

export async function saveHeroPhoto(buf: Buffer, mime: QrMime) {
  await ensureDirs();
  const old = (await getRawSettings()).heroPhotoFile;
  const file = `hero-${Date.now()}.${QR_EXT[mime]}`;
  await fs.writeFile(path.join(FILES_DIR, file), buf);
  await mutate((db) => {
    db.settings.heroPhotoFile = file;
  });
  if (old) await fs.rm(path.join(FILES_DIR, old), { force: true });
}

export async function removeHeroPhoto() {
  const old = (await getRawSettings()).heroPhotoFile;
  await mutate((db) => {
    db.settings.heroPhotoFile = null;
  });
  if (old) await fs.rm(path.join(FILES_DIR, old), { force: true });
}

/* ---------- files ---------- */

const FILE_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.thumb)?\.jpg|(salam-kaut-qr|hero)-\d+\.(png|jpg|webp))$/;

export async function readFile(name: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!FILE_RE.test(name)) return null;
  try {
    const data = await fs.readFile(path.join(FILES_DIR, name));
    const ext = name.split(".").pop();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { data, mime };
  } catch {
    return null;
  }
}

/* ---------- audit log ---------- */

export function addLog(entry: { role: Role; remark: string; action: string; ipHash: string }) {
  return mutate((db) => {
    db.adminLog.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    });
    // keep the log small
    if (db.adminLog.length > 500) db.adminLog.splice(0, db.adminLog.length - 500);
  });
}
