/**
 * A cap per share link. (F031.2)
 *
 * A share link is public to anyone holding it, so without a ceiling the submit
 * route is a mail bomb aimed at whoever reads ADMIN_EMAIL.
 *
 * In memory and on globalThis for the same reason the browser lock is: Next
 * inlines a lib module into every route bundle that imports it, so module scope
 * would give several independent counters that never see each other. (F027)
 *
 * WHAT THIS IS NOT: durable. A restart clears it, and a second machine would
 * have its own. That is an honest limitation of a one-machine deployment rather
 * than a guarantee — it raises the cost of flooding, it does not remove it.
 */
const KEY = Symbol.for('pitch-vault.submission-rate-limit');

export const WINDOW_MS = 10 * 60_000;
export const MAX_PER_WINDOW = 5;

type Bucket = { count: number; resetAt: number };

function buckets(): Map<string, Bucket> {
  const g = globalThis as typeof globalThis & { [KEY]?: Map<string, Bucket> };
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

export function takeSubmissionSlot(
  token: string,
  now = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const map = buckets();
  const b = map.get(token);

  if (!b || now >= b.resetAt) {
    map.set(token, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (b.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count += 1;
  return { allowed: true };
}

/** Tests only — the counter lives for the process otherwise. */
export function resetSubmissionLimits(): void {
  buckets().clear();
}
