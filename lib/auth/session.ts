import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db/client';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'pitch-vault-session';
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = nanoid();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;

  db.insert(sessions).values({ id: sessionId, userId, expiresAt }).run();

  return sessionId;
}

export async function validateSession(
  sessionId: string,
): Promise<{ userId: string } | null> {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session) return null;
  if (session.expiresAt < now) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }

  return { userId: session.userId };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === 'production';
  const expiresDate = new Date(Date.now() + SESSION_DURATION * 1000);

  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    expires: expiresDate,
    path: '/',
  });
}

export async function getSessionFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
