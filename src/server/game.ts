// Motor de investigación: TODA la lógica oficial (contadores, evidencias, acusaciones) vive aquí, en el servidor.
import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import { ALL_CASES, getCase } from '@/cases';
import type { CaseDef, Feature } from '@/cases/types';
import type {
  CaseSummary, InvestigationView, PlayerOverview, PublicCharacter, PublicEvidence, QueryResponse, QuerySummary,
} from '@/lib/types';
import { q, tx, caseSchema } from './db';
import { analyzeSql, SqlRejected, type SqlAnalysis } from './sql/analyzer';
import { detectEvidence } from './sql/evidence';
import { friendlyPgError } from './sql/errors';
import { runSandboxed } from './sql/sandbox';
import { accusationGate, decideCount, objectivesCompleted, resultHash, type PriorQuery } from './rules';
import { hmacToken, newBadgeCode, newRecoveryKey, newToken, newVerificationCode } from './security';
import { checkAchievements } from './achievements';
import { computeRank } from '@/lib/progression';

export class GameError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface InvRow {
  id: string;
  player_id: string;
  case_id: number;
  verification_code: string;
  status: 'en_proceso' | 'resuelto' | 'no_resuelto';
  student_name: string;
  group_name: string;
  student_code: string | null;
  started_at: Date;
  finished_at: Date | null;
  last_activity_at: Date;
  total_queries: number;
  valid_queries: number;
  invalid_queries: number;
  failed_accusations: number;
  hints_used: number;
  paste_attempts: number;
  final_suspect_id: string | null;
  solved: boolean;
  evidence_at_last_accusation: number;
  consecutive_valid: number;
  best_consecutive_valid: number;
}

const QUERY_RATE_PER_MIN = Number(process.env.QUERY_RATE_PER_MIN || 30);
const PREVIEW_ROWS = 50;

function requireCase(id: number): CaseDef {
  const c = getCase(id);
  if (!c) throw new GameError(404, 'Caso inexistente.');
  return c;
}

/* ───────────────────────── Jugadores ───────────────────────── */

