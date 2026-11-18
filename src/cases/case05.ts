import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts, hm } from './helpers';

// CASO 5 — El sabotaje informático
// Culpable: Simón Echeverri (monitor del laboratorio B, usuario secheverri).
// Reservó el equipo LB-17 de 19:00 a 22:00, usó su cuenta (19:05–20:38), luego forzó la contraseña de
// «soporte2» desde 10.20.4.17 (7 intentos fallidos, éxito a las 21:03) y subió cuatro notas finales.

const R = rng(505);
const D = '2025-10-15';
const EXCL = ['Echeverri', 'Fonseca', 'Saavedra', 'Arboleda', 'Cardozo'];
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const stuNames = namePool(R, 44, EXCL);
const estRows: Cell[][] = [[20251077, 'Kevin', 'Arboleda', 'Ingeniería de Sistemas', 6]];
const stuUsers: string[] = ['karboleda'];
stuNames.forEach((n, i) => {
  estRows.push([20250000 + 100 + i * 7, n.nombre, n.apellido, R.pick(['Ingeniería de Sistemas', 'Ingeniería Industrial', 'Estadística']), R.int(3, 9)]);
  stuUsers.push(strip(n.nombre[0] + n.apellido) + (i % 3));
});
const estudiantes = table('estudiantes', 'Estudiantes matriculados.', [
  'codigo:integer:pk|Código estudiantil',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'programa:text|Programa académico',
  'semestre:integer|Semestre',
], estRows);

const docentes: [string, string][] = [['rsaavedra', 'Rodrigo Saavedra'], ['mlinares', 'Mónica Linares'], ['jpabon', 'Jaime Pabón'], ['clozada', 'Clara Lozada'], ['ftobar', 'Fernando Tobar']];
const usuariosRows: Cell[][] = [
  ['soporte1', 'Cuenta de soporte técnico 1', 'soporte', true],
  ['soporte2', 'Cuenta de soporte técnico 2 (Nadia Fonseca)', 'soporte', true],
  ['nfonseca', 'Nadia Fonseca', 'soporte', true],
  ['secheverri', 'Simón Echeverri', 'monitor', true],
  ['avalderrama', 'Andrea Valderrama', 'monitor', true],
  ...docentes.map(([u, n]) => [u, n, 'docente', true] as Cell[]),
  ...estRows.map((r, i) => [stuUsers[i], `${r[1]} ${r[2]}`, 'estudiante', true] as Cell[]),
  ['soporte_old', 'Cuenta de soporte antigua', 'soporte', false],
];
const usuarios = table('usuarios', 'Cuentas del sistema académico SIGA.', [
  'usuario:text:pk|Nombre de usuario',
  'nombre_completo:text|Titular',
  'rol:text|estudiante, docente, monitor o soporte',
  'activo:boolean|¿La cuenta está activa?',
], usuariosRows);

const ipRows: Cell[][] = [
  ['10.20.1.5', 'Oficina de Tecnología', 'interna'],
  ['10.20.1.6', 'Oficina de Tecnología', 'interna'],
  ['10.20.2.10', 'Sala de profesores', 'interna'],
  ['10.20.2.11', 'Sala de profesores', 'interna'],
  ['10.30.0.1', 'Wi-Fi biblioteca', 'interna'],
  ['200.14.8.90', 'VPN institucional', 'vpn'],
  ['181.52.77.4', 'Conexión residencial', 'externa'],
  ['186.29.140.12', 'Conexión residencial', 'externa'],
  ['190.85.3.201', 'Conexión móvil', 'externa'],
];
for (let i = 1; i <= 20; i++) ipRows.push([`10.20.3.${i}`, 'Laboratorio A', 'interna']);
for (let i = 1; i <= 20; i++) ipRows.push([`10.20.4.${i}`, 'Laboratorio B', 'interna']);
const direcciones = table('direcciones_ip', 'Direcciones IP conocidas por la red universitaria.', [
  'ip:text:pk|Dirección IP',
  'ubicacion:text|Ubicación física o tipo de conexión',
  'tipo:text|interna, vpn o externa',
], ipRows);

