// Panel docente: autenticación con sesiones en servidor y consultas de seguimiento.
import { randomUUID } from 'node:crypto';
import { getCase } from '@/cases';
import { q } from './db';
import { hashPassword, hmacToken, newToken, verifyPassword } from './security';
import { conceptSummary, elapsedSeconds, formatDuration } from './report';
import type { InvRow } from './game';

export const ADMIN_SESSION_HOURS = 8;

export async function createAdmin(username: string, password: string) {
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) throw new Error('Usuario inválido (3 a 40 caracteres: letras, números, _ . -).');
  if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');
  const hash = await hashPassword(password);
  await q(
    `INSERT INTO game.admin_users (id, username, password_hash) VALUES ($1,$2,$3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [randomUUID(), username, hash],
  );
}

export async function loginAdmin(username: string, password: string, ip: string | null) {
  const fails = await q<{ n: string }>(
    "SELECT count(*) AS n FROM game.audit_log WHERE action = 'admin.login_failed' AND ip IS NOT DISTINCT FROM $1 AND at > now() - interval '15 minutes'",
    [ip],
  );
  if (Number(fails[0].n) >= 8) return { ok: false as const, status: 429, message: 'Demasiados intentos fallidos. Espera 15 minutos.' };
  const rows = await q<{ id: string; password_hash: string }>('SELECT id, password_hash FROM game.admin_users WHERE username = $1', [username]);
  const ok = rows[0] ? await verifyPassword(password, rows[0].password_hash) : await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA').then(() => false);
  if (!ok) {
    await q("INSERT INTO game.audit_log (actor_type, actor_id, action, ip, details) VALUES ('admin', NULL, 'admin.login_failed', $1, $2)", [ip, JSON.stringify({ username })]);
    return { ok: false as const, status: 401, message: 'Credenciales incorrectas.' };
  }
  const token = newToken();
  await q(`INSERT INTO game.admin_sessions (token_hash, admin_id, expires_at) VALUES ($1,$2, now() + interval '${ADMIN_SESSION_HOURS} hours')`, [hmacToken(token), rows[0].id]);
  await q("INSERT INTO game.audit_log (actor_type, actor_id, action, ip) VALUES ('admin', $1, 'admin.login', $2)", [rows[0].id, ip]);
  return { ok: true as const, token };
}

export async function adminBySession(token: string | undefined | null) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const rows = await q<{ id: string; username: string }>(
    `SELECT a.id, a.username FROM game.admin_sessions s INNER JOIN game.admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hmacToken(token)],
  );
  return rows[0] ?? null;
}

export async function logoutAdmin(token: string | undefined | null) {
  if (token) await q('DELETE FROM game.admin_sessions WHERE token_hash = $1', [hmacToken(token)]);
}

export interface AdminFilters {
  name?: string;
  group?: string;
  code?: string;
  caseId?: number;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
}

export interface AdminInvestigationRow {
  id: string;
  code: string;
  student: string;
  group: string;
  studentCode: string | null;
  caseId: number;
  caseCode: string;
  caseTitle: string;
  status: string;
  solved: boolean;
  selectedSuspect: string | null;
  totalQueries: number;
  validQueries: number;
  invalidQueries: number;
  failedAccusations: number;
  hintsUsed: number;
  pasteAttempts: number;
  evidenceFound: number;
  evidenceTotal: number;
  startedAt: string;
  finishedAt: string | null;
  elapsed: string;
}

function rowToAdmin(r: InvRow & { evidence_found: string }): AdminInvestigationRow {
  const c = getCase(r.case_id);
  const suspect = r.final_suspect_id ? c?.characters.find((x) => x.id === r.final_suspect_id)?.name ?? r.final_suspect_id : null;
  return {
    id: r.id,
    code: r.verification_code,
    student: r.student_name,
    group: r.group_name,
    studentCode: r.student_code,
    caseId: r.case_id,
    caseCode: c?.code ?? String(r.case_id),
    caseTitle: c?.title ?? '',
    status: r.status,
    solved: r.solved,
    selectedSuspect: suspect,
    totalQueries: r.total_queries,
    validQueries: r.valid_queries,
    invalidQueries: r.invalid_queries,
    failedAccusations: r.failed_accusations,
    hintsUsed: r.hints_used,
    pasteAttempts: r.paste_attempts,
    evidenceFound: Number(r.evidence_found),
    evidenceTotal: c?.evidence.length ?? 0,
    startedAt: r.started_at.toISOString(),
    finishedAt: r.finished_at?.toISOString() ?? null,
    elapsed: formatDuration(elapsedSeconds(r)),
  };
}

