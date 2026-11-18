'use client';
// Utilidades del navegador: llamadas a la API, sonido sintetizado y bloqueo de copiar/pegar.
import { useEffect, useRef } from 'react';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body !== undefined ? 'POST' : 'GET'),
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string })?.error ?? `Error ${res.status}`);
  return data as T;
}

/* ───────────── Sonido: efectos originales sintetizados con WebAudio ───────────── */

let ctx: AudioContext | null = null;
let rainNode: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem('sqld_muted') !== '0';
  } catch {
    return true;
  }
}
export function setMuted(m: boolean) {
  try {
    localStorage.setItem('sqld_muted', m ? '1' : '0');
  } catch {
    /* almacenamiento no disponible */
  }
  if (m) stopRain();
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted()) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04, delay = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + delay);
  o.stop(a.currentTime + delay + dur + 0.02);
}

function noiseBurst(dur: number, vol: number, freq = 1800) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

export const sfx = {
  key: () => noiseBurst(0.025, 0.05, 3200),
  click: () => tone(660, 0.05, 'square', 0.03),
  run: () => {
    tone(440, 0.06, 'square', 0.03);
    tone(660, 0.06, 'square', 0.03, 0.06);
  },
  error: () => {
    tone(196, 0.14, 'sawtooth', 0.035);
    tone(147, 0.18, 'sawtooth', 0.035, 0.12);
  },
  evidence: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, i * 0.09)),
  stamp: () => {
    noiseBurst(0.18, 0.25, 220);
    tone(80, 0.2, 'sine', 0.12);
  },
  solved: () => [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.22, 'triangle', 0.05, i * 0.12)),
  denied: () => [330, 262, 196].forEach((f, i) => tone(f, 0.2, 'square', 0.04, i * 0.15)),
};

export function startRain() {
  const a = ac();
  if (!a || rainNode) return;
  const len = a.sampleRate * 2;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    d[i] = last * 3.2;
  }
  rainNode = a.createBufferSource();
  rainNode.buffer = buf;
  rainNode.loop = true;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  rainGain = a.createGain();
  rainGain.gain.value = 0.05;
  rainNode.connect(f).connect(rainGain).connect(a.destination);
  rainNode.start();
}
export function stopRain() {
  try {
    rainNode?.stop();
  } catch {
    /* ya detenido */
  }
  rainNode = null;
  rainGain = null;
}

/* ───────────── Bloqueo de copiar / cortar / pegar / arrastrar ───────────── */

/**
 * Bloquea las vías habituales de copiar y pegar dentro del contenedor del juego.
 * IMPORTANTE: es una medida pedagógica, no una protección absoluta (puede eludirse con herramientas externas).
 * El servidor complementa con detección de consultas repetidas y registro de intentos.
 */
export function useNoCopyPaste(onAttempt: (kind: string) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onAttempt);
  cb.current = onAttempt;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const block = (kind: string) => (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-allow-copy]')) return;
      e.preventDefault();
      e.stopPropagation();
      cb.current(kind);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-allow-copy]')) return;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if ((mod && ['c', 'v', 'x'].includes(k)) || (e.shiftKey && k === 'insert') || (mod && k === 'insert')) {
        e.preventDefault();
        e.stopPropagation();
        cb.current(k === 'v' || k === 'insert' ? 'paste' : 'copy');
      }
    };
    const handlers: [string, EventListener][] = [
      ['copy', block('copy')],
      ['cut', block('cut')],
      ['paste', block('paste')],
      ['drop', block('drop')],
      ['dragstart', block('drag')],
      ['contextmenu', block('menu')],
      ['beforeinput', ((e: InputEvent) => {
        if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop' || e.inputType === 'insertFromPasteAsQuotation') block('paste')(e);
      }) as EventListener],
    ];
    for (const [ev, h] of handlers) el.addEventListener(ev, h, true);
    el.addEventListener('keydown', onKey, true);
    return () => {
      for (const [ev, h] of handlers) el.removeEventListener(ev, h, true);
      el.removeEventListener('keydown', onKey, true);
    };
  }, []);
  return ref;
}

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
