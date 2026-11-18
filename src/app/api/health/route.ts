import { json } from '@/server/http';
import { q } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await q<{ n: string }>("SELECT count(*) AS n FROM information_schema.schemata WHERE schema_name LIKE 'case\\_%'");
    const m = await q<{ n: string }>('SELECT count(*) AS n FROM game.schema_migrations');
    return json({ ok: true, caseSchemas: Number(r[0].n), migrations: Number(m[0].n) });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message.slice(0, 200) }, 503);
  }
}
