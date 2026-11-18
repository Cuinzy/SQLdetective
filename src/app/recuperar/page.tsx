'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CityScene } from '@/components/art/Scenes';
import { GameShell } from '@/components/Shell';
import { api, sfx } from '@/lib/client';

export default function RecoverPage() {
  const router = useRouter();
  const [badge, setBadge] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/player/recover', { body: { badge, recoveryKey: key } });
      sfx.stamp();
      router.push('/oficina');
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
        <form className="paper credential" onSubmit={submit} style={{ zIndex: 2 }}>
          <div className="clip" />
          <div className="credential__head">
            <div>
              <div className="credential__agency">AGENCIA ÍNDICE · ARCHIVO DE PERSONAL</div>
              <h1 style={{ fontSize: 26, marginTop: 6 }}>Recuperar credencial</h1>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="b">Número de placa</label>
            <input id="b" value={badge} onChange={(e) => setBadge(e.target.value.toUpperCase())} placeholder="AG-XXXX-XXXX" required maxLength={20} style={{ fontFamily: 'var(--font-term)', fontSize: 24 }} />
          </div>
          <div className="field">
            <label htmlFor="k">Clave de recuperación</label>
            <input id="k" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" required maxLength={30} style={{ fontFamily: 'var(--font-term)', fontSize: 24 }} />
            <small>Si perdiste la clave, pide a tu docente que verifique tu código de investigación.</small>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Link href="/" className="link-btn" style={{ color: 'var(--ink-soft)' }}>
              ← Volver
            </Link>
            <button className="btn btn--red" disabled={busy}>
              {busy ? 'Verificando…' : 'Recuperar'}
            </button>
          </div>
        </form>
      </main>
    </GameShell>
  );
}
