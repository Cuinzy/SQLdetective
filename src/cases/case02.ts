import type { CaseDef, Cell } from './types';
import { table, rng, namePool, hm, pad } from './helpers';

// CASO 2 — El misterio de la biblioteca
// Culpable: Julián Lezama (investigador visitante, id 7, credencial INV-0388 vencida).
// El 20 de mayo devolvió la caja del Códice de Almagro con 228 g menos (1840 → 1612), en la mesa 7 (sin cámara).
// Al salir, el arco detector sonó (12:44). El 21 de mayo, tras recalibrar la balanza, la caja seguía pesando 1612 g.

const R = rng(202);
const EXCL = ['Lezama', 'Cuéllar', 'Feijoo', 'Arenas', 'Ochoa', 'Santamaría'];

const fillerInv = namePool(R, 26, EXCL);
const instituciones = ['Universidad de Ciudad Bruma', 'Instituto de Estudios Medievales', 'Universidad del Litoral', 'Archivo Regional', 'Colegio de Paleografía'];
const invRows: Cell[][] = [
  [3, 'Marina', 'Cuéllar', 'Universidad de Ciudad Bruma', 'INV-0142', 'vigente', '2026-01-31'],
  [5, 'Tobías', 'Arenas', 'Instituto de Estudios Medievales', 'INV-0207', 'vigente', '2025-12-31'],
  [7, 'Julián', 'Lezama', 'Universidad de Puerto Alto', 'INV-0388', 'vencida', '2025-04-30'],
];
const fillerIds: number[] = [];
let nextId = 10;
fillerInv.forEach((n, i) => {
  const id = nextId++;
  fillerIds.push(id);
  const estado = i === 4 ? 'vencida' : i === 11 ? 'suspendida' : i === 19 ? 'vencida' : 'vigente';
  const venc = estado === 'vigente' ? `2026-${pad(R.int(1, 12))}-28` : estado === 'vencida' ? `2025-0${R.int(1, 3)}-28` : '2025-09-30';
  invRows.push([id, n.nombre, n.apellido, R.pick(instituciones), `INV-0${400 + i * 13}`, estado, venc]);
});
const investigadores = table('investigadores', 'Investigadores acreditados para la Sala de Libros Raros.', [
  'id_investigador:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'institucion:text|Institución de procedencia',
  'credencial:text|Código de credencial (torniquetes)',
  'estado_credencial:text|vigente, vencida o suspendida',
  'fecha_vencimiento:date|Fecha de vencimiento de la credencial',
], invRows);

const docs: Cell[][] = [
  [1, 'Códice de Almagro', 'XV', 'manuscrito', 'Bóveda A-1', 1840, 'faltante'],
  [2, 'Carta de fundación de Ciudad Bruma', 'XVI', 'carta', 'Bóveda A-2', 410, 'disponible'],
  [3, 'Atlas de Ortelius (facsímil)', 'XVI', 'mapa', 'Planero 3', 5200, 'disponible'],
  [4, 'Libro de horas de la Marquesa', 'XV', 'manuscrito', 'Bóveda A-1', 2210, 'disponible'],
  [5, 'Crónica del Puerto Viejo', 'XVII', 'manuscrito', 'Bóveda B-4', 1530, 'disponible'],
  [6, 'Gramática castellana (incunable)', 'XV', 'incunable', 'Bóveda A-3', 2980, 'en_restauracion'],
  [7, 'Cartas del corsario Valdés', 'XVIII', 'carta', 'Bóveda B-1', 380, 'disponible'],
  [8, 'Herbario ilustrado', 'XVII', 'manuscrito', 'Bóveda B-2', 2640, 'disponible'],
  [9, 'Plano de la muralla', 'XVIII', 'mapa', 'Planero 1', 950, 'disponible'],
  [10, 'Breviario de la catedral', 'XV', 'incunable', 'Bóveda A-3', 3310, 'en_digitalizacion'],
  [11, 'Diario de navegación «Santa Clara»', 'XVIII', 'manuscrito', 'Bóveda B-4', 1720, 'disponible'],
  [12, 'Recetario conventual', 'XVII', 'manuscrito', 'Bóveda B-2', 870, 'disponible'],
  [13, 'Pliegos de cordel', 'XIX', 'carta', 'Archivador 7', 290, 'disponible'],
  [14, 'Tratado de astronomía', 'XVI', 'incunable', 'Bóveda A-2', 2450, 'disponible'],
  [15, 'Cancionero popular', 'XVI', 'manuscrito', 'Bóveda A-1', 1390, 'disponible'],
];
const documentos = table('documentos', 'Fondo de libros raros y manuscritos.', [
  'id_documento:integer:pk|Identificador',
  'titulo:text|Título',
  'siglo:text|Siglo',
  'tipo:text|manuscrito, incunable, mapa o carta',
  'ubicacion:text|Ubicación en bóveda',
  'peso_caja_g:integer|Peso de referencia de la caja con el documento (gramos)',
  'estado:text|Estado actual del documento',
], docs);

