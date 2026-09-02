import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, MAX_AGE_MS, createSessionToken } from '../../../../lib/session';

export async function POST(request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== secret) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(MAX_AGE_MS / 1000)
  });
  return res;
}
