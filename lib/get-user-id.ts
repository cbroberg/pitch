import { getSessionFromCookie, validateSession } from '@/lib/auth/session';

export async function getUserId(): Promise<string> {
  const sessionId = await getSessionFromCookie();
  if (!sessionId) throw new Error('Not authenticated');

  const session = await validateSession(sessionId);
  if (!session) throw new Error('Not authenticated');

  return session.userId;
}
