import { NextResponse, type NextRequest } from 'next/server';
import { GameError, playerByToken, type PlayerRow } from './game';
import { adminBySession } from './admin';

export const PLAYER_COOKIE = 'sqld_player';
export const ADMIN_COOKIE = 'sqld_admin';
const secure = process.env.NODE_ENV === 'production';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') checkOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof GameError) return json({ error: e.message }, e.status);
      const msg = (e as Error)?.message ?? String(e);
      if (/DATABASE_URL|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|getaddrinfo|password authentication|timeout expired|SSL|self.signed/i.test(msg)) {
        console.error('[api] base de datos no disponible:', msg);
        return json({ error: 'La base de datos de la agencia no está disponible. Avisa al docente.' }, 503);
      }
      if (/(relation|schema) "game(\.|")/i.test(msg)) {
        console.error('[api] base de datos sin preparar (faltan migraciones):', msg);
        return json({ error: 'La base de datos existe pero aún no está preparada (faltan las migraciones). Avisa al docente.' }, 503);
      }
      if (/(SESSION_SECRET|REPORT_SIGNING_SECRET) debe definirse/.test(msg)) {
        console.error('[api] configuración incompleta:', msg);
        return json({ error: 'El servidor no está bien configurado (secretos). Avisa al docente.' }, 503);
      }
      console.error('[api] error inesperado', e);
      return json({ error: 'Error inesperado en el servidor.' }, 500);
    }
  };
}

/** Protección CSRF básica: las peticiones que modifican estado deben venir del mismo origen. */
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    if (new URL(origin).host !== host) throw new GameError(403, 'Origen no permitido.');
  } catch (e) {
    if (e instanceof GameError) throw e;
    throw new GameError(403, 'Origen no permitido.');
  }
}

export async function readJson<T = Record<string, unknown>>(req: NextRequest, maxBytes = 32_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new GameError(413, 'Petición demasiado grande.');
  try {
    const v = JSON.parse(text || '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as T;
  } catch {
    throw new GameError(400, 'JSON inválido.');
  }
}

export function str(v: unknown, max = 500): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

export function clientIp(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

export async function requirePlayer(req: NextRequest): Promise<PlayerRow> {
  const p = await playerByToken(req.cookies.get(PLAYER_COOKIE)?.value);
  if (!p) throw new GameError(401, 'Tu credencial no es válida o expiró. Regístrate o recupera tu credencial.');
  return p;
}

export async function requireAdmin(req: NextRequest) {
  const a = await adminBySession(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!a) throw new GameError(401, 'Sesión de docente no válida.');
  return a;
}

export function setPlayerCookie(res: NextResponse, token: string) {
  res.cookies.set(PLAYER_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 24 * 180 });
}
export function setAdminCookie(res: NextResponse, token: string, hours: number) {
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure, path: '/', maxAge: 60 * 60 * hours });
}
