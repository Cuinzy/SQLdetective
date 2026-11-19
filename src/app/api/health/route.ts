import { json } from '@/server/http';
import { q, sandboxPool } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Diagnóstico de despliegue: indica qué falta sin revelar nunca los valores de las variables. */
export async function GET() {
  const len = (n: string) => (process.env[n] ?? '').length;
  const env = {
    DATABASE_URL: len('DATABASE_URL') > 0,
    SANDBOX_DB_PASSWORD: len('SANDBOX_DB_PASSWORD') > 0,
    SESSION_SECRET_32: len('SESSION_SECRET') >= 32,
    REPORT_SIGNING_SECRET_32: len('REPORT_SIGNING_SECRET') >= 32,
  };
  const short = (e: unknown) => ((e as Error)?.message ?? String(e)).slice(0, 200);

  let database: Record<string, unknown>;
  try {
    const r = await q<{ n: string }>("SELECT count(*) AS n FROM information_schema.schemata WHERE schema_name LIKE 'case\\_%'");
    let migrations: number | string = 0;
    try {
      migrations = Number((await q<{ n: string }>('SELECT count(*) AS n FROM game.schema_migrations'))[0].n);
    } catch (e) {
      migrations = 'sin migraciones: ' + short(e);
    }
    database = { ok: true, caseSchemas: Number(r[0].n), migrations };
  } catch (e) {
    database = { ok: false, error: short(e) };
  }

  let sandbox: Record<string, unknown>;
  try {
    const { pool, mode } = sandboxPool();
    await pool.query('SELECT 1');
    sandbox = { ok: true, mode };
  } catch (e) {
    sandbox = { ok: false, error: short(e) };
  }

  const ok =
    env.DATABASE_URL && env.SESSION_SECRET_32 && env.REPORT_SIGNING_SECRET_32 &&
    database.ok === true && database.caseSchemas === 16 && database.migrations === 1 && sandbox.ok === true;
  return json({ ok, env, database, sandbox }, ok ? 200 : 503);
}