export async function registerPlayer(input: { fullName: string; group: string; studentCode?: string | null }) {
  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  const group = input.group.trim().replace(/\s+/g, ' ');
  const code = input.studentCode?.trim() || null;
  if (fullName.length < 3 || fullName.length > 120) throw new GameError(400, 'Escribe tu nombre completo (3 a 120 caracteres).');
  if (group.length < 1 || group.length > 60) throw new GameError(400, 'Indica tu grupo o curso.');
  if (code && code.length > 40) throw new GameError(400, 'El código estudiantil es demasiado largo.');
  const token = newToken();
  const recoveryKey = newRecoveryKey();
  for (let attempt = 0; attempt < 6; attempt++) {
    const badge = newBadgeCode();
    const id = randomUUID();
    try {
      await q(
        `INSERT INTO game.players (id, full_name, group_name, student_code, badge_code, token_hash, recovery_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, fullName, group, code, badge, hmacToken(token), hmacToken(recoveryKey)],
      );
      return { playerId: id, token, badge, recoveryKey };
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e;
    }
  }
  throw new GameError(500, 'No se pudo generar una credencial única. Intenta de nuevo.');
}

export interface PlayerRow {
  id: string;
  full_name: string;
  group_name: string;
  student_code: string | null;
  badge_code: string;
  created_at: Date;
}

export async function playerByToken(token: string | undefined | null): Promise<PlayerRow | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const rows = await q<PlayerRow>(
    `UPDATE game.players SET last_seen_at = now() WHERE token_hash = $1
     RETURNING id, full_name, group_name, student_code, badge_code, created_at`,
    [hmacToken(token)],
  );
  return rows[0] ?? null;
}

export async function recoverPlayer(badge: string, recoveryKey: string) {
  const b = badge.trim().toUpperCase();
  const k = recoveryKey.trim().toUpperCase();
  const rows = await q<{ id: string; recovery_hash: string }>('SELECT id, recovery_hash FROM game.players WHERE badge_code = $1', [b]);
  if (!rows[0] || rows[0].recovery_hash !== hmacToken(k)) return null;
  const token = newToken();
  await q('UPDATE game.players SET token_hash = $1, last_seen_at = now() WHERE id = $2', [hmacToken(token), rows[0].id]);
  return { playerId: rows[0].id, token };
}

export function caseSummaries(): CaseSummary[] {
  return ALL_CASES.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    level: c.level,
    tagline: c.tagline,
    location: c.location,
    date: c.date,
    scene: c.scene,
    concepts: c.concepts,
    tables: c.tables.length,
    suspects: c.characters.filter((x) => x.suspect).length,
    rows: c.tables.reduce((s, t) => s + t.rows.length, 0),
  }));
}

export async function playerOverview(player: PlayerRow): Promise<PlayerOverview> {
  const invs = await q<InvRow>('SELECT * FROM game.investigations WHERE player_id = $1 ORDER BY started_at DESC', [player.id]);
  const ach = await q<{ achievement_id: string; unlocked_at: Date }>('SELECT achievement_id, unlocked_at FROM game.achievements WHERE player_id = $1 ORDER BY unlocked_at', [player.id]);
  const solvedCases = new Set(invs.filter((i) => i.solved && i.case_id > 0).map((i) => i.case_id));
  const lvl = (n: number) => [...solvedCases].filter((id) => getCase(id)?.level === n).length;
  const rank = computeRank({ tutorialDone: invs.some((i) => i.case_id === 0 && i.solved), solved: solvedCases.size, solvedLevel2: lvl(2), solvedLevel3: lvl(3) });
  return {
    player: { id: player.id, fullName: player.full_name, group: player.group_name, studentCode: player.student_code, badge: player.badge_code, createdAt: player.created_at.toISOString() },
    rank,
    achievements: ach.map((a) => ({ id: a.achievement_id, unlockedAt: a.unlocked_at.toISOString() })),
    investigations: invs.map((i) => ({ id: i.id, caseId: i.case_id, code: i.verification_code, status: i.status, solved: i.solved, validQueries: i.valid_queries, startedAt: i.started_at.toISOString(), finishedAt: i.finished_at?.toISOString() ?? null })),
    cases: caseSummaries(),
  };
}

/* ───────────────────────── Investigaciones ───────────────────────── */

export async function startInvestigation(player: PlayerRow, caseId: number, group?: string): Promise<InvRow> {
  requireCase(caseId);
  const active = await q<InvRow>("SELECT * FROM game.investigations WHERE player_id = $1 AND case_id = $2 AND status = 'en_proceso'", [player.id, caseId]);
  if (active[0]) return active[0];
  const groupName = (group?.trim() || player.group_name).slice(0, 60);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = newVerificationCode();
    try {
      const rows = await q<InvRow>(
        `INSERT INTO game.investigations (id, player_id, case_id, verification_code, student_name, group_name, student_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [randomUUID(), player.id, caseId, code, player.full_name, groupName, player.student_code],
      );
      await audit('player', player.id, 'investigation.start', rows[0].id, { caseId, code });
      return rows[0];
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === '23505' && err.constraint === 'investigations_one_active_uq') {
        const again = await q<InvRow>("SELECT * FROM game.investigations WHERE player_id = $1 AND case_id = $2 AND status = 'en_proceso'", [player.id, caseId]);
        if (again[0]) return again[0];
      }
      if (err.code !== '23505') throw e;
    }
  }
  throw new GameError(500, 'No se pudo generar un código de verificación único.');
}

