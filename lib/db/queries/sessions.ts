import { getDb } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { eq, lt } from 'drizzle-orm';

export function createSession(data: {
  id: string;
  userId: string;
  expiresAt: number;
}) {
  return getDb().insert(sessions).values(data).returning().get();
}

export function getSession(id: string) {
  return getDb().select().from(sessions).where(eq(sessions.id, id)).get();
}

export function deleteSession(id: string) {
  return getDb().delete(sessions).where(eq(sessions.id, id)).run();
}

export function deleteExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  return getDb().delete(sessions).where(lt(sessions.expiresAt, now)).run();
}
