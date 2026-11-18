'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Logo } from '@/components/art/Icons';
import { api, ApiError } from '@/lib/client';

interface Row {
  id: string; code: string; student: string; group: string; studentCode: string | null; caseId: number; caseCode: string; caseTitle: string;
  status: string; solved: boolean; selectedSuspect: string | null; totalQueries: number; validQueries: number; invalidQueries: number;
  failedAccusations: number; hintsUsed: number; pasteAttempts: number; evidenceFound: number; evidenceTotal: number; startedAt: string; finishedAt: string | null; elapsed: string;
}
interface Stats {
  students: number; investigations: number; solved: number; pending: number; abandoned: number; resolutionRate: number; avgQueries: number; avgFailedAccusations: number;
  perCase: { caseId: number; code: string; title: string; investigations: number; solved: number; avgQueries: number }[];
  topErrors: { message: string; count: number }[];
  topHints: { case: string; hint: string; count: number }[];
  topConstructs: { feature: string; count: number }[];
  progress: { student: string; group: string; investigations: number; solved: number; validQueries: number }[];
}

const STATUS: Record<string, string> = { en_proceso: 'En proceso', resuelto: 'Resuelto', no_resuelto: 'No resuelto' };

function Login({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="center-page">
      <form
        className="admin-card"
        style={{ width: 'min(420px, 94vw)' }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          try {
            await api('/api/admin/login', { body: { username: u, password: p } });
            onDone();
          } catch (ex) {
            setErr((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Logo compact />
        <h2 style={{ marginTop: 14 }}>Archivo Central · Acceso docente</h2>
        {err && <div className="form-error">{err}</div>}
        <div className="field"><label htmlFor="u">Usuario</label><input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></div>
        <div className="field"><label htmlFor="p">Contraseña</label><input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></div>
        <button className="btn btn--red" disabled={busy}>{busy ? 'Verificando…' : 'Ingresar'}</button>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Las cuentas docentes se crean desde el servidor con <code>npm run admin:create</code> (ver README).</p>
        <Link href="/" style={{ color: 'var(--ink-soft)', fontSize: 14 }}>← Volver al juego</Link>
      </form>
    </main>
  );
}

function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ name: '', group: '', code: '', case: '', from: '', to: '', status: '' });
  const [verify, setVerify] = useState<null | { firmaValida: boolean; registrado: boolean; codigo: string | null; coincideConBaseDeDatos: boolean | null; diferencias: string[] }>(null);
  const [verr, setVerr] = useState('');
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([api<Stats>('/api/admin/stats'), api<{ rows: Row[] }>(`/api/admin/investigations?${qs}`)]);
    setStats(s);
    setRows(r.rows);
  }, [qs]);
  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File) {
    setVerr('');
    setVerify(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setVerify(await api('/api/admin/verify-report', { body: json }));
    } catch (e) {
      setVerr(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : (e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
        <div className="row"><Logo compact /><h1 className="page-title" style={{ fontSize: 24, margin: 0 }}>Archivo Central · Supervisión docente</h1></div>
        <div className="row"><span style={{ color: '#c9c1a3' }}>{user}</span><button className="btn btn--small" onClick={onLogout}>Cerrar sesión</button></div>
      </div>

      <section className="admin-card mb">
        <h2>Verificar código de investigación</h2>
        <form className="code-search" onSubmit={(e) => { e.preventDefault(); if (code.trim()) router.push(`/admin/investigacion/${encodeURIComponent(code.trim().toUpperCase())}`); }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SQLD-XXXX-XXXX-XXXX" aria-label="Código de verificación" />
          <button className="btn btn--red">Consultar registro</button>
        </form>
      </section>

      {stats && (
        <>
          <div className="stats mb">
            {[
              ['Estudiantes registrados', stats.students], ['Investigaciones (casos)', stats.investigations], ['Casos resueltos', stats.solved], ['En proceso', stats.pending],
              ['No resueltos', stats.abandoned], ['% de resolución', `${stats.resolutionRate}%`], ['Consultas promedio por caso', stats.avgQueries], ['Acusaciones fallidas promedio', stats.avgFailedAccusations],
            ].map(([l, v]) => (
              <div key={l as string} className="stat"><b>{v}</b><span>{l}</span></div>
            ))}
          </div>
          <div className="grid-2 mb">
            <section className="admin-card">
              <h2>Por caso</h2>
              <div className="table-wrap" style={{ maxHeight: 340 }}>
                <table className="dtable">
                  <thead><tr><th>Caso</th><th>Investigaciones</th><th>Resueltas</th><th>Consultas prom.</th></tr></thead>
                  <tbody>
                    {stats.perCase.map((c) => (
                      <tr key={c.caseId}><td>{c.code} · {c.title}</td><td>{c.investigations}</td><td>{c.solved}</td><td>{c.avgQueries}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="admin-card">
              <h2>Construcciones SQL más utilizadas</h2>
              {stats.topConstructs.slice(0, 12).map((c) => {
                const max = stats.topConstructs[0]?.count || 1;
                return (
                  <div key={c.feature} style={{ marginBottom: 6 }}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 13.5 }}><span>{c.feature}</span><span>{c.count}</span></div>
                    <div className="bar"><span style={{ width: `${(c.count / max) * 100}%` }} /></div>
                  </div>
                );
              })}
              {!stats.topConstructs.length && <p className="muted">Sin datos todavía.</p>}
            </section>
          </div>
          <div className="grid-2 mb">
            <section className="admin-card">
              <h2>Errores SQL frecuentes</h2>
              <table className="dtable"><tbody>{stats.topErrors.map((e, i) => <tr key={i}><td>{e.message}</td><td style={{ textAlign: 'right' }}>{e.count}</td></tr>)}</tbody></table>
              {!stats.topErrors.length && <p className="muted">Sin errores registrados.</p>}
            </section>
            <section className="admin-card">
              <h2>Pistas más solicitadas</h2>
              <table className="dtable"><tbody>{stats.topHints.map((h, i) => <tr key={i}><td>{h.case}</td><td>{h.hint}</td><td style={{ textAlign: 'right' }}>{h.count}</td></tr>)}</tbody></table>
              {!stats.topHints.length && <p className="muted">Sin pistas solicitadas.</p>}
            </section>
          </div>
          <section className="admin-card mb">
            <h2>Nivel de avance por estudiante</h2>
            <div className="table-wrap" style={{ maxHeight: 320 }}>
              <table className="dtable">
                <thead><tr><th>Estudiante</th><th>Grupo</th><th>Investigaciones</th><th>Resueltas</th><th>Consultas válidas</th><th>Avance (15 casos)</th></tr></thead>
                <tbody>
                  {stats.progress.map((p, i) => (
                    <tr key={i}><td>{p.student}</td><td>{p.group}</td><td>{p.investigations}</td><td>{p.solved}</td><td>{p.validQueries}</td><td style={{ minWidth: 120 }}><div className="bar"><span style={{ width: `${Math.min(100, (p.solved / 15) * 100)}%` }} /></div></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="admin-card mb">
        <h2>Investigaciones</h2>
        <div className="filters mb">
          {(['name', 'group', 'code'] as const).map((k) => (
            <div key={k} className="field"><label>{{ name: 'Nombre', group: 'Grupo', code: 'Código' }[k]}</label><input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
          ))}
          <div className="field"><label>Caso</label>
            <select value={f.case} onChange={(e) => setF({ ...f, case: e.target.value })}>
              <option value="">Todos</option>
              {Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Entrenamiento' : `EXP-${String(i).padStart(2, '0')}`}</option>)}
            </select>
          </div>
          <div className="field"><label>Desde</label><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
          <div className="field"><label>Estado</label>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="">Todos</option><option value="en_proceso">En proceso</option><option value="resuelto">Resuelto</option><option value="no_resuelto">No resuelto</option>
            </select>
          </div>
          <a className="btn btn--amber" href={`/api/admin/investigations?${qs}${qs ? '&' : ''}format=csv`} download>Exportar CSV</a>
        </div>
        <div className="table-wrap" style={{ maxHeight: 520 }}>
          <table className="dtable">
            <thead>
              <tr><th>Código</th><th>Estudiante</th><th>Grupo</th><th>Caso</th><th>Estado</th><th>¿Culpable?</th><th>Consultas</th><th>Válidas</th><th>Inválidas</th><th>Acus. fallidas</th><th>Pistas</th><th>Evid.</th><th>Tiempo</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/investigacion/${r.code}`)}>
                  <td className="mono">{r.code}</td><td>{r.student}</td><td>{r.group}</td><td>{r.caseCode}</td><td>{STATUS[r.status]}</td>
                  <td>{r.solved ? 'Sí' : r.selectedSuspect ? 'No' : '—'}</td><td>{r.totalQueries}</td><td>{r.validQueries}</td><td>{r.invalidQueries}</td><td>{r.failedAccusations}</td><td>{r.hintsUsed}</td><td>{r.evidenceFound}/{r.evidenceTotal}</td><td>{r.elapsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="muted" style={{ padding: 12 }}>No hay investigaciones con esos filtros.</p>}
        </div>
      </section>

      <section className="admin-card">
        <h2>Verificar un reporte JSON entregado por un estudiante</h2>
        <p style={{ fontSize: 14 }}>Se comprueba la firma HMAC del servidor, que el reporte esté registrado y que sus cifras coincidan con la base de datos.</p>
        <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {verr && <div className="form-error mt">{verr}</div>}
        {verify && (
          <div className={`mt ${verify.firmaValida && verify.registrado ? 'form-ok' : 'form-error'}`}>
            <b>{verify.firmaValida && verify.registrado ? 'Reporte auténtico' : 'Reporte NO válido'}</b> · firma {verify.firmaValida ? 'válida' : 'inválida'} · registro {verify.registrado ? 'encontrado' : 'no encontrado'}
            {verify.codigo && <> · código <Link href={`/admin/investigacion/${verify.codigo}`}>{verify.codigo}</Link></>}
            {verify.coincideConBaseDeDatos !== null && <> · cifras {verify.coincideConBaseDeDatos ? 'coinciden' : 'difieren'} con la base</>}
            {verify.diferencias.length > 0 && <ul>{verify.diferencias.map((d, i) => <li key={i}>{d}</li>)}</ul>}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const check = useCallback(() => {
    api<{ username: string }>('/api/admin/me')
      .then((r) => setUser(r.username))
      .catch((e) => setUser(e instanceof ApiError && e.status === 401 ? null : null));
  }, []);
  useEffect(check, [check]);
  return (
    <div className="admin">
      {user === undefined && <div className="page empty">Cargando…</div>}
      {user === null && <Login onDone={check} />}
      {user && <Dashboard user={user} onLogout={async () => { await api('/api/admin/logout', { body: {} }); setUser(null); }} />}
    </div>
  );
}