const mesas = table('mesas', 'Mesas de lectura de la Sala de Libros Raros.', [
  'id_mesa:integer:pk|Número de mesa',
  'ubicacion:text|Ubicación en la sala',
  'visible_camara:boolean|¿La mesa queda dentro del campo de la cámara?',
], [
  [1, 'Frente al mostrador', true], [2, 'Frente al mostrador', true], [3, 'Centro', true], [4, 'Centro', true],
  [5, 'Ventanal', true], [6, 'Ventanal', true], [7, 'Rincón norte, tras la estantería', false], [8, 'Pasillo', true],
  [9, 'Columna sur', false], [10, 'Pasillo', true],
]);

// Solicitudes de consulta
type Sol = { inv: number; doc: number; fecha: string; ent: number; dev: number; mesa: number; pe: number; pd: number; bib: string };
const sols: Sol[] = [];
const days: string[] = [];
for (let d = new Date('2025-04-01'); d <= new Date('2025-05-21'); d.setDate(d.getDate() + 1)) {
  const wd = d.getDay();
  if (wd !== 0 && wd !== 6) days.push(d.toISOString().slice(0, 10));
}
const bibs = ['Feijoo', 'Pineda'];
const noiseIdx = new Set([9, 33, 61]);
for (let i = 0; i < 78; i++) {
  const doc = R.pick([2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15]);
  const peso = docs.find((d) => d[0] === doc)![5] as number;
  const ent = R.int(540, 900);
  const dev = ent + R.int(30, 170);
  let pd = peso;
  if (noiseIdx.has(i)) pd = peso - R.int(1, 2);
  sols.push({ inv: R.pick(fillerIds), doc, fecha: R.pick(days.filter((x) => x !== '2025-05-20')), ent, dev, mesa: R.int(1, 10), pe: peso, pd, bib: R.pick(bibs) });
}
// Lezama: interés previo en otras piezas de la bóveda A-1, siempre en la mesa 7
sols.push({ inv: 7, doc: 15, fecha: '2025-05-13', ent: 600, dev: 700, mesa: 7, pe: 1390, pd: 1390, bib: 'Pineda' });
sols.push({ inv: 7, doc: 4, fecha: '2025-05-16', ent: 615, dev: 735, mesa: 7, pe: 2210, pd: 2210, bib: 'Feijoo' });
// Historia del códice
sols.push({ inv: 5, doc: 1, fecha: '2025-04-08', ent: 570, dev: 690, mesa: 2, pe: 1840, pd: 1840, bib: 'Pineda' });
sols.push({ inv: fillerIds[6], doc: 1, fecha: '2025-04-29', ent: 840, dev: 930, mesa: 5, pe: 1840, pd: 1840, bib: 'Feijoo' });
sols.push({ inv: 5, doc: 1, fecha: '2025-05-19', ent: 600, dev: 720, mesa: 3, pe: 1840, pd: 1840, bib: 'Feijoo' });
sols.push({ inv: 7, doc: 1, fecha: '2025-05-20', ent: 620, dev: 750, mesa: 7, pe: 1840, pd: 1612, bib: 'Feijoo' });
sols.push({ inv: 3, doc: 1, fecha: '2025-05-21', ent: 600, dev: 675, mesa: 2, pe: 1612, pd: 1612, bib: 'Pineda' });
// Otras consultas del 20 de mayo
sols.push({ inv: fillerIds[2], doc: 8, fecha: '2025-05-20', ent: 560, dev: 650, mesa: 4, pe: 2640, pd: 2640, bib: 'Feijoo' });
sols.push({ inv: fillerIds[9], doc: 11, fecha: '2025-05-20', ent: 690, dev: 800, mesa: 1, pe: 1720, pd: 1720, bib: 'Feijoo' });
sols.push({ inv: 3, doc: 5, fecha: '2025-05-20', ent: 870, dev: 960, mesa: 2, pe: 1530, pd: 1530, bib: 'Pineda' });
sols.sort((a, b) => (a.fecha + hm(a.ent)).localeCompare(b.fecha + hm(b.ent)));
const solicitudes = table('solicitudes', 'Solicitudes de consulta en sala: cada caja se pesa al entregarla y al devolverla.', [
  'id_solicitud:integer:pk|Identificador',
  'id_investigador:integer:fk=investigadores.id_investigador|Investigador que consulta',
  'id_documento:integer:fk=documentos.id_documento|Documento consultado',
  'fecha:date|Fecha de la consulta',
  'hora_entrega:time|Hora en que se entregó la caja',
  'hora_devolucion:time|Hora en que se devolvió la caja',
  'id_mesa:integer:fk=mesas.id_mesa|Mesa de lectura asignada',
  'peso_entrega_g:integer|Peso de la caja al entregarla (g)',
  'peso_devolucion_g:integer|Peso de la caja al devolverla (g)',
  'bibliotecario:text|Apellido del bibliotecario que atendió',
], sols.map((s, i) => [3000 + i, s.inv, s.doc, s.fecha, hm(s.ent), hm(s.dev), s.mesa, s.pe, s.pd, s.bib]));

