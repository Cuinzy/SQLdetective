import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 3 — El laboratorio alterado
// Culpable: Camilo Ferro (técnico, id 4). Su contrato no fue renovado por la Dra. Paredes.
// La madrugada del 3 de julio entró por huella al laboratorio L2 (01:52), inició sesión con su propia cuenta
// en la estación E-4 (01:55), adivinó la contraseña de «aparedes» (02:03) y alteró 6 resultados (02:05–02:22).
// Paredes estaba en Lisboa.

const R = rng(303);
const EXCL = ['Ferro', 'Paredes', 'Villalba', 'Quiñones', 'Salcedo'];
const fill = namePool(R, 7, EXCL);
const u = (n: { nombre: string; apellido: string }) => (n.nombre[0] + n.apellido).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const personalRows: Cell[][] = [
  [1, 'Adriana', 'Paredes', 'Investigadora principal', 'aparedes', 'Genética vegetal'],
  [2, 'Ernesto', 'Villalba', 'Investigador principal', 'evillalba', 'Fisiología'],
  [3, fill[0].nombre, fill[0].apellido, 'Investigador asociado', u(fill[0]), 'Fisiología'],
  [4, 'Camilo', 'Ferro', 'Técnico de laboratorio', 'cferro', 'Genética vegetal'],
  [5, 'Lorena', 'Quiñones', 'Doctoranda', 'lquinones', 'Genética vegetal'],
  [6, 'Gilberto', 'Salcedo', 'Vigilante nocturno', 'gsalcedo', 'Seguridad'],
  [7, fill[1].nombre, fill[1].apellido, 'Técnica de laboratorio', u(fill[1]), 'Fisiología'],
  [8, fill[2].nombre, fill[2].apellido, 'Doctorando', u(fill[2]), 'Fisiología'],
  [9, fill[3].nombre, fill[3].apellido, 'Investigadora asociada', u(fill[3]), 'Genética vegetal'],
  [10, fill[4].nombre, fill[4].apellido, 'Técnico de bioinformática', u(fill[4]), 'Bioinformática'],
  [11, fill[5].nombre, fill[5].apellido, 'Investigador principal', u(fill[5]), 'Bioinformática'],
  [12, fill[6].nombre, fill[6].apellido, 'Doctoranda', u(fill[6]), 'Bioinformática'],
];
const personal = table('personal', 'Personal del Instituto de Biotecnología Bruma.', [
  'id_personal:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'usuario:text|Usuario del sistema de resultados',
  'grupo:text|Grupo de investigación',
], personalRows);
const users = personalRows.map((r) => r[4] as string);

const estaciones = table('estaciones', 'Terminales del sistema de resultados.', [
  'codigo:text:pk|Código de la estación',
  'sala:text|Sala donde está instalada',
  'descripcion:text|Descripción',
], [
  ['E-1', 'L1', 'Laboratorio de fisiología, mesa central'],
  ['E-2', 'L1', 'Laboratorio de fisiología, junto a la campana'],
  ['E-3', 'L3', 'Sala de análisis, puesto 1'],
  ['E-4', 'L2', 'Laboratorio de cultivos, junto a la cámara de germinación'],
  ['E-5', 'L2', 'Laboratorio de cultivos, entrada'],
  ['E-6', 'L3', 'Sala de análisis, puesto 2'],
]);

