type Bucket = { startedAt: number; count: number };

const globalBuckets = globalThis as typeof globalThis & { brightpathRateBuckets?: Map<string, Bucket> };
const buckets = globalBuckets.brightpathRateBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalBuckets.brightpathRateBuckets = buckets;

export function takeRateLimit(key: string, maximum: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    pruneBuckets(now, windowMs);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= maximum) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function pruneBuckets(now: number, windowMs: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= windowMs) buckets.delete(key);
  }
}

export function clearRateLimitsForTests() {
  buckets.clear();
}
