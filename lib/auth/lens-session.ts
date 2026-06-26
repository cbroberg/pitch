import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { getUserByEmail, createUser } from '@/lib/db/queries/users';
import { hashPassword } from '@/lib/auth/password';
import { LENS_SESSION_PREFIX } from '@/lib/auth/lens-constants';

/**
 * Mint a short-lived session row for the dedicated Lens capture principal so the
 * cardmem Lens daemon can authenticate against authed surfaces (F036).
 *
 * The principal is a non-cb identity created on first use; its password is a
 * random, never-disclosed value, so the account can ONLY ever be reached through
 * the bearer-gated mint endpoint — never an ordinary login. `expiresAtMs` is the
 * already-TTL-clamped expiry handed in by @broberg/lens.
 */
export async function mintLensSession(
  principal: string,
  expiresAtMs: number,
): Promise<string> {
  const db = getDb();

  let user = getUserByEmail(principal);
  if (!user) {
    user = createUser({
      email: principal,
      name: 'Lens Capture',
      hashedPassword: await hashPassword(crypto.randomBytes(32).toString('hex')),
      role: 'super_admin',
    });
  }

  // Prefix the id so the edge middleware can 403 any mutating request from this
  // session — "render everything, mutate nothing" — decoupling the super_admin
  // reach (needed to capture all surfaces) from any write capability.
  const sessionId = `${LENS_SESSION_PREFIX}${nanoid()}`;
  db.insert(sessions)
    .values({
      id: sessionId,
      userId: user.id,
      expiresAt: Math.floor(expiresAtMs / 1000),
    })
    .run();

  return sessionId;
}
