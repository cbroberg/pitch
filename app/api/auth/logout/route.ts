import { NextResponse } from 'next/server';
import {
  getSessionFromCookie,
  invalidateSession,
  clearSessionCookie,
} from '@/lib/auth/session';

export async function POST() {
  const sessionId = await getSessionFromCookie();
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
