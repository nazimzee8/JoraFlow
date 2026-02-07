// /backend/services/security/RateLimiter.ts
const buckets = new Map<string, { count: number; windowStart: number }>();

export function rateLimitForUser(
  userId: string,
  maxPerWindow: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = buckets.get(userId);

  if (!entry || now - entry.windowStart > windowMs) {
    buckets.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= maxPerWindow) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000));
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}
