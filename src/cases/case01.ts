import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts, hm } from './helpers';

// CASO 1 — El robo del museo
// Culpable: Valeria Quintero (restauradora). Motivo: deudas; un comprador privado le ofreció dinero.
// Oportunidad: su tarjeta T-0457 entra al laboratorio (23:36) y a la Sala Itzamal (23:41), con la cámara 3
// desconectada a petición de su usuario a las 23:30; sale por la bodega a las 23:51.

const D = '2025-03-14';
const R = rng(101);

const salas = table('salas', 'Salas y áreas del Museo de Historia de Ciudad Bruma.', [
  'id_sala:integer:pk|Identificador de la sala',
  'nombre:text|Nombre de la sala',
  'piso:integer|Piso (−1 = sótano)',
  'nivel_seguridad:integer|Nivel de acceso requerido fuera de horario (1 a 3)',
], [
  [1, 'Vestíbulo', 1, 1],
  [2, 'Galería Colonial', 1, 2],
  [3, 'Sala Itzamal', 2, 3],
  [4, 'Laboratorio de conservación', 2, 3],
  [5, 'Bodega de colecciones', -1, 3],
  [6, 'Cafetería', 1, 1],
  [7, 'Sala de control de seguridad', 1, 2],
  [8, 'Galería Moderna', 2, 2],
]);

const keyStaff: Cell[][] = [
  [1, 'Nora', 'Bastidas', 'Curadora jefe', 'tarde', 'T-0219', 3, 'nbastidas'],
  [2, 'Héctor', 'Duarte', 'Guardia nocturno', 'noche', 'T-0102', 2, 'hduarte'],
  [3, 'Iván', 'Rey', 'Técnico de cámaras', 'tarde', 'T-0330', 2, 'irey'],
  [4, 'Valeria', 'Quintero', 'Restauradora', 'tarde', 'T-0457', 3, 'vquintero'],
  [5, 'Ofelia', 'Marín', 'Directora', 'mañana', 'T-0001', 3, 'omarin'],
];
const fillerRoles: [string, string, number][] = [
  ['Guía', 'tarde', 2], ['Guía', 'tarde', 2], ['Guía', 'mañana', 2], ['Cafetería', 'tarde', 1], ['Cafetería', 'mañana', 1],
  ['Limpieza', 'mañana', 1], ['Recepción', 'tarde', 1], ['Guardia diurno', 'mañana', 2], ['Guía', 'tarde', 2],
];
const staffNames = namePool(R, fillerRoles.length, ['Quintero', 'Duarte', 'Rey', 'Bastidas', 'Ortega', 'Marín']);
const fillerStaff: Cell[][] = fillerRoles.map(([cargo, turno, nivel], i) => {
  const n = staffNames[i];
  const user = (n.nombre[0] + n.apellido).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return [6 + i, n.nombre, n.apellido, cargo, turno, `T-05${String(10 + i * 7).padStart(2, '0')}`, nivel, user];
});

const empleados = table('empleados', 'Personal del museo y sus credenciales de acceso.', [
  'id_empleado:integer:pk|Identificador del empleado',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'turno:text|Turno habitual (mañana, tarde, noche)',
  'tarjeta_acceso:text|Código de la tarjeta de acceso',
  'nivel_acceso:integer|Nivel máximo de acceso (1 a 3)',
  'usuario:text|Usuario en el sistema de seguridad',
], [...keyStaff, ...fillerStaff]);

