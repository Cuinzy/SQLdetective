import './env';
import pg from 'pg';
import { ALL_CASES } from '../src/cases';
import { seedAll } from '../src/server/seed';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const pass = process.env.SANDBOX_DB_PASSWORD;
  if (!pass) console.warn('AVISO: SANDBOX_DB_PASSWORD no está definida; no se creará el rol LOGIN aislado (ver README).');
  await seedAll(client, ALL_CASES, pass);
  for (const c of ALL_CASES) {
    const rows = c.tables.reduce((s, t) => s + t.rows.length, 0);
    console.log(`  ${c.code}  ${c.title.padEnd(36)} ${c.tables.length} tablas, ${rows} registros`);
  }
  console.log(`Casos cargados: ${ALL_CASES.length}`);
  await client.end();
}
main().catch((e) => {
  console.error('Error al cargar casos:', e.message);
  process.exit(1);
});
