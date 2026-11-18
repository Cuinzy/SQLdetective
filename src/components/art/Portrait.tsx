// Retratos pixel art procedurales (32×32) generados a partir de la apariencia de cada personaje.
import type { Look } from '@/lib/types';
import { memo } from 'react';

const SKIN = ['#f1c9a5', '#e0ac85', '#c68863', '#a86b47', '#7d4b32', '#5a3524'];
const HAIR = ['#1d1a1a', '#4a2f1f', '#7a4a26', '#b07a3b', '#d8b26a', '#9b3b2a', '#5d666c', '#c9c9c4'];
const OUTFIT = ['#e9e4d8', '#3c4a5c', '#2f3b33', '#6a4a3a', '#7c2f2b', '#4b3f63', '#2b2b2b', '#b8862f'];
const BG = ['#3f6f73', '#5b4660', '#6b6a3e', '#45505e', '#7a4b35', '#2c3e57'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const HAIRS = ['corto', 'largo', 'rizado', 'calvo', 'coleta', 'flequillo', 'mohicano', 'mono', 'canoso'] as const;
const STYLES = ['traje', 'bata', 'uniforme', 'sueter', 'chaqueta', 'camisa'] as const;

export function resolveLook(id: string, look: Look = {}): Required<Look> {
  const h = hash(id);
  return {
    skin: look.skin ?? h % 6,
    hair: look.hair ?? HAIRS[(h >>> 3) % HAIRS.length],
    hairColor: look.hairColor ?? (h >>> 7) % 8,
    facial: look.facial ?? 'ninguno',
    accessory: look.accessory ?? 'ninguno',
    outfit: look.outfit ?? (h >>> 11) % 8,
    outfitStyle: look.outfitStyle ?? STYLES[(h >>> 14) % STYLES.length],
    bg: look.bg ?? (h >>> 17) % 6,
    age: look.age ?? 'adulto',
  };
}

type Grid = (string | null)[][];

export function buildPortrait(id: string, lookIn?: Look): Grid {
  const L = resolveLook(id, lookIn);
  const g: Grid = Array.from({ length: 32 }, () => Array(32).fill(null));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < 32 && y >= 0 && y < 32) g[y][x] = c;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const bg = BG[L.bg];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) set(x, y, (x + y) % 4 === 0 ? shade(bg, 0.9) : bg);
  // líneas de estatura (fondo de ficha policial)
  for (const y of [6, 12, 18]) for (let x = 0; x < 32; x += 2) set(x, y, shade(bg, 1.18));

  const skin = SKIN[L.skin];
  const skinD = shade(skin, 0.82);
  const hair = L.hair === 'canoso' ? HAIR[7] : HAIR[L.hairColor];
  const hairD = shade(hair, 0.75);
  const cloth = OUTFIT[L.outfit];
  const clothD = shade(cloth, 0.78);

  // pelo largo detrás
  if (L.hair === 'largo') rect(8, 9, 23, 26, hairD);

  // ropa
  for (let y = 24; y < 32; y++) {
    const half = 7 + Math.floor((y - 24) * 1.2);
    rect(16 - half, y, 15 + half, y, cloth);
    set(15 + half, y, clothD);
    set(16 - half, y, clothD);
  }
  // cuello
  rect(13, 21, 18, 25, skinD);
  if (L.outfitStyle === 'traje') {
    rect(14, 24, 17, 31, '#ece8de');
    rect(15, 25, 16, 30, '#7c2f2b');
    for (let i = 0; i < 6; i++) {
      set(13 - Math.floor(i / 2), 24 + i, clothD);
      set(18 + Math.floor(i / 2), 24 + i, clothD);
    }
  } else if (L.outfitStyle === 'bata') {
    for (let y = 24; y < 32; y++) {
      const half = 7 + Math.floor((y - 24) * 1.2);
      rect(16 - half, y, 15 + half, y, '#e9e9e2');
    }
    rect(15, 25, 16, 31, '#bdbdb5');
    rect(14, 24, 17, 26, cloth);
  } else if (L.outfitStyle === 'uniforme') {
    rect(12, 24, 19, 25, clothD);
    set(10, 27, '#e7c14a');
    set(21, 27, '#e7c14a');
    rect(19, 28, 21, 29, '#c9c9c4');
  } else if (L.outfitStyle === 'sueter') {
    rect(12, 24, 19, 25, clothD);
    for (let x = 9; x < 23; x += 2) set(x, 30, clothD);
  } else if (L.outfitStyle === 'chaqueta') {
    rect(15, 25, 16, 31, '#c9c9c4');
    rect(11, 24, 13, 26, clothD);
    rect(18, 24, 20, 26, clothD);
  } else {
    set(13, 24, '#ece8de');
    set(18, 24, '#ece8de');
    set(14, 25, '#ece8de');
    set(17, 25, '#ece8de');
    for (let y = 26; y < 32; y += 2) set(16, y, clothD);
  }

  // cabeza
  const halfW = [3, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 4];
  halfW.forEach((hw, i) => {
    const y = 7 + i;
    rect(16 - hw, y, 15 + hw, y, skin);
    set(15 + hw, y, skinD);
    if (hw > 1) set(14 + hw, y, skinD);
  });
  // orejas
  rect(8, 13, 8, 15, skinD);
  rect(23, 13, 23, 15, skinD);
  // ojos y cejas
  const eye = '#1e1b1a';
  rect(11, 14, 13, 14, '#f4f1e8');
  rect(18, 14, 20, 14, '#f4f1e8');
  set(12, 14, eye);
  set(19, 14, eye);
  rect(11, 12, 13, 12, hairD);
  rect(18, 12, 20, 12, hairD);
  // nariz y boca
  rect(15, 15, 16, 17, skinD);
  set(16, 17, shade(skin, 0.7));
  rect(14, 19, 17, 19, '#7a3a32');
  if (L.age === 'mayor') {
    set(10, 16, skinD);
    set(21, 16, skinD);
    rect(12, 11, 13, 11, skinD);
    rect(18, 11, 19, 11, skinD);
    set(13, 18, skinD);
    set(18, 18, skinD);
  }
  if (L.age === 'joven') {
    set(11, 17, shade(skin, 0.93));
    set(20, 17, shade(skin, 0.93));
  }

  // vello facial
  if (L.facial === 'barba') {
    for (let y = 17; y <= 22; y++) {
      const hw = halfW[y - 7] ?? 3;
      rect(16 - hw, y, 15 + hw, y, y === 19 ? hairD : hair);
    }
    rect(14, 19, 17, 19, '#7a3a32');
  } else if (L.facial === 'bigote') rect(13, 18, 18, 18, hair);
  else if (L.facial === 'perilla') {
    rect(14, 18, 17, 18, hair);
    rect(15, 20, 16, 22, hair);
  }

  // peinado
  const top = () => {
    rect(10, 5, 21, 6, hair);
    rect(9, 7, 22, 8, hair);
    rect(8, 9, 9, 12, hair);
    rect(22, 9, 23, 12, hair);
  };
  switch (L.hair) {
    case 'corto':
      top();
      rect(10, 9, 21, 9, hairD);
      break;
    case 'largo':
      top();
      rect(8, 9, 9, 22, hair);
      rect(22, 9, 23, 22, hair);
      break;
    case 'rizado':
      for (let y = 3; y <= 9; y++) for (let x = 8; x <= 23; x++) if ((x + y) % 2 === 0 || y > 4) set(x, y, (x * y) % 3 === 0 ? hairD : hair);
      rect(7, 9, 9, 14, hair);
      rect(22, 9, 24, 14, hair);
      break;
    case 'calvo':
      rect(8, 11, 9, 14, hair);
      rect(22, 11, 23, 14, hair);
      set(13, 8, shade(skin, 1.1));
      break;
    case 'coleta':
      top();
      rect(23, 10, 26, 13, hair);
      rect(24, 14, 25, 20, hairD);
      break;
    case 'flequillo':
      top();
      rect(9, 9, 20, 10, hair);
      rect(10, 11, 16, 11, hairD);
      break;
    case 'mohicano':
      rect(14, 2, 17, 9, hair);
      rect(15, 1, 16, 1, hairD);
      rect(8, 11, 9, 13, hairD);
      rect(22, 11, 23, 13, hairD);
      break;
    case 'mono':
      top();
      rect(13, 1, 18, 4, hair);
      rect(14, 2, 17, 3, hairD);
      break;
    case 'canoso':
      rect(9, 7, 11, 9, hair);
      rect(20, 7, 22, 9, hair);
      rect(8, 9, 9, 13, hair);
      rect(22, 9, 23, 13, hair);
      rect(12, 6, 19, 6, hairD);
      break;
  }

  // accesorios
  const dark = '#151313';
  switch (L.accessory) {
    case 'gafas':
      rect(10, 13, 14, 13, dark);
      rect(17, 13, 21, 13, dark);
      rect(10, 15, 14, 15, dark);
      rect(17, 15, 21, 15, dark);
      set(10, 14, dark);
      set(14, 14, dark);
      set(17, 14, dark);
      set(21, 14, dark);
      rect(15, 14, 16, 14, dark);
      break;
    case 'gafas_sol':
      rect(10, 13, 14, 15, dark);
      rect(17, 13, 21, 15, dark);
      rect(15, 14, 16, 14, dark);
      set(11, 13, '#5d666c');
      set(18, 13, '#5d666c');
      break;
    case 'sombrero':
      rect(6, 7, 25, 8, '#2b2422');
      rect(10, 2, 21, 6, '#3a302c');
      rect(10, 5, 21, 5, '#7c2f2b');
      break;
    case 'gorra':
      rect(9, 4, 22, 8, '#2f3b5a');
      rect(4, 8, 12, 9, '#24304a');
      set(15, 5, '#e7c14a');
      break;
    case 'boina':
      rect(9, 4, 23, 7, '#5b2a2a');
      rect(20, 3, 22, 3, '#5b2a2a');
      break;
    case 'aretes':
      set(8, 17, '#e7c14a');
      set(23, 17, '#e7c14a');
      break;
    case 'parche':
      rect(17, 13, 21, 15, dark);
      rect(9, 11, 22, 11, dark);
      break;
    case 'auriculares':
      rect(9, 4, 22, 5, '#2b2b2b');
      rect(6, 12, 8, 16, '#2b2b2b');
      rect(23, 12, 25, 16, '#2b2b2b');
      set(7, 13, '#7c2f2b');
      set(24, 13, '#7c2f2b');
      break;
  }
  return g;
}

function toRects(g: Grid) {
  const out: { x: number; y: number; w: number; c: string }[] = [];
  for (let y = 0; y < g.length; y++) {
    let x = 0;
    while (x < g[y].length) {
      const c = g[y][x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < g[y].length && g[y][x + w] === c) w++;
      out.push({ x, y, w, c });
      x += w;
    }
  }
  return out;
}

export const Portrait = memo(function Portrait({ id, look, size = 96, className, title, mood }: { id: string; look?: Look; size?: number; className?: string; title?: string; mood?: 'normal' | 'tenso' | 'descartado' | 'culpable' }) {
  const rects = toRects(buildPortrait(id, look));
  return (
    <svg
      className={`portrait ${mood ? 'portrait--' + mood : ''} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? 'Retrato'}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
      {mood === 'descartado' && <path d="M2 2 L30 30 M30 2 L2 30" stroke="#a3302a" strokeWidth="2" opacity="0.85" />}
    </svg>
  );
});
