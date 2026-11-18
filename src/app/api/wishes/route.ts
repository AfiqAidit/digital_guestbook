import { addWish, countGuestWishes, getRawSettings, listWishes } from "@/lib/server/store";
import { getSession } from "@/lib/server/admin-session";
import { clientIp, hit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WISHES_PER_GUEST = 5;

export async function GET(req: Request) {
  const wantAll = new URL(req.url).searchParams.get("all") === "1";
  const session = wantAll ? await getSession() : null;
  const wishes = await listWishes({ includeAll: !!session });
  return Response.json({ wishes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!hit(`wish-ip:${clientIp(req)}`, 30, 60_000)) {
    return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
  }
  let body: { guestToken?: unknown; guestName?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const token = String(body.guestToken ?? "");
  const guestName = String(body.guestName ?? "").trim().slice(0, 60);
  const message = String(body.message ?? "").trim();
  if (!UUID_RE.test(token) || !guestName || message.length < 1 || message.length > 500) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if ((await countGuestWishes(token)) >= MAX_WISHES_PER_GUEST) {
    return Response.json({ ok: false, error: "limit", cap: MAX_WISHES_PER_GUEST }, { status: 429 });
  }
  const settings = await getRawSettings();
  const wish = await addWish({
    guestToken: token,
    guestName,
    message,
    status: settings.moderationMode === "instant" ? "approved" : "pending",
  });
  return Response.json({ ok: true, wish });
}
