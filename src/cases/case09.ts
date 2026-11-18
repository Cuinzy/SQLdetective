import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts, hm } from './helpers';

// CASO 9 — El sabotaje ferroviario
// Culpable: Teodoro Amaya (técnico de vía, id 14, código TA-14).
// Entró a la caseta de agujas A a las 05:04 (su turno empezaba a las 06:00), cerró como «completada» la orden
// OM-5531 de la aguja A-7 (asignada a una compañera de vacaciones) a las 05:12 y bajó la presión hidráulica:
// desde las 05:10 la presión de A-7 cae a ~64 bar. Motivo: iba a ser reubicado por la automatización.

const R = rng(909);
const EXCL = ['Amaya', 'Quintana', 'Rueda', 'Lugo', 'Mendieta'];

const sensores = table('sensores', 'Sensores instalados en los equipos de vía de la Estación Central.', [
  'id_sensor:text:pk|Código del sensor',
  'tipo:text|presion (bar), temperatura (°C) o vibracion (mm/s)',
  'equipo:text|Equipo monitoreado',
  'ubicacion:text|Ubicación',
], [
  ['S-A3P', 'presion', 'Aguja A-3', 'Haz de vías A'],
  ['S-A3T', 'temperatura', 'Aguja A-3', 'Haz de vías A'],
  ['S-A7P', 'presion', 'Aguja A-7', 'Haz de vías A'],
  ['S-A7T', 'temperatura', 'Aguja A-7', 'Haz de vías A'],
  ['S-B2P', 'presion', 'Aguja B-2', 'Haz de vías B'],
  ['S-B2V', 'vibracion', 'Aguja B-2', 'Haz de vías B'],
  ['S-B5P', 'presion', 'Aguja B-5', 'Haz de vías B'],
  ['S-SCT', 'temperatura', 'Sala de control', 'Edificio técnico'],
]);

const lec: Cell[][] = [];
let lid = 1;
for (const d of ['2025-04-20', '2025-04-21', '2025-04-22']) {
  const maxM = d === '2025-04-22' ? 9 * 60 : 24 * 60;
  for (let m = 0; m < maxM; m += 10) {
    for (const s of ['S-A3P', 'S-A3T', 'S-A7P', 'S-A7T', 'S-B2P', 'S-B2V', 'S-B5P', 'S-SCT']) {
      let v: number;
      if (s.endsWith('P')) v = R.int(1120, 1240) / 10;
      else if (s.endsWith('V')) v = R.int(20, 45) / 10;
      else v = s === 'S-SCT' ? R.int(200, 240) / 10 : R.int(120, 260) / 10;
      if (s === 'S-A7P' && d === '2025-04-22' && m >= 310) v = m === 310 ? 64.0 : R.int(650, 720) / 10;
      if (s === 'S-A7P' && d === '2025-04-22' && m >= 470) v = R.int(660, 700) / 10;
      lec.push([lid++, s, ts(d, m), v]);
    }
  }
}
const lecturas = table('lecturas_sensor', 'Lecturas automáticas cada 10 minutos (20 al 22 de abril de 2025).', [
  'id_lectura:integer:pk|Identificador',
  'id_sensor:text:fk=sensores.id_sensor|Sensor',
  'fecha_hora:timestamp|Momento',
  'valor:numeric|Valor medido',
], lec);

