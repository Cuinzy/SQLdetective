// Escenarios pixel art en SVG: ciudad nocturna (portada), oficina del detective y sala de interrogatorios.
import { memo } from 'react';

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export const CityScene = memo(function CityScene() {
  const r = seeded(7);
  const buildings: { x: number; w: number; h: number; c: string }[] = [];
  let x = -4;
  while (x < 330) {
    const w = 14 + Math.floor(r() * 26);
    const h = 40 + Math.floor(r() * 70);
    buildings.push({ x, w, h, c: r() > 0.5 ? '#1b2430' : '#202b38' });
    x += w + 1;
  }
  const windows: { x: number; y: number; on: boolean }[] = [];
  for (const b of buildings)
    for (let wy = 180 - b.h + 6; wy < 150; wy += 7)
      for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += 5) windows.push({ x: wx, y: wy, on: r() > 0.72 });
  return (
    <svg className="scene scene--city" viewBox="0 0 320 180" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0d1117" />
          <stop offset="0.6" stopColor="#1a2230" />
          <stop offset="1" stopColor="#2b3442" />
        </linearGradient>
        <radialGradient id="lampglow" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#f2b33d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f2b33d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)" />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={(i * 53) % 320} y={(i * 29) % 70} width="1" height="1" fill="#6b7686" opacity={0.6} />
      ))}
      <rect x="262" y="18" width="14" height="14" fill="#d9d2b8" />
      <rect x="266" y="20" width="10" height="10" fill="#e9e3cc" />
      <rect x="268" y="23" width="2" height="2" fill="#c9c1a3" />
      {buildings.map((b, i) => (
        <rect key={i} x={b.x} y={180 - b.h} width={b.w} height={b.h} fill={b.c} />
      ))}
      {windows.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="2" height="3" fill={w.on ? '#e9b54a' : '#141b24'} opacity={w.on ? 0.85 : 1} className={w.on && i % 17 === 0 ? 'flicker' : undefined} />
      ))}
      <g transform="translate(-92 0)">
      {/* Agencia Índice */}
      <rect x="118" y="58" width="84" height="122" fill="#11171f" />
      <rect x="118" y="58" width="84" height="4" fill="#2b3a4a" />
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <rect key={`${row}-${col}`} x={124 + col * 13} y={76 + row * 16} width="8" height="9" fill={row === 2 && col === 3 ? '#f2b33d' : row === 1 && col === 1 ? '#c98f2c' : '#18202a'} />
        )),
      )}
      <rect x="164" y="110" width="2" height="5" fill="#1d1a1a" />
      <rect x="163" y="108" width="4" height="2" fill="#1d1a1a" />
      <rect x="130" y="64" width="60" height="9" fill="#0b0f14" />
      <text x="160" y="71" textAnchor="middle" fontSize="6" fill="#d7643f" className="neon" fontFamily="monospace" letterSpacing="1">AGENCIA ÍNDICE</text>
      <rect x="150" y="160" width="20" height="20" fill="#2a211a" />
      <rect x="152" y="162" width="16" height="10" fill="#c98f2c" opacity="0.6" />
      </g>
      {/* farola */}
      <rect x="230" y="104" width="2" height="76" fill="#0b0f14" />
      <rect x="224" y="102" width="12" height="3" fill="#0b0f14" />
      <rect x="225" y="105" width="6" height="2" fill="#f2b33d" />
      <polygon points="222,107 236,107 262,180 196,180" fill="url(#lampglow)" />
      {/* calle mojada */}
      <rect x="0" y="174" width="320" height="6" fill="#0e1218" />
      {[20, 70, 140, 200, 250, 300].map((rx, i) => (
        <rect key={i} x={rx} y={176} width={8 + (i % 3) * 4} height="1" fill="#e9b54a" opacity="0.35" />
      ))}
    </svg>
  );
});

