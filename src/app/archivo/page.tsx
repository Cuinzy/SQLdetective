'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SceneVignette } from '@/components/art/Scenes';
import { PixelIcon } from '@/components/art/Icons';
import { GameShell, useToast } from '@/components/Shell';
import { api, ApiError, sfx } from '@/lib/client';
import { LEVEL_NAMES } from '@/lib/progression';
import type { CaseSummary, PlayerOverview } from '@/lib/types';

function ArchiveInner() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<PlayerOverview | null>(null);
  const [confirm, setConfirm] = useState<CaseSummary | null>(null);
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<PlayerOverview>('/api/player/me')
      .then((d) => {
        setData(d);
        setGroup(d.player.group);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/');
      });
  }, [router]);

  if (!data) return <div className="page empty">Abriendo el archivador…</div>;
  const solvedIds = new Set(data.investigations.filter((i) => i.solved).map((i) => i.caseId));
  const activeIds = new Map(data.investigations.filter((i) => i.status === 'en_proceso').map((i) => [i.caseId, i.id]));
  const solvedLevel = (lvl: number) => data.cases.filter((c) => c.level === lvl && solvedIds.has(c.id)).length;
  const recommended = (lvl: number) => lvl <= 1 || (lvl === 2 && solvedLevel(1) >= 1) || (lvl === 3 && solvedLevel(2) >= 1);

  async function open(c: CaseSummary) {
    const existing = activeIds.get(c.id);
    if (existing) return router.push(`/investigacion/${existing}`);
    setConfirm(c);
  }
  async function start() {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await api<{ id: string }>('/api/investigations', { body: { caseId: confirm.id, group } });
      sfx.stamp();
      router.push(`/investigacion/${r.id}`);
    } catch (e) {
      toast((e as Error).message, 'red');
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Archivo de casos</h1>
      <p className="page-sub">Quince expedientes sin resolver. Cada uno tiene su propia base de datos, sus sospechosos y un culpable que solo los datos pueden señalar.</p>
      {[1, 2, 3].map((lvl) => (
        <section key={lvl} className="drawer" aria-label={LEVEL_NAMES[lvl]}>
          <div className="drawer__label">{LEVEL_NAMES[lvl]}</div>
          {!recommended(lvl) && (
            <p style={{ color: '#d6cfb8', fontSize: 14, margin: '6px 0 0' }}>
              <PixelIcon name="lock" size={14} /> Recomendado después de resolver un caso del nivel anterior. Puedes abrirlo igual si tu docente te lo asignó.
            </p>
          )}
          <div className="folders">
            {data.cases.filter((c) => c.level === lvl).map((c) => {
              const solved = solvedIds.has(c.id);
              const activeInv = activeIds.has(c.id);
              return (
                <button key={c.id} className={`folder ${solved ? 'folder--solved' : ''} ${!recommended(lvl) ? 'folder--locked' : ''}`} data-code={c.code} onClick={() => open(c)} onMouseEnter={() => sfx.key()}>
                  {solved && <span className="stamp folder__stamp">Resuelto</span>}
                  {!solved && activeInv && <span className="stamp stamp--ok folder__stamp">En curso</span>}
                  <SceneVignette scene={c.scene} />
                  <h3>{c.title}</h3>
                  <p>{c.tagline}</p>
                  <div className="folder__meta">
                    <span className="tag tag--ink">{c.tables} tablas</span>
                    <span className="tag tag--ink">{c.suspects} sospechosos</span>
                    <span className="tag tag--ink">{c.rows.toLocaleString('es')} registros</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {confirm && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="paper credential" style={{ maxWidth: 560 }}>
            <div className="clip" />
            <div className="credential__agency">ASIGNACIÓN DE EXPEDIENTE · {confirm.code}</div>
            <h1 id="confirm-title" style={{ fontSize: 26, margin: '8px 0' }}>{confirm.title}</h1>
            <p className="muted">{confirm.location} · {confirm.date}</p>
            <p>Al abrir el expediente se generará un <b>código único de verificación</b> asociado a tu nombre. Tu docente lo usará para revisar tu investigación.</p>
            <dl className="kv mb">
              <dt>DETECTIVE</dt><dd>{data.player.fullName}</dd>
              <dt>CÓDIGO</dt><dd>{data.player.studentCode ?? '—'}</dd>
            </dl>
            <div className="field">
              <label htmlFor="grp">Grupo o curso para este caso</label>
              <input id="grp" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={60} />
            </div>
            <p className="muted" style={{ fontSize: 13.5 }}>Reglas de la fiscalía: necesitas al menos 20 consultas válidas y distintas, evidencias fundamentales y líneas de investigación completas antes de acusar. Cada acusación fallida exige 10 consultas válidas más y una evidencia nueva.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" style={{ color: 'var(--ink)', borderColor: 'var(--ink)' }} onClick={() => setConfirm(null)}>Cancelar</button>
              <button className="btn btn--red" disabled={busy || !group.trim()} onClick={start}>{busy ? 'Abriendo…' : 'Abrir expediente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <GameShell hud={<Link href="/oficina" className="btn btn--small btn--ghost">Oficina</Link>}>
      <ArchiveInner />
    </GameShell>
  );
}
