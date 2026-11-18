import { describe, it, expect } from 'vitest';
import { analyzeSql } from '@/server/sql/analyzer';
import { accusationGate, decideCount, resultHash, type PriorQuery } from '@/server/rules';
import { matchesEvidence, cellMatches } from '@/server/sql/evidence';
import { getCase } from '@/cases';
import type { QueryResult } from '@/server/sql/evidence';

const ctx = { schema: 'case_01', tables: ['empleados', 'salas'] };
const res = (rows: unknown[][], columns = ['a', 'b']): QueryResult => ({ columns, rows, rowCount: rows.length, truncated: false });

function simulate(items: { sql: string; rows: unknown[][] }[]) {
  const prior: PriorQuery[] = [];
  const out: boolean[] = [];
  items.forEach((it, i) => {
    const a = analyzeSql(it.sql, ctx);
    const r = res(it.rows);
    const d = decideCount(a, r, prior);
    prior.push({ seq: i + 1, counted: d.counted, executed: true, normalized_hash: a.normalizedHash, template_hash: a.templateHash, shape_hash: a.shapeHash, result_hash: resultHash(r) });
    out.push(d.counted);
  });
  return out;
}

describe('Conteo de consultas válidas (anti-repetición)', () => {
  it('la misma consulta repetida 20 veces solo cuenta una vez', () => {
    const counted = simulate(Array.from({ length: 20 }, () => ({ sql: 'SELECT * FROM empleados;', rows: [[1, 'x']] })));
    expect(counted.filter(Boolean)).toHaveLength(1);
  });
  it('una consulta equivalente (otro orden u otro alias) no suma', () => {
    const counted = simulate([
      { sql: 'SELECT nombre, cargo FROM empleados', rows: [['Ana', 'x'], ['Bo', 'y']] },
      { sql: 'SELECT e.nombre AS n, e.cargo FROM empleados e ORDER BY e.nombre DESC', rows: [['Bo', 'y'], ['Ana', 'x']] },
    ]);
    expect(counted).toEqual([true, false]);
  });
  it('limita la misma plantilla con distintos literales', () => {
    const counted = simulate([1, 2, 3, 4].map((n) => ({ sql: `SELECT * FROM empleados WHERE id_empleado = ${n}`, rows: [[n, 'x']] })));
    expect(counted).toEqual([true, true, false, false]);
  });
  it('limita la misma forma con proyecciones distintas', () => {
    const cols = ['nombre', 'apellido', 'cargo', 'turno'];
    const counted = simulate(cols.map((c, i) => ({ sql: `SELECT ${c} FROM empleados WHERE nivel_acceso > 1`, rows: [[i, c]] })));
    expect(counted).toEqual([true, true, true, false]);
  });
  it('no cuenta consultas sin tablas ni con solo constantes', () => {
    expect(simulate([{ sql: 'SELECT 1', rows: [[1]] }])).toEqual([false]);
    expect(simulate([{ sql: 'SELECT 1 FROM empleados', rows: [[1]] }])).toEqual([false]);
  });
  it('las búsquedas sin resultados sí pueden contar', () => {
    expect(simulate([{ sql: "SELECT * FROM empleados WHERE turno = 'madrugada'", rows: [] }])).toEqual([true]);
  });
});

describe('Habilitación de acusaciones', () => {
  const c = getCase(1)!;
  const keys = c.evidence.filter((e) => e.key).map((e) => e.id);
  const allEv = c.evidence.map((e) => e.id);
  const base = { caseDef: c, foundEvidence: allEv, evidenceAtLastAccusation: 0, accusedSuspects: [] as string[], status: 'en_proceso' };
  it('exige 20 consultas válidas para la primera acusación', () => {
    expect(accusationGate({ ...base, validQueries: 19, failedAccusations: 0 }).unlocked).toBe(false);
    expect(accusationGate({ ...base, validQueries: 20, failedAccusations: 0 }).unlocked).toBe(true);
  });
  it('20 → 30 → 40 → 50 según acusaciones fallidas', () => {
    expect([0, 1, 2, 3].map((f) => accusationGate({ ...base, validQueries: 0, failedAccusations: f }).requiredQueries)).toEqual([20, 30, 40, 50]);
  });
  it('exige evidencias fundamentales y objetivos', () => {
    const g = accusationGate({ ...base, foundEvidence: keys.slice(0, 2), validQueries: 25, failedAccusations: 0 });
    expect(g.unlocked).toBe(false);
    expect(g.reasons.join(' ')).toMatch(/fundamentales/);
  });
  it('tras una acusación fallida exige evidencia nueva si quedan por descubrir', () => {
    const found = allEv.slice(0, allEv.length - 2);
    const g = accusationGate({ ...base, foundEvidence: found, evidenceAtLastAccusation: found.length, validQueries: 40, failedAccusations: 1 });
    expect(g.needsNewEvidence).toBe(true);
    expect(g.unlocked).toBe(false);
  });
  it('bloquea acusaciones en investigaciones cerradas', () => {
    expect(accusationGate({ ...base, validQueries: 99, failedAccusations: 0, status: 'resuelto' }).unlocked).toBe(false);
  });
});

describe('Coincidencia de evidencias', () => {
  it('compara números exactos y textos sin acentos ni mayúsculas', () => {
    expect(cellMatches('64.00', '64')).toBe(true);
    expect(cellMatches('164', '64')).toBe(false);
    expect(cellMatches('Inés Varela', 'ines')).toBe(true);
    expect(cellMatches('2025-03-14 23:41:00', '23:41')).toBe(true);
    expect(cellMatches('2', '=2')).toBe(true);
  });
  it('exige resultados acotados y construcciones cuando se piden', () => {
    const m = { any: [['T-0457', '23:41']], maxRows: 3, features: ['where' as const] };
    const rows = [['T-0457', '2025-03-14 23:41:00']];
    expect(matchesEvidence(m, res(rows), ['select', 'where'])).toBe(true);
    expect(matchesEvidence(m, res(rows), ['select'])).toBe(false);
    expect(matchesEvidence(m, res([...rows, [1, 2], [3, 4], [5, 6]]), ['select', 'where'])).toBe(false);
    expect(matchesEvidence(m, { ...res(rows), truncated: true }, ['select', 'where'])).toBe(false);
  });
});
