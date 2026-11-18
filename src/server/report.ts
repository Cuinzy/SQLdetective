// Reporte oficial de una investigación, generado en el servidor y firmado con HMAC-SHA256.
import { randomUUID } from 'node:crypto';
import { getCase } from '@/cases';
import { CONCEPT_GROUPS } from './sql/analyzer';
import { q } from './db';
import { canonicalJson, safeEqualHex, sha256, signPayload } from './security';
import type { InvRow } from './game';
import type { Feature } from '@/cases/types';

export interface ReportQuery {
  numero: number;
  fecha_hora: string;
  sql: string;
  sintaxis_valida: boolean;
  ejecutada: boolean;
  contabilizada: boolean;
  tablas: string[];
  construcciones: string[];
  filas: number | null;
  resultado_resumen: string;
  evidencias: string[];
  error: string | null;
  motivo_no_contabilizada: string | null;
}

export interface ReportPayload {
  formato: 'sql-detective-reporte';
  version: 1;
  identificacion: {
    estudiante: string;
    grupo: string;
    codigo_estudiantil: string | null;
    caso: string;
    titulo_caso: string;
    codigo_verificacion: string;
    inicio: string;
    fin: string | null;
  };
  resultados: {
    estado: string;
    culpable_seleccionado: string | null;
    identifico_culpable: boolean;
    consultas_totales: number;
    consultas_validas_contabilizadas: number;
    consultas_invalidas: number;
    acusaciones_fallidas: number;
    pistas_utilizadas: number;
    intentos_de_pegado_bloqueados: number;
    tiempo_empleado_segundos: number;
    tiempo_empleado: string;
    evidencias_descubiertas: number;
    evidencias_totales: number;
  };
  evidencias: { id: string; titulo: string; consulta: number | null; fecha_hora: string }[];
  acusaciones: { sospechoso: string; correcta: boolean; evidencias_presentadas: string[]; justificacion: string; fecha_hora: string }[];
  pistas: { pista: string; nivel: number; fecha_hora: string }[];
  interrogatorios: { personaje: string; pregunta: string; fecha_hora: string }[];
  conceptos_sql: { concepto: string; consultas: number }[];
  consultas: ReportQuery[];
}

