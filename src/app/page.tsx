'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CityScene } from '@/components/art/Scenes';
import { Logo } from '@/components/art/Icons';
import { GameShell, SoundToggle } from '@/components/Shell';
import { api } from '@/lib/client';

export default function TitlePage() {
  const [hasPlayer, setHasPlayer] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  useEffect(() => {
    api<{ player: { fullName: string } }>('/api/player/me')
      .then((r) => {
        setHasPlayer(true);
        setName(r.player.fullName);
      })
      .catch(() => setHasPlayer(false));
  }, []);
  return (
    <GameShell plain>
      <main className="title-screen">
        <CityScene />
        <div className="rain" />
        <div className="rain rain--slow" />
        <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 3 }}>
          <SoundToggle />
        </div>
        <div className="title-card">
          <Logo />
          <p className="title-tagline">
            Ciudad Bruma, medianoche. La Agencia Índice guarda todo lo que la ciudad olvida: accesos, llamadas, cámaras, transacciones. Las respuestas están en los datos. Solo hay que saber preguntar.
          </p>
          <nav className="title-menu" aria-label="Menú principal">
            {hasPlayer ? (
              <Link className="btn btn--amber" href="/oficina">
                ▶ Continuar como {name.split(' ')[0]}
              </Link>
            ) : (
              <Link className="btn btn--amber" href="/registro">
                ▶ Nueva credencial de detective
              </Link>
            )}
            {hasPlayer && (
              <Link className="btn" href="/registro">
                Registrar otra credencial
              </Link>
            )}
            <Link className="btn" href="/recuperar">
              Recuperar mi credencial
            </Link>
            <Link className="btn btn--ghost" href="/admin">
              Acceso docente
            </Link>
          </nav>
        </div>
        <div className="title-foot">15 expedientes · PostgreSQL real · ningún culpable se adivina</div>
      </main>
    </GameShell>
  );
}
