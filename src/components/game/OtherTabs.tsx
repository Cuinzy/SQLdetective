'use client';
import { useState } from 'react';
import type { InvestigationView, PublicCharacter } from '@/lib/types';
import { api, sfx } from '@/lib/client';
import { Portrait } from '../art/Portrait';
import { InterrogationScene, SceneVignette } from '../art/Scenes';
import { PixelIcon } from '../art/Icons';
import { LEVEL_NAMES } from '@/lib/progression';

type Toast = (t: string, k?: 'red' | 'ok' | 'amber') => void;

/* ───────────── Expediente ───────────── */
export function DossierTab({ view, onAbandon }: { view: InvestigationView; onAbandon: () => void }) {
  const c = view.case;
  const suspects = view.characters.filter((x) => x.suspect);
  const others = view.characters.filter((x) => !x.suspect);
  return (
    <article className="paper dossier">
      <div className="clip" />
      <div className="dossier__head">
        <div>
          <div className="row">
            <span className="tag tag--ink">{c.code}</span>
            <span className="tag tag--ink">{LEVEL_NAMES[c.level]}</span>
            {view.status === 'resuelto' && <span className="stamp" style={{ fontSize: 14 }}>Caso cerrado</span>}
          </div>
          <h1 className="dossier__title">{c.title}</h1>
          <div className="muted">{c.location} · {c.date}</div>
          <p style={{ marginTop: 10, fontStyle: 'italic' }}>{c.tagline}</p>
        </div>
        <SceneVignette scene={c.scene} />
      </div>
      <h2 style={{ marginTop: 18 }}>Informe preliminar</h2>
      {c.briefing.map((p, i) => <p key={i}>{p}</p>)}
      <div className="grid-2" style={{ marginTop: 10 }}>
        <div>
          <h2>Cronología conocida</h2>
          <ul className="timeline">
            {c.timeline.map((t, i) => (
              <li key={i}><b>{t.time}</b>{t.event}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Líneas de investigación</h2>
          {view.objectives.map((o) => (
            <div key={o.id} className="objective">
              <div className="objective__box">{o.done && <PixelIcon name="check" size={16} />}</div>
              <div>
                <b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal' }}>{o.title}</b>
                <div className="muted" style={{ fontSize: 14 }}>{o.description}</div>
                <div className="objective__bar" title={`${o.found} de ${o.need} evidencias necesarias`}>
                  <span style={{ width: `${Math.min(100, (o.found / o.need) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <h2 style={{ marginTop: 22 }}>Sospechosos</h2>
      <div className="lineup">
        {suspects.map((s) => (
          <div key={s.id} className="mugshot">
            <Portrait id={s.id} look={s.look} size={96} title={s.name} mood={s.accused === 'incorrecto' ? 'descartado' : undefined} />
            <b>{s.name}</b>
            <span className="muted">{s.role}</span>
          </div>
        ))}
      </div>
      {others.length > 0 && (
        <>
          <h2 style={{ marginTop: 18 }}>Otras personas involucradas</h2>
          <div className="lineup">
            {others.map((s) => (
              <div key={s.id} className="mugshot">
                <Portrait id={s.id} look={s.look} size={72} title={s.name} />
                <b>{s.name}</b>
                <span className="muted">{s.role}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <h2 style={{ marginTop: 18 }}>Conceptos SQL de este expediente</h2>
      <div className="row">{c.concepts.map((x) => <span key={x} className="tag tag--ink">{x}</span>)}</div>
      {view.status === 'en_proceso' && c.level > 0 && (
        <p className="muted" style={{ marginTop: 26, fontSize: 13.5 }}>
          ¿Necesitas cerrar el expediente sin resolverlo? <button className="link-btn" style={{ color: 'var(--stamp)' }} onClick={onAbandon}>Archivar como no resuelto</button>
        </p>
      )}
    </article>
  );
}

/* ───────────── Interrogatorios ───────────── */
export function InterrogationTab({ view, onView, toast }: { view: InvestigationView; onView: (v: InvestigationView) => void; toast: Toast }) {
  const [sel, setSel] = useState<string>(view.characters[0]?.id);
  const [busy, setBusy] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const ch: PublicCharacter | undefined = view.characters.find((c) => c.id === sel);
  async function ask(qid: string) {
    if (!ch || busy) return;
    setBusy(true);
    try {
      const r = await api<{ answer: string; contradiction: boolean; view: InvestigationView }>(`/api/investigations/${view.id}/ask`, { body: { characterId: ch.id, questionId: qid } });
      setLastAnswer(qid);
      onView(r.view);
      if (r.contradiction) sfx.evidence();
      else sfx.click();
    } catch (e) {
      toast((e as Error).message, 'red');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="interro">
      <div className="char-list" role="tablist" aria-label="Personas para interrogar">
        {view.characters.map((c) => {
          const hasNew = c.questions.some((q) => q.isNew && !q.asked);
          return (
            <button key={c.id} role="tab" aria-selected={sel === c.id} className={`char-btn ${sel === c.id ? 'active' : ''}`} onClick={() => { setSel(c.id); setLastAnswer(null); sfx.click(); }}>
              <Portrait id={c.id} look={c.look} size={48} title={c.name} mood={c.accused === 'incorrecto' ? 'descartado' : undefined} />
              <span>
                <b>{c.name}</b>
                <small>{c.role}</small>
              </span>
              {hasNew && <span className="new">NUEVA</span>}
            </button>
          );
        })}
      </div>
      {ch && (
        <div>
          <div className="room">
            <InterrogationScene />
            <div className="room__subject">
              <Portrait id={ch.id} look={ch.look} size={150} title={ch.name} />
              <div className="room__plate">{ch.name.toUpperCase()}{ch.age ? ` · ${ch.age} años` : ''}</div>
            </div>
          </div>
          <div className="paper dialogue">
            <div className="muted" style={{ fontSize: 13 }}>{ch.role} · {ch.suspect ? 'SOSPECHOSO' : 'TESTIGO'}</div>
            <p style={{ margin: '6px 0' }}>{ch.bio}</p>
            <div className="speech">«{ch.statement}»</div>
            <h3 style={{ marginTop: 14 }}>Preguntas</h3>
            <div className="question-list">
              {ch.questions.map((q) => (
                <div key={q.id}>
                  <button className={`question ${q.asked ? 'question--asked' : ''} ${q.isNew && !q.asked ? 'question--new' : ''}`} onClick={() => ask(q.id)} disabled={busy}>
                    <span>{q.asked ? '✓' : '?'}</span>
                    <span style={{ flex: 1 }}>{q.text}</span>
                    {q.isNew && !q.asked && <span className="marker">DESBLOQUEADA POR EVIDENCIA</span>}
                  </button>
                  {q.asked && q.answer && (
                    <div className={`speech ${q.contradiction ? 'speech--contra' : ''} ${lastAnswer === q.id ? 'typed' : ''}`}>
                      <p style={{ margin: 0 }}>«{q.answer}»</p>
                      {q.contradiction && <span className="stamp" style={{ fontSize: 11, marginTop: 6 }}>Contradicción</span>}
                    </div>
                  )}
                </div>
              ))}
              {ch.lockedQuestions > 0 && (
                <p className="muted" style={{ fontSize: 13.5 }}>
                  <PixelIcon name="lock" size={14} /> {ch.lockedQuestions} pregunta(s) más se desbloquearán cuando descubras evidencias relacionadas mediante SQL.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Tablero de evidencias y pistas ───────────── */
export function BoardTab({ view, onView, toast, freshIds }: { view: InvestigationView; onView: (v: InvestigationView) => void; toast: Toast; freshIds: string[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const evById = new Map(view.evidence.map((e) => [e.id, e]));
  async function hint(id: string) {
    setBusy(id);
    try {
      const r = await api<{ view: InvestigationView }>(`/api/investigations/${view.id}/hint`, { body: { hintId: id } });
      onView(r.view);
      sfx.click();
    } catch (e) {
      toast((e as Error).message, 'red');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}><PixelIcon name="board" /> Tablero de evidencias · {view.evidence.length}/{view.case.evidenceTotal}</h2>
      <div className="corkboard">
        <div className="board-columns">
          <div className="board-col">
            <h3>Evidencias confirmadas con SQL</h3>
            {view.evidence.length === 0 && <div className="note note--blank">Nada clavado todavía. Las evidencias aparecen aquí cuando tus consultas las revelan.</div>}
            {view.evidence.map((e) => (
              <div key={e.id} className={`note ${e.key ? 'note--key' : ''} ${freshIds.includes(e.id) ? 'note--new' : ''}`}>
                <b>{e.key ? '★ ' : ''}{e.title}</b>
                {e.description}
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{e.id} · consulta #{e.querySeq ?? '—'}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, view.case.evidenceTotal - view.evidence.length) }, (_, i) => (
              <div key={i} className="note note--blank">? evidencia sin descubrir</div>
            ))}
          </div>
          <div className="board-col">
            <h3>Líneas de investigación</h3>
            {view.objectives.map((o) => (
              <div key={o.id} className="note" style={o.done ? { boxShadow: '3px 4px 0 rgba(0,0,0,.35), inset 0 0 0 2px #4f6e39' } : undefined}>
                <b>{o.done ? '✓ ' : ''}{o.title}</b>
                {o.description}
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{o.found}/{o.need} evidencias · tablas: {o.tables.join(', ')}</div>
              </div>
            ))}
          </div>
          <div className="board-col">
            <h3>Diario de interrogatorios</h3>
            {view.notes.length === 0 && <div className="note note--blank">Las declaraciones relevantes se anotan aquí.</div>}
            {view.notes.map((n, i) => (
              <div key={i} className="note">
                <b>{n.character}</b>
                {n.text}
              </div>
            ))}
            {view.accusations.length > 0 && (
              <div className="note">
                <b>Acusaciones</b>
                {view.accusations.map((a, i) => (
                  <div key={i}>{a.correct ? '✓' : '✗'} {view.characters.find((c) => c.id === a.suspectId)?.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="section-title"><PixelIcon name="hint" /> Tablero de pistas</h2>
      <p style={{ color: '#c9c1a3', marginTop: -6 }}>Cada pista tiene tres niveles: narrativa, orientación sobre los datos y orientación SQL. Las ayudas quedan registradas para tu docente.</p>
      <div className="hints-grid">
        {view.hints.map((h) => {
          const ev = h.evidence ? evById.get(h.evidence) : undefined;
          return (
            <div key={h.id} className="hint-card">
              <h4>
                <span>{h.title}</span>
                {h.confirmed ? <span className="stamp stamp--ok" style={{ fontSize: 10 }}>Confirmada</span> : <span className="tag tag--ink">{h.levelsUsed}/3</span>}
              </h4>
              {h.texts.map((t, i) => (
                <div key={i} className="hint-level">
                  <i>{['NIVEL 1 · NARRATIVA', 'NIVEL 2 · DATOS', 'NIVEL 3 · SQL'][i]}</i>
                  {t}
                </div>
              ))}
              {ev && <div className="muted" style={{ fontSize: 12.5 }}>Confirmada por la consulta #{ev.querySeq}</div>}
              {h.levelsUsed < 3 && view.status === 'en_proceso' && (
                <button className="btn btn--small" disabled={busy === h.id} onClick={() => hint(h.id)}>
                  {h.levelsUsed === 0 ? 'Revelar pista' : `Más ayuda (nivel ${h.levelsUsed + 1})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {view.hintsLocked > 0 && <p style={{ color: '#9aa1a8', fontSize: 14 }}><PixelIcon name="lock" size={14} /> {view.hintsLocked} pista(s) aparecerán cuando avances en la investigación.</p>}
    </div>
  );
}