export interface SignedReport {
  payload: ReportPayload;
  integridad: { algoritmo: 'HMAC-SHA256'; id_reporte: string; generado: string; sha256_contenido: string; firma: string };
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function elapsedSeconds(inv: Pick<InvRow, 'started_at' | 'finished_at' | 'last_activity_at'>) {
  const end = inv.finished_at ?? inv.last_activity_at;
  return Math.max(0, Math.round((end.getTime() - inv.started_at.getTime()) / 1000));
}

function summarize(columns: string[], preview: unknown[][] | null, rowCount: number | null): string {
  if (rowCount === null) return '—';
  if (rowCount === 0) return '0 filas';
  const first = preview?.[0];
  const sample = first ? columns.slice(0, 4).map((c, i) => `${c}=${String(first[i] ?? 'NULL').slice(0, 30)}`).join(', ') : '';
  return `${rowCount} fila(s)${sample ? ` · primera: ${sample}` : ''}`;
}

export function conceptSummary(featuresPerQuery: string[][]) {
  return CONCEPT_GROUPS.map((g) => ({
    concepto: g.label,
    consultas: featuresPerQuery.filter((fs) => fs.some((f) => g.features.includes(f as Feature))).length,
  }));
}

export async function buildPayload(inv: InvRow): Promise<ReportPayload> {
  const c = getCase(inv.case_id)!;
  const [queries, evs, accs, hints, inter] = await Promise.all([
    q<Record<string, unknown>>('SELECT * FROM game.queries WHERE investigation_id = $1 ORDER BY seq', [inv.id]),
    q<{ evidence_id: string; found_at: Date; seq: number | null }>('SELECT e.evidence_id, e.found_at, qq.seq FROM game.evidence_found e LEFT JOIN game.queries qq ON qq.id = e.query_id WHERE e.investigation_id = $1 ORDER BY e.found_at', [inv.id]),
    q<{ suspect_id: string; correct: boolean; evidence_ids: string[]; justification: string; created_at: Date }>('SELECT * FROM game.accusations WHERE investigation_id = $1 ORDER BY created_at', [inv.id]),
    q<{ hint_id: string; level: number; used_at: Date }>('SELECT * FROM game.hints_used WHERE investigation_id = $1 ORDER BY used_at', [inv.id]),
    q<{ character_id: string; question_id: string; asked_at: Date }>('SELECT * FROM game.interrogations WHERE investigation_id = $1 ORDER BY asked_at', [inv.id]),
  ]);
  const name = (id: string | null) => (id ? c.characters.find((x) => x.id === id)?.name ?? id : null);
  const secs = elapsedSeconds(inv);
  return {
    formato: 'sql-detective-reporte',
    version: 1,
    identificacion: {
      estudiante: inv.student_name,
      grupo: inv.group_name,
      codigo_estudiantil: inv.student_code,
      caso: c.code,
      titulo_caso: c.title,
      codigo_verificacion: inv.verification_code,
      inicio: inv.started_at.toISOString(),
      fin: inv.finished_at?.toISOString() ?? null,
    },
    resultados: {
      estado: inv.status === 'resuelto' ? 'resuelto' : inv.status === 'no_resuelto' ? 'no resuelto' : 'en proceso',
      culpable_seleccionado: name(inv.final_suspect_id),
      identifico_culpable: inv.solved,
      consultas_totales: inv.total_queries,
      consultas_validas_contabilizadas: inv.valid_queries,
      consultas_invalidas: inv.invalid_queries,
      acusaciones_fallidas: inv.failed_accusations,
      pistas_utilizadas: inv.hints_used,
      intentos_de_pegado_bloqueados: inv.paste_attempts,
      tiempo_empleado_segundos: secs,
      tiempo_empleado: formatDuration(secs),
      evidencias_descubiertas: evs.length,
      evidencias_totales: c.evidence.length,
    },
    evidencias: evs.map((e) => ({ id: e.evidence_id, titulo: c.evidence.find((x) => x.id === e.evidence_id)?.title ?? e.evidence_id, consulta: e.seq, fecha_hora: e.found_at.toISOString() })),
    acusaciones: accs.map((a) => ({ sospechoso: name(a.suspect_id)!, correcta: a.correct, evidencias_presentadas: a.evidence_ids, justificacion: a.justification, fecha_hora: a.created_at.toISOString() })),
    pistas: hints.map((h) => ({ pista: c.hints.find((x) => x.id === h.hint_id)?.title ?? h.hint_id, nivel: h.level, fecha_hora: h.used_at.toISOString() })),
    interrogatorios: inter.map((i) => {
      const ch = c.characters.find((x) => x.id === i.character_id);
      return { personaje: ch?.name ?? i.character_id, pregunta: ch?.questions.find((x) => x.id === i.question_id)?.text ?? i.question_id, fecha_hora: i.asked_at.toISOString() };
    }),
    conceptos_sql: conceptSummary(queries.filter((x) => x.executed).map((x) => x.features as string[])),
    consultas: queries.map((x) => ({
      numero: x.seq as number,
      fecha_hora: (x.executed_at as Date).toISOString(),
      sql: x.sql_text as string,
      sintaxis_valida: x.syntax_valid as boolean,
      ejecutada: x.executed as boolean,
      contabilizada: x.counted as boolean,
      tablas: x.tables_used as string[],
      construcciones: x.features as string[],
      filas: (x.row_count as number) ?? null,
      resultado_resumen: summarize(x.columns as string[], x.result_preview as unknown[][] | null, (x.row_count as number) ?? null),
      evidencias: x.evidence_ids as string[],
      error: (x.error_message as string) ?? null,
      motivo_no_contabilizada: x.counted ? null : ((x.reject_reason as string) ?? null),
    })),
  };
}

export async function generateSignedReport(inv: InvRow, format: 'json' | 'pdf' | 'csv'): Promise<SignedReport> {
  const payload = await buildPayload(inv);
  const canonical = canonicalJson(payload);
  const integridad = {
    algoritmo: 'HMAC-SHA256' as const,
    id_reporte: randomUUID(),
    generado: new Date().toISOString(),
    sha256_contenido: sha256(canonical),
    firma: signPayload(canonical),
  };
  await q('INSERT INTO game.reports (id, investigation_id, format, payload_sha256, signature) VALUES ($1,$2,$3,$4,$5)', [integridad.id_reporte, inv.id, format, integridad.sha256_contenido, integridad.firma]);
  return { payload, integridad };
}

export interface VerifyResult {
  firmaValida: boolean;
  registrado: boolean;
  codigo: string | null;
  coincideConBaseDeDatos: boolean | null;
  diferencias: string[];
}

/** Verifica un reporte JSON exportado: firma HMAC, registro en la base y coherencia con los datos actuales. */
export async function verifyReport(raw: unknown): Promise<VerifyResult> {
  const out: VerifyResult = { firmaValida: false, registrado: false, codigo: null, coincideConBaseDeDatos: null, diferencias: [] };
  const r = raw as Partial<SignedReport>;
  if (!r || typeof r !== 'object' || !r.payload || !r.integridad) {
    out.diferencias.push('El archivo no tiene el formato de un reporte de SQL Detective.');
    return out;
  }
  const canonical = canonicalJson(r.payload);
  out.firmaValida = typeof r.integridad.firma === 'string' && safeEqualHex(signPayload(canonical), r.integridad.firma);
  out.codigo = r.payload.identificacion?.codigo_verificacion ?? null;
  const rows = await q<{ id: string; payload_sha256: string; investigation_id: string }>('SELECT id, payload_sha256, investigation_id FROM game.reports WHERE id = $1', [String(r.integridad.id_reporte ?? '')]);
  out.registrado = !!rows[0] && rows[0].payload_sha256 === sha256(canonical);
  if (!out.firmaValida) out.diferencias.push('La firma no corresponde al contenido: el archivo fue modificado o no fue emitido por este servidor.');
  if (!out.registrado) out.diferencias.push('No existe un reporte registrado con ese identificador y contenido.');
  if (out.codigo) {
    const inv = await q<InvRow>('SELECT * FROM game.investigations WHERE verification_code = $1', [out.codigo]);
    if (inv[0]) {
      const p = r.payload.resultados;
      const checks: [string, unknown, unknown][] = [
        ['consultas totales', p?.consultas_totales, inv[0].total_queries],
        ['consultas válidas', p?.consultas_validas_contabilizadas, inv[0].valid_queries],
        ['acusaciones fallidas', p?.acusaciones_fallidas, inv[0].failed_accusations],
        ['identificó al culpable', p?.identifico_culpable, inv[0].solved],
      ];
      for (const [label, a, b] of checks) if (a !== b) out.diferencias.push(`«${label}»: reporte=${String(a)} · base de datos actual=${String(b)} (puede deberse a actividad posterior al reporte).`);
      out.coincideConBaseDeDatos = checks.every(([, a, b]) => a === b);
    } else out.diferencias.push('El código de verificación no existe en la base de datos.');
  }
  return out;
}
