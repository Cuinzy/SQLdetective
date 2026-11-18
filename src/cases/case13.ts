import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 13 — El proyecto clandestino
// Culpable: Damián Saldarriaga (QA del equipo Plataforma, usuario dsaldarriaga). NO está asignado a ÓRBITA.
// El 10 de septiembre (22:10–22:31) descargó 6 documentos de ÓRBITA, conectó una memoria USB de 64 GB a las 22:35
// y a la mañana siguiente escribió al dominio de la competidora kuiper-tech.io.

const R = rng(1313);
const EXCL = ['Saldarriaga', 'Ferrín', 'Cristancho', 'Lozano', 'Becerra'];
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const fill = namePool(R, 24, EXCL);
const empRows: Cell[][] = [
  [1, 'Yolanda', 'Ferrín', 'Satélites', 'Líder de proyecto', 'yferrin'],
  [2, 'Damián', 'Saldarriaga', 'Plataforma', 'Ingeniero de QA', 'dsaldarriaga'],
  [3, 'Abel', 'Cristancho', 'Infraestructura', 'Administrador de sistemas', 'acristancho'],
  [4, 'Bárbara', 'Lozano', 'Satélites', 'Becaria de ingeniería', 'blozano'],
  [5, 'Raúl', 'Becerra', 'Satélites', 'Ingeniero (retirado en agosto)', 'rbecerra'],
];
const equipos = ['Satélites', 'Plataforma', 'Infraestructura', 'Comercial', 'Datos'];
fill.forEach((n, i) => empRows.push([10 + i, n.nombre, n.apellido, equipos[i % 5], R.pick(['Ingeniera', 'Ingeniero', 'Analista', 'Diseñadora', 'Desarrollador']), strip(n.nombre[0] + n.apellido) + (i % 2)]));
const empleados = table('empleados', 'Empleados de Nébula Labs.', [
  'id_empleado:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'equipo:text|Equipo',
  'cargo:text|Cargo',
  'usuario:text|Usuario corporativo',
], empRows);
const users = empRows.map((e) => e[5] as string);

const proyectos = table('proyectos', 'Proyectos de I+D.', [
  'id_proyecto:integer:pk|Identificador',
  'codigo:text|Código',
  'nombre:text|Nombre',
  'confidencialidad:text|alta, media o baja',
], [
  [1, 'ORB', 'ÓRBITA — chip de comunicación satelital', 'alta'],
  [2, 'PLT', 'Plataforma de pruebas automatizadas', 'media'],
  [3, 'INF', 'Migración de servidores', 'media'],
  [4, 'CRM', 'Portal de clientes', 'baja'],
  [5, 'DAT', 'Lago de datos', 'media'],
]);

const asg: Cell[][] = [];
let aid = 1;
asg.push([aid++, 1, 1, 'líder', '2024-03-01'], [aid++, 4, 1, 'becaria', '2025-09-01'], [aid++, 5, 1, 'ingeniero', '2024-03-01']);
asg.push([aid++, 2, 2, 'QA', '2023-11-15'], [aid++, 3, 3, 'administrador', '2022-05-01']);
for (const e of empRows.slice(5)) {
  const proj = { Satélites: 1, Plataforma: 2, Infraestructura: 3, Comercial: 4, Datos: 5 }[e[3] as string]!;
  asg.push([aid++, e[0], proj, 'miembro', `202${R.int(2, 5)}-0${R.int(1, 8)}-01`]);
  if (R.chance(0.25)) asg.push([aid++, e[0], R.pick([2, 3, 4, 5].filter((p) => p !== proj)), 'apoyo', '2025-01-15']);
}
const asignaciones = table('asignaciones', 'Asignación de empleados a proyectos (quién puede trabajar en qué).', [
  'id_asignacion:integer:pk|Identificador',
  'id_empleado:integer:fk=empleados.id_empleado|Empleado',
  'id_proyecto:integer:fk=proyectos.id_proyecto|Proyecto',
  'rol:text|Rol en el proyecto',
  'desde:date|Fecha de inicio',
], asg);
const assigned = (uid: number, p: number) => asg.some((a) => a[1] === uid && a[2] === p);

