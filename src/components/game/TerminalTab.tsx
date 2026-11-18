'use client';
import { useMemo, useRef, useState } from 'react';
import type { InvestigationView, QueryResponse, QuerySummary } from '@/lib/types';
import { api, sfx } from '@/lib/client';
import { SqlEditor, type SqlEditorHandle } from './SqlEditor';
import { ErDiagram, ResultsTable, SchemaExplorer } from './Schema';
import { SqlReference } from './Reference';
import { PixelIcon } from '../art/Icons';

const FEATURE_LABEL: Record<string, string> = {
  where: 'WHERE', and: 'AND', or: 'OR', not: 'NOT', like: 'LIKE', in: 'IN', between: 'BETWEEN', order_by: 'ORDER BY', distinct: 'DISTINCT', limit: 'LIMIT', is_null: 'IS NULL',
  aggregate: 'agregación', group_by: 'GROUP BY', having: 'HAVING', inner_join: 'INNER JOIN', left_join: 'LEFT JOIN', right_join: 'RIGHT JOIN', full_join: 'FULL JOIN',
  subquery: 'subconsulta', cte: 'WITH', union: 'UNION', case: 'CASE',
};

export function TerminalTab({ view, onResponse, onBlocked, toast }: { view: InvestigationView; onResponse: (r: QueryResponse) => void; onBlocked: (k: string) => void; toast: (t: string, k?: 'red' | 'ok' | 'amber') => void }) {
  const editor = useRef<SqlEditorHandle>(null);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<QueryResponse | null>(null);
  const [showRef, setShowRef] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const closed = view.status !== 'en_proceso';
  const schema = useMemo(() => Object.fromEntries(view.case.tables.map((t) => [t.name, t.columns.map((c) => c.name)])), [view.case.tables]);
  const steps = view.steps;
  const activeStep = steps?.find((s) => !s.done);

  async function run() {
    const sql = editor.current?.getValue() ?? '';
    if (!sql.trim() || running) return;
    if (closed) return toast('La investigación está cerrada.', 'amber');
    setRunning(true);
    sfx.run();
    try {
      const r = await api<QueryResponse>(`/api/investigations/${view.id}/query`, { body: { sql } });
      setLast(r);
      onResponse(r);
      if (!r.query.executed) sfx.error();
    } catch (e) {
      toast((e as Error).message, 'red');
      sfx.error();
    } finally {
      setRunning(false);
    }
  }

  const q = last?.query;
  let feedback: React.ReactNode = null;
  if (q) {
    if (!q.executed)
      feedback = (
        <div className="feedback feedback--error" role="alert">
          <b>✗ Consulta #{q.seq} no ejecutada.</b> {q.errorMessage}
          {q.errorHint && <span className="hint-line">› {q.errorHint}</span>}
        </div>
      );
    else if (q.counted)
      feedback = (
        <div className="feedback feedback--ok">
          <b>✓ Consulta #{q.seq} válida y contabilizada</b> ({view.stats.valid}/{view.gate.requiredQueries}).
          {last!.newEvidence.length > 0 && <span className="hint-line">★ Evidencia descubierta: {last!.newEvidence.map((e) => e.title).join(' · ')}</span>}
          {last!.newEvidence.length === 0 && last!.objectivesTouched.length > 0 && (
            <span className="hint-line" style={{ color: '#cfe4bd' }}>Aporta a: {view.objectives.filter((o) => last!.objectivesTouched.includes(o.id)).map((o) => o.title).join(' · ')}</span>
          )}
        </div>
      );
    else
      feedback = (
        <div className="feedback feedback--warn">
          <b>◐ Consulta #{q.seq} ejecutada, pero no suma al contador.</b> {q.rejectReason}
          {last!.newEvidence.length > 0 && <span className="hint-line">★ Evidencia descubierta: {last!.newEvidence.map((e) => e.title).join(' · ')}</span>}
        </div>
      );
  }

  return (
    <div>
      <div className="term-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps && (
            <div className="panel">
              <div className="panel__head"><PixelIcon name="book" /> Entrenamiento ({steps.filter((s) => s.done).length}/{steps.length})</div>
              <div className="panel__body steps">
                {steps.map((s) => (
                  <div key={s.id} className={`step ${s.done ? 'done' : ''} ${activeStep?.id === s.id ? 'active' : ''}`}>
                    <h4>{s.done ? <PixelIcon name="check" size={14} /> : <span>›</span>} {s.title}</h4>
                    {activeStep?.id === s.id && (
                      <>
                        {s.lesson.map((l, i) => <p key={i}>{l}</p>)}
                        <p style={{ color: 'var(--amber)' }}><b>Tarea:</b> {s.task}</p>
                        {s.example && <p>Forma general: <code>{s.example}</code></p>}
                      </>
                    )}
                  </div>
                ))}
                {!activeStep && <p style={{ color: 'var(--ok)', fontSize: 14 }}>¡Todas las lecciones completadas! Ve a la pestaña Acusación y responde: ¿quién se llevó la taza?</p>}
              </div>
            </div>
          )}
          <SchemaExplorer tables={view.case.tables} onShowMap={() => setShowMap(true)} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="crt">
            <div className="crt__bar">
              <span>TERMINAL INDICE-7 · {view.case.code}</span>
              <span className="grow" />
              <span>válidas {view.stats.valid}/{view.gate.requiredQueries}</span>
              <button className="btn btn--small btn--ghost" onClick={() => setShowRef(true)}>Manual SQL</button>
              <button className="btn btn--term" onClick={run} disabled={running || closed} title="Ctrl+Enter">
                {running ? 'EJECUTANDO…' : '▶ EJECUTAR'}
              </button>
            </div>
            <SqlEditor ref={editor} schema={schema} onRun={run} onBlocked={onBlocked} />
            {feedback}
            {last?.query.executed && (
              <>
                <ResultsTable columns={last.columns} rows={last.rows} />
                <div className="results-meta">
                  <span>{last.query.rowCount} fila(s){last.truncated ? ' · resultado recortado a 500 filas: filtra más' : ''}</span>
                  <span>{last.query.features.map((f) => FEATURE_LABEL[f]).filter(Boolean).join(' · ')}</span>
                  <span>{last.durationMs} ms</span>
                </div>
              </>
            )}
            {!last && <div className="results-meta"><span>Listo. Escribe una consulta y presiona Ctrl+Enter.</span></div>}
          </div>
          <HistoryPanel queries={view.queries} onLoad={(sql) => editor.current?.setValue(sql)} />
        </div>
      </div>
      {showRef && <SqlReference onClose={() => setShowRef(false)} />}
      {showMap && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setShowMap(false)}>
          <div style={{ width: 'min(1100px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-title)', margin: 0, fontWeight: 'normal' }}>Modelo relacional · {view.case.code}</h2>
              <button className="btn btn--small" onClick={() => setShowMap(false)}>Cerrar</button>
            </div>
            <ErDiagram tables={view.case.tables} />
            <p style={{ color: '#c9c1a3', fontSize: 14 }}>PK = clave primaria · FK = clave foránea. Las líneas rojas unen cada clave foránea con la columna a la que apunta: son los caminos posibles para tus JOIN.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ queries, onLoad }: { queries: QuerySummary[]; onLoad: (sql: string) => void }) {
  const [filter, setFilter] = useState<'todas' | 'validas' | 'errores'>('todas');
  const list = queries.filter((q) => (filter === 'todas' ? true : filter === 'validas' ? q.counted : !q.executed));
  return (
    <div className="panel">
      <div className="panel__head">
        <PixelIcon name="clock" /> Historial de consultas ({queries.length})
        <span style={{ flex: 1 }} />
        {(['todas', 'validas', 'errores'] as const).map((f) => (
          <button key={f} className={`btn btn--small ${filter === f ? 'btn--amber' : 'btn--ghost'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="history">
        {list.length === 0 && <div className="empty">Sin consultas todavía.</div>}
        {list.map((q) => (
          <div key={q.seq} className="history-item">
            <div className="history-item__meta">
              <b style={{ color: 'var(--paper)', fontFamily: 'var(--font-term)', fontSize: 18, fontWeight: 'normal' }}>#{q.seq}</b>
              {q.counted ? <span className="tag tag--ok">contabilizada</span> : q.executed ? <span className="tag tag--warn">no suma</span> : <span className="tag tag--red">error</span>}
              {q.evidence.length > 0 && <span className="tag tag--warn">★ {q.evidence.join(', ')}</span>}
              <span>{new Date(q.executedAt).toLocaleTimeString('es')}</span>
              {q.rowCount !== null && <span>{q.rowCount} filas</span>}
              <span style={{ flex: 1 }} />
              <button className="link-btn" onClick={() => onLoad(q.sql)}>cargar</button>
            </div>
            <pre>{q.sql}</pre>
            {!q.counted && (q.rejectReason || q.errorMessage) && <div style={{ color: '#b9a98a', fontSize: 12.5 }}>{q.errorMessage ?? q.rejectReason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
