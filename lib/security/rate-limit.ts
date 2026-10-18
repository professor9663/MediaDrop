type Bucket = { count: number; resetAt: number };
const MAX_BUCKETS = 10_000;

const globalState = globalThis as typeof globalThis & { __mediaDropBuckets?: Map<string, Bucket> };
const buckets = globalState.__mediaDropBuckets ??= new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit: number, windowMs = 60_000, now = Date.now()): RateLimitResult {
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimitsForTests(): void {
  buckets.clear();
}

export function clientRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || forwardedFor || "unknown-client";
}
