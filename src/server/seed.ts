// Creación de los esquemas de casos, roles de solo lectura y carga de datos.
import type pg from 'pg';
import type { CaseDef, ColType, TableDef } from '@/cases/types';
import { caseRole, caseSchema, quoteIdent, sandboxLoginRole } from './db';
import fs from 'node:fs';
import path from 'node:path';

const PG_TYPES: Record<ColType, string> = {
  integer: 'integer',
  text: 'text',
  numeric: 'numeric(14,2)',
  date: 'date',
  time: 'time',
  timestamp: 'timestamp',
  boolean: 'boolean',
};

export function orderTables(tables: TableDef[]): TableDef[] {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const out: TableDef[] = [];
  const seen = new Set<string>();
  const visit = (t: TableDef, stack: Set<string>) => {
    if (seen.has(t.name)) return;
    if (stack.has(t.name)) throw new Error(`Dependencia circular de claves foráneas en ${t.name}`);
    stack.add(t.name);
    for (const c of t.columns) if (c.fk && c.fk.table !== t.name) visit(byName.get(c.fk.table)!, stack);
    stack.delete(t.name);
    seen.add(t.name);
    out.push(t);
  };
  for (const t of tables) visit(t, new Set());
  return out;
}

export function tableDDL(schema: string, t: TableDef): string {
  const cols = t.columns.map((c) => `  ${quoteIdent(c.name)} ${PG_TYPES[c.type]}${c.pk || !c.nullable ? ' NOT NULL' : ''}`);
  const pks = t.columns.filter((c) => c.pk).map((c) => quoteIdent(c.name));
  if (pks.length) cols.push(`  PRIMARY KEY (${pks.join(', ')})`);
  for (const c of t.columns)
    if (c.fk) cols.push(`  FOREIGN KEY (${quoteIdent(c.name)}) REFERENCES ${quoteIdent(schema)}.${quoteIdent(c.fk.table)} (${quoteIdent(c.fk.column)})`);
  return `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(t.name)} (\n${cols.join(',\n')}\n)`;
}

async function ensureRole(client: pg.ClientBase, role: string, attrs: string) {
  const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  if (exists.rowCount === 0) await client.query(`CREATE ROLE ${quoteIdent(role)} ${attrs}`);
}

export async function migrate(client: pg.ClientBase, dir = path.join(process.cwd(), 'db', 'migrations')) {
  await client.query('CREATE SCHEMA IF NOT EXISTS game');
  await client.query('CREATE TABLE IF NOT EXISTS game.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const f of files) {
    const done = await client.query('SELECT 1 FROM game.schema_migrations WHERE name = $1', [f]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO game.schema_migrations (name) VALUES ($1)', [f]);
      await client.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
  return applied;
}

export async function seedCase(client: pg.ClientBase, c: CaseDef) {
  const schema = caseSchema(c.id);
  const role = caseRole(c.id);
  await ensureRole(client, role, 'NOLOGIN NOINHERIT');
  await client.query('BEGIN');
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdent(schema)} CASCADE`);
    await client.query(`CREATE SCHEMA ${quoteIdent(schema)}`);
    for (const t of orderTables(c.tables)) {
      await client.query(tableDDL(schema, t));
      await client.query(`COMMENT ON TABLE ${quoteIdent(schema)}.${quoteIdent(t.name)} IS ${literal(t.description)}`);
      const n = t.columns.length;
      const batch = Math.max(1, Math.floor(3000 / n));
      for (let i = 0; i < t.rows.length; i += batch) {
        const chunk = t.rows.slice(i, i + batch);
        const values: unknown[] = [];
        const tuples = chunk.map((row, ri) => {
          if (row.length !== n) throw new Error(`${c.code}.${t.name}: fila ${i + ri + 1} tiene ${row.length} valores (se esperaban ${n})`);
          values.push(...row);
          return '(' + row.map((_, ci) => `$${ri * n + ci + 1}`).join(', ') + ')';
        });
        await client.query(
          `INSERT INTO ${quoteIdent(schema)}.${quoteIdent(t.name)} (${t.columns.map((col) => quoteIdent(col.name)).join(', ')}) VALUES ${tuples.join(', ')}`,
          values,
        );
      }
    }
    await client.query(`REVOKE ALL ON SCHEMA ${quoteIdent(schema)} FROM PUBLIC`);
    await client.query(`GRANT USAGE ON SCHEMA ${quoteIdent(schema)} TO ${quoteIdent(role)}`);
    await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${quoteIdent(schema)} TO ${quoteIdent(role)}`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  // El usuario de la aplicación necesita poder hacer SET ROLE al rol del caso.
  try {
    await client.query(`GRANT ${quoteIdent(role)} TO CURRENT_USER`);
  } catch {
    /* ya concedido o el usuario ya es miembro */
  }
}

function literal(s: string) {
  return "'" + s.replace(/'/g, "''") + "'";
}

export async function setupSandboxRole(client: pg.ClientBase, cases: CaseDef[], password?: string) {
  const login = sandboxLoginRole();
  if (password) {
    await ensureRole(client, login, 'LOGIN NOINHERIT');
    await client.query(`ALTER ROLE ${quoteIdent(login)} WITH LOGIN NOINHERIT PASSWORD ${literal(password)}`);
    await client.query(`ALTER ROLE ${quoteIdent(login)} SET statement_timeout = '6s'`);
    await client.query(`ALTER ROLE ${quoteIdent(login)} SET idle_in_transaction_session_timeout = '15s'`);
    for (const c of cases) await client.query(`GRANT ${quoteIdent(caseRole(c.id))} TO ${quoteIdent(login)}`);
    await client.query(`REVOKE ALL ON SCHEMA game FROM ${quoteIdent(login)}`);
  }
  await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC').catch(() => {});
  await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA game FROM PUBLIC');
}

export async function seedAll(client: pg.ClientBase, cases: CaseDef[], sandboxPassword?: string) {
  for (const c of cases) await seedCase(client, c);
  await setupSandboxRole(client, cases, sandboxPassword);
}
