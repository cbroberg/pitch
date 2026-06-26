import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LENS_SESSION_PREFIX } from '@/lib/auth/lens-constants';

const COOKIE_NAME = 'pitch-vault-session';

const PROTECTED_PATHS = [
  '/dashboard',
  '/pitches',
  '/folders',
  '/access',
  '/users',
  '/settings',
  '/preview',
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Capture-only guard (F036): a Lens-minted session may READ any surface but
  // must NEVER mutate. The session id is prefixed at mint time; enforce here,
  // server-side, so a real browser carrying the lens cookie cannot craft a write
  // call. Reads (GET/HEAD) fall through, so Lens still captures everything.
  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    const session = request.cookies.get(COOKIE_NAME)?.value;
    if (session?.startsWith(LENS_SESSION_PREFIX)) {
      return NextResponse.json(
        { error: 'Lens capture sessions are read-only' },
        { status: 403 },
      );
    }
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const sessionCookie = request.cookies.get(COOKIE_NAME);
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/pitches/:path*',
    '/folders/:path*',
    '/access/:path*',
    '/users/:path*',
    '/settings/:path*',
    '/preview/:path*',
  ],
};