const eqRows: Cell[][] = [];
for (let i = 1; i <= 20; i++) eqRows.push([`LA-${String(i).padStart(2, '0')}`, 'Laboratorio A', `10.20.3.${i}`]);
for (let i = 1; i <= 20; i++) eqRows.push([`LB-${String(i).padStart(2, '0')}`, 'Laboratorio B', `10.20.4.${i}`]);
const equipos = table('equipos', 'Computadores de los laboratorios.', [
  'id_equipo:text:pk|Código del equipo',
  'sala:text|Laboratorio',
  'ip:text:fk=direcciones_ip.ip|IP fija del equipo',
], eqRows);

// Sesiones del SIGA
const ses: [string, string, number, string][] = [];
for (let i = 0; i < 60; i++) {
  const u = R.pick(stuUsers.slice(1));
  const ip = R.chance(0.5) ? `10.20.3.${R.int(1, 20)}` : R.chance(0.5) ? `10.20.4.${R.int(1, 16)}` : R.pick(['10.30.0.1', '186.29.140.12', '190.85.3.201']);
  const m = ip.startsWith('10.20.4') ? R.int(840, 1020) : R.int(480, 1290);
  ses.push([u, ip, m, 'exitoso'], [u, ip, m + R.int(5, 60), 'cierre']);
}
for (const [u] of docentes) {
  const m = R.int(500, 900);
  ses.push([u, R.pick(['10.20.2.10', '10.20.2.11']), m, 'exitoso'], [u, '10.20.2.10', m + 40, 'cierre']);
}
ses.push(['soporte2', '10.20.1.5', 560, 'exitoso'], ['soporte2', '10.20.1.5', 600, 'cierre'], ['soporte2', '10.20.1.5', 985, 'exitoso'], ['soporte2', '10.20.1.5', 1000, 'cierre']);
ses.push(['nfonseca', '10.20.1.6', 500, 'exitoso'], ['nfonseca', '10.20.1.6', 1050, 'cierre']);
ses.push(['secheverri', '10.20.4.17', 1145, 'exitoso'], ['secheverri', '10.20.4.17', 1238, 'cierre']);
for (const m of [1241, 1243, 1246, 1249, 1252, 1255, 1258]) ses.push(['soporte2', '10.20.4.17', m, 'fallido']);
ses.push(['soporte2', '10.20.4.17', 1263, 'exitoso'], ['soporte2', '10.20.4.17', 1280, 'cierre']);
ses.push(['karboleda', '181.52.77.4', 1290, 'exitoso'], ['karboleda', '181.52.77.4', 1296, 'cierre']);
ses.push(['rsaavedra', '200.14.8.90', 1335, 'exitoso'], ['rsaavedra', '200.14.8.90', 1350, 'cierre']);
ses.push([stuUsers[7], '10.20.3.4', 700, 'fallido'], [stuUsers[7], '10.20.3.4', 701, 'exitoso'], [stuUsers[19], '10.30.0.1', 830, 'fallido']);
ses.sort((a, b) => a[2] - b[2]);
const sesiones = table('sesiones', 'Inicios de sesión en el SIGA (15 de octubre de 2025).', [
  'id_sesion:integer:pk|Identificador',
  'usuario:text|Usuario que intenta ingresar',
  'ip:text|IP de origen',
  'fecha_hora:timestamp|Momento',
  'resultado:text|exitoso, fallido o cierre',
], ses.map(([u, ip, m, r], i) => [10000 + i, u, ip, ts(D, m), r]));

// Cambios de notas
const cursos = ['Bases de Datos II', 'Cálculo III', 'Estadística I', 'Redes', 'Programación Web'];
const cambios: Cell[][] = [];
for (let i = 0; i < 22; i++) {
  const doc = R.pick(docentes);
  const day = R.pick(['2025-10-13', '2025-10-14', '2025-10-15']);
  const ant = R.int(20, 48) / 10;
  cambios.push([doc[0], R.pick(['10.20.2.10', '10.20.2.11']), ts(day, R.int(500, 1000)), R.pick(estRows.slice(1))[0], R.pick(cursos), ant, Math.min(5, Math.round((ant + R.int(1, 4) / 10) * 10) / 10)]);
}
const favored = [estRows[0][0], estRows[3][0], estRows[11][0], estRows[26][0]];
const nightTimes = [1265, 1268, 1272, 1278];
const prevGrades = [2.1, 1.8, 2.6, 2.4];
const newGrades = [3.6, 3.4, 3.8, 3.5];
favored.forEach((code, i) => cambios.push(['soporte2', '10.20.4.17', ts(D, nightTimes[i]), code, 'Bases de Datos II', prevGrades[i], newGrades[i]]));
cambios.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const cambiosNotas = table('cambios_notas', 'Auditoría de modificaciones de notas en el SIGA.', [
  'id_cambio:integer:pk|Identificador',
  'usuario_sistema:text|Cuenta con la que se hizo el cambio',
  'ip:text|IP de origen',
  'fecha_hora:timestamp|Momento',
  'codigo_estudiante:integer:fk=estudiantes.codigo|Estudiante afectado',
  'curso:text|Curso',
  'nota_anterior:numeric|Nota antes del cambio',
  'nota_nueva:numeric|Nota después del cambio',
], cambios.map((c, i) => [700 + i, ...c]));