// Personal y turnos
const pilarName = namePool(R, 4, EXCL);
const personalRows: Cell[][] = [
  [1, 'Marcos', 'Feijoo', 'Bibliotecario de sala', 'B-101'],
  [2, 'Ramiro', 'Ochoa', 'Vigilante', 'B-205'],
  [3, pilarName[0].nombre, pilarName[0].apellido, 'Vigilante', 'B-206'],
  [4, 'Gloria', 'Pineda', 'Bibliotecaria de sala', 'B-102'],
  [5, 'Elvira', 'Santamaría', 'Jefa de colecciones', 'B-001'],
  [6, pilarName[1].nombre, pilarName[1].apellido, 'Técnico de digitalización', 'B-310'],
  [7, pilarName[2].nombre, pilarName[2].apellido, 'Auxiliar de bóveda', 'B-103'],
];
const personal = table('personal', 'Personal de la biblioteca.', [
  'id_personal:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'credencial:text|Código de credencial (torniquetes)',
], personalRows);

const turnoRows: Cell[][] = [];
const tdays = ['2025-05-15', '2025-05-16', '2025-05-19', '2025-05-20', '2025-05-21', '2025-05-22'];
let tid = 100;
const sched: Record<number, string[]> = {
  1: ['mañana', 'mañana', 'mañana', 'mañana', 'descanso', 'mañana'],
  2: ['tarde', 'mañana', 'mañana', 'descanso', 'mañana', 'mañana'],
  3: ['mañana', 'tarde', 'tarde', 'mañana', 'tarde', 'tarde'],
  4: ['tarde', 'tarde', 'tarde', 'tarde', 'mañana', 'tarde'],
  5: ['mañana', 'descanso', 'mañana', 'mañana', 'mañana', 'mañana'],
  6: ['tarde', 'tarde', 'descanso', 'tarde', 'mañana', 'tarde'],
  7: ['mañana', 'mañana', 'tarde', 'tarde', 'tarde', 'descanso'],
};
for (let p = 1; p <= 7; p++) tdays.forEach((d, i) => turnoRows.push([tid++, p, d, sched[p][i]]));
const turnos = table('turnos', 'Turnos del personal (mañana 08–14, tarde 14–20).', [
  'id_turno:integer:pk|Identificador',
  'id_personal:integer:fk=personal.id_personal|Empleado',
  'fecha:date|Fecha',
  'turno:text|mañana, tarde o descanso',
], turnoRows);

