'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { InvestigationView } from '@/lib/types';
import { api, sfx } from '@/lib/client';
import { Portrait } from '../art/Portrait';
import { PixelIcon } from '../art/Icons';

type Toast = (t: string, k?: 'red' | 'ok' | 'amber') => void;

export interface AccuseResult {
  correct: boolean;
  elimination: string | null;
  relevantEvidence: number;
  newAchievements: { id: string; title: string }[];
  view: InvestigationView;
}

export function AccuseTab({ view, onResult, toast }: { view: InvestigationView; onResult: (r: AccuseResult, suspectName: string) => void; toast: Toast }) {
  const [suspect, setSuspect] = useState<string | null>(null);
  const [ev, setEv] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const g = view.gate;
  const accused = new Set(view.accusations.map((a) => a.suspectId));
  const suspects = view.characters.filter((c) => c.suspect);
  const tutorial = view.case.level === 0;

  if (view.status === 'resuelto') {
    return (
      <div className="accuse-stage" style={{ textAlign: 'center' }}>
        <span className="stamp stamp--big">Caso cerrado</span>
        <p style={{ marginTop: 18 }}>Este expediente ya fue resuelto. Puedes revisar la resolución y exportar tu reporte.</p>
      </div>
    );
  }

  const req = [
    { ok: g.validQueries >= g.requiredQueries, text: `Consultas válidas y distintas: ${g.validQueries} de ${g.requiredQueries}` },
    { ok: g.keyFound >= g.keyRequired, text: `Evidencias fundamentales (★): ${g.keyFound} de ${g.keyRequired}` },
    { ok: g.objectivesDone >= g.objectivesRequired, text: `Líneas de investigación completas: ${g.objectivesDone} de ${g.objectivesRequired}` },
  ];
  if (view.stats.failedAccusations > 0) req.push({ ok: !g.needsNewEvidence, text: 'Nueva evidencia desde la última acusación fallida' });

  async function submit() {
    if (!suspect) return;
    setBusy(true);
    try {
      const r = await api<AccuseResult>(`/api/investigations/${view.id}/accuse`, { body: { suspectId: suspect, evidenceIds: ev, justification: text } });
      setConfirming(false);
      const name = view.characters.find((c) => c.id === suspect)?.name ?? '';
      setSuspect(null);
      setEv([]);
      setText('');
      onResult(r, name);
    } catch (e) {
      toast((e as Error).message, 'red');
      sfx.error();
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="accuse-stage">
      <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal', margin: 0, fontSize: 24 }}>
        <PixelIcon name="gavel" size={24} /> {tutorial ? '¿Quién se llevó la taza?' : 'Presentar acusación ante la fiscalía'}
      </h2>
      <p style={{ color: '#c9c1a3' }}>
        La fiscalía solo acepta acusaciones respaldadas por evidencias obtenidas con SQL. Una acusación fallida descarta al sospechoso y exige {view.case.level === 0 ? 'más' : '10'} consultas válidas adicionales y una evidencia nueva.
      </p>
      <div className="paper paper--plain" style={{ padding: '12px 16px', maxWidth: 560 }}>
        <b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal' }}>Requisitos</b>
        {req.map((r, i) => (
          <div key={i} className="requirement">
            <span className={r.ok ? 'ok' : 'no'}><PixelIcon name={r.ok ? 'check' : 'cross'} size={16} /></span> {r.text}
          </div>
        ))}
        {!g.unlocked && g.reasons.length > 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>{g.reasons.join(' ')}</p>}
      </div>

      <div className="suspects-row" role="radiogroup" aria-label="Sospechosos">
        {suspects.map((s) => {
          const wasAccused = accused.has(s.id);
          return (
            <button key={s.id} role="radio" aria-checked={suspect === s.id} className={`suspect-card ${suspect === s.id ? 'selected' : ''}`} disabled={wasAccused || !g.unlocked} onClick={() => { setSuspect(s.id); sfx.click(); }}>
              <Portrait id={s.id} look={s.look} size={110} title={s.name} mood={wasAccused ? 'descartado' : undefined} />
              <b>{s.name}</b>
              <span style={{ fontSize: 12, color: '#9aa1a8' }}>{wasAccused ? 'DESCARTADO' : s.role}</span>
            </button>
          );
        })}
      </div>

      {g.unlocked && (
        <>
          <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal', color: 'var(--amber)' }}>Evidencias que presentas (mínimo {g.minSupportingEvidence})</h3>
          {view.evidence.length === 0 && <p className="empty">No tienes evidencias para presentar.</p>}
          <div className="ev-pick">
            {view.evidence.map((e) => {
              const on = ev.includes(e.id);
              return (
                <label key={e.id} className={on ? 'on' : ''}>
                  <input type="checkbox" checked={on} onChange={() => setEv(on ? ev.filter((x) => x !== e.id) : [...ev, e.id])} />
                  <span><b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal' }}>{e.key ? '★ ' : ''}{e.title}</b><br /><span className="muted" style={{ fontSize: 12.5 }}>{e.description}</span></span>
                </label>
              );
            })}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="just" style={{ color: 'var(--paper)' }}>Justificación (escrita por ti: no se puede pegar)</label>
            <textarea id="just" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Explica cómo las evidencias demuestran motivo, oportunidad y método…" />
            <small style={{ color: '#9aa1a8' }}>{text.trim().length} caracteres (mínimo 30)</small>
          </div>
          <button className="btn btn--red" disabled={!suspect || ev.length < g.minSupportingEvidence || text.trim().length < 30} onClick={() => setConfirming(true)}>
            Acusar formalmente
          </button>
        </>
      )}
      {!g.unlocked && (
        <p style={{ color: '#c9c1a3', marginTop: 10 }}>Sigue investigando en la <b>terminal</b>: cada consulta válida y cada evidencia te acercan a la acusación.</p>
      )}

      {confirming && suspect && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="paper credential" style={{ textAlign: 'center' }}>
            <Portrait id={suspect} look={view.characters.find((c) => c.id === suspect)?.look} size={120} />
            <h2 style={{ marginTop: 10 }}>¿Acusar a {view.characters.find((c) => c.id === suspect)?.name}?</h2>
            <p className="muted">Presentas {ev.length} evidencias. Si te equivocas, este sospechoso quedará descartado y necesitarás más investigación antes de volver a acusar.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => setConfirming(false)} disabled={busy}>Revisar otra vez</button>
              <button className="btn btn--red" onClick={submit} disabled={busy}>{busy ? 'Presentando…' : 'Sí, acusar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResolutionOverlay({ view, onClose }: { view: InvestigationView; onClose: () => void }) {
  const r = view.resolution!;
  const culprit = view.characters.find((c) => c.id === r.culpritId)!;
  const base = `/api/investigations/${view.id}/report`;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="res-title">
      <div className="paper resolution">
        <div className="clip" />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="muted" style={{ fontFamily: 'var(--font-title)', fontSize: 13 }}>{view.case.code} · INFORME FINAL</div>
          <span className="stamp stamp--big stamp-in">Caso cerrado</span>
        </div>
        <div className="resolution__culprit" style={{ marginTop: 10 }}>
          <Portrait id={culprit.id} look={culprit.look} size={170} title={culprit.name} />
          <div>
            <h1 id="res-title" style={{ fontSize: 30 }}>{r.culpritName}</h1>
            <div className="muted">{culprit.role}</div>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>MOTIVO</dt><dd>{r.motive}</dd>
              <dt>OPORTUNIDAD</dt><dd>{r.opportunity}</dd>
              <dt>MÉTODO</dt><dd>{r.method}</dd>
            </dl>
          </div>
        </div>
        <div className="typed" style={{ marginTop: 16 }}>
          {r.reveal.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>CÓDIGO</dt><dd style={{ fontFamily: 'var(--font-term)', fontSize: 20 }} data-allow-copy>{view.code}</dd>
          <dt>CONSULTAS</dt><dd>{view.stats.total} ejecutadas · {view.stats.valid} válidas · {view.stats.invalid} con error</dd>
          <dt>EVIDENCIAS</dt><dd>{view.evidence.length} de {view.case.evidenceTotal}</dd>
          <dt>ACUSACIONES FALLIDAS</dt><dd>{view.stats.failedAccusations}</dd>
          <dt>PISTAS</dt><dd>{view.stats.hintsUsed} niveles de ayuda</dd>
        </dl>
        <div className="row" style={{ marginTop: 18 }}>
          <a className="btn btn--red" href={`${base}?format=pdf`} download><PixelIcon name="download" /> Reporte PDF</a>
          <a className="btn" href={`${base}?format=json`} download>JSON firmado</a>
          <a className="btn" href={`${base}?format=csv`} download>CSV</a>
          <span style={{ flex: 1 }} />
          <button className="btn btn--ghost" style={{ color: 'var(--ink)', borderColor: 'var(--ink)' }} onClick={onClose}>Ver expediente</button>
          <Link className="btn btn--amber" href="/archivo">Siguiente caso →</Link>
        </div>
      </div>
    </div>
  );
}