export async function loadOwnInvestigation(player: PlayerRow, invId: string, client?: pg.PoolClient, lock = false): Promise<InvRow> {
  if (!/^[0-9a-f-]{36}$/i.test(invId)) throw new GameError(404, 'Investigación no encontrada.');
  const sql = `SELECT * FROM game.investigations WHERE id = $1 AND player_id = $2${lock ? ' FOR UPDATE' : ''}`;
  const rows = client ? (await client.query<InvRow>(sql, [invId, player.id])).rows : await q<InvRow>(sql, [invId, player.id]);
  if (!rows[0]) throw new GameError(404, 'Investigación no encontrada.');
  return rows[0];
}

export async function abandonInvestigation(player: PlayerRow, invId: string) {
  return tx(async (c) => {
    const inv = await loadOwnInvestigation(player, invId, c, true);
    if (inv.status !== 'en_proceso') throw new GameError(409, 'La investigación ya está cerrada.');
    await c.query("UPDATE game.investigations SET status = 'no_resuelto', finished_at = now() WHERE id = $1", [inv.id]);
    await auditTx(c, 'player', player.id, 'investigation.abandon', inv.id, {});
  });
}

interface FoundRow {
  evidence_id: string;
  found_at: Date;
  seq: number | null;
}

async function foundEvidence(client: pg.PoolClient | null, invId: string): Promise<FoundRow[]> {
  const sql = `SELECT e.evidence_id, e.found_at, qq.seq FROM game.evidence_found e LEFT JOIN game.queries qq ON qq.id = e.query_id
               WHERE e.investigation_id = $1 ORDER BY e.found_at`;
  return client ? (await client.query<FoundRow>(sql, [invId])).rows : q<FoundRow>(sql, [invId]);
}

function evidenceView(c: CaseDef, rows: FoundRow[]): PublicEvidence[] {
  return rows
    .map((r) => {
      const e = c.evidence.find((x) => x.id === r.evidence_id);
      if (!e) return null;
      return { id: e.id, title: e.title, description: e.description, key: !!e.key, querySeq: r.seq, foundAt: r.found_at.toISOString() };
    })
    .filter((x): x is PublicEvidence => x !== null);
}

function querySummary(r: Record<string, unknown>): QuerySummary {
  return {
    seq: r.seq as number,
    sql: r.sql_text as string,
    executedAt: (r.executed_at as Date).toISOString(),
    syntaxValid: r.syntax_valid as boolean,
    executed: r.executed as boolean,
    counted: r.counted as boolean,
    rejectReason: (r.reject_reason as string) ?? null,
    errorMessage: (r.error_message as string) ?? null,
    errorHint: (r.error_hint as string) ?? null,
    tables: (r.tables_used as string[]) ?? [],
    features: (r.features as string[]) ?? [],
    rowCount: (r.row_count as number) ?? null,
    evidence: (r.evidence_ids as string[]) ?? [],
  };
}

