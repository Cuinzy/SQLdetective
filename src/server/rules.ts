// Reglas del juego como funciones puras (fáciles de probar). La autoridad final es el servidor.
import type { CaseDef } from '@/cases/types';
import type { SqlAnalysis } from './sql/analyzer';
import type { QueryResult } from './sql/evidence';
import { createHash } from 'node:crypto';

export const DEFAULT_MIN_QUERIES = 20;
export const DEFAULT_PENALTY = 10;
export const MAX_SAME_TEMPLATE = 2;
export const MAX_SAME_SHAPE = 3;

export interface PriorQuery {
  seq: number;
  counted: boolean;
  executed: boolean;
  normalized_hash: string | null;
  template_hash: string | null;
  shape_hash: string | null;
  result_hash: string | null;
}

export function resultHash(result: QueryResult): string | null {
  if (result.rowCount === 0) return null;
  const rows = result.rows.map((r) => JSON.stringify(r.map((c) => (c === null ? null : String(c))))).sort();
  return createHash('sha256').update(`${result.columns.length}|${result.truncated}|${rows.join('\n')}`).digest('hex');
}

export interface CountDecision {
  counted: boolean;
  reason?: string;
}

/** Decide si una consulta ejecutada correctamente suma al contador oficial de consultas válidas. */
export function decideCount(analysis: SqlAnalysis, result: QueryResult, prior: PriorQuery[]): CountDecision {
  if (analysis.tables.length === 0)
    return { counted: false, reason: 'La consulta no consulta ninguna tabla del expediente, así que no aporta a la investigación.' };
  if (!analysis.hasColumnRef && !analysis.features.includes('aggregate'))
    return { counted: false, reason: 'La consulta no muestra datos de las tablas (solo valores constantes).' };

  const same = prior.find((p) => p.executed && p.normalized_hash === analysis.normalizedHash);
  if (same) return { counted: false, reason: `Es idéntica a la consulta #${same.seq}. Las repeticiones no suman al contador.` };

  const rh = resultHash(result);
  if (rh) {
    const eq = prior.find((p) => p.counted && p.result_hash === rh);
    if (eq)
      return {
        counted: false,
        reason: `Devuelve exactamente la misma información que la consulta #${eq.seq} (solo cambia el orden, los alias o la forma). Busca información nueva.`,
      };
  }

  const sameTemplate = prior.filter((p) => p.counted && p.template_hash === analysis.templateHash).length;
  if (sameTemplate >= MAX_SAME_TEMPLATE)
    return {
      counted: false,
      reason: `Ya usaste ${sameTemplate} veces esta misma estructura cambiando solo los valores. Cambia el enfoque: otra tabla, otra condición u otra relación.`,
    };

  const sameShape = prior.filter((p) => p.counted && p.shape_hash === analysis.shapeHash).length;
  if (sameShape >= MAX_SAME_SHAPE)
    return {
      counted: false,
      reason: `Ya exploraste ${sameShape} veces las mismas tablas con los mismos filtros. Formula una pregunta distinta sobre los datos.`,
    };

  return { counted: true };
}

export interface GateInput {
  caseDef: CaseDef;
  validQueries: number;
  failedAccusations: number;
  foundEvidence: string[];
  evidenceAtLastAccusation: number;
  accusedSuspects: string[];
  status: string;
}

export interface GateStatus {
  requiredQueries: number;
  validQueries: number;
  keyFound: number;
  keyRequired: number;
  objectivesDone: number;
  objectivesRequired: number;
  needsNewEvidence: boolean;
  unlocked: boolean;
  reasons: string[];
}

export function objectivesCompleted(caseDef: CaseDef, found: Set<string>): string[] {
  return caseDef.objectives
    .filter((o) => o.evidence.filter((e) => found.has(e)).length >= (o.need ?? o.evidence.length))
    .map((o) => o.id);
}

export function accusationGate(g: GateInput): GateStatus {
  const c = g.caseDef;
  const minQ = c.accusation.minQueries ?? DEFAULT_MIN_QUERIES;
  const penalty = c.accusation.penalty ?? DEFAULT_PENALTY;
  const requiredQueries = minQ + penalty * g.failedAccusations;
  const found = new Set(g.foundEvidence);
  const keyFound = c.evidence.filter((e) => e.key && found.has(e.id)).length;
  const objectivesDone = objectivesCompleted(c, found).length;
  const remaining = c.evidence.length - found.size;
  const needsNewEvidence = g.failedAccusations > 0 && remaining > 0 && found.size <= g.evidenceAtLastAccusation;
  const reasons: string[] = [];
  if (g.status !== 'en_proceso') reasons.push('La investigación ya está cerrada.');
  if (g.validQueries < requiredQueries) reasons.push(`Necesitas ${requiredQueries} consultas válidas (llevas ${g.validQueries}).`);
  if (keyFound < c.accusation.minKeyEvidence) reasons.push(`Necesitas al menos ${c.accusation.minKeyEvidence} evidencias fundamentales (llevas ${keyFound}).`);
  if (objectivesDone < c.accusation.minObjectives) reasons.push(`Completa al menos ${c.accusation.minObjectives} líneas de investigación (llevas ${objectivesDone}).`);
  if (needsNewEvidence) reasons.push('Tras una acusación fallida debes descubrir al menos una evidencia nueva.');
  const suspects = c.characters.filter((ch) => ch.suspect).map((ch) => ch.id);
  if (suspects.every((s) => g.accusedSuspects.includes(s))) reasons.push('No quedan sospechosos por acusar.');
  return {
    requiredQueries,
    validQueries: g.validQueries,
    keyFound,
    keyRequired: c.accusation.minKeyEvidence,
    objectivesDone,
    objectivesRequired: c.accusation.minObjectives,
    needsNewEvidence,
    unlocked: reasons.length === 0,
    reasons,
  };
}
