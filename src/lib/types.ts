// Tipos compartidos entre cliente y servidor (sin datos secretos).
import type { Look } from '@/cases/types';

export type { Look };

export interface PublicColumn {
  name: string;
  type: string;
  pk: boolean;
  fk: { table: string; column: string } | null;
  nullable: boolean;
  description: string;
}
export interface PublicTable {
  name: string;
  description: string;
  rowCount: number;
  columns: PublicColumn[];
}
export interface PublicQuestion {
  id: string;
  text: string;
  asked: boolean;
  answer?: string;
  contradiction?: boolean;
  isNew: boolean;
}
export interface PublicCharacter {
  id: string;
  name: string;
  role: string;
  age?: number;
  bio: string;
  statement: string;
  suspect: boolean;
  look: Look;
  questions: PublicQuestion[];
  lockedQuestions: number;
  accused?: 'correcto' | 'incorrecto';
}
export interface PublicHint {
  id: string;
  title: string;
  evidence?: string;
  levelsUsed: number;
  texts: string[];
  confirmed: boolean;
}
export interface PublicEvidence {
  id: string;
  title: string;
  description: string;
  key: boolean;
  querySeq: number | null;
  foundAt: string;
}
export interface PublicObjective {
  id: string;
  title: string;
  description: string;
  done: boolean;
  found: number;
  need: number;
  total: number;
  tables: string[];
}
export interface PublicStep {
  id: string;
  title: string;
  lesson: string[];
  task: string;
  example?: string;
  done: boolean;
}
export interface QuerySummary {
  seq: number;
  sql: string;
  executedAt: string;
  syntaxValid: boolean;
  executed: boolean;
  counted: boolean;
  rejectReason: string | null;
  errorMessage: string | null;
  errorHint: string | null;
  tables: string[];
  features: string[];
  rowCount: number | null;
  evidence: string[];
}
export interface GateView {
  requiredQueries: number;
  validQueries: number;
  keyFound: number;
  keyRequired: number;
  objectivesDone: number;
  objectivesRequired: number;
  needsNewEvidence: boolean;
  unlocked: boolean;
  reasons: string[];
  minSupportingEvidence: number;
}
export interface Resolution {
  culpritId: string;
  culpritName: string;
  motive: string;
  opportunity: string;
  method: string;
  justification: string;
  reveal: string[];
}
export interface InvestigationView {
  id: string;
  code: string;
  status: 'en_proceso' | 'resuelto' | 'no_resuelto';
  startedAt: string;
  finishedAt: string | null;
  serverNow: string;
  stats: { total: number; valid: number; invalid: number; failedAccusations: number; hintsUsed: number };
  gate: GateView;
  accusations: { suspectId: string; correct: boolean; at: string }[];
  case: {
    id: number;
    code: string;
    title: string;
    level: number;
    tagline: string;
    location: string;
    date: string;
    scene: string;
    briefing: string[];
    timeline: { time: string; event: string }[];
    concepts: string[];
    tables: PublicTable[];
    evidenceTotal: number;
  };
  characters: PublicCharacter[];
  objectives: PublicObjective[];
  hints: PublicHint[];
  hintsLocked: number;
  evidence: PublicEvidence[];
  notes: { character: string; text: string }[];
  steps?: PublicStep[];
  queries: QuerySummary[];
  resolution?: Resolution;
}
export interface QueryResponse {
  query: QuerySummary;
  columns: string[];
  rows: unknown[][];
  truncated: boolean;
  durationMs: number | null;
  newEvidence: PublicEvidence[];
  newAchievements: { id: string; title: string }[];
  objectivesTouched: string[];
  view: InvestigationView;
}
export interface CaseSummary {
  id: number;
  code: string;
  title: string;
  level: number;
  tagline: string;
  location: string;
  date: string;
  scene: string;
  concepts: string[];
  tables: number;
  suspects: number;
  rows: number;
}
export interface PlayerOverview {
  player: { id: string; fullName: string; group: string; studentCode: string | null; badge: string; createdAt: string };
  rank: number;
  achievements: { id: string; unlockedAt: string }[];
  investigations: {
    id: string;
    caseId: number;
    code: string;
    status: string;
    solved: boolean;
    validQueries: number;
    startedAt: string;
    finishedAt: string | null;
  }[];
  cases: CaseSummary[];
}
