import { requireRole, unauthorized, hashIp } from "@/lib/server/admin-session";
import { addLog, getAdminSettings, updateSettings, type SettingsPatch } from "@/lib/server/store";
import { clientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireRole("host"))) return unauthorized();
  return Response.json(await getAdminSettings(), { headers: { "Cache-Control": "no-store" } });
}

const int = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export async function PATCH(req: Request) {
  const session = await requireRole("super_admin");
  if (!session) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const patch: SettingsPatch = {};
  const actions: string[] = [];

  if (typeof body.uploadsOpen === "boolean") {
    patch.uploadsOpen = body.uploadsOpen;
    actions.push(body.uploadsOpen ? "uploads_on" : "uploads_off");
  }
  if (body.uploadsCloseAt === null) patch.uploadsCloseAt = null;
  else if (typeof body.uploadsCloseAt === "string") {
    const t = new Date(body.uploadsCloseAt);
    if (!Number.isNaN(t.getTime())) patch.uploadsCloseAt = t.toISOString();
  }
  if (body.moderationMode === "instant" || body.moderationMode === "review") {
    patch.moderationMode = body.moderationMode;
    actions.push(`moderation_${body.moderationMode}`);
  }
  const lib = int(body.maxLibraryPerGuest, 1, 100);
  if (lib !== null) patch.maxLibraryPerGuest = lib;
  const cam = int(body.maxCameraPerGuest, 0, 100);
  if (cam !== null) patch.maxCameraPerGuest = cam;
  if (typeof body.salamKautEnabled === "boolean") {
    patch.salamKautEnabled = body.salamKautEnabled;
    actions.push(body.salamKautEnabled ? "salam_kaut_on" : "salam_kaut_off");
  }
  if (typeof body.salamKautRecipient === "string") {
    patch.salamKautRecipient = body.salamKautRecipient.trim().slice(0, 120).toUpperCase();
  }
  if (typeof body.salamKautNote === "string") {
    patch.salamKautNote = body.salamKautNote.trim().slice(0, 240);
  }

  await updateSettings(patch);
  const ipHash = hashIp(clientIp(req));
  for (const action of actions) {
    await addLog({ role: session.role, remark: session.remark, action, ipHash });
  }
  return Response.json({ ok: true, settings: await getAdminSettings() });
}
