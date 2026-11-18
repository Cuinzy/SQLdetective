// Análisis estructural de SQL (AST) — primera línea de defensa y fuente del análisis pedagógico.
// La segunda línea es PostgreSQL: rol de solo lectura por caso, transacción READ ONLY, statement_timeout.
import { parse, toSql, type Statement } from 'pgsql-ast-parser';
import { createHash } from 'node:crypto';
import type { Feature } from '@/cases/types';

export const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max', 'string_agg', 'array_agg', 'bool_and', 'bool_or', 'every']);

/** Funciones permitidas en la terminal. Cualquier otra se rechaza (lista blanca). */
export const ALLOWED_FUNCTIONS = new Set([
  ...AGGREGATES,
  'upper', 'lower', 'length', 'char_length', 'character_length', 'trim', 'ltrim', 'rtrim', 'btrim',
  'substring', 'substr', 'concat', 'concat_ws', 'replace', 'left', 'right', 'position', 'strpos',
  'initcap', 'lpad', 'rpad', 'split_part', 'reverse', 'starts_with',
  'coalesce', 'nullif', 'greatest', 'least',
  'round', 'ceil', 'ceiling', 'floor', 'abs', 'trunc', 'mod', 'power', 'sqrt', 'sign',
  'extract', 'date_part', 'date_trunc', 'to_char', 'to_date', 'age', 'make_date', 'make_time',
  'now', 'current_date', 'current_time', 'current_timestamp',
  'row_number', 'rank', 'dense_rank', 'lag', 'lead', 'first_value', 'last_value', 'ntile',
]);

const FORBIDDEN_SCHEMAS = new Set(['pg_catalog', 'information_schema', 'game', 'public', 'pg_toast']);
const QUERY_TYPES = new Set(['select', 'union', 'union all', 'intersect', 'intersect all', 'except', 'except all', 'with', 'with recursive']);
const READ_STATEMENTS = new Set(['select', 'union', 'union all', 'intersect', 'intersect all', 'except', 'except all', 'with', 'values']);

export type AnalysisErrorCode =
  | 'empty' | 'too_long' | 'syntax' | 'multiple' | 'not_select' | 'forbidden_table' | 'forbidden_schema'
  | 'forbidden_function' | 'parameter' | 'locking' | 'table_function';

export class SqlRejected extends Error {
  constructor(public code: AnalysisErrorCode, message: string, public hint?: string) {
    super(message);
  }
}

export interface SqlAnalysis {
  statementType: string;
  tables: string[]; // tablas del caso utilizadas (sin duplicados, minúsculas)
  features: Feature[];
  functions: string[];
  hasColumnRef: boolean;
  normalized: string;
  normalizedHash: string;
  templateHash: string;
  shapeHash: string;
}

export const MAX_SQL_LENGTH = 4000;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

type AnyNode = Record<string, unknown>;

function walk(
  node: unknown,
  visit: (n: AnyNode, parentKey: string | null, parent: AnyNode | null) => void,
  parentKey: string | null = null,
  parent: AnyNode | null = null,
) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, parentKey, parent);
    return;
  }
  if (node && typeof node === 'object') {
    const n = node as AnyNode;
    visit(n, parentKey, parent);
    for (const [k, v] of Object.entries(n)) {
      if (v && typeof v === 'object') walk(v, visit, k, n);
    }
  }
}

const LITERAL_TYPES = new Set(['string', 'integer', 'numeric', 'boolean', 'constant']);

function templatize<T>(ast: T): T {
  const clone = JSON.parse(JSON.stringify(ast));
  const replace = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(replace);
    if (node && typeof node === 'object') {
      const n = node as AnyNode;
      if (typeof n.type === 'string' && LITERAL_TYPES.has(n.type)) return { type: 'parameter', name: '$x' };
      const out: AnyNode = {};
      for (const [k, v] of Object.entries(n)) out[k] = replace(v);
      return out;
    }
    return node;
  };
  return replace(clone) as T;
}

function stripAliases(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripAliases);
  if (node && typeof node === 'object') {
    const out: AnyNode = {};
    for (const [k, v] of Object.entries(node as AnyNode)) {
      if (k === 'alias') continue;
      out[k] = stripAliases(v);
    }
    return out;
  }
  return node;
}

