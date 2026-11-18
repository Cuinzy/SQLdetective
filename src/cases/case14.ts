import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 14 — El crimen de medianoche
// Culpable: Isadora Montalvo (secretaria de la víctima). Iba a ser descubierta desviando fondos.
// Declaró estar en la terraza de 23:40 a 00:15 con Benjamín Ocaña (coartada mutua y falsa), pero su pulsera la
// ubica en la biblioteca a las 23:56 y 00:03. Llamó a la víctima a las 23:52 para citarla. Sus huellas están en el
// abrecartas (junto a las del mayordomo, que lo pulió por la tarde).

const R = rng(1414);
const EXCL = ['Montalvo', 'Grau', 'Valcárcel', 'Ocaña', 'Rangel'];
const D1 = '2025-11-21';
const D2 = '2025-11-22';

const salas = table('salas', 'Ambientes de la Mansión Valcárcel.', [
  'id_sala:integer:pk|Identificador',
  'nombre:text|Nombre',
  'piso:integer|Piso',
], [
  [1, 'Recepción', 1], [2, 'Salón de baile', 1], [3, 'Bar', 1], [4, 'Terraza', 1], [5, 'Biblioteca', 2], [6, 'Cocina', 1], [7, 'Comedor', 1], [8, 'Jardín', 1], [9, 'Escalera principal', 1],
]);

const fill = namePool(R, 22, EXCL);
const phone = () => `31${R.int(0, 9)}-555-${String(R.int(1000, 9999))}`;
const perRows: Cell[][] = [
  [1, 'Octavio', 'Valcárcel', 'anfitrión (víctima)', '300-555-0001'],
  [2, 'Isadora', 'Montalvo', 'secretaria personal', '300-555-0417'],
  [3, 'Anselmo', 'Grau', 'mayordomo', '300-555-0090'],
  [4, 'Leonardo', 'Valcárcel', 'sobrino', '301-555-2202'],
  [5, 'Benjamín', 'Ocaña', 'socio comercial', '302-555-7319'],
  [6, 'Estefanía', 'Rangel', 'exesposa', '303-555-1150'],
];
fill.forEach((n, i) => perRows.push([10 + i, n.nombre, n.apellido, i < 16 ? 'invitado' : 'personal de servicio', phone()]));
const personas = table('personas', 'Asistentes a la Gala del Faro.', [
  'id_persona:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'rol:text|Relación con la gala',
  'telefono:text|Teléfono móvil',
], perRows);

const pulseras = table('pulseras', 'Pulseras de acceso entregadas a cada asistente.', [
  'codigo:text:pk|Código de la pulsera',
  'id_persona:integer:fk=personas.id_persona|Portador',
], perRows.map((p, i) => [`PL-${String(100 + i * 3)}`, p[0]]));
const pul = new Map(perRows.map((p, i) => [p[0] as number, `PL-${String(100 + i * 3)}`]));

