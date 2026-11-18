import { describe, it, expect } from 'vitest';
import { ALL_CASES } from '@/cases';
import { validateStructure } from '@/server/validate';
import { canonicalJson, hashPassword, newBadgeCode, newVerificationCode, verifyPassword } from '@/server/security';
import { analyzeSql } from '@/server/sql/analyzer';
import { caseSchema } from '@/server/db';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('Contenido de los casos (estructura)', () => {
  it('hay tutorial + 15 casos con niveles I, II y III', () => {
    expect(ALL_CASES).toHaveLength(16);
    expect(ALL_CASES.filter((c) => c.level === 1)).toHaveLength(5);
    expect(ALL_CASES.filter((c) => c.level === 2)).toHaveLength(5);
    expect(ALL_CASES.filter((c) => c.level === 3)).toHaveLength(5);
  });
  it.each(ALL_CASES.map((c) => [c.code, c] as const))('%s: estructura coherente y solución verificable', (_code, c) => {
    expect(validateStructure(c)).toEqual([]);
  });
  it('los 15 casos son distintos: títulos, culpables y tablas propias', () => {
    const cases = ALL_CASES.filter((c) => c.level > 0);
    expect(new Set(cases.map((c) => c.title)).size).toBe(15);
    const culprits = cases.map((c) => c.characters.find((x) => x.id === c.solution.culprit)!.name);
    expect(new Set(culprits).size).toBe(15);
    const signatures = cases.map((c) => c.tables.map((t) => t.name).sort().join(','));
    expect(new Set(signatures).size).toBe(15);
  });
  it('todas las consultas de referencia pasan el analizador', () => {
    for (const c of ALL_CASES) {
      const tables = c.tables.map((t) => t.name);
      for (const sql of [...c.evidence.map((e) => e.reference), ...c.references.map((r) => r.sql)]) {
        expect(() => analyzeSql(sql, { schema: caseSchema(c.id), tables }), `${c.code}: ${sql}`).not.toThrow();
      }
    }
  });
  it('los casos de nivel II y III exigen JOIN o agregación en evidencias', () => {
    for (const c of ALL_CASES.filter((x) => x.level >= 2)) {
      const needs = c.evidence.filter((e) => (e.match.features ?? []).concat(e.match.anyFeature ?? []).some((f) => ['join', 'aggregate', 'left_join', 'right_join'].includes(f)));
      expect(needs.length, c.code).toBeGreaterThanOrEqual(3);
    }
    for (const c of ALL_CASES.filter((x) => x.level === 3)) {
      const outer = c.evidence.filter((e) => (e.match.anyFeature ?? []).includes('left_join') || e.reference.includes('LEFT JOIN'));
      expect(outer.length, c.code).toBeGreaterThanOrEqual(1);
    }
  });
  it('los datos son deterministas: otro proceso genera exactamente los mismos registros y culpables', () => {
    const digest = (s: string) => createHash('sha256').update(s).digest('hex');
    const here = digest(JSON.stringify(ALL_CASES.map((c) => [c.tables, c.solution.culprit])));
    const script = "import { ALL_CASES } from './src/cases'; import { createHash } from 'node:crypto'; console.log(createHash('sha256').update(JSON.stringify(ALL_CASES.map((c) => [c.tables, c.solution.culprit]))).digest('hex'));";
    const out = execFileSync(process.execPath, [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), '--eval', script], { encoding: 'utf8' }).trim();
    expect(out).toBe(here);
  });
});

describe('Seguridad: códigos y firmas', () => {
  it('genera códigos con el formato esperado y sin colisiones evidentes', () => {
    const codes = new Set(Array.from({ length: 2000 }, newVerificationCode));
    expect(codes.size).toBe(2000);
    for (const c of [...codes].slice(0, 20)) expect(c).toMatch(/^SQLD-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(newBadgeCode()).toMatch(/^AG-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
  it('JSON canónico independiente del orden de las claves', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
  it('contraseñas con scrypt', async () => {
    const h = await hashPassword('una-contraseña-larga');
    expect(await verifyPassword('una-contraseña-larga', h)).toBe(true);
    expect(await verifyPassword('otra', h)).toBe(false);
  });
});
