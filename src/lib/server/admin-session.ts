/**
 * Staff access. No accounts: a passcode checked on the SERVER against env vars, then a signed,
 * httpOnly cookie. The hidden 5-tap in the UI is only a door; this file is the lock.
 * See docs/02-architecture.md -> "Staff access".
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role, StaffSession } from "@/lib/types";

export const COOKIE = "gb_staff";
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

const sha = (v: string) => crypto.createHash("sha256").update(v).digest();

/** Constant-time compare (hash first so lengths always match). */
function safeEqual(a: string, b: string) {
  return crypto.timingSafeEqual(sha(a), sha(b));
}

/** Returns the role a passcode unlocks, or null. Super admin is checked first. */
export function roleForPasscode(passcode: string): Role | null {
  const superPass = process.env.SUPER_ADMIN_PASSCODE;
  const hostPass = process.env.HOST_PASSCODE;
  if (superPass && safeEqual(passcode, superPass)) return "super_admin";
  if (hostPass && safeEqual(passcode, hostPass)) return "host";
  return null;
}

export function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.ADMIN_SESSION_SECRET ?? ""}:${ip}`)
    .digest("hex")
    .slice(0, 16);
}

export async function createSession(role: Role, remark: string) {
  const token = await new SignJWT({ role, remark })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    if (role !== "host" && role !== "super_admin") return null;
    return { role, remark: typeof payload.remark === "string" ? payload.remark : "" };
  } catch {
    return null;
  }
}

/** Returns the session if it has at least `min` power, otherwise null. Every /api/admin route calls this first. */
export async function requireRole(min: Role): Promise<StaffSession | null> {
  const s = await getSession();
  if (!s) return null;
  if (min === "super_admin" && s.role !== "super_admin") return null;
  return s;
}

export const unauthorized = () =>
  Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
