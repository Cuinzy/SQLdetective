import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts, hm } from './helpers';

// CASO 4 — El robo en el hotel
// Culpable: Fausto Lindarte (botones, id 7, tarjeta EMP-27).
// Pidió la llave maestra MK-03 a las 13:50 «para subir equipaje a la 518» (cuyo huésped llegó a las 15:30).
// Su tarjeta personal fue denegada en la 512 a las 14:20; con MK-03 abrió la 512 a las 14:22 y robó el reloj.

const R = rng(404);
const D = '2025-08-09';
const EXCL = ['Lindarte', 'Murillo', 'Aldana', 'Bermejo', 'Coronado'];

const habRows: Cell[][] = [];
for (let p = 1; p <= 6; p++)
  for (let n = 1; n <= 20; n++) {
    const num = p * 100 + n;
    const tipo = n <= 2 ? 'suite' : n <= 12 ? 'doble' : 'sencilla';
    habRows.push([num, p, tipo, tipo === 'suite' ? 420 : tipo === 'doble' ? 210 : 150]);
  }
const habitaciones = table('habitaciones', 'Habitaciones del Hotel Faro Gris.', [
  'numero:integer:pk|Número de habitación',
  'piso:integer|Piso',
  'tipo:text|suite, doble o sencilla',
  'tarifa:numeric|Tarifa por noche (USD)',
], habRows);

// Huéspedes
const guestNames = namePool(R, 40, EXCL);
const occupied = habRows.map((r) => r[0] as number).filter((n) => ![512, 514, 508, 518].includes(n) && R.chance(0.33)).slice(0, 38);
const huespedRows: Cell[][] = [
  [30, 'Beatriz', 'Aldana', 512, '2025-08-07', '14:10', '2025-08-12'],
  [31, 'Gerardo', 'Aldana', 514, '2025-08-07', '14:12', '2025-08-12'],
  [32, 'Leonor', 'Bermejo', 508, '2025-08-08', '18:40', '2025-08-10'],
  [33, 'Hugo', 'Salazar', 518, '2025-08-09', '15:30', '2025-08-11'],
];
occupied.forEach((num, i) => {
  const n = guestNames[i];
  huespedRows.push([40 + i, n.nombre, n.apellido, num, `2025-08-0${R.int(5, 9)}`, hm(R.int(780, 1260)), `2025-08-1${R.int(0, 4)}`]);
});
const huespedes = table('huespedes', 'Huéspedes alojados el 9 de agosto de 2025.', [
  'id_huesped:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'habitacion:integer:fk=habitaciones.numero|Habitación asignada',
  'fecha_check_in:date|Fecha de llegada',
  'hora_check_in:time|Hora de llegada',
  'fecha_check_out:date|Salida prevista',
], huespedRows);

// Empleados
const staffNames = namePool(R, 12, EXCL);
const empRows: Cell[][] = [
  [3, 'Celeste', 'Murillo', 'Camarera de piso', 5, 'EMP-12'],
  [5, 'Ismael', 'Coronado', 'Recepcionista', null, 'EMP-04'],
  [7, 'Fausto', 'Lindarte', 'Botones', null, 'EMP-27'],
];
const puestos: [string, number | null][] = [['Camarera de piso', 1], ['Camarero de piso', 2], ['Camarera de piso', 3], ['Camarero de piso', 4], ['Camarera de piso', 6], ['Recepcionista', null], ['Botones', null], ['Cocinero', null], ['Mesero', null], ['Mesera', null], ['Terapeuta de spa', null], ['Jefe de mantenimiento', null]];
puestos.forEach(([p, piso], i) => empRows.push([10 + i, staffNames[i].nombre, staffNames[i].apellido, p, piso, `EMP-${30 + i * 3}`]));
const empleados = table('empleados', 'Personal del hotel. Las tarjetas personales NO abren habitaciones de huéspedes.', [
  'id_empleado:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'puesto:text|Puesto',
  'piso_asignado:integer:null|Piso asignado (solo camareros de piso)',
  'tarjeta_personal:text|Código de la tarjeta personal del empleado',
], empRows);