export async function investigationView(inv: InvRow, client: pg.PoolClient | null = null): Promise<InvestigationView> {
  const c = requireCase(inv.case_id);
  const run = <T extends pg.QueryResultRow>(sql: string, params: unknown[]) => (client ? client.query<T>(sql, params).then((r) => r.rows) : q<T>(sql, params));
  // Con un cliente de transacción las consultas deben ser secuenciales (un cliente = una consulta a la vez).
  const found = await foundEvidence(client, inv.id);
  const hints = await run<{ hint_id: string; level: number }>('SELECT hint_id, level FROM game.hints_used WHERE investigation_id = $1', [inv.id]);
  const asked = await run<{ character_id: string; question_id: string; asked_at: Date }>('SELECT character_id, question_id, asked_at FROM game.interrogations WHERE investigation_id = $1 ORDER BY asked_at', [inv.id]);
  const accs = await run<{ suspect_id: string; correct: boolean; created_at: Date }>('SELECT suspect_id, correct, created_at FROM game.accusations WHERE investigation_id = $1 ORDER BY created_at', [inv.id]);
  const queries = await run<Record<string, unknown>>(
    'SELECT seq, sql_text, executed_at, syntax_valid, executed, counted, reject_reason, error_message, error_hint, tables_used, features, row_count, evidence_ids FROM game.queries WHERE investigation_id = $1 ORDER BY seq DESC LIMIT 300',
    [inv.id],
  );
  const foundSet = new Set(found.map((f) => f.evidence_id));
  const askedSet = new Set(asked.map((a) => `${a.character_id}:${a.question_id}`));
  const hintLevels = new Map<string, number>();
  for (const h of hints) hintLevels.set(h.hint_id, Math.max(hintLevels.get(h.hint_id) ?? 0, h.level));

  const characters: PublicCharacter[] = c.characters.map((ch) => {
    const available = ch.questions.filter(
      (qq) => (qq.requires ?? []).every((e) => foundSet.has(e)) && (qq.requiresQuestions ?? []).every((r) => askedSet.has(r)),
    );
    const acc = accs.find((a) => a.suspect_id === ch.id);
    return {
      id: ch.id,
      name: ch.name,
      role: ch.role,
      age: ch.age,
      bio: ch.bio,
      statement: ch.statement,
      suspect: ch.suspect,
      look: ch.look,
      questions: available.map((qq) => {
        const wasAsked = askedSet.has(`${ch.id}:${qq.id}`);
        return { id: qq.id, text: qq.text, asked: wasAsked, answer: wasAsked ? qq.answer : undefined, contradiction: wasAsked ? qq.contradiction : undefined, isNew: !wasAsked && !!qq.requires?.length };
      }),
      lockedQuestions: ch.questions.length - available.length,
      accused: acc ? (acc.correct ? 'correcto' : 'incorrecto') : undefined,
    };
  });

  const visibleHints = c.hints.filter(
    (h) => (h.requires?.evidence ?? []).every((e) => foundSet.has(e)) && (h.requires?.questions ?? []).every((r) => askedSet.has(r)),
  );
  const notes: { character: string; text: string }[] = [];
  for (const a of asked) {
    const ch = c.characters.find((x) => x.id === a.character_id);
    const qq = ch?.questions.find((x) => x.id === a.question_id);
    if (ch && qq?.note) notes.push({ character: ch.name, text: qq.note });
  }
  const gate = accusationGate({
    caseDef: c,
    validQueries: inv.valid_queries,
    failedAccusations: inv.failed_accusations,
    foundEvidence: [...foundSet],
    evidenceAtLastAccusation: inv.evidence_at_last_accusation,
    accusedSuspects: accs.map((a) => a.suspect_id),
    status: inv.status,
  });
  const done = new Set(objectivesCompleted(c, foundSet));

  const view: InvestigationView = {
    id: inv.id,
    code: inv.verification_code,
    status: inv.status,
    startedAt: inv.started_at.toISOString(),
    finishedAt: inv.finished_at?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    stats: { total: inv.total_queries, valid: inv.valid_queries, invalid: inv.invalid_queries, failedAccusations: inv.failed_accusations, hintsUsed: inv.hints_used },
    gate: { ...gate, minSupportingEvidence: c.accusation.minSupportingEvidence ?? 2 },
    accusations: accs.map((a) => ({ suspectId: a.suspect_id, correct: a.correct, at: a.created_at.toISOString() })),
    case: {
      id: c.id,
      code: c.code,
      title: c.title,
      level: c.level,
      tagline: c.tagline,
      location: c.location,
      date: c.date,
      scene: c.scene,
      briefing: c.briefing,
      timeline: c.timeline,
      concepts: c.concepts,
      tables: c.tables.map((t) => ({
        name: t.name,
        description: t.description,
        rowCount: t.rows.length,
        columns: t.columns.map((col) => ({ name: col.name, type: col.type, pk: !!col.pk, fk: col.fk ?? null, nullable: !!col.nullable, description: col.description })),
      })),
      evidenceTotal: c.evidence.length,
    },
    characters,
    objectives: c.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      done: done.has(o.id),
      found: o.evidence.filter((e) => foundSet.has(e)).length,
      need: o.need ?? o.evidence.length,
      total: o.evidence.length,
      tables: o.tables,
    })),
    hints: visibleHints.map((h) => {
      const used = hintLevels.get(h.id) ?? 0;
      return { id: h.id, title: h.title, evidence: h.evidence, levelsUsed: used, texts: h.levels.slice(0, used), confirmed: !!h.evidence && foundSet.has(h.evidence) };
    }),
    hintsLocked: c.hints.length - visibleHints.length,
    evidence: evidenceView(c, found),
    notes,
    queries: queries.map(querySummary),
  };
  if (c.tutorial) view.steps = c.tutorial.map((s) => ({ id: s.id, title: s.title, lesson: s.lesson, task: s.task, example: s.example, done: foundSet.has(s.evidence) }));
  if (inv.solved) {
    const culprit = c.characters.find((x) => x.id === c.solution.culprit)!;
    view.resolution = {
      culpritId: culprit.id,
      culpritName: culprit.name,
      motive: c.solution.motive,
      opportunity: c.solution.opportunity,
      method: c.solution.method,
      justification: c.solution.justification,
      reveal: c.solution.reveal,
    };
  }
  return view;
}

