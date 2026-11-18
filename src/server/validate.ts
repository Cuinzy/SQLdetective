// Validación automática de la coherencia de un caso: estructura, referencias, solución verificable
// y existencia de al menos 20 consultas útiles distintas. Usado por las pruebas y por scripts/validate-cases.ts.
import type { CaseDef } from '@/cases/types';
import { analyzeSql } from './sql/analyzer';
import { detectEvidence } from './sql/evidence';
import { runSandboxed } from './sql/sandbox';
import { caseSchema } from './db';
import { decideCount, resultHash, type PriorQuery } from './rules';

export interface CaseReport {
  code: string;
  errors: string[];
  warnings: string[];
  usefulQueries: number;
  totalRows: number;
}

export function validateStructure(c: CaseDef): string[] {
  const errors: string[] = [];
  const tables = new Map(c.tables.map((t) => [t.name, t]));
  for (const t of c.tables) {
    const names = new Set<string>();
    for (const col of t.columns) {
      if (names.has(col.name)) errors.push(`${t.name}: columna duplicada ${col.name}`);
      names.add(col.name);
      if (col.fk) {
        const ref = tables.get(col.fk.table);
        if (!ref) errors.push(`${t.name}.${col.name}: FK a tabla inexistente ${col.fk.table}`);
        else if (!ref.columns.some((x) => x.name === col.fk!.column)) errors.push(`${t.name}.${col.name}: FK a columna inexistente`);
      }
    }
    if (!t.columns.some((x) => x.pk)) errors.push(`${t.name}: sin clave primaria`);
    t.rows.forEach((r, i) => {
      if (r.length !== t.columns.length) errors.push(`${t.name}: fila ${i + 1} con ${r.length} valores`);
    });
  }
  const evIds = new Set(c.evidence.map((e) => e.id));
  if (evIds.size !== c.evidence.length) errors.push('ids de evidencia duplicados');
  const chars = new Map(c.characters.map((ch) => [ch.id, ch]));
  const suspects = c.characters.filter((ch) => ch.suspect).map((ch) => ch.id);
  if (c.level > 0 && suspects.length < 4) errors.push(`se esperan al menos 4 sospechosos (hay ${suspects.length})`);
  if (!suspects.includes(c.solution.culprit)) errors.push('el culpable no está entre los sospechosos');
  for (const s of suspects) {
    if (s === c.solution.culprit) continue;
    const el = c.solution.eliminations[s];
    if (!el) errors.push(`el sospechoso inocente ${s} no tiene explicación de descarte`);
    else for (const e of el.evidence) if (!evIds.has(e)) errors.push(`descarte de ${s}: evidencia ${e} inexistente`);
  }
  if (c.solution.incriminating.length < 2) errors.push('se necesitan al menos 2 evidencias incriminatorias');
  for (const e of c.solution.incriminating) if (!evIds.has(e)) errors.push(`evidencia incriminatoria ${e} inexistente`);
  const keyCount = c.evidence.filter((e) => e.key).length;
  if (keyCount < c.accusation.minKeyEvidence) errors.push(`hay ${keyCount} evidencias clave y se exigen ${c.accusation.minKeyEvidence}`);
  if (c.objectives.length < c.accusation.minObjectives) errors.push('menos objetivos que los exigidos');
  for (const o of c.objectives) {
    for (const e of o.evidence) if (!evIds.has(e)) errors.push(`objetivo ${o.id}: evidencia ${e} inexistente`);
    for (const t of o.tables) if (!tables.has(t)) errors.push(`objetivo ${o.id}: tabla ${t} inexistente`);
  }
  const qIds = new Set<string>();
  for (const ch of c.characters) for (const qq of ch.questions) qIds.add(`${ch.id}:${qq.id}`);
  for (const h of c.hints) {
    if (h.evidence && !evIds.has(h.evidence)) errors.push(`pista ${h.id}: evidencia ${h.evidence} inexistente`);
    for (const e of h.requires?.evidence ?? []) if (!evIds.has(e)) errors.push(`pista ${h.id}: requiere evidencia inexistente ${e}`);
    for (const qq of h.requires?.questions ?? []) if (!qIds.has(qq)) errors.push(`pista ${h.id}: requiere pregunta inexistente ${qq}`);
  }
  if (c.level > 0 && c.hints.length < 8) errors.push(`se esperan al menos 8 pistas (hay ${c.hints.length})`);
  for (const ch of c.characters)
    for (const qq of ch.questions) {
      for (const e of qq.requires ?? []) if (!evIds.has(e)) errors.push(`pregunta ${ch.id}:${qq.id}: evidencia ${e} inexistente`);
      for (const r of qq.requiresQuestions ?? []) if (!qIds.has(r)) errors.push(`pregunta ${ch.id}:${qq.id}: requiere ${r} inexistente`);
    }
  for (const e of c.evidence) {
    for (const s of [...(e.implicates ?? []), ...(e.clears ?? [])]) if (!chars.has(s)) errors.push(`evidencia ${e.id}: personaje ${s} inexistente`);
  }
  if (c.level > 0) {
    const implicating = c.evidence.filter((e) => e.implicates?.includes(c.solution.culprit)).length;
    if (implicating < 3) errors.push(`el culpable solo está implicado por ${implicating} evidencias (mínimo 3)`);
    for (const s of suspects) {
      if (s === c.solution.culprit) continue;
      const cleared = c.evidence.some((e) => e.clears?.includes(s));
      if (!cleared) errors.push(`ninguna evidencia descarta explícitamente a ${s}`);
      const implicatesInnocent = c.evidence.filter((e) => e.implicates?.includes(s)).length;
      if (implicatesInnocent >= implicating) errors.push(`el inocente ${s} está tan implicado como el culpable`);
    }
  }
  return errors;
}

export async function validateCaseData(c: CaseDef): Promise<CaseReport> {
  const errors = validateStructure(c);
  const warnings: string[] = [];
  const tables = c.tables.map((t) => t.name);
  const schema = caseSchema(c.id);
  const prior: PriorQuery[] = [];
  let seq = 0;
  const all = [
    ...c.evidence.map((e) => ({ title: `evidencia ${e.id}`, sql: e.reference, evidence: e.id })),
    ...c.references.map((r) => ({ title: r.title, sql: r.sql, evidence: undefined as string | undefined })),
  ];
  for (const item of all) {
    seq++;
    try {
      const a = analyzeSql(item.sql, { schema, tables });
      const res = await runSandboxed(c.id, item.sql);
      const found = detectEvidence(c.evidence, res, a.features);
      if (item.evidence && !found.includes(item.evidence))
        errors.push(`${item.title}: la consulta de referencia NO descubre la evidencia (filas=${res.rowCount})`);
      const d = decideCount(a, res, prior);
      prior.push({
        seq,
        counted: d.counted,
        executed: true,
        normalized_hash: a.normalizedHash,
        template_hash: a.templateHash,
        shape_hash: a.shapeHash,
        result_hash: resultHash(res),
      });
    } catch (e) {
      errors.push(`${item.title}: ${(e as Error).message}`);
    }
  }
  const usefulQueries = prior.filter((p) => p.counted).length;
  if (c.level > 0 && usefulQueries < 20) errors.push(`solo ${usefulQueries} consultas de referencia cuentan como válidas (mínimo 20)`);
  return { code: c.code, errors, warnings, usefulQueries, totalRows: c.tables.reduce((s, t) => s + t.rows.length, 0) };
}
