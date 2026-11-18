'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { OfficeScene } from '@/components/art/Scenes';
import { PixelIcon } from '@/components/art/Icons';
import { Portrait } from '@/components/art/Portrait';
import { GameShell, useToast } from '@/components/Shell';
import { api, ApiError, sfx } from '@/lib/client';
import { ACHIEVEMENTS, RANKS, LEVEL_NAMES } from '@/lib/progression';
import type { PlayerOverview } from '@/lib/types';

function OfficeInner() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<PlayerOverview | null>(null);
  const [error, setError] = useState('');
  const achRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PlayerOverview>('/api/player/me')
      .then(setData)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/');
        else setError((e as Error).message);
      });
  }, [router]);

  async function startTutorial() {
    try {
      sfx.click();
      const r = await api<{ id: string }>('/api/investigations', { body: { caseId: 0 } });
      router.push(`/investigacion/${r.id}`);
    } catch (e) {
      toast((e as Error).message, 'red');
    }
  }
  async function logout() {
    await api('/api/player/logout', { body: {} }).catch(() => {});
    router.push('/');
  }

  if (error) return <div className="page"><div className="form-error">{error}</div></div>;
  if (!data) return <div className="page empty">Abriendo la oficina…</div>;

  const caseById = new Map(data.cases.map((c) => [c.id, c]));
  const active = data.investigations.filter((i) => i.status === 'en_proceso');
  const closed = data.investigations.filter((i) => i.status !== 'en_proceso');
  const tutorialDone = data.investigations.some((i) => i.caseId === 0 && i.solved);
  const have = new Set(data.achievements.map((a) => a.id));
  const spots: { key: string; label: string; style: React.CSSProperties; action: () => void }[] = [
    { key: 'archivo', label: 'Archivo de casos', style: { left: '4%', top: '29%', width: '17%', height: '56%' }, action: () => router.push('/archivo') },
    { key: 'terminal', label: tutorialDone ? 'Repasar entrenamiento' : 'Entrenamiento de cadetes', style: { left: '45%', top: '46%', width: '20%', height: '25%' }, action: startTutorial },
    { key: 'tablero', label: 'Logros y rango', style: { left: '72%', top: '10%', width: '24%', height: '33%' }, action: () => achRef.current?.scrollIntoView({ behavior: 'smooth' }) },
    { key: 'puerta', label: 'Salir de la agencia', style: { left: '0%', top: '12%', width: '4%', height: '72%' }, action: logout },
  ];

  return (
    <>
      <div style={{ background: '#0a0d11', borderBottom: '3px solid #000' }}>
        <div className="office office--labels" style={{ width: 'min(100%, calc(64vh * 16 / 9))', aspectRatio: '16 / 9', height: 'auto', margin: '0 auto', minHeight: 0 }}>
          <OfficeScene />
          <div className="rain rain--slow" style={{ clipPath: 'inset(8% 37% 57% 37%)' }} />
          {spots.map((s) => (
            <button key={s.key} className="hotspot" style={s.style} onClick={s.action} aria-label={s.label}>
              <span className="hotspot__label">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="page">
        <h1 className="page-title">Oficina de {data.player.fullName.split(' ')[0]}</h1>
        <p className="page-sub">Haz clic en los objetos de la oficina: el archivador guarda los expedientes y la terminal, tu entrenamiento.</p>
        {!tutorialDone && (
          <div className="paper paper--plain mb" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <PixelIcon name="terminal" size={40} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ margin: 0 }}>Antes del primer expediente: entrenamiento de cadetes</h3>
              <p className="muted" style={{ margin: '4px 0 0' }}>Diez minutos para aprender qué es una tabla, cómo funciona SELECT, cómo filtrar con WHERE y cómo leer resultados… resolviendo un misterio pequeño.</p>
            </div>
            <button className="btn btn--red" onClick={startTutorial}>Comenzar entrenamiento</button>
          </div>
        )}
        <div className="grid-2">
          <div>
            <div className="section-title"><PixelIcon name="folder" /> Investigaciones en curso</div>
            {active.length === 0 && <p className="empty">No tienes investigaciones abiertas. Ve al archivador y elige un expediente.</p>}
            {active.map((i) => {
              const c = caseById.get(i.caseId);
              return (
                <div key={i.id} className="paper paper--plain mb" style={{ padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="row"><span className="tag tag--ink">{c?.code}</span><span className="tag tag--ink">{LEVEL_NAMES[c?.level ?? 0]}</span></div>
                    <h3 style={{ margin: '6px 0 2px', fontSize: 20 }}>{c?.title}</h3>
                    <div className="muted" style={{ fontSize: 13.5 }}>Código de verificación: <b style={{ fontFamily: 'var(--font-term)', fontSize: 18 }} data-allow-copy>{i.code}</b> · {i.validQueries} consultas válidas</div>
                  </div>
                  <Link className="btn btn--amber" href={`/investigacion/${i.id}`}>Continuar →</Link>
                </div>
              );
            })}
            <div className="section-title"><PixelIcon name="stamp" /> Archivo personal</div>
            {closed.length === 0 && <p className="empty">Aún no has cerrado ningún caso.</p>}
            {closed.length > 0 && (
              <div className="panel">
                {closed.map((i) => {
                  const c = caseById.get(i.caseId);
                  return (
                    <div key={i.id} className="history-item" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`tag ${i.solved ? 'tag--ok' : 'tag--red'}`}>{i.solved ? 'RESUELTO' : 'NO RESUELTO'}</span>
                      <b style={{ fontFamily: 'var(--font-title)', fontWeight: 'normal', flex: 1 }}>{c?.code} · {c?.title}</b>
                      <span style={{ fontFamily: 'var(--font-term)', fontSize: 17, color: '#c9c1a3' }} data-allow-copy>{i.code}</span>
                      <Link className="btn btn--small btn--ghost" href={`/investigacion/${i.id}`}>Ver</Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div ref={achRef}>
            <div className="section-title"><PixelIcon name="badge" /> Credencial</div>
            <div className="paper rank-plate">
              <Portrait id={data.player.id} size={86} title="Tu retrato" />
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-title)' }}>RANGO ACTUAL</div>
                <div className="rank-plate__title">{RANKS[data.rank].title}</div>
                <div className="muted" style={{ fontSize: 13 }}>Placa {data.player.badge} · {data.player.group}</div>
                <div className="rank-ladder" aria-label={`Rango ${data.rank + 1} de ${RANKS.length}`}>
                  {RANKS.map((r, i) => <span key={r.id} className={i <= data.rank ? 'on' : ''} title={r.title} />)}
                </div>
                {data.rank < RANKS.length - 1 && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>Siguiente: <b>{RANKS[data.rank + 1].title}</b> — {RANKS[data.rank + 1].requirement}</div>}
              </div>
            </div>
            <div className="section-title"><PixelIcon name="star" /> Logros ({have.size}/{ACHIEVEMENTS.length})</div>
            <div className="achievements">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.id} className={`achievement ${have.has(a.id) ? 'achievement--on' : ''}`} title={a.description}>
                  <PixelIcon name={a.glyph} size={26} />
                  <div><b>{a.title}</b>{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function OfficePage() {
  return (
    <GameShell hud={<Link href="/archivo" className="btn btn--small btn--ghost">Archivo de casos</Link>}>
      <OfficeInner />
    </GameShell>
  );
}
