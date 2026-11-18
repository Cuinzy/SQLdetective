import './env';
import pg from 'pg';
import { migrate } from '../src/server/seed';

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const applied = await migrate(client);
  console.log(applied.length ? `Migraciones aplicadas: ${applied.join(', ')}` : 'La base de datos ya está al día.');
  await client.end();
}
main().catch((e) => {
  console.error('Error en migración:', e.message);
  process.exit(1);
});