// Llaves: tarjetas de huésped y llaves maestras
const llavesRows: Cell[][] = [];
for (const h of huespedRows) llavesRows.push([`G-${h[3]}A`, 'huesped', h[3], h[0]]);
llavesRows.push(['G-514B', 'huesped', 514, 31]);
for (const [c, d] of [['MK-01', 1], ['MK-02', 3], ['MK-03', 5], ['MK-04', 6], ['MK-05', 0]] as [string, number][]) llavesRows.push([c, 'maestra', d === 0 ? null : d * 100, null]);
const llaves = table('llaves', 'Tarjetas magnéticas emitidas. Las maestras abren todas las habitaciones de su zona (MK-03: piso 5).', [
  'codigo:text:pk|Código de la llave',
  'tipo:text|huesped o maestra',
  'habitacion_referencia:integer:null|Habitación (huésped) o primera habitación de la zona (maestra)',
  'id_huesped:integer:null:fk=huespedes.id_huesped|Huésped titular',
], llavesRows);

// Aperturas de puertas
const ap: [string, number, number, string][] = [];
for (const h of huespedRows) {
  const num = h[3] as number;
  if (num === 512 || num === 518) continue;
  const k = R.int(2, 5);
  for (let i = 0; i < k; i++) ap.push([`G-${num}A`, num, R.int(420, 1380), R.chance(0.04) ? 'denegada' : 'abierta']);
}
ap.push(['G-512A', 512, 475, 'abierta'], ['MK-03', 512, 631, 'abierta'], ['G-512A', 512, 778, 'abierta'], ['EMP-27', 512, 860, 'denegada'], ['MK-03', 512, 862, 'abierta'], ['MK-03', 518, 867, 'abierta'], ['G-512A', 512, 910, 'abierta']);
ap.push(['G-514A', 514, 845, 'abierta'], ['G-514B', 514, 1010, 'abierta']);
ap.push(['G-518A', 518, 940, 'abierta']);
// limpieza con maestras por la mañana
const limp: [number, number, number, number][] = [];
const cleaners: Record<number, [number, string]> = { 1: [10, 'MK-01'], 2: [10, 'MK-01'], 3: [12, 'MK-02'], 4: [12, 'MK-02'], 5: [3, 'MK-03'], 6: [14, 'MK-04'] };
for (let p = 1; p <= 6; p++) {
  let m = 545;
  const rooms = huespedRows.map((h) => h[3] as number).filter((n) => Math.floor(n / 100) === p && n !== 518).sort();
  for (const num of rooms) {
    const [emp, key] = cleaners[p];
    const start = num === 512 ? 630 : m;
    limp.push([num, emp, start, start + 35]);
    ap.push([key, num, start + 1, 'abierta']);
    m = Math.max(m, start) + R.int(38, 50);
    if (m > 800) break;
  }
}
// la 512 ya tiene su apertura de limpieza (MK-03 10:31); quitar duplicado generado
const dupIdx = ap.findIndex((a) => a[0] === 'MK-03' && a[1] === 512 && a[2] === 631);
const dup2 = ap.findIndex((a, i) => i !== dupIdx && a[0] === 'MK-03' && a[1] === 512 && a[2] === 631);
if (dup2 >= 0) ap.splice(dup2, 1);
ap.sort((a, b) => a[2] - b[2]);
const aperturas = table('aperturas', 'Registro electrónico de las cerraduras de las habitaciones (9 de agosto).', [
  'id_apertura:integer:pk|Identificador',
  'codigo_llave:text|Tarjeta o llave usada',
  'habitacion:integer:fk=habitaciones.numero|Habitación',
  'fecha_hora:timestamp|Momento',
  'resultado:text|abierta o denegada',
], ap.map(([k, n, m, r], i) => [2000 + i, k, n, ts(D, m), r]));

