// Inicia un PostgreSQL real (binarios embebidos) exclusivo para las pruebas, migra y carga los 16 casos.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import type { TestProject } from 'vitest/node';

let server: EmbeddedPostgres | null = null;
let dir = '';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

export default async function setup(project: TestProject) {
  const port = process.env.TEST_PG_PORT ? Number(process.env.TEST_PG_PORT) : await freePort();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqld-test-pg-'));
  server = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {} });
  await server.initialise();
  await server.start();
  const admin = new pg.Client({ connectionString: `postgres://postgres:postgres@localhost:${port}/postgres` });
  await admin.connect();
  await admin.query('CREATE DATABASE sqld_test');
  await admin.end();

  const env = {
    DATABASE_URL: `postgres://postgres:postgres@localhost:${port}/sqld_test`,
    SANDBOX_DB_PASSWORD: 'test-sandbox-Pw-2026-qx81',
    SESSION_SECRET: 'test-session-secret-0123456789abcdef0123456789',
    REPORT_SIGNING_SECRET: 'test-report-secret-0123456789abcdef0123456789',
    QUERY_RATE_PER_MIN: '100000',
    SQLD_ROLE_PREFIX: 'sqldtest',
  };
  Object.assign(process.env, env);
  const { migrate, seedAll } = await import('../../src/server/seed');
  const { ALL_CASES } = await import('../../src/cases');
  const c = new pg.Client({ connectionString: env.DATABASE_URL });
  await c.connect();
  await migrate(c, path.join(process.cwd(), 'db', 'migrations'));
  await seedAll(c, ALL_CASES, env.SANDBOX_DB_PASSWORD);
  await c.end();
  project.provide('testEnv', env);

  return async () => {
    await server?.stop().catch(() => {});
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows puede retener archivos unos segundos */
    }
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    testEnv: Record<string, string>;
  }
}