export const OfficeScene = memo(function OfficeScene() {
  return (
    <svg className="scene scene--office" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <radialGradient id="desklamp" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#f6c766" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f6c766" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* pared */}
      <rect width="320" height="180" fill="#2a2420" />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={i * 16} y="0" width="1" height="120" fill="#231e1b" />
      ))}
      <rect x="0" y="112" width="320" height="4" fill="#3b2f27" />
      {/* ventana con lluvia */}
      <rect x="118" y="14" width="84" height="64" fill="#3b2f27" />
      <rect x="122" y="18" width="76" height="56" fill="#16202b" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={126 + i * 9} y={40 + ((i * 7) % 20)} width="5" height={34 - ((i * 7) % 20)} fill="#1f2a37" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect key={i} x={127 + ((i * 13) % 68)} y={46 + ((i * 11) % 24)} width="1" height="2" fill="#e9b54a" opacity="0.8" />
      ))}
      <rect x="159" y="18" width="2" height="56" fill="#3b2f27" />
      <rect x="122" y="45" width="76" height="2" fill="#3b2f27" />
      <g className="rain-window">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <rect key={i} x={124 + i * 6} y={20 + ((i * 17) % 40)} width="1" height="4" fill="#8fa5b8" opacity="0.5" />
        ))}
      </g>
      {/* persianas: sombras */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="100" y={92 + i * 6} width="120" height="2" fill="#1d1916" opacity="0.6" />
      ))}
      {/* archivador */}
      <g className="hotspot-art" data-spot="archivo">
        <rect x="14" y="62" width="52" height="90" fill="#5a5f52" />
        <rect x="14" y="62" width="52" height="3" fill="#6e7466" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="18" y={70 + i * 27} width="44" height="22" fill="#4b5045" />
            <rect x="34" y={78 + i * 27} width="12" height="3" fill="#b8b29a" />
            <rect x="35" y={72 + i * 27} width="10" height="4" fill="#efe3c8" />
          </g>
        ))}
        <rect x="24" y="56" width="20" height="6" fill="#d6c494" />
        <rect x="26" y="54" width="16" height="3" fill="#c9b48a" />
      </g>
      {/* tablero de corcho */}
      <g className="hotspot-art" data-spot="tablero">
        <rect x="232" y="20" width="74" height="56" fill="#6a4a2c" />
        <rect x="235" y="23" width="68" height="50" fill="#b98b55" />
        <rect x="240" y="28" width="14" height="12" fill="#efe3c8" />
        <rect x="262" y="30" width="12" height="15" fill="#d9d2b8" />
        <rect x="284" y="27" width="14" height="11" fill="#efe3c8" />
        <rect x="248" y="52" width="16" height="12" fill="#e2d2ae" />
        <rect x="276" y="50" width="14" height="14" fill="#efe3c8" />
        <polyline points="247,30 268,32 291,29 283,52 256,54 247,30" fill="none" stroke="#b4362e" strokeWidth="1" />
        {[[247, 30], [268, 32], [291, 29], [283, 52], [256, 54]].map(([px, py], i) => (
          <rect key={i} x={px - 1} y={py - 1} width="2" height="2" fill={i % 2 ? '#e7c14a' : '#d1453b'} />
        ))}
      </g>
      {/* perchero */}
      <rect x="86" y="40" width="2" height="74" fill="#3b2f27" />
      <rect x="78" y="40" width="18" height="3" fill="#3b2f27" />
      <rect x="77" y="34" width="20" height="6" fill="#1f1a17" />
      <rect x="82" y="30" width="10" height="5" fill="#2a2420" />
      <rect x="80" y="44" width="14" height="40" fill="#4a3b2c" />
      {/* escritorio */}
      <rect x="70" y="118" width="190" height="10" fill="#5a3e28" />
      <rect x="74" y="128" width="182" height="40" fill="#4a3220" />
      <rect x="80" y="134" width="40" height="14" fill="#3f2a1b" />
      <rect x="98" y="139" width="6" height="2" fill="#b8862f" />
      {/* lámpara */}
      <rect x="92" y="112" width="12" height="2" fill="#2f3b33" />
      <rect x="97" y="96" width="2" height="16" fill="#2f3b33" />
      <rect x="90" y="90" width="16" height="7" fill="#2f5b3e" />
      <polygon points="90,97 106,97 130,118 70,118" fill="url(#desklamp)" className="lamp-glow" />
      {/* terminal CRT */}
      <g className="hotspot-art" data-spot="terminal">
        <rect x="150" y="84" width="54" height="34" fill="#c8bea4" />
        <rect x="154" y="88" width="46" height="26" fill="#0f1410" />
        <rect x="157" y="91" width="22" height="2" fill="#f2b33d" className="crt-line" />
        <rect x="157" y="96" width="34" height="2" fill="#f2b33d" opacity="0.7" />
        <rect x="157" y="101" width="16" height="2" fill="#f2b33d" opacity="0.7" />
        <rect x="157" y="106" width="4" height="3" fill="#f2b33d" className="blink" />
        <rect x="160" y="118" width="34" height="4" fill="#b2a88e" />
        <rect x="146" y="122" width="62" height="5" fill="#d6ccb2" />
      </g>
      {/* expedientes sobre la mesa */}
      <rect x="214" y="112" width="30" height="6" fill="#d6c494" />
      <rect x="216" y="108" width="28" height="5" fill="#e2d2ae" />
      <rect x="226" y="106" width="8" height="3" fill="#a3302a" />
      <rect x="122" y="114" width="16" height="4" fill="#efe3c8" />
      {/* taza */}
      <rect x="208" y="111" width="6" height="7" fill="#efe3c8" />
      <rect x="214" y="113" width="2" height="3" fill="#efe3c8" />
      {/* puerta */}
      <g className="hotspot-art" data-spot="puerta">
        <rect x="0" y="22" width="8" height="130" fill="#3b2f27" />
      </g>
      <rect x="0" y="152" width="320" height="28" fill="#1d1916" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect key={i} x={i * 34} y="152" width="1" height="28" fill="#17130f" />
      ))}
    </svg>
  );
});