const limpieza = table('limpieza', 'Servicio de limpieza de habitaciones (9 de agosto).', [
  'id_limpieza:integer:pk|Identificador',
  'habitacion:integer:fk=habitaciones.numero|Habitación',
  'id_empleado:integer:fk=empleados.id_empleado|Camarero/a',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin',
], limp.map(([n, e, s, f], i) => [600 + i, n, e, hm(s), hm(f)]));

const asignaciones = table('asignaciones_maestras', 'Entrega y devolución de llaves maestras en recepción (9 de agosto).', [
  'id_asignacion:integer:pk|Identificador',
  'codigo_llave:text:fk=llaves.codigo|Llave maestra',
  'id_empleado:integer:fk=empleados.id_empleado|Empleado que la recibe',
  'hora_entrega:time|Hora de entrega',
  'hora_devolucion:time|Hora de devolución',
  'motivo:text|Motivo declarado',
], [
  [1, 'MK-01', 10, '08:30', '13:40', 'limpieza pisos 1 y 2'],
  [2, 'MK-02', 12, '08:35', '13:20', 'limpieza pisos 3 y 4'],
  [3, 'MK-03', 3, '08:40', '13:50', 'limpieza piso 5'],
  [4, 'MK-04', 14, '08:45', '13:30', 'limpieza piso 6'],
  [5, 'MK-03', 7, '13:50', '14:40', 'subir equipaje a la 518'],
  [6, 'MK-03', 3, '14:40', '18:00', 'cobertura de tarde piso 5'],
  [7, 'MK-05', 21, '16:10', '16:40', 'reparación de aire acondicionado 305'],
  [8, 'MK-01', 16, '19:30', '19:45', 'huésped de la 104 encerrado fuera'],
]);

const servicio = table('servicio_habitacion', 'Pedidos al servicio de habitaciones (9 de agosto).', [
  'id_pedido:integer:pk|Identificador',
  'habitacion:integer:fk=habitaciones.numero|Habitación',
  'hora_pedido:time|Hora del pedido',
  'hora_entrega:time|Hora de entrega',
  'descripcion:text|Pedido',
  'firmado_por:text|Quién firmó la recepción',
], [
  [1, 514, '14:15', '14:35', 'Sándwich club y agua mineral', 'G. Aldana'],
  [2, 203, '09:10', '09:30', 'Desayuno continental', 'Huésped'],
  [3, 412, '12:40', '13:05', 'Ensalada César', 'Huésped'],
  [4, 601, '13:20', '13:45', 'Almuerzo ejecutivo', 'Huésped'],
  [5, 105, '20:15', '20:40', 'Pasta y vino tinto', 'Huésped'],
  [6, 309, '22:00', '22:20', 'Té de hierbas', 'Huésped'],
  [7, 207, '07:45', '08:05', 'Café y fruta', 'Huésped'],
  [8, 512, '07:30', '07:50', 'Café negro', 'B. Aldana'],
]);

const reservas = table('reservas_servicios', 'Reservas de spa y restaurante (9 de agosto).', [
  'id_reserva:integer:pk|Identificador',
  'id_huesped:integer:fk=huespedes.id_huesped|Huésped',
  'servicio:text|Servicio reservado',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin',
], [
  [1, 30, 'Restaurante Mirador', '13:30', '15:00'],
  [2, 32, 'Spa — masaje y sauna', '13:30', '15:00'],
  [3, 40, 'Spa — facial', '10:00', '11:00'],
  [4, 41, 'Restaurante Mirador', '20:00', '21:30'],
  [5, 43, 'Spa — masaje', '16:00', '17:00'],
  [6, 45, 'Restaurante Mirador', '13:00', '14:00'],
  [7, 47, 'Spa — sauna', '18:30', '19:30'],
  [8, 31, 'Restaurante Mirador', '20:30', '22:00'],
  [9, 49, 'Restaurante Mirador', '12:30', '13:45'],
  [10, 52, 'Spa — masaje', '11:30', '12:30'],
]);

