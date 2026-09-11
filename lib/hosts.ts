/**
 * The hostnames Pitch Vault answers on, in ONE place. (F029.2)
 *
 * Next.js middleware runs in the edge runtime, where `process.env` is inlined
 * at BUILD time — and our values are Fly secrets, which only exist at RUNTIME.
 * An env-only lookup here would silently read undefined and quietly disable the
 * redirect, so the hostnames are stated literally and `process.env` may only
 * OVERRIDE them. This is the single source: nothing else in the app names a
 * hostname.
 */
export const CANONICAL_HOST = process.env.CANONICAL_HOST || 'pitch.broberg.ai';

/** Hostnames that used to be primary. Requests to these are redirected to
 *  CANONICAL_HOST so every link already sent to a customer keeps working. */
export const LEGACY_HOSTS: readonly string[] = (
  process.env.LEGACY_HOSTS || 'pitch.broberg.dk'
)
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter((h) => h.length > 0 && h !== CANONICAL_HOST.toLowerCase());

/**
 * Where a request on `host` should be sent, or null to serve it here.
 *
 * `/api/*` is deliberately NOT redirected: curl does not follow redirects
 * without -L, so a script or integration still pointed at the old hostname
 * would receive an empty 308 body and read it as an answer — a silent break.
 * The links that were mailed to people open in a browser, and a browser always
 * follows, so the exception costs nothing the order was about.
 */
export function redirectTargetFor(host: string | null, pathname: string): string | null {
  if (!host) return null;
  const bare = host.split(':')[0].toLowerCase();
  if (!LEGACY_HOSTS.includes(bare)) return null;
  if (pathname.startsWith('/api/')) return null;
  return `https://${CANONICAL_HOST}`;
}
