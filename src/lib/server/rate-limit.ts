/**
 * Tiny in-memory rate limiter. Good enough for one wedding on one instance; on serverless each
 * instance has its own memory, so treat it as a speed bump, not a vault. (docs/02-architecture.md)
 */
type Bucket = { hits: number[]; blockedUntil?: number };
const buckets = new Map<string, Bucket>();

/** Returns true if the action is allowed, and records it. */
export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    buckets.set(key, b);
    return false;
  }
  b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.hits.every((t) => now - t > windowMs)) buckets.delete(k);
  }
  return true;
}

/** Count recent hits without recording a new one. */
export function peek(key: string, windowMs: number): number {
  const now = Date.now();
  const b = buckets.get(key);
  return b ? b.hits.filter((t) => now - t < windowMs).length : 0;
}

export function clear(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
