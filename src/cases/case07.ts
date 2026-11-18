import type { CaseDef, Cell } from './types';
import { table, rng, namePool } from './helpers';

// CASO 7 — El vehículo desaparecido
// Culpable: Elkin Vélez (conductor 3, grúa GRU-317).
// Registró un servicio falso (cancelado) con la orden inexistente OT-77801, la presentó en el parqueadero
// (apertura manual 01:11) y remolcó el BRM-482: ambas placas aparecen juntas en 5 cámaras hasta la Zona Industrial.

const R = rng(707);
const EXCL = ['Vélez', 'Rubiano', 'Carrillo', 'Quiroz', 'Montes'];
const D1 = '2025-11-02';
const D2 = '2025-11-03';
const t = (d: string, hhmm: string) => `${d} ${hhmm}:00`;

const owners = namePool(R, 58, EXCL);
const propRows: Cell[][] = [
  [1, 'Grúas Express Bruma S.A.', '(empresa)', '601-555-0101', 'Calle 80 # 12-40'],
  [2, 'Alcira', 'Montes', '300-555-1234', 'Carrera 7 # 45-10'],
  [3, 'Germán', 'Rubiano', '310-555-9876', 'Calle 22 # 9-33'],
];
owners.forEach((n, i) => propRows.push([10 + i, n.nombre, n.apellido, `3${R.int(0, 2)}${R.int(0, 9)}-555-${String(R.int(1000, 9999))}`, `Calle ${R.int(1, 120)} # ${R.int(1, 90)}-${R.int(1, 99)}`]));
const propietarios = table('propietarios', 'Propietarios registrados de vehículos.', [
  'id_propietario:integer:pk|Identificador',
  'nombre:text|Nombre o razón social',
  'apellido:text|Apellido',
  'telefono:text|Teléfono',
  'direccion:text|Dirección',
], propRows);

const marcas = [['Toyota', 'Corolla'], ['Renault', 'Logan'], ['Chevrolet', 'Onix'], ['Mazda', '3'], ['Kia', 'Picanto'], ['Nissan', 'Versa'], ['Ford', 'Ranger'], ['Hyundai', 'Tucson']];
const colores = ['gris', 'blanco', 'negro', 'rojo', 'azul', 'plata'];
const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const vehRows: Cell[][] = [
  ['BRM-482', 'Mazda', '3', 'gris', 2019, 'automovil', 2],
  ['KTR-905', 'Ford', 'Ranger', 'negro', 2021, 'camioneta', 3],
  ['GRU-317', 'Isuzu', 'NPR plataforma', 'amarillo', 2016, 'grua', 1],
  ['GRU-205', 'Isuzu', 'NPR plataforma', 'amarillo', 2018, 'grua', 1],
  ['GRU-118', 'Hino', '300 plataforma', 'amarillo', 2015, 'grua', 1],
];
const plates: string[] = [];
for (let i = 0; i < 64; i++) {
  let p = '';
  do p = `${letters[R.int(0, 22)]}${letters[R.int(0, 22)]}${letters[R.int(0, 22)]}-${R.int(100, 999)}`;
  while (plates.includes(p) || p.startsWith('GRU') || p.startsWith('BRM'));
  plates.push(p);
  const [ma, mo] = R.pick(marcas);
  vehRows.push([p, ma, mo, R.pick(colores), R.int(2008, 2024), R.chance(0.1) ? 'moto' : 'automovil', 10 + (i % 58)]);
}
const vehiculos = table('vehiculos', 'Registro de vehículos.', [
  'placa:text:pk|Placa',
  'marca:text|Marca',
  'modelo:text|Modelo',
  'color:text|Color',
  'anio:integer|Año del modelo',
  'tipo:text|automovil, camioneta, moto o grua',
  'id_propietario:integer:fk=propietarios.id_propietario|Propietario',
], vehRows);

