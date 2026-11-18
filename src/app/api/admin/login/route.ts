import { NextResponse } from 'next/server';
import { handle, json, readJson, setAdminCookie, str, clientIp } from '@/server/http';
import { ADMIN_SESSION_HOURS, loginAdmin } from '@/server/admin';

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const r = await loginAdmin(str(body.username, 60), str(body.password, 200), clientIp(req));
  if (!r.ok) return json({ error: r.message }, r.status);
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  setAdminCookie(res, r.token, ADMIN_SESSION_HOURS);
  return res;
});