export async function listInvestigations(f: AdminFilters): Promise<AdminInvestigationRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (f.name) add('i.student_name ILIKE ?', `%${f.name}%`);
  if (f.group) add('i.group_name ILIKE ?', `%${f.group}%`);
  if (f.code) add('i.verification_code ILIKE ?', `%${f.code.trim().toUpperCase()}%`);
  if (f.caseId !== undefined && !Number.isNaN(f.caseId)) add('i.case_id = ?', f.caseId);
  if (f.from) add('i.started_at >= ?::date', f.from);
  if (f.to) add("i.started_at < (?::date + interval '1 day')", f.to);
  if (f.status && ['en_proceso', 'resuelto', 'no_resuelto'].includes(f.status)) add('i.status = ?', f.status);
  const limit = Math.min(Math.max(f.limit ?? 300, 1), 5000);
  const rows = await q<InvRow & { evidence_found: string }>(
    `SELECT i.*, (SELECT count(*) FROM game.evidence_found e WHERE e.investigation_id = i.id) AS evidence_found
     FROM game.investigations i ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY i.started_at DESC LIMIT ${limit}`,
    params,
  );
  return rows.map(rowToAdmin);
}

export async function investigationByCode(code: string) {
  const rows = await q<InvRow & { evidence_found: string }>(
    `SELECT i.*, (SELECT count(*) FROM game.evidence_found e WHERE e.investigation_id = i.id) AS evidence_found
     FROM game.investigations i WHERE i.verification_code = $1`,
    [code.trim().toUpperCase()],
  );
  return rows[0] ?? null;
}

export async function investigationDetail(code: string) {
  const r = await investigationByCode(code);
  if (!r) return null;
  const c = getCase(r.case_id)!;
  const [queries, evid, accs, hints, inter, reports] = await Promise.all([
    q<Record<string, unknown>>('SELECT * FROM game.queries WHERE investigation_id = $1 ORDER BY seq', [r.id]),
    q<{ evidence_id: string; found_at: Date; seq: number | null }>('SELECT e.evidence_id, e.found_at, qq.seq FROM game.evidence_found e LEFT JOIN game.queries qq ON qq.id = e.query_id WHERE e.investigation_id = $1 ORDER BY e.found_at', [r.id]),
    q<{ suspect_id: string; correct: boolean; evidence_ids: string[]; justification: string; created_at: Date; valid_queries_at: number }>('SELECT * FROM game.accusations WHERE investigation_id = $1 ORDER BY created_at', [r.id]),
    q<{ hint_id: string; level: number; used_at: Date }>('SELECT * FROM game.hints_used WHERE investigation_id = $1 ORDER BY used_at', [r.id]),
    q<{ character_id: string; question_id: string; asked_at: Date }>('SELECT * FROM game.interrogations WHERE investigation_id = $1 ORDER BY asked_at', [r.id]),
    q<{ id: string; format: string; payload_sha256: string; generated_at: Date }>('SELECT id, format, payload_sha256, generated_at FROM game.reports WHERE investigation_id = $1 ORDER BY generated_at DESC', [r.id]),
  ]);
  const name = (id: string) => c.characters.find((x) => x.id === id)?.name ?? id;
  const culprit = c.characters.find((x) => x.id === c.solution.culprit)!;
  return {
    summary: rowToAdmin(r),
    correctCulprit: culprit.name,
    solution: { motive: c.solution.motive, method: c.solution.method, justification: c.solution.justification },
    concepts: conceptSummary(queries.filter((x) => x.executed).map((x) => x.features as string[])),
    evidence: evid.map((e) => ({ id: e.evidence_id, title: c.evidence.find((x) => x.id === e.evidence_id)?.title ?? e.evidence_id, key: !!c.evidence.find((x) => x.id === e.evidence_id)?.key, seq: e.seq, at: e.found_at.toISOString() })),
    missingEvidence: c.evidence.filter((e) => !evid.some((x) => x.evidence_id === e.id)).map((e) => ({ id: e.id, title: e.title, key: !!e.key })),
    accusations: accs.map((a) => ({ suspect: name(a.suspect_id), correct: a.correct, evidence: a.evidence_ids, relevant: a.evidence_ids.filter((x) => c.solution.incriminating.includes(x)).length, justification: a.justification, at: a.created_at.toISOString(), validQueriesAt: a.valid_queries_at })),
    hints: hints.map((h) => ({ title: c.hints.find((x) => x.id === h.hint_id)?.title ?? h.hint_id, level: h.level, at: h.used_at.toISOString() })),
    interrogations: inter.map((i) => ({ character: name(i.character_id), question: c.characters.find((x) => x.id === i.character_id)?.questions.find((x) => x.id === i.question_id)?.text ?? i.question_id, at: i.asked_at.toISOString() })),
    reports: reports.map((x) => ({ id: x.id, format: x.format, sha256: x.payload_sha256, at: x.generated_at.toISOString() })),
    queries: queries.map((x) => ({
      seq: x.seq as number,
      sql: x.sql_text as string,
      at: (x.executed_at as Date).toISOString(),
      syntaxValid: x.syntax_valid as boolean,
      executed: x.executed as boolean,
      counted: x.counted as boolean,
      reason: (x.reject_reason as string) ?? null,
      error: (x.error_message as string) ?? null,
      hint: (x.error_hint as string) ?? null,
      tables: x.tables_used as string[],
      features: x.features as string[],
      rowCount: (x.row_count as number) ?? null,
      columns: x.columns as string[],
      preview: (x.result_preview as unknown[][]) ?? null,
      evidence: x.evidence_ids as string[],
      durationMs: (x.duration_ms as number) ?? null,
    })),
  };
}

