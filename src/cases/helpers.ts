// Utilidades para definir casos de forma compacta y DETERMINISTA.
// El generador pseudoaleatorio usa una semilla fija por caso: los datos son siempre idénticos
// en cada carga, y las pruebas automáticas verifican que el culpable y las evidencias no cambian.
import type { Cell, ColType, ColumnDef, TableDef } from './types';

/** Columna compacta: "nombre:tipo[:pk][:fk=tabla.columna][:null]|Descripción" */
export function col(spec: string): ColumnDef {
  const [def, description = ''] = spec.split('|');
  const parts = def.split(':');
  const c: ColumnDef = { name: parts[0], type: parts[1] as ColType, description };
  for (const p of parts.slice(2)) {
    if (p === 'pk') c.pk = true;
    else if (p === 'null') c.nullable = true;
    else if (p.startsWith('fk=')) {
      const [table, column] = p.slice(3).split('.');
      c.fk = { table, column };
    }
  }
  return c;
}

export function table(name: string, description: string, columns: string[], rows: Cell[][]): TableDef {
  return { name, description, columns: columns.map(col), rows };
}

export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rng>;

export const FIRST_NAMES = [
  'Andrea', 'Mateo', 'Camila', 'Santiago', 'Valentina', 'Sebastián', 'Isabella', 'Nicolás', 'Mariana', 'Samuel',
  'Gabriela', 'Daniel', 'Sofía', 'Alejandro', 'Lucía', 'Felipe', 'Daniela', 'Julián', 'Paula', 'Emilio',
  'Carolina', 'Martín', 'Juliana', 'Esteban', 'Natalia', 'Ricardo', 'Laura', 'Diego', 'Catalina', 'Andrés',
  'Manuela', 'Joaquín', 'Ximena', 'Tomás', 'Renata', 'Gonzalo', 'Antonia', 'Hernán', 'Elena', 'Rafael',
  'Victoria', 'Fabián', 'Adriana', 'Óscar', 'Pilar', 'Gustavo', 'Teresa', 'Mauricio', 'Beatriz', 'Arturo',
];
export const LAST_NAMES = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Castillo', 'Jiménez',
  'Vargas', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Castro', 'Ruiz', 'Álvarez', 'Mendoza', 'Silva',
  'Rojas', 'Navarro', 'Cabrera', 'Molina', 'Suárez', 'Delgado', 'Guerrero', 'Peña', 'Ríos', 'Vega',
  'Soto', 'Campos', 'Fuentes', 'Acosta', 'Luna', 'Cárdenas', 'Pineda', 'Salinas', 'Benítez', 'Arango',
];

/** Genera nombres únicos evitando apellidos reservados para personajes principales. */
export function namePool(r: Rng, count: number, excludeLast: string[] = []): { nombre: string; apellido: string }[] {
  const out: { nombre: string; apellido: string }[] = [];
  const used = new Set<string>();
  const lasts = LAST_NAMES.filter((l) => !excludeLast.includes(l));
  let guard = 0;
  while (out.length < count && guard++ < 10000) {
    const n = r.pick(FIRST_NAMES);
    const a = r.pick(lasts);
    const k = n + ' ' + a;
    if (used.has(k)) continue;
    used.add(k);
    out.push({ nombre: n, apellido: a });
  }
  return out;
}

export const pad = (n: number, w = 2) => String(n).padStart(w, '0');
/** Minutos desde 00:00 → "HH:MM:00" */
export const hm = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}:00`;
export const ts = (date: string, mins: number) => `${date} ${hm(mins)}`;
export const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
};