// minutos desde 22:00 (0) hasta 00:30 (150)
const at = (m: number) => (m < 120 ? ts(D1, 1320 + m) : ts(D2, m - 120));
const reg: [string, number, number][] = [];
const ping = (pid: number, sala: number, m: number) => reg.push([pul.get(pid)!, sala, m]);
// Víctima
for (let m = 2; m <= 85; m += R.int(4, 7)) ping(1, R.pick([2, 7, 2, 3]), m);
for (const m of [88, 92, 99, 106, 113, 118, 121, 124]) ping(1, 5, m);
// Isadora
for (let m = 1; m <= 98; m += R.int(4, 7)) ping(2, R.pick([2, 7, 1, 2]), m);
ping(2, 4, 102); ping(2, 5, 116); ping(2, 5, 123); ping(2, 4, 129); ping(2, 4, 134); ping(2, 2, 141);
// Mayordomo
for (let m = 0; m <= 96; m += R.int(5, 9)) ping(3, R.pick([6, 7, 2, 6]), m);
for (const m of [101, 107, 113, 119, 125, 131, 137]) ping(3, 6, m);
ping(3, 5, 140); ping(3, 5, 143);
// Sobrino
for (let m = 3; m <= 150; m += R.int(4, 8)) ping(4, m > 60 ? 2 : R.pick([2, 3, 8]), m);
// Socio
for (let m = 0; m <= 98; m += R.int(5, 8)) ping(5, R.pick([3, 2, 4]), m);
ping(5, 4, 102);
for (const m of [107, 111, 116, 120, 125, 129, 133]) ping(5, 3, m);
ping(5, 2, 142);
// Exesposa
for (let m = 5; m <= 85; m += R.int(5, 8)) ping(6, R.pick([2, 8, 3]), m);
for (const m of [90, 94, 98]) ping(6, 5, m);
ping(6, 1, 104);
// Resto
for (const p of perRows.slice(6)) {
  const staff = (p[3] as string).startsWith('personal');
  for (let m = R.int(0, 6); m <= 150; m += R.int(5, 12)) {
    let sala = staff ? R.pick([6, 3, 2, 7]) : R.pick([2, 3, 4, 7, 8, 2, 9]);
    if (!staff && m < 70 && R.chance(0.08)) sala = 5;
    ping(p[0] as number, sala, m);
  }
}
reg.sort((a, b) => a[2] - b[2]);
const registros = table('registros_ubicacion', 'Posiciones de las pulseras. Una pulsera registra su posición solo cuando detecta movimiento.', [
  'id_registro:integer:pk|Identificador',
  'codigo_pulsera:text:fk=pulseras.codigo|Pulsera',
  'id_sala:integer:fk=salas.id_sala|Sala detectada',
  'fecha_hora:timestamp|Momento',
], reg.map(([c, s, m], i) => [i + 1, c, s, at(m)]));

const coartadas = table('coartadas', 'Coartadas declaradas ante la policía para la franja 23:40–00:15.', [
  'id_coartada:integer:pk|Identificador',
  'id_persona:integer:fk=personas.id_persona|Declarante',
  'desde:timestamp|Desde',
  'hasta:timestamp|Hasta',
  'id_sala_declarada:integer:fk=salas.id_sala|Dónde dice que estaba',
  'testigo:integer:null:fk=personas.id_persona|Testigo que lo confirma',
], [
  [1, 2, at(100), at(135), 4, 5],
  [2, 3, at(100), at(135), 6, null],
  [3, 4, at(100), at(135), 2, 12],
  [4, 5, at(100), at(135), 4, 2],
  [5, 6, at(100), at(135), 1, null],
  [6, 12, at(100), at(135), 2, 4],
  [7, 14, at(100), at(135), 3, null],
]);

const llam: Cell[][] = [];
const phones = perRows.map((p) => p[4] as string);
for (let i = 0; i < 26; i++) {
  const o = R.pick(phones.slice(6));
  llam.push([o, R.pick(['601-555-3000', '601-555-4444', R.pick(phones.slice(6))]), at(R.int(0, 150)), R.int(10, 300)]);
}
llam.push(['303-555-1150', '601-555-8294', at(101), 65]);
llam.push(['300-555-0417', '300-555-0001', at(112), 40]);
llam.push(['300-555-0001', '302-555-7319', at(60), 120]);
llam.push(['300-555-0090', '601-555-0123', at(140), 95]);
llam.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const llamadas = table('llamadas', 'Registro de llamadas de los móviles de los asistentes (601-555-8294 = Taxis Bruma; 601-555-0123 = emergencias).', [
  'id_llamada:integer:pk|Identificador',
  'telefono_origen:text|Quien llama',
  'telefono_destino:text|Quien recibe',
  'fecha_hora:timestamp|Inicio',
  'duracion_seg:integer|Duración (segundos)',
], llam.map((l, i) => [i + 1, ...l]));

const huellas = table('huellas', 'Huellas dactilares levantadas en la biblioteca.', [
  'id_huella:integer:pk|Identificador',
  'objeto:text|Objeto',
  'id_persona:integer:fk=personas.id_persona|Persona identificada',
  'calidad:text|completa o parcial',
], [
  [1, 'Abrecartas de plata', 3, 'completa'],
  [2, 'Abrecartas de plata', 2, 'parcial'],
  [3, 'Copa de coñac', 1, 'completa'],
  [4, 'Copa de coñac', 6, 'parcial'],
  [5, 'Pomo de la puerta', 1, 'completa'],
  [6, 'Pomo de la puerta', 6, 'completa'],
  [7, 'Pomo de la puerta', 3, 'completa'],
  [8, 'Escritorio', 2, 'completa'],
  [9, 'Escritorio', 1, 'completa'],
  [10, 'Ventana', 3, 'parcial'],
]);

