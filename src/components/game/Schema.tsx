'use client';
import { useMemo, useState } from 'react';
import type { PublicTable } from '@/lib/types';
import { PixelIcon } from '../art/Icons';

const TYPE_LABEL: Record<string, string> = { integer: 'entero', text: 'texto', numeric: 'decimal', date: 'fecha', time: 'hora', timestamp: 'fecha y hora', boolean: 'booleano' };

export function SchemaExplorer({ tables, onShowMap }: { tables: PublicTable[]; onShowMap: () => void }) {
  const [open, setOpen] = useState<string | null>(tables[0]?.name ?? null);
  return (
    <div className="panel">
      <div className="panel__head">
        <PixelIcon name="db" /> Esquema del caso
        <span style={{ flex: 1 }} />
        <button className="btn btn--small btn--ghost" onClick={onShowMap} title="Ver el modelo relacional">Mapa</button>
      </div>
      <div style={{ maxHeight: 560, overflow: 'auto' }}>
        {tables.map((t) => (
          <div key={t.name} className="schema-table">
            <button onClick={() => setOpen(open === t.name ? null : t.name)} aria-expanded={open === t.name}>
              <span>{open === t.name ? '▾' : '▸'} {t.name}</span>
              <small>{t.rowCount} filas</small>
            </button>
            {open === t.name && (
              <div className="schema-cols">
                <p style={{ margin: '0 0 6px', color: '#9aa1a8', fontSize: 12.5 }}>{t.description}</p>
                <ul>
                  {t.columns.map((c) => (
                    <li key={c.name}>
                      <span className="col-name">
                        {c.pk && <span className="key-pk" title="Clave primaria">PK </span>}
                        {c.fk && <span className="key-fk" title={`Clave foránea → ${c.fk.table}.${c.fk.column}`}>FK </span>}
                        {c.name}
                      </span>
                      <span className="col-type">{TYPE_LABEL[c.type] ?? c.type}{c.nullable ? ' · nulo' : ''}</span>
                      <span className="col-desc">
                        {c.description}
                        {c.fk && <> → <b style={{ color: '#8fb7c4' }}>{c.fk.table}.{c.fk.column}</b></>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Diagrama del modelo relacional: tablas en columnas según su dependencia de claves foráneas. */
export function ErDiagram({ tables }: { tables: PublicTable[] }) {
  const layout = useMemo(() => {
    const byName = new Map(tables.map((t) => [t.name, t]));
    const level = new Map<string, number>();
    const lv = (name: string, seen = new Set<string>()): number => {
      if (level.has(name)) return level.get(name)!;
      if (seen.has(name)) return 0;
      seen.add(name);
      const t = byName.get(name)!;
      const refs = t.columns.filter((c) => c.fk && c.fk.table !== name).map((c) => lv(c.fk!.table, seen));
      const v = refs.length ? Math.max(...refs) + 1 : 0;
      level.set(name, v);
      return v;
    };
    tables.forEach((t) => lv(t.name));
    const cols = new Map<number, PublicTable[]>();
    for (const t of tables) {
      const l = level.get(t.name)!;
      cols.set(l, [...(cols.get(l) ?? []), t]);
    }
    const BW = 190;
    const GAP = 70;
    const ROW = 15;
    const HEAD = 22;
    const pos = new Map<string, { x: number; y: number; h: number }>();
    let maxH = 0;
    [...cols.keys()].sort((a, b) => a - b).forEach((l, ci) => {
      let y = 10;
      for (const t of cols.get(l)!) {
        const h = HEAD + t.columns.length * ROW + 6;
        pos.set(t.name, { x: 10 + ci * (BW + GAP), y, h });
        y += h + 22;
      }
      maxH = Math.max(maxH, y);
    });
    const width = 20 + cols.size * (BW + GAP) - GAP;
    return { pos, BW, ROW, HEAD, width, height: maxH };
  }, [tables]);
  const { pos, BW, ROW, HEAD } = layout;
  const links: { d: string; key: string }[] = [];
  for (const t of tables) {
    const a = pos.get(t.name)!;
    t.columns.forEach((c, i) => {
      if (!c.fk) return;
      const target = tables.find((x) => x.name === c.fk!.table);
      const b = pos.get(c.fk.table);
      if (!target || !b) return;
      const ti = target.columns.findIndex((x) => x.name === c.fk!.column);
      const y1 = a.y + HEAD + i * ROW + ROW / 2 + 2;
      const y2 = b.y + HEAD + ti * ROW + ROW / 2 + 2;
      const fromLeft = b.x < a.x;
      const x1 = fromLeft ? a.x : a.x + BW;
      const x2 = fromLeft ? b.x + BW : b.x;
      const mx = (x1 + x2) / 2 || x1 + 30;
      links.push({ key: `${t.name}.${c.name}`, d: b.x === a.x ? `M${a.x + BW} ${y1} C${a.x + BW + 40} ${y1}, ${b.x + BW + 40} ${y2}, ${b.x + BW} ${y2}` : `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
    });
  }
  return (
    <svg className="er" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Modelo relacional del caso">
      {links.map((l) => (
        <path key={l.key} d={l.d} fill="none" stroke="#b4362e" strokeWidth="1.6" strokeDasharray="4 2" />
      ))}
      {tables.map((t) => {
        const p = pos.get(t.name)!;
        return (
          <g key={t.name} transform={`translate(${p.x} ${p.y})`}>
            <rect width={BW} height={p.h} fill="#efe3c8" stroke="#2a211a" strokeWidth="2" />
            <rect width={BW} height={HEAD} fill="#2a211a" />
            <text x="8" y="16" fill="#f2b33d" fontSize="17">{t.name}</text>
            {t.columns.map((c, i) => (
              <text key={c.name} x="8" y={HEAD + i * ROW + 14} fontSize="15" fill={c.pk ? '#a3302a' : c.fk ? '#2c5f6e' : '#2a211a'}>
                {c.pk ? 'PK ' : c.fk ? 'FK ' : '   '}
                {c.name}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function ResultsTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  if (!columns.length) return null;
  return (
    <div className="results">
      <table>
        <thead>
          <tr>
            <th className="rn">#</th>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="rn">{i + 1}</td>
              {r.map((v, j) => (
                <td key={j} title={v === null ? 'NULL' : String(v)}>
                  {v === null ? <span className="null">NULL</span> : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
