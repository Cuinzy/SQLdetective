// Rangos y logros (sin secretos: se puede usar en el cliente y en el servidor).

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  glyph: string; // nombre del ícono pixel
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'tutorial', title: 'Credencial en regla', description: 'Completaste el entrenamiento de cadetes.', glyph: 'badge' },
  { id: 'primera_consulta', title: 'Primera pregunta a la base', description: 'Tu primera consulta válida contabilizada en un caso.', glyph: 'terminal' },
  { id: 'diez_seguidas', title: 'Pulso firme', description: 'Diez consultas consecutivas ejecutadas sin errores.', glyph: 'streak' },
  { id: 'inner_join', title: 'Hilo rojo', description: 'Tu primera consulta con INNER JOIN.', glyph: 'link' },
  { id: 'left_join', title: 'Lo que falta también habla', description: 'Tu primera consulta con LEFT JOIN.', glyph: 'left' },
  { id: 'right_join', title: 'Mirar desde el otro lado', description: 'Tu primera consulta con RIGHT JOIN.', glyph: 'right' },
  { id: 'agrupador', title: 'Patrones en la multitud', description: 'Usaste GROUP BY junto con HAVING.', glyph: 'group' },
  { id: 'primer_caso', title: 'Caso cerrado', description: 'Resolviste tu primer caso.', glyph: 'stamp' },
  { id: 'sin_errores', title: 'Acusación impecable', description: 'Resolviste un caso sin acusaciones fallidas.', glyph: 'target' },
  { id: 'pocas_pistas', title: 'Olfato propio', description: 'Resolviste un caso usando 3 ayudas o menos.', glyph: 'nose' },
  { id: 'coleccionista', title: 'Expediente completo', description: 'Descubriste todas las evidencias de un caso.', glyph: 'folder' },
  { id: 'cinco_casos', title: 'Veterano del archivo', description: 'Resolviste cinco casos.', glyph: 'five' },
  { id: 'quince_casos', title: 'Leyenda de Ciudad Bruma', description: 'Resolviste los quince casos.', glyph: 'crown' },
];

export interface RankInput {
  tutorialDone: boolean;
  solved: number;
  solvedLevel2: number;
  solvedLevel3: number;
}

export const RANKS = [
  { id: 'cadete', title: 'Cadete', requirement: 'Registrarte en la agencia.' },
  { id: 'novato', title: 'Investigador novato', requirement: 'Completar el entrenamiento o resolver un caso.' },
  { id: 'detective', title: 'Detective', requirement: 'Resolver 2 casos.' },
  { id: 'inspector', title: 'Inspector', requirement: 'Resolver 4 casos, al menos 1 de nivel II.' },
  { id: 'experto', title: 'Investigador experto', requirement: 'Resolver 7 casos, al menos 2 de nivel II.' },
  { id: 'elite', title: 'Detective élite', requirement: 'Resolver 10 casos, al menos 2 de nivel III.' },
  { id: 'comisario', title: 'Comisario de investigación', requirement: 'Resolver los 15 casos.' },
] as const;

export function computeRank(r: RankInput): number {
  if (r.solved >= 15) return 6;
  if (r.solved >= 10 && r.solvedLevel3 >= 2) return 5;
  if (r.solved >= 7 && r.solvedLevel2 >= 2) return 4;
  if (r.solved >= 4 && r.solvedLevel2 >= 1) return 3;
  if (r.solved >= 2) return 2;
  if (r.solved >= 1 || r.tutorialDone) return 1;
  return 0;
}

export const LEVEL_NAMES: Record<number, string> = {
  0: 'Entrenamiento',
  1: 'Nivel I · Detective novato',
  2: 'Nivel II · Detective experimentado',
  3: 'Nivel III · Investigador élite',
};