const reservasRows: Cell[][] = [];
let rsv = 1;
for (let i = 0; i < 20; i++) {
  const lab = R.chance(0.5) ? 'LA' : 'LB';
  const n = R.int(1, 20);
  if (lab === 'LB' && n === 17) continue;
  const st = R.int(8, 17);
  reservasRows.push([rsv++, R.pick(stuUsers.slice(1)), `${lab}-${String(n).padStart(2, '0')}`, D, hm(st * 60), hm(Math.min(19, st + 2) * 60)]);
}
reservasRows.push([rsv++, 'secheverri', 'LB-17', D, '19:00', '22:00']);
reservasRows.push([rsv++, 'avalderrama', 'LA-03', D, '18:00', '20:00']);
reservasRows.push([rsv++, stuUsers[5], 'LB-17', D, '10:00', '12:00']);
const reservas = table('reservas_laboratorio', 'Reservas de equipos para trabajo fuera de clase.', [
  'id_reserva:integer:pk|Identificador',
  'usuario:text|Usuario que reserva',
  'id_equipo:text:fk=equipos.id_equipo|Equipo reservado',
  'fecha:date|Fecha',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin',
], reservasRows);

const acc: [string, string, number][] = [];
for (let i = 0; i < 26; i++) acc.push([R.pick(stuUsers.slice(1)), 'Laboratorio B', R.int(835, 860)]);
for (let i = 0; i < 18; i++) acc.push([R.pick(stuUsers.slice(1)), 'Laboratorio A', R.int(470, 1100)]);
acc.push(['secheverri', 'Laboratorio B', 1142], ['wcardozo', 'Laboratorio B', 1330], ['wcardozo', 'Laboratorio A', 1325]);
acc.push(['nfonseca', 'Portería principal (salida)', 1055], ['nfonseca', 'Portería principal (entrada)', 490]);
acc.push(['rsaavedra', 'Aula 305', 1195], ['rsaavedra', 'Portería principal (salida)', 1330]);
acc.push(['avalderrama', 'Laboratorio A', 1078], ['secheverri', 'Portería principal (salida)', 1325]);
acc.sort((a, b) => a[2] - b[2]);
const accesos = table('accesos_sala', 'Lecturas del carné universitario en puertas (15 de octubre). wcardozo es el conserje.', [
  'id_acceso:integer:pk|Identificador',
  'carne:text|Usuario asociado al carné',
  'sala:text|Puerta',
  'fecha_hora:timestamp|Momento',
], acc.map(([u, s, m], i) => [3000 + i, u, s, ts(D, m)]));

const horarios = table('horarios_clase', 'Horario de clases de los miércoles.', [
  'id_horario:integer:pk|Identificador',
  'docente:text|Usuario del docente',
  'curso:text|Curso',
  'aula:text|Aula',
  'hora_inicio:time|Inicio',
  'hora_fin:time|Fin',
], [
  [1, 'rsaavedra', 'Bases de Datos II (nocturno)', '305', '20:00', '22:00'],
  [2, 'rsaavedra', 'Bases de Datos II', 'Laboratorio B', '14:00', '17:00'],
  [3, 'mlinares', 'Cálculo III', '201', '08:00', '10:00'],
  [4, 'jpabon', 'Redes', 'Laboratorio A', '10:00', '12:00'],
  [5, 'clozada', 'Estadística I', '108', '14:00', '16:00'],
  [6, 'ftobar', 'Programación Web', 'Laboratorio A', '16:00', '18:00'],
  [7, 'mlinares', 'Cálculo III (nocturno)', '202', '18:30', '20:30'],
]);

