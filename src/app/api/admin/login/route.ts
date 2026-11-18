import { createSession, hashIp, roleForPasscode } from "@/lib/server/admin-session";
import { addLog } from "@/lib/server/store";
import { clear, clientIp, hit, peek } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FAILS = 5;
const WINDOW = 15 * 60_000;

// One neutral answer for wrong passcode / locked out / misconfigured, so nothing leaks.
const no = (status = 401) => Response.json({ ok: false }, { status });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipKey = `login-fail:${ip}`;

  if (peek(ipKey, WINDOW) >= MAX_FAILS) return no(429);
  // global slow-down if someone is spraying from many IPs
  if (peek("login-fail:all", WINDOW) >= 25) return no(429);

  let body: { passcode?: unknown; remark?: unknown };
  try {
    body = await req.json();
  } catch {
    return no(400);
  }
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  const remark = (typeof body.remark === "string" ? body.remark : "").trim().slice(0, 80);
  if (!passcode || passcode.length > 200) return no();

  let role;
  try {
    role = roleForPasscode(passcode);
  } catch {
    return no(500);
  }

  if (!role) {
    hit(ipKey, MAX_FAILS, WINDOW);
    hit("login-fail:all", 25, WINDOW);
    return no();
  }

  clear(ipKey);
  try {
    await createSession(role, remark);
  } catch {
    return no(500);
  }
  await addLog({ role, remark, action: "login", ipHash: hashIp(ip) });
  return Response.json({ ok: true, role, remark });
}