export async function globalStats() {
  const [[totals], perCase, topErrors, topHints, topTables, students] = await Promise.all([
    q<{ students: string; investigations: string; solved: string; pending: string; abandoned: string; avg_queries: string | null; avg_failed: string | null }>(
      `SELECT (SELECT count(*) FROM game.players) AS students,
              count(*) FILTER (WHERE case_id > 0) AS investigations,
              count(*) FILTER (WHERE case_id > 0 AND solved) AS solved,
              count(*) FILTER (WHERE case_id > 0 AND status = 'en_proceso') AS pending,
              count(*) FILTER (WHERE case_id > 0 AND status = 'no_resuelto') AS abandoned,
              avg(total_queries) FILTER (WHERE case_id > 0) AS avg_queries,
              avg(failed_accusations) FILTER (WHERE case_id > 0) AS avg_failed
       FROM game.investigations`,
    ),
    q<{ case_id: number; n: string; solved: string; avg_q: string | null }>('SELECT case_id, count(*) AS n, count(*) FILTER (WHERE solved) AS solved, avg(total_queries) AS avg_q FROM game.investigations GROUP BY case_id ORDER BY case_id'),
    q<{ error_message: string; n: string }>('SELECT error_message, count(*) AS n FROM game.queries WHERE error_message IS NOT NULL GROUP BY error_message ORDER BY count(*) DESC LIMIT 10'),
    q<{ case_id: number; hint_id: string; n: string }>('SELECT i.case_id, h.hint_id, count(*) AS n FROM game.hints_used h INNER JOIN game.investigations i ON i.id = h.investigation_id GROUP BY i.case_id, h.hint_id ORDER BY count(*) DESC LIMIT 10'),
    q<{ f: string; n: string }>('SELECT unnest(features) AS f, count(*) AS n FROM game.queries WHERE executed GROUP BY 1 ORDER BY 2 DESC'),
    q<{ student_name: string; group_name: string; n: string; solved: string; valid: string }>('SELECT student_name, group_name, count(*) AS n, count(*) FILTER (WHERE solved) AS solved, sum(valid_queries) AS valid FROM game.investigations WHERE case_id > 0 GROUP BY student_name, group_name ORDER BY solved DESC, valid DESC LIMIT 200'),
  ]);
  const inv = Number(totals.investigations);
  return {
    students: Number(totals.students),
    investigations: inv,
    solved: Number(totals.solved),
    pending: Number(totals.pending),
    abandoned: Number(totals.abandoned),
    resolutionRate: inv ? Math.round((Number(totals.solved) / inv) * 1000) / 10 : 0,
    avgQueries: totals.avg_queries ? Math.round(Number(totals.avg_queries) * 10) / 10 : 0,
    avgFailedAccusations: totals.avg_failed ? Math.round(Number(totals.avg_failed) * 100) / 100 : 0,
    perCase: perCase.map((x) => ({ caseId: x.case_id, code: getCase(x.case_id)?.code ?? '', title: getCase(x.case_id)?.title ?? '', investigations: Number(x.n), solved: Number(x.solved), avgQueries: x.avg_q ? Math.round(Number(x.avg_q) * 10) / 10 : 0 })),
    topErrors: topErrors.map((x) => ({ message: x.error_message, count: Number(x.n) })),
    topHints: topHints.map((x) => ({ case: getCase(x.case_id)?.code ?? '', hint: getCase(x.case_id)?.hints.find((h) => h.id === x.hint_id)?.title ?? x.hint_id, count: Number(x.n) })),
    topConstructs: topTables.map((x) => ({ feature: x.f, count: Number(x.n) })),
    progress: students.map((x) => ({ student: x.student_name, group: x.group_name, investigations: Number(x.n), solved: Number(x.solved), validQueries: Number(x.valid) })),
  };
}

export function toCsv(rows: AdminInvestigationRow[]): string {
  const header = ['codigo', 'estudiante', 'grupo', 'codigo_estudiantil', 'caso', 'titulo_caso', 'estado', 'encontro_culpable', 'culpable_seleccionado', 'consultas_totales', 'consultas_validas', 'consultas_invalidas', 'acusaciones_fallidas', 'pistas', 'intentos_pegado', 'evidencias', 'inicio', 'fin', 'tiempo'];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // evita inyección de fórmulas en hojas de cálculo
    return /[",;\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  };
  const lines = rows.map((r) => [r.code, r.student, r.group, r.studentCode, r.caseCode, r.caseTitle, r.status, r.solved ? 'si' : 'no', r.selectedSuspect, r.totalQueries, r.validQueries, r.invalidQueries, r.failedAccusations, r.hintsUsed, r.pasteAttempts, `${r.evidenceFound}/${r.evidenceTotal}`, r.startedAt, r.finishedAt, r.elapsed].map(esc).join(','));
  return '﻿' + [header.join(','), ...lines].join('\n');
}