// Muestras y resultados
const exps = [
  { code: 'RZ', exp: 'Proyecto Raíz (resistencia a sequía)', resp: 1 },
  { code: 'FL', exp: 'Floración temprana', resp: 2 },
  { code: 'BX', exp: 'Biomarcadores de estrés', resp: 11 },
];
const muestrasRows: Cell[][] = [];
const resultadosRows: Cell[][] = [];
let rid = 1;
let mid = 1;
for (const e of exps) {
  for (let i = 1; i <= 12; i++) {
    const id = mid++;
    muestrasRows.push([id, `${e.code}-${String(i).padStart(3, '0')}`, e.exp, R.pick(['semilla', 'plántula', 'hoja']), `2025-06-${String(R.int(2, 20)).padStart(2, '0')}`, e.resp]);
    for (const med of ['germinacion_pct', 'humedad_pct', 'longitud_raiz_mm']) {
      const v = med === 'germinacion_pct' ? R.int(780, 960) / 10 : med === 'humedad_pct' ? R.int(300, 650) / 10 : R.int(120, 480) / 10;
      resultadosRows.push([rid++, id, med, v, `2025-06-${String(R.int(21, 30)).padStart(2, '0')}`]);
    }
  }
}
// Alteraciones: germinación de RZ-002, 004, 005, 008, 010, 011
const altered = [2, 4, 5, 8, 10, 11].map((n) => resultadosRows.find((r) => r[1] === n && r[2] === 'germinacion_pct')!);
const nightEdits: Cell[][] = altered.map((r, i) => {
  const prev = r[3] as number;
  const nuevo = Math.round((prev * 0.45 + i) * 10) / 10;
  r[3] = nuevo;
  return [r[0], 'aparedes', 'E-4', ts('2025-07-03', 125 + i * 3 + (i === 5 ? 2 : 0)), prev, nuevo, null];
});
const muestras = table('muestras', 'Muestras experimentales.', [
  'id_muestra:integer:pk|Identificador',
  'codigo:text|Código de la muestra',
  'experimento:text|Experimento al que pertenece',
  'tipo:text|Tipo de muestra',
  'fecha_recoleccion:date|Fecha de recolección',
  'responsable:integer:fk=personal.id_personal|Investigador responsable',
], muestrasRows);
const resultados = table('resultados', 'Resultados VIGENTES de cada medición (tras cualquier edición).', [
  'id_resultado:integer:pk|Identificador',
  'id_muestra:integer:fk=muestras.id_muestra|Muestra',
  'medicion:text|Variable medida',
  'valor:numeric|Valor actual',
  'fecha_registro:date|Fecha del registro original',
], resultadosRows);

const motivos = ['corrección de transcripción', 'recalibración del sensor', 'repetición de la medición', 'error de unidades'];
const dayEdits: Cell[][] = [];
for (let i = 0; i < 16; i++) {
  const r = R.pick(resultadosRows.filter((x) => !altered.includes(x)));
  const user = R.pick(users.filter((x) => !['aparedes', 'gsalcedo', 'cferro'].includes(x)));
  const st = R.pick(['E-1', 'E-2', 'E-3', 'E-5', 'E-6']);
  const prev = r[3] as number;
  const nuevo = Math.round((prev + R.int(-15, 15) / 10) * 10) / 10;
  dayEdits.push([r[0], user, st, ts(R.pick(['2025-07-01', '2025-07-02']), R.int(540, 1050)), prev, nuevo, R.pick(motivos)]);
}
dayEdits.push([resultadosRows[40][0], 'evillalba', 'E-1', ts('2025-07-02', 1030), 12.0, 12.5, 'corrección de transcripción']);
const allEdits = [...dayEdits, ...nightEdits].sort((a, b) => String(a[3]).localeCompare(String(b[3])));
const ediciones = table('ediciones', 'Auditoría: cada modificación de un resultado queda registrada.', [
  'id_edicion:integer:pk|Identificador',
  'id_resultado:integer:fk=resultados.id_resultado|Resultado modificado',
  'usuario:text|Usuario que modificó',
  'estacion:text:fk=estaciones.codigo|Estación desde la que se modificó',
  'fecha_hora:timestamp|Momento de la modificación',
  'valor_anterior:numeric|Valor antes de la edición',
  'valor_nuevo:numeric|Valor después de la edición',
  'motivo:text:null|Justificación escrita (obligatoria por protocolo)',
], allEdits.map((e, i) => [500 + i, ...e]));