const fill = namePool(R, 18, EXCL);
const opRows: Cell[][] = [
  [5, 'Jairo', 'Mendieta', 'Maquinista', 'JM-05'],
  [14, 'Teodoro', 'Amaya', 'Técnico de vía', 'TA-14'],
  [17, 'Rosalba', 'Quintana', 'Jefa de sala de control', 'RQ-17'],
  [22, 'Patricia', 'Rueda', 'Técnica de vía', 'PR-22'],
  [31, 'Bernardo', 'Lugo', 'Ingeniero contratista (automatización)', 'LG-31'],
];
const roles = ['Maquinista', 'Maquinista', 'Maquinista', 'Maquinista', 'Técnico de vía', 'Técnico de vía', 'Técnica de vía', 'Operador de sala de control', 'Operadora de sala de control', 'Jefe de estación', 'Electricista', 'Electricista', 'Auxiliar de andén', 'Auxiliar de andén', 'Supervisor de mantenimiento', 'Técnico de señalización', 'Maquinista', 'Operador de sala de control'];
roles.forEach((r, i) => opRows.push([40 + i, fill[i].nombre, fill[i].apellido, r, `${fill[i].nombre[0]}${fill[i].apellido[0]}-${40 + i}`.normalize('NFD').replace(/[̀-ͯ]/g, '')]));
const operarios = table('operarios', 'Personal de la Estación Central.', [
  'id_operario:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'codigo_acceso:text|Código de la tarjeta de acceso',
], opRows);

const turnRows: Cell[][] = [];
let tid = 1;
const shiftOf = (id: number, d: string): [string, string] | null => {
  if (id === 22) return null; // vacaciones
  if (id === 31) return d === '2025-04-21' ? ['08:00', '16:00'] : null;
  if (id === 14) return ['06:00', '14:00'];
  if (id === 17) return ['22:00', '06:00'];
  if (id === 5) return ['06:00', '14:00'];
  const opts: [string, string][] = [['06:00', '14:00'], ['14:00', '22:00'], ['22:00', '06:00']];
  return opts[(id + d.charCodeAt(9)) % 3];
};
for (const d of ['2025-04-20', '2025-04-21', '2025-04-22'])
  for (const o of opRows) {
    const s = shiftOf(o[0] as number, d);
    if (s) turnRows.push([tid++, o[0], d, s[0], s[1]]);
  }
const turnos = table('turnos', 'Turnos programados (el turno de 22:00 termina a las 06:00 del día siguiente).', [
  'id_turno:integer:pk|Identificador',
  'id_operario:integer:fk=operarios.id_operario|Operario',
  'fecha:date|Fecha de inicio del turno',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin',
], turnRows);

const acc: Cell[][] = [];
const toM = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
for (const t of turnRows) {
  const op = opRows.find((o) => o[0] === t[1])!;
  const code = op[4] as string;
  const d = t[2] as string;
  const start = toM(t[3] as string);
  const sala = /sala de control|Jefa|Jefe/i.test(op[3] as string) ? 'Sala de control' : /vía|señal|mantenimiento/i.test(op[3] as string) ? R.pick(['Caseta de agujas A', 'Caseta de agujas B', 'Taller']) : /Maquinista/.test(op[3] as string) ? 'Depósito de trenes' : 'Andenes';
  if (op[0] === 14 && d === '2025-04-22') continue;
  acc.push([code, sala, ts(d, (start - R.int(5, 15) + 1440) % 1440)]);
  if (R.chance(0.6)) acc.push([code, sala, ts(d, (start + R.int(120, 360)) % 1440)]);
}
acc.push(['TA-14', 'Caseta de agujas A', ts('2025-04-22', 304)], ['TA-14', 'Taller', ts('2025-04-22', 352)], ['TA-14', 'Caseta de agujas B', ts('2025-04-22', 420)]);
acc.push(['RQ-17', 'Sala de control', ts('2025-04-22', 125)], ['RQ-17', 'Sala de control', ts('2025-04-22', 290)]);
acc.push(['LG-31', 'Sala de control', ts('2025-04-21', 930)]);
acc.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const accesos = table('accesos_tecnicos', 'Lecturas de tarjetas en salas técnicas.', [
  'id_acceso:integer:pk|Identificador',
  'codigo_acceso:text|Tarjeta',
  'sala:text|Sala técnica',
  'fecha_hora:timestamp|Momento',
], acc.map((a, i) => [7000 + i, ...a]));

