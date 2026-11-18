import { requireRole, unauthorized, hashIp } from "@/lib/server/admin-session";
import { addLog, isQrMime, removeSalamKautQr, saveSalamKautQr } from "@/lib/server/store";
import { clientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await requireRole("super_admin");
  if (!session) return unauthorized();
  const form = await req.formData().catch(() => null);
  const file = form?.get("qr");
  if (!(file instanceof File) || !isQrMime(file.type) || file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "bad_file" }, { status: 400 });
  }
  await saveSalamKautQr(Buffer.from(await file.arrayBuffer()), file.type);
  await addLog({
    role: session.role,
    remark: session.remark,
    action: "salam_kaut_qr_upload",
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireRole("super_admin");
  if (!session) return unauthorized();
  await removeSalamKautQr();
  await addLog({
    role: session.role,
    remark: session.remark,
    action: "salam_kaut_qr_remove",
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}