// Sesiones en estaciones
const ses: [string, string, string, number, string][] = [];
for (let i = 0; i < 34; i++) {
  const user = R.pick(users.filter((x) => !['aparedes', 'gsalcedo'].includes(x)));
  const st = R.pick(['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6']);
  const d = R.pick(['2025-07-01', '2025-07-02']);
  const m = R.int(510, 1020);
  ses.push([user, st, d, m, 'inicio'], [user, st, d, m + R.int(10, 90), 'cierre']);
}
ses.push(['cferro', 'E-4', '2025-07-03', 115, 'inicio'], ['cferro', 'E-4', '2025-07-03', 117, 'cierre']);
ses.push(['aparedes', 'E-4', '2025-07-03', 119, 'fallido'], ['aparedes', 'E-4', '2025-07-03', 120, 'fallido'], ['aparedes', 'E-4', '2025-07-03', 123, 'inicio'], ['aparedes', 'E-4', '2025-07-03', 144, 'cierre']);
ses.push(['lquinones', 'E-3', '2025-07-02', 1235, 'inicio'], ['lquinones', 'E-3', '2025-07-02', 1385, 'cierre']);
ses.push(['lquinones', 'E-3', '2025-07-03', 555, 'inicio']);
ses.sort((a, b) => (a[2] + String(a[3]).padStart(5, '0')).localeCompare(b[2] + String(b[3]).padStart(5, '0')));
const sesiones = table('sesiones', 'Inicios y cierres de sesión en las estaciones.', [
  'id_sesion:integer:pk|Identificador',
  'usuario:text|Usuario',
  'estacion:text:fk=estaciones.codigo|Estación',
  'fecha_hora:timestamp|Momento del evento',
  'evento:text|inicio, cierre o fallido (contraseña incorrecta)',
], ses.map(([us, st, d, m, ev], i) => [800 + i, us, st, ts(d, m), ev]));

// Entradas biométricas y con tarjeta
const ent: [number, string, string, number, string, string][] = [];
for (const d of ['2025-07-01', '2025-07-02']) {
  for (const r of personalRows) {
    const id = r[0] as number;
    if (id === 1 || id === 6) continue; // Paredes de viaje; vigilante solo de noche
    const sala = r[5] === 'Fisiología' ? 'L1' : r[5] === 'Bioinformática' ? 'L3' : 'L2';
    const e = R.int(470, 560);
    let s = R.int(1020, 1150);
    if (id === 2 && d === '2025-07-02') s = 1180; // Villalba 19:40
    if (id === 4 && d === '2025-07-02') s = 1050; // Ferro 17:30
    ent.push([id, sala, d, e, 'entrada', 'huella'], [id, sala, d, s, 'salida', 'huella']);
  }
}
ent.push([5, 'L3', '2025-07-02', 1230, 'entrada', 'huella'], [5, 'L3', '2025-07-02', 1390, 'salida', 'huella']);
for (const d of ['2025-07-01', '2025-07-02', '2025-07-03']) {
  ent.push([6, 'L1', d, 40, 'entrada', 'tarjeta'], [6, 'L1', d, 44, 'salida', 'tarjeta']);
  ent.push([6, 'L2', d, 90, 'entrada', 'tarjeta'], [6, 'L2', d, 95, 'salida', 'tarjeta']);
  ent.push([6, 'L3', d, 170, 'entrada', 'tarjeta'], [6, 'L3', d, 174, 'salida', 'tarjeta']);
}
ent.push([4, 'L2', '2025-07-03', 112, 'entrada', 'huella'], [4, 'L2', '2025-07-03', 161, 'salida', 'huella']);
ent.push([5, 'L3', '2025-07-03', 545, 'entrada', 'huella'], [2, 'L1', '2025-07-03', 520, 'entrada', 'huella']);
ent.sort((a, b) => (a[2] + String(a[3]).padStart(5, '0')).localeCompare(b[2] + String(b[3]).padStart(5, '0')));
const entradas = table('entradas', 'Control de acceso a los laboratorios (huella o tarjeta maestra).', [
  'id_entrada:integer:pk|Identificador',
  'id_personal:integer:fk=personal.id_personal|Persona identificada',
  'sala:text|Sala (L1, L2, L3)',
  'fecha_hora:timestamp|Momento',
  'tipo:text|entrada o salida',
  'metodo:text|huella o tarjeta',
], ent.map(([id, sala, d, m, t, met], i) => [7000 + i, id, sala, ts(d, m), t, met]));

