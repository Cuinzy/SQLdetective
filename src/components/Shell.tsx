'use client';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Logo, PixelIcon } from './art/Icons';
import { isMuted, setMuted, sfx, startRain, stopRain, useNoCopyPaste } from '@/lib/client';

type ToastKind = 'info' | 'red' | 'ok' | 'amber';
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}
const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const PasteCtx = createContext<{ setSink: (fn: ((kind: string) => void) | null) => void }>({ setSink: () => {} });
export const usePasteSink = () => useContext(PasteCtx);

export function SoundToggle() {
  const [muted, setM] = useState(true);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      className="icon-btn"
      title={muted ? 'Activar sonido' : 'Silenciar'}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setM(next);
        if (!next) {
          sfx.click();
          startRain();
        } else stopRain();
      }}
    >
      <PixelIcon name={muted ? 'mute' : 'sound'} size={20} />
    </button>
  );
}

/** Contenedor del juego: HUD superior, notificaciones y bloqueo de copiar/pegar. */
export function GameShell({ children, hud, plain = false }: { children: React.ReactNode; hud?: React.ReactNode; plain?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sinkRef = useRef<((kind: string) => void) | null>(null);
  const lastToast = useRef(0);
  const push = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const ref = useNoCopyPaste((kind) => {
    sinkRef.current?.(kind);
    const now = Date.now();
    if (now - lastToast.current > 2500) {
      lastToast.current = now;
      push(kind === 'paste' || kind === 'drop' ? 'La agencia exige transcribir a mano: pegar está deshabilitado en el juego.' : 'Copiar está deshabilitado dentro del juego.', 'amber');
    }
  });
  return (
    <ToastCtx.Provider value={push}>
      <PasteCtx.Provider value={{ setSink: (fn) => (sinkRef.current = fn) }}>
        <div ref={ref} className="game-root">
          {!plain && (
            <header className="hud">
              <Link href="/oficina" aria-label="Ir a la oficina" style={{ textDecoration: 'none' }}>
                <Logo compact />
              </Link>
              {hud}
              <div className="hud__spacer" />
              <SoundToggle />
            </header>
          )}
          {children}
          <div className="toast-stack" role="status" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`toast ${t.kind !== 'info' ? 'toast--' + t.kind : ''}`}>
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </PasteCtx.Provider>
    </ToastCtx.Provider>
  );
}