const accP: [string, string, number][] = [];
for (const e of empRows) {
  const card = e[5] as string;
  accP.push([card, 'vestidores', R.int(450, 500)]);
}
accP.push(['EMP-12', 'comedor de empleados', 835], ['EMP-12', 'comedor de empleados (salida)', 878]);
accP.push(['EMP-27', 'consigna de equipaje', 805], ['EMP-27', 'recepción', 830]);
accP.push(['EMP-04', 'recepción', 780], ['EMP-04', 'recepción', 900], ['EMP-04', 'oficina de gerencia', 945]);
for (let i = 0; i < 14; i++) accP.push([(R.pick(empRows)[5]) as string, R.pick(['lavandería', 'cocina', 'almacén', 'comedor de empleados']), R.int(540, 1200)]);
accP.sort((a, b) => a[2] - b[2]);
const accesosPersonal = table('accesos_personal', 'Uso de tarjetas del personal en áreas internas (9 de agosto).', [
  'id_acceso:integer:pk|Identificador',
  'tarjeta:text|Tarjeta del empleado',
  'zona:text|Zona interna',
  'fecha_hora:timestamp|Momento',
], accP.map(([c, z, m], i) => [4000 + i, c, z, ts(D, m)]));

export const case04: CaseDef = {
  id: 4,
  code: 'EXP-04',
  title: 'El robo en el hotel',
  level: 1,
  tagline: 'Un reloj de oro desapareció de la habitación 512 mientras su dueña almorzaba.',
  location: 'Hotel Faro Gris, quinto piso',
  date: '9 de agosto de 2025, 15:10',
  scene: 'hotel',
  briefing: [
    'La señora Beatriz Aldana, heredera de una naviera, dejó sobre la mesa de noche el reloj de bolsillo de oro de su abuelo antes de bajar a almorzar a las 13:30.',
    'Al volver a las 15:10, el reloj ya no estaba. La puerta no fue forzada y la caja fuerte está intacta.',
    'Las cerraduras electrónicas registran cada intento de apertura. Las llaves maestras se entregan y devuelven en recepción.',
  ],
  timeline: [
    { time: '13:30', event: 'Beatriz Aldana baja al restaurante.' },
    { time: '15:10', event: 'Vuelve a la 512 y descubre el robo.' },
  ],
  concepts: ['WHERE', 'AND / OR', 'IN', 'LIKE', 'BETWEEN', 'ORDER BY', 'DISTINCT'],
  tables: [habitaciones, huespedes, empleados, llaves, aperturas, limpieza, asignaciones, servicio, reservas, accesosPersonal],
  characters: [
    {
      id: 'fausto', name: 'Fausto Lindarte', role: 'Botones', age: 24, suspect: true,
      bio: 'Lleva seis meses en el hotel. Simpático con los huéspedes, siempre atento a las propinas.',
      statement: 'Esa tarde pedí la maestra para subir el equipaje de la 518. Nada más.',
      look: { skin: 3, hair: 'corto', hairColor: 0, accessory: 'gorra', outfitStyle: 'uniforme', outfit: 7, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Para qué pidió la llave maestra?', answer: 'Para dejar listo el equipaje del huésped de la 518, que llegaba por la tarde.' },
        { id: 'q2', text: '¿Entró a otra habitación del quinto piso?', answer: 'No, solo a la 518. Dejé las maletas y bajé.' },
        { id: 'q3', text: 'Su tarjeta personal fue rechazada en la puerta de la 512 a las 14:20. ¿Por qué intentó abrirla?', answer: '¿La 512? Me equivoqué de puerta… Son todas iguales.', requires: ['E2', 'E3'], contradiction: true, note: 'Fausto dice que se equivocó de puerta.' },
        { id: 'q4', text: 'El huésped de la 518 llegó a las 15:30 con su equipaje. ¿Qué maletas subió usted a las 14:20?', answer: '…Eran maletas que… No recuerdo bien.', requires: ['E5'], contradiction: true },
        { id: 'q5', text: 'Dos minutos después, la llave maestra que usted tenía abrió la 512.', answer: 'Quiero hablar con el gerente.', requires: ['E1', 'E4'], contradiction: true },
      ],
    },
    {
      id: 'celeste', name: 'Celeste Murillo', role: 'Camarera del quinto piso', age: 39, suspect: true,
      bio: 'Responsable habitual de la llave MK-03. Limpió la 512 por la mañana.',
      statement: 'Limpié la 512 a las diez y media. El reloj estaba en la mesa de noche, no lo toqué.',
      look: { skin: 4, hair: 'coleta', hairColor: 1, outfitStyle: 'uniforme', outfit: 0 },
      questions: [
        { id: 'q1', text: '¿Dónde estaba entre las 13:50 y las 14:40?', answer: 'En mi hora de almuerzo, en el comedor de empleados. Le presté la maestra a Fausto, que la pidió en recepción.', note: 'Celeste cedió la MK-03 a Fausto durante su almuerzo.' },
        { id: 'q2', text: '¿Es normal que un botones use la maestra?', answer: 'Solo para equipaje, y siempre con un huésped esperando. Me extrañó, pero recepción lo autorizó.' },
      ],
    },
    {
      id: 'gerardo', name: 'Gerardo Aldana', role: 'Sobrino de la víctima (habitación 514)', age: 35, suspect: true,
      bio: 'Disputa con su tía la herencia del reloj. Ocupa la habitación contigua.',
      statement: 'Ese reloj debió ser mío, pero yo no robo. Estuve en mi habitación toda la tarde.',
      look: { skin: 1, hair: 'mono', hairColor: 3, facial: 'perilla', outfitStyle: 'camisa', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Qué hizo entre las 14:00 y las 15:00?', answer: 'Pedí un sándwich a la habitación y trabajé en mi portátil. El mesero me vio.' },
        { id: 'q2', text: '¿Por qué cree que el reloj debió ser suyo?', answer: 'Mi abuelo me lo prometió. Mi tía tiene el testamento a su favor. Eso no me convierte en ladrón.' },
      ],
    },
    {
      id: 'leonor', name: 'Leonor Bermejo', role: 'Huésped de la 508, comerciante de joyas', age: 47, suspect: true,
      bio: 'Preguntó en recepción por «la señora del reloj antiguo» el día anterior.',
      statement: 'Me interesan las antigüedades, no es un delito preguntar.',
      look: { skin: 0, hair: 'largo', hairColor: 4, accessory: 'gafas_sol', outfitStyle: 'traje', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿Dónde estaba a las 14:20?', answer: 'En el spa, de 13:30 a 15:00. Masaje y sauna. Pregunte allí.' },
        { id: 'q2', text: '¿Por qué preguntó por el reloj?', answer: 'Quería ofrecerle una tasación. Es mi trabajo. Le dejé mi tarjeta.' },
      ],
    },
    {
      id: 'coronado', name: 'Ismael Coronado', role: 'Recepcionista', age: 42, suspect: true,
      bio: 'Programa las tarjetas de los huéspedes y entrega las llaves maestras.',
      statement: 'Le entregué la maestra a Fausto porque dijo que era para la 518. Yo no salí de recepción.',
      look: { skin: 2, hair: 'corto', hairColor: 2, accessory: 'gafas', outfitStyle: 'traje', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿Pudo alguien obtener un duplicado de la tarjeta de la 512?', answer: 'Cada duplicado queda registrado como una nueva llave. La 512 solo tiene una tarjeta.' },
        { id: 'q2', text: '¿Verificó lo del equipaje de la 518?', answer: 'No… El huésped llegaba más tarde, pero no lo revisé. Error mío.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Apertura a las 14:22', description: 'La llave maestra MK-03 abrió la habitación 512 a las 14:22, mientras la huésped almorzaba.', reference: 'SELECT * FROM aperturas WHERE habitacion = 512 ORDER BY fecha_hora;', match: { any: [['MK-03', '14:22', '512']], maxRows: 10 }, implicates: ['fausto'] },
    { id: 'E2', key: true, title: 'Intento denegado', description: 'A las 14:20, la tarjeta personal EMP-27 intentó abrir la 512 y fue rechazada.', reference: "SELECT * FROM aperturas WHERE resultado = 'denegada';", match: { any: [['EMP-27', 'denegada', '512']], maxRows: 10 }, implicates: ['fausto'] },
    { id: 'E3', key: true, title: 'La tarjeta EMP-27', description: 'La tarjeta EMP-27 pertenece a Fausto Lindarte, botones.', reference: "SELECT * FROM empleados WHERE tarjeta_personal = 'EMP-27';", match: { any: [['Lindarte', 'EMP-27']], maxRows: 3 }, implicates: ['fausto'] },
    { id: 'E4', key: true, title: '¿Quién tenía la MK-03?', description: 'De 13:50 a 14:40 la MK-03 estuvo asignada al empleado 7 «para subir equipaje a la 518».', reference: "SELECT * FROM asignaciones_maestras WHERE codigo_llave = 'MK-03';", match: { any: [['MK-03', '13:50', '14:40']], maxRows: 8 }, implicates: ['fausto'] },
    { id: 'E5', title: 'La 518 estaba vacía', description: 'El huésped de la 518 llegó a las 15:30: a las 14:20 no había equipaje que subir.', reference: 'SELECT * FROM huespedes WHERE habitacion = 518;', match: { any: [['518', '15:30']], maxRows: 3 }, implicates: ['fausto'] },
    { id: 'E6', title: 'La camarera almorzaba', description: 'La tarjeta de Celeste (EMP-12) registra su entrada al comedor de empleados a las 13:55 y su salida a las 14:38.', reference: "SELECT * FROM accesos_personal WHERE tarjeta = 'EMP-12';", match: { any: [['EMP-12', 'comedor', '13:55']], maxRows: 10 }, clears: ['celeste'] },
    { id: 'E7', title: 'Sándwich en la 514', description: 'Gerardo Aldana firmó un pedido en la 514 a las 14:35 y no tenía acceso a la MK-03.', reference: 'SELECT * FROM servicio_habitacion WHERE habitacion = 514;', match: { any: [['514', '14:35']], maxRows: 8 }, clears: ['gerardo'] },
    { id: 'E8', title: 'Una tarde en el spa', description: 'La huésped 32 (Leonor Bermejo) estuvo en el spa de 13:30 a 15:00.', reference: "SELECT * FROM reservas_servicios WHERE servicio LIKE 'Spa%' ORDER BY hora_inicio;", match: { any: [['32', 'Spa', '13:30']], maxRows: 10 }, clears: ['leonor'] },
    { id: 'E9', title: 'Una sola tarjeta para la 512', description: 'Solo existe una tarjeta de huésped para la 512 (G-512A): nadie emitió duplicados.', reference: "SELECT * FROM llaves WHERE habitacion_referencia = 512 AND tipo = 'huesped';", match: { any: [['G-512A']], maxRows: 1 }, clears: ['coronado'] },
    { id: 'E10', title: 'La 512 ya estaba limpia', description: 'La 512 se limpió de 10:30 a 11:05: no había motivo de servicio para abrirla a las 14:22.', reference: 'SELECT * FROM limpieza WHERE habitacion = 512;', match: { any: [['512', '10:30']], maxRows: 3 }, implicates: ['fausto'] },
  ],
  objectives: [
    { id: 'O1', title: 'Reconstruir quién abrió la 512', description: 'Revisa la cerradura de la habitación durante la tarde.', evidence: ['E1', 'E2'], tables: ['aperturas'] },
    { id: 'O2', title: 'Seguir la llave maestra', description: '¿Quién tenía la MK-03 y para qué?', evidence: ['E4', 'E10'], need: 1, tables: ['asignaciones_maestras', 'limpieza', 'llaves'] },
    { id: 'O3', title: 'Identificar las tarjetas', description: 'Cada código pertenece a alguien.', evidence: ['E3', 'E9'], need: 1, tables: ['empleados', 'llaves'] },
    { id: 'O4', title: 'Verificar coartadas', description: 'Personal y huéspedes con motivo u oportunidad.', evidence: ['E6', 'E7', 'E8'], need: 2, tables: ['accesos_personal', 'servicio_habitacion', 'reservas_servicios'] },
    { id: 'O5', title: 'Contrastar la versión del botones', description: '¿Había equipaje que subir?', evidence: ['E5'], tables: ['huespedes'] },
  ],
  hints: [
    { id: 'H1', title: 'La cerradura lo recuerda todo', evidence: 'E1', levels: ['La puerta no fue forzada: alguien la abrió con una tarjeta.', 'Filtra aperturas por la habitación 512 y ordénalas por hora.', 'WHERE habitacion = 512 ORDER BY fecha_hora'] },
    { id: 'H2', title: 'Intentos fallidos', evidence: 'E2', levels: ['A veces, antes de lograrlo, alguien falla.', 'La columna resultado distingue abierta de denegada.', "WHERE resultado = 'denegada'"] },
    { id: 'H3', title: 'Tarjetas del personal', evidence: 'E3', requires: { evidence: ['E2'] }, levels: ['Los códigos EMP-xx son tarjetas del personal.', 'Busca el código en empleados.tarjeta_personal.', "WHERE tarjeta_personal = 'EMP-27'"] },
    { id: 'H4', title: 'La maestra del quinto piso', evidence: 'E4', levels: ['La MK-03 abre todo el quinto piso. Recepción anota quién la tiene.', 'Consulta asignaciones_maestras para la MK-03.', "WHERE codigo_llave = 'MK-03'"] },
    { id: 'H5', title: 'Equipaje fantasma', evidence: 'E5', requires: { evidence: ['E4'] }, levels: ['El motivo declarado fue «subir equipaje a la 518». ¿Tenía sentido?', 'Revisa en huespedes la hora de llegada del ocupante de la 518.', 'WHERE habitacion = 518'] },
    { id: 'H6', title: 'La hora de almuerzo', evidence: 'E6', levels: ['La camarera dice que almorzaba cuando ocurrió el robo.', 'accesos_personal registra las tarjetas del personal en zonas internas.', "Busca su tarjeta: WHERE tarjeta = 'EMP-12'"] },
    { id: 'H7', title: 'El sobrino', evidence: 'E7', levels: ['El sobrino dice que no salió de su habitación.', 'servicio_habitacion registra entregas y quién las firmó.', 'WHERE habitacion = 514'] },
    { id: 'H8', title: 'La comerciante', evidence: 'E8', levels: ['La comerciante de joyas dice que estaba en el spa.', 'reservas_servicios guarda servicio, huésped y horario.', "LIKE 'Spa%' encuentra todos los servicios de spa."] },
    { id: 'H9', title: '¿Un duplicado?', evidence: 'E9', levels: ['¿Pudo alguien obtener otra tarjeta de la 512?', 'La tabla llaves registra todas las tarjetas emitidas.', "WHERE habitacion_referencia = 512 AND tipo = 'huesped'"] },
    { id: 'H10', title: 'Servicio de limpieza', evidence: 'E10', levels: ['Las maestras se usan para limpiar. ¿Cuándo se limpió la 512?', 'Consulta la tabla limpieza.', 'WHERE habitacion = 512'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'fausto',
    motive: 'Escuchó a la huésped presumir del valor del reloj y tenía deudas con un prestamista.',
    opportunity: 'Consiguió la MK-03 con la excusa del equipaje de la 518 justo cuando la camarera salió a almorzar.',
    method: 'Primero probó su propia tarjeta en la 512 (denegada a las 14:20); con la maestra abrió la 512 a las 14:22, tomó el reloj y abrió la 518 a las 14:27 para respaldar su excusa.',
    justification: 'La MK-03 estaba a su nombre de 13:50 a 14:40, su tarjeta fue rechazada en la 512 dos minutos antes de la apertura y su excusa era falsa: el huésped de la 518 llegó a las 15:30.',
    eliminations: {
      celeste: { evidence: ['E6', 'E4'], explanation: 'Estaba en el comedor de 13:55 a 14:38 y la MK-03 no estaba en su poder.' },
      gerardo: { evidence: ['E7'], explanation: 'Firmó un pedido en la 514 a las 14:35 y nunca tuvo una llave capaz de abrir la 512.' },
      leonor: { evidence: ['E8'], explanation: 'Estuvo en el spa de 13:30 a 15:00.' },
      coronado: { evidence: ['E9'], explanation: 'No emitió duplicados de la 512 y no salió de recepción; solo fue negligente al entregar la maestra.' },
    },
    incriminating: ['E1', 'E2', 'E3', 'E4', 'E5'],
    reveal: [
      'Fausto Lindarte debía dinero a un prestamista del puerto. Cuando oyó que el reloj valía más que su sueldo de diez años, planeó todo en una mañana.',
      'Probó su propia tarjeta por si la puerta se abría. No funcionó. Con la maestra, tardó dos minutos.',
      'El reloj apareció envuelto en una toalla dentro de su casillero del vestidor.',
    ],
  },
  references: [
    { title: 'Suites del hotel', sql: "SELECT * FROM habitaciones WHERE tipo = 'suite';" },
    { title: 'Huéspedes del quinto piso', sql: 'SELECT * FROM huespedes WHERE habitacion BETWEEN 500 AND 599;' },
    { title: 'Huéspedes Aldana', sql: "SELECT * FROM huespedes WHERE apellido = 'Aldana';" },
    { title: 'Llaves maestras', sql: "SELECT * FROM llaves WHERE tipo = 'maestra';" },
    { title: 'Usos de la MK-03', sql: "SELECT * FROM aperturas WHERE codigo_llave = 'MK-03' ORDER BY fecha_hora;" },
    { title: 'Aperturas por la tarde en el piso 5', sql: "SELECT * FROM aperturas WHERE habitacion BETWEEN 500 AND 599 AND fecha_hora BETWEEN '2025-08-09 13:30' AND '2025-08-09 15:10';" },
    { title: 'Botones y recepcionistas', sql: "SELECT * FROM empleados WHERE puesto IN ('Botones', 'Recepcionista');" },
    { title: 'Zonas internas usadas', sql: 'SELECT DISTINCT zona FROM accesos_personal;' },
    { title: 'Movimientos de Fausto', sql: "SELECT * FROM accesos_personal WHERE tarjeta = 'EMP-27';" },
    { title: 'Pedidos a la habitación', sql: 'SELECT * FROM servicio_habitacion ORDER BY hora_pedido;' },
    { title: 'Reservas en restaurante', sql: "SELECT * FROM reservas_servicios WHERE servicio LIKE 'Restaurante%';" },
    { title: 'Limpiezas del piso 5', sql: 'SELECT * FROM limpieza WHERE habitacion >= 500 AND habitacion < 600;' },
  ],
};