const camRows: Cell[][] = [
  [1, 'Av. Mirador (salida del parqueadero)', 'Norte'],
  [2, 'Av. 30 con Calle 45', 'Centro'],
  [3, 'Glorieta Central', 'Centro'],
  [4, 'Puente Viejo', 'Centro'],
  [5, 'Av. del Sur con Calle 80', 'Sur'],
  [6, 'Hospital Sur', 'Sur'],
  [7, 'Av. Industrial km 2', 'Industrial'],
  [8, 'Terminal de buses', 'Centro'],
  [9, 'Calle 9, Zona Industrial', 'Industrial'],
  [10, 'Bodegas de la Zona Industrial', 'Industrial'],
  [11, 'Peaje Puerto Alto', 'Carretera'],
  [12, 'Ruta a Puerto Alto km 40', 'Carretera'],
];
const camaras = table('camaras_lpr', 'Cámaras lectoras de placas (LPR) de la ciudad.', [
  'id_camara:integer:pk|Identificador',
  'ubicacion:text|Ubicación',
  'zona:text|Zona de la ciudad',
], camRows);

const lec: [string, number, string][] = [];
for (const p of plates) {
  const n = R.int(1, 3);
  for (let i = 0; i < n; i++) {
    const day = R.chance(0.55) ? D1 : D2;
    const hh = day === D1 ? R.int(22, 23) : R.int(0, 2);
    const mm = R.int(0, 59);
    lec.push([p, R.int(1, 10), t(day, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)]);
  }
}
lec.push(['BRM-482', 2, t(D1, '19:12')], ['BRM-482', 1, t(D1, '19:24')]);
for (const [c, h] of [[1, '01:13'], [4, '01:21'], [7, '01:29'], [9, '01:36'], [10, '01:41']] as [number, string][]) {
  lec.push(['BRM-482', c, t(D2, h)], ['GRU-317', c, t(D2, h)]);
}
lec.push(['GRU-317', 2, t(D2, '00:49')], ['GRU-317', 1, t(D2, '01:05')], ['GRU-317', 7, t(D2, '02:05')], ['GRU-317', 3, t(D2, '02:18')]);
lec.push(['GRU-205', 5, t(D2, '00:58')], ['GRU-205', 6, t(D2, '01:20')], ['GRU-205', 5, t(D2, '01:44')], ['GRU-205', 3, t(D2, '02:10')]);
lec.push(['GRU-118', 8, t(D1, '22:40')], ['GRU-118', 3, t(D1, '23:05')]);
lec.push(['KTR-905', 3, t(D2, '00:20')], ['KTR-905', 11, t(D2, '00:55')], ['KTR-905', 12, t(D2, '01:30')], ['KTR-905', 12, t(D2, '02:40')]);
lec.sort((a, b) => a[2].localeCompare(b[2]));
const lecturas = table('lecturas', 'Lecturas de placas captadas por las cámaras LPR.', [
  'id_lectura:integer:pk|Identificador',
  'placa:text:fk=vehiculos.placa|Placa leída',
  'id_camara:integer:fk=camaras_lpr.id_camara|Cámara',
  'fecha_hora:timestamp|Momento de la lectura',
], lec.map(([p, c, f], i) => [40000 + i, p, c, f]));

const condNames = namePool(R, 2, EXCL);
const conductores = table('conductores', 'Conductores de Grúas Express Bruma.', [
  'id_conductor:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'licencia:text|Número de licencia',
], [
  [1, condNames[0].nombre, condNames[0].apellido, 'LC-55120'],
  [2, 'Nelson', 'Quiroz', 'LC-48831'],
  [3, 'Elkin', 'Vélez', 'LC-61207'],
  [4, condNames[1].nombre, condNames[1].apellido, 'LC-70044'],
]);

