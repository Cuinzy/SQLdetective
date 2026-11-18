'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CityScene } from '@/components/art/Scenes';
import { GameShell } from '@/components/Shell';
import { Logo } from '@/components/art/Icons';
import { api, sfx } from '@/lib/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ badge: string; recoveryKey: string } | null>(null);
  const [ack, setAck] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<{ badge: string; recoveryKey: string }>('/api/player/register', { body: { fullName, group, studentCode } });
      sfx.stamp();
      setDone(r);
    } catch (err) {
      setError((err as Error).message);
      sfx.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell plain>
      <main className="center-page">
        <CityScene />
        <div className="rain rain--slow" />
        {!done ? (
          <form className="paper credential" onSubmit={submit} style={{ zIndex: 2 }}>
            <div className="clip" />
            <div className="credential__head">
              <div>
                <div className="credential__agency">AGENCIA ÍNDICE · SOLICITUD DE CREDENCIAL</div>
                <h1 style={{ fontSize: 28, marginTop: 6 }}>Nuevo detective</h1>
              </div>
              <Logo compact />
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="n">Nombre completo</label>
              <input id="n" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="g">Grupo o curso</label>
              <input id="g" value={group} onChange={(e) => setGroup(e.target.value)} required maxLength={60} placeholder="Ej.: Bases de Datos — Grupo 2" />
            </div>
            <div className="field">
              <label htmlFor="c">Código estudiantil (opcional)</label>
              <input id="c" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} maxLength={40} />
            </div>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Tus consultas, pistas y acusaciones quedan registradas en el servidor de la agencia para que tu docente pueda revisar tu investigación. Dentro del juego no se puede copiar ni pegar: escribe tus propias consultas.
            </p>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Link href="/" className="link-btn" style={{ color: 'var(--ink-soft)' }}>
                ← Volver
              </Link>
              <button className="btn btn--red" disabled={busy}>
                {busy ? 'Emitiendo…' : 'Emitir credencial'}
              </button>
            </div>
          </form>
        ) : (
          <div className="paper credential" style={{ zIndex: 2 }}>
            <div className="clip" />
            <div className="credential__head">
              <div>
                <div className="credential__agency">AGENCIA ÍNDICE · CREDENCIAL EMITIDA</div>
                <h1 style={{ fontSize: 26, marginTop: 6 }}>{fullName}</h1>
                <div className="muted">{group}</div>
              </div>
              <span className="stamp stamp-in">Aprobado</span>
            </div>
            <p className="muted" style={{ margin: '0 0 4px' }}>Número de placa</p>
            <div className="credential__badge" data-allow-copy>
              {done.badge}
            </div>
            <p className="muted" style={{ margin: '16px 0 4px' }}>Clave de recuperación (anótala en papel: no se volverá a mostrar)</p>
            <div className="recovery-key" data-allow-copy>
              {done.recoveryKey}
            </div>
            <p style={{ fontSize: 14 }}>
              Con tu placa y esta clave puedes recuperar tu progreso desde otro computador. Por sí solos, los códigos de verificación de tus casos no dan acceso a tus datos.
            </p>
            <label className="row" style={{ fontSize: 14, margin: '10px 0 14px' }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Ya anoté mi placa y mi clave de recuperación.
            </label>
            <button className="btn btn--amber" disabled={!ack} onClick={() => router.push('/oficina')}>
              Entrar a la oficina →
            </button>
          </div>
        )}
      </main>
    </GameShell>
  );
}
