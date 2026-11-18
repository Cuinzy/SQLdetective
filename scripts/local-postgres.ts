// Inicia un PostgreSQL local (binarios embebidos) para desarrollo sin instalar nada.
// Uso: npm run db:local   → deja el servidor corriendo en el puerto 54329 hasta Ctrl+C.
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import fs from 'node:fs';
import pg from 'pg';

const port = Number(process.env.LOCAL_PG_PORT || 54329);
const dir = path.join(process.cwd(), '.local-pg');
const fresh = !fs.existsSync(path.join(dir, 'PG_VERSION'));

const server = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});

async function main() {
  if (fresh) await server.initialise();
  await server.start();
  const c = new pg.Client({ connectionString: `postgres://postgres:postgres@localhost:${port}/postgres` });
  await c.connect();
  const ex = await c.query("SELECT 1 FROM pg_database WHERE datname = 'sqldetective'");
  if (!ex.rowCount) await c.query('CREATE DATABASE sqldetective');
  await c.end();
  console.log(`PostgreSQL local listo en postgres://postgres:postgres@localhost:${port}/sqldetective`);
  console.log('Presiona Ctrl+C para detenerlo.');
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