const asignaciones = table('asignaciones_grua', 'Asignación de grúas a conductores por turno.', [
  'id_asignacion:integer:pk|Identificador',
  'placa_grua:text:fk=vehiculos.placa|Grúa',
  'id_conductor:integer:fk=conductores.id_conductor|Conductor',
  'fecha:date|Fecha de inicio del turno',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin (día siguiente si es menor)',
], [
  [1, 'GRU-118', 1, D1, '14:00', '23:30'],
  [2, 'GRU-205', 2, D1, '22:00', '06:00'],
  [3, 'GRU-317', 3, D1, '22:00', '06:00'],
  [4, 'GRU-118', 4, '2025-11-01', '22:00', '06:00'],
  [5, 'GRU-317', 1, '2025-11-01', '14:00', '22:00'],
  [6, 'GRU-205', 4, D1, '06:00', '14:00'],
]);

const servicios = table('servicios_grua', 'Servicios de remolque registrados por la empresa.', [
  'id_servicio:integer:pk|Identificador',
  'placa_grua:text:fk=vehiculos.placa|Grúa asignada',
  'fecha_hora:timestamp|Momento de la solicitud',
  'direccion:text|Dirección de recogida',
  'estado:text|completado o cancelado',
  'orden_transito:text:null|Orden de inmovilización de tránsito (si aplica)',
], [
  [1, 'GRU-118', t(D1, '22:35'), 'Terminal de buses', 'completado', null],
  [2, 'GRU-205', t(D2, '00:50'), 'Av. del Sur con Calle 80 (choque leve)', 'completado', 'OT-77754'],
  [3, 'GRU-317', t(D2, '00:44'), 'Av. 30 con Calle 45', 'cancelado', 'OT-77801'],
  [4, 'GRU-118', '2025-11-02 02:10:00', 'Glorieta Central', 'completado', 'OT-77690'],
  [5, 'GRU-205', t(D2, '02:05'), 'Glorieta Central (varado)', 'completado', null],
  [6, 'GRU-317', '2025-11-01 18:20:00', 'Hospital Sur', 'completado', null],
]);

const parq: Cell[][] = [];
let pid = 1;
for (let i = 0; i < 22; i++) {
  const p = R.pick(plates);
  const e = R.int(17, 21);
  parq.push([pid++, p, 'entrada', t(D1, `${e}:${String(R.int(0, 59)).padStart(2, '0')}`), R.pick(['ycarrillo', 'auto']), null]);
  if (R.chance(0.7)) parq.push([pid++, p, 'salida', t(D1, `${R.int(e + 1, 23)}:${String(R.int(0, 59)).padStart(2, '0')}`), 'auto', null]);
}
parq.push([pid++, 'BRM-482', 'entrada', t(D1, '19:30'), 'auto', null]);
parq.push([pid++, 'GRU-317', 'apertura_manual', t(D2, '01:06'), 'ycarrillo', 'Ingreso de grúa con orden OT-77801']);
parq.push([pid++, 'BRM-482', 'apertura_manual', t(D2, '01:11'), 'ycarrillo', 'Retiro por orden de inmovilización OT-77801']);
parq.push([pid++, plates[3], 'apertura_manual', t(D1, '20:40'), 'ycarrillo', 'Tiquete perdido, pago en caja']);
parq.sort((a, b) => String(a[3]).localeCompare(String(b[3])));
const parqueadero = table('registros_parqueadero', 'Barrera del Parqueadero Mirador.', [
  'id_registro:integer:pk|Identificador',
  'placa:text:fk=vehiculos.placa|Vehículo',
  'evento:text|entrada, salida o apertura_manual',
  'fecha_hora:timestamp|Momento',
  'operador:text|auto (barrera automática) o usuario del vigilante',
  'observacion:text:null|Observación del operador',
], parq.map((r, i) => [i + 1, r[1], r[2], r[3], r[4], r[5]]));

