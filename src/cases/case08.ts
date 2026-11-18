import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 8 — El expediente perdido
// Culpable: Hernando Galeano (asesor jurídico, id 12, nivel de reserva 2).
// El 12 de junio, a las 19:42, imprimió las 148 páginas del expediente C-2291 (nivel 3) en la impresora del
// Archivo (IMP-04), se llevó el original devuelto esa tarde y salió a las 20:05. Filtró el contenido a la prensa.

const R = rng(808);
const EXCL = ['Galeano', 'Castañeda', 'Peñaloza', 'Rengifo', 'Villegas'];
const DAYS = ['2025-06-09', '2025-06-10', '2025-06-11', '2025-06-12', '2025-06-13'];

const departamentos = table('departamentos', 'Dependencias de la Contraloría Regional de Bruma.', [
  'id_departamento:integer:pk|Identificador',
  'nombre:text|Nombre',
  'piso:integer|Piso',
], [
  [1, 'Dirección', 5], [2, 'Archivo Central', 1], [3, 'Tecnología', 2], [4, 'Jurídica', 4], [5, 'Auditoría de Obras', 3], [6, 'Comunicaciones', 2],
]);

const fill = namePool(R, 25, EXCL);
const funRows: Cell[][] = [
  [3, 'Augusto', 'Peñaloza', 'Director regional', 1, 3, 'apenaloza'],
  [7, 'Mireya', 'Castañeda', 'Archivista jefe', 2, 3, 'mcastaneda'],
  [9, 'Wilson', 'Rengifo', 'Técnico de soporte', 3, 1, 'wrengifo'],
  [12, 'Hernando', 'Galeano', 'Asesor jurídico', 4, 2, 'hgaleano'],
  [13, 'Sandra', 'Villegas', 'Secretaria de Jurídica', 4, 1, 'svillegas'],
];
const cargos: [string, number, number][] = [['Auditor', 5, 3], ['Auditora', 5, 2], ['Auditor', 5, 2], ['Abogada', 4, 2], ['Auxiliar de archivo', 2, 2], ['Auxiliar de archivo', 2, 1], ['Analista de datos', 3, 1], ['Jefa de prensa', 6, 1], ['Periodista interno', 6, 1], ['Asistente de dirección', 1, 2], ['Auditora', 5, 3], ['Ingeniero civil', 5, 2], ['Contador', 5, 2], ['Abogado', 4, 2], ['Practicante', 4, 1]];
cargos.forEach(([c, d, n], i) => {
  const f = fill[i];
  funRows.push([20 + i, f.nombre, f.apellido, c, d, n, (f.nombre[0] + f.apellido).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')]);
});
const funcionarios = table('funcionarios', 'Funcionarios y su nivel de autorización para documentos reservados.', [
  'id_funcionario:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'id_departamento:integer:fk=departamentos.id_departamento|Dependencia',
  'nivel_reserva:integer|Nivel máximo de documentos reservados que puede consultar (1 a 3)',
  'usuario:text|Usuario de red',
], funRows);
const funIds = funRows.map((r) => r[0] as number);

const expRows: Cell[][] = [['C-2291', 'Investigación de sobrecostos en la represa El Cañón', 148, 3, 'extraviado', 5]];
const temas = ['Contrato de alumbrado', 'Obras viales Norte', 'Hospital Sur fase II', 'Dotación escolar', 'Acueducto rural', 'Parque lineal', 'Transporte escolar', 'Puente de la Calle 9', 'Plaza de mercado', 'Colegio Mirador'];
for (let i = 0; i < 18; i++) expRows.push([`C-${2200 + i * 5}`, `${R.pick(temas)} (${2020 + (i % 5)})`, R.int(20, 260), R.int(1, 3), R.chance(0.8) ? 'archivado' : 'prestado', R.pick([4, 5, 5, 5])]);
const expedientes = table('expedientes', 'Expedientes físicos del Archivo Central.', [
  'codigo:text:pk|Código del expediente',
  'titulo:text|Asunto',
  'paginas:integer|Número de páginas',
  'nivel_reserva:integer|Nivel de reserva requerido (1 a 3)',
  'estado:text|archivado, prestado o extraviado',
  'id_departamento:integer:fk=departamentos.id_departamento|Dependencia responsable',
], expRows);

const prest: Cell[][] = [];
for (let i = 0; i < 30; i++) {
  const e = R.pick(expRows.slice(1));
  const d = R.pick(DAYS.slice(0, 4));
  const s = R.int(480, 900);
  prest.push([e[0], R.pick(funIds.filter((x) => x !== 12)), ts(d, s), ts(d, Math.min(s + R.int(60, 300), 1050)), 7]);
}
prest.push(['C-2291', 3, ts('2025-06-12', 540), ts('2025-06-12', 1085), 7]);
prest.push(['C-2291', 20, ts('2025-06-05', 600), ts('2025-06-05', 840), 7]);
prest.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const prestamos = table('prestamos', 'Préstamos de expedientes físicos (cadena de custodia).', [
  'id_prestamo:integer:pk|Identificador',
  'codigo_expediente:text:fk=expedientes.codigo|Expediente',
  'id_funcionario:integer:fk=funcionarios.id_funcionario|Quien lo retira',
  'fecha_salida:timestamp|Salida del archivo',
  'fecha_devolucion:timestamp:null|Devolución',
  'recibido_por:integer:null:fk=funcionarios.id_funcionario|Archivista que recibe',
], prest.map((p, i) => [300 + i, ...p]));

const impresoras = table('impresoras', 'Impresoras de red.', [
  'id_impresora:text:pk|Código',
  'ubicacion:text|Ubicación',
  'id_departamento:integer:fk=departamentos.id_departamento|Dependencia',
], [
  ['IMP-01', 'Despacho de Dirección', 1], ['IMP-02', 'Pasillo piso 4', 4], ['IMP-03', 'Sala de auditores', 5], ['IMP-04', 'Sala de consulta del Archivo', 2], ['IMP-05', 'Oficina de Tecnología', 3], ['IMP-06', 'Comunicaciones', 6],
]);
const deptPrinter: Record<number, string> = { 1: 'IMP-01', 2: 'IMP-04', 3: 'IMP-05', 4: 'IMP-02', 5: 'IMP-03', 6: 'IMP-06' };

const docs = ['Informe_mensual.pdf', 'Acta_comite.docx', 'Oficio_respuesta.docx', 'Hallazgos_preliminares.xlsx', 'Presentacion_resultados.pptx', 'Contrato_anexo.pdf', 'Memorando.docx'];
const imp: Cell[][] = [];
for (let i = 0; i < 230; i++) {
  const f = R.pick(funRows.filter((r) => r[0] !== 9));
  const fid = f[0] as number;
  const d = R.pick(DAYS);
  if (fid === 12 && d === '2025-06-12') continue;
  imp.push([fid, deptPrinter[f[4] as number], R.chance(0.15) ? `${R.pick(expRows.slice(1))[0]}_extracto.pdf` : R.pick(docs), R.int(1, 24), ts(d, R.int(470, 1000))]);
}
for (const d of DAYS) for (const p of ['IMP-01', 'IMP-02', 'IMP-04']) imp.push([9, p, 'pagina_de_prueba.pdf', 1, ts(d, R.int(430, 470))]);
imp.push([7, 'IMP-04', 'C-2291_indice.pdf', 6, ts('2025-06-10', 615)]);
imp.push([3, 'IMP-01', 'C-2291_resumen.docx', 10, ts('2025-06-11', 845)]);
imp.push([12, 'IMP-02', 'Concepto_juridico.docx', 8, ts('2025-06-12', 650)]);
imp.push([12, 'IMP-04', 'C-2291_completo.pdf', 148, ts('2025-06-12', 1182)]);
imp.sort((a, b) => String(a[4]).localeCompare(String(b[4])));
const impresiones = table('impresiones', 'Registro del servidor de impresión (9 al 13 de junio).', [
  'id_impresion:integer:pk|Identificador',
  'id_funcionario:integer:fk=funcionarios.id_funcionario|Usuario que imprimió',
  'id_impresora:text:fk=impresoras.id_impresora|Impresora',
  'documento:text|Nombre del archivo',
  'paginas:integer|Páginas impresas',
  'fecha_hora:timestamp|Momento',
], imp.map((r, i) => [9000 + i, ...r]));

const acc: Cell[][] = [];
for (const d of DAYS)
  for (const f of funRows) {
    const id = f[0] as number;
    const e = id === 9 ? 420 : R.int(425, 510);
    let s = R.int(990, 1080);
    if (d === '2025-06-12') {
      if (id === 7) s = 1110;
      if (id === 3) s = 1100;
      if (id === 9) s = 960;
      if (id === 13) s = 1065;
      if (id === 12) s = 1205;
    }
    if (id === 9 && d !== '2025-06-12') s = 960;
    acc.push([id, 'Principal', ts(d, e), 'entrada'], [id, 'Principal', ts(d, s), 'salida']);
  }
acc.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const accesos = table('accesos_edificio', 'Torniquetes del edificio.', [
  'id_acceso:integer:pk|Identificador',
  'id_funcionario:integer:fk=funcionarios.id_funcionario|Funcionario',
  'puerta:text|Puerta',
  'fecha_hora:timestamp|Momento',
  'tipo:text|entrada o salida',
], acc.map((r, i) => [50000 + i, ...r]));

export const case08: CaseDef = {
  id: 8,
  code: 'EXP-08',
  title: 'El expediente perdido',
  level: 2,
  tagline: 'Un expediente reservado desapareció del archivo y apareció en la portada de un diario.',
  location: 'Contraloría Regional de Bruma',
  date: '13 de junio de 2025, 08:00',
  scene: 'archivo',
  briefing: [
    'El expediente C-2291 documenta sobrecostos millonarios en la represa El Cañón. Es de reserva nivel 3: solo pueden consultarlo funcionarios autorizados.',
    'El 13 de junio, el original no estaba en su estante. El 14, un diario publicó páginas completas del expediente.',
    'El servidor de impresión registra cada trabajo: quién, dónde, qué archivo y cuántas páginas. Los torniquetes registran quién estaba en el edificio.',
  ],
  timeline: [
    { time: '12 jun 09:00', event: 'El director retira el expediente C-2291.' },
    { time: '12 jun 18:05', event: 'El expediente regresa al Archivo Central.' },
    { time: '13 jun 08:00', event: 'Se descubre la desaparición.' },
    { time: '14 jun', event: 'Un diario publica el contenido.' },
  ],
  concepts: ['INNER JOIN', 'SUM', 'COUNT', 'MAX', 'GROUP BY', 'HAVING', 'LIKE'],
  tables: [departamentos, funcionarios, expedientes, prestamos, impresoras, impresiones, accesos],
  characters: [
    {
      id: 'galeano', name: 'Hernando Galeano', role: 'Asesor jurídico', age: 45, suspect: true,
      bio: 'Ambicioso. Su nombre suena para la Dirección si el actual director cae.',
      statement: 'Jamás he tocado ese expediente. No tengo nivel de reserva para consultarlo.',
      look: { skin: 1, hair: 'corto', hairColor: 1, facial: 'perilla', outfitStyle: 'traje', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿A qué hora salió el 12 de junio?', answer: 'Temprano, como a las seis. Tenía una cena.' },
        { id: 'q2', text: '¿Imprimió algo ese día?', answer: 'Un concepto jurídico por la mañana. En la impresora de mi piso.' },
        { id: 'q3', text: 'Su usuario imprimió 148 páginas de «C-2291_completo.pdf» a las 19:42 en la impresora del Archivo.', answer: 'Alguien usó mi usuario. Las contraseñas aquí son un chiste.', requires: ['E1', 'E3'], contradiction: true },
        { id: 'q4', text: 'Su torniquete registra la salida a las 20:05, no a las seis.', answer: '…Ese expediente debía conocerse. El director lo estaba escondiendo.', requires: ['E5'], contradiction: true, note: 'Galeano insinúa que filtró el expediente porque el director lo ocultaba.' },
      ],
    },
    {
      id: 'castaneda', name: 'Mireya Castañeda', role: 'Archivista jefe', age: 56, suspect: true,
      bio: 'Custodia los expedientes reservados. Recibió el C-2291 la tarde del 12.',
      statement: 'Lo recibí a las 18:05, lo dejé en su estante y me fui.',
      look: { skin: 2, hair: 'canoso', hairColor: 7, accessory: 'gafas', outfitStyle: 'sueter', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Cerró la sala del archivo?', answer: 'La sala de consulta queda abierta hasta las nueve para los funcionarios. Los estantes reservados tienen candado… que nunca cerramos bien.' },
        { id: 'q2', text: '¿Imprimió partes del C-2291?', answer: 'Solo el índice, seis páginas, para el inventario.' },
      ],
    },
    {
      id: 'penaloza', name: 'Augusto Peñaloza', role: 'Director regional', age: 61, suspect: true,
      bio: 'Retuvo el expediente toda la jornada del 12. Algunos dicen que quería enterrarlo.',
      statement: 'Lo revisé y lo devolví. La filtración me perjudica a mí más que a nadie.',
      look: { skin: 0, hair: 'canoso', hairColor: 7, facial: 'bigote', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Por qué retuvo el expediente todo el día?', answer: 'Preparaba la respuesta al Concejo. Imprimí un resumen de diez páginas, nada más.' },
        { id: 'q2', text: '¿Quién se beneficia de la filtración?', answer: 'Quien quiera mi cargo. Galeano no disimula sus ambiciones.', note: 'Peñaloza señala las ambiciones de Galeano.' },
      ],
    },
    {
      id: 'rengifo', name: 'Wilson Rengifo', role: 'Técnico de soporte', age: 34, suspect: true,
      bio: 'Administra las impresoras y conoce los usuarios de red de todos.',
      statement: 'Yo solo imprimo páginas de prueba. Cada mañana.',
      look: { skin: 4, hair: 'mohicano', hairColor: 0, accessory: 'auriculares', outfitStyle: 'camisa', outfit: 3, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Alguien podría imprimir con el usuario de otro?', answer: 'Solo si conoce su contraseña o deja la sesión abierta. Pero el trabajo sale físicamente en la impresora elegida.' },
      ],
    },
    {
      id: 'villegas', name: 'Sandra Villegas', role: 'Secretaria de Jurídica', age: 38, suspect: true,
      bio: 'Comparte oficina con Galeano y maneja su agenda.',
      statement: 'El doctor Galeano me dijo que se quedaría «revisando unos papeles».',
      look: { skin: 3, hair: 'largo', hairColor: 1, accessory: 'aretes', outfitStyle: 'camisa', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿A qué hora salió usted?', answer: 'A las 17:45, como siempre.' },
        { id: 'q2', text: '¿Galeano tenía una cena?', answer: '¿Cena? No había nada en su agenda. Se quedó en la oficina.', note: 'Galeano no tenía ninguna cena en la agenda.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Páginas del C-2291 por persona', description: 'Sumando las páginas impresas de archivos «C-2291…» por funcionario: Galeano imprimió 148, Peñaloza 10 y Castañeda 6.', reference: "SELECT f.apellido, SUM(i.paginas) AS paginas FROM impresiones i INNER JOIN funcionarios f ON i.id_funcionario = f.id_funcionario WHERE i.documento LIKE 'C-2291%' GROUP BY f.apellido;", match: { any: [['Galeano', '148'], ['12', '148']], maxRows: 10, features: ['aggregate'] }, implicates: ['galeano'] },
    { id: 'E2', key: true, title: 'El expediente completo', description: 'El expediente C-2291 tiene exactamente 148 páginas y nivel de reserva 3.', reference: "SELECT * FROM expedientes WHERE codigo = 'C-2291';", match: { any: [['C-2291', '148']], maxRows: 3 } },
    { id: 'E3', key: true, title: 'Impresión nocturna en el Archivo', description: 'El trabajo de 148 páginas salió a las 19:42 del 12 de junio por la IMP-04, en la sala de consulta del Archivo Central.', reference: 'SELECT i.fecha_hora, i.documento, i.paginas, p.ubicacion FROM impresiones i INNER JOIN impresoras p ON i.id_impresora = p.id_impresora WHERE i.paginas > 100;', match: { any: [['19:42', 'Archivo']], maxRows: 10, features: ['join'] }, implicates: ['galeano'] },
    { id: 'E4', key: true, title: 'Sin autorización', description: 'Hernando Galeano tiene nivel de reserva 2: no estaba autorizado para el expediente C-2291 (nivel 3).', reference: "SELECT nombre, apellido, nivel_reserva FROM funcionarios WHERE apellido = 'Galeano';", match: { any: [['Galeano', '=2']], maxRows: 5 }, implicates: ['galeano'] },
    { id: 'E5', key: true, title: 'El último en salir', description: 'El 12 de junio, Galeano salió del edificio a las 20:05: era el único funcionario dentro a las 19:42.', reference: "SELECT f.apellido, a.fecha_hora FROM accesos_edificio a INNER JOIN funcionarios f ON a.id_funcionario = f.id_funcionario WHERE a.fecha_hora > '2025-06-12 19:00' AND a.fecha_hora < '2025-06-13 00:00';", match: { any: [['Galeano', '20:05'], ['12', '20:05']], maxRows: 10 }, implicates: ['galeano'] },
    { id: 'E6', title: 'Últimas salidas del 12 de junio', description: 'Castañeda salió a las 18:30, Villegas a las 17:45, Peñaloza a las 18:20 y Rengifo a las 16:00: ninguno estaba en el edificio a las 19:42.', reference: "SELECT f.apellido, MAX(a.fecha_hora) AS ultima_salida FROM accesos_edificio a INNER JOIN funcionarios f ON a.id_funcionario = f.id_funcionario WHERE a.tipo = 'salida' AND a.fecha_hora BETWEEN '2025-06-12 00:00' AND '2025-06-12 23:59' GROUP BY f.apellido;", match: { all: [['Castañeda', '18:30'], ['Villegas', '17:45'], ['Peñaloza', '18:20'], ['Rengifo', '16:00']], maxRows: 30, features: ['join', 'aggregate'] }, clears: ['castaneda', 'villegas', 'penaloza', 'rengifo'] },
    { id: 'E7', title: 'El resumen del director', description: 'El director solo imprimió un resumen de 10 páginas del C-2291, el 11 de junio, en su despacho.', reference: "SELECT * FROM impresiones WHERE id_funcionario = 3 AND documento LIKE 'C-2291%';", match: { any: [['C-2291_resumen', '10']], maxRows: 5 }, clears: ['penaloza'] },
    { id: 'E8', title: 'Páginas de prueba', description: 'Todos los trabajos de Rengifo son páginas de prueba de 1 página, impresas antes de las 08:00.', reference: 'SELECT documento, COUNT(*), SUM(paginas) FROM impresiones WHERE id_funcionario = 9 GROUP BY documento;', match: { any: [['prueba', '15']], maxRows: 5, features: ['aggregate'] }, clears: ['rengifo'] },
    { id: 'E9', title: 'Cadena de custodia', description: 'El C-2291 salió del archivo con el director a las 09:00 del 12 de junio y fue devuelto a las 18:05, recibido por la archivista (id 7).', reference: "SELECT * FROM prestamos WHERE codigo_expediente = 'C-2291';", match: { any: [['C-2291', '18:05']], maxRows: 5 } },
  ],
  objectives: [
    { id: 'O1', title: 'Medir la fuga', description: '¿Cuántas páginas del expediente se imprimieron y quién lo hizo?', evidence: ['E1', 'E2'], tables: ['impresiones', 'expedientes', 'funcionarios'] },
    { id: 'O2', title: 'Ubicar la impresión', description: '¿Dónde y cuándo salió el trabajo sospechoso? ¿Quién estaba allí?', evidence: ['E3', 'E5'], need: 1, tables: ['impresoras', 'accesos_edificio'] },
    { id: 'O3', title: 'Verificar permisos', description: '¿Tenía autorización quien imprimió?', evidence: ['E4'], tables: ['funcionarios'] },
    { id: 'O4', title: 'Cadena de custodia', description: 'Sigue el original físico.', evidence: ['E9', 'E6'], need: 1, tables: ['prestamos'] },
    { id: 'O5', title: 'Descartar al resto del personal', description: 'Director, archivista, técnico y secretaria.', evidence: ['E6', 'E7', 'E8'], need: 2, tables: ['accesos_edificio', 'impresiones'] },
  ],
  hints: [
    { id: 'H1', title: 'Contar páginas', evidence: 'E1', levels: ['Una filtración de 148 páginas deja rastro en el servidor de impresión.', 'Busca documentos cuyo nombre empiece por C-2291 y suma sus páginas por funcionario.', "WHERE documento LIKE 'C-2291%' … GROUP BY id_funcionario con SUM(paginas)."] },
    { id: 'H2', title: 'El tamaño del expediente', evidence: 'E2', levels: ['¿Cuántas páginas tiene el expediente original?', 'Consulta la tabla expedientes.', "WHERE codigo = 'C-2291'"] },
    { id: 'H3', title: '¿En qué impresora?', evidence: 'E3', levels: ['Un trabajo enorme no pasa desapercibido… salvo de noche.', 'Relaciona impresiones con impresoras para conocer la ubicación.', 'INNER JOIN impresoras ON impresiones.id_impresora = impresoras.id_impresora WHERE paginas > 100'] },
    { id: 'H4', title: 'Niveles de reserva', evidence: 'E4', requires: { evidence: ['E1'] }, levels: ['No todos pueden ver un expediente de nivel 3.', 'Compara el nivel_reserva del funcionario con el del expediente.', "WHERE apellido = '…'"] },
    { id: 'H5', title: 'Quién quedaba en el edificio', evidence: 'E5', levels: ['A las 19:42, el edificio estaba casi vacío.', 'Relaciona accesos_edificio con funcionarios después de las 19:00 del 12 de junio.', 'INNER JOIN funcionarios y filtra fecha_hora por rango.'] },
    { id: 'H6', title: 'La hora de salida de todos', evidence: 'E6', levels: ['Si alguien salió antes de las 19:42, no pudo imprimir.', 'Busca la última salida de cada funcionario el 12 de junio.', 'MAX(fecha_hora) con GROUP BY apellido, filtrando tipo = salida.'] },
    { id: 'H7', title: 'El director', evidence: 'E7', levels: ['El director tuvo el expediente todo el día. ¿Qué imprimió?', 'Filtra impresiones por su id_funcionario y el nombre del documento.', "WHERE id_funcionario = 3 AND documento LIKE 'C-2291%'"] },
    { id: 'H8', title: 'El técnico', evidence: 'E8', levels: ['El técnico conoce los usuarios de todos. ¿Qué imprime él?', 'Agrupa sus impresiones por documento.', 'GROUP BY documento con COUNT(*) y SUM(paginas)'] },
    { id: 'H9', title: 'El original', evidence: 'E9', levels: ['Además de la copia impresa, desapareció el original.', 'prestamos registra quién retira y devuelve cada expediente.', "WHERE codigo_expediente = 'C-2291'"] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'galeano',
    motive: 'Desprestigiar al director para ocupar su cargo.',
    opportunity: 'La sala de consulta del Archivo quedaba abierta hasta las 21:00 y el expediente volvió a su estante a las 18:05.',
    method: 'Esperó a que el edificio se vaciara, imprimió la versión digitalizada completa en la IMP-04 a las 19:42, se llevó el original y salió a las 20:05.',
    justification: 'Su usuario imprimió exactamente las 148 páginas del expediente, sin tener autorización, y era el único funcionario en el edificio a esa hora.',
    eliminations: {
      castaneda: { evidence: ['E6'], explanation: 'Salió a las 18:30; solo imprimió el índice (6 páginas) dos días antes.' },
      penaloza: { evidence: ['E6', 'E7'], explanation: 'Devolvió el expediente a las 18:05, salió a las 18:20 y solo imprimió un resumen de 10 páginas.' },
      rengifo: { evidence: ['E6', 'E8'], explanation: 'Salió a las 16:00 y solo imprime páginas de prueba.' },
      villegas: { evidence: ['E6'], explanation: 'Salió a las 17:45; nunca imprimió el expediente.' },
    },
    incriminating: ['E1', 'E3', 'E4', 'E5'],
    reveal: [
      'Hernando Galeano quería la Dirección. Si el expediente C-2291 se hacía público, el director caería.',
      'Esperó hasta que el edificio quedó vacío, imprimió las 148 páginas en la sala del Archivo y se llevó el original en su maletín.',
      'El periodista que recibió las copias confirmó que llegaron en un sobre con membrete de la oficina Jurídica.',
    ],
  },
  references: [
    { title: 'Funcionarios con nivel 3', sql: 'SELECT nombre, apellido, cargo FROM funcionarios WHERE nivel_reserva = 3;' },
    { title: 'Funcionarios por dependencia', sql: 'SELECT d.nombre, COUNT(*) FROM funcionarios f INNER JOIN departamentos d ON f.id_departamento = d.id_departamento GROUP BY d.nombre;' },
    { title: 'Páginas impresas por impresora', sql: 'SELECT id_impresora, SUM(paginas) FROM impresiones GROUP BY id_impresora ORDER BY SUM(paginas) DESC;' },
    { title: 'Trabajo más grande', sql: 'SELECT MAX(paginas) FROM impresiones;' },
    { title: 'Promedio de páginas por funcionario', sql: 'SELECT id_funcionario, AVG(paginas) FROM impresiones GROUP BY id_funcionario HAVING AVG(paginas) > 12;' },
    { title: 'Expedientes reservados', sql: 'SELECT codigo, titulo, nivel_reserva FROM expedientes WHERE nivel_reserva = 3;' },
    { title: 'Préstamos por funcionario', sql: 'SELECT f.apellido, COUNT(*) FROM prestamos p INNER JOIN funcionarios f ON p.id_funcionario = f.id_funcionario GROUP BY f.apellido ORDER BY COUNT(*) DESC;' },
    { title: 'Impresiones del 12 de junio por la tarde', sql: "SELECT * FROM impresiones WHERE fecha_hora > '2025-06-12 17:00' AND fecha_hora < '2025-06-13 00:00';" },
    { title: 'Impresiones de Jurídica', sql: 'SELECT i.* FROM impresiones i INNER JOIN funcionarios f ON i.id_funcionario = f.id_funcionario WHERE f.id_departamento = 4;' },
    { title: 'Expedientes prestados', sql: "SELECT * FROM expedientes WHERE estado <> 'archivado';" },
    { title: 'Impresoras', sql: 'SELECT * FROM impresoras;' },
    { title: 'Accesos de Galeano', sql: "SELECT * FROM accesos_edificio WHERE id_funcionario = 12 ORDER BY fecha_hora;" },
    { title: 'Documentos impresos en el Archivo', sql: "SELECT DISTINCT documento FROM impresiones WHERE id_impresora = 'IMP-04';" },
    { title: 'Funcionarios sin autorización que imprimieron expedientes', sql: "SELECT DISTINCT f.apellido, f.nivel_reserva FROM impresiones i INNER JOIN funcionarios f ON i.id_funcionario = f.id_funcionario WHERE i.documento LIKE 'C-%' AND f.nivel_reserva < 3;" },
  ],
};
