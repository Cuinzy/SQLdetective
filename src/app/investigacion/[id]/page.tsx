'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameShell, usePasteSink, useToast } from '@/components/Shell';
import { PixelIcon } from '@/components/art/Icons';
import { Portrait } from '@/components/art/Portrait';
import { TerminalTab } from '@/components/game/TerminalTab';
import { BoardTab, DossierTab, InterrogationTab } from '@/components/game/OtherTabs';
import { AccuseTab, ResolutionOverlay, type AccuseResult } from '@/components/game/AccuseTab';
import { api, ApiError, fmtDuration, sfx } from '@/lib/client';
import type { InvestigationView, PublicEvidence, QueryResponse } from '@/lib/types';

type Tab = 'expediente' | 'terminal' | 'interrogatorios' | 'tablero' | 'acusacion';

function Investigation({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { setSink } = usePasteSink();
  const [view, setView] = useState<InvestigationView | null>(null);
  const [tab, setTab] = useState<Tab>('expediente');
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<PublicEvidence[]>([]);
  const [fresh, setFresh] = useState<string[]>([]);
  const [showResolution, setShowResolution] = useState(false);
  const [verdict, setVerdict] = useState<{ correct: boolean; name: string; text: string | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  const pasteCount = useRef(0);
  const offset = useRef(0);

  useEffect(() => {
    api<InvestigationView>(`/api/investigations/${id}`)
      .then((v) => {
        offset.current = Date.parse(v.serverNow) - Date.now();
        setView(v);
        if (v.case.level === 0 && v.stats.total === 0) setTab('terminal');
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/');
        else setError((e as Error).message);
      });
  }, [id, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Registro de intentos de pegado (se envían agrupados al servidor).
  useEffect(() => {
    setSink(() => {
      pasteCount.current++;
    });
    const flush = setInterval(() => {
      if (pasteCount.current > 0) {
        const n = pasteCount.current;
        pasteCount.current = 0;
        void api(`/api/investigations/${id}/paste`, { body: { count: n } }).catch(() => {});
      }
    }, 5000);
    return () => {
      setSink(null);
      clearInterval(flush);
    };
  }, [id, setSink]);

  const onResponse = useCallback(
    (r: QueryResponse) => {
      setView(r.view);
      if (r.newEvidence.length) {
        sfx.evidence();
        setPopup(r.newEvidence);
        setFresh((f) => [...f, ...r.newEvidence.map((e) => e.id)]);
        setTimeout(() => setPopup([]), 6500);
      }
      for (const a of r.newAchievements) toast(`Logro desbloqueado: ${a.title}`, 'ok');
    },
    [toast],
  );

  function onAccuse(r: AccuseResult, name: string) {
    setView(r.view);
    for (const a of r.newAchievements) toast(`Logro desbloqueado: ${a.title}`, 'ok');
    if (r.correct) {
      sfx.stamp();
      setTimeout(() => sfx.solved(), 350);
      setShowResolution(true);
    } else {
      sfx.denied();
      setVerdict({ correct: false, name, text: r.elimination });
    }
  }

  async function abandon() {
    if (!view || !confirm('¿Archivar el expediente como NO RESUELTO? No podrás seguir investigando en esta investigación.')) return;
    try {
      await api(`/api/investigations/${view.id}/abandon`, { body: {} });
      router.push('/oficina');
    } catch (e) {
      toast((e as Error).message, 'red');
    }
  }

  if (error) return <div className="page"><div className="form-error">{error}</div></div>;
  if (!view) return <div className="page empty">Sacando el expediente del archivador…</div>;

  const end = view.finishedAt ? Date.parse(view.finishedAt) : now + offset.current;
  const elapsed = end - Date.parse(view.startedAt);
  const newQuestions = view.characters.some((c) => c.questions.some((q) => q.isNew && !q.asked));
  const tabs: { id: Tab; label: string; icon: string; dot?: boolean }[] = [
    { id: 'expediente', label: 'Expediente', icon: 'folder' },
    { id: 'terminal', label: 'Terminal', icon: 'terminal' },
    { id: 'interrogatorios', label: 'Interrogar', icon: 'chat', dot: newQuestions },
    { id: 'tablero', label: 'Tablero', icon: 'board', dot: fresh.length > 0 },
    { id: 'acusacion', label: 'Acusación', icon: 'gavel', dot: view.gate.unlocked && view.status === 'en_proceso' },
  ];

  return (
    <>
      <div className="hud" style={{ top: 50, zIndex: 25, background: '#10151bf2', padding: '6px 16px' }}>
        <span className="hud__item" title="Expediente"><b>{view.case.code}</b> {view.case.title}</span>
        <span className="hud__code" title="Código único de verificación" data-allow-copy>{view.code}</span>
        <span className="hud__spacer" />
        <span className={`hud__item ${view.stats.valid >= view.gate.requiredQueries ? 'hud__item--ok' : ''}`} title="Consultas válidas y distintas / requeridas para acusar">
          <PixelIcon name="terminal" size={16} /> <b>{view.stats.valid}</b>/{view.gate.requiredQueries}
        </span>
        <span className="hud__item" title="Evidencias descubiertas"><PixelIcon name="star" size={16} /> <b>{view.evidence.length}</b>/{view.case.evidenceTotal}</span>
        <span className="hud__item" title="Acusaciones fallidas"><PixelIcon name="cross" size={16} /> <b>{view.stats.failedAccusations}</b></span>
        <span className="hud__item" title="Tiempo de investigación"><PixelIcon name="clock" size={16} /> {fmtDuration(elapsed)}</span>
        <details style={{ position: 'relative' }}>
          <summary className="btn btn--small btn--ghost" style={{ listStyle: 'none' }}>Exportar</summary>
          <div style={{ position: 'absolute', right: 0, top: '110%', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--night-2)', padding: 8, border: '2px solid #000', zIndex: 40, minWidth: 170 }}>
            <a className="btn btn--small" href={`/api/investigations/${view.id}/report?format=pdf`} download>Reporte PDF</a>
            <a className="btn btn--small" href={`/api/investigations/${view.id}/report?format=json`} download>JSON firmado</a>
            <a className="btn btn--small" href={`/api/investigations/${view.id}/report?format=csv`} download>CSV de consultas</a>
          </div>
        </details>
      </div>
      <div className="inv">
        <nav className="rail" aria-label="Secciones de la investigación">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); sfx.click(); if (t.id === 'tablero') setFresh([]); }} aria-current={tab === t.id}>
              <PixelIcon name={t.icon} size={26} />
              {t.label}
              {t.dot && <span className="dot" />}
            </button>
          ))}
        </nav>
        <main className="inv-main">
          {view.status !== 'en_proceso' && view.resolution && (
            <div className="paper paper--plain mb" style={{ padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="stamp">Caso cerrado</span>
              <span style={{ flex: 1 }}>Resolviste el caso: el culpable era <b>{view.resolution.culpritName}</b>.</span>
              <button className="btn btn--small" onClick={() => setShowResolution(true)}>Ver resolución</button>
            </div>
          )}
          {view.status === 'no_resuelto' && (
            <div className="form-error">Este expediente fue archivado como no resuelto. Puedes revisarlo y exportar tu reporte, pero no seguir investigando.</div>
          )}
          {tab === 'expediente' && <DossierTab view={view} onAbandon={abandon} />}
          {tab === 'terminal' && <TerminalTab view={view} onResponse={onResponse} onBlocked={() => {}} toast={toast} />}
          {tab === 'interrogatorios' && <InterrogationTab view={view} onView={setView} toast={toast} />}
          {tab === 'tablero' && <BoardTab view={view} onView={setView} toast={toast} freshIds={fresh} />}
          {tab === 'acusacion' && <AccuseTab view={view} onResult={onAccuse} toast={toast} />}
        </main>
      </div>

      {popup.length > 0 && (
        <div className="paper evidence-pop" role="status">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal', color: 'var(--stamp)' }}>★ NUEVA EVIDENCIA</b>
            <button className="link-btn" style={{ color: 'var(--ink-soft)' }} onClick={() => setPopup([])}>cerrar</button>
          </div>
          {popup.map((e) => (
            <div key={e.id} style={{ marginTop: 8 }}>
              <b>{e.title}</b>
              <div className="muted" style={{ fontSize: 14 }}>{e.description}</div>
            </div>
          ))}
          <button className="btn btn--small mt" onClick={() => { setTab('tablero'); setPopup([]); }}>Ver en el tablero</button>
        </div>
      )}

      {verdict && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="paper credential" style={{ textAlign: 'center' }}>
            <span className="stamp stamp--big stamp-in">Rechazada</span>
            <h2 style={{ marginTop: 18 }}>La fiscalía descarta a {verdict.name}</h2>
            {verdict.text && <p>{verdict.text}</p>}
            <p className="muted">Para volver a acusar necesitas {view.gate.requiredQueries} consultas válidas en total (llevas {view.stats.valid}){view.gate.needsNewEvidence ? ' y al menos una evidencia nueva' : ''}.</p>
            <button className="btn btn--amber" onClick={() => { setVerdict(null); setTab('terminal'); }}>Volver a la terminal</button>
          </div>
        </div>
      )}
      {showResolution && view.resolution && <ResolutionOverlay view={view} onClose={() => setShowResolution(false)} />}
      {view.status === 'en_proceso' && view.stats.total === 0 && view.case.level > 0 && tab === 'expediente' && (
        <div className="paper evidence-pop" style={{ animationDelay: '600ms' }}>
          <div className="row">
            <Portrait id="galvan" look={{ skin: 2, hair: 'coleta', hairColor: 6, accessory: 'gafas', outfitStyle: 'traje', outfit: 1, age: 'mayor' }} size={56} />
            <div style={{ flex: 1 }}>
              <b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal' }}>Inspectora Galván</b>
              <div style={{ fontSize: 14 }}>Lee el informe, revisa el esquema en la terminal y empieza por lo básico: ¿qué tablas hay y qué guardan?</div>
            </div>
          </div>
          <button className="btn btn--small mt" onClick={() => setTab('terminal')}>Ir a la terminal →</button>
        </div>
      )}
    </>
  );
}

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <GameShell>
      <Investigation id={id} />
    </GameShell>
  );
}