const ords: Cell[][] = [];
const equipos = ['Aguja A-3', 'Aguja B-2', 'Aguja B-5', 'Señal S-12', 'Catenaria tramo 4', 'Aguja A-7'];
for (let i = 0; i < 26; i++) {
  const asig = R.pick(opRows.filter((o) => /vía|señal|Electric/i.test(o[3] as string) && o[0] !== 22));
  const done = R.chance(0.75);
  const fecha = `2025-04-${String(R.int(10, 21)).padStart(2, '0')}`;
  ords.push([`OM-${5500 + i}`, R.pick(equipos.slice(0, 5)), R.pick(['preventivo', 'correctivo', 'inspección']), 'Rutina programada', asig[0], fecha, done ? 'completada' : 'pendiente', done ? asig[0] : null, done ? `${fecha} ${hm(R.int(500, 1300))}` : null]);
}
ords.push(['OM-5531', 'Aguja A-7', 'preventivo', 'Ajuste de presión del circuito hidráulico', 22, '2025-04-22', 'completada', 14, '2025-04-22 05:12:00']);
ords.push(['OM-5532', 'Aguja A-7', 'inspección', 'Inspección visual posterior a ajuste', 41, '2025-04-23', 'pendiente', null, null]);
const ordenes = table('ordenes_mantenimiento', 'Órdenes de mantenimiento de vía.', [
  'id_orden:text:pk|Código de la orden',
  'equipo:text|Equipo intervenido',
  'tipo:text|preventivo, correctivo o inspección',
  'descripcion:text|Trabajo a realizar',
  'asignada_a:integer:fk=operarios.id_operario|Operario asignado',
  'fecha_programada:date|Fecha programada',
  'estado:text|pendiente o completada',
  'cerrada_por:integer:null:fk=operarios.id_operario|Operario que la cerró',
  'fecha_cierre:timestamp:null|Momento del cierre',
], ords);

const novedades = table('novedades_personal', 'Novedades administrativas del personal.', [
  'id_novedad:integer:pk|Identificador',
  'id_operario:integer:fk=operarios.id_operario|Operario',
  'tipo:text|vacaciones, incapacidad, reubicación, capacitación',
  'fecha_inicio:date|Inicio',
  'fecha_fin:date|Fin',
  'detalle:text|Detalle',
], [
  [1, 22, 'vacaciones', '2025-04-18', '2025-04-27', 'Vacaciones anuales'],
  [2, 14, 'reubicación', '2025-04-15', '2025-06-30', 'Notificación: el puesto de técnico de agujas se elimina con la automatización de la fase 2'],
  [3, 44, 'reubicación', '2025-04-15', '2025-06-30', 'Notificación: el puesto de técnico de agujas se elimina con la automatización de la fase 2'],
  [4, 47, 'capacitación', '2025-04-21', '2025-04-21', 'Curso de seguridad eléctrica'],
  [5, 52, 'incapacidad', '2025-04-19', '2025-04-23', 'Esguince de tobillo'],
  [6, 40, 'vacaciones', '2025-05-02', '2025-05-12', 'Vacaciones anuales'],
]);

const circ: Cell[][] = [];
const maquinistas = opRows.filter((o) => o[3] === 'Maquinista').map((o) => o[0] as number);
let cid = 1;
for (let k = 0; k < 16; k++) {
  const tren = `T-${101 + k}`;
  const maq = k === 0 ? 5 : R.pick(maquinistas.filter((x) => x !== 5));
  const base = 330 + k * 15;
  for (const [p, off] of [['Entrada norte', 0], ['Aguja A-3', 3], ['Aguja A-7', 5], ['Andén 2', 8]] as [string, number][]) {
    let v = R.int(28, 39);
    if (k === 0) v = p === 'Aguja A-7' ? 39 : R.int(30, 37);
    circ.push([cid++, tren, maq, p, ts('2025-04-22', base + off + (k === 0 ? 133 : 0)), v]);
  }
}
const circulaciones = table('circulaciones', 'Paso de trenes por puntos de control (22 de abril). Límite en el haz A: 40 km/h.', [
  'id_circulacion:integer:pk|Identificador',
  'tren:text|Tren',
  'id_maquinista:integer:fk=operarios.id_operario|Maquinista',
  'punto:text|Punto de control',
  'fecha_hora:timestamp|Momento',
  'velocidad_kmh:integer|Velocidad registrada',
], circ);