// Torniquetes
const tq: [string, string, number, string, boolean][] = [];
const invCred = new Map(invRows.map((r) => [r[0] as number, r[4] as string]));
for (const s of sols) {
  const cred = invCred.get(s.inv)!;
  tq.push([cred, s.fecha, s.ent - R.int(8, 20), 'entrada', false]);
  const alarm = s.inv === 7 && s.fecha === '2025-05-20';
  tq.push([cred, s.fecha, alarm ? 764 : s.dev + R.int(4, 14), 'salida', alarm]);
}
for (let p = 1; p <= 7; p++)
  tdays.forEach((d, i) => {
    const t = sched[p][i];
    if (t === 'descanso') return;
    const cred = personalRows[p - 1][4] as string;
    const st = t === 'mañana' ? 480 : 840;
    tq.push([cred, d, st - R.int(3, 15), 'entrada', false]);
    tq.push([cred, d, st + 360 + R.int(0, 12), 'salida', p === 3 && d === '2025-05-15']);
  });
tq.push(['B-103', '2025-05-09', 845, 'salida', true]);
tq.sort((a, b) => (a[1] + hm(a[2])).localeCompare(b[1] + hm(b[2])));
const torniquetes = table('torniquetes', 'Registros de los torniquetes de la sala con arco detector de etiquetas antirrobo.', [
  'id_registro:integer:pk|Identificador',
  'credencial:text|Credencial leída',
  'fecha:date|Fecha',
  'hora:time|Hora',
  'sentido:text|entrada o salida',
  'alarma:boolean|¿Sonó el arco detector?',
], tq.map(([c, f, m, s, a], i) => [9000 + i, c, f, hm(m), s, a]));

const incidencias = table('incidencias', 'Bitácora de incidencias de la sala.', [
  'id_incidencia:integer:pk|Identificador',
  'fecha:date|Fecha',
  'hora:time|Hora',
  'reportado_por:text|Apellido de quien reporta',
  'descripcion:text|Descripción',
], [
  [1, '2025-04-11', '10:20', 'Pineda', 'Humedad elevada en bóveda B; se activa el deshumidificador.'],
  [2, '2025-04-24', '15:05', 'Feijoo', 'La balanza tarda en estabilizarse; se reinicia.'],
  [3, '2025-05-09', '14:06', pilarName[0].apellido, 'Arco detector sonó con auxiliar de bóveda: llavero metálico. Falsa alarma.'],
  [4, '2025-05-15', '14:05', pilarName[0].apellido, 'Arco detector sonó con vigilante al terminar turno: hebilla. Falsa alarma.'],
  [5, '2025-05-20', '12:45', pilarName[0].apellido, 'Arco detector sonó con un investigador al salir; dijo que eran sus llaves. Se le permitió pasar.'],
  [6, '2025-05-20', '13:40', 'Feijoo', 'La balanza parece marcar menos de lo normal. Solicito calibración.'],
  [7, '2025-05-21', '08:00', pilarName[1].apellido, 'Calibración de la balanza completada: error de 0 g con pesas patrón.'],
  [8, '2025-05-22', '09:30', 'Santamaría', 'Inventario anual: el Códice de Almagro NO está en su caja. Se notifica a la Agencia Índice.'],
]);