const viajes = table('viajes', 'Comisiones de servicio y viajes del personal.', [
  'id_viaje:integer:pk|Identificador',
  'id_personal:integer:fk=personal.id_personal|Viajero',
  'destino:text|Destino',
  'fecha_salida:date|Fecha de salida',
  'fecha_regreso:date|Fecha de regreso',
  'motivo:text|Motivo',
], [
  [1, 1, 'Lisboa', '2025-07-01', '2025-07-05', 'Congreso Internacional de Genética Vegetal'],
  [2, 2, 'Santiago', '2025-05-12', '2025-05-16', 'Curso de fisiología'],
  [3, 11, 'Ciudad de México', '2025-06-03', '2025-06-06', 'Reunión de consorcio'],
  [4, 9, 'Bogotá', '2025-07-07', '2025-07-09', 'Taller de bioestadística'],
  [5, 5, 'Lima', '2025-04-22', '2025-04-25', 'Escuela doctoral'],
  [6, 1, 'Madrid', '2025-03-10', '2025-03-13', 'Evaluación de proyecto'],
]);

const contratos = table('contratos', 'Contratos del personal técnico y decisiones de renovación.', [
  'id_contrato:integer:pk|Identificador',
  'id_personal:integer:fk=personal.id_personal|Empleado',
  'fecha_fin:date|Fin del contrato vigente',
  'renovacion:text|aprobada, rechazada o pendiente',
  'decidido_por:text:null|Usuario que tomó la decisión',
  'fecha_decision:date:null|Fecha de la decisión',
], [
  [1, 4, '2025-07-31', 'rechazada', 'aparedes', '2025-06-27'],
  [2, 7, '2025-12-31', 'aprobada', 'evillalba', '2025-06-10'],
  [3, 10, '2025-09-30', 'pendiente', null, null],
  [4, 5, '2026-02-28', 'aprobada', 'aparedes', '2025-05-30'],
  [5, 8, '2025-11-30', 'aprobada', 'evillalba', '2025-06-18'],
  [6, 12, '2026-01-31', 'pendiente', null, null],
  [7, 6, '2025-12-31', 'aprobada', 'admin', '2025-06-01'],
]);

