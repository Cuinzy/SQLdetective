// Detección de evidencias a partir del RESULTADO real de una consulta.
// Una evidencia se descubre cuando el resultado aísla un hecho concreto (valores en una misma fila),
// con un tamaño acotado y, opcionalmente, usando ciertas construcciones SQL.
import type { EvidenceDef, EvidenceMatch, Feature, RowNeedles } from '@/cases/types';

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
}

export function normText(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (v instanceof Date) return v.toISOString();
  return String(v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const NUMERIC = /^-?\d+(\.\d+)?$/;

export function cellMatches(cell: unknown, needle: string): boolean {
  if (needle.startsWith('=')) return normText(cell) === normText(needle.slice(1));
  const c = normText(cell);
  if (NUMERIC.test(needle)) {
    if (!NUMERIC.test(c)) return false;
    return Math.abs(parseFloat(c) - parseFloat(needle)) < 0.005;
  }
  return c.includes(normText(needle));
}

export function rowMatches(row: unknown[], needles: RowNeedles): boolean {
  return needles.every((n) => row.some((cell) => cellMatches(cell, n)));
}

export function featureSatisfied(features: Set<Feature>, required: Feature): boolean {
  if (required === 'join') return ['join', 'inner_join', 'left_join', 'right_join', 'full_join', 'implicit_join'].some((f) => features.has(f as Feature));
  if (required === 'aggregate') return features.has('aggregate');
  return features.has(required);
}

export function matchesEvidence(match: EvidenceMatch, result: QueryResult, features: Feature[]): boolean {
  if (result.truncated) return false;
  const maxRows = match.maxRows ?? 40;
  if (result.rowCount > maxRows) return false;
  if (match.minRows !== undefined && result.rowCount < match.minRows) return false;
  if (match.maxColumns !== undefined && result.columns.length > match.maxColumns) return false;
  const fs = new Set(features);
  if (match.features && !match.features.every((f) => featureSatisfied(fs, f))) return false;
  if (match.anyFeature && !match.anyFeature.some((f) => featureSatisfied(fs, f))) return false;
  if (match.any && match.any.length && !match.any.some((alt) => result.rows.some((r) => rowMatches(r, alt)))) return false;
  if (match.all && match.all.length && !match.all.every((alt) => result.rows.some((r) => rowMatches(r, alt)))) return false;
  if (!match.any?.length && !match.all?.length) return false;
  return true;
}

export function detectEvidence(evidence: EvidenceDef[], result: QueryResult, features: Feature[]): string[] {
  return evidence.filter((e) => matchesEvidence(e.match, result, features)).map((e) => e.id);
}
