import { NextResponse } from 'next/server';
import { handle, PLAYER_COOKIE } from '@/server/http';

export const POST = handle(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLAYER_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
});