export const case05: CaseDef = {
  id: 5,
  code: 'EXP-05',
  title: 'El sabotaje informático',
  level: 1,
  tagline: 'Cuatro notas reprobadas se convirtieron en aprobadas en trece minutos.',
  location: 'Universidad Técnica de Bruma — Sistema Académico SIGA',
  date: '15 de octubre de 2025, noche',
  scene: 'servidor',
  briefing: [
    'El jueves por la mañana, el profesor Saavedra notó que cuatro estudiantes de Bases de Datos II tenían el examen final aprobado. Él los había reprobado.',
    'La auditoría del SIGA muestra que los cambios se hicieron con la cuenta de soporte técnico «soporte2», cuya titular es Nadia Fonseca.',
    'El sistema guarda cada intento de inicio de sesión con su IP. La red universitaria sabe a qué equipo corresponde cada IP interna.',
  ],
  timeline: [
    { time: '19:00', event: 'Termina la última clase en el Laboratorio B.' },
    { time: '22:10', event: 'El conserje cierra los laboratorios.' },
    { time: '16 oct 08:30', event: 'El profesor detecta las notas alteradas.' },
  ],
  concepts: ['WHERE', 'LIKE con patrones de IP', 'AND / OR', 'IN', 'BETWEEN', 'DISTINCT', 'ORDER BY'],
  tables: [usuarios, direcciones, equipos, sesiones, estudiantes, cambiosNotas, reservas, accesos, horarios],
  characters: [
    {
      id: 'simon', name: 'Simón Echeverri', role: 'Monitor del Laboratorio B', age: 22, suspect: true,
      bio: 'Estudiante de último semestre, brillante con las redes. Ayuda a sus compañeros… a veces demasiado.',
      statement: 'Esa noche estuve programando mi proyecto de grado en el laboratorio. No toqué el SIGA.',
      look: { skin: 2, hair: 'rizado', hairColor: 0, accessory: 'auriculares', outfitStyle: 'sueter', outfit: 6, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Qué hizo en el laboratorio esa noche?', answer: 'Trabajé en mi proyecto de grado. Reservé un equipo de siete a diez, como siempre.' },
        { id: 'q2', text: '¿Conoce las cuentas de soporte?', answer: 'Sé que existen. Todo el mundo sabe que soporte usa contraseñas por defecto… digo, eso se rumora.' },
        { id: 'q3', text: 'Siete intentos fallidos con «soporte2» salieron del equipo LB-17, el que usted reservó.', answer: 'Me levanté a comprar un café. Cualquiera pudo sentarse en mi equipo.', requires: ['E3', 'E4'], contradiction: true, note: 'Simón dice que dejó el equipo solo para ir por café.' },
        { id: 'q4', text: 'Nadie más entró al Laboratorio B después de las 19:00, salvo el conserje a las 22:10.', answer: '…Mis amigos iban a perder la beca. Solo quería ayudarlos.', requires: ['E5'], contradiction: true },
      ],
    },
    {
      id: 'nadia', name: 'Nadia Fonseca', role: 'Técnica de soporte (titular de «soporte2»)', age: 34, suspect: true,
      bio: 'Administra cuentas del SIGA. Su cuenta firmó los cambios.',
      statement: 'Yo me fui a las cinco y media. Alguien usó mi cuenta de soporte.',
      look: { skin: 1, hair: 'corto', hairColor: 5, accessory: 'gafas', outfitStyle: 'camisa', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Cuándo usó por última vez la cuenta soporte2?', answer: 'A las 16:25, desde la oficina de Tecnología. Para resetear contraseñas de estudiantes.' },
        { id: 'q2', text: '¿Su contraseña era segura?', answer: 'Era… la contraseña inicial del sistema. Iba a cambiarla. Lo sé, lo sé.', note: 'La cuenta soporte2 tenía una contraseña débil.' },
      ],
    },
    {
      id: 'saavedra', name: 'Rodrigo Saavedra', role: 'Profesor de Bases de Datos II', age: 50, suspect: true,
      bio: 'Estricto con las notas. Puede modificarlas con su propia cuenta.',
      statement: 'Yo reprobé a esos cuatro. ¿Por qué iba a aprobarlos a escondidas?',
      look: { skin: 3, hair: 'corto', hairColor: 6, facial: 'bigote', accessory: 'gafas', outfitStyle: 'traje', outfit: 4 },
      questions: [
        { id: 'q1', text: '¿Dónde estaba entre las 20:00 y las 22:00?', answer: 'Dictando el grupo nocturno en el aula 305. Treinta estudiantes me vieron.' },
        { id: 'q2', text: '¿Quién sabía qué estudiantes reprobaron?', answer: 'Mis monitores. Simón me ayudó a digitar las notas del examen.', note: 'Simón ayudó a digitar las notas del examen.' },
      ],
    },
    {
      id: 'kevin', name: 'Kevin Arboleda', role: 'Estudiante beneficiado', age: 20, suspect: true,
      bio: 'Uno de los cuatro estudiantes cuya nota subió. Perdía la beca si reprobaba.',
      statement: 'Yo solo revisé mi nota por la noche. Me sorprendió que hubiera aprobado.',
      look: { skin: 4, hair: 'mohicano', hairColor: 3, outfitStyle: 'chaqueta', outfit: 1, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Dónde estaba esa noche?', answer: 'En mi casa. Entré al SIGA a las nueve y media para ver la nota.' },
        { id: 'q2', text: '¿Le pidió a alguien que cambiara su nota?', answer: 'No… pero Simón dijo en el chat del grupo que «todo se podía arreglar». Pensé que era broma.' },
      ],
    },
    {
      id: 'wilmer', name: 'Wilmer Cardozo', role: 'Conserje', age: 58, suspect: true,
      bio: 'Tiene las llaves de todos los laboratorios. No tiene cuenta en el SIGA.',
      statement: 'Cerré los laboratorios a las diez y diez, como cada noche.',
      look: { skin: 5, hair: 'canoso', hairColor: 7, outfitStyle: 'uniforme', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Vio a alguien en el Laboratorio B?', answer: 'Al monitor, Simón. Estaba solo, con la pantalla llena de ventanas negras con letras verdes.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Notas modificadas de noche', description: 'Entre las 21:05 y las 21:18, la cuenta soporte2 subió cuatro notas de Bases de Datos II desde la IP 10.20.4.17.', reference: "SELECT * FROM cambios_notas WHERE fecha_hora > '2025-10-15 20:00';", match: { any: [['soporte2', '10.20.4.17']], maxRows: 8 }, implicates: ['nadia'] },
    { id: 'E2', key: true, title: 'La IP tiene dirección', description: 'La IP 10.20.4.17 corresponde al equipo LB-17 del Laboratorio B.', reference: "SELECT * FROM equipos WHERE ip = '10.20.4.17';", match: { any: [['LB-17', '10.20.4.17']], maxRows: 3 } },
    { id: 'E3', key: true, title: 'Fuerza bruta', description: 'Desde 10.20.4.17 hubo siete intentos fallidos con «soporte2» entre las 20:41 y las 20:58, y un acceso exitoso a las 21:03.', reference: "SELECT * FROM sesiones WHERE usuario = 'soporte2' AND resultado = 'fallido';", match: { any: [['soporte2', 'fallido', '10.20.4.17']], minRows: 3, maxRows: 15 }, implicates: ['simon'] },
    { id: 'E4', key: true, title: 'La reserva del LB-17', description: 'El usuario secheverri reservó el equipo LB-17 de 19:00 a 22:00.', reference: "SELECT * FROM reservas_laboratorio WHERE id_equipo = 'LB-17';", match: { any: [['LB-17', 'secheverri', '19:00']], maxRows: 6 }, implicates: ['simon'] },
    { id: 'E5', key: true, title: 'Solo en el laboratorio', description: 'Después de las 19:00, solo dos carnés abrieron el Laboratorio B: secheverri (19:02) y el conserje (22:10).', reference: "SELECT * FROM accesos_sala WHERE sala = 'Laboratorio B' AND fecha_hora > '2025-10-15 19:00';", match: { all: [['secheverri', '19:02'], ['wcardozo', '22:10']], maxRows: 5 }, implicates: ['simon'], clears: ['wilmer'] },
    { id: 'E6', title: 'La técnica ya se había ido', description: 'El carné de Nadia Fonseca registra su salida por portería a las 17:35.', reference: "SELECT * FROM accesos_sala WHERE carne = 'nfonseca';", match: { any: [['nfonseca', '17:35']], maxRows: 10 }, clears: ['nadia'] },
    { id: 'E7', title: 'El profesor dictaba clase', description: 'Rodrigo Saavedra dictaba Bases de Datos II (nocturno) en el aula 305 de 20:00 a 22:00; su carné entró al aula a las 19:55.', reference: "SELECT * FROM horarios_clase WHERE docente = 'rsaavedra';", match: { any: [['rsaavedra', '305', '20:00']], maxRows: 8 }, clears: ['saavedra'] },
    { id: 'E8', title: 'Conexión desde casa', description: 'Kevin Arboleda solo inició sesión a las 21:30 desde una conexión residencial (181.52.77.4), después de los cambios.', reference: "SELECT * FROM sesiones WHERE usuario = 'karboleda';", match: { any: [['karboleda', '181.52.77.4']], maxRows: 10 }, clears: ['kevin'] },
    { id: 'E9', title: 'La ronda del conserje', description: 'El carné del conserje (wcardozo) solo registra la ronda de cierre: Laboratorio A a las 22:05 y Laboratorio B a las 22:10, después de los cambios. Además, no tiene cuenta en el SIGA.', reference: "SELECT * FROM accesos_sala WHERE carne = 'wcardozo';", match: { all: [['wcardozo', '22:05'], ['wcardozo', '22:10']], maxRows: 4 }, clears: ['wilmer'] },
    { id: 'E10', key: true, title: 'Calentando motores', description: 'La cuenta secheverri inició sesión en 10.20.4.17 a las 19:05 y cerró a las 20:38, tres minutos antes del primer intento fallido.', reference: "SELECT * FROM sesiones WHERE ip = '10.20.4.17' ORDER BY fecha_hora;", match: { any: [['secheverri', '10.20.4.17']], maxRows: 14 }, implicates: ['simon'] },
  ],
  objectives: [
    { id: 'O1', title: 'Identificar los cambios', description: '¿Qué notas cambiaron, con qué cuenta y desde dónde?', evidence: ['E1'], tables: ['cambios_notas', 'estudiantes'] },
    { id: 'O2', title: 'Ubicar el origen', description: 'Una IP interna corresponde a un equipo físico.', evidence: ['E2', 'E3'], need: 1, tables: ['direcciones_ip', 'equipos', 'sesiones'] },
    { id: 'O3', title: 'Quién usaba el equipo', description: 'Reservas, sesiones y accesos al laboratorio.', evidence: ['E4', 'E5', 'E10'], need: 2, tables: ['reservas_laboratorio', 'accesos_sala', 'sesiones'] },
    { id: 'O4', title: 'Verificar coartadas', description: 'La titular de la cuenta, el profesor, el estudiante beneficiado y el conserje.', evidence: ['E6', 'E7', 'E8', 'E9'], need: 2, tables: ['accesos_sala', 'horarios_clase', 'sesiones'] },
  ],
  hints: [
    { id: 'H1', title: 'La auditoría', evidence: 'E1', levels: ['Cada cambio de nota deja rastro: cuenta, IP y hora.', 'Revisa cambios_notas la noche del 15 de octubre.', "WHERE fecha_hora > '2025-10-15 20:00'"] },
    { id: 'H2', title: 'Seguir la IP', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Una IP interna no es anónima.', 'equipos y direcciones_ip relacionan cada IP con un lugar.', "WHERE ip = '10.20.4.17' (o usa LIKE '10.20.4.%' para todo el Laboratorio B)"] },
    { id: 'H3', title: 'Adivinar contraseñas', evidence: 'E3', levels: ['Quien no conoce una contraseña suele fallar antes de acertar.', 'sesiones registra los intentos fallidos con su IP.', "WHERE usuario = 'soporte2' AND resultado = 'fallido'"] },
    { id: 'H4', title: 'Equipo reservado', evidence: 'E4', requires: { evidence: ['E2'] }, levels: ['Los equipos del laboratorio se reservan por usuario.', 'Consulta reservas_laboratorio del equipo implicado.', "WHERE id_equipo = 'LB-17'"] },
    { id: 'H5', title: 'La puerta del laboratorio', evidence: 'E5', levels: ['Para sentarse en el LB-17 había que entrar al Laboratorio B.', 'accesos_sala registra el carné y la hora en cada puerta.', "WHERE sala = 'Laboratorio B' AND fecha_hora > '2025-10-15 19:00'"] },
    { id: 'H6', title: 'La dueña de la cuenta', evidence: 'E6', levels: ['¿Estaba la titular de soporte2 en la universidad?', 'Busca su carné en accesos_sala.', "WHERE carne = 'nfonseca'"] },
    { id: 'H7', title: 'El profesor', evidence: 'E7', levels: ['El profesor podía cambiar notas… si estaba frente a un computador.', 'horarios_clase indica dónde dictaba clase.', "WHERE docente = 'rsaavedra'"] },
    { id: 'H8', title: 'El beneficiado', evidence: 'E8', levels: ['Uno de los beneficiados dice que solo revisó su nota desde casa.', 'Busca sus sesiones en la tabla sesiones.', "WHERE usuario = 'karboleda'"] },
    { id: 'H9', title: 'Las llaves del conserje', evidence: 'E9', levels: ['El conserje tiene llaves de todo… ¿cuándo las usó?', 'Busca su carné (wcardozo) en accesos_sala. ¿Tiene cuenta en usuarios?', "WHERE carne = 'wcardozo'"] },
    { id: 'H10', title: 'Antes del ataque', evidence: 'E10', levels: ['¿Quién usaba el mismo equipo justo antes de los intentos fallidos?', 'Filtra sesiones por la IP del equipo y ordénalas.', "WHERE ip = '10.20.4.17' ORDER BY fecha_hora"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'simon',
    motive: 'Sus amigos perdían la beca; él ayudó a digitar las notas y sabía quiénes habían reprobado.',
    opportunity: 'Reservó el equipo LB-17 y se quedó solo en el Laboratorio B después de las 19:00.',
    method: 'Cerró su propia sesión a las 20:38, probó contraseñas por defecto en «soporte2» hasta acertar a las 21:03 y subió cuatro notas.',
    justification: 'Los intentos y los cambios salieron del LB-17, reservado por él; nadie más entró al laboratorio en ese horario.',
    eliminations: {
      nadia: { evidence: ['E6'], explanation: 'Salió de la universidad a las 17:35; su cuenta fue forzada desde el Laboratorio B.' },
      saavedra: { evidence: ['E7'], explanation: 'Dictaba clase en el aula 305 durante los cambios.' },
      kevin: { evidence: ['E8'], explanation: 'Solo se conectó a las 21:30 desde su casa.' },
      wilmer: { evidence: ['E5', 'E9'], explanation: 'Entró al laboratorio recién a las 22:10 y no tiene cuenta en el SIGA.' },
    },
    incriminating: ['E3', 'E4', 'E5', 'E10'],
    reveal: [
      'Simón Echeverri digitó las notas del examen y vio a sus amigos reprobados. Tres de ellos perderían la beca.',
      'Sabía que soporte2 tenía la contraseña inicial del sistema. Necesitó siete intentos.',
      'Los cuatro estudiantes presentaron un examen supletorio vigilado. Simón fue suspendido un semestre.',
    ],
  },
  references: [
    { title: 'Cuentas inactivas', sql: 'SELECT * FROM usuarios WHERE activo = false;' },
    { title: 'Monitores', sql: "SELECT * FROM usuarios WHERE rol = 'monitor';" },
    { title: 'Equipos del Laboratorio B', sql: "SELECT * FROM equipos WHERE ip LIKE '10.20.4.%';" },
    { title: 'Conexiones externas', sql: "SELECT * FROM direcciones_ip WHERE tipo IN ('externa', 'vpn');" },
    { title: 'Todos los intentos fallidos', sql: "SELECT * FROM sesiones WHERE resultado = 'fallido' ORDER BY fecha_hora;" },
    { title: 'Cambios de Bases de Datos II', sql: "SELECT * FROM cambios_notas WHERE curso = 'Bases de Datos II';" },
    { title: 'Cambios que aprobaron reprobados', sql: 'SELECT * FROM cambios_notas WHERE nota_anterior < 3.0 AND nota_nueva >= 3.0;' },
    { title: 'IPs que hicieron cambios', sql: 'SELECT DISTINCT ip FROM cambios_notas;' },
    { title: 'Estudiantes afectados', sql: 'SELECT * FROM estudiantes WHERE codigo IN (20251077, 20250114, 20250170, 20250275);' },
    { title: 'Reservas de la noche', sql: "SELECT * FROM reservas_laboratorio WHERE hora_inicio >= '18:00';" },
    { title: 'Clases nocturnas', sql: "SELECT * FROM horarios_clase WHERE curso LIKE '%nocturno%';" },
    { title: 'Accesos del monitor', sql: "SELECT * FROM accesos_sala WHERE carne = 'secheverri';" },
  ],
};
