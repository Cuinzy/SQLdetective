import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 12 — El secreto del puerto
// Culpable: Wilfredo Arrieta (jefe de patio, id 4, turno de día).
// MSKU-7731 (servidores declarados como «repuestos») figura en el manifiesto de carga del «Estrella del Sur»,
// pero nunca fue cargado ni inspeccionado. A las 02:55 Arrieta ordenó moverlo de B-12 a X-01 (fuera de la zona de
// inspección) y a las 03:18 autorizó su salida en el camión TRK-552 como «Traslado interno».

const R = rng(1212);
const EXCL = ['Arrieta', 'Mosquera', 'Rosero', 'Brandt', 'Alarcón'];
const D = '2025-02-19';

const fill = namePool(R, 11, EXCL);
const perRows: Cell[][] = [
  [4, 'Wilfredo', 'Arrieta', 'Jefe de patio', 'día'],
  [9, 'Saúl', 'Mosquera', 'Operador de grúa pórtico', 'noche'],
  [11, 'Tatiana', 'Rosero', 'Inspectora de aduana', 'noche'],
  [14, 'Rubén', 'Alarcón', 'Vigilante de puerta', 'noche'],
];
const roles: [string, string][] = [['Planificador de patio', 'noche'], ['Planificadora de patio', 'día'], ['Operador de grúa pórtico', 'día'], ['Operador de grúa pórtico', 'noche'], ['Inspector de aduana', 'día'], ['Funcionaria de aduana', 'día'], ['Funcionario de aduana', 'noche'], ['Vigilante de puerta', 'día'], ['Operador de grúa pórtico', 'noche'], ['Jefe de terminal', 'día'], ['Inspectora de aduana', 'noche']];
roles.forEach(([c, t], i) => perRows.push([[12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23][i], fill[i].nombre, fill[i].apellido, c, t]));
const personal = table('personal', 'Personal del Terminal 3 y de aduana.', [
  'id_personal:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'turno:text|día (06–18) o noche (18–06)',
], perRows);

const buques = table('buques', 'Buques atendidos en febrero de 2025.', [
  'id_buque:integer:pk|Identificador',
  'nombre:text|Nombre',
  'bandera:text|Bandera',
  'capitan:text|Capitán',
  'fecha_atraque:timestamp|Atraque',
  'fecha_zarpe:timestamp|Zarpe',
], [
  [1, 'Brisa Austral', 'Panamá', 'Lucía Ferreyra', '2025-02-16 22:00:00', '2025-02-17 18:00:00'],
  [2, 'Estrella del Sur', 'Liberia', 'Ewald Brandt', '2025-02-18 14:00:00', '2025-02-19 06:00:00'],
  [3, 'Nordkapp', 'Noruega', 'Ivar Lund', '2025-02-15 08:00:00', '2025-02-16 05:00:00'],
  [4, 'Mar de Coral', 'Colombia', 'Hernán Quiceno', '2025-02-19 09:00:00', '2025-02-20 04:00:00'],
]);

const clientes = ['DataNorte S.A.', 'Agroexport Bruma', 'Textiles del Litoral', 'Ferromax', 'Café Alto', 'Química Sur', 'Muebles Roble'];
const contenidos = ['café en grano', 'textiles', 'repuestos de maquinaria', 'muebles', 'químicos industriales', 'flores', 'frutas', 'electrodomésticos'];
const pref = ['MSKU', 'TCLU', 'CMAU', 'HLXU', 'MRKU'];
const conRows: Cell[][] = [['MSKU-7731', '40ft', 'repuestos de maquinaria', 8200, 'DataNorte S.A.'], ['TCLU-0009', '20ft', 'vacío', 2300, 'Naviera Sur']];
const used = new Set(['MSKU-7731', 'TCLU-0009']);
while (conRows.length < 64) {
  const c = `${R.pick(pref)}-${R.int(1000, 9999)}`;
  if (used.has(c)) continue;
  used.add(c);
  conRows.push([c, R.pick(['20ft', '40ft']), R.pick(contenidos), R.int(30, 260) * 100, R.pick(clientes)]);
}
const contenedores = table('contenedores', 'Contenedores registrados en el terminal.', [
  'codigo:text:pk|Código del contenedor',
  'tamano:text|20ft o 40ft',
  'contenido_declarado:text|Contenido declarado',
  'peso_declarado_kg:integer|Peso declarado (kg)',
  'cliente:text|Cliente',
], conRows);
const codes = conRows.map((c) => c[0] as string);