export const InterrogationScene = memo(function InterrogationScene() {
  return (
    <svg className="scene scene--interrogation" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <radialGradient id="hanglamp" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#f3d79a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f3d79a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="#1b1f22" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="0" y={i * 12} width="320" height="1" fill="#22282c" />
      ))}
      <rect x="216" y="28" width="90" height="56" fill="#0d1113" />
      <rect x="219" y="31" width="84" height="50" fill="#1a2328" />
      <rect x="225" y="34" width="20" height="44" fill="#212c32" opacity="0.6" />
      <rect x="158" y="0" width="4" height="26" fill="#0d1113" />
      <rect x="146" y="26" width="28" height="8" fill="#2a2f33" />
      <rect x="152" y="34" width="16" height="2" fill="#f3d79a" />
      <polygon points="146,36 174,36 250,180 70,180" fill="url(#hanglamp)" className="lamp-glow" />
      <rect x="60" y="138" width="200" height="8" fill="#3a3330" />
      <rect x="66" y="146" width="6" height="34" fill="#2a2522" />
      <rect x="248" y="146" width="6" height="34" fill="#2a2522" />
      <rect x="120" y="132" width="26" height="6" fill="#efe3c8" />
      <rect x="150" y="133" width="12" height="5" fill="#2b2b2b" />
      <rect x="152" y="131" width="3" height="2" fill="#d1453b" className="blink" />
    </svg>
  );
});

