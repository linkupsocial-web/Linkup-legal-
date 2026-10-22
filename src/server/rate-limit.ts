import "server-only";

type RateLimitEntry = { count: number; resetAt: number };

const MAX_ENTRIES = 10_000;
const entries = new Map<string, RateLimitEntry>();

export function checkRateLimit(input: { key: string; limit: number; windowMs: number; now?: number }) {
  const now = input.now ?? Date.now();
  const existing = entries.get(input.key);

  if (!existing || existing.resetAt <= now) {
    if (entries.size >= MAX_ENTRIES) {
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
      if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
    }

    const resetAt = now + input.windowMs;
    entries.set(input.key, { count: 1, resetAt });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= input.limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
