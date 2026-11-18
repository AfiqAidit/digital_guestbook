import { requireRole, unauthorized, hashIp } from "@/lib/server/admin-session";
import { addLog, deletePhoto, setPhotoStatus } from "@/lib/server/store";
import { clientIp } from "@/lib/server/rate-limit";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: Status[] = ["pending", "approved", "hidden"];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("host");
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { status?: Status };
  if (!body.status || !STATUSES.includes(body.status)) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const ok = await setPhotoStatus(id, body.status);
  if (!ok) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  await addLog({
    role: session.role,
    remark: session.remark,
    action: `photo_${body.status}`,
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("host");
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const ok = await deletePhoto(id);
  if (!ok) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  await addLog({
    role: session.role,
    remark: session.remark,
    action: "photo_delete",
    ipHash: hashIp(clientIp(req)),
  });
  return Response.json({ ok: true });
}
