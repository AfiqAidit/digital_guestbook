import {
  addPhoto,
  countGuestPhotos,
  getRawSettings,
  isUploadWindowOpen,
  listPhotos,
} from "@/lib/server/store";
import { getSession } from "@/lib/server/admin-session";
import { clientIp, hit } from "@/lib/server/rate-limit";
import type { PhotoSource } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_DISPLAY_BYTES = 3 * 1024 * 1024; // client targets ~1MB; stay under Vercel's 4.5MB body limit
const MAX_THUMB_BYTES = 300 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 24, 1), 60);
  const before = url.searchParams.get("before") ?? undefined;
  const wantAll = url.searchParams.get("all") === "1";
  const session = wantAll ? await getSession() : null;

  const { photos, nextBefore } = await listPhotos({
    includeAll: !!session,
    limit,
    before,
  });
  return Response.json({ photos, nextBefore }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!hit(`upload-ip:${ip}`, 120, 60_000)) {
    return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
  }

  const settings = await getRawSettings();
  if (!isUploadWindowOpen(settings)) {
    return Response.json({ ok: false, error: "closed" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const token = String(form.get("guestToken") ?? "");
  const guestName = String(form.get("guestName") ?? "").trim().slice(0, 60);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 200);
  const source: PhotoSource = form.get("source") === "camera" ? "camera" : "library";
  const width = Math.round(Number(form.get("width")));
  const height = Math.round(Number(form.get("height")));
  const display = form.get("display");
  const thumb = form.get("thumb");

  if (!UUID_RE.test(token) || !guestName) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!(width > 0 && width <= 8000 && height > 0 && height <= 8000)) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!(display instanceof File) || !(thumb instanceof File)) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (display.size > MAX_DISPLAY_BYTES || thumb.size > MAX_THUMB_BYTES) {
    return Response.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  const displayBuf = Buffer.from(await display.arrayBuffer());
  const thumbBuf = Buffer.from(await thumb.arrayBuffer());
  if (!isJpeg(displayBuf) || !isJpeg(thumbBuf)) {
    return Response.json({ ok: false, error: "bad_type" }, { status: 415 });
  }

  const cap = source === "camera" ? settings.maxCameraPerGuest : settings.maxLibraryPerGuest;
  if ((await countGuestPhotos(token, source)) >= cap) {
    return Response.json({ ok: false, error: "limit", cap }, { status: 429 });
  }

  const photo = await addPhoto({
    guestToken: token,
    guestName,
    caption,
    width,
    height,
    source,
    status: settings.moderationMode === "instant" ? "approved" : "pending",
    display: displayBuf,
    thumb: thumbBuf,
  });
  return Response.json({ ok: true, photo });
}