// Manifiestos
const manRows: Cell[][] = [];
let mid = 1;
const fromBrisa = codes.slice(0, 2).concat(codes.slice(2, 24));
const toEstrella = ['MSKU-7731', 'TCLU-0009', ...codes.slice(24, 47)];
for (const c of fromBrisa) manRows.push([mid++, 1, c, 'descarga']);
for (const c of toEstrella) manRows.push([mid++, 2, c, 'carga']);
for (const c of codes.slice(47, 58)) manRows.push([mid++, 3, c, 'descarga']);
for (const c of codes.slice(58, 64)) manRows.push([mid++, 4, c, 'carga']);
const manifiestos = table('manifiestos', 'Manifiestos de carga y descarga declarados por cada buque.', [
  'id_manifiesto:integer:pk|Identificador',
  'id_buque:integer:fk=buques.id_buque|Buque',
  'codigo_contenedor:text:fk=contenedores.codigo|Contenedor',
  'operacion:text|carga o descarga',
], manRows);

// Movimientos
const bays = (i: number) => `B-${String(1 + (i % 20)).padStart(2, '0')}`;
const cbay = (i: number) => `C-${String(1 + (i % 12)).padStart(2, '0')}`;
const mov: Cell[][] = [];
let mv = 1;
fromBrisa.forEach((c, i) => mov.push([mv++, c, ts('2025-02-17', 60 + i * 8), 'BUQUE Brisa Austral', c === 'MSKU-7731' ? 'B-12' : i % 2 ? bays(i) : cbay(i), R.pick([16, 21]), 13]));
codes.slice(24, 47).forEach((c, i) => mov.push([mv++, c, ts('2025-02-18', 600 + i * 9), 'Puerta', i % 2 ? bays(i + 3) : cbay(i + 2), 16, 13]));
codes.slice(47, 58).forEach((c, i) => mov.push([mv++, c, ts('2025-02-15', 600 + i * 11), 'BUQUE Nordkapp', cbay(i + 5), 16, 13]));
// carga al Estrella del Sur (noche del 18 al 19): todos menos MSKU-7731
const loadList = toEstrella.filter((c) => c !== 'MSKU-7731');
loadList.forEach((c, i) => {
  const t = i < 12 ? ts('2025-02-18', 1290 + i * 11) : ts(D, (i - 12) * 13 + (i >= 16 ? 60 : 0));
  mov.push([mv++, c, t, 'Patio', 'BUQUE Estrella del Sur', i % 2 ? 9 : 21, 12]);
});
mov.push([mv++, 'MSKU-7731', ts(D, 175), 'B-12', 'X-01', 9, 4]);
for (let i = 0; i < 6; i++) mov.push([mv++, R.pick(codes.slice(2, 24)), ts(D, 120 + i * 9), bays(i + 7), bays(i + 1), 9, 12]);
mov.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const movimientos = table('movimientos', 'Movimientos de contenedores con grúa (origen → destino).', [
  'id_movimiento:integer:pk|Identificador',
  'codigo_contenedor:text:fk=contenedores.codigo|Contenedor',
  'fecha_hora:timestamp|Momento',
  'origen:text|Bahía o lugar de origen',
  'destino:text|Bahía o lugar de destino',
  'id_operador:integer:fk=personal.id_personal|Operador de grúa',
  'ordenado_por:integer:fk=personal.id_personal|Quién ordenó el movimiento',
], mov.map((m, i) => [i + 1, m[1], m[2], m[3], m[4], m[5], m[6]]));

