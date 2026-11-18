// Ejecución aislada de consultas de estudiantes.
// Capas: (1) AST validado por analyzer.ts; (2) protocolo extendido (una sola sentencia, lo exige PostgreSQL);
// (3) transacción READ ONLY; (4) SET LOCAL ROLE al rol del caso, que solo tiene SELECT sobre su esquema;
// (5) conexión con un rol LOGIN sin privilegios sobre el esquema game; (6) statement_timeout y límite de filas.
import Cursor from 'pg-cursor';
import { caseRole, caseSchema, quoteIdent, sandboxPool } from '../db';
import type { QueryResult } from './evidence';

export const MAX_ROWS = 500;
export const TIMEOUT_MS = Number(process.env.SQL_TIMEOUT_MS || 4000);

export interface SandboxResult extends QueryResult {
  durationMs: number;
}

export async function runSandboxed(caseId: number, sql: string): Promise<SandboxResult> {
  const { pool } = sandboxPool();
  const client = await pool.connect();
  let broken: Error | undefined;
  const started = Date.now();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY');
    await client.query(`SET LOCAL ROLE ${quoteIdent(caseRole(caseId))}`);
    await client.query(`SET LOCAL search_path TO ${quoteIdent(caseSchema(caseId))}`);
    await client.query(`SET LOCAL statement_timeout = ${Math.max(500, TIMEOUT_MS)}`);
    await client.query(`SET LOCAL work_mem = '8MB'`);
    const text = sql.trim().replace(/;+\s*$/, '');
    const cursor = client.query(new Cursor(text, [], { rowMode: 'array' }));
    const { rows, fields } = await new Promise<{ rows: unknown[][]; fields: { name: string }[] }>((resolve, reject) => {
      cursor.read(MAX_ROWS + 1, (err: Error | undefined, rows: unknown[][], result: { fields?: { name: string }[] }) => {
        if (err) reject(err);
        else resolve({ rows, fields: result?.fields ?? [] });
      });
    });
    await new Promise<void>((resolve) => cursor.close(() => resolve()));
    await client.query('ROLLBACK');
    const truncated = rows.length > MAX_ROWS;
    const kept = truncated ? rows.slice(0, MAX_ROWS) : rows;
    return {
      columns: fields.map((f) => f.name),
      rows: kept.map((r) => r.map(normalizeCell)),
      rowCount: kept.length,
      truncated,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (re) {
      broken = re as Error;
    }
    throw e;
  } finally {
    client.release(broken);
  }
}

function normalizeCell(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}