/* ───────────────────────── Consultas ───────────────────────── */

export async function executeQuery(player: PlayerRow, invId: string, sqlRaw: string): Promise<QueryResponse> {
  if (typeof sqlRaw !== 'string') throw new GameError(400, 'Consulta inválida.');
  const sql = sqlRaw.replace(/\r\n/g, '\n').slice(0, 6000);
  return tx(async (client) => {
    const inv = await loadOwnInvestigation(player, invId, client, true);
    if (inv.status !== 'en_proceso') throw new GameError(409, 'La investigación está cerrada: ya no se pueden ejecutar consultas.');
    const c = requireCase(inv.case_id);
    const recent = await client.query<{ n: string }>("SELECT count(*) AS n FROM game.queries WHERE investigation_id = $1 AND executed_at > now() - interval '1 minute'", [inv.id]);
    if (Number(recent.rows[0].n) >= QUERY_RATE_PER_MIN)
      throw new GameError(429, 'Demasiadas consultas en poco tiempo. Respira, detective: analiza los resultados antes de seguir.');

    const seq = inv.total_queries + 1;
    const tables = c.tables.map((t) => t.name);
    const allColumns = [...new Set(c.tables.flatMap((t) => t.columns.map((col) => col.name)))];
    let analysis: SqlAnalysis | null = null;
    let errorMessage: string | null = null;
    let errorHint: string | null = null;
    let rejectReason: string | null = null;
    let syntaxValid = true;
    let executed = false;
    let counted = false;
    let columns: string[] = [];
    let rows: unknown[][] = [];
    let rowCount: number | null = null;
    let truncated = false;
    let durationMs: number | null = null;
    let rHash: string | null = null;
    let newEvidenceIds: string[] = [];
    let objectivesTouched: string[] = [];

    try {
      analysis = analyzeSql(sql, { schema: caseSchema(c.id), tables });
    } catch (e) {
      if (!(e instanceof SqlRejected)) throw e;
      syntaxValid = !['syntax', 'empty'].includes(e.code);
      errorMessage = e.message;
      errorHint = e.hint ?? null;
      rejectReason = e.message;
    }

    if (analysis) {
      try {
        const res = await runSandboxed(c.id, sql);
        executed = true;
        columns = res.columns;
        rows = res.rows;
        rowCount = res.rowCount;
        truncated = res.truncated;
        durationMs = res.durationMs;
        rHash = resultHash(res);
        const prior = (
          await client.query<PriorQuery>(
            'SELECT seq, counted, executed, normalized_hash, template_hash, shape_hash, result_hash FROM game.queries WHERE investigation_id = $1',
            [inv.id],
          )
        ).rows;
        const decision = decideCount(analysis, res, prior);
        counted = decision.counted;
        rejectReason = decision.reason ?? null;
        const detected = detectEvidence(c.evidence, res, analysis.features);
        const already = new Set((await client.query<{ evidence_id: string }>('SELECT evidence_id FROM game.evidence_found WHERE investigation_id = $1', [inv.id])).rows.map((r) => r.evidence_id));
        newEvidenceIds = detected.filter((d) => !already.has(d));
        const touched = new Set<string>();
        for (const o of c.objectives) {
          if (o.evidence.some((e) => detected.includes(e)) || o.tables.some((t) => analysis!.tables.includes(t))) touched.add(o.id);
        }
        objectivesTouched = [...touched];
        if (truncated) rejectReason = rejectReason ?? null;
      } catch (e) {
        const fe = friendlyPgError(e, { columns: allColumns, tables });
        syntaxValid = (e as { code?: string }).code !== '42601';
        errorMessage = fe.message;
        errorHint = fe.hint;
        rejectReason = fe.message;
      }
    }

    const ins = await client.query<{ id: string }>(
      `INSERT INTO game.queries (investigation_id, seq, sql_text, duration_ms, syntax_valid, executed, counted, reject_reason,
         error_message, error_hint, tables_used, features, row_count, truncated, columns, result_preview, result_hash,
         normalized_hash, template_hash, shape_hash, evidence_ids, objective_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id`,
      [
        inv.id, seq, sql, durationMs, syntaxValid, executed, counted, counted ? null : rejectReason, errorMessage, errorHint,
        analysis?.tables ?? [], analysis?.features ?? [], rowCount, truncated, columns,
        executed ? JSON.stringify(rows.slice(0, PREVIEW_ROWS)) : null, rHash,
        analysis?.normalizedHash ?? null, analysis?.templateHash ?? null, analysis?.shapeHash ?? null, newEvidenceIds, objectivesTouched,
      ],
    );
    const queryId = ins.rows[0].id;
    for (const eid of newEvidenceIds)
      await client.query('INSERT INTO game.evidence_found (investigation_id, evidence_id, query_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [inv.id, eid, queryId]);

    const consecutive = executed ? inv.consecutive_valid + 1 : 0;
    await client.query(
      `UPDATE game.investigations SET total_queries = total_queries + 1, valid_queries = valid_queries + $2,
         invalid_queries = invalid_queries + $3, consecutive_valid = $4, best_consecutive_valid = GREATEST(best_consecutive_valid, $4),
         last_activity_at = now() WHERE id = $1`,
      [inv.id, counted ? 1 : 0, executed ? 0 : 1, consecutive],
    );

    // Tutorial: se completa automáticamente al descubrir todas las evidencias clave… pero exige la acusación final.
    const fresh = await loadOwnInvestigation(player, inv.id, client);
    const newAch = await checkAchievements(client, player.id, fresh, { features: (analysis?.features ?? []) as Feature[], executed, counted });
    const view = await investigationView(fresh, client);
    const summary = view.queries.find((x) => x.seq === seq)!;
    return {
      query: summary,
      columns,
      rows,
      truncated,
      durationMs,
      newEvidence: view.evidence.filter((e) => newEvidenceIds.includes(e.id)),
      newAchievements: newAch,
      objectivesTouched,
      view,
    };
  });
}

/* ───────────────────────── Pistas e interrogatorios ───────────────────────── */

export async function requestHint(player: PlayerRow, invId: string, hintId: string) {
  return tx(async (client) => {
    const inv = await loadOwnInvestigation(player, invId, client, true);
    if (inv.status !== 'en_proceso') throw new GameError(409, 'La investigación está cerrada.');
    const c = requireCase(inv.case_id);
    const h = c.hints.find((x) => x.id === hintId);
    if (!h) throw new GameError(404, 'Pista inexistente.');
    const found = new Set((await foundEvidence(client, inv.id)).map((f) => f.evidence_id));
    const asked = new Set((await client.query<{ k: string }>("SELECT character_id || ':' || question_id AS k FROM game.interrogations WHERE investigation_id = $1", [inv.id])).rows.map((r) => r.k));
    if (!(h.requires?.evidence ?? []).every((e) => found.has(e)) || !(h.requires?.questions ?? []).every((r) => asked.has(r)))
      throw new GameError(403, 'Esa pista todavía no está disponible.');
    const used = (await client.query<{ m: number | null }>('SELECT max(level) AS m FROM game.hints_used WHERE investigation_id = $1 AND hint_id = $2', [inv.id, h.id])).rows[0].m ?? 0;
    if (used >= 3) throw new GameError(409, 'Ya revelaste todos los niveles de esta pista.');
    const level = used + 1;
    await client.query('INSERT INTO game.hints_used (investigation_id, hint_id, level) VALUES ($1,$2,$3)', [inv.id, h.id, level]);
    await client.query('UPDATE game.investigations SET hints_used = hints_used + 1, last_activity_at = now() WHERE id = $1', [inv.id]);
    const fresh = await loadOwnInvestigation(player, inv.id, client);
    return { level, text: h.levels[level - 1], view: await investigationView(fresh, client) };
  });
}

export async function askQuestion(player: PlayerRow, invId: string, characterId: string, questionId: string) {
  return tx(async (client) => {
    const inv = await loadOwnInvestigation(player, invId, client, true);
    const c = requireCase(inv.case_id);
    const ch = c.characters.find((x) => x.id === characterId);
    const qq = ch?.questions.find((x) => x.id === questionId);
    if (!ch || !qq) throw new GameError(404, 'Pregunta inexistente.');
    const found = new Set((await foundEvidence(client, inv.id)).map((f) => f.evidence_id));
    const asked = new Set((await client.query<{ k: string }>("SELECT character_id || ':' || question_id AS k FROM game.interrogations WHERE investigation_id = $1", [inv.id])).rows.map((r) => r.k));
    if (!(qq.requires ?? []).every((e) => found.has(e)) || !(qq.requiresQuestions ?? []).every((r) => asked.has(r)))
      throw new GameError(403, 'Todavía no tienes evidencia para hacer esa pregunta.');
    if (inv.status === 'en_proceso') {
      await client.query('INSERT INTO game.interrogations (investigation_id, character_id, question_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [inv.id, ch.id, qq.id]);
      await client.query('UPDATE game.investigations SET last_activity_at = now() WHERE id = $1', [inv.id]);
    }
    const fresh = await loadOwnInvestigation(player, inv.id, client);
    return { answer: qq.answer, contradiction: !!qq.contradiction, note: qq.note ?? null, view: await investigationView(fresh, client) };
  });
}

/* ───────────────────────── Acusación ───────────────────────── */

export async function accuse(player: PlayerRow, invId: string, suspectId: string, evidenceIds: string[], justification: string) {
  return tx(async (client) => {
    const inv = await loadOwnInvestigation(player, invId, client, true);
    if (inv.status !== 'en_proceso') throw new GameError(409, 'La investigación ya está cerrada: no se aceptan más acusaciones.');
    const c = requireCase(inv.case_id);
    const suspect = c.characters.find((x) => x.id === suspectId && x.suspect);
    if (!suspect) throw new GameError(400, 'Debes elegir a uno de los sospechosos del caso.');
    const found = (await foundEvidence(client, inv.id)).map((f) => f.evidence_id);
    const accs = (await client.query<{ suspect_id: string }>('SELECT suspect_id FROM game.accusations WHERE investigation_id = $1', [inv.id])).rows.map((r) => r.suspect_id);
    if (accs.includes(suspect.id)) throw new GameError(409, `Ya acusaste a ${suspect.name} y fue descartado. No puedes repetir la acusación.`);
    const gate = accusationGate({ caseDef: c, validQueries: inv.valid_queries, failedAccusations: inv.failed_accusations, foundEvidence: found, evidenceAtLastAccusation: inv.evidence_at_last_accusation, accusedSuspects: accs, status: inv.status });
    if (!gate.unlocked) throw new GameError(403, 'La fiscalía no acepta la acusación todavía: ' + gate.reasons.join(' '));
    const ids = [...new Set((Array.isArray(evidenceIds) ? evidenceIds : []).filter((x) => typeof x === 'string'))];
    const minSupport = c.accusation.minSupportingEvidence ?? 2;
    if (ids.length < minSupport) throw new GameError(400, `Presenta al menos ${minSupport} evidencias descubiertas que respalden la acusación.`);
    if (!ids.every((x) => found.includes(x))) throw new GameError(400, 'Solo puedes presentar evidencias que hayas descubierto con tus consultas.');
    const just = (justification ?? '').trim();
    if (just.length < 30) throw new GameError(400, 'Escribe una justificación de al menos 30 caracteres explicando cómo las evidencias señalan al culpable.');
    if (just.length > 2000) throw new GameError(400, 'La justificación no puede superar 2000 caracteres.');

    const correct = suspect.id === c.solution.culprit;
    await client.query(
      'INSERT INTO game.accusations (investigation_id, suspect_id, evidence_ids, justification, correct, valid_queries_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [inv.id, suspect.id, ids, just, correct, inv.valid_queries],
    );
    if (correct) {
      await client.query("UPDATE game.investigations SET status = 'resuelto', solved = true, finished_at = now(), final_suspect_id = $2, last_activity_at = now() WHERE id = $1", [inv.id, suspect.id]);
    } else {
      await client.query('UPDATE game.investigations SET failed_accusations = failed_accusations + 1, evidence_at_last_accusation = $2, final_suspect_id = $3, last_activity_at = now() WHERE id = $1', [inv.id, found.length, suspect.id]);
    }
    await auditTx(client, 'player', player.id, 'accusation', inv.id, { suspect: suspect.id, correct, evidence: ids });
    const fresh = await loadOwnInvestigation(player, inv.id, client);
    const newAch = await checkAchievements(client, player.id, fresh, { features: [], executed: false, counted: false, accusation: correct });
    const elimination = !correct ? c.solution.eliminations[suspect.id]?.explanation ?? 'Su coartada resiste el examen de los datos.' : null;
    const relevant = ids.filter((x) => c.solution.incriminating.includes(x)).length;
    return { correct, elimination, relevantEvidence: relevant, newAchievements: newAch, view: await investigationView(fresh, client) };
  });
}

export async function recordPasteAttempts(player: PlayerRow, invId: string, count: number) {
  const n = Math.max(0, Math.min(50, Math.floor(Number(count) || 0)));
  if (!n) return;
  const inv = await loadOwnInvestigation(player, invId);
  await q('UPDATE game.investigations SET paste_attempts = paste_attempts + $2 WHERE id = $1', [inv.id, n]);
}

/* ───────────────────────── Auditoría ───────────────────────── */

export async function audit(actorType: string, actorId: string | null, action: string, investigationId: string | null, details: unknown, ip?: string | null) {
  await q('INSERT INTO game.audit_log (actor_type, actor_id, action, investigation_id, details, ip) VALUES ($1,$2,$3,$4,$5,$6)', [actorType, actorId, action, investigationId, JSON.stringify(details ?? {}), ip ?? null]).catch(() => {});
}
async function auditTx(c: pg.PoolClient, actorType: string, actorId: string | null, action: string, investigationId: string | null, details: unknown) {
  await c.query('INSERT INTO game.audit_log (actor_type, actor_id, action, investigation_id, details) VALUES ($1,$2,$3,$4,$5)', [actorType, actorId, action, investigationId, JSON.stringify(details ?? {})]);
}