/** Viñetas pequeñas para cada tipo de escena de caso (expediente). */
export const SceneVignette = memo(function SceneVignette({ scene }: { scene: string }) {
  const S: Record<string, React.ReactNode> = {
    tutorial: (
      <>
        <rect x="20" y="16" width="14" height="14" fill="#efe3c8" />
        <rect x="34" y="20" width="4" height="6" fill="none" stroke="#efe3c8" strokeWidth="2" />
        <rect x="23" y="20" width="8" height="2" fill="#2a211a" />
        <rect x="26" y="14" width="2" height="2" fill="#8fa5b8" />
      </>
    ),
    museo: (
      <>
        <rect x="18" y="12" width="28" height="22" fill="none" stroke="#c9c1a3" strokeWidth="2" />
        <rect x="26" y="34" width="12" height="6" fill="#5a5f52" />
        <rect x="27" y="18" width="10" height="10" fill="#3f8a5a" opacity="0.25" />
        <path d="M22 14 L30 22 M40 16 L34 26" stroke="#a3302a" strokeWidth="1" />
      </>
    ),
    biblioteca: (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={12 + i * 6} y={12 + (i % 3) * 2} width="5" height={22 - (i % 3) * 2} fill={['#7c2f2b', '#3c4a5c', '#b8862f', '#2f3b33'][i % 4]} />
        ))}
        <rect x="10" y="34" width="46" height="3" fill="#5a3e28" />
      </>
    ),
    laboratorio: (
      <>
        <rect x="22" y="12" width="6" height="10" fill="#c9c1a3" />
        <polygon points="18,34 32,34 28,22 22,22" fill="#5fae7a" opacity="0.7" />
        <rect x="36" y="18" width="12" height="16" fill="#0f1410" />
        <rect x="38" y="21" width="8" height="1" fill="#f2b33d" />
        <rect x="38" y="25" width="5" height="1" fill="#d1453b" />
      </>
    ),
    hotel: (
      <>
        <rect x="18" y="10" width="26" height="28" fill="#5a3e28" />
        <rect x="22" y="14" width="18" height="10" fill="#3b2f27" />
        <rect x="38" y="24" width="3" height="3" fill="#e7c14a" />
        <text x="31" y="21" fontSize="6" textAnchor="middle" fill="#efe3c8" fontFamily="monospace">512</text>
      </>
    ),
    servidor: (
      <>
        <rect x="18" y="10" width="28" height="28" fill="#202b38" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="21" y={13 + i * 6} width="22" height="4" fill="#141b24" />
            <rect x="23" y={14 + i * 6} width="2" height="2" fill={i === 2 ? '#d1453b' : '#6f9b4c'} className={i === 2 ? 'blink' : undefined} />
          </g>
        ))}
      </>
    ),
    festival: (
      <>
        <polygon points="14,38 32,10 50,38" fill="#7c2f2b" />
        <rect x="30" y="10" width="4" height="4" fill="#e7c14a" />
        <rect x="20" y="30" width="24" height="8" fill="#efe3c8" />
        <text x="32" y="36" fontSize="5" textAnchor="middle" fill="#2a211a" fontFamily="monospace">TICKET</text>
      </>
    ),
    calle: (
      <>
        <rect x="10" y="30" width="44" height="8" fill="#2b3442" />
        <rect x="14" y="20" width="22" height="10" fill="#8a8f99" />
        <rect x="16" y="22" width="8" height="4" fill="#16202b" />
        <rect x="36" y="22" width="16" height="8" fill="#e7c14a" />
        <rect x="16" y="30" width="4" height="4" fill="#111" />
        <rect x="30" y="30" width="4" height="4" fill="#111" />
      </>
    ),
    archivo: (
      <>
        <rect x="16" y="14" width="30" height="22" fill="#d6c494" />
        <rect x="16" y="11" width="12" height="4" fill="#d6c494" />
        <rect x="24" y="20" width="16" height="6" fill="none" stroke="#a3302a" strokeWidth="1.5" />
        <text x="32" y="25" fontSize="4" textAnchor="middle" fill="#a3302a" fontFamily="monospace">RESERVADO</text>
      </>
    ),
    tren: (
      <>
        <rect x="8" y="34" width="48" height="2" fill="#5d666c" />
        <rect x="12" y="18" width="34" height="14" fill="#3c4a5c" />
        <rect x="16" y="21" width="6" height="5" fill="#e9b54a" />
        <rect x="26" y="21" width="6" height="5" fill="#e9b54a" />
        <rect x="46" y="22" width="6" height="10" fill="#7c2f2b" />
        <path d="M40 36 L52 30" stroke="#d1453b" strokeWidth="1.5" />
      </>
    ),
    oficina: (
      <>
        <rect x="14" y="14" width="36" height="22" fill="#efe3c8" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="18" y={18 + i * 4} width={26 - i * 4} height="1" fill="#5a4a3a" />
        ))}
        <text x="40" y="34" fontSize="6" fill="#a3302a" fontFamily="monospace">$</text>
      </>
    ),
    red: (
      <>
        {[[18, 14], [44, 16], [30, 30], [16, 34], [48, 34]].map(([cx, cy], i) => (
          <rect key={i} x={cx - 3} y={cy - 3} width="6" height="6" fill="#efe3c8" />
        ))}
        <path d="M18 14 L30 30 L44 16 M30 30 L16 34 M30 30 L48 34" stroke="#b4362e" strokeWidth="1" />
      </>
    ),
    puerto: (
      <>
        <rect x="8" y="32" width="48" height="6" fill="#2c3e57" />
        <rect x="14" y="22" width="16" height="10" fill="#7c2f2b" />
        <rect x="30" y="22" width="16" height="10" fill="#3f6f73" />
        <rect x="22" y="14" width="16" height="8" fill="#b8862f" />
        <rect x="48" y="8" width="2" height="24" fill="#e7c14a" />
        <rect x="38" y="8" width="12" height="2" fill="#e7c14a" />
      </>
    ),
    proyecto: (
      <>
        <rect x="20" y="14" width="24" height="18" fill="#202b38" />
        <circle cx="32" cy="23" r="5" fill="none" stroke="#f2b33d" strokeWidth="1" />
        <rect x="31" y="22" width="2" height="2" fill="#f2b33d" />
        <rect x="44" y="26" width="8" height="5" fill="#8fa5b8" />
      </>
    ),
    noche: (
      <>
        <rect x="14" y="10" width="36" height="28" fill="#1b1f22" />
        <rect x="44" y="12" width="4" height="4" fill="#d9d2b8" />
        <rect x="18" y="30" width="20" height="3" fill="#c9c9c4" />
        <rect x="36" y="29" width="6" height="1" fill="#a3302a" />
        <text x="22" y="22" fontSize="6" fill="#d1453b" fontFamily="monospace">00:00</text>
      </>
    ),
    maestro: (
      <>
        <rect x="14" y="16" width="36" height="22" fill="#5a3e28" />
        <polygon points="20,16 26,6 30,14 36,4 40,14 46,8 44,16" fill="#d7643f" className="flicker" />
        <rect x="22" y="24" width="20" height="10" fill="#d6c494" />
      </>
    ),
  };
  return (
    <svg className="vignette" viewBox="0 0 64 44" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="64" height="44" fill="#16202b" />
      {S[scene] ?? S.archivo}
      <rect x="0" y="0" width="64" height="44" fill="none" stroke="#2a211a" strokeWidth="2" />
    </svg>
  );
});