// Registros de acceso
const acc: [string, number, number, string][] = []; // tarjeta, sala, minutos, tipo
const add = (card: string, sala: number, min: number, tipo = 'entrada') => acc.push([card, sala, min, tipo]);
// Valeria (día y noche)
[[1, 510], [4, 515], [6, 730], [4, 785], [3, 920], [4, 935]].forEach(([s, m]) => add('T-0457', s, m));
add('T-0457', 1, 1078, 'salida');
add('T-0457', 4, 1416); add('T-0457', 3, 1421); add('T-0457', 4, 1426); add('T-0457', 5, 1431, 'salida');
// Nora
[[1, 810], [2, 840], [3, 1110], [8, 1215], [3, 1310]].forEach(([s, m]) => add('T-0219', s, m));
add('T-0219', 1, 1360, 'salida');
// Iván
[[1, 720], [5, 975], [7, 1010], [3, 1120]].forEach(([s, m]) => add('T-0330', s, m));
add('T-0330', 1, 1275, 'salida');
// Héctor
[[1, 1315], [7, 1320], [1, 1350], [2, 1368], [8, 1385], [7, 1395], [1, 1418], [3, 1432]].forEach(([s, m]) => add('T-0102', s, m));
// Personal de relleno
fillerStaff.forEach((row) => {
  const card = row[5] as string;
  const turno = row[4] as string;
  const cargo = row[3] as string;
  const start = turno === 'mañana' ? R.int(470, 490) : R.int(830, 850);
  const end = turno === 'mañana' ? R.int(900, 930) : cargo === 'Cafetería' ? 1330 : R.int(1290, 1318);
  add(card, 1, start);
  const rooms = cargo === 'Guía' ? [2, 3, 8, 3, 2] : cargo === 'Cafetería' ? [6, 6] : cargo === 'Limpieza' ? [2, 3, 8, 6] : cargo === 'Guardia diurno' ? [7, 2, 8] : [1, 6];
  let m = start + 20;
  for (const s of rooms) {
    m += R.int(25, 70);
    if (m >= end - 5) break;
    add(card, s, m);
  }
  if (cargo === 'Guía') {
    // visitas guiadas de la noche de exposición
    for (const mm of [1150, 1195, 1240]) add(card, R.pick([2, 3, 8]), mm + R.int(0, 12));
  }
  add(card, 1, end, 'salida');
});
acc.sort((a, b) => a[2] - b[2]);
const registros = table('registros_acceso', 'Lecturas de tarjetas en las puertas del museo (14 de marzo de 2025).', [
  'id_registro:integer:pk|Identificador del registro',
  'tarjeta:text|Código de tarjeta leído',
  'id_sala:integer:fk=salas.id_sala|Sala de la puerta',
  'fecha_hora:timestamp|Fecha y hora de la lectura',
  'tipo:text|entrada o salida',
], acc.map(([card, sala, m, tipo], i) => [1000 + i, card, sala, ts(D, m), tipo]));

// Visitantes de la exposición privada "Noche de Jade"
const visitorNames = namePool(R, 44, ['Quintero', 'Duarte', 'Rey', 'Bastidas', 'Ortega', 'Marín']);
const vis: Cell[][] = visitorNames.map((n, i) => {
  const tipo = i < 5 ? 'VIP' : i < 11 ? 'prensa' : 'general';
  const e = R.int(1140, 1230);
  let s = R.int(1265, 1319);
  if (i === 2) s = 1332; // VIP 22:12
  if (i === 6) s = 1325; // prensa 22:05
  if (i === 8) s = 1338; // prensa 22:18
  return [200 + i, n.nombre, n.apellido, `CC-${R.int(10000000, 99999999)}`, tipo, hm(e), hm(s)];
});
vis.splice(3, 0, [199, 'Samuel', 'Ortega', 'CC-80331245', 'VIP', '19:12:00', '22:31:00']);
const visitantes = table('visitantes', 'Invitados a la exposición privada «Noche de Jade» (19:00–22:00).', [
  'id_visitante:integer:pk|Identificador del visitante',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'documento:text|Documento de identidad',
  'tipo_invitacion:text|VIP, prensa o general',
  'hora_entrada:time|Hora de llegada',
  'hora_salida:time|Hora de salida registrada en recepción',
], vis);

const camaras = table('camaras', 'Cámaras de seguridad instaladas.', [
  'id_camara:integer:pk|Identificador de la cámara',
  'id_sala:integer:fk=salas.id_sala|Sala vigilada',
  'ubicacion:text|Descripción de la ubicación',
  'estado:text|Estado actual',
], [
  [1, 1, 'Puerta principal', 'operativa'],
  [2, 2, 'Centro de la galería', 'operativa'],
  [3, 3, 'Vitrina central Itzamal', 'operativa'],
  [5, 5, 'Muelle de carga', 'operativa'],
  [6, 6, 'Caja de cafetería', 'operativa'],
  [7, 7, 'Monitores', 'operativa'],
  [8, 8, 'Escalera norte', 'operativa'],
]);

