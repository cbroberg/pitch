import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'pitch-vault-session';

const PROTECTED_PATHS = [
  '/dashboard',
  '/pitches',
  '/folders',
  '/access',
  '/settings',
  '/preview',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    '/dashboard/:path*',
    '/pitches/:path*',
    '/folders/:path*',
    '/access/:path*',
    '/settings/:path*',
    '/preview/:path*',
  ],
};