const docRows: Cell[][] = [];
let did = 1;
const orbTitles = ['Arquitectura del chip', 'Esquemático de radiofrecuencia', 'Firmware de enlace', 'Resultados de pruebas térmicas', 'Hoja de ruta 2026', 'Contrato con agencia espacial', 'Especificación de antena', 'Plan de certificación', 'Costos de fabricación', 'Patente provisional', 'Simulaciones de órbita', 'Lista de proveedores'];
for (const t of orbTitles) docRows.push([did++, 1, t, R.pick(['secreto', 'confidencial'])]);
for (let p = 2; p <= 5; p++) for (let k = 0; k < 9; k++) docRows.push([did++, p, `${['Manual', 'Informe', 'Diseño', 'Acta', 'Plan'][k % 5]} ${p}-${k + 1}`, R.pick(['interno', 'confidencial'])]);
const documentos = table('documentos', 'Documentos del repositorio corporativo.', [
  'id_documento:integer:pk|Identificador',
  'id_proyecto:integer:fk=proyectos.id_proyecto|Proyecto',
  'titulo:text|Título',
  'clasificacion:text|secreto, confidencial o interno',
], docRows);

const acc: Cell[][] = [];
const days: string[] = [];
for (let d = 1; d <= 12; d++) days.push(`2025-09-${String(d).padStart(2, '0')}`);
for (let i = 0; i < 360; i++) {
  const e = R.pick(empRows.filter((x) => x[0] !== 5 && x[0] !== 3));
  const uid = e[0] as number;
  const projs = [1, 2, 3, 4, 5].filter((p) => assigned(uid, p));
  if (!projs.length) continue;
  const p = R.pick(projs);
  const docsP = docRows.filter((d) => d[1] === p);
  const d = R.pick(days);
  if (uid === 4 && d < '2025-09-01') continue;
  acc.push([R.pick(docsP)[0], e[5], ts(d, R.int(480, 1110)), R.chance(0.8) ? 'lectura' : 'descarga']);
}
// respaldos automáticos del administrador (todos los proyectos, 02:00)
for (const d of ['2025-09-07', '2025-09-12']) for (const doc of docRows.filter((_, k) => k % 6 === 0)) acc.push([doc[0], 'acristancho', ts(d, 120 + (doc[0] as number) % 30), 'respaldo']);
// Becerra antes de retirarse
for (let k = 0; k < 8; k++) acc.push([R.int(1, 12), 'rbecerra', ts(`2025-08-${String(4 + k).padStart(2, '0')}`, R.int(500, 1000)), 'lectura']);
acc.push([7, 'rbecerra', '2025-08-14 16:40:00', 'descarga']);
// Bárbara (asignada desde el 1 de septiembre) trabaja de noche desde casa
for (const [doc, m] of [[2, 1260], [4, 1265], [8, 1272], [11, 1290]] as [number, number][]) acc.push([doc, 'blozano', ts('2025-09-10', m), 'descarga']);
// Damián
for (const [doc, m] of [[1, 1330], [2, 1334], [3, 1338], [6, 1343], [9, 1347], [10, 1351]] as [number, number][]) acc.push([doc, 'dsaldarriaga', ts('2025-09-10', m), 'descarga']);
acc.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const accesos = table('accesos_documentos', 'Registro de accesos al repositorio (lectura, descarga o respaldo automático).', [
  'id_acceso:integer:pk|Identificador',
  'id_documento:integer:fk=documentos.id_documento|Documento',
  'usuario:text|Usuario corporativo',
  'fecha_hora:timestamp|Momento',
  'accion:text|lectura, descarga o respaldo',
], acc.map((a, i) => [i + 1, ...a]));

const usb: Cell[][] = [];
for (let i = 0; i < 18; i++) {
  const u = R.pick(users.filter((x) => !['dsaldarriaga', 'acristancho', 'rbecerra', 'blozano', 'yferrin'].includes(x)));
  usb.push([u, `PC-${R.int(100, 160)}`, ts(R.pick(days), R.int(500, 1080)), `SN-${R.int(1000, 9999)}`, R.pick([8, 16, 32])]);
}
usb.push(['dsaldarriaga', 'PC-117', ts('2025-09-10', 1355), 'SN-77Q1', 64]);
usb.push(['dsaldarriaga', 'PC-117', ts('2025-09-02', 610), 'SN-2210', 8]);
usb.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const dispositivos = table('dispositivos_usb', 'Conexiones de almacenamiento USB detectadas por el antivirus corporativo.', [
  'id_evento:integer:pk|Identificador',
  'usuario:text|Sesión activa',
  'equipo:text|Computador',
  'fecha_hora:timestamp|Momento de la conexión',
  'numero_serie:text|Serie del dispositivo',
  'capacidad_gb:integer|Capacidad (GB)',
], usb.map((u, i) => [i + 1, ...u]));