const grauCocina = reg.filter(([c, s, m]) => c === pul.get(3) && m >= 105 && m <= 135 && s === 6).length;

export const case14: CaseDef = {
  id: 14,
  code: 'EXP-14',
  title: 'El crimen de medianoche',
  level: 3,
  tagline: 'Octavio Valcárcel murió en su biblioteca mientras la gala celebraba la medianoche.',
  location: 'Mansión Valcárcel, Gala del Faro',
  date: '22 de noviembre de 2025, 00:20',
  scene: 'noche',
  briefing: [
    'A las 00:20 el mayordomo encontró a Octavio Valcárcel sin vida en la biblioteca, herido con un abrecartas de plata. El forense sitúa la muerte entre las 23:50 y las 00:10.',
    'Cada asistente llevaba una pulsera de acceso que registra su posición cuando se mueve. Todos declararon dónde estaban entre las 23:40 y las 00:15.',
    'Contrastar las coartadas con las posiciones exige unir tablas con condiciones de rango y comparar salas declaradas con salas detectadas.',
  ],
  timeline: [
    { time: '22:00', event: 'Comienza la gala.' },
    { time: '23:30', event: 'Discusión en la biblioteca entre la víctima y su exesposa.' },
    { time: '23:50–00:10', event: 'Ventana de la muerte (forense).' },
    { time: '00:20', event: 'El mayordomo encuentra el cuerpo.' },
  ],
  concepts: ['Varios INNER JOIN', 'JOIN con BETWEEN', 'Comparar valores entre tablas', 'Unir una tabla dos veces', 'LEFT JOIN', 'MAX', 'GROUP BY'],
  tables: [salas, personas, pulseras, registros, coartadas, llamadas, huellas],
  characters: [
    {
      id: 'isadora', name: 'Isadora Montalvo', role: 'Secretaria personal de la víctima', age: 37, suspect: true,
      bio: 'Manejaba las cuentas de Valcárcel desde hace seis años. El lunes empezaba una auditoría.',
      statement: 'Estuve en la terraza con Benjamín Ocaña desde las 23:40 hasta pasada la medianoche.',
      look: { skin: 1, hair: 'largo', hairColor: 0, accessory: 'aretes', outfitStyle: 'traje', outfit: 0 },
      questions: [
        { id: 'q1', text: '¿Dónde estaba entre las 23:40 y las 00:15?', answer: 'En la terraza, tomando aire con Benjamín. Él puede confirmarlo.' },
        { id: 'q2', text: '¿Habló con el señor Valcárcel esa noche?', answer: 'Solo al inicio de la gala. Estaba muy ocupado.' },
        { id: 'q3', text: 'Su pulsera la ubica en la biblioteca a las 23:56 y a las 00:03.', answer: 'Subí un momento a buscar… unos papeles. Él estaba bien cuando me fui.', requires: ['E3'], contradiction: true, note: 'Isadora admite haber subido a la biblioteca.' },
        { id: 'q4', text: 'A las 23:52 usted llamó al móvil del señor Valcárcel.', answer: 'Iba a descubrir todo el lunes. Solo quería hablar… él empezó a gritar.', requires: ['E4'], contradiction: true },
      ],
    },
    {
      id: 'grau', name: 'Anselmo Grau', role: 'Mayordomo', age: 66, suspect: true,
      bio: 'Cuarenta años al servicio de la familia. Encontró el cuerpo. Sus huellas están en el arma.',
      statement: 'Pulí la platería de la biblioteca por la tarde. Durante la gala no salí de la cocina hasta que subí a llevarle un coñac.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'bigote', outfitStyle: 'traje', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Por qué sus huellas están en el abrecartas?', answer: 'Lo pulo todos los viernes. Esa tarde también.' },
        { id: 'q2', text: '¿Vio a alguien subir a la biblioteca?', answer: 'Vi un vestido verde en la escalera, poco antes de medianoche. La señorita Montalvo llevaba un vestido verde.', note: 'El mayordomo vio un vestido verde subiendo antes de medianoche.' },
      ],
    },
    {
      id: 'leonardo', name: 'Leonardo Valcárcel', role: 'Sobrino y heredero', age: 29, suspect: true,
      bio: 'Hereda la mitad de la fortuna. Tiene deudas de juego.',
      statement: 'Bailé toda la noche. Medio salón me vio.',
      look: { skin: 1, hair: 'mono', hairColor: 3, facial: 'perilla', outfitStyle: 'traje', outfit: 4, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Sabía que heredaba?', answer: 'Todo el mundo lo sabía. Mi tío lo repetía para que yo «sentara cabeza».' },
      ],
    },
    {
      id: 'ocana', name: 'Benjamín Ocaña', role: 'Socio comercial', age: 54, suspect: true,
      bio: 'Su sociedad con Valcárcel iba a disolverse. Confirma la coartada de Isadora.',
      statement: 'Isadora y yo estuvimos en la terraza. Yo no me moví de allí.',
      look: { skin: 3, hair: 'calvo', hairColor: 0, facial: 'barba', accessory: 'gafas_sol', outfitStyle: 'traje', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿Estuvo con Isadora toda la franja?', answer: 'Sí… bueno. Ella me pidió que dijera eso. Yo estuve en el bar casi todo el tiempo.', requires: ['E3'], note: 'Ocaña admite que mintió para cubrir a Isadora.' },
        { id: 'q2', text: '¿Por qué la cubrió?', answer: 'Me dijo que necesitaba evitar un escándalo con su marido. No pensé que…' },
      ],
    },
    {
      id: 'rangel', name: 'Estefanía Rangel', role: 'Exesposa de la víctima', age: 58, suspect: true,
      bio: 'Discutió a gritos con Valcárcel en la biblioteca a las 23:30.',
      statement: 'Discutimos, sí. Luego llamé un taxi y me fui antes de las doce menos cuarto.',
      look: { skin: 2, hair: 'corto', hairColor: 5, accessory: 'sombrero', outfitStyle: 'traje', outfit: 5, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Por qué discutieron?', answer: 'Por la casa de la playa. Siempre por la casa de la playa.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'En la biblioteca durante la ventana', description: 'Entre las 23:50 y las 00:10, solo dos pulseras se registraron en la biblioteca: la de la víctima y la de Isadora Montalvo.', reference: "SELECT p.nombre, p.apellido, r.fecha_hora FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN personas p ON pu.id_persona = p.id_persona INNER JOIN salas s ON r.id_sala = s.id_sala WHERE s.nombre = 'Biblioteca' AND r.fecha_hora BETWEEN '2025-11-21 23:50' AND '2025-11-22 00:10';", match: { any: [['Montalvo', '23:56'], ['Montalvo', '00:03']], maxRows: 15, features: ['join'] }, implicates: ['isadora'] },
    { id: 'E2', key: true, title: 'La coartada de Isadora', description: 'Isadora declaró estar en la terraza de 23:40 a 00:15 con Benjamín Ocaña como testigo.', reference: 'SELECT p.apellido, c.desde, c.hasta, s.nombre AS sala_declarada, t.apellido AS testigo FROM coartadas c INNER JOIN personas p ON c.id_persona = p.id_persona INNER JOIN salas s ON c.id_sala_declarada = s.id_sala LEFT JOIN personas t ON c.testigo = t.id_persona;', match: { any: [['Montalvo', 'Terraza', 'Ocaña'], ['Montalvo', 'Terraza']], maxRows: 10, features: ['join'] } },
    { id: 'E3', key: true, title: 'Coartadas que no cuadran', description: 'Uniendo coartadas con posiciones dentro de la franja declarada: Isadora aparece en la biblioteca y Ocaña en el bar, aunque ambos dijeron estar juntos en la terraza.', reference: 'SELECT p.apellido, s.nombre AS sala_real, r.fecha_hora FROM coartadas c INNER JOIN pulseras pu ON pu.id_persona = c.id_persona INNER JOIN registros_ubicacion r ON r.codigo_pulsera = pu.codigo AND r.fecha_hora BETWEEN c.desde AND c.hasta INNER JOIN personas p ON p.id_persona = c.id_persona INNER JOIN salas s ON s.id_sala = r.id_sala WHERE r.id_sala <> c.id_sala_declarada;', match: { all: [['Montalvo', 'Biblioteca'], ['Ocaña', 'Bar']], maxRows: 30, features: ['join'] }, implicates: ['isadora', 'ocana'] },
    { id: 'E4', key: true, title: 'La llamada de las 23:52', description: 'A las 23:52 el móvil de Isadora (300-555-0417) llamó al de la víctima durante 40 segundos.', reference: 'SELECT o.apellido AS llama, d.apellido AS recibe, l.fecha_hora, l.duracion_seg FROM llamadas l INNER JOIN personas o ON l.telefono_origen = o.telefono INNER JOIN personas d ON l.telefono_destino = d.telefono WHERE d.id_persona = 1;', match: { any: [['Montalvo', '23:52'], ['300-555-0417', '23:52']], maxRows: 6 }, implicates: ['isadora'] },
    { id: 'E5', title: 'Huellas en el abrecartas', description: 'En el abrecartas hay una huella completa del mayordomo y una parcial de Isadora Montalvo.', reference: "SELECT h.objeto, p.nombre, p.apellido, h.calidad FROM huellas h INNER JOIN personas p ON h.id_persona = p.id_persona WHERE h.objeto LIKE 'Abrecartas%';", match: { all: [['Grau'], ['Montalvo']], maxRows: 4, features: ['join'] }, implicates: ['isadora', 'grau'] },
    { id: 'E6', title: 'El mayordomo en la cocina', description: `Entre 23:45 y 00:15 la pulsera del mayordomo solo se registró en la cocina (${grauCocina} veces).`, reference: "SELECT s.nombre, COUNT(*) FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN salas s ON r.id_sala = s.id_sala WHERE pu.id_persona = 3 AND r.fecha_hora BETWEEN '2025-11-21 23:45' AND '2025-11-22 00:15' GROUP BY s.nombre;", match: { any: [['Cocina', String(grauCocina)]], maxRows: 2, features: ['aggregate'] }, clears: ['grau'] },
    { id: 'E7', title: 'El sobrino bailaba', description: 'Durante la ventana de la muerte, la pulsera de Leonardo Valcárcel solo se registró en el salón de baile.', reference: "SELECT p.nombre, s.nombre, COUNT(*) FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN personas p ON pu.id_persona = p.id_persona INNER JOIN salas s ON r.id_sala = s.id_sala WHERE p.id_persona = 4 AND r.fecha_hora BETWEEN '2025-11-21 23:50' AND '2025-11-22 00:10' GROUP BY p.nombre, s.nombre;", match: { any: [['Leonardo', 'Salón de baile']], maxRows: 2, features: ['join'] }, clears: ['leonardo'] },
    { id: 'E8', title: 'El socio estaba en el bar', description: 'Entre 23:45 y 00:15, la pulsera de Ocaña se registró solo en el bar: mintió como testigo, pero no estuvo en la biblioteca.', reference: "SELECT s.nombre, COUNT(*) FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN salas s ON r.id_sala = s.id_sala WHERE pu.id_persona = 5 AND r.fecha_hora BETWEEN '2025-11-21 23:45' AND '2025-11-22 00:15' GROUP BY s.nombre;", match: { any: [['Bar', '7']], maxRows: 2, features: ['aggregate'] }, clears: ['ocana'] },
    { id: 'E9', title: 'La exesposa se fue', description: 'El último registro de la pulsera de Estefanía Rangel es en la recepción a las 23:44; a las 23:41 llamó a Taxis Bruma.', reference: 'SELECT p.apellido, MAX(r.fecha_hora) FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN personas p ON pu.id_persona = p.id_persona GROUP BY p.apellido HAVING MAX(r.fecha_hora) < \'2025-11-21 23:50\';', match: { any: [['Rangel', '23:44']], maxRows: 6, features: ['aggregate'] }, clears: ['rangel'] },
    { id: 'E10', title: 'El último movimiento', description: 'La pulsera de la víctima registró su último movimiento a las 00:04 en la biblioteca.', reference: "SELECT MAX(r.fecha_hora) FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo WHERE pu.id_persona = 1;", match: { any: [['2025-11-22 00:04']], maxRows: 3, features: ['aggregate'] } },
  ],
  objectives: [
    { id: 'O1', title: 'Establecer quién estuvo en la escena', description: '¿Quién estaba en la biblioteca durante la ventana de la muerte?', evidence: ['E1', 'E10'], need: 1, tables: ['registros_ubicacion', 'pulseras', 'salas'] },
    { id: 'O2', title: 'Contrastar coartadas', description: 'Compara lo declarado con lo registrado.', evidence: ['E2', 'E3'], tables: ['coartadas', 'registros_ubicacion'] },
    { id: 'O3', title: 'Analizar llamadas y huellas', description: 'Contactos con la víctima y rastros en el arma.', evidence: ['E4', 'E5'], need: 1, tables: ['llamadas', 'huellas'] },
    { id: 'O4', title: 'Descartar sospechosos', description: 'Mayordomo, sobrino, socio y exesposa.', evidence: ['E6', 'E7', 'E8', 'E9'], need: 3, tables: ['registros_ubicacion', 'personas'] },
  ],
  hints: [
    { id: 'H1', title: 'La escena', evidence: 'E1', levels: ['Las pulseras saben quién estuvo en la biblioteca.', 'registros_ubicacion usa códigos de pulsera; pulseras los relaciona con personas; salas da el nombre del lugar.', "Encadena tres INNER JOIN y filtra s.nombre = 'Biblioteca' con BETWEEN para la ventana de la muerte."] },
    { id: 'H2', title: 'Lo que declararon', evidence: 'E2', levels: ['Todos dieron una coartada. Algunos con testigo.', 'coartadas guarda la sala declarada y el testigo, ambos como identificadores.', 'Une personas dos veces: una para el declarante y otra (LEFT JOIN) para el testigo, que puede ser NULL.'] },
    { id: 'H3', title: 'Comparar declarado y real', evidence: 'E3', requires: { evidence: ['E2'] }, levels: ['Una coartada falsa es una sala declarada distinta a la sala registrada.', 'Une coartadas con las posiciones de la misma persona dentro de [desde, hasta].', 'JOIN … ON r.fecha_hora BETWEEN c.desde AND c.hasta y WHERE r.id_sala <> c.id_sala_declarada'] },
    { id: 'H4', title: 'Llamadas a la víctima', evidence: 'E4', levels: ['¿Alguien citó a la víctima en la biblioteca?', 'llamadas usa números de teléfono; personas los relaciona con nombres.', 'Une personas dos veces (origen y destino) y filtra las llamadas que recibió la víctima.'] },
    { id: 'H5', title: 'El arma', evidence: 'E5', levels: ['El abrecartas tiene huellas.', 'Une huellas con personas.', "WHERE objeto LIKE 'Abrecartas%'"] },
    { id: 'H6', title: 'El mayordomo', evidence: 'E6', levels: ['Sus huellas están en el arma. ¿Dónde estaba?', 'Agrupa las posiciones de su pulsera por sala en la franja 23:45–00:15.', 'GROUP BY s.nombre con COUNT(*)'] },
    { id: 'H7', title: 'El heredero', evidence: 'E7', levels: ['El sobrino tenía motivo. ¿Y oportunidad?', 'Revisa sus posiciones en la ventana de la muerte.', 'Agrupa por sala para ver dónde estuvo.'] },
    { id: 'H8', title: 'El testigo', evidence: 'E8', levels: ['El socio confirma la coartada de Isadora… ¿estaba con ella?', 'Agrupa sus posiciones por sala en la franja declarada.', 'GROUP BY s.nombre'] },
    { id: 'H9', title: 'La exesposa', evidence: 'E9', levels: ['Discutió con la víctima. ¿Seguía en la mansión?', 'Busca la última posición registrada de cada persona.', 'MAX(fecha_hora) con GROUP BY y HAVING MAX(fecha_hora) < …'] },
    { id: 'H10', title: 'La hora exacta', evidence: 'E10', levels: ['Las pulseras registran movimiento. Un cuerpo inmóvil deja de registrarse.', 'Busca la última posición de la víctima.', 'MAX(fecha_hora) filtrando la pulsera de la persona 1.'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'isadora',
    motive: 'La auditoría del lunes iba a descubrir que llevaba años desviando dinero de las cuentas de Valcárcel.',
    opportunity: 'Citó a la víctima por teléfono en la biblioteca mientras toda la gala estaba en el salón, y armó una coartada con Ocaña.',
    method: 'Llamó a Valcárcel a las 23:52, subió a la biblioteca, discutieron y lo hirió con el abrecartas del escritorio. Volvió a la terraza a las 00:09.',
    justification: 'Es la única persona además de la víctima registrada en la biblioteca durante la ventana de la muerte; su coartada es falsa; la llamó minutos antes; su huella está en el arma.',
    eliminations: {
      grau: { evidence: ['E6'], explanation: 'Estuvo en la cocina durante toda la ventana; sus huellas se explican por la limpieza de la tarde.' },
      leonardo: { evidence: ['E7'], explanation: 'Su pulsera solo registra el salón de baile.' },
      ocana: { evidence: ['E8'], explanation: 'Mintió para cubrir a Isadora, pero estuvo en el bar.' },
      rangel: { evidence: ['E9'], explanation: 'Salió de la mansión a las 23:44, antes de la ventana de la muerte.' },
    },
    incriminating: ['E1', 'E3', 'E4', 'E5'],
    reveal: [
      'Isadora Montalvo sabía que el lunes la auditoría encontraría seis años de desvíos. Le pidió a Ocaña que dijera que estaban juntos «para evitar un escándalo».',
      'A las 23:52 llamó a Valcárcel para hablar en privado. La discusión terminó con el abrecartas de plata.',
      'Su pulsera nunca dejó de registrar sus movimientos. La coartada perfecta duró exactamente lo que tardó una consulta en compararla con los datos.',
    ],
  },
  references: [
    { title: 'Salas', sql: 'SELECT * FROM salas;' },
    { title: 'Asistentes por rol', sql: 'SELECT rol, COUNT(*) FROM personas GROUP BY rol;' },
    { title: 'Registros por sala', sql: 'SELECT s.nombre, COUNT(*) FROM registros_ubicacion r INNER JOIN salas s ON r.id_sala = s.id_sala GROUP BY s.nombre ORDER BY COUNT(*) DESC;' },
    { title: 'Visitas a la biblioteca antes de las 23:30', sql: "SELECT p.apellido, r.fecha_hora FROM registros_ubicacion r INNER JOIN pulseras pu ON r.codigo_pulsera = pu.codigo INNER JOIN personas p ON pu.id_persona = p.id_persona WHERE r.id_sala = 5 AND r.fecha_hora < '2025-11-21 23:30';" },
    { title: 'Coartadas sin testigo', sql: 'SELECT * FROM coartadas WHERE testigo IS NULL;' },
    { title: 'Llamadas largas', sql: 'SELECT * FROM llamadas WHERE duracion_seg > 120;' },
    { title: 'Llamadas a números externos', sql: "SELECT * FROM llamadas WHERE telefono_destino LIKE '601%';" },
    { title: 'Huellas por persona', sql: 'SELECT p.apellido, COUNT(*) FROM huellas h INNER JOIN personas p ON h.id_persona = p.id_persona GROUP BY p.apellido;' },
    { title: 'Personas sin huellas en la escena (LEFT JOIN)', sql: 'SELECT p.apellido FROM personas p LEFT JOIN huellas h ON p.id_persona = h.id_persona WHERE h.id_huella IS NULL AND p.id_persona <= 6;' },
    { title: 'Pulseras sin registros (RIGHT JOIN)', sql: 'SELECT pu.codigo FROM registros_ubicacion r RIGHT JOIN pulseras pu ON r.codigo_pulsera = pu.codigo WHERE r.id_registro IS NULL;' },
    { title: 'Movimientos de la víctima', sql: "SELECT s.nombre, r.fecha_hora FROM registros_ubicacion r INNER JOIN salas s ON r.id_sala = s.id_sala WHERE r.codigo_pulsera = 'PL-100' ORDER BY r.fecha_hora;" },
  ],
};
