import { createLensRoute } from '@broberg/lens/next';
import { mintLensSession } from '@/lib/auth/lens-session';

// bcrypt + better-sqlite3 require the Node runtime, not edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lens mint endpoint (F036). Ships dark: with no LENS_MINT_SECRET set the package
// returns 503, so prod stays inert until the secret is armed. The daemon POSTs the
// shared secret as a bearer; we mint a 10-min read-only session for the dedicated
// lens principal and hand back the cookie. The package owns bearer-check, TTL-clamp
// and storageState assembly (cookie domain from LENS_COOKIE_DOMAIN).
export const { POST } = createLensRoute({
  principal: 'lens@pitch-vault.local',
  ttlMs: 600_000,
  async createSession({ principal, expiresAt }) {
    const value = await mintLensSession(principal, expiresAt);
    return { name: 'pitch-vault-session', value };
  },
});
