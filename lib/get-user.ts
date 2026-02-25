import { getSessionFromCookie, validateSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/lib/db/schema';

export async function getUser(): Promise<User> {
  const sessionId = await getSessionFromCookie();
  if (!sessionId) throw new Error('Not authenticated');

  const session = await validateSession(sessionId);
  if (!session) throw new Error('Not authenticated');

  const db = getDb();
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) throw new Error('Not authenticated');
  return user;
}
