// Paso previo al build en Vercel: migraciones idempotentes, carga de casos si faltan y docente inicial opcional.
// Se ejecuta con "npm run vercel-build" (Vercel lo detecta automáticamente).
import './env';
import pg from 'pg';
import { migrate, seedAll, setupSandboxRole } from '../src/server/seed';
import { ALL_CASES } from '../src/cases';
import { createAdmin } from '../src/server/admin';
import { closePools } from '../src/server/db';

async function main() {
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL) {
      console.error('[vercel-build] DATABASE_URL no está definida en Vercel (Settings → Environment Variables, entorno Production). Sin ella el juego no funciona.');
      process.exit(1);
    }
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
  } else {
    console.log('[vercel-build] casos ya cargados (usa SEED_ON_BUILD=true para recargarlos).');
    // Sincroniza siempre la contraseña del rol aislado con SANDBOX_DB_PASSWORD (idempotente).
    await setupSandboxRole(client, ALL_CASES, process.env.SANDBOX_DB_PASSWORD);
    if (process.env.SANDBOX_DB_PASSWORD) console.log('[vercel-build] rol aislado sincronizado con SANDBOX_DB_PASSWORD.');
  }
  await client.end();
  const user = (process.env.ADMIN_USERNAME ?? '').trim();
  const pass = (process.env.ADMIN_PASSWORD ?? '').trim();
  if (user || pass) {
    // Un error aquí no debe impedir el despliegue del juego: solo se avisa (sin mostrar valores).
    try {
      await createAdmin(user, pass);
      console.log(`[vercel-build] docente «${user}» creado/actualizado. Elimina ADMIN_PASSWORD de las variables de entorno.`);
    } catch (e) {
      console.warn(
        `[vercel-build] AVISO: no se creó el docente (${(e as Error).message}). ` +
          `Vercel entregó ADMIN_USERNAME con ${user.length} caracteres y ADMIN_PASSWORD con ${pass.length} caracteres. El juego se despliega igual.`,
      );
    }
  }
  await closePools();
}

main().catch((e) => {
  console.error('[vercel-build] error preparando la base de datos:', e.message);
  process.exit(1);
});