/** Detecta palabras clave mal escritas para dar mensajes útiles. */
const TYPO_MAP: Record<string, string> = {
  form: 'FROM', fom: 'FROM', frm: 'FROM', fron: 'FROM', selct: 'SELECT', slect: 'SELECT', selec: 'SELECT', seletc: 'SELECT',
  were: 'WHERE', wher: 'WHERE', whre: 'WHERE', whe: 'WHERE', oder: 'ORDER', ordr: 'ORDER', gruop: 'GROUP', grup: 'GROUP',
  havng: 'HAVING', having_: 'HAVING', jion: 'JOIN', joni: 'JOIN', inerr: 'INNER', iner: 'INNER', lefth: 'LEFT', rigth: 'RIGHT', rihgt: 'RIGHT',
  betwen: 'BETWEEN', betwee: 'BETWEEN', distint: 'DISTINCT', disctinct: 'DISTINCT', lik: 'LIKE', limt: 'LIMIT',
};

export function syntaxHelp(sql: string, rawMessage: string): { message: string; hint: string } {
  const m = /line (\d+) col (\d+)/i.exec(rawMessage);
  const tok = /Unexpected [\w ]*token: "([^"]*)"/i.exec(rawMessage)?.[1];
  const where = m ? ` (línea ${m[1]}, columna ${m[2]})` : '';
  const words = sql.toLowerCase().match(/[a-zñáéíóú_]+/g) ?? [];
  const typo = words.find((w) => TYPO_MAP[w]);
  let hint = 'Revisa el orden de las cláusulas: SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY.';
  const singleQuotes = (sql.match(/'/g) ?? []).length;
  const opens = (sql.match(/\(/g) ?? []).length;
  const closes = (sql.match(/\)/g) ?? []).length;
  if (typo) hint = `¿Quisiste escribir ${TYPO_MAP[typo]} en lugar de «${typo.toUpperCase()}»?`;
  else if (singleQuotes % 2 === 1) hint = 'Hay una comilla simple sin cerrar. Los textos se escriben entre comillas simples: \'así\'.';
  else if (opens !== closes) hint = 'Los paréntesis no están balanceados: cada ( necesita su ).';
  else if (/"[^"]*"/.test(sql) && /=\s*"/.test(sql)) hint = 'En SQL los textos van entre comillas simples (\'texto\'). Las comillas dobles se usan para nombres de columnas.';
  else if (/,\s*(from|where)\b/i.test(sql)) hint = 'Sobra una coma antes de FROM o WHERE.';
  else if (/\bselect\s+from\b/i.test(sql)) hint = 'Falta indicar qué columnas quieres ver entre SELECT y FROM (o usa *).';
  else if (/\bwhere\b[\s\S]*\bwhere\b/i.test(sql) && !/\(\s*select/i.test(sql)) hint = 'Solo puede haber un WHERE por consulta: combina condiciones con AND u OR.';
  else if (/\border\s+(?!by)/i.test(sql)) hint = 'ORDER necesita BY: ORDER BY columna.';
  else if (/\bgroup\s+(?!by)/i.test(sql)) hint = 'GROUP necesita BY: GROUP BY columna.';
  else if (/\bhaving\b/i.test(sql) && !/\bgroup\s+by\b/i.test(sql)) hint = 'HAVING filtra grupos: normalmente va después de GROUP BY.';
  else if (/\bjoin\b/i.test(sql) && !/\b(on|using)\b/i.test(sql)) hint = 'Cada JOIN necesita una condición ON que indique cómo se relacionan las tablas.';
  return { message: `Error de sintaxis${tok ? ` cerca de «${tok}»` : ''}${where}.`, hint };
}

export function analyzeSql(rawSql: string, opts: { schema: string; tables: string[] }): SqlAnalysis {
  const sql = rawSql.trim();
  if (!sql) throw new SqlRejected('empty', 'La consulta está vacía.', 'Escribe una consulta que comience con SELECT.');
  if (sql.length > MAX_SQL_LENGTH) throw new SqlRejected('too_long', `La consulta supera el máximo de ${MAX_SQL_LENGTH} caracteres.`);

  let statements: Statement[];
  try {
    statements = parse(sql);
  } catch (e) {
    const { message, hint } = syntaxHelp(sql, (e as Error).message ?? '');
    throw new SqlRejected('syntax', message, hint);
  }
  if (statements.length === 0) throw new SqlRejected('empty', 'La consulta está vacía.');
  if (statements.length > 1)
    throw new SqlRejected('multiple', 'Solo se permite una consulta por ejecución.', 'Elimina el punto y coma intermedio y ejecuta cada consulta por separado.');

  const ast = statements[0];
  if (!READ_STATEMENTS.has(ast.type))
    throw new SqlRejected(
      'not_select',
      'La terminal de la agencia es de solo lectura: solo se permiten consultas SELECT.',
      'Los registros del caso son evidencia oficial y no pueden modificarse. Usa SELECT para consultarlos.',
    );

  const caseTables = new Set(opts.tables.map((t) => t.toLowerCase()));
  const schema = opts.schema.toLowerCase();
  const cteNames = new Set<string>();
  walk(ast, (n) => {
    if (n.type === 'with' || n.type === 'with recursive') {
      for (const b of (n.bind as { alias: { name: string } }[]) ?? []) cteNames.add(b.alias.name.toLowerCase());
    }
  });

  const tables = new Set<string>();
  const features = new Set<Feature>(['select']);
  const functions = new Set<string>();
  let hasColumnRef = false;

  walk(ast, (n, parentKey, parent) => {
    const t = n.type as string | undefined;
    // Tablas en FROM / JOIN
    if (t === 'table' && n.name && typeof n.name === 'object') {
      const nm = n.name as { name: string; schema?: string; alias?: string };
      const tname = nm.name;
      if (nm.schema !== undefined) {
        const s = nm.schema.toLowerCase();
        if (s !== schema) {
          if (FORBIDDEN_SCHEMAS.has(s) || s.startsWith('pg_'))
            throw new SqlRejected('forbidden_schema', 'Los catálogos internos del sistema no forman parte del expediente.', 'Consulta el explorador de esquemas para ver las tablas disponibles.');
          throw new SqlRejected('forbidden_schema', `El esquema «${nm.schema}» no pertenece a este caso.`, 'Solo puedes consultar las tablas de la investigación activa.');
        }
      }
      if (!(nm.schema === undefined && cteNames.has(tname.toLowerCase()))) {
        if (!caseTables.has(tname)) {
          if (tname.startsWith('pg_') || tname.startsWith('information_schema'))
            throw new SqlRejected('forbidden_table', 'Los catálogos internos del sistema no forman parte del expediente.', 'Consulta el explorador de esquemas para ver las tablas disponibles.');
          const lower = tname.toLowerCase();
          throw new SqlRejected(
            'forbidden_table',
            `La tabla «${tname}» no existe en este expediente.`,
            caseTables.has(lower)
              ? `Escribe el nombre sin comillas dobles ni mayúsculas: ${lower}.`
              : `Revisa el explorador de esquemas. ${suggest(lower, [...caseTables]) ? `¿Quisiste decir «${suggest(lower, [...caseTables])}»?` : ''}`.trim(),
          );
        }
        tables.add(tname);
      }
      const join = n.join as { type?: string } | undefined;
      if (join?.type) addJoin(features, join.type);
      if (nm.alias) features.add('alias');
    }
    if (t === 'statement' && parentKey === 'from') {
      const join = n.join as { type?: string } | undefined;
      if (join?.type) addJoin(features, join.type);
    }
    if (t === 'call' && parentKey === 'from')
      throw new SqlRejected('table_function', 'No se permiten funciones en la cláusula FROM.', 'Usa las tablas del expediente en FROM.');
    if (t === 'call') {
      const fn = n.function as { name: string; schema?: string };
      const name = fn.name.toLowerCase();
      if (fn.schema !== undefined || !ALLOWED_FUNCTIONS.has(name))
        throw new SqlRejected(
          'forbidden_function',
          `La función «${fn.schema ? fn.schema + '.' : ''}${fn.name}» no está disponible en la terminal.`,
          'Puedes usar funciones de agregación (COUNT, SUM, AVG, MIN, MAX) y funciones de texto o fecha comunes. Consulta la referencia SQL.',
        );
      functions.add(name);
      features.add('function');
      if (AGGREGATES.has(name)) {
        features.add('aggregate');
        if (['count', 'sum', 'avg', 'min', 'max'].includes(name)) features.add(name as Feature);
      }
      if (n.distinct === 'distinct') features.add('distinct');
    }
    if (t === 'extract') {
      functions.add('extract');
      features.add('function');
    }
    if (t === 'parameter') throw new SqlRejected('parameter', 'La consulta no puede contener parámetros ($1, $2…).', 'Escribe los valores directamente en la consulta.');
    if (t === 'ref') {
      hasColumnRef = true;
      const tb = n.table as { schema?: string } | undefined;
      if (tb?.schema !== undefined && tb.schema.toLowerCase() !== schema)
        throw new SqlRejected('forbidden_schema', 'Solo puedes consultar las tablas de la investigación activa.');
    }
    if (t === 'select') {
      if (n.for) throw new SqlRejected('locking', 'Las consultas de bloqueo (FOR UPDATE/SHARE) no están permitidas.');
      if (n.where) features.add('where');
      if (Array.isArray(n.groupBy) && n.groupBy.length) features.add('group_by');
      if (n.having) features.add('having');
      if (Array.isArray(n.orderBy) && n.orderBy.length) features.add('order_by');
      if (n.limit) features.add('limit');
      if (n.distinct === 'distinct' || Array.isArray(n.distinct)) features.add('distinct');
      const from = n.from as unknown[] | undefined;
      if (Array.isArray(from) && from.length > 1 && from.slice(1).some((f) => !(f as AnyNode).join)) features.add('implicit_join');
      for (const c of (n.columns as { alias?: unknown }[] | undefined) ?? []) if (c.alias) features.add('alias');
    }
    if (t && QUERY_TYPES.has(t) && parent) {
      const parentIsSetOp = typeof parent.type === 'string' && QUERY_TYPES.has(parent.type as string) && parent.type !== 'select';
      const isCteBody = parentKey === 'statement' && parent.type === undefined;
      const isWithBody = parentKey === 'in' && (parent.type === 'with' || parent.type === 'with recursive');
      if (!parentIsSetOp && !isCteBody && !isWithBody) features.add('subquery');
    }
    if (t && t.startsWith('union')) features.add('union');
    if (t === 'intersect' || t === 'except' || t === 'intersect all' || t === 'except all') features.add('union');
    if (t === 'with' || t === 'with recursive') features.add('cte');
    if (t === 'case') features.add('case');
    if (t === 'binary') {
      const op = String(n.op).toUpperCase();
      if (op === 'AND') features.add('and');
      else if (op === 'OR') features.add('or');
      else if (op.includes('LIKE') || op === '~~' || op === '~~*') {
        features.add('like');
        if (op.startsWith('NOT')) features.add('not');
      } else if (op === 'IN' || op === 'NOT IN') {
        features.add('in');
        if (op === 'NOT IN') features.add('not');
      } else if (['=', '<>', '!=', '>', '<', '>=', '<='].includes(op)) features.add('comparison');
    }
    if (t === 'ternary') {
      features.add('between');
      if (String(n.op).toUpperCase().startsWith('NOT')) features.add('not');
    }
    if (t === 'unary') {
      const op = String(n.op).toUpperCase();
      if (op === 'NOT') features.add('not');
      if (op.includes('NULL')) {
        features.add('is_null');
        if (op.includes('NOT')) features.add('not');
      }
    }
  });

  const normalized = toSql.statement(ast).replace(/\s+/g, ' ').trim();
  const template = templatize(ast);
  const templateSql = toSql.statement(template).replace(/\s+/g, ' ').trim();
  let shapeSource: unknown = template;
  if (template.type === 'select') {
    const s = template as unknown as AnyNode;
    shapeSource = { from: s.from, where: s.where, groupBy: s.groupBy, having: s.having };
  }

  return {
    statementType: ast.type,
    tables: [...tables].sort(),
    features: [...features].sort() as Feature[],
    functions: [...functions].sort(),
    hasColumnRef,
    normalized,
    normalizedHash: sha(normalized),
    templateHash: sha(templateSql),
    shapeHash: sha(JSON.stringify(stripAliases(shapeSource))),
  };
}

function addJoin(features: Set<Feature>, type: string) {
  features.add('join');
  const t = type.toUpperCase();
  if (t.startsWith('INNER')) features.add('inner_join');
  else if (t.startsWith('LEFT')) features.add('left_join');
  else if (t.startsWith('RIGHT')) features.add('right_join');
  else if (t.startsWith('FULL')) features.add('full_join');
  else if (t.startsWith('CROSS')) features.add('cross_join');
  else features.add('inner_join');
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function suggest(word: string, options: string[]): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const o of options) {
    const d = levenshtein(word.toLowerCase(), o.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (best === null) return null;
  return bestD <= Math.max(2, Math.floor(best.length / 3)) ? best : null;
}

/** Categorías pedagógicas para el panel docente, derivadas del análisis real de las sentencias. */
export const CONCEPT_GROUPS: { id: string; label: string; features: Feature[] }[] = [
  { id: 'filtros', label: 'SELECT y filtros', features: ['where', 'comparison', 'like', 'in', 'between', 'order_by', 'distinct', 'is_null', 'limit'] },
  { id: 'logicos', label: 'Operadores lógicos', features: ['and', 'or', 'not'] },
  { id: 'agregacion', label: 'Funciones de agregación', features: ['aggregate', 'count', 'sum', 'avg', 'min', 'max', 'group_by', 'having'] },
  { id: 'inner', label: 'INNER JOIN', features: ['inner_join'] },
  { id: 'left', label: 'LEFT JOIN', features: ['left_join'] },
  { id: 'right', label: 'RIGHT JOIN', features: ['right_join'] },
  { id: 'otras', label: 'Otras construcciones', features: ['subquery', 'cte', 'union', 'case', 'full_join', 'cross_join', 'implicit_join'] },
];
