import { requireRole, unauthorized, hashIp } from "@/lib/server/admin-session";
import { addLog, isQrMime, removeHeroPhoto, saveHeroPhoto } from "@/lib/server/store";
import { clientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

/** The real file type, from its first bytes (never trust the browser's claim). */
function sniff(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP")
    return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const session = await requireRole("super_admin");
  if (!session) return unauthorized();
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "bad_file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !isQrMime(mime)) return Response.json({ ok: false, error: "bad_file" }, { status: 400 });
  await saveHeroPhoto(buf, mime);
  await addLog({
    role: session.role,
    remark: session.remark,
    action: "hero_photo_upload",
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireRole("super_admin");
  if (!session) return unauthorized();
  await removeHeroPhoto();
  await addLog({
    role: session.role,
    remark: session.remark,
    action: "hero_photo_remove",
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}
