import { NextResponse } from 'next/server';
import { handle, readJson, setPlayerCookie, str, clientIp } from '@/server/http';
import { audit, registerPlayer } from '@/server/game';

export const POST = handle(async (req) => {
  const body = await readJson(req);
  const r = await registerPlayer({ fullName: str(body.fullName, 120), group: str(body.group, 60), studentCode: str(body.studentCode, 40) || null });
  await audit('player', r.playerId, 'player.register', null, {}, clientIp(req));
  const res = NextResponse.json({ badge: r.badge, recoveryKey: r.recoveryKey }, { headers: { 'Cache-Control': 'no-store' } });
  setPlayerCookie(res, r.token);
  return res;
});
