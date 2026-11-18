'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/client';
import { SqlView } from '@/components/admin/SqlView';
import { Logo } from '@/components/art/Icons';

interface Detail {
  summary: {
    id: string; code: string; student: string; group: string; studentCode: string | null; caseCode: string; caseTitle: string; status: string; solved: boolean;
    selectedSuspect: string | null; totalQueries: number; validQueries: number; invalidQueries: number; failedAccusations: number; hintsUsed: number; pasteAttempts: number;
    evidenceFound: number; evidenceTotal: number; startedAt: string; finishedAt: string | null; elapsed: string;
  };
  correctCulprit: string;
  solution: { motive: string; method: string; justification: string };
  concepts: { concepto: string; consultas: number }[];
  evidence: { id: string; title: string; key: boolean; seq: number | null; at: string }[];
  missingEvidence: { id: string; title: string; key: boolean }[];
  accusations: { suspect: string; correct: boolean; evidence: string[]; relevant: number; justification: string; at: string; validQueriesAt: number }[];
  hints: { title: string; level: number; at: string }[];
  interrogations: { character: string; question: string; at: string }[];
  reports: { id: string; format: string; sha256: string; at: string }[];
  queries: { seq: number; sql: string; at: string; syntaxValid: boolean; executed: boolean; counted: boolean; reason: string | null; error: string | null; hint: string | null; tables: string[]; features: string[]; rowCount: number | null; columns: string[]; preview: unknown[][] | null; evidence: string[]; durationMs: number | null }[];
}

const STATUS: Record<string, string> = { en_proceso: 'En proceso', resuelto: 'Resuelto', no_resuelto: 'No resuelto' };
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('es') : '—');