export const case09: CaseDef = {
  id: 9,
  code: 'EXP-09',
  title: 'El sabotaje ferroviario',
  level: 2,
  tagline: 'La aguja A-7 falló a la hora pico. Los sensores sabían que algo andaba mal desde la madrugada.',
  location: 'Estación Central de Bruma, haz de vías A',
  date: '22 de abril de 2025, 07:48',
  scene: 'tren',
  briefing: [
    'A las 07:48 el tren T-101 pasó por la aguja A-7 y la aguja no se bloqueó en posición. Un descarrilamiento se evitó por centímetros. La estación estuvo cerrada tres horas.',
    'La empresa culpa a la velocidad del maquinista. El sindicato culpa al nuevo sistema automatizado. Los ingenieros sospechan que alguien manipuló el circuito hidráulico.',
    'Los sensores registran presión, temperatura y vibración cada 10 minutos. Combínalos con turnos, accesos y órdenes de mantenimiento.',
  ],
  timeline: [
    { time: '22:00', event: 'Inicia el turno nocturno de la sala de control.' },
    { time: '06:00', event: 'Inicia el turno de mañana.' },
    { time: '07:48', event: 'Falla de la aguja A-7 al paso del T-101.' },
  ],
  concepts: ['AVG', 'MIN / MAX', 'COUNT', 'GROUP BY', 'HAVING', 'INNER JOIN'],
  tables: [sensores, lecturas, operarios, turnos, accesos, ordenes, novedades, circulaciones],
  characters: [
    {
      id: 'amaya', name: 'Teodoro Amaya', role: 'Técnico de vía (agujas)', age: 55, suspect: true,
      bio: 'Treinta años ajustando agujas a mano. Su puesto desaparecerá con la automatización.',
      statement: 'Llegué a las seis, como siempre. Esa aguja la tocó el sistema nuevo, no yo.',
      look: { skin: 2, hair: 'canoso', hairColor: 7, facial: 'bigote', accessory: 'gorra', outfitStyle: 'uniforme', outfit: 7, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿A qué hora llegó el 22 de abril?', answer: 'A las seis en punto. Mi turno empieza a las seis.' },
        { id: 'q2', text: '¿Qué opina de la automatización?', answer: 'Que una máquina no siente cuando una aguja está mal. Pero eso no es delito.' },
        { id: 'q3', text: 'Usted cerró la orden OM-5531 de la aguja A-7 a las 05:12. Esa orden era de Patricia Rueda.', answer: 'Patricia está de vacaciones, alguien tenía que hacerla. Ajusté la presión según el manual.', requires: ['E3'], contradiction: true },
        { id: 'q4', text: 'Su tarjeta entró a la caseta de agujas A a las 05:04, antes de su turno, y la presión cayó a las 05:10.', answer: '…Querían demostrar que sin nosotros todo funciona. Yo quería demostrar lo contrario. Nadie iba a salir herido.', requires: ['E2', 'E4'], contradiction: true, note: 'Amaya admite haber alterado la presión para desacreditar la automatización.' },
      ],
    },
    {
      id: 'quintana', name: 'Rosalba Quintana', role: 'Jefa de sala de control (turno noche)', age: 48, suspect: true,
      bio: 'Monitorea la red desde la sala de control. Debió ver la caída de presión.',
      statement: 'No hay alarma automática de presión todavía. Eso venía con la fase 2.',
      look: { skin: 3, hair: 'coleta', hairColor: 1, accessory: 'auriculares', outfitStyle: 'uniforme', outfit: 2 },
      questions: [
        { id: 'q1', text: '¿Salió de la sala de control durante la noche?', answer: 'No. Solo entré y volví a entrar tras ir al baño. Puede ver mis lecturas de tarjeta.' },
        { id: 'q2', text: '¿Vio a alguien en el haz A?', answer: 'Hacia las cinco vi una linterna cerca de la caseta A. Pensé que era el técnico de la madrugada.', note: 'Quintana vio una linterna cerca de la caseta A hacia las 05:00.' },
      ],
    },
    {
      id: 'rueda', name: 'Patricia Rueda', role: 'Técnica de vía', age: 37, suspect: true,
      bio: 'Tenía asignada la orden de ajuste de la aguja A-7.',
      statement: 'Estoy de vacaciones desde el 18. Esa orden debía reprogramarse.',
      look: { skin: 1, hair: 'corto', hairColor: 4, outfitStyle: 'chaqueta', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Quién sabía que su orden quedaba sin hacer?', answer: 'Todo el equipo de agujas. Teodoro se ofreció a cubrirla, pero el supervisor dijo que esperara.' },
      ],
    },
    {
      id: 'lugo', name: 'Bernardo Lugo', role: 'Ingeniero contratista (automatización)', age: 42, suspect: true,
      bio: 'Su empresa instala el nuevo sistema. Si la falla se atribuye al sistema, pierde el contrato.',
      statement: 'Nuestro sistema todavía no controla la aguja A-7. Es imposible que fallara por nosotros.',
      look: { skin: 0, hair: 'corto', hairColor: 2, accessory: 'gafas', outfitStyle: 'camisa', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿Cuándo estuvo por última vez en la estación?', answer: 'El lunes 21, en la sala de control hasta media tarde.' },
      ],
    },
    {
      id: 'mendieta', name: 'Jairo Mendieta', role: 'Maquinista del T-101', age: 39, suspect: true,
      bio: 'Conducía el tren que pasó por la aguja al fallar. La empresa lo culpa de exceso de velocidad.',
      statement: 'Iba a 39, por debajo del límite. La aguja se movió bajo mis ruedas.',
      look: { skin: 4, hair: 'corto', hairColor: 0, facial: 'barba', outfitStyle: 'uniforme', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Notó algo raro antes de la aguja?', answer: 'Un golpe seco, como si la aguja no estuviera trabada. En treinta segundos frené.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Presión anómala', description: 'Comparando sensores, la presión mínima de la aguja A-7 (S-A7P) fue 64 bar, muy por debajo de su promedio habitual (~118 bar).', reference: 'SELECT id_sensor, AVG(valor) AS promedio, MIN(valor) AS minimo, MAX(valor) AS maximo FROM lecturas_sensor GROUP BY id_sensor;', match: { any: [['S-A7P', '64']], maxRows: 12, features: ['aggregate'] } },
    { id: 'E2', key: true, title: 'La hora de la caída', description: 'La primera lectura anómala de S-A7P ocurrió a las 05:10 del 22 de abril, más de dos horas antes del incidente.', reference: "SELECT MIN(fecha_hora) FROM lecturas_sensor WHERE id_sensor = 'S-A7P' AND valor < 100;", match: { any: [['2025-04-22 05:10']], maxRows: 40 }, implicates: ['amaya'] },
    { id: 'E3', key: true, title: 'Una orden cerrada por otro', description: 'La orden OM-5531 (ajuste de presión de la A-7) estaba asignada a Rueda, pero la cerró Teodoro Amaya a las 05:12.', reference: "SELECT o.id_orden, o.descripcion, o.fecha_cierre, op.nombre, op.apellido FROM ordenes_mantenimiento o INNER JOIN operarios op ON o.cerrada_por = op.id_operario WHERE o.equipo = 'Aguja A-7';", match: { any: [['OM-5531', 'Amaya']], maxRows: 10, features: ['join'] }, implicates: ['amaya'] },
    { id: 'E4', key: true, title: 'Visita de madrugada', description: 'La tarjeta TA-14 (Teodoro Amaya) entró a la caseta de agujas A a las 05:04 del 22 de abril.', reference: "SELECT o.apellido, a.sala, a.fecha_hora FROM accesos_tecnicos a INNER JOIN operarios o ON a.codigo_acceso = o.codigo_acceso WHERE a.sala = 'Caseta de agujas A' AND a.fecha_hora BETWEEN '2025-04-22 00:00' AND '2025-04-22 07:48';", match: { any: [['Amaya', '05:04'], ['TA-14', '05:04']], maxRows: 10 }, implicates: ['amaya'] },
    { id: 'E5', title: 'Fuera de turno', description: 'El turno de Amaya del 22 de abril empezaba a las 06:00.', reference: "SELECT o.apellido, t.fecha, t.hora_inicio, t.hora_fin FROM turnos t INNER JOIN operarios o ON t.id_operario = o.id_operario WHERE o.apellido = 'Amaya';", match: { any: [['Amaya', '2025-04-22', '06:00'], ['14', '2025-04-22', '06:00']], maxRows: 6 }, implicates: ['amaya'] },
    { id: 'E6', title: 'La jefa no salió de la sala', description: 'Todas las lecturas de la tarjeta de Rosalba Quintana durante la noche fueron en la sala de control.', reference: "SELECT a.sala, COUNT(*) FROM accesos_tecnicos a INNER JOIN operarios o ON a.codigo_acceso = o.codigo_acceso WHERE o.apellido = 'Quintana' GROUP BY a.sala;", match: { any: [['Sala de control']], maxRows: 2, features: ['join'] }, clears: ['quintana'] },
    { id: 'E7', title: 'De vacaciones', description: 'Patricia Rueda (operaria 22) está de vacaciones del 18 al 27 de abril.', reference: "SELECT * FROM novedades_personal WHERE tipo = 'vacaciones';", match: { any: [['22', 'vacaciones', '2025-04-18'], ['Rueda', 'vacaciones']], maxRows: 6 }, clears: ['rueda'] },
    { id: 'E8', title: 'El contratista no estaba', description: 'La última lectura de la tarjeta de Bernardo Lugo fue el 21 de abril a las 15:30 en la sala de control.', reference: "SELECT a.* FROM accesos_tecnicos a INNER JOIN operarios o ON a.codigo_acceso = o.codigo_acceso WHERE o.apellido = 'Lugo';", match: { any: [['LG-31', '2025-04-21 15:30']], maxRows: 5 }, clears: ['lugo'] },
    { id: 'E9', title: 'Velocidad reglamentaria', description: 'La velocidad máxima del maquinista Mendieta el 22 de abril fue 39 km/h, bajo el límite de 40.', reference: 'SELECT o.apellido, MAX(c.velocidad_kmh) AS maxima, AVG(c.velocidad_kmh) AS promedio FROM circulaciones c INNER JOIN operarios o ON c.id_maquinista = o.id_operario GROUP BY o.apellido;', match: { any: [['Mendieta', '39'], ['5', '39']], maxRows: 10, features: ['aggregate'] }, clears: ['mendieta'] },
    { id: 'E10', title: 'Un puesto que desaparece', description: 'El 15 de abril, Amaya (operario 14) fue notificado de que su puesto se elimina con la automatización.', reference: "SELECT * FROM novedades_personal WHERE tipo = 'reubicación';", match: { any: [['14', 'reubicación']], maxRows: 5 }, implicates: ['amaya'] },
  ],
  objectives: [
    { id: 'O1', title: 'Detectar la anomalía', description: '¿Qué sensor se salió de lo normal y desde cuándo?', evidence: ['E1', 'E2'], tables: ['lecturas_sensor', 'sensores'] },
    { id: 'O2', title: 'Revisar el mantenimiento', description: '¿Quién intervino la aguja A-7?', evidence: ['E3', 'E7'], need: 1, tables: ['ordenes_mantenimiento', 'novedades_personal'] },
    { id: 'O3', title: 'Presencia en las casetas', description: 'Reconstruye quién estuvo cerca de la aguja esa madrugada.', evidence: ['E4', 'E5', 'E6', 'E8'], need: 2, tables: ['accesos_tecnicos', 'turnos', 'operarios'] },
    { id: 'O4', title: 'Descartar error de conducción', description: '¿Iba el tren demasiado rápido?', evidence: ['E9'], tables: ['circulaciones'] },
    { id: 'O5', title: 'Buscar el móvil', description: '¿Quién ganaba con una falla atribuida a la automatización?', evidence: ['E10'], tables: ['novedades_personal'] },
  ],
  hints: [
    { id: 'H1', title: 'Lo normal y lo anormal', evidence: 'E1', levels: ['Miles de lecturas: necesitas resumirlas para ver qué se salió de lo normal.', 'Calcula promedio, mínimo y máximo de cada sensor.', 'SELECT id_sensor, AVG(valor), MIN(valor), MAX(valor) FROM lecturas_sensor GROUP BY id_sensor'] },
    { id: 'H2', title: '¿Desde cuándo?', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['La falla fue a las 07:48, pero ¿cuándo empezó la anomalía?', 'Busca la primera lectura de S-A7P por debajo de 100 bar.', 'MIN(fecha_hora) con WHERE valor < 100 (o ORDER BY fecha_hora con LIMIT).'] },
    { id: 'H3', title: 'Las órdenes de trabajo', evidence: 'E3', levels: ['Ajustar una presión requiere una orden de mantenimiento.', 'Relaciona ordenes_mantenimiento con operarios a través de cerrada_por.', 'INNER JOIN operarios ON ordenes_mantenimiento.cerrada_por = operarios.id_operario'] },
    { id: 'H4', title: 'La caseta A', evidence: 'E4', levels: ['Para tocar el circuito hidráulico hay que entrar a la caseta de agujas A.', 'accesos_tecnicos usa el código de tarjeta; los nombres están en operarios.', 'JOIN por codigo_acceso y filtra la sala y la madrugada del 22.'] },
    { id: 'H5', title: 'El turno', evidence: 'E5', requires: { evidence: ['E4'] }, levels: ['¿Le correspondía estar allí a esa hora?', 'Revisa turnos del operario sospechoso.', 'JOIN turnos con operarios y filtra por apellido.'] },
    { id: 'H6', title: 'La sala de control', evidence: 'E6', levels: ['La jefa de turno dice que no salió de la sala.', 'Cuenta sus lecturas de tarjeta por sala.', 'GROUP BY sala con COUNT(*), uniendo con operarios.'] },
    { id: 'H7', title: 'La técnica asignada', evidence: 'E7', levels: ['La orden estaba asignada a otra persona. ¿Dónde estaba?', 'novedades_personal registra vacaciones, incapacidades y más.', "WHERE tipo = 'vacaciones'"] },
    { id: 'H8', title: 'El contratista', evidence: 'E8', levels: ['El contratista tenía mucho que perder… ¿estuvo en la estación?', 'Busca sus lecturas de tarjeta.', 'JOIN accesos_tecnicos con operarios filtrando su apellido.'] },
    { id: 'H9', title: '¿Exceso de velocidad?', evidence: 'E9', levels: ['La empresa culpa al maquinista.', 'Calcula la velocidad máxima de cada maquinista.', 'MAX(velocidad_kmh) con GROUP BY maquinista.'] },
    { id: 'H10', title: 'Un móvil laboral', evidence: 'E10', levels: ['La automatización amenaza algunos puestos.', 'Revisa novedades_personal.', "WHERE tipo = 'reubicación'"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'amaya',
    motive: 'Su puesto iba a eliminarse con la automatización; quería demostrar que el sistema nuevo era inseguro.',
    opportunity: 'Conocía la orden pendiente de su compañera de vacaciones y el haz A quedaba sin vigilancia antes del turno de mañana.',
    method: 'Entró a la caseta A a las 05:04, redujo la presión del circuito hidráulico de la aguja A-7 y cerró la orden OM-5531 como completada para justificar su intervención.',
    justification: 'La presión cae a las 05:10, seis minutos después de que su tarjeta entra a la caseta A fuera de turno, y él cerró la orden de esa aguja a las 05:12.',
    eliminations: {
      quintana: { evidence: ['E6'], explanation: 'Todas sus lecturas de tarjeta están en la sala de control.' },
      rueda: { evidence: ['E7'], explanation: 'Está de vacaciones desde el 18 de abril.' },
      lugo: { evidence: ['E8'], explanation: 'Su última presencia en la estación fue el 21 a las 15:30.' },
      mendieta: { evidence: ['E9'], explanation: 'Su velocidad máxima fue 39 km/h, dentro del límite.' },
    },
    incriminating: ['E2', 'E3', 'E4', 'E10'],
    reveal: [
      'Teodoro Amaya llevaba treinta años en las agujas. La carta de reubicación decía que una máquina haría su trabajo.',
      'Bajó la presión de la A-7 lo justo para que fallara al primer tren pesado. Pensó que el bloqueo de emergencia evitaría el accidente.',
      'No lo evitó del todo: el T-101 frenó a tiempo por la reacción del maquinista. Amaya fue suspendido y la fase 2 incluyó alarmas de presión.',
    ],
  },
  references: [
    { title: 'Sensores de presión', sql: "SELECT * FROM sensores WHERE tipo = 'presion';" },
    { title: 'Lecturas por sensor', sql: 'SELECT id_sensor, COUNT(*) FROM lecturas_sensor GROUP BY id_sensor;' },
    { title: 'Promedio de presión por equipo', sql: "SELECT s.equipo, AVG(l.valor) FROM lecturas_sensor l INNER JOIN sensores s ON l.id_sensor = s.id_sensor WHERE s.tipo = 'presion' GROUP BY s.equipo;" },
    { title: 'Lecturas bajas de presión', sql: "SELECT * FROM lecturas_sensor WHERE id_sensor = 'S-A7P' AND valor < 100 ORDER BY fecha_hora;" },
    { title: 'Temperatura máxima por sensor', sql: "SELECT id_sensor, MAX(valor) FROM lecturas_sensor WHERE id_sensor LIKE '%T' GROUP BY id_sensor;" },
    { title: 'Órdenes pendientes', sql: "SELECT * FROM ordenes_mantenimiento WHERE estado = 'pendiente';" },
    { title: 'Órdenes por operario asignado', sql: 'SELECT asignada_a, COUNT(*) FROM ordenes_mantenimiento GROUP BY asignada_a HAVING COUNT(*) >= 2;' },
    { title: 'Turnos de la noche del 21', sql: "SELECT o.apellido, t.hora_inicio FROM turnos t INNER JOIN operarios o ON t.id_operario = o.id_operario WHERE t.fecha = '2025-04-21' AND t.hora_inicio = '22:00';" },
    { title: 'Accesos por sala', sql: 'SELECT sala, COUNT(*) FROM accesos_tecnicos GROUP BY sala;' },
    { title: 'Trenes del 22 de abril', sql: 'SELECT tren, MIN(fecha_hora) FROM circulaciones GROUP BY tren ORDER BY MIN(fecha_hora);' },
    { title: 'Velocidad promedio en la aguja A-7', sql: "SELECT AVG(velocidad_kmh) FROM circulaciones WHERE punto = 'Aguja A-7';" },
  ],
};