const ev: [number, number, string, string][] = [];
for (const c of [1, 2, 3, 5, 6, 7, 8]) ev.push([c, 360, 'autodiagnostico', 'sistema']);
ev.push([5, 980, 'desconexion', 'irey'], [5, 1005, 'reconexion', 'irey']);
for (let i = 0; i < 26; i++) ev.push([R.pick([1, 2, 3, 8, 6]), R.int(1140, 1310), 'movimiento', 'sistema']);
ev.push([1, 1418, 'movimiento', 'sistema'], [3, 1410, 'desconexion', 'vquintero'], [3, 1430, 'reconexion', 'sistema'], [7, 1436, 'alarma_manual', 'hduarte']);
ev.sort((a, b) => a[1] - b[1]);
const eventos = table('eventos_camara', 'Bitácora del sistema de cámaras.', [
  'id_evento:integer:pk|Identificador del evento',
  'id_camara:integer:fk=camaras.id_camara|Cámara',
  'fecha_hora:timestamp|Momento del evento',
  'evento:text|autodiagnostico, movimiento, desconexion, reconexion, alarma_manual',
  'solicitado_por:text|Usuario que originó el evento (o «sistema»)',
], ev.map(([c, m, e, u], i) => [500 + i, c, ts(D, m), e, u]));

const objetos = table('objetos', 'Piezas de la colección.', [
  'id_objeto:integer:pk|Identificador de la pieza',
  'nombre:text|Nombre de la pieza',
  'id_sala:integer:fk=salas.id_sala|Sala donde se encuentra',
  'valor_estimado:numeric|Valor estimado (USD)',
  'estado:text|exhibido, en_bodega, en_restauracion, desaparecido',
  'ultima_manipulacion:date|Fecha de la última manipulación',
  'manipulado_por:text|Usuario que manipuló la pieza por última vez',
], [
  [1, 'Máscara de jade de Itzamal', 3, 1850000, 'desaparecido', '2025-03-07', 'vquintero'],
  [2, 'Vasija ceremonial de obsidiana', 3, 420000, 'exhibido', '2025-02-11', 'nbastidas'],
  [3, 'Collar de cuentas de jade', 3, 310000, 'exhibido', '2025-01-20', 'nbastidas'],
  [4, 'Retrato del virrey Alcocer', 2, 260000, 'exhibido', '2024-11-03', 'vquintero'],
  [5, 'Cofre de plata colonial', 2, 190000, 'exhibido', '2024-12-15', 'nbastidas'],
  [6, 'Estela tallada fragmentada', 5, 95000, 'en_bodega', '2024-10-02', 'nbastidas'],
  [7, 'Códice facsimilar', 5, 12000, 'en_bodega', '2024-09-18', 'omarin'],
  [8, 'Instalación «Ciudad de niebla»', 8, 150000, 'exhibido', '2025-02-27', 'nbastidas'],
  [9, 'Fotografía «Puerto 1952»', 8, 18000, 'exhibido', '2025-01-08', 'nbastidas'],
  [10, 'Mapa portulano', 2, 230000, 'en_restauracion', '2025-03-12', 'vquintero'],
  [11, 'Pectoral de concha', 3, 270000, 'exhibido', '2025-02-02', 'nbastidas'],
  [12, 'Escultura «La espera»', 8, 88000, 'exhibido', '2024-08-30', 'omarin'],
  [13, 'Espada ceremonial', 2, 140000, 'exhibido', '2024-07-14', 'nbastidas'],
  [14, 'Urna funeraria', 5, 76000, 'en_bodega', '2024-06-21', 'nbastidas'],
]);

const testimonios = table('testimonios', 'Declaraciones tomadas por la policía la madrugada del 15 de marzo.', [
  'id_testimonio:integer:pk|Identificador',
  'declarante:text|Nombre de quien declara',
  'cargo:text|Relación con el museo',
  'hora_declaracion:time|Hora de la declaración (15 de marzo)',
  'declaracion:text|Texto de la declaración',
], [
  [1, 'Héctor Duarte', 'Guardia nocturno', '00:20', 'Nadie entró al museo después de las 22:00. Hice mis rondas y todo estaba tranquilo hasta que encontré la vitrina vacía a las 23:55.'],
  [2, 'Valeria Quintero', 'Restauradora', '01:10', 'Salí del museo a las 18:00 y me fui directo a casa. No volví hasta que me llamaron.'],
  [3, 'Nora Bastidas', 'Curadora jefe', '00:45', 'Cerré la exposición, revisé la Sala Itzamal a las 21:50 y salí a las 22:40.'],
  [4, 'Iván Rey', 'Técnico de cámaras', '01:30', 'Por la tarde limpié la cámara de la bodega. Me fui antes de las diez.'],
  [5, 'Samuel Ortega', 'Invitado VIP', '02:05', 'Me quedé conversando con la curadora hasta pasadas las diez y media, luego tomé un taxi.'],
  [6, `${staffNames[0].nombre} ${staffNames[0].apellido}`, 'Guía', '00:55', 'Hice tres visitas guiadas. En la última, a las 21:00, la máscara seguía en su vitrina.'],
  [7, `${staffNames[3].nombre} ${staffNames[3].apellido}`, 'Cafetería', '01:00', 'Cerré la cafetería a las 22:10. No vi a nadie extraño.'],
]);