const autorizados = ['nebula-labs.com', 'esa-partner.eu', 'proveedor-silicio.com', 'banco-bruma.com', 'aseguradora-faro.com', 'universidad-bruma.edu'];
const domAut = table('dominios_autorizados', 'Dominios externos a los que se permite enviar correo corporativo.', [
  'dominio:text:pk|Dominio',
  'organizacion:text|Organización',
  'motivo:text|Motivo de la autorización',
], [
  ['nebula-labs.com', 'Nébula Labs', 'Dominio propio'],
  ['esa-partner.eu', 'Consorcio espacial europeo', 'Socio del proyecto ÓRBITA'],
  ['proveedor-silicio.com', 'Silicio Andino', 'Proveedor de obleas'],
  ['banco-bruma.com', 'Banco de Bruma', 'Banca corporativa'],
  ['aseguradora-faro.com', 'Seguros Faro', 'Pólizas'],
  ['universidad-bruma.edu', 'Universidad de Bruma', 'Convenio de becarios'],
]);
const competidores = table('competidores', 'Empresas competidoras identificadas por el área comercial.', [
  'id_competidor:integer:pk|Identificador',
  'empresa:text|Empresa',
  'dominio:text|Dominio de correo',
  'linea:text|Línea de negocio en la que compite',
], [
  [1, 'Kuiper Tech', 'kuiper-tech.io', 'Chips satelitales'],
  [2, 'OrbiCom', 'orbicom.net', 'Antenas'],
  [3, 'Andes Aerospace', 'andes-aero.com', 'Lanzadores'],
]);

const mail: Cell[][] = [];
for (let i = 0; i < 140; i++) {
  const u = R.pick(users.filter((x) => !['dsaldarriaga', 'rbecerra'].includes(x)));
  mail.push([u, R.pick(autorizados.slice(2)), ts(R.pick(days), R.int(470, 1100)), R.int(1, 40) / 10, R.chance(0.3)]);
}
for (const [m, mb] of [[600, 18.5], [905, 22.0], [1010, 15.2]] as [number, number][]) mail.push(['yferrin', 'esa-partner.eu', ts(R.pick(days), m), mb, true]);
mail.push([R.pick(users.slice(5)), 'correo-libre.com', ts('2025-09-04', 760), 0.2, false]);
mail.push([R.pick(users.slice(5)), 'correo-libre.com', ts('2025-09-09', 820), 1.1, true]);
mail.push(['dsaldarriaga', 'kuiper-tech.io', ts('2025-09-11', 482), 0.1, false]);
mail.push(['dsaldarriaga', 'nebula-labs.com', ts('2025-09-10', 700), 0.3, false]);
mail.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const correos = table('correos_salientes', 'Metadatos de correos enviados (sin contenido).', [
  'id_correo:integer:pk|Identificador',
  'usuario:text|Remitente',
  'dominio_destino:text|Dominio del destinatario',
  'fecha_hora:timestamp|Momento',
  'tamano_mb:numeric|Tamaño (MB)',
  'con_adjunto:boolean|¿Lleva adjunto?',
], mail.map((m, i) => [i + 1, ...m]));