const polRows: Cell[][] = [];
let polid = 1;
const allPlates = vehRows.filter((v) => v[5] !== 'grua').map((v) => v[0] as string);
for (const p of allPlates) {
  const faro = p === 'BRM-482' || R.chance(0.4);
  polRows.push([polid++, p, faro ? 'Seguros Faro' : R.pick(['Aseguradora Atlas', 'Protección Bruma']), faro ? (p === 'BRM-482' ? 58000 : R.int(12, 60) * 1000) : R.int(10, 55) * 1000, faro ? '2025-10-15' : `2025-0${R.int(1, 9)}-${String(R.int(1, 28)).padStart(2, '0')}`]);
}
const faroCount = polRows.filter((r) => r[2] === 'Seguros Faro').length;
const polizas = table('polizas', 'Pólizas de seguro vigentes.', [
  'id_poliza:integer:pk|Identificador',
  'placa:text:fk=vehiculos.placa|Vehículo asegurado',
  'aseguradora:text|Aseguradora',
  'valor_asegurado:numeric|Valor asegurado (USD)',
  'fecha_actualizacion:date|Última actualización del valor',
], polRows);

export const case07: CaseDef = {
  id: 7,
  code: 'EXP-07',
  title: 'El vehículo desaparecido',
  level: 2,
  tagline: 'Un auto se esfumó de un parqueadero vigilado… sin que nadie lo condujera.',
  location: 'Parqueadero Mirador y avenidas de Ciudad Bruma',
  date: '3 de noviembre de 2025, madrugada',
  scene: 'calle',
  briefing: [
    'La Dra. Alcira Montes dejó su Mazda 3 gris (placa BRM-482) en el Parqueadero Mirador a las 19:30. A las 07:00 ya no estaba.',
    'El vigilante dice que el auto salió «legalmente», con una orden de inmovilización. Tránsito no tiene registro de esa orden.',
    'La ciudad tiene cámaras lectoras de placas. Cruzar las lecturas con los registros de vehículos, conductores y servicios de grúa revelará el camino del auto.',
  ],
  timeline: [
    { time: '19:30', event: 'El BRM-482 entra al parqueadero.' },
    { time: '01:11', event: 'La barrera se abre manualmente para el BRM-482.' },
    { time: '07:00', event: 'La propietaria denuncia el robo.' },
  ],
  concepts: ['INNER JOIN', 'Varios JOIN', 'COUNT', 'GROUP BY', 'HAVING', 'MIN / MAX'],
  tables: [propietarios, vehiculos, camaras, lecturas, conductores, asignaciones, servicios, parqueadero, polizas],
  characters: [
    {
      id: 'elkin', name: 'Elkin Vélez', role: 'Conductor de grúa (GRU-317)', age: 40, suspect: true,
      bio: 'Doce años remolcando autos. Conoce cada parqueadero de la ciudad.',
      statement: 'Esa noche me mandaron a la Av. 30, el cliente canceló y me quedé esperando otro servicio.',
      look: { skin: 3, hair: 'corto', hairColor: 0, facial: 'bigote', accessory: 'gorra', outfitStyle: 'chaqueta', outfit: 7 },
      questions: [
        { id: 'q1', text: '¿Qué hizo después del servicio cancelado?', answer: 'Me estacioné cerca de la Av. 30 a esperar. Dormí un rato en la cabina.' },
        { id: 'q2', text: '¿Fue al Parqueadero Mirador?', answer: 'No. ¿Para qué iría allí?' },
        { id: 'q3', text: 'Su grúa fue captada junto al BRM-482 en cinco cámaras, hasta la Zona Industrial.', answer: 'Habrá otra grúa amarilla igual a la mía. Hay muchas.', requires: ['E2', 'E3'], contradiction: true },
        { id: 'q4', text: 'La orden OT-77801 que presentó en el parqueadero es la de su servicio cancelado.', answer: '…Me ofrecieron mucho dinero. Solo tenía que llevar el auto a una bodega.', requires: ['E6'], contradiction: true, note: 'Elkin confiesa que le pagaron por llevar el auto a una bodega.' },
      ],
    },
    {
      id: 'german', name: 'Germán Rubiano', role: 'Exesposo de la propietaria', age: 49, suspect: true,
      bio: 'En pleno divorcio. Todavía tiene una copia de la llave del Mazda.',
      statement: 'Esa noche viajé a Puerto Alto. No me interesa ese carro.',
      look: { skin: 1, hair: 'canoso', hairColor: 7, facial: 'barba', outfitStyle: 'camisa', outfit: 4 },
      questions: [
        { id: 'q1', text: '¿Tiene llave del BRM-482?', answer: 'Una copia, sí. Pero el auto no salió andando, ¿verdad? Salió en grúa.' },
        { id: 'q2', text: '¿En qué viajó a Puerto Alto?', answer: 'En mi camioneta, la Ranger negra. Pasé el peaje como a la una menos cinco.' },
      ],
    },
    {
      id: 'yesid', name: 'Yesid Carrillo', role: 'Vigilante del Parqueadero Mirador', age: 27, suspect: true,
      bio: 'Turno nocturno. Abrió la barrera manualmente para el BRM-482.',
      statement: 'El conductor de la grúa traía una orden de inmovilización. Yo solo cumplí.',
      look: { skin: 4, hair: 'flequillo', hairColor: 0, outfitStyle: 'uniforme', outfit: 2, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Verificó la orden?', answer: 'Anoté el número en la observación, como dice el protocolo. No tengo cómo consultarla con tránsito a esa hora.' },
        { id: 'q2', text: '¿Recuerda la grúa?', answer: 'Amarilla, de Grúas Express. El conductor tenía bigote y una gorra.', note: 'El conductor de la grúa tenía bigote y gorra.' },
      ],
    },
    {
      id: 'nelson', name: 'Nelson Quiroz', role: 'Conductor de grúa (GRU-205)', age: 52, suspect: true,
      bio: 'Compañero de Vélez en el turno nocturno.',
      statement: 'Yo tuve dos servicios esa noche, los dos en el sur.',
      look: { skin: 2, hair: 'calvo', hairColor: 7, facial: 'barba', outfitStyle: 'chaqueta', outfit: 7, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Vio a Vélez esa noche?', answer: 'Por radio dijo que su servicio se canceló. Después no contestó más.' },
      ],
    },
    {
      id: 'alcira', name: 'Alcira Montes', role: 'Propietaria del BRM-482', age: 46, suspect: true,
      bio: 'Médica de urgencias. Su póliza de seguro se actualizó dos semanas antes del robo.',
      statement: '¿Sospechan de mí? Yo estaba de turno en el hospital toda la noche.',
      look: { skin: 0, hair: 'corto', hairColor: 2, accessory: 'gafas', outfitStyle: 'bata', outfit: 0 },
      questions: [
        { id: 'q1', text: '¿Por qué subió el valor asegurado?', answer: 'No lo subí yo. La aseguradora actualizó todas las pólizas en octubre.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'La ruta del BRM-482', description: 'Uniendo lecturas con cámaras: el BRM-482 salió por la Av. Mirador a las 01:13 y fue captado hasta las Bodegas de la Zona Industrial a las 01:41.', reference: "SELECT l.fecha_hora, c.ubicacion FROM lecturas l INNER JOIN camaras_lpr c ON l.id_camara = c.id_camara WHERE l.placa = 'BRM-482' ORDER BY l.fecha_hora;", match: { any: [['Bodegas', '01:41']], maxRows: 15, features: ['join'] } },
    { id: 'E2', key: true, title: 'La sombra amarilla', description: 'Entre 01:10 y 01:45, solo dos placas fueron leídas 5 veces: el BRM-482 y la grúa GRU-317, en las mismas cámaras y minutos.', reference: "SELECT placa, COUNT(*) AS lecturas FROM lecturas WHERE fecha_hora BETWEEN '2025-11-03 01:10' AND '2025-11-03 01:45' GROUP BY placa HAVING COUNT(*) >= 3;", match: { any: [['GRU-317', '5']], maxRows: 8, features: ['aggregate'] }, implicates: ['elkin'] },
    { id: 'E3', key: true, title: 'Conductor de la GRU-317', description: 'La GRU-317 estaba asignada a Elkin Vélez en el turno de 22:00 a 06:00.', reference: "SELECT g.placa_grua, c.nombre, c.apellido, g.fecha, g.hora_inicio, g.hora_fin FROM asignaciones_grua g INNER JOIN conductores c ON g.id_conductor = c.id_conductor WHERE g.placa_grua = 'GRU-317';", match: { any: [['GRU-317', 'Vélez', '2025-11-02']], maxRows: 8, features: ['join'] }, implicates: ['elkin'] },
    { id: 'E4', title: 'Un servicio cancelado', description: 'La GRU-317 tenía un servicio en la Av. 30 a las 00:44 con la orden OT-77801… marcado como cancelado.', reference: "SELECT * FROM servicios_grua WHERE placa_grua = 'GRU-317';", match: { any: [['GRU-317', 'cancelado', 'OT-77801']], maxRows: 6 }, implicates: ['elkin'] },
    { id: 'E5', title: 'Aperturas manuales', description: 'El vigilante ycarrillo abrió la barrera manualmente a las 01:06 para una grúa y a las 01:11 para el BRM-482, citando la orden OT-77801.', reference: "SELECT * FROM registros_parqueadero WHERE evento = 'apertura_manual';", match: { all: [['BRM-482', 'OT-77801']], maxRows: 8 }, implicates: ['yesid'] },
    { id: 'E6', key: true, title: 'La misma orden', description: 'La orden OT-77801 citada en el parqueadero es la del servicio cancelado de la GRU-317: el vigilante fue engañado con una orden real pero sin uso.', reference: "SELECT p.fecha_hora, p.placa, p.observacion, s.placa_grua, s.estado FROM registros_parqueadero p INNER JOIN servicios_grua s ON p.observacion LIKE '%' || s.orden_transito || '%' WHERE p.evento = 'apertura_manual';", match: { any: [['OT-77801', 'GRU-317']], maxRows: 8, features: ['join'] }, implicates: ['elkin'], clears: ['yesid'] },
    { id: 'E7', title: 'Rumbo a Puerto Alto', description: 'La camioneta KTR-905 de Germán Rubiano pasó por el Peaje Puerto Alto a las 00:55 y por el km 40 a la 01:30, lejos del parqueadero.', reference: "SELECT l.placa, c.ubicacion, l.fecha_hora FROM lecturas l INNER JOIN camaras_lpr c ON l.id_camara = c.id_camara INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN propietarios p ON v.id_propietario = p.id_propietario WHERE p.apellido = 'Rubiano';", match: { any: [['KTR-905', 'Peaje']], maxRows: 10, features: ['join'] }, clears: ['german'] },
    { id: 'E8', title: 'La otra grúa', description: 'Nelson Quiroz conducía la GRU-205 y completó servicios en el sur a las 00:50 y 02:05.', reference: "SELECT c.apellido, g.placa_grua, s.fecha_hora, s.direccion, s.estado FROM conductores c INNER JOIN asignaciones_grua g ON c.id_conductor = g.id_conductor INNER JOIN servicios_grua s ON s.placa_grua = g.placa_grua WHERE c.apellido = 'Quiroz';", match: { any: [['Quiroz', 'GRU-205', 'completado']], maxRows: 10, features: ['join'] }, clears: ['nelson'] },
    { id: 'E9', title: 'Una póliza recién actualizada', description: 'La póliza del BRM-482 se actualizó el 15 de octubre a 58.000 USD.', reference: "SELECT * FROM polizas WHERE placa = 'BRM-482';", match: { any: [['BRM-482', '58000']], maxRows: 3 }, implicates: ['alcira'] },
    { id: 'E10', title: 'Actualización masiva', description: `Seguros Faro actualizó ${faroCount} pólizas el mismo 15 de octubre: fue un ajuste general, no una decisión de la propietaria.`, reference: 'SELECT aseguradora, fecha_actualizacion, COUNT(*) FROM polizas GROUP BY aseguradora, fecha_actualizacion HAVING COUNT(*) > 5;', match: { any: [['Faro', '2025-10-15', String(faroCount)]], maxRows: 10, features: ['aggregate'] }, clears: ['alcira'] },
  ],
  objectives: [
    { id: 'O1', title: 'Reconstruir la ruta', description: '¿Por dónde pasó el auto y quién lo acompañaba?', evidence: ['E1', 'E2'], tables: ['lecturas', 'camaras_lpr'] },
    { id: 'O2', title: 'Identificar la grúa', description: 'Placa, conductor y servicios de la grúa sospechosa.', evidence: ['E3', 'E4'], need: 1, tables: ['asignaciones_grua', 'conductores', 'servicios_grua'] },
    { id: 'O3', title: 'Explicar la salida del parqueadero', description: '¿Por qué se levantó la barrera?', evidence: ['E5', 'E6'], need: 1, tables: ['registros_parqueadero', 'servicios_grua'] },
    { id: 'O4', title: 'Verificar coartadas y móviles', description: 'El exesposo, el otro conductor y la propia dueña.', evidence: ['E7', 'E8', 'E9', 'E10'], need: 2, tables: ['vehiculos', 'propietarios', 'polizas'] },
  ],
  hints: [
    { id: 'H1', title: 'Las cámaras leen placas', evidence: 'E1', levels: ['El auto no se evaporó: alguna cámara lo vio.', 'lecturas guarda placa e id_camara; la ubicación está en camaras_lpr.', 'INNER JOIN camaras_lpr ON lecturas.id_camara = camaras_lpr.id_camara, filtrando la placa BRM-482.'] },
    { id: 'H2', title: 'Compañía sospechosa', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Un auto remolcado nunca viaja solo.', '¿Qué placas fueron leídas muchas veces entre 01:10 y 01:45?', 'Agrupa con GROUP BY placa y filtra grupos con HAVING COUNT(*) >= 3.'] },
    { id: 'H3', title: '¿Quién manejaba la grúa?', evidence: 'E3', requires: { evidence: ['E2'] }, levels: ['Las grúas tienen conductores asignados por turno.', 'Relaciona asignaciones_grua con conductores.', 'INNER JOIN conductores ON asignaciones_grua.id_conductor = conductores.id_conductor'] },
    { id: 'H4', title: 'El servicio de esa noche', evidence: 'E4', levels: ['¿La grúa sospechosa tenía un trabajo oficial esa noche?', 'servicios_grua registra cada servicio y su estado.', "WHERE placa_grua = 'GRU-317'"] },
    { id: 'H5', title: 'La barrera', evidence: 'E5', levels: ['La barrera no se abre sola sin tiquete.', 'registros_parqueadero distingue entradas, salidas y aperturas manuales.', "WHERE evento = 'apertura_manual'"] },
    { id: 'H6', title: 'Unir por un texto', evidence: 'E6', requires: { evidence: ['E5'] }, levels: ['El número de orden aparece en dos tablas distintas.', 'Relaciona la observación del parqueadero con la orden_transito de servicios_grua.', "Un JOIN puede usar cualquier condición: ON p.observacion LIKE '%' || s.orden_transito || '%'"] },
    { id: 'H7', title: 'El exesposo', evidence: 'E7', levels: ['El exesposo dice que viajó a Puerto Alto.', 'Necesitas su placa (vehiculos → propietarios) y sus lecturas (lecturas → camaras_lpr).', 'Encadena varios INNER JOIN y filtra por apellido.'] },
    { id: 'H8', title: 'El otro conductor', evidence: 'E8', levels: ['Había otra grúa de la misma empresa en la calle.', 'Relaciona conductores → asignaciones_grua → servicios_grua.', "Tres tablas, dos JOIN, WHERE c.apellido = 'Quiroz'"] },
    { id: 'H9', title: 'El seguro', evidence: 'E9', levels: ['A veces el dueño es quien más gana con un robo.', 'Revisa la póliza del vehículo robado.', "WHERE placa = 'BRM-482'"] },
    { id: 'H10', title: '¿Solo esa póliza?', evidence: 'E10', requires: { evidence: ['E9'] }, levels: ['¿Fue la única póliza actualizada ese día?', 'Cuenta pólizas por aseguradora y fecha de actualización.', 'GROUP BY aseguradora, fecha_actualizacion con COUNT(*) y HAVING.'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'elkin',
    motive: 'Una banda de desguace le pagó por entregar el auto en una bodega de la Zona Industrial.',
    opportunity: 'Tenía un servicio cancelado con una orden de tránsito real que nadie podía verificar de madrugada.',
    method: 'Se presentó en el parqueadero con la orden OT-77801, el vigilante abrió la barrera y él remolcó el BRM-482 hasta las bodegas.',
    justification: 'La GRU-317, asignada a él, acompaña al BRM-482 en cinco cámaras; la orden usada en el parqueadero es la de su propio servicio cancelado.',
    eliminations: {
      german: { evidence: ['E7'], explanation: 'Su camioneta estaba en la carretera a Puerto Alto a la hora del robo.' },
      yesid: { evidence: ['E6'], explanation: 'Registró la orden presentada; fue engañado con una orden real pero sin uso.' },
      nelson: { evidence: ['E8'], explanation: 'Su grúa atendía servicios completados en el sur.' },
      alcira: { evidence: ['E10'], explanation: 'La actualización de su póliza fue un ajuste general de la aseguradora.' },
    },
    incriminating: ['E2', 'E3', 'E4', 'E6'],
    reveal: [
      'Elkin Vélez recibió una llamada: 3.000 dólares por un Mazda 3 gris. Necesitaba una excusa para entrar a un parqueadero de madrugada.',
      'Registró un servicio y lo canceló, pero conservó la orden de tránsito. El vigilante anotó el número y levantó la barrera.',
      'Las cámaras leyeron ambas placas, una pegada a la otra, hasta la bodega donde el auto iba a ser desarmado. Llegó la policía antes que los compradores.',
    ],
  },
  references: [
    { title: 'Grúas registradas', sql: "SELECT * FROM vehiculos WHERE tipo = 'grua';" },
    { title: 'Lecturas por cámara', sql: 'SELECT c.ubicacion, COUNT(*) FROM lecturas l INNER JOIN camaras_lpr c ON l.id_camara = c.id_camara GROUP BY c.ubicacion ORDER BY COUNT(*) DESC;' },
    { title: 'Cámaras de la Zona Industrial', sql: "SELECT * FROM camaras_lpr WHERE zona = 'Industrial';" },
    { title: 'Lecturas en la Zona Industrial de madrugada', sql: "SELECT l.placa, l.fecha_hora FROM lecturas l INNER JOIN camaras_lpr c ON l.id_camara = c.id_camara WHERE c.zona = 'Industrial' AND l.fecha_hora > '2025-11-03 00:00';" },
    { title: 'Vehículos por propietario', sql: 'SELECT p.apellido, COUNT(*) FROM vehiculos v INNER JOIN propietarios p ON v.id_propietario = p.id_propietario GROUP BY p.apellido HAVING COUNT(*) > 1;' },
    { title: 'Primera y última lectura de la GRU-317', sql: "SELECT MIN(fecha_hora), MAX(fecha_hora) FROM lecturas WHERE placa = 'GRU-317';" },
    { title: 'Servicios por estado', sql: 'SELECT estado, COUNT(*) FROM servicios_grua GROUP BY estado;' },
    { title: 'Asignaciones del 2 de noviembre', sql: "SELECT * FROM asignaciones_grua WHERE fecha = '2025-11-02';" },
    { title: 'Valor asegurado promedio por aseguradora', sql: 'SELECT aseguradora, AVG(valor_asegurado) FROM polizas GROUP BY aseguradora;' },
    { title: 'Mazdas grises', sql: "SELECT * FROM vehiculos WHERE marca = 'Mazda' AND color = 'gris';" },
    { title: 'Movimientos en la barrera', sql: 'SELECT evento, COUNT(*) FROM registros_parqueadero GROUP BY evento;' },
  ],
};
