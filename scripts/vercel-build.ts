// Paso previo al build en Vercel: migraciones idempotentes, carga de casos si faltan y docente inicial opcional.
// Se ejecuta con "npm run vercel-build" (Vercel lo detecta automáticamente).
import './env';
import pg from 'pg';
import { migrate, seedAll } from '../src/server/seed';
import { ALL_CASES } from '../src/cases';
import { createAdmin } from '../src/server/admin';
import { closePools } from '../src/server/db';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn('[vercel-build] DATABASE_URL no está definida: se omite la preparación de la base de datos.');
    return;
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const applied = await migrate(client);
  console.log(`[vercel-build] migraciones: ${applied.length ? applied.join(', ') : 'al día'}`);
  const present = await client.query<{ n: string }>("SELECT count(*) AS n FROM information_schema.schemata WHERE schema_name LIKE 'case\\_%'");
  const force = process.env.SEED_ON_BUILD === 'true';
  if (force || Number(present.rows[0].n) < ALL_CASES.length) {
    console.log('[vercel-build] cargando los casos…');
    await seedAll(client, ALL_CASES, process.env.SANDBOX_DB_PASSWORD);
  } else console.log('[vercel-build] casos ya cargados (usa SEED_ON_BUILD=true para recargarlos).');
  await client.end();
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    await createAdmin(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
    console.log(`[vercel-build] docente «${process.env.ADMIN_USERNAME}» creado/actualizado. Elimina ADMIN_PASSWORD de las variables de entorno.`);
  }
  await closePools();
}

main().catch((e) => {
  console.error('[vercel-build] error preparando la base de datos:', e.message);
  process.exit(1);
});
