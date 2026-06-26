import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { LENS_SESSION_PREFIX } from './lib/auth/lens-constants';

const COOKIE = 'pitch-vault-session';

function req(
  method: string,
  pathname: string,
  sessionValue?: string,
): NextRequest {
  const r = new NextRequest(new URL(`http://localhost:4300${pathname}`), {
    method,
  });
  if (sessionValue) r.cookies.set(COOKIE, sessionValue);
  return r;
}

const LENS = `${LENS_SESSION_PREFIX}abc123`;
const NORMAL = 'normalsession123';

describe('capture-only guard (F036) — Lens sessions are read-only', () => {
  it('403s a Lens session on every mutating method against /api/*', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = middleware(req(method, '/api/invite', LENS));
      expect(res.status, `${method} should be blocked`).toBe(403);
    }
  });

  it('lets a Lens session READ (GET) /api/* through', () => {
    const res = middleware(req('GET', '/api/v1/pitches', LENS));
    expect(res.status).not.toBe(403);
  });

  it('does NOT block a normal session from mutating', () => {
    const res = middleware(req('POST', '/api/invite', NORMAL));
    expect(res.status).not.toBe(403);
  });

  it('does NOT block an unauthenticated mutating request at the guard (route auth handles it)', () => {
    const res = middleware(req('POST', '/api/invite'));
    expect(res.status).not.toBe(403);
  });
});
