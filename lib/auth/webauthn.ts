import { cookies } from 'next/headers';

const CHALLENGE_COOKIE = 'pitch-vault-passkey-challenge';
const CHALLENGE_DURATION = 5 * 60; // 5 minutes

export function getRpConfig(requestOrigin: string) {
  // requestOrigin is the full origin: e.g. "https://pitch.broberg.dk" or "http://localhost:4300"
  const url = new URL(requestOrigin);
  const rpID = url.hostname; // domain only, no protocol or port
  const rpName = 'Pitch Vault';
  return { rpID, rpName, origin: requestOrigin };
}

export function getRequestOrigin(headers: Headers): string {
  // Trust the Host header in production behind Fly.io proxy
  const host = headers.get('host');
  const proto = headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function setChallengeCookie(challenge: string, purpose: 'register' | 'authenticate', userId?: string) {
  const cookieStore = await cookies();
  const value = JSON.stringify({ challenge, purpose, userId, exp: Date.now() + CHALLENGE_DURATION * 1000 });
  cookieStore.set(CHALLENGE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CHALLENGE_DURATION,
    path: '/',
  });
}

export async function getChallengeCookie(): Promise<{
  challenge: string;
  purpose: 'register' | 'authenticate';
  userId?: string;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.exp < Date.now()) return null;
    return { challenge: parsed.challenge, purpose: parsed.purpose, userId: parsed.userId };
  } catch {
    return null;
  }
}

export async function clearChallengeCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
}