// Inspecciones: todos los de carga del Estrella excepto MSKU-7731 (y el vacío TCLU-0009, exento)
const insp: Cell[][] = [];
let iid = 1;
toEstrella.filter((c) => c !== 'MSKU-7731' && c !== 'TCLU-0009').forEach((c, i) => {
  const peso = conRows.find((x) => x[0] === c)![3] as number;
  const night = i < 9;
  insp.push([iid++, c, night ? ts('2025-02-18', 1200 + i * 9) : ts('2025-02-18', 700 + i * 14), night ? 11 : 17, 'aprobada', peso + R.int(-40, 40)]);
});
for (const c of codes.slice(58, 64)) insp.push([iid++, c, ts(D, 420 + iid * 6), 17, 'aprobada', (conRows.find((x) => x[0] === c)![3] as number) + R.int(-40, 40)]);
const inspecciones = table('inspecciones', 'Inspecciones de aduana previas a la carga.', [
  'id_inspeccion:integer:pk|Identificador',
  'codigo_contenedor:text:fk=contenedores.codigo|Contenedor',
  'fecha_hora:timestamp|Momento',
  'inspector:integer:fk=personal.id_personal|Inspector',
  'resultado:text|aprobada o retenida',
  'peso_bascula_kg:integer|Peso medido en báscula (kg)',
], insp);

// Salidas por la puerta
const sal: Cell[][] = [];
let sid = 1;
codes.slice(2, 24).forEach((c, i) => {
  if (i % 3 === 2) return;
  sal.push([sid++, `TRK-${R.int(100, 499)}`, c, ts(i < 10 ? '2025-02-18' : D, i < 10 ? 480 + i * 37 : 420 + i * 21), 18, 20, 'Levante aduanero']);
});
sal.push([sid++, 'TRK-552', 'MSKU-7731', ts(D, 198), 4, 14, 'Traslado interno']);
sal.push([sid++, 'TRK-118', null, ts(D, 95), 19, 14, 'Salida de camión vacío']);
sal.sort((a, b) => String(a[3]).localeCompare(String(b[3])));
const salidas = table('salidas_puerta', 'Salidas de camiones por la puerta del terminal.', [
  'id_salida:integer:pk|Identificador',
  'placa_camion:text|Camión',
  'codigo_contenedor:text:null:fk=contenedores.codigo|Contenedor que sale (si lleva)',
  'fecha_hora:timestamp|Momento',
  'autorizado_por:integer:fk=personal.id_personal|Quién autorizó la salida',
  'vigilante:integer:fk=personal.id_personal|Vigilante de turno en la puerta',
  'documento:text|Documento presentado',
], sal.map((s, i) => [i + 1, s[1], s[2], s[3], s[4], s[5], s[6]]));

const nMosq12 = mov.filter((m) => m[5] === 9 && m[6] === 12).length;