export const case03: CaseDef = {
  id: 3,
  code: 'EXP-03',
  title: 'El laboratorio alterado',
  level: 1,
  tagline: 'Alguien reescribió los resultados del Proyecto Raíz en plena madrugada.',
  location: 'Instituto de Biotecnología Bruma',
  date: '3 de julio de 2025, 09:15',
  scene: 'laboratorio',
  briefing: [
    'El Proyecto Raíz busca cultivos resistentes a la sequía. Su evaluación de financiación es la próxima semana.',
    'A las 09:15 del 3 de julio, la doctoranda Lorena Quiñones notó que las tasas de germinación de seis muestras habían caído a la mitad de la noche a la mañana.',
    'El sistema guarda una auditoría de cada edición. Todas las modificaciones aparecen firmadas por la directora del proyecto, la Dra. Adriana Paredes. Ella jura que no fue.',
  ],
  timeline: [
    { time: '1 jul', event: 'La Dra. Paredes viaja a un congreso.' },
    { time: '2 jul 23:10', event: 'Último cierre de sesión conocido en la sala de análisis.' },
    { time: '3 jul 09:15', event: 'Se detectan los resultados alterados.' },
  ],
  concepts: ['WHERE', 'BETWEEN', 'AND / OR', 'NOT / IS NULL', 'LIKE', 'ORDER BY', 'DISTINCT'],
  tables: [personal, estaciones, muestras, resultados, ediciones, sesiones, entradas, viajes, contratos],
  characters: [
    {
      id: 'ferro', name: 'Camilo Ferro', role: 'Técnico de laboratorio', age: 31, suspect: true,
      bio: 'Mantiene la cámara de germinación del laboratorio de cultivos. Su contrato vence en julio.',
      statement: 'El 2 de julio me fui a las cinco y media. Esa noche dormí en casa.',
      look: { skin: 2, hair: 'flequillo', hairColor: 1, outfitStyle: 'bata', outfit: 0, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Volvió al instituto la noche del 2 de julio?', answer: 'No. Me fui a las 17:30 y no regresé hasta el día siguiente.' },
        { id: 'q2', text: '¿Cómo es su relación con la Dra. Paredes?', answer: 'Profesional. Bueno… no renovó mi contrato. Pero así es la ciencia.' },
        { id: 'q3', text: 'Su huella abrió el laboratorio L2 a las 01:52. ¿Qué hacía allí?', answer: 'Yo… olvidé apagar la cámara de germinación. Entré a revisarla. Nada más.', requires: ['E4', 'E5'], contradiction: true, note: 'Ferro admite haber entrado a las 01:52, dice que fue a revisar la cámara de germinación.' },
        { id: 'q4', text: 'Su usuario inició sesión en la estación E-4 a las 01:55, minutos antes de las ediciones.', answer: 'Revisé mi correo… No toqué ningún resultado. Cualquiera pudo usar esa estación.', requires: ['E6'], contradiction: true },
      ],
    },
    {
      id: 'paredes', name: 'Adriana Paredes', role: 'Investigadora principal', age: 54, suspect: true,
      bio: 'Directora del Proyecto Raíz. Exigente y brillante.',
      statement: 'Yo estaba en Lisboa. Alguien usó mi cuenta.',
      look: { skin: 1, hair: 'coleta', hairColor: 6, accessory: 'gafas', outfitStyle: 'traje', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Dónde estaba la madrugada del 3 de julio?', answer: 'En Lisboa, en el congreso. Regresé el 5. Puede verificarlo en los registros de viajes.' },
        { id: 'q2', text: '¿Alguien conoce su contraseña?', answer: 'No la comparto. Aunque… es la fecha de fundación del instituto. No es muy original, lo admito.', note: 'La contraseña de Paredes era fácil de adivinar.' },
        { id: 'q3', text: '¿Quién podría querer arruinar su proyecto?', answer: 'Villalba compite por la misma financiación. Y tuve que rechazar la renovación de Camilo hace una semana.' },
      ],
    },
    {
      id: 'villalba', name: 'Ernesto Villalba', role: 'Investigador principal (Fisiología)', age: 58, suspect: true,
      bio: 'Compite con Paredes por la misma convocatoria de financiación.',
      statement: 'No necesito sabotear a nadie. Mis resultados hablan solos.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'barba', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Editó resultados el 2 de julio?', answer: 'Corregí un error de transcripción en un resultado de mi grupo, por la tarde, en la E-1. Está justificado en la auditoría.' },
        { id: 'q2', text: '¿A qué hora salió del instituto?', answer: 'A las 19:40. Tenía una cena con el decano.', note: 'Villalba dice que salió a las 19:40.' },
      ],
    },
    {
      id: 'quinones', name: 'Lorena Quiñones', role: 'Doctoranda', age: 27, suspect: true,
      bio: 'Trabaja en el Proyecto Raíz. Fue quien descubrió las alteraciones.',
      statement: 'Me quedé hasta tarde analizando datos en la sala L3. Me fui a las once y diez.',
      look: { skin: 3, hair: 'largo', hairColor: 0, accessory: 'auriculares', outfitStyle: 'sueter', outfit: 5, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Cómo descubrió las alteraciones?', answer: 'A las 9:15 comparé con mi copia de ayer. Seis germinaciones habían caído casi a la mitad.' },
        { id: 'q2', text: '¿Conoce la contraseña de la Dra. Paredes?', answer: 'No. Aunque ella dice que es «muy fácil». Ella misma lo ha dicho delante de todo el laboratorio.' },
      ],
    },
    {
      id: 'salcedo', name: 'Gilberto Salcedo', role: 'Vigilante nocturno', age: 46, suspect: true,
      bio: 'Hace tres rondas cada noche con la tarjeta maestra.',
      statement: 'Hice mis rondas. A la 01:30 todo estaba normal en el L2.',
      look: { skin: 5, hair: 'corto', hairColor: 0, facial: 'bigote', outfitStyle: 'uniforme', outfit: 2 },
      questions: [
        { id: 'q1', text: '¿Vio a alguien en la madrugada?', answer: 'Hacia las dos vi luz en el L2 desde el patio. Pensé que era el equipo de germinación.' },
        { id: 'q2', text: '¿Su tarjeta maestra abre todas las salas?', answer: 'Sí, pero cada uso queda registrado como «tarjeta». No como huella.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Ediciones de madrugada', description: 'Entre las 02:05 y las 02:22 del 3 de julio, el usuario «aparedes» modificó seis resultados desde la estación E-4, sin justificar ninguna edición.', reference: "SELECT * FROM ediciones WHERE fecha_hora BETWEEN '2025-07-03 00:00' AND '2025-07-03 06:00';", match: { all: [['aparedes', '02:05'], ['aparedes', '02:22']], maxRows: 10 }, implicates: ['paredes'] },
    { id: 'E2', key: true, title: 'Paredes estaba en Lisboa', description: 'La Dra. Paredes viajó a Lisboa del 1 al 5 de julio: no pudo estar en la estación E-4.', reference: "SELECT * FROM viajes WHERE destino = 'Lisboa';", match: { any: [['Lisboa', '2025-07-01', '2025-07-05']], maxRows: 5 }, clears: ['paredes'] },
    { id: 'E3', key: true, title: 'Dónde está la estación E-4', description: 'La estación E-4 está en el laboratorio de cultivos (L2): quien editó estaba físicamente en esa sala.', reference: "SELECT * FROM estaciones WHERE codigo = 'E-4';", match: { any: [['E-4', 'L2']], maxRows: 2 } },
    { id: 'E4', key: true, title: 'Una huella en la madrugada', description: 'Además de las rondas del vigilante con tarjeta (01:30–01:35), una HUELLA abrió el L2 a las 01:52 y salió a las 02:41: la persona 4.', reference: "SELECT * FROM entradas WHERE sala = 'L2' AND fecha_hora BETWEEN '2025-07-03 00:00' AND '2025-07-03 06:00';", match: { any: [['01:52', 'huella', '4']], maxRows: 8 }, implicates: ['ferro'] },
    { id: 'E5', key: true, title: 'La persona 4', description: 'La persona con id 4 es Camilo Ferro, técnico de laboratorio (usuario cferro).', reference: 'SELECT * FROM personal WHERE id_personal = 4;', match: { any: [['Ferro', 'cferro']], maxRows: 2 }, implicates: ['ferro'] },
    { id: 'E6', key: true, title: 'Sesiones en la estación E-4', description: 'A las 01:55 el usuario cferro inició sesión en la E-4; cerró a las 01:57. Luego hubo dos intentos fallidos con «aparedes» y un acceso exitoso a las 02:03.', reference: "SELECT * FROM sesiones WHERE estacion = 'E-4' AND fecha_hora > '2025-07-03 00:00' ORDER BY fecha_hora;", match: { all: [['cferro', '01:55'], ['aparedes', 'fallido']], maxRows: 14 }, implicates: ['ferro'] },
    { id: 'E7', title: 'Villalba se fue temprano', description: 'La huella de Ernesto Villalba (persona 2) registra su salida del L1 a las 19:40 del 2 de julio y ningún acceso esa noche.', reference: "SELECT * FROM entradas WHERE id_personal = 2 AND fecha_hora > '2025-07-02 12:00';", match: { any: [['19:40', 'salida', 'L1']], maxRows: 6 }, clears: ['villalba'] },
    { id: 'E8', title: 'La doctoranda en la sala L3', description: 'Lorena Quiñones (persona 5) salió de la sala L3 a las 23:10 del 2 de julio; no volvió hasta las 09:05.', reference: "SELECT * FROM entradas WHERE id_personal = 5 AND fecha_hora > '2025-07-02 20:00';", match: { any: [['23:10', 'L3', 'salida']], maxRows: 6 }, clears: ['quinones'] },
    { id: 'E9', title: 'Las rondas del vigilante', description: 'El vigilante usó la tarjeta maestra en el L2 de 01:30 a 01:35, antes de las ediciones. Nunca entró con huella.', reference: "SELECT * FROM entradas WHERE metodo = 'tarjeta' AND fecha_hora > '2025-07-03 00:00';", match: { any: [['01:35', 'salida', 'tarjeta']], maxRows: 10 }, clears: ['salcedo'] },
    { id: 'E10', title: 'Un contrato rechazado', description: 'El 27 de junio, «aparedes» rechazó la renovación del contrato de la persona 4 (Camilo Ferro).', reference: "SELECT * FROM contratos WHERE renovacion = 'rechazada';", match: { any: [['4', 'rechazada', 'aparedes']], maxRows: 5 }, implicates: ['ferro'] },
  ],
  objectives: [
    { id: 'O1', title: 'Identificar las alteraciones', description: '¿Qué se modificó, cuándo y desde dónde?', evidence: ['E1', 'E3'], tables: ['ediciones', 'estaciones', 'resultados'] },
    { id: 'O2', title: 'Verificar a la titular de la cuenta', description: '¿Pudo la Dra. Paredes hacer esas ediciones?', evidence: ['E2'], tables: ['viajes'] },
    { id: 'O3', title: '¿Quién estaba en el laboratorio?', description: 'Reconstruye los accesos físicos de la noche.', evidence: ['E4', 'E5', 'E7', 'E8', 'E9'], need: 3, tables: ['entradas', 'personal'] },
    { id: 'O4', title: 'Rastrear las sesiones del terminal', description: 'Quién se sentó frente a la estación E-4.', evidence: ['E6'], tables: ['sesiones'] },
    { id: 'O5', title: 'Buscar el móvil', description: '¿Quién tenía razones para perjudicar a la Dra. Paredes?', evidence: ['E10'], tables: ['contratos'] },
  ],
  hints: [
    { id: 'H1', title: 'Cambios fuera de hora', evidence: 'E1', levels: ['Las alteraciones ocurrieron entre la noche del 2 y la mañana del 3 de julio.', 'La tabla ediciones registra usuario, estación y fecha_hora de cada cambio.', "BETWEEN incluye ambos extremos: WHERE fecha_hora BETWEEN '2025-07-03 00:00' AND '2025-07-03 06:00'"] },
    { id: 'H2', title: '¿Dónde estaba la dueña de la cuenta?', evidence: 'E2', levels: ['La Dra. Paredes dice que estaba de viaje.', 'La tabla viajes registra destino y fechas.', "Busca por destino o por id_personal; también puedes usar LIKE: WHERE motivo LIKE '%Congreso%'"] },
    { id: 'H3', title: 'Un terminal tiene dirección', evidence: 'E3', levels: ['No se puede editar desde una estación sin estar frente a ella.', 'La tabla estaciones indica en qué sala está cada terminal.', "WHERE codigo = 'E-4'"] },
    { id: 'H4', title: 'Huellas y tarjetas', evidence: 'E4', requires: { evidence: ['E3'] }, levels: ['Para estar frente a la E-4 hay que entrar al L2.', 'Filtra entradas por la sala L2 durante la madrugada del 3 de julio.', 'Combina AND y BETWEEN: WHERE sala = ... AND fecha_hora BETWEEN ... AND ...'] },
    { id: 'H5', title: 'Ponerle nombre a una huella', evidence: 'E5', requires: { evidence: ['E4'] }, levels: ['La tabla de entradas solo guarda un número de persona.', 'Busca ese id_personal en la tabla personal.', 'WHERE id_personal = número'] },
    { id: 'H6', title: 'Antes de las ediciones', evidence: 'E6', levels: ['Si alguien adivinó una contraseña, quizá falló primero.', 'La tabla sesiones registra inicios, cierres y fallidos por estación.', 'Ordena por fecha_hora para ver la secuencia: ORDER BY fecha_hora'] },
    { id: 'H7', title: 'El rival', evidence: 'E7', levels: ['Villalba compite por la misma financiación. ¿Estuvo esa noche?', 'Busca sus entradas (persona 2) en la tarde y noche del 2 de julio.', "WHERE id_personal = 2 AND fecha_hora > '2025-07-02 12:00'"] },
    { id: 'H8', title: 'La doctoranda', evidence: 'E8', levels: ['Lorena se quedó hasta tarde. ¿Hasta qué hora exactamente?', 'Busca las entradas de la persona 5 desde la noche del 2 de julio.', 'ORDER BY fecha_hora DESC muestra primero el último registro.'] },
    { id: 'H9', title: 'La tarjeta maestra', evidence: 'E9', levels: ['El vigilante puede abrir cualquier sala… pero lo hace con tarjeta, no con huella.', 'La columna metodo distingue huella de tarjeta.', "WHERE metodo = 'tarjeta'"] },
    { id: 'H10', title: 'Motivos', evidence: 'E10', levels: ['Nadie arruina un proyecto sin una razón.', 'La tabla contratos guarda decisiones de renovación y quién las tomó.', "WHERE renovacion = 'rechazada'"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'ferro',
    motive: 'La Dra. Paredes rechazó la renovación de su contrato una semana antes.',
    opportunity: 'Conocía la rutina del vigilante y la contraseña predecible de Paredes; el laboratorio quedaba vacío después de la ronda de la 01:30.',
    method: 'Entró con su huella a las 01:52, revisó la estación E-4 con su propia cuenta, adivinó la contraseña de «aparedes» al tercer intento y redujo seis tasas de germinación.',
    justification: 'Es la única huella que entra al L2 durante la madrugada, su cuenta se usó en la E-4 minutos antes de las ediciones y tenía un motivo claro.',
    eliminations: {
      paredes: { evidence: ['E2'], explanation: 'Estaba en Lisboa del 1 al 5 de julio; su cuenta fue suplantada.' },
      villalba: { evidence: ['E7'], explanation: 'Salió a las 19:40 y no volvió; su única edición fue de día y justificada.' },
      quinones: { evidence: ['E8'], explanation: 'Salió de la sala L3 a las 23:10 y no regresó hasta la mañana.' },
      salcedo: { evidence: ['E9'], explanation: 'Su tarjeta estuvo en el L2 de 01:30 a 01:35, antes de las ediciones; nunca usó huella.' },
    },
    incriminating: ['E4', 'E5', 'E6', 'E10'],
    reveal: [
      'Camilo Ferro supo el 27 de junio que su contrato no sería renovado. Culpó a la Dra. Paredes.',
      'Esperó a que ella viajara. Entró de madrugada, probó la contraseña de Paredes —la fecha de fundación del instituto— y redujo a la mitad seis resultados, para que el proyecto fracasara en la evaluación.',
      'La copia de seguridad de Lorena permitió restaurar los datos. El Proyecto Raíz obtuvo su financiación.',
    ],
  },
  references: [
    { title: 'Personal del grupo de genética', sql: "SELECT nombre, apellido, cargo FROM personal WHERE grupo = 'Genética vegetal';" },
    { title: 'Estaciones del L2', sql: "SELECT * FROM estaciones WHERE sala = 'L2';" },
    { title: 'Muestras del Proyecto Raíz', sql: "SELECT * FROM muestras WHERE codigo LIKE 'RZ%';" },
    { title: 'Germinaciones bajas', sql: "SELECT * FROM resultados WHERE medicion = 'germinacion_pct' AND valor < 60;" },
    { title: 'Ediciones sin justificación', sql: 'SELECT * FROM ediciones WHERE motivo IS NULL;' },
    { title: 'Ediciones que bajaron el valor', sql: 'SELECT * FROM ediciones WHERE valor_nuevo < valor_anterior ORDER BY fecha_hora;' },
    { title: 'Usuarios que editaron', sql: 'SELECT DISTINCT usuario FROM ediciones;' },
    { title: 'Intentos fallidos', sql: "SELECT * FROM sesiones WHERE evento = 'fallido';" },
    { title: 'Viajes ordenados', sql: 'SELECT * FROM viajes ORDER BY fecha_salida DESC;' },
    { title: 'Contratos pendientes o rechazados', sql: "SELECT * FROM contratos WHERE renovacion IN ('pendiente', 'rechazada');" },
    { title: 'Accesos con huella después de las 20:00 del 2 de julio', sql: "SELECT * FROM entradas WHERE metodo = 'huella' AND fecha_hora > '2025-07-02 20:00';" },
    { title: 'Ediciones de Villalba', sql: "SELECT * FROM ediciones WHERE usuario = 'evillalba';" },
    { title: 'Personal que no es de genética', sql: "SELECT nombre, apellido, grupo FROM personal WHERE NOT grupo = 'Genética vegetal';" },
  ],
};
