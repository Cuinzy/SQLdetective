import { createHmac, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;

function secret(name: 'SESSION_SECRET' | 'REPORT_SIGNING_SECRET'): string {
  const v = process.env[name];
  if (!v || v.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error(`${name} debe definirse con al menos 32 caracteres.`);
    return `dev-insecure-${name}-0123456789abcdef0123456789`;
  }
  return v;
}

/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function randomCode(groups: number, size = 4): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let s = '';
    for (let i = 0; i < size; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(s);
  }
  return parts.join('-');
}
export const newVerificationCode = () => `SQLD-${randomCode(3)}`;
export const newBadgeCode = () => `AG-${randomCode(2)}`;
export const newRecoveryKey = () => randomCode(4);
export const newToken = () => randomBytes(32).toString('base64url');

export function hmacToken(token: string): string {
  return createHmac('sha256', secret('SESSION_SECRET')).update(token).digest('hex');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function signPayload(canonical: string): string {
  return createHmac('sha256', secret('REPORT_SIGNING_SECRET')).update(canonical).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const key = await scrypt(pw.normalize('NFKC'), salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(pw.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** JSON canónico: claves ordenadas, sin espacios. Base de la firma de reportes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}