export const case12: CaseDef = {
  id: 12,
  code: 'EXP-12',
  title: 'El secreto del puerto',
  level: 3,
  tagline: 'Un contenedor zarpó en los papeles… pero nunca subió al barco.',
  location: 'Puerto de Bruma, Terminal 3',
  date: '19 de febrero de 2025',
  scene: 'puerto',
  briefing: [
    'El contenedor MSKU-7731 llegó en el «Brisa Austral» y debía embarcarse en el «Estrella del Sur», que zarpó a las 06:00 del 19 de febrero.',
    'Al llegar a destino, el contenedor no estaba a bordo. Su dueño, DataNorte S.A., asegura que contenía servidores por 1,2 millones de dólares, declarados como «repuestos de maquinaria» para pagar menos impuestos.',
    'Los registros parecen contradictorios: el manifiesto dice que se cargó, pero ¿lo dicen también los movimientos de grúa, las inspecciones y la puerta?',
  ],
  timeline: [
    { time: '17 feb', event: 'El MSKU-7731 se descarga del «Brisa Austral».' },
    { time: '18 feb 21:30', event: 'Comienza la carga del «Estrella del Sur».' },
    { time: '19 feb 06:00', event: 'Zarpa el «Estrella del Sur».' },
  ],
  concepts: ['LEFT JOIN', 'RIGHT JOIN', 'IS NULL', 'JOIN de una tabla consigo misma con alias', 'GROUP BY'],
  tables: [personal, buques, contenedores, manifiestos, movimientos, inspecciones, salidas],
  characters: [
    {
      id: 'arrieta', name: 'Wilfredo Arrieta', role: 'Jefe de patio', age: 50, suspect: true,
      bio: 'Organiza las bahías del patio. Trabaja de día, pero «siempre está disponible».',
      statement: 'El contenedor se cargó con los demás. Si no está en el barco, pregunten a la naviera.',
      look: { skin: 3, hair: 'corto', hairColor: 0, facial: 'bigote', accessory: 'gorra', outfitStyle: 'chaqueta', outfit: 7 },
      questions: [
        { id: 'q1', text: '¿Estuvo en el terminal la madrugada del 19?', answer: 'No, mi turno es de día. Yo duermo de noche, como la gente normal.' },
        { id: 'q2', text: 'A las 02:55 usted ordenó mover el MSKU-7731 de B-12 a X-01.', answer: 'Lo hice por radio, desde casa. La bahía B estaba congestionada.', requires: ['E3'], contradiction: true },
        { id: 'q3', text: 'Usted autorizó la salida del MSKU-7731 en el camión TRK-552 como «traslado interno».', answer: 'Los traslados internos son rutina… No tengo por qué recordar cada uno.', requires: ['E4'], contradiction: true, note: 'Arrieta autorizó un «traslado interno» que sacó el contenedor del puerto.' },
      ],
    },
    {
      id: 'mosquera', name: 'Saúl Mosquera', role: 'Operador de grúa pórtico (noche)', age: 35, suspect: true,
      bio: 'Movió físicamente el MSKU-7731 a las 02:55.',
      statement: 'Yo muevo lo que me ordenan. Esa orden llegó por radio, de parte del jefe de patio.',
      look: { skin: 4, hair: 'rizado', hairColor: 0, accessory: 'auriculares', outfitStyle: 'uniforme', outfit: 2 },
      questions: [
        { id: 'q1', text: '¿Le pareció extraña la orden?', answer: 'Un poco. La bahía X-01 está junto a la puerta, lejos del barco. Pero el jefe es el jefe.' },
      ],
    },
    {
      id: 'rosero', name: 'Tatiana Rosero', role: 'Inspectora de aduana (noche)', age: 41, suspect: true,
      bio: 'Inspeccionó la carga del «Estrella del Sur» durante la noche.',
      statement: 'Inspeccioné lo que estaba en la zona C. La zona B se inspecciona de día.',
      look: { skin: 1, hair: 'coleta', hairColor: 2, accessory: 'gafas', outfitStyle: 'uniforme', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Por qué el MSKU-7731 no tiene inspección?', answer: 'Mi lista de la noche era la zona C. El MSKU-7731 estaba en la B y de día no lo inspeccionaron.' },
      ],
    },
    {
      id: 'brandt', name: 'Ewald Brandt', role: 'Capitán del «Estrella del Sur»', age: 63, suspect: true,
      bio: 'Firmó el conocimiento de embarque que declara el contenedor a bordo.',
      statement: 'Firmé el manifiesto que me entregó el terminal. Yo no cuento contenedores.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'barba', accessory: 'boina', outfitStyle: 'uniforme', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Cuántos contenedores subieron a su barco?', answer: 'Los que el terminal cargó. El manifiesto lo prepara el terminal; las grúas son del terminal.' },
      ],
    },
    {
      id: 'alarcon', name: 'Rubén Alarcón', role: 'Vigilante de puerta (noche)', age: 31, suspect: true,
      bio: 'Estaba en la puerta cuando salió el camión TRK-552.',
      statement: 'El camión traía la autorización firmada. Yo solo reviso papeles.',
      look: { skin: 5, hair: 'corto', hairColor: 0, outfitStyle: 'uniforme', outfit: 2, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Quién firmó la salida del TRK-552?', answer: 'El jefe de patio en persona. Vino hasta la puerta a las tres de la mañana.', note: 'Alarcón vio al jefe de patio en la puerta a las 03:00.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Manifestado, pero no cargado', description: 'De los contenedores del manifiesto de carga del «Estrella del Sur», solo el MSKU-7731 no tiene ningún movimiento con destino al buque.', reference: "SELECT m.codigo_contenedor FROM manifiestos m LEFT JOIN movimientos mv ON mv.codigo_contenedor = m.codigo_contenedor AND mv.destino = 'BUQUE Estrella del Sur' WHERE m.id_buque = 2 AND m.operacion = 'carga' AND mv.id_movimiento IS NULL;", match: { any: [['MSKU-7731']], maxRows: 3, anyFeature: ['left_join', 'right_join', 'subquery'] } },
    { id: 'E2', key: true, title: 'Sin inspección', description: 'Entre los contenedores para el «Estrella del Sur», solo dos carecen de inspección: el TCLU-0009 (vacío, exento) y el MSKU-7731.', reference: "SELECT m.codigo_contenedor, c.contenido_declarado FROM manifiestos m INNER JOIN contenedores c ON m.codigo_contenedor = c.codigo LEFT JOIN inspecciones i ON i.codigo_contenedor = m.codigo_contenedor WHERE m.id_buque = 2 AND i.id_inspeccion IS NULL;", match: { any: [['MSKU-7731']], maxRows: 5, anyFeature: ['left_join', 'right_join', 'subquery'] } },
    { id: 'E3', key: true, title: 'Un movimiento hacia la puerta', description: 'A las 02:55 el MSKU-7731 fue movido de B-12 a X-01 (junto a la puerta). La orden la dio el jefe de patio, Wilfredo Arrieta.', reference: "SELECT mv.fecha_hora, mv.origen, mv.destino, p.apellido AS ordenado_por FROM movimientos mv INNER JOIN personal p ON mv.ordenado_por = p.id_personal WHERE mv.codigo_contenedor = 'MSKU-7731';", match: { any: [['X-01', 'Arrieta'], ['X-01', '02:55', '4']], maxRows: 6 }, implicates: ['arrieta'] },
    { id: 'E4', key: true, title: 'La salida del TRK-552', description: 'A las 03:18 el camión TRK-552 salió con el MSKU-7731 con el documento «Traslado interno»: el contenedor dejó el puerto por tierra, no en el barco.', reference: "SELECT * FROM salidas_puerta WHERE codigo_contenedor = 'MSKU-7731';", match: { any: [['MSKU-7731', 'TRK-552']], maxRows: 5 }, implicates: ['arrieta'], clears: ['brandt'] },
    { id: 'E5', title: 'Fuera de su turno', description: 'Wilfredo Arrieta tiene turno de día (06–18), pero dio órdenes y autorizaciones entre las 02:55 y las 03:18.', reference: "SELECT * FROM personal WHERE cargo = 'Jefe de patio';", match: { any: [['Arrieta', 'día']], maxRows: 3 }, implicates: ['arrieta'] },
    { id: 'E6', title: 'El operador cumplía órdenes', description: `Saúl Mosquera ejecutó ${nMosq12} movimientos ordenados por la planificación de noche (persona 12) y solo uno ordenado por Arrieta (persona 4): el del MSKU-7731.`, reference: 'SELECT ordenado_por, COUNT(*) FROM movimientos WHERE id_operador = 9 GROUP BY ordenado_por;', match: { all: [['=12', String(nMosq12)], ['=4', '1']], maxRows: 6, features: ['aggregate'] }, clears: ['mosquera'] },
    { id: 'E7', title: 'La lista de la inspectora', description: 'Todas las inspecciones de Tatiana Rosero esa noche fueron de contenedores en otras bahías; el MSKU-7731 nunca estuvo en su lista.', reference: 'SELECT p.apellido, COUNT(*) FROM inspecciones i INNER JOIN personal p ON i.inspector = p.id_personal GROUP BY p.apellido;', match: { any: [['Rosero', '9']], maxRows: 6, features: ['aggregate'] }, clears: ['rosero'] },
    { id: 'E8', title: 'Dos personas en la misma salida', description: 'Uniendo personal DOS veces (autorizó y vigiló): la salida del TRK-552 la autorizó Arrieta; Alarcón solo era el vigilante de turno.', reference: "SELECT s.placa_camion, a.apellido AS autorizo, v.apellido AS vigilante FROM salidas_puerta s INNER JOIN personal a ON s.autorizado_por = a.id_personal INNER JOIN personal v ON s.vigilante = v.id_personal WHERE s.placa_camion = 'TRK-552';", match: { any: [['TRK-552', 'Arrieta', 'Alarcón']], maxRows: 3, features: ['join'] }, implicates: ['arrieta'], clears: ['alarcon'] },
  ],
  objectives: [
    { id: 'O1', title: 'Contrastar manifiesto y carga', description: '¿Todo lo manifestado subió al barco?', evidence: ['E1'], tables: ['manifiestos', 'movimientos'] },
    { id: 'O2', title: 'Revisar las inspecciones', description: '¿Qué contenedores no pasaron por aduana?', evidence: ['E2', 'E7'], need: 1, tables: ['inspecciones', 'contenedores'] },
    { id: 'O3', title: 'Reconstruir el recorrido del contenedor', description: 'Sigue al MSKU-7731 por el patio.', evidence: ['E3', 'E6'], need: 1, tables: ['movimientos', 'personal'] },
    { id: 'O4', title: 'Revisar la puerta', description: '¿Salió algo del terminal por tierra?', evidence: ['E4', 'E8'], need: 1, tables: ['salidas_puerta'] },
    { id: 'O5', title: 'Verificar al personal', description: '¿Quién actuó fuera de su turno o de su función?', evidence: ['E5'], tables: ['personal'] },
  ],
  hints: [
    { id: 'H1', title: 'Lo manifestado y lo hecho', evidence: 'E1', levels: ['El manifiesto es una promesa; los movimientos de grúa, la realidad.', 'Toma el manifiesto de carga del buque 2 y busca, para cada contenedor, un movimiento con destino al buque.', "manifiestos LEFT JOIN movimientos ON … AND mv.destino = 'BUQUE Estrella del Sur' WHERE mv.id_movimiento IS NULL"] },
    { id: 'H2', title: 'Sin aduana', evidence: 'E2', levels: ['Todo contenedor cargado debe tener inspección.', 'Une el manifiesto con inspecciones conservando los que no tienen pareja.', 'LEFT JOIN inspecciones … WHERE i.id_inspeccion IS NULL (o prueba con RIGHT JOIN invirtiendo las tablas).'] },
    { id: 'H3', title: 'El recorrido', evidence: 'E3', requires: { evidence: ['E1'] }, levels: ['Si no fue al barco, ¿a dónde fue el contenedor?', 'Revisa los movimientos del MSKU-7731 y quién los ordenó.', 'INNER JOIN personal ON movimientos.ordenado_por = personal.id_personal'] },
    { id: 'H4', title: 'La puerta', evidence: 'E4', levels: ['Un contenedor que no zarpa puede salir por tierra.', 'Busca el MSKU-7731 en salidas_puerta.', "WHERE codigo_contenedor = 'MSKU-7731'"] },
    { id: 'H5', title: 'Los turnos', evidence: 'E5', levels: ['¿Quién estaba dando órdenes a las tres de la mañana?', 'Revisa el turno de quien ordenó el movimiento.', "WHERE cargo = 'Jefe de patio'"] },
    { id: 'H6', title: 'El operador', evidence: 'E6', levels: ['El operador movió el contenedor. ¿Por iniciativa propia?', 'Agrupa los movimientos del operador por quien los ordenó.', 'WHERE id_operador = 9 GROUP BY ordenado_por'] },
    { id: 'H7', title: 'La inspectora', evidence: 'E7', levels: ['¿Cuántas inspecciones hizo cada inspector?', 'Une inspecciones con personal y agrupa.', 'GROUP BY apellido con COUNT(*)'] },
    { id: 'H8', title: 'Dos papeles, una tabla', evidence: 'E8', requires: { evidence: ['E4'] }, levels: ['En una salida intervienen dos personas: quien autoriza y quien vigila.', 'Necesitas unir la tabla personal dos veces, con alias distintos.', 'INNER JOIN personal a ON s.autorizado_por = a.id_personal INNER JOIN personal v ON s.vigilante = v.id_personal'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'arrieta',
    motive: 'Un comprador le pagó por desviar un contenedor de servidores mal declarado: su dueño no podría denunciar sin admitir el fraude aduanero.',
    opportunity: 'Como jefe de patio podía ordenar movimientos y autorizar traslados internos; la zona B no tenía inspecciones nocturnas.',
    method: 'Dejó el MSKU-7731 fuera de la lista de carga, lo hizo mover a la bahía X-01 junto a la puerta a las 02:55 y autorizó en persona su salida en el TRK-552 a las 03:18.',
    justification: 'El contenedor está en el manifiesto pero no en los movimientos al buque; nunca fue inspeccionado; el único movimiento anómalo y la salida por tierra llevan su firma, fuera de su turno.',
    eliminations: {
      mosquera: { evidence: ['E6'], explanation: 'Ejecutaba las órdenes de planificación; la única orden anómala vino de Arrieta.' },
      rosero: { evidence: ['E7'], explanation: 'Su lista nocturna no incluía la zona B; inspeccionó todo lo asignado.' },
      brandt: { evidence: ['E4', 'E1'], explanation: 'El contenedor nunca se movió a su barco: salió del puerto en camión.' },
      alarcon: { evidence: ['E8'], explanation: 'Solo vigilaba la puerta; la salida la autorizó Arrieta.' },
    },
    incriminating: ['E3', 'E4', 'E5', 'E8'],
    reveal: [
      'Wilfredo Arrieta sabía que DataNorte había declarado servidores como «repuestos». Si el contenedor desaparecía, nadie se atrevería a reclamar demasiado.',
      'Lo excluyó de la carga, lo hizo mover junto a la puerta y lo sacó en un camión con un papel de «traslado interno» firmado por él mismo.',
      'El manifiesto decía que el contenedor zarpó. Un LEFT JOIN dijo que nunca subió al barco.',
    ],
  },
  references: [
    { title: 'Buques', sql: 'SELECT * FROM buques ORDER BY fecha_atraque;' },
    { title: 'Contenedores por contenido', sql: 'SELECT contenido_declarado, COUNT(*) FROM contenedores GROUP BY contenido_declarado;' },
    { title: 'Manifiesto por buque', sql: 'SELECT b.nombre, m.operacion, COUNT(*) FROM manifiestos m INNER JOIN buques b ON m.id_buque = b.id_buque GROUP BY b.nombre, m.operacion;' },
    { title: 'Movimientos hacia el Estrella del Sur', sql: "SELECT COUNT(*) FROM movimientos WHERE destino = 'BUQUE Estrella del Sur';" },
    { title: 'Movimientos de madrugada', sql: "SELECT * FROM movimientos WHERE fecha_hora BETWEEN '2025-02-19 02:00' AND '2025-02-19 04:00';" },
    { title: 'Bahías de la zona X', sql: "SELECT * FROM movimientos WHERE destino LIKE 'X-%' OR origen LIKE 'X-%';" },
    { title: 'Diferencias de peso en inspección', sql: 'SELECT i.codigo_contenedor, c.peso_declarado_kg, i.peso_bascula_kg FROM inspecciones i INNER JOIN contenedores c ON i.codigo_contenedor = c.codigo WHERE ABS(i.peso_bascula_kg - c.peso_declarado_kg) > 30;' },
    { title: 'Salidas por documento', sql: 'SELECT documento, COUNT(*) FROM salidas_puerta GROUP BY documento;' },
    { title: 'Personal de noche', sql: "SELECT * FROM personal WHERE turno = 'noche';" },
    { title: 'Contenedores de DataNorte', sql: "SELECT * FROM contenedores WHERE cliente = 'DataNorte S.A.';" },
    { title: 'Contenedores sin manifiesto (RIGHT JOIN)', sql: 'SELECT c.codigo FROM manifiestos m RIGHT JOIN contenedores c ON m.codigo_contenedor = c.codigo WHERE m.id_manifiesto IS NULL;' },
    { title: 'Movimientos por operador', sql: 'SELECT p.apellido, COUNT(*) FROM movimientos mv INNER JOIN personal p ON mv.id_operador = p.id_personal GROUP BY p.apellido;' },
    { title: 'Salidas autorizadas por aduana', sql: "SELECT s.* FROM salidas_puerta s INNER JOIN personal p ON s.autorizado_por = p.id_personal WHERE p.cargo LIKE '%aduana%';" },
  ],
};