export const case02: CaseDef = {
  id: 2,
  code: 'EXP-02',
  title: 'El misterio de la biblioteca',
  level: 1,
  tagline: 'Un códice del siglo XV desapareció de su caja sin que nadie lo notara.',
  location: 'Biblioteca Nacional de Ciudad Bruma — Sala de Libros Raros',
  date: '22 de mayo de 2025, 09:30',
  scene: 'biblioteca',
  briefing: [
    'Durante el inventario anual, la jefa de colecciones abrió la caja del Códice de Almagro, un manuscrito del siglo XV. La caja estaba ahí. El códice no.',
    'Por protocolo, cada caja se pesa al entregarla a un investigador y al devolverla. Las mesas de lectura están vigiladas por una cámara… casi todas.',
    'Los investigadores necesitan una credencial vigente y pasan por un arco detector de etiquetas antirrobo al salir.',
  ],
  timeline: [
    { time: '19 may', event: 'Último uso documentado del códice antes del incidente.' },
    { time: '21 may 08:00', event: 'Se calibra la balanza de la sala.' },
    { time: '22 may 09:30', event: 'El inventario descubre la caja vacía.' },
  ],
  concepts: ['WHERE', 'Comparar columnas', 'Operadores lógicos', 'Booleanos', 'IN', 'ORDER BY', 'DISTINCT'],
  tables: [investigadores, documentos, mesas, solicitudes, personal, turnos, torniquetes, incidencias],
  characters: [
    {
      id: 'lezama', name: 'Julián Lezama', role: 'Investigador visitante', age: 44, suspect: true,
      bio: 'Paleógrafo de la Universidad de Puerto Alto. Prepara un libro sobre cancioneros medievales.',
      statement: 'Consulté el códice para mi investigación. Lo devolví exactamente como lo recibí.',
      look: { skin: 1, hair: 'corto', hairColor: 2, facial: 'barba', accessory: 'gafas', outfitStyle: 'sueter', outfit: 4 },
      questions: [
        { id: 'q1', text: '¿Cuándo consultó el códice?', answer: 'El 20 de mayo por la mañana. Unas dos horas, nada más.' },
        { id: 'q2', text: '¿Su credencial está vigente?', answer: 'Por supuesto. Llevo años investigando aquí.' },
        { id: 'q3', text: 'Su credencial venció el 30 de abril. ¿Cómo entró a la sala?', answer: 'Un trámite pendiente… El bibliotecario no puso problema. No es un crimen olvidar una renovación.', requires: ['E3'], contradiction: true, note: 'Lezama mintió sobre su credencial.' },
        { id: 'q4', text: 'La caja que usted devolvió pesaba 228 gramos menos. ¿Cómo lo explica?', answer: '¡La balanza estaba mal! Todo el mundo lo sabe, hasta el bibliotecario lo reportó.', requires: ['E1'], contradiction: true },
        { id: 'q5', text: 'El arco detector sonó cuando usted salió a las 12:44.', answer: 'Eran mis llaves. Siempre suena con mis llaves.', requires: ['E8'], contradiction: true, note: 'Lezama atribuye la alarma a sus llaves.' },
      ],
    },
    {
      id: 'cuellar', name: 'Marina Cuéllar', role: 'Investigadora', age: 36, suspect: true,
      bio: 'Historiadora de la Universidad de Ciudad Bruma. Estudia los índices antiguos de la biblioteca.',
      statement: 'Pedí la caja el 21 solo para revisar la carpeta de índices que la acompaña. No abrí el estuche del códice.',
      look: { skin: 3, hair: 'rizado', hairColor: 0, accessory: 'aretes', outfitStyle: 'chaqueta', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Por qué consultó la caja del códice?', answer: 'La carpeta de índices del siglo XIX viaja en la misma caja. Solo necesitaba eso.' },
        { id: 'q2', text: 'Usted recibió y devolvió la caja con 1612 gramos.', answer: 'Entonces no saqué nada. Si ya pesaba menos cuando me la dieron, el códice faltaba antes de que yo llegara.', requires: ['E5'], note: 'La caja ya pesaba 1612 g cuando Cuéllar la recibió (tras calibrar la balanza).' },
      ],
    },
    {
      id: 'feijoo', name: 'Marcos Feijoo', role: 'Bibliotecario de sala', age: 52, suspect: true,
      bio: 'Lleva quince años entregando cajas. Tiene acceso a la bóveda.',
      statement: 'Pesé todas las cajas como manda el protocolo.',
      look: { skin: 2, hair: 'canoso', hairColor: 7, accessory: 'gafas', outfitStyle: 'sueter', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Notó algo raro el 20 de mayo?', answer: 'La balanza marcaba menos de lo normal. Lo reporté a mediodía y pedí calibración.' },
        { id: 'q2', text: '¿Por qué dejó consultar a alguien con la credencial vencida?', answer: 'Me mostró un correo de renovación… Cometí un error. Lo admito.', requires: ['E3'] },
        { id: 'q3', text: '¿Por qué no dio la alarma por la caja de 1612 gramos?', answer: 'Pensé que era la balanza. Anoté el peso real, como siempre. Si yo me hubiera llevado algo, ¿lo habría anotado?', requires: ['E1'] },
      ],
    },
    {
      id: 'arenas', name: 'Tobías Arenas', role: 'Investigador de historia medieval', age: 67, suspect: true,
      bio: 'Decano de los usuarios de la sala. Conoce el códice mejor que nadie.',
      statement: 'Lo consulté el 19. Estaba completo; conté los folios.',
      look: { skin: 0, hair: 'calvo', hairColor: 7, facial: 'barba', outfitStyle: 'traje', outfit: 6, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Cómo estaba el códice el 19 de mayo?', answer: 'Perfecto. 112 folios. Lo devolví a las doce en punto.' },
        { id: 'q2', text: '¿Conoce a Julián Lezama?', answer: 'De vista. Siempre se sienta en el rincón norte, detrás de la estantería. Decía que allí había mejor luz.', note: 'Lezama siempre se sienta en el rincón norte.' },
      ],
    },
    {
      id: 'ochoa', name: 'Ramiro Ochoa', role: 'Vigilante', age: 29, suspect: true,
      bio: 'Vigila la sala y los torniquetes. Tiene deudas de juego, según los rumores.',
      statement: 'Yo no toco las cajas. Mi trabajo es la puerta.',
      look: { skin: 4, hair: 'mohicano', hairColor: 0, outfitStyle: 'uniforme', outfit: 2, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Trabajó el 20 de mayo?', answer: 'No, era mi día de descanso. Revise los turnos.' },
        { id: 'q2', text: '¿Quién estaba en la puerta ese día?', answer: 'Mi compañero del turno de mañana. Él anota todo en la bitácora de incidencias.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'La caja más liviana', description: 'El 20 de mayo, la caja del códice se entregó con 1840 g y se devolvió con 1612 g: faltan 228 g. La solicitud corresponde al investigador 7 en la mesa 7.', reference: 'SELECT * FROM solicitudes WHERE peso_devolucion_g < peso_entrega_g;', match: { any: [['1840', '1612']], maxRows: 10 }, implicates: ['lezama'] },
    { id: 'E2', key: true, title: 'El investigador 7', description: 'El investigador 7 es Julián Lezama, de la Universidad de Puerto Alto (credencial INV-0388).', reference: 'SELECT * FROM investigadores WHERE id_investigador = 7;', match: { any: [['Lezama', 'INV-0388']], maxRows: 3 }, implicates: ['lezama'] },
    { id: 'E3', key: true, title: 'Credencial vencida', description: 'La credencial de Lezama venció el 30 de abril; aun así consultó documentos en mayo.', reference: "SELECT nombre, apellido, estado_credencial, fecha_vencimiento FROM investigadores WHERE estado_credencial <> 'vigente';", match: { any: [['Lezama', 'vencida']], maxRows: 8 }, implicates: ['lezama'] },
    { id: 'E4', title: 'El rincón sin cámara', description: 'Las mesas 7 y 9 quedan fuera del campo de la cámara.', reference: 'SELECT * FROM mesas WHERE visible_camara = false;', match: { any: [['7', 'false']], maxRows: 4 }, implicates: ['lezama'] },
    { id: 'E5', title: 'Historia del peso del códice', description: 'El 19 de mayo la caja pesaba 1840 g a la entrega y a la devolución; el 21 de mayo, ya con la balanza calibrada, pesaba 1612 g a la entrega. El faltante ocurrió el 20.', reference: 'SELECT * FROM solicitudes WHERE id_documento = 1 ORDER BY fecha;', match: { all: [['2025-05-19', '1840'], ['2025-05-21', '1612']], maxRows: 10 }, clears: ['cuellar', 'arenas'] },
    { id: 'E6', title: 'La balanza bajo sospecha', description: 'Feijoo reportó él mismo que la balanza marcaba menos (13:40 del 20 de mayo). Al día siguiente se calibró sin error: la diferencia de peso era real.', reference: "SELECT * FROM incidencias WHERE descripcion LIKE '%balanza%';", match: { all: [['Feijoo', 'calibración'], ['0 g']], maxRows: 6 }, clears: ['feijoo'] },
    { id: 'E7', title: 'Día de descanso', description: 'El 20 de mayo el empleado 2 (Ramiro Ochoa) tenía turno de descanso.', reference: "SELECT * FROM turnos WHERE fecha = '2025-05-20';", match: { any: [['2', 'descanso', '2025-05-20']], maxRows: 10 }, clears: ['ochoa'] },
    { id: 'E8', key: true, title: 'El arco detector', description: 'El 20 de mayo a las 12:44, el arco detector sonó cuando salió la credencial INV-0388.', reference: 'SELECT * FROM torniquetes WHERE alarma = true;', match: { any: [['INV-0388', '12:44']], maxRows: 8 }, implicates: ['lezama'] },
    { id: 'E9', title: 'Documentos fuera de lugar', description: 'El Códice de Almagro figura como faltante; otros dos documentos están en restauración o digitalización.', reference: "SELECT titulo, estado FROM documentos WHERE estado <> 'disponible';", match: { any: [['Almagro', 'faltante']], maxRows: 6 } },
  ],
  objectives: [
    { id: 'O1', title: 'Seguir el rastro del códice', description: '¿Quién tuvo la caja en sus manos y cuánto pesaba cada vez?', evidence: ['E9', 'E5', 'E1'], need: 2, tables: ['solicitudes', 'documentos'] },
    { id: 'O2', title: 'Identificar al lector sospechoso', description: 'Pon nombre y credencial a quien devolvió la caja liviana.', evidence: ['E2', 'E3'], need: 1, tables: ['investigadores'] },
    { id: 'O3', title: 'Revisar la seguridad de la sala', description: 'Cámaras y arco detector: ¿qué vieron?', evidence: ['E4', 'E8'], need: 1, tables: ['mesas', 'torniquetes'] },
    { id: 'O4', title: 'Verificar al personal', description: 'El personal tiene acceso a la bóveda. ¿Dónde estaba cada uno?', evidence: ['E6', 'E7'], need: 1, tables: ['personal', 'turnos', 'incidencias'] },
  ],
  hints: [
    { id: 'H1', title: 'Lo que pesa una caja', evidence: 'E1', levels: ['Las cajas se pesan al entregarlas y al devolverlas. Un documento robado deja huella en la balanza.', 'En solicitudes compara peso_entrega_g con peso_devolucion_g.', 'Puedes comparar dos columnas entre sí: WHERE columna_a < columna_b'] },
    { id: 'H2', title: 'Un número con nombre', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['La solicitud sospechosa solo dice un número de investigador.', 'Busca ese id_investigador en la tabla investigadores.', 'WHERE id_investigador = número'] },
    { id: 'H3', title: 'Credenciales en regla', evidence: 'E3', levels: ['Solo los investigadores con credencial vigente pueden consultar la sala.', 'Revisa estado_credencial en investigadores.', "NOT, <> o != excluyen valores: WHERE estado_credencial <> 'vigente'"] },
    { id: 'H4', title: 'Puntos ciegos', evidence: 'E4', levels: ['La cámara no lo ve todo.', 'La tabla mesas tiene la columna visible_camara.', 'Las columnas booleanas se filtran con = true o = false.'] },
    { id: 'H5', title: 'La vida de la caja', evidence: 'E5', levels: ['Si sigues el peso de la caja del códice día a día, sabrás cuándo cambió.', 'Filtra solicitudes por id_documento del Códice de Almagro.', 'ORDER BY fecha te muestra la secuencia.'] },
    { id: 'H6', title: '¿Fallaba la balanza?', evidence: 'E6', levels: ['Alguien dirá que la balanza estaba mal. ¿Lo estaba?', 'La bitácora de incidencias registra problemas y reparaciones.', "WHERE descripcion LIKE '%balanza%'"] },
    { id: 'H7', title: 'Quién trabajaba', evidence: 'E7', levels: ['El personal también es sospechoso. ¿Quién estaba de turno el 20 de mayo?', 'Consulta turnos para esa fecha y relaciona id_personal con la tabla personal.', "WHERE fecha = '2025-05-20'"] },
    { id: 'H8', title: 'El arco que suena', evidence: 'E8', levels: ['Los documentos llevan etiquetas antirrobo. El arco detector de la salida suena con ellas… y con metales.', 'En torniquetes, la columna alarma indica cuándo sonó el arco.', 'WHERE alarma = true'] },
    { id: 'H9', title: 'El inventario', evidence: 'E9', levels: ['Empieza por lo que dice el inventario.', 'documentos tiene una columna estado.', "WHERE estado <> 'disponible'"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'lezama',
    motive: 'Un coleccionista extranjero le ofreció financiar su libro a cambio del códice; además, su carrera estaba estancada.',
    opportunity: 'Consultó el códice el 20 de mayo en la mesa 7, fuera del alcance de la cámara, con una credencial vencida que nadie revisó.',
    method: 'Sacó el códice de su estuche, lo ocultó bajo el abrigo y devolvió la caja con la carpeta de índices. El arco detector sonó al salir y dijo que eran sus llaves.',
    justification: 'La caja perdió 228 g exactamente durante su consulta: el 19 pesaba 1840 g y el 21, con la balanza calibrada, 1612 g. El arco detector sonó con su credencial a las 12:44.',
    eliminations: {
      cuellar: { evidence: ['E5'], explanation: 'Recibió la caja ya con 1612 g y la devolvió con el mismo peso.' },
      feijoo: { evidence: ['E6'], explanation: 'Anotó el peso real y él mismo pidió calibrar la balanza: fue negligente, no ladrón.' },
      arenas: { evidence: ['E5'], explanation: 'El 19 de mayo devolvió la caja con los 1840 g completos.' },
      ochoa: { evidence: ['E7'], explanation: 'El 20 de mayo tenía turno de descanso y no entró a la biblioteca.' },
    },
    incriminating: ['E1', 'E2', 'E3', 'E8'],
    reveal: [
      'Julián Lezama llevaba años sin publicar. Un coleccionista le prometió financiar su libro si conseguía el Códice de Almagro.',
      'Eligió la mesa 7, fuera del alcance de la cámara, y escondió los 112 folios bajo el forro de su abrigo. Cuando el arco sonó, culpó a sus llaves.',
      'El códice fue hallado en la habitación de su hotel, envuelto en papel de seda, listo para viajar.',
    ],
  },
  references: [
    { title: 'Mesas de lectura', sql: 'SELECT * FROM mesas;' },
    { title: 'Documentos del siglo XV', sql: "SELECT titulo, tipo FROM documentos WHERE siglo = 'XV';" },
    { title: 'Documentos más pesados', sql: 'SELECT titulo, peso_caja_g FROM documentos ORDER BY peso_caja_g DESC;' },
    { title: 'Investigadores por institución', sql: 'SELECT DISTINCT institucion FROM investigadores;' },
    { title: 'Consultas del 20 de mayo', sql: "SELECT * FROM solicitudes WHERE fecha = '2025-05-20';" },
    { title: 'Consultas en mesas sin cámara', sql: 'SELECT * FROM solicitudes WHERE id_mesa IN (7, 9);' },
    { title: 'Consultas del investigador 7', sql: 'SELECT * FROM solicitudes WHERE id_investigador = 7;' },
    { title: 'Personal', sql: 'SELECT * FROM personal;' },
    { title: 'Turnos de Feijoo', sql: 'SELECT * FROM turnos WHERE id_personal = 1;' },
    { title: 'Torniquetes del 20 de mayo', sql: "SELECT * FROM torniquetes WHERE fecha = '2025-05-20' ORDER BY hora;" },
    { title: 'Incidencias', sql: 'SELECT * FROM incidencias ORDER BY fecha, hora;' },
    { title: 'Credencial INV-0388 en torniquetes', sql: "SELECT * FROM torniquetes WHERE credencial = 'INV-0388';" },
    { title: 'Investigadores de Puerto Alto o del Litoral', sql: "SELECT nombre, apellido, institucion FROM investigadores WHERE institucion LIKE '%Puerto%' OR institucion LIKE '%Litoral%';" },
  ],
};
