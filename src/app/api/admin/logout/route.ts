import { NextResponse } from 'next/server';
import { handle, ADMIN_COOKIE } from '@/server/http';
import { logoutAdmin } from '@/server/admin';

export const POST = handle(async (req) => {
  await logoutAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
});