export const case13: CaseDef = {
  id: 13,
  code: 'EXP-13',
  title: 'El proyecto clandestino',
  level: 3,
  tagline: 'Los planos de un chip satelital aparecieron en la presentación de un competidor.',
  location: 'Nébula Labs, Parque Tecnológico de Bruma',
  date: '15 de septiembre de 2025',
  scene: 'proyecto',
  briefing: [
    'ÓRBITA es el proyecto más secreto de Nébula Labs: un chip de comunicación satelital. El 15 de septiembre, la competidora Kuiper Tech presentó un diseño casi idéntico.',
    'Solo las personas asignadas a ÓRBITA deberían abrir sus documentos. El repositorio registra cada lectura y descarga; el antivirus registra memorias USB; el servidor de correo guarda metadatos.',
    'La clave es encontrar lo que NO debería existir: accesos sin asignación y correos a dominios no autorizados. LEFT JOIN será tu mejor herramienta.',
  ],
  timeline: [
    { time: '1 sep', event: 'Una becaria se incorpora a ÓRBITA.' },
    { time: '10 sep, noche', event: 'Actividad inusual en el repositorio.' },
    { time: '15 sep', event: 'Kuiper Tech presenta un chip sospechosamente similar.' },
  ],
  concepts: ['LEFT JOIN', 'RIGHT JOIN', 'IS NULL', 'JOIN con condiciones compuestas', 'GROUP BY', 'MAX'],
  tables: [empleados, proyectos, asignaciones, documentos, accesos, dispositivos, domAut, competidores, correos],
  characters: [
    {
      id: 'damian', name: 'Damián Saldarriaga', role: 'Ingeniero de QA (equipo Plataforma)', age: 33, suspect: true,
      bio: 'Brillante y resentido: pidió entrar a ÓRBITA y se lo negaron dos veces.',
      statement: 'Nunca he abierto documentos de ÓRBITA. Ni siquiera tengo acceso.',
      look: { skin: 1, hair: 'flequillo', hairColor: 2, accessory: 'auriculares', outfitStyle: 'sueter', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿Pidió unirse a ÓRBITA?', answer: 'Dos veces. Me dijeron que QA no aporta en diseño de chips. En fin.' },
        { id: 'q2', text: 'Usted descargó seis documentos de ÓRBITA la noche del 10 de septiembre.', answer: 'El repositorio tiene permisos mal configurados. Entré por curiosidad, nada más.', requires: ['E1'], contradiction: true },
        { id: 'q3', text: 'A las 22:35 conectó una memoria USB de 64 GB.', answer: 'Para mis fotos personales…', requires: ['E2'], contradiction: true },
        { id: 'q4', text: 'Al día siguiente escribió a kuiper-tech.io.', answer: '…Me ofrecieron el puesto que aquí me negaron. Y un bono.', requires: ['E4'], contradiction: true, note: 'Damián admite una oferta de trabajo de Kuiper Tech.' },
      ],
    },
    {
      id: 'ferrin', name: 'Yolanda Ferrín', role: 'Líder del proyecto ÓRBITA', age: 47, suspect: true,
      bio: 'Envía archivos grandes con frecuencia fuera de la empresa.',
      statement: 'Mis envíos van al consorcio europeo. Es parte del proyecto.',
      look: { skin: 3, hair: 'corto', hairColor: 6, accessory: 'gafas', outfitStyle: 'traje', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Quién conoce el contenido completo de ÓRBITA?', answer: 'Mi equipo asignado: yo, la becaria nueva y, hasta agosto, Raúl Becerra.' },
      ],
    },
    {
      id: 'cristancho', name: 'Abel Cristancho', role: 'Administrador de sistemas', age: 40, suspect: true,
      bio: 'Puede leer cualquier archivo del repositorio.',
      statement: 'Mi usuario solo ejecuta respaldos automáticos de madrugada.',
      look: { skin: 5, hair: 'mono', hairColor: 0, facial: 'barba', outfitStyle: 'camisa', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Se pueden descargar documentos sin estar asignado?', answer: 'Por un error de configuración, sí. Lo reporté en junio. Nadie lo arregló.', note: 'El repositorio permitía descargas a empleados no asignados.' },
      ],
    },
    {
      id: 'lozano', name: 'Bárbara Lozano', role: 'Becaria de ingeniería', age: 23, suspect: true,
      bio: 'Recién llegada. Descargó documentos de ÓRBITA la misma noche del 10 de septiembre.',
      statement: 'Estaba estudiando para la reunión del día siguiente. Desde mi casa, por VPN.',
      look: { skin: 2, hair: 'coleta', hairColor: 4, accessory: 'gafas', outfitStyle: 'chaqueta', outfit: 5, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Desde cuándo trabaja en ÓRBITA?', answer: 'Desde el 1 de septiembre. Yolanda me pidió leer la arquitectura y los esquemáticos.' },
      ],
    },
    {
      id: 'becerra', name: 'Raúl Becerra', role: 'Exingeniero de ÓRBITA', age: 51, suspect: true,
      bio: 'Se retiró en agosto. Rumores dicen que Kuiper Tech lo contactó.',
      statement: 'Desde que me fui no he vuelto a entrar a nada. Mi usuario debería estar desactivado.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'perilla', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Kuiper Tech lo contactó?', answer: 'Sí, y les dije que no. Tengo una cláusula de confidencialidad y la respeto.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Accesos sin asignación', description: 'Uniendo accesos a documentos de ÓRBITA con las asignaciones al proyecto: aparte de los respaldos automáticos, el único usuario sin asignación es dsaldarriaga (6 descargas el 10 de septiembre).', reference: "SELECT a.usuario, a.fecha_hora, a.accion, d.titulo FROM accesos_documentos a INNER JOIN documentos d ON a.id_documento = d.id_documento INNER JOIN empleados e ON e.usuario = a.usuario LEFT JOIN asignaciones s ON s.id_empleado = e.id_empleado AND s.id_proyecto = d.id_proyecto WHERE d.id_proyecto = 1 AND s.id_asignacion IS NULL;", match: { any: [['dsaldarriaga', 'descarga']], maxRows: 30, anyFeature: ['left_join', 'right_join', 'subquery'] }, implicates: ['damian'] },
    { id: 'E2', key: true, title: 'Una memoria de 64 GB', description: 'A las 22:35 del 10 de septiembre, con la sesión de dsaldarriaga, se conectó una memoria USB de 64 GB (SN-77Q1) al PC-117.', reference: "SELECT * FROM dispositivos_usb WHERE usuario = 'dsaldarriaga';", match: { any: [['dsaldarriaga', '22:35', '64']], maxRows: 6 }, implicates: ['damian'] },
    { id: 'E3', key: true, title: 'Dominios no autorizados', description: 'Con LEFT JOIN hacia dominios_autorizados aparecen correos a dominios no permitidos: dos a un correo personal y uno de dsaldarriaga a kuiper-tech.io.', reference: 'SELECT c.usuario, c.dominio_destino, c.fecha_hora FROM correos_salientes c LEFT JOIN dominios_autorizados d ON c.dominio_destino = d.dominio WHERE d.dominio IS NULL;', match: { any: [['dsaldarriaga', 'kuiper-tech.io']], maxRows: 8, anyFeature: ['left_join', 'right_join', 'subquery'] }, implicates: ['damian'] },
    { id: 'E4', key: true, title: 'Escribiendo a la competencia', description: 'kuiper-tech.io es el dominio de Kuiper Tech, competidora directa en chips satelitales.', reference: 'SELECT c.usuario, k.empresa, k.linea, c.fecha_hora FROM correos_salientes c INNER JOIN competidores k ON c.dominio_destino = k.dominio;', match: { any: [['dsaldarriaga', 'Kuiper']], maxRows: 6, features: ['join'] }, implicates: ['damian'] },
    { id: 'E5', title: 'La noche de las descargas', description: 'El 10 de septiembre, dsaldarriaga descargó 6 documentos de ÓRBITA entre las 22:10 y las 22:31.', reference: "SELECT a.usuario, COUNT(*), MIN(a.fecha_hora), MAX(a.fecha_hora) FROM accesos_documentos a INNER JOIN documentos d ON a.id_documento = d.id_documento WHERE d.id_proyecto = 1 AND a.accion = 'descarga' AND a.fecha_hora > '2025-09-10 20:00' AND a.fecha_hora < '2025-09-11 00:00' GROUP BY a.usuario;", match: { any: [['dsaldarriaga', '6']], maxRows: 6, features: ['aggregate'] }, implicates: ['damian'] },
    { id: 'E6', title: 'Envíos al socio', description: 'Los correos grandes de Yolanda Ferrín van a esa-partner.eu, un dominio autorizado: el consorcio socio de ÓRBITA.', reference: "SELECT c.usuario, c.dominio_destino, c.tamano_mb, d.motivo FROM correos_salientes c INNER JOIN dominios_autorizados d ON c.dominio_destino = d.dominio WHERE c.tamano_mb > 10;", match: { any: [['yferrin', 'esa-partner.eu']], maxRows: 6, features: ['join'] }, clears: ['ferrin'] },
    { id: 'E7', title: 'Solo respaldos', description: 'Todos los accesos de acristancho son respaldos automáticos de madrugada: nunca leyó ni descargó documentos, y no conectó memorias USB.', reference: "SELECT usuario, accion, COUNT(*) FROM accesos_documentos WHERE usuario = 'acristancho' GROUP BY usuario, accion;", match: { any: [['acristancho', 'respaldo']], maxRows: 2, features: ['aggregate'] }, clears: ['cristancho'] },
    { id: 'E8', title: 'La becaria está asignada', description: 'Bárbara Lozano está asignada a ÓRBITA desde el 1 de septiembre: sus descargas eran parte de su trabajo.', reference: 'SELECT e.nombre, e.apellido, p.nombre AS proyecto, s.desde FROM asignaciones s INNER JOIN empleados e ON s.id_empleado = e.id_empleado INNER JOIN proyectos p ON s.id_proyecto = p.id_proyecto WHERE p.codigo = \'ORB\';', match: { any: [['Lozano', 'ÓRBITA', '2025-09-01']], maxRows: 8, features: ['join'] }, clears: ['lozano'] },
    { id: 'E9', title: 'Sin actividad desde agosto', description: 'El último acceso del usuario rbecerra fue el 14 de agosto, antes de su retiro.', reference: "SELECT usuario, MAX(fecha_hora) FROM accesos_documentos WHERE usuario = 'rbecerra' GROUP BY usuario;", match: { any: [['rbecerra', '2025-08-14']], maxRows: 3, features: ['aggregate'] }, clears: ['becerra'] },
  ],
  objectives: [
    { id: 'O1', title: 'Detectar accesos indebidos', description: '¿Quién abrió ÓRBITA sin estar asignado?', evidence: ['E1', 'E5'], need: 1, tables: ['accesos_documentos', 'documentos', 'asignaciones', 'empleados'] },
    { id: 'O2', title: 'Rastrear la extracción', description: '¿Cómo salió la información?', evidence: ['E2'], tables: ['dispositivos_usb'] },
    { id: 'O3', title: 'Revisar comunicaciones externas', description: 'Correos a dominios no autorizados o a la competencia.', evidence: ['E3', 'E4', 'E6'], need: 2, tables: ['correos_salientes', 'dominios_autorizados', 'competidores'] },
    { id: 'O4', title: 'Descartar al personal con acceso', description: 'La líder, el administrador, la becaria y el exingeniero.', evidence: ['E7', 'E8', 'E9'], need: 2, tables: ['asignaciones', 'accesos_documentos'] },
  ],
  hints: [
    { id: 'H1', title: 'Acceso sin permiso', evidence: 'E1', levels: ['Un acceso legítimo tiene una asignación detrás. Uno ilegítimo… no la tiene.', 'Une accesos → documentos → empleados y luego, con LEFT JOIN, asignaciones al mismo proyecto.', 'LEFT JOIN asignaciones s ON s.id_empleado = e.id_empleado AND s.id_proyecto = d.id_proyecto … WHERE s.id_asignacion IS NULL'] },
    { id: 'H2', title: 'Memorias externas', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Descargar no basta: hay que sacar los archivos.', 'dispositivos_usb registra memorias conectadas con la sesión activa.', 'Filtra por el usuario sospechoso.'] },
    { id: 'H3', title: 'Correos permitidos', evidence: 'E3', levels: ['La empresa solo permite escribir a ciertos dominios.', 'Compara correos_salientes con dominios_autorizados.', 'correos LEFT JOIN dominios_autorizados … WHERE d.dominio IS NULL'] },
    { id: 'H4', title: 'La competencia', evidence: 'E4', requires: { evidence: ['E3'] }, levels: ['¿Algún dominio destino pertenece a un competidor?', 'Une correos_salientes con competidores por dominio.', 'INNER JOIN competidores ON correos_salientes.dominio_destino = competidores.dominio'] },
    { id: 'H5', title: 'La noche del 10', evidence: 'E5', levels: ['¿Quién descargó documentos de ÓRBITA esa noche y cuántos?', 'Agrupa las descargas nocturnas de ÓRBITA por usuario.', 'GROUP BY usuario con COUNT(*), MIN() y MAX()'] },
    { id: 'H6', title: 'Los archivos grandes', evidence: 'E6', levels: ['La líder envía archivos grandes. ¿A dónde?', 'Une los correos grandes con dominios_autorizados.', 'WHERE tamano_mb > 10'] },
    { id: 'H7', title: 'El administrador', evidence: 'E7', levels: ['El administrador puede leerlo todo. ¿Qué hizo realmente?', 'Agrupa sus accesos por acción.', 'GROUP BY accion con COUNT(*)'] },
    { id: 'H8', title: 'La becaria', evidence: 'E8', levels: ['La becaria descargó documentos esa misma noche. ¿Tenía permiso?', 'Consulta las asignaciones del proyecto ÓRBITA con nombres.', 'asignaciones → empleados → proyectos'] },
    { id: 'H9', title: 'El exingeniero', evidence: 'E9', levels: ['¿Siguió usando su usuario después de irse?', 'Busca su último acceso.', "MAX(fecha_hora) WHERE usuario = 'rbecerra'"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'damian',
    motive: 'Kuiper Tech le ofreció el puesto de diseño que Nébula Labs le negó dos veces, más un bono por «traer experiencia».',
    opportunity: 'Un error de permisos permitía a cualquier empleado descargar documentos de proyectos ajenos.',
    method: 'La noche del 10 de septiembre descargó seis documentos clave de ÓRBITA, los copió a una memoria USB de 64 GB y al día siguiente contactó a Kuiper Tech.',
    justification: 'Es el único usuario sin asignación que descargó documentos de ÓRBITA, conectó una memoria minutos después y escribió a un competidor desde su cuenta.',
    eliminations: {
      ferrin: { evidence: ['E6'], explanation: 'Sus envíos grandes van al socio autorizado del proyecto.' },
      cristancho: { evidence: ['E7'], explanation: 'Solo ejecuta respaldos automáticos; nunca descargó ni usó memorias.' },
      lozano: { evidence: ['E8'], explanation: 'Está asignada a ÓRBITA: sus descargas eran legítimas.' },
      becerra: { evidence: ['E9'], explanation: 'No accede al repositorio desde el 14 de agosto.' },
    },
    incriminating: ['E1', 'E2', 'E4', 'E5'],
    reveal: [
      'Damián Saldarriaga pidió dos veces entrar a ÓRBITA. Dos veces le dijeron que no.',
      'Cuando Kuiper Tech le ofreció el puesto, descubrió que el repositorio no comprobaba las asignaciones. Seis descargas, una memoria USB y un correo bastaron.',
      'La prueba no estaba en lo que el sistema registró, sino en lo que faltaba: una asignación que nunca existió.',
    ],
  },
  references: [
    { title: 'Proyectos', sql: 'SELECT * FROM proyectos;' },
    { title: 'Asignados por proyecto', sql: 'SELECT p.nombre, COUNT(*) FROM asignaciones s INNER JOIN proyectos p ON s.id_proyecto = p.id_proyecto GROUP BY p.nombre;' },
    { title: 'Documentos secretos', sql: "SELECT * FROM documentos WHERE clasificacion = 'secreto';" },
    { title: 'Descargas por usuario', sql: "SELECT usuario, COUNT(*) FROM accesos_documentos WHERE accion = 'descarga' GROUP BY usuario ORDER BY COUNT(*) DESC;" },
    { title: 'Accesos nocturnos', sql: "SELECT * FROM accesos_documentos WHERE CAST(fecha_hora AS time) > '21:00';" },
    { title: 'Memorias de más de 16 GB', sql: 'SELECT * FROM dispositivos_usb WHERE capacidad_gb > 16;' },
    { title: 'Correos con adjunto por dominio', sql: 'SELECT dominio_destino, COUNT(*) FROM correos_salientes WHERE con_adjunto = true GROUP BY dominio_destino;' },
    { title: 'Empleados sin proyecto (LEFT JOIN)', sql: 'SELECT e.usuario FROM empleados e LEFT JOIN asignaciones s ON e.id_empleado = s.id_empleado WHERE s.id_asignacion IS NULL;' },
    { title: 'Documentos nunca abiertos (RIGHT JOIN)', sql: 'SELECT d.titulo FROM accesos_documentos a RIGHT JOIN documentos d ON a.id_documento = d.id_documento WHERE a.id_acceso IS NULL;' },
    { title: 'Equipo de cada empleado con descargas de ÓRBITA', sql: "SELECT e.equipo, COUNT(*) FROM accesos_documentos a INNER JOIN documentos d ON a.id_documento = d.id_documento INNER JOIN empleados e ON e.usuario = a.usuario WHERE d.id_proyecto = 1 GROUP BY e.equipo;" },
    { title: 'Competidores', sql: 'SELECT * FROM competidores;' },
    { title: 'Tamaño promedio de correo por usuario', sql: 'SELECT usuario, AVG(tamano_mb) FROM correos_salientes GROUP BY usuario HAVING AVG(tamano_mb) > 3;' },
  ],
};
