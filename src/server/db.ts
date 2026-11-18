import pg from 'pg';

// Fechas y horas como texto: evita conversiones de zona horaria en los datos de los casos.
// (timestamptz del esquema game se mantiene como Date)
for (const oid of [1082, 1083, 1114, 1266]) pg.types.setTypeParser(oid, (v: string) => v);

type Globals = { __sqldPool?: pg.Pool; __sqldSandboxPool?: pg.Pool; __sqldSandboxMode?: 'login' | 'owner' };
const g = globalThis as unknown as Globals;

export function rolePrefix() {
  return (process.env.SQLD_ROLE_PREFIX || 'sqld').toLowerCase().replace(/[^a-z0-9_]/g, '');
}
export function caseRole(caseId: number) {
  return `${rolePrefix()}_c${String(caseId).padStart(2, '0')}`;
}
export function sandboxLoginRole() {
  return `${rolePrefix()}_sandbox`;
}
export function caseSchema(caseId: number) {
  return `case_${String(caseId).padStart(2, '0')}`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}. Consulta README.md y .env.example.`);
  return v;
}

export function pool(): pg.Pool {
  if (!g.__sqldPool) {
    g.__sqldPool = new pg.Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    g.__sqldPool.on('error', (e) => console.error('[db] error en conexión inactiva', e.message));
  }
  return g.__sqldPool;
}

/** Cadena de conexión para el entorno aislado: un rol LOGIN sin privilegios sobre el esquema game. */
export function sandboxConnectionString(): { url: string; mode: 'login' | 'owner' } {
  if (process.env.SANDBOX_DATABASE_URL) return { url: process.env.SANDBOX_DATABASE_URL, mode: 'login' };
  const base = requireEnv('DATABASE_URL');
  const pass = process.env.SANDBOX_DB_PASSWORD;
  if (pass) {
    const u = new URL(base);
    u.username = sandboxLoginRole();
    u.password = pass;
    return { url: u.toString(), mode: 'login' };
  }
  return { url: base, mode: 'owner' };
}

export function sandboxPool(): { pool: pg.Pool; mode: 'login' | 'owner' } {
  if (!g.__sqldSandboxPool) {
    const { url, mode } = sandboxConnectionString();
    if (mode === 'owner' && process.env.NODE_ENV === 'production')
      console.warn('[sandbox] SANDBOX_DB_PASSWORD no está configurada: se usa la conexión principal con SET ROLE (menos aislamiento).');
    g.__sqldSandboxPool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.PG_SANDBOX_POOL_MAX || 4),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    g.__sqldSandboxPool.on('error', (e) => console.error('[sandbox] error en conexión inactiva', e.message));
    g.__sqldSandboxMode = mode;
  }
  return { pool: g.__sqldSandboxPool, mode: g.__sqldSandboxMode ?? 'owner' };
}

export async function q<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const r = await pool().query<T>(text, values);
  return r.rows;
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function quoteIdent(id: string): string {
  return '"' + id.replace(/"/g, '""') + '"';
}

export async function closePools() {
  await g.__sqldPool?.end().catch(() => {});
  await g.__sqldSandboxPool?.end().catch(() => {});
  g.__sqldPool = undefined;
  g.__sqldSandboxPool = undefined;
}