export const case01: CaseDef = {
  id: 1,
  code: 'EXP-01',
  title: 'El robo del museo',
  level: 1,
  tagline: 'La máscara de jade de Itzamal desapareció tras la exposición privada.',
  location: 'Museo de Historia de Ciudad Bruma',
  date: '14 de marzo de 2025, 23:55',
  scene: 'museo',
  briefing: [
    'Durante la exposición privada «Noche de Jade», 45 invitados admiraron la Máscara de jade de Itzamal, valorada en 1,85 millones de dólares.',
    'La exposición terminó a las 22:00. A las 23:55 el guardia nocturno encontró la vitrina abierta y vacía. No hay puertas forzadas.',
    'El guardia jura que nadie entró después de las 22:00. Las tarjetas de acceso, las cámaras y las declaraciones dirán si eso es cierto.',
  ],
  timeline: [
    { time: '19:00', event: 'Inicia la exposición privada.' },
    { time: '21:00', event: 'Última visita guiada: la máscara sigue en su vitrina.' },
    { time: '22:00', event: 'Fin de la exposición.' },
    { time: '23:55', event: 'El guardia descubre la vitrina vacía.' },
  ],
  concepts: ['SELECT', 'WHERE', 'AND / OR', 'Comparación de fechas y horas', 'LIKE', 'IN', 'ORDER BY'],
  tables: [salas, empleados, registros, visitantes, camaras, eventos, objetos, testimonios],
  characters: [
    {
      id: 'valeria', name: 'Valeria Quintero', role: 'Restauradora', age: 38, suspect: true,
      bio: 'Restauró la máscara la semana anterior. Excelente profesional; últimamente pide adelantos de sueldo.',
      statement: 'Salí a las seis. Esa máscara era mi orgullo: la restauré con mis propias manos.',
      look: { skin: 1, hair: 'largo', hairColor: 2, accessory: 'gafas', outfitStyle: 'bata', outfit: 0 },
      questions: [
        { id: 'q1', text: '¿A qué hora salió del museo?', answer: 'A las 18:00, como siempre. Mi tarjeta lo dirá.' },
        { id: 'q2', text: '¿Alguien más usa su tarjeta?', answer: 'Nadie. La llevo colgada al cuello todo el día.' },
        { id: 'q3', text: '¿Por qué su tarjeta registra una entrada a la Sala Itzamal a las 23:41?', answer: '¿A las 23:41? Eso es imposible… tiene que ser un error del sistema. O alguien clonó mi tarjeta.', requires: ['E1', 'E2'], contradiction: true, note: 'Valeria niega la entrada de las 23:41 y culpa al sistema.' },
        { id: 'q4', text: '¿Por qué su usuario solicitó desconectar la cámara de la sala 3 a las 23:30?', answer: 'Programé un mantenimiento hace días… Habrá sido una coincidencia.', requires: ['E3'], contradiction: true, note: 'Valeria dice que la desconexión fue un mantenimiento programado.' },
        { id: 'q5', text: 'Su tarjeta salió por la bodega a las 23:51. ¿Qué llevaba?', answer: '…No voy a decir nada más sin mi abogado.', requires: ['E11'], contradiction: true },
      ],
    },
    {
      id: 'hector', name: 'Héctor Duarte', role: 'Guardia nocturno', age: 57, suspect: true,
      bio: 'Veinte años custodiando el museo. Duerme poco y habla menos.',
      statement: 'Nadie entró después de las 22:00. Hice mis rondas como siempre.',
      look: { skin: 3, hair: 'calvo', hairColor: 7, facial: 'bigote', outfitStyle: 'uniforme', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Dónde estaba a las 23:40?', answer: 'En el vestíbulo. Escuché un ruido en la puerta de servicio y fui a revisar. No había nada.' },
        { id: 'q2', text: 'Hay una entrada a la Sala Itzamal a las 23:41. ¿Cómo no la vio?', answer: 'La Sala Itzamal se comunica con el laboratorio por una puerta interna. Desde el vestíbulo no se ve nada de eso.', requires: ['E1'], note: 'La Sala Itzamal se comunica con el laboratorio de conservación por una puerta interna.' },
        { id: 'q3', text: '¿Revisó las cámaras esa noche?', answer: 'La de la sala 3 se apagó a las 23:30. El sistema decía «mantenimiento remoto». Pensé que era cosa de Iván.' },
      ],
    },
    {
      id: 'ortega', name: 'Samuel Ortega', role: 'Coleccionista, invitado VIP', age: 61, suspect: true,
      bio: 'Coleccionista de arte precolombino. Intentó comprar la máscara hace dos años.',
      statement: 'La admiraba, sí. Quería comprarla, pero no estaba en venta.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'perilla', accessory: 'sombrero', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Cuándo salió del museo?', answer: 'Pasadas las diez y media. Pregúntele a la curadora, estuve hablando con ella.' },
        { id: 'q2', text: '¿Ofreció dinero por la máscara?', answer: 'Ofrecí una donación generosa a cambio de un préstamo. Todo legal, todo por escrito.' },
        { id: 'q3', text: 'Según recepción, usted salió a las 22:31. ¿Volvió después?', answer: 'No. Y los invitados no tenemos tarjetas: no podría haber abierto ni una puerta.', requires: ['E6'] },
      ],
    },
    {
      id: 'nora', name: 'Nora Bastidas', role: 'Curadora jefe', age: 49, suspect: true,
      bio: 'Organizó la exposición. Tiene acceso de nivel 3.',
      statement: 'Cerré la exposición y salí a las 22:40.',
      look: { skin: 2, hair: 'corto', hairColor: 1, accessory: 'aretes', outfitStyle: 'traje', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿Quién puede entrar a la Sala Itzamal fuera de horario?', answer: 'Solo personal con nivel 3: la directora, Valeria y yo. La directora está en Lisboa desde el lunes.', note: 'Solo tres personas tienen nivel 3; la directora está de viaje.' },
        { id: 'q2', text: '¿Valeria tenía problemas?', answer: 'Me pidió un adelanto de sueldo el mes pasado. Deudas, creo. No quiero pensar mal de ella.', note: 'Valeria tenía problemas de dinero.' },
        { id: 'q3', text: 'Su tarjeta registra la salida a las 22:40. ¿A dónde fue?', answer: 'Al último tranvía. Llegué a casa a las once y cuarto.', requires: ['E7'] },
      ],
    },
    {
      id: 'ivan', name: 'Iván Rey', role: 'Técnico de cámaras', age: 33, suspect: true,
      bio: 'Mantiene el sistema de videovigilancia. Es el único que suele desconectar cámaras.',
      statement: 'Reviso cámaras, no las apago por gusto.',
      look: { skin: 4, hair: 'rizado', hairColor: 0, accessory: 'gorra', outfitStyle: 'chaqueta', outfit: 3, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Desconectó la cámara de la sala 3?', answer: 'No. Esa noche ya me había ido. Desconecté la de la bodega a las 16:20 para limpiar el lente.' },
        { id: 'q2', text: '¿Quién más puede pedir una desconexión?', answer: 'Cualquier usuario de nivel 3 puede pedir «mantenimiento remoto» desde el sistema. Queda registrado con su usuario.', note: 'Las desconexiones quedan registradas con el usuario que las pide.' },
        { id: 'q3', text: 'Su tarjeta registra la salida a las 21:15. ¿Lo puede probar?', answer: 'Fui a cenar con mi hermana. Tengo la factura del restaurante, 21:40.', requires: ['E8'] },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Entrada nocturna a la Sala Itzamal', description: 'La tarjeta T-0457 entró a la Sala Itzamal (sala 3) a las 23:41, mucho después del cierre.', reference: "SELECT * FROM registros_acceso WHERE id_sala = 3 AND fecha_hora > '2025-03-14 22:00';", match: { any: [['T-0457', '23:41']], maxRows: 15 }, implicates: ['valeria'] },
    { id: 'E2', key: true, title: 'Titular de la tarjeta T-0457', description: 'La tarjeta T-0457 pertenece a Valeria Quintero, restauradora.', reference: "SELECT nombre, apellido, cargo FROM empleados WHERE tarjeta_acceso = 'T-0457';", match: { any: [['Quintero', 'T-0457'], ['Quintero', 'Restauradora']], maxRows: 3 }, implicates: ['valeria'] },
    { id: 'E3', key: true, title: 'La cámara ciega', description: 'A las 23:30 el usuario vquintero pidió desconectar la cámara 3 (Sala Itzamal); volvió a conectarse a las 23:50.', reference: "SELECT * FROM eventos_camara WHERE id_camara = 3 AND evento = 'desconexion';", match: { any: [['vquintero', '23:30']], maxRows: 10 }, implicates: ['valeria'] },
    { id: 'E4', key: true, title: 'Declaración contradictoria', description: 'Valeria declaró que salió a las 18:00 y no volvió, pero su tarjeta registra actividad después de las 23:30.', reference: "SELECT declarante, declaracion FROM testimonios WHERE declarante LIKE '%Quintero%';", match: { any: [['Quintero', '18:00']], maxRows: 3 }, implicates: ['valeria'] },
    { id: 'E5', title: 'Las rondas del guardia', description: 'La tarjeta de Héctor (T-0102) estaba en el vestíbulo a las 23:38 y entró a la Sala Itzamal recién a las 23:52, al descubrir el robo.', reference: "SELECT * FROM registros_acceso WHERE tarjeta = 'T-0102' AND fecha_hora > '2025-03-14 22:00' ORDER BY fecha_hora;", match: { any: [['T-0102', '23:38']], maxRows: 12 }, clears: ['hector'] },
    { id: 'E6', title: 'El coleccionista se fue temprano', description: 'Samuel Ortega salió por recepción a las 22:31 y, como invitado, no tenía tarjeta de acceso.', reference: "SELECT * FROM visitantes WHERE apellido = 'Ortega';", match: { any: [['Ortega', '22:31']], maxRows: 10 }, clears: ['ortega'] },
    { id: 'E7', title: 'Salida de la curadora', description: 'La tarjeta de Nora Bastidas (T-0219) registra su salida a las 22:40 y ninguna lectura posterior.', reference: "SELECT * FROM registros_acceso WHERE tarjeta = 'T-0219' ORDER BY fecha_hora DESC;", match: { any: [['T-0219', '22:40', 'salida']], maxRows: 10 }, clears: ['nora'] },
    { id: 'E8', title: 'El técnico ya no estaba', description: 'La tarjeta de Iván Rey (T-0330) registra su salida a las 21:15; la única cámara que desconectó fue la de la bodega, por la tarde.', reference: "SELECT * FROM registros_acceso WHERE tarjeta = 'T-0330' AND tipo = 'salida';", match: { any: [['T-0330', '21:15']], maxRows: 10 }, clears: ['ivan'] },
    { id: 'E9', title: 'Acceso de nivel 3', description: 'Solo tres empleados tienen nivel de acceso 3: la directora Ofelia Marín (de viaje), Nora Bastidas y Valeria Quintero.', reference: 'SELECT nombre, apellido, nivel_acceso FROM empleados WHERE nivel_acceso >= 3;', match: { all: [['Quintero'], ['Bastidas'], ['Marín']], maxRows: 4 }, implicates: ['valeria', 'nora'] },
    { id: 'E10', title: 'Las manos que conocían la máscara', description: 'La máscara fue manipulada por última vez el 7 de marzo por vquintero, durante su restauración.', reference: "SELECT nombre, ultima_manipulacion, manipulado_por FROM objetos WHERE nombre LIKE '%jade%';", match: { any: [['Itzamal', 'vquintero']], maxRows: 5 }, implicates: ['valeria'] },
    { id: 'E11', title: 'La salida por la bodega', description: 'La tarjeta T-0457 salió por la bodega (muelle de carga) a las 23:51.', reference: "SELECT * FROM registros_acceso WHERE tarjeta = 'T-0457' AND fecha_hora > '2025-03-14 23:00' ORDER BY fecha_hora;", match: { any: [['T-0457', '23:51']], maxRows: 12 }, implicates: ['valeria'] },
  ],
  objectives: [
    { id: 'O1', title: 'Reconstruir los accesos de la noche', description: '¿Quién estuvo dentro del museo después de las 22:00?', evidence: ['E1', 'E5', 'E7', 'E8', 'E11'], need: 3, tables: ['registros_acceso', 'salas'] },
    { id: 'O2', title: 'Identificar al titular de la tarjeta sospechosa', description: 'Un código de tarjeta no es una persona. Descubre a quién pertenece.', evidence: ['E2', 'E9'], need: 1, tables: ['empleados'] },
    { id: 'O3', title: 'Investigar el apagón de la cámara', description: 'La cámara que vigila la máscara dejó de grabar. ¿Por qué?', evidence: ['E3'], tables: ['camaras', 'eventos_camara'] },
    { id: 'O4', title: 'Contrastar declaraciones', description: 'Compara lo que dijeron los involucrados con los registros.', evidence: ['E4', 'E6'], need: 1, tables: ['testimonios', 'visitantes'] },
    { id: 'O5', title: 'La historia de la pieza', description: '¿Quién conocía cómo estaba montada la máscara?', evidence: ['E10'], tables: ['objetos'] },
  ],
  hints: [
    { id: 'H1', title: 'Accesos después del cierre', evidence: 'E1', levels: ['El guardia afirma que nadie entró después de las 22:00. El sistema de tarjetas podría contradecirlo.', 'Consulta registros_acceso y busca lecturas posteriores a las 22:00 del 14 de marzo en la sala 3.', "Las fechas con hora se comparan entre comillas: WHERE fecha_hora > '2025-03-14 22:00' AND id_sala = 3"] },
    { id: 'H2', title: 'Detrás de cada tarjeta', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Una tarjeta es solo un código; detrás hay una persona.', 'La tabla empleados tiene la columna tarjeta_acceso.', "WHERE tarjeta_acceso = 'código' devuelve al titular."] },
    { id: 'H3', title: 'Ojos que no ven', evidence: 'E3', levels: ['Si alguien entró a la sala de la máscara, la cámara debió verlo… ¿o no?', 'Revisa eventos_camara para la cámara 3. La columna solicitado_por indica quién originó cada evento.', "Combina condiciones con AND: WHERE id_camara = 3 AND evento = 'desconexion'"] },
    { id: 'H4', title: 'Palabra contra registro', evidence: 'E4', levels: ['Las declaraciones quedaron por escrito. ¿Coinciden con los datos?', 'Busca en testimonios lo que declaró cada empleado con acceso a la sala.', "LIKE '%texto%' busca dentro de una columna: WHERE declarante LIKE '%apellido%'"] },
    { id: 'H5', title: 'El coleccionista', evidence: 'E6', levels: ['Un coleccionista que deseaba la máscara se quedó hasta tarde. ¿Cuándo se fue?', 'visitantes guarda hora_entrada y hora_salida.', 'ORDER BY hora_salida DESC muestra primero a los últimos en salir.'] },
    { id: 'H6', title: 'La curadora', evidence: 'E7', levels: ['La curadora tiene nivel 3. ¿Su tarjeta dice lo mismo que ella?', 'Busca la tarjeta de Nora Bastidas en empleados y luego sus lecturas en registros_acceso.', 'ORDER BY fecha_hora DESC muestra primero la última lectura.'] },
    { id: 'H7', title: 'El técnico de cámaras', evidence: 'E8', levels: ['El técnico desconecta cámaras como parte de su trabajo… ¿pero esa noche?', 'Busca la tarjeta de Iván Rey y sus salidas.', "Puedes filtrar por varias condiciones: WHERE tarjeta = '…' AND tipo = 'salida'"] },
    { id: 'H8', title: 'Las rondas del guardia', evidence: 'E5', levels: ['El guardia dice que hizo rondas. Sus lecturas lo confirmarán o lo desmentirán.', 'Filtra registros_acceso por la tarjeta del guardia después de las 22:00.', 'Ordena por fecha_hora para reconstruir su recorrido.'] },
    { id: 'H9', title: 'Quién puede abrir la sala', evidence: 'E9', levels: ['La Sala Itzamal exige el nivel de seguridad más alto fuera de horario.', 'Compara salas.nivel_seguridad con empleados.nivel_acceso.', 'WHERE nivel_acceso >= 3'] },
    { id: 'H10', title: 'Conocer la pieza', evidence: 'E10', levels: ['Desmontar la máscara sin dañarla requiere conocerla muy bien.', 'objetos registra ultima_manipulacion y manipulado_por.', "WHERE nombre LIKE '%jade%'"] },
    { id: 'H11', title: 'Toda entrada tiene una salida', evidence: 'E11', requires: { evidence: ['E1'] }, levels: ['Si alguien entró a las 23:41, en algún momento tuvo que salir… ¿por dónde?', 'Sigue la misma tarjeta en registros_acceso después de las 23:00.', 'ORDER BY fecha_hora reconstruye el recorrido completo.'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'valeria',
    motive: 'Tenía deudas y un comprador privado le ofreció una fortuna por la máscara.',
    opportunity: 'Como restauradora con nivel 3, podía entrar al laboratorio, que conecta con la Sala Itzamal por una puerta interna.',
    method: 'Pidió con su usuario la desconexión remota de la cámara 3 (23:30), entró por el laboratorio (23:36), abrió la vitrina (23:41) y salió por el muelle de carga de la bodega (23:51).',
    justification: 'Su tarjeta T-0457 es la única que entra a la sala 3 entre el cierre y el descubrimiento del robo; su usuario desconectó la cámara; mintió sobre su hora de salida.',
    eliminations: {
      hector: { evidence: ['E5'], explanation: 'Sus lecturas lo ubican en el vestíbulo a las 23:38; entró a la sala 3 a las 23:52, cuando el robo ya había ocurrido. Mintió por descuido: no vio la entrada interna.' },
      ortega: { evidence: ['E6'], explanation: 'Salió a las 22:31 y, como invitado, no tenía tarjeta para abrir ninguna puerta.' },
      nora: { evidence: ['E7'], explanation: 'Su tarjeta registra la salida a las 22:40 y ninguna lectura posterior.' },
      ivan: { evidence: ['E8'], explanation: 'Salió a las 21:15; la única desconexión que pidió fue la de la bodega, por la tarde.' },
    },
    incriminating: ['E1', 'E2', 'E3', 'E4', 'E11'],
    reveal: [
      'Valeria Quintero tenía deudas que no podía pagar. Un comprador anónimo le ofreció 200.000 dólares por la máscara que ella misma había restaurado.',
      'A las 23:30 pidió una «desconexión por mantenimiento» de la cámara 3. Entró por el laboratorio, abrió la vitrina con las herramientas de restauración y salió por el muelle de carga.',
      'La máscara fue recuperada en un depósito del puerto, embalada como «material de restauración».',
    ],
  },
  references: [
    { title: 'Salas del museo', sql: 'SELECT * FROM salas;' },
    { title: 'Salas de máxima seguridad', sql: 'SELECT nombre, piso FROM salas WHERE nivel_seguridad = 3;' },
    { title: 'Personal ordenado', sql: 'SELECT * FROM empleados ORDER BY apellido;' },
    { title: 'Turno de noche', sql: "SELECT nombre, apellido, cargo FROM empleados WHERE turno = 'noche';" },
    { title: 'Invitados VIP', sql: "SELECT * FROM visitantes WHERE tipo_invitacion = 'VIP';" },
    { title: 'Últimos en salir', sql: "SELECT nombre, apellido, hora_salida FROM visitantes WHERE hora_salida > '22:00' ORDER BY hora_salida;" },
    { title: 'Tipos de invitación', sql: 'SELECT DISTINCT tipo_invitacion FROM visitantes;' },
    { title: 'Cámaras', sql: 'SELECT * FROM camaras;' },
    { title: 'Todas las desconexiones', sql: "SELECT * FROM eventos_camara WHERE evento IN ('desconexion', 'reconexion');" },
    { title: 'Piezas no exhibidas', sql: "SELECT * FROM objetos WHERE estado <> 'exhibido';" },
    { title: 'Piezas más valiosas', sql: 'SELECT nombre, valor_estimado FROM objetos ORDER BY valor_estimado DESC;' },
    { title: 'Declaraciones', sql: 'SELECT * FROM testimonios;' },
    { title: 'Sala 3 durante la exposición', sql: "SELECT * FROM registros_acceso WHERE id_sala = 3 AND fecha_hora BETWEEN '2025-03-14 19:00' AND '2025-03-14 21:59';" },
    { title: 'Invitados con apellido que empieza por O', sql: "SELECT * FROM visitantes WHERE apellido LIKE 'O%';" },
    { title: 'Eventos después de las 23:00', sql: "SELECT * FROM eventos_camara WHERE fecha_hora > '2025-03-14 23:00';" },
  ],
};