export default function AdminDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'todas' | 'contabilizadas' | 'rechazadas'>('todas');
  useEffect(() => {
    api<Detail>(`/api/admin/investigations/${encodeURIComponent(code)}`)
      .then(setD)
      .catch((e) => setErr(e instanceof ApiError && e.status === 401 ? 'Sesión docente no válida. Ingresa de nuevo en /admin.' : (e as Error).message));
  }, [code]);
  if (err)
    return (
      <div className="admin"><div className="page"><div className="form-error">{err}</div><Link className="btn" href="/admin">← Panel</Link></div></div>
    );
  if (!d) return <div className="admin"><div className="page empty">Buscando el registro…</div></div>;
  const s = d.summary;
  const maxC = Math.max(1, ...d.concepts.map((c) => c.consultas));
  const qs = d.queries.filter((q) => (filter === 'todas' ? true : filter === 'contabilizadas' ? q.counted : !q.counted));
  const base = `/api/admin/investigations/${encodeURIComponent(s.code)}/report`;
  return (
    <div className="admin">
      <div className="page">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="row"><Logo compact /><Link className="btn btn--small" href="/admin">← Panel</Link></div>
          <div className="row">
            <a className="btn btn--small btn--red" href={`${base}?format=pdf`} download>Reporte PDF</a>
            <a className="btn btn--small" href={`${base}?format=json`} download>JSON firmado</a>
          </div>
        </div>
        <section className="admin-card mb">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-term)', fontSize: 30 }}>{s.code}</div>
              <h2 style={{ fontSize: 24, margin: '4px 0' }}>{s.student}</h2>
              <div>{s.group}{s.studentCode ? ` · código ${s.studentCode}` : ''}</div>
            </div>
            <span className={`stamp ${s.solved ? 'stamp--ok' : ''}`} style={{ fontSize: 20 }}>{s.solved ? 'Culpable identificado' : STATUS[s.status]}</span>
          </div>
          <dl className="kv mt">
            <dt>CASO</dt><dd>{s.caseCode} · {s.caseTitle}</dd>
            <dt>ESTADO</dt><dd>{STATUS[s.status]}</dd>
            <dt>¿ENCONTRÓ AL CULPABLE?</dt><dd><b>{s.solved ? 'SÍ' : 'NO'}</b></dd>
            <dt>CULPABLE IDENTIFICADO</dt><dd>{s.selectedSuspect ?? '—'}</dd>
            <dt>CULPABLE CORRECTO (solo docente)</dt><dd>{d.correctCulprit}</dd>
            <dt>NÚMERO DE INTENTOS</dt><dd>{d.accusations.length} acusación(es), {s.failedAccusations} fallida(s)</dd>
            <dt>CONSULTAS</dt><dd>{s.totalQueries} ejecutadas · {s.validQueries} válidas contabilizadas · {s.invalidQueries} inválidas</dd>
            <dt>PISTAS</dt><dd>{s.hintsUsed} niveles de ayuda</dd>
            <dt>EVIDENCIAS</dt><dd>{s.evidenceFound} de {s.evidenceTotal}</dd>
            <dt>INTENTOS DE PEGADO BLOQUEADOS</dt><dd>{s.pasteAttempts}</dd>
            <dt>INICIO / FIN</dt><dd>{fmt(s.startedAt)} → {fmt(s.finishedAt)}</dd>
            <dt>TIEMPO EMPLEADO</dt><dd>{s.elapsed}</dd>
          </dl>
          <details className="mt"><summary style={{ cursor: 'pointer' }}>Ver solución oficial del caso</summary><p><b>Motivo:</b> {d.solution.motive}</p><p><b>Método:</b> {d.solution.method}</p><p><b>Justificación:</b> {d.solution.justification}</p></details>
        </section>

        <div className="grid-2 mb">
          <section className="admin-card">
            <h2>Conceptos SQL practicados (análisis estructural real)</h2>
            {d.concepts.map((c) => (
              <div key={c.concepto} style={{ marginBottom: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}><span>{c.concepto}</span><b>{c.consultas}</b></div>
                <div className="bar"><span style={{ width: `${(c.consultas / maxC) * 100}%` }} /></div>
              </div>
            ))}
          </section>
          <section className="admin-card">
            <h2>Evidencias</h2>
            {d.evidence.map((e) => <div key={e.id} style={{ fontSize: 14 }}>✓ {e.key ? '★ ' : ''}{e.title} <span className="muted">(#{e.seq ?? '—'})</span></div>)}
            {d.missingEvidence.map((e) => <div key={e.id} style={{ fontSize: 14, color: 'var(--ink-faint)' }}>○ {e.key ? '★ ' : ''}{e.title}</div>)}
          </section>
        </div>

        <div className="grid-2 mb">
          <section className="admin-card">
            <h2>Acusaciones</h2>
            {!d.accusations.length && <p className="muted">Sin acusaciones.</p>}
            {d.accusations.map((a, i) => (
              <div key={i} style={{ borderBottom: '1px dashed #c9b48a', padding: '6px 0', fontSize: 14 }}>
                <b>{a.correct ? '✓ CORRECTA' : '✗ INCORRECTA'}</b> · {a.suspect} · {fmt(a.at)} · con {a.validQueriesAt} consultas válidas
                <div>Evidencias: {a.evidence.join(', ')} ({a.relevant} incriminatorias)</div>
                <div className="muted">«{a.justification}»</div>
              </div>
            ))}
          </section>
          <section className="admin-card">
            <h2>Pistas e interrogatorios</h2>
            {d.hints.map((h, i) => <div key={i} style={{ fontSize: 13.5 }}>Pista «{h.title}» nivel {h.level} · {fmt(h.at)}</div>)}
            {d.interrogations.map((x, i) => <div key={i} style={{ fontSize: 13.5 }}>{x.character}: «{x.question}» · {fmt(x.at)}</div>)}
            {!d.hints.length && !d.interrogations.length && <p className="muted">Sin registros.</p>}
            {d.reports.length > 0 && (
              <>
                <h2 className="mt">Reportes emitidos</h2>
                {d.reports.map((r) => <div key={r.id} style={{ fontSize: 12.5, fontFamily: 'var(--font-term)' }}>{r.format.toUpperCase()} · {fmt(r.at)} · {r.id} · sha256 {r.sha256.slice(0, 16)}…</div>)}
              </>
            )}
          </section>
        </div>

        <section className="admin-card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Historial completo de consultas ({d.queries.length})</h2>
            <div className="row">
              {(['todas', 'contabilizadas', 'rechazadas'] as const).map((x) => (
                <button key={x} className={`btn btn--small ${filter === x ? 'btn--amber' : ''}`} onClick={() => setFilter(x)}>{x}</button>
              ))}
            </div>
          </div>
          {qs.map((q) => (
            <details key={q.seq} className="q-item">
              <summary>
                <b style={{ fontFamily: 'var(--font-term)', fontSize: 20, fontWeight: 'normal' }}>#{q.seq}</b>
                <span className={`tag ${q.counted ? 'tag--ok' : q.executed ? 'tag--warn' : 'tag--red'}`} style={{ color: q.counted ? '#4f6e39' : q.executed ? '#8a6236' : '#a3302a' }}>
                  {q.counted ? 'ACEPTADA' : q.executed ? 'EJECUTADA · NO CONTABILIZADA' : q.syntaxValid ? 'RECHAZADA' : 'ERROR DE SINTAXIS'}
                </span>
                {q.evidence.length > 0 && <span className="tag" style={{ color: '#a3302a' }}>★ {q.evidence.join(', ')}</span>}
                <span style={{ fontSize: 13 }}>{fmt(q.at)}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontFamily: 'var(--font-term)' }}>{q.sql.replace(/\s+/g, ' ').slice(0, 110)}</span>
              </summary>
              <div style={{ padding: 10 }}>
                <SqlView sql={q.sql} />
                <dl className="kv mt">
                  <dt>SINTAXIS</dt><dd>{q.syntaxValid ? 'válida' : 'inválida'}</dd>
                  <dt>TABLAS</dt><dd>{q.tables.join(', ') || '—'}</dd>
                  <dt>CONSTRUCCIONES</dt><dd>{q.features.join(', ') || '—'}</dd>
                  <dt>RESULTADO</dt><dd>{q.rowCount === null ? '—' : `${q.rowCount} fila(s)`}{q.durationMs !== null ? ` · ${q.durationMs} ms` : ''}</dd>
                  {(q.reason || q.error) && <><dt>MOTIVO</dt><dd>{q.error ?? q.reason}{q.hint ? ` — ${q.hint}` : ''}</dd></>}
                </dl>
                {q.preview && q.preview.length > 0 && (
                  <div style={{ overflow: 'auto', maxHeight: 260, marginTop: 8 }}>
                    <table className="mini-table">
                      <thead><tr>{q.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                      <tbody>{q.preview.slice(0, 20).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody>
                    </table>
                    {q.preview.length > 20 && <div className="muted" style={{ fontSize: 12 }}>Vista previa de 20 filas.</div>}
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
