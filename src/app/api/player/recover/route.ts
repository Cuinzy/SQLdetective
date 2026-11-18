import { NextResponse } from 'next/server';
import { handle, readJson, setPlayerCookie, str, clientIp, json } from '@/server/http';
import { audit, recoverPlayer } from '@/server/game';
import { q } from '@/server/db';

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  const fails = await q<{ n: string }>("SELECT count(*) AS n FROM game.audit_log WHERE action = 'player.recover_failed' AND ip IS NOT DISTINCT FROM $1 AND at > now() - interval '15 minutes'", [ip]);
  if (Number(fails[0].n) >= 10) return json({ error: 'Demasiados intentos. Espera 15 minutos o pide ayuda a tu docente.' }, 429);
  const body = await readJson(req);
  const r = await recoverPlayer(str(body.badge, 20), str(body.recoveryKey, 30));
  if (!r) {
    await audit('player', null, 'player.recover_failed', null, {}, ip);
    return json({ error: 'La placa o la clave de recuperación no coinciden.' }, 401);
  }
  await audit('player', r.playerId, 'player.recover', null, {}, ip);
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  setPlayerCookie(res, r.token);
  return res;
});
