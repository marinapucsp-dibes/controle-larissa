import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  const valid = secret ? await verifySessionToken(token, secret) : false;

  if (!valid) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)']
};
