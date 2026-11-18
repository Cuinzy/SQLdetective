// Tipos de definición de casos. Estos módulos contienen soluciones: SOLO deben importarse desde código de servidor.

export type ColType = 'integer' | 'text' | 'numeric' | 'date' | 'time' | 'timestamp' | 'boolean';
export type Cell = string | number | boolean | null;

export interface ColumnDef {
  name: string;
  type: ColType;
  pk?: boolean;
  fk?: { table: string; column: string };
  nullable?: boolean;
  description: string;
}

export interface TableDef {
  name: string;
  description: string;
  columns: ColumnDef[];
  rows: Cell[][];
}

/** Apariencia de un retrato pixel art (todos los campos opcionales; se derivan del id si faltan). */
export interface Look {
  skin?: number; // 0..5
  hair?: 'corto' | 'largo' | 'rizado' | 'calvo' | 'coleta' | 'flequillo' | 'mohicano' | 'mono' | 'canoso';
  hairColor?: number; // 0..7
  facial?: 'ninguno' | 'barba' | 'bigote' | 'perilla';
  accessory?: 'ninguno' | 'gafas' | 'gafas_sol' | 'sombrero' | 'gorra' | 'aretes' | 'parche' | 'auriculares' | 'boina';
  outfit?: number; // 0..7
  outfitStyle?: 'traje' | 'bata' | 'uniforme' | 'sueter' | 'chaqueta' | 'camisa';
  bg?: number; // 0..5
  age?: 'joven' | 'adulto' | 'mayor';
}

export interface QuestionDef {
  id: string;
  text: string;
  answer: string;
  /** Evidencias (ids) que deben haberse descubierto mediante SQL para habilitar la pregunta. */
  requires?: string[];
  /** Preguntas previas (formato personaje:pregunta) necesarias. */
  requiresQuestions?: string[];
  /** Marca la respuesta como contradicción con los registros. */
  contradiction?: boolean;
  /** Nota que se agrega al diario de investigación. */
  note?: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  age?: number;
  bio: string;
  statement: string;
  suspect: boolean;
  look: Look;
  questions: QuestionDef[];
}

/** Lista de "agujas": todas deben aparecer en la MISMA fila del resultado. */
export type RowNeedles = string[];

export type Feature =
  | 'select' | 'where' | 'and' | 'or' | 'not' | 'like' | 'in' | 'between' | 'comparison'
  | 'order_by' | 'distinct' | 'limit' | 'is_null' | 'alias'
  | 'aggregate' | 'count' | 'sum' | 'avg' | 'min' | 'max'
  | 'group_by' | 'having'
  | 'join' | 'inner_join' | 'left_join' | 'right_join' | 'full_join' | 'cross_join' | 'implicit_join'
  | 'subquery' | 'cte' | 'union' | 'case' | 'function';

export interface EvidenceMatch {
  /** Basta con que alguna alternativa coincida con alguna fila. */
  any?: RowNeedles[];
  /** Cada alternativa debe coincidir con alguna fila. */
  all?: RowNeedles[];
  /** El resultado debe estar acotado: máximo de filas permitido. */
  maxRows?: number;
  minRows?: number;
  /** Máximo de columnas (para enseñar a seleccionar columnas concretas). */
  maxColumns?: number;
  /** Construcciones SQL obligatorias para considerar descubierta la evidencia. */
  features?: Feature[];
  /** Al menos una de estas construcciones. */
  anyFeature?: Feature[];
}

export interface EvidenceDef {
  id: string;
  title: string;
  /** Texto que se muestra en el diario cuando la evidencia es descubierta. */
  description: string;
  match: EvidenceMatch;
  /** Evidencia fundamental para habilitar acusaciones. */
  key?: boolean;
  /** Consulta de referencia (no se envía al navegador): usada en pruebas automáticas. */
  reference: string;
  implicates?: string[];
  clears?: string[];
}

export interface ObjectiveDef {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  /** Cuántas evidencias del objetivo se necesitan (por defecto todas). */
  need?: number;
  /** Tablas que se relacionan con esta línea de investigación. */
  tables: string[];
}

export interface HintDef {
  id: string;
  title: string;
  /** Evidencia hacia la que orienta (se marca como confirmada al descubrirla). */
  evidence?: string;
  requires?: { evidence?: string[]; questions?: string[] };
  levels: [string, string, string];
}

export interface SolutionDef {
  culprit: string;
  motive: string;
  opportunity: string;
  method: string;
  justification: string;
  /** Para cada sospechoso inocente: evidencias que lo descartan y explicación coherente. */
  eliminations: Record<string, { evidence: string[]; explanation: string }>;
  /** Evidencias que incriminan al culpable. */
  incriminating: string[];
  reveal: string[];
}

export interface TutorialStep {
  id: string;
  title: string;
  lesson: string[];
  task: string;
  example?: string;
  evidence: string;
}

export interface CaseDef {
  id: number;
  code: string;
  title: string;
  level: 0 | 1 | 2 | 3;
  tagline: string;
  location: string;
  date: string;
  scene: 'museo' | 'biblioteca' | 'laboratorio' | 'hotel' | 'servidor' | 'festival' | 'calle' | 'archivo' | 'tren' | 'oficina' | 'red' | 'puerto' | 'proyecto' | 'noche' | 'maestro' | 'tutorial';
  briefing: string[];
  timeline: { time: string; event: string }[];
  concepts: string[];
  tables: TableDef[];
  characters: CharacterDef[];
  evidence: EvidenceDef[];
  objectives: ObjectiveDef[];
  hints: HintDef[];
  accusation: { minKeyEvidence: number; minObjectives: number; minQueries?: number; penalty?: number; minSupportingEvidence?: number };
  solution: SolutionDef;
  /** Consultas de referencia adicionales (útiles para verificar que existen ≥ 20 consultas con información distinta). */
  references: { title: string; sql: string }[];
  tutorial?: TutorialStep[];
}
