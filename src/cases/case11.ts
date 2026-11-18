import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 11 — La red de identidades falsas
// Culpable: Leandro Vallejo (registrador de la Oficina Centro, funcionario 2).
// Registró 10 cédulas falsas. Dos fueron rechazadas por la verificadora; las otras 8 nunca las envió a verificar
// (no tienen fila en verificaciones → LEFT JOIN … IS NULL). Con ellas se abrieron 8 cuentas que recibieron depósitos
// fraccionados y transfirieron todo a la cuenta CTA-90017, cuyo titular es el propio Vallejo.

const R = rng(1111);
const EXCL = ['Vallejo', 'Pulido', 'Duque', 'Paz', 'Lucumí'];

const barrios = ['El Recreo', 'La Esperanza', 'San Telmo', 'Puerto Viejo', 'Los Cerezos', 'Mirador', 'Santa Inés', 'La Colina'];
const dirRows: Cell[][] = [];
for (let i = 1; i <= 38; i++) dirRows.push([i, `Calle ${R.int(1, 140)} # ${R.int(1, 99)}-${R.int(1, 99)}`, R.pick(barrios), 'Ciudad Bruma']);
dirRows.push([39, 'Lote 14 (predio sin construir)', 'El Recreo', 'Ciudad Bruma']);
dirRows.push([40, 'Carrera 3 # 1-01, bodega abandonada', 'Puerto Viejo', 'Ciudad Bruma']);
const direcciones = table('direcciones', 'Direcciones declaradas por los ciudadanos.', [
  'id_direccion:integer:pk|Identificador',
  'calle:text|Dirección',
  'barrio:text|Barrio',
  'ciudad:text|Ciudad',
], dirRows);

const fn = namePool(R, 3, EXCL);
const funcionarios = table('funcionarios', 'Funcionarios del Registro Civil.', [
  'id_funcionario:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'oficina:text|Oficina',
  'cargo:text|registrador, verificador o jefe',
], [
  [1, fn[0].nombre, fn[0].apellido, 'Oficina Centro', 'jefe'],
  [2, 'Leandro', 'Vallejo', 'Oficina Centro', 'registrador'],
  [3, 'Óscar', 'Pulido', 'Oficina Norte', 'registrador'],
  [4, fn[1].nombre, fn[1].apellido, 'Oficina Puerto', 'registrador'],
  [5, 'Dora', 'Lucumí', 'Oficina Centro', 'verificador'],
  [6, fn[2].nombre, fn[2].apellido, 'Oficina Norte', 'verificador'],
]);

const real = namePool(R, 58, EXCL);
const perRows: Cell[][] = [];
const docRows: Cell[][] = [];
const verRows: Cell[][] = [];
let pid = 1;
let did = 1;
let vid = 1;
const phone = () => `3${R.int(0, 2)}${R.int(0, 9)}-555-${String(R.int(1000, 9999))}`;
const yyyy = (a: number, b: number) => `${R.int(a, b)}-${String(R.int(1, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}`;
for (const n of real) {
  const id = pid++;
  perRows.push([id, n.nombre, n.apellido, yyyy(1950, 2004), phone(), R.int(1, 38)]);
  const reg = R.pick([2, 3, 4, 3, 4]);
  const docId = did++;
  const fexp = yyyy(2015, 2024);
  docRows.push([docId, id, 'cédula', `CC-${R.int(10000000, 79999999)}`, fexp, reg]);
  verRows.push([vid++, docId, fexp, R.pick(['biométrica', 'presencial']), R.chance(0.97) ? 'aprobada' : 'rechazada', reg === 3 ? 6 : R.pick([5, 6])]);
}
// Personas reales relevantes
const vallejoPid = pid++;
perRows.push([vallejoPid, 'Leandro', 'Vallejo', '1981-07-19', '315-555-4420', 12]);
docRows.push([did, vallejoPid, 'cédula', 'CC-80112233', '2001-08-02', 1]);
verRows.push([vid++, did++, '2001-08-02', 'presencial', 'aprobada', 5]);
const pazPid = pid++;
perRows.push([pazPid, 'Nicanor', 'Paz', '1966-02-03', '311-555-7781', 21]);
docRows.push([did, pazPid, 'cédula', 'CC-41229001', '2018-04-11', 3]);
verRows.push([vid++, did++, '2018-04-11', 'biométrica', 'aprobada', 6]);
// Documentos recientes pendientes (legítimos)
for (const k of [0, 1]) {
  const n = namePool(R, 1, EXCL)[0];
  const id = pid++;
  perRows.push([id, n.nombre, n.apellido, yyyy(1990, 2003), phone(), R.int(1, 38)]);
  docRows.push([did++, id, 'cédula', `CC-${R.int(80000000, 89999999)}`, k ? '2025-01-28' : '2025-01-29', k ? 3 : 4]);
}
// Identidades falsas
const fakeNames = [['Héctor', 'Lamprea'], ['Aníbal', 'Solórzano'], ['Mireya', 'Tobón'], ['Celso', 'Urrutia'], ['Ingrid', 'Zapata'], ['Ovidio', 'Meneses'], ['Rocío', 'Barreto'], ['Lisandro', 'Quevedo'], ['Fidel', 'Garcés'], ['Noemí', 'Arciniegas']];
const fakePhones = ['320-555-0101', '320-555-0102'];
const fakeDirs = [39, 40, 39, 40, 39, 40, 39, 12, 39, 40];
const fakeIds: number[] = [];
fakeNames.forEach(([n, a], i) => {
  const id = pid++;
  fakeIds.push(id);
  perRows.push([id, n, a, `19${R.int(70, 95)}-0${R.int(1, 9)}-1${R.int(0, 9)}`, fakePhones[i % 2], fakeDirs[i]]);
  const isRejected = i >= 8;
  const num = isRejected ? `CC-77000${91 + (i - 8)}` : `CC-7700${101 + i}`;
  const fexp = isRejected ? `2024-0${6 + (i - 8)}-14` : `2024-${String(8 + Math.floor(i / 3)).padStart(2, '0')}-${String(3 + i * 2).padStart(2, '0')}`;
  docRows.push([did, id, 'cédula', num, fexp, 2]);
  if (isRejected) verRows.push([vid++, did, fexp, 'biométrica', 'rechazada', 5]);
  did++;
});
const personas = table('personas', 'Ciudadanos registrados.', [
  'id_persona:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'fecha_nacimiento:date|Fecha de nacimiento',
  'telefono:text|Teléfono declarado',
  'id_direccion:integer:fk=direcciones.id_direccion|Dirección declarada',
], perRows);
const documentos = table('documentos', 'Documentos de identidad expedidos.', [
  'id_documento:integer:pk|Identificador',
  'id_persona:integer:fk=personas.id_persona|Titular',
  'tipo:text|Tipo de documento',
  'numero:text|Número',
  'fecha_expedicion:date|Fecha de expedición',
  'registrado_por:integer:fk=funcionarios.id_funcionario|Registrador que lo expidió',
], docRows);
const verificaciones = table('verificaciones', 'Verificaciones de identidad. Todo documento debe tener una antes de ser válido.', [
  'id_verificacion:integer:pk|Identificador',
  'id_documento:integer:fk=documentos.id_documento|Documento verificado',
  'fecha:date|Fecha',
  'metodo:text|biométrica o presencial',
  'resultado:text|aprobada o rechazada',
  'verificado_por:integer:fk=funcionarios.id_funcionario|Verificador',
], verRows);

const sucursales = table('sucursales', 'Sucursales del Banco Mercantil de Bruma.', [
  'id_sucursal:integer:pk|Identificador',
  'nombre:text|Nombre',
  'gerente:text|Gerente',
], [
  [1, 'Sucursal Centro', 'Gilberto Mesa'],
  [2, 'Sucursal Norte', 'Carla Ruano'],
  [3, 'Sucursal Puerto', 'Marcela Duque'],
]);

const ctaRows: Cell[][] = [];
let cta = 90001;
const realAcc: string[] = [];
for (const p of perRows.slice(0, 40)) {
  const code = `CTA-${cta++}`;
  realAcc.push(code);
  ctaRows.push([code, p[0], R.int(1, 3), yyyy(2016, 2024), R.int(50, 9000) * 10]);
}
const vallejoAcc = 'CTA-90017';
ctaRows[16] = [vallejoAcc, vallejoPid, 1, '2012-03-15', 0];
const pazAcc = `CTA-${cta++}`;
ctaRows.push([pazAcc, pazPid, 2, '2010-06-01', 812000]);
const fakeAcc: string[] = [];
fakeIds.slice(0, 8).forEach((id, i) => {
  const code = `CTA-${cta++}`;
  fakeAcc.push(code);
  ctaRows.push([code, id, (i % 3) + 1, `2024-${String(9 + Math.floor(i / 3)).padStart(2, '0')}-${String(2 + i * 3).padStart(2, '0')}`, R.int(1, 20) * 10]);
});
const cuentas = table('cuentas', 'Cuentas bancarias abiertas con documento de identidad.', [
  'id_cuenta:text:pk|Número de cuenta',
  'id_persona:integer:fk=personas.id_persona|Titular',
  'id_sucursal:integer:fk=sucursales.id_sucursal|Sucursal de apertura',
  'fecha_apertura:date|Fecha de apertura',
  'saldo:numeric|Saldo actual (USD)',
], ctaRows);

const ops: Cell[][] = [];
let oid = 1;
for (const c of realAcc.filter((x) => x !== vallejoAcc)) {
  const n = R.int(2, 6);
  for (let k = 0; k < n; k++) {
    const tipo = R.pick(['depósito', 'retiro', 'transferencia']);
    ops.push([oid++, c, ts(`2024-${String(R.int(9, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}`, R.int(480, 1080)), tipo, R.int(20, 4000), tipo === 'transferencia' ? R.pick(realAcc.filter((x) => x !== vallejoAcc && x !== c)) : null]);
  }
}
for (const m of [52000, 61000, 48000]) ops.push([oid++, pazAcc, ts(`2024-${String(R.int(9, 12)).padStart(2, '0')}-1${R.int(0, 9)}`, R.int(540, 900)), 'depósito', m, null]);
let toVallejo = 0;
fakeAcc.forEach((c, i) => {
  let acc = 0;
  for (let k = 0; k < 5; k++) {
    const m = R.int(90, 99) * 100;
    acc += m;
    ops.push([oid++, c, ts(`2024-${String(10 + Math.floor(k / 2)).padStart(2, '0')}-${String(3 + i + k * 4).padStart(2, '0')}`, R.int(540, 960)), 'depósito', m, null]);
  }
  const out = acc - 200;
  toVallejo += out;
  ops.push([oid++, c, ts('2024-12-' + String(10 + i).padStart(2, '0'), 600 + i * 7), 'transferencia', out, vallejoAcc]);
});
ops.push([oid++, vallejoAcc, ts('2024-12-20', 610), 'retiro', 30000, null], [oid++, vallejoAcc, ts('2024-12-21', 615), 'retiro', 30000, null]);
ops.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const operaciones = table('operaciones', 'Movimientos bancarios (sep–dic 2024).', [
  'id_operacion:integer:pk|Identificador',
  'id_cuenta:text:fk=cuentas.id_cuenta|Cuenta',
  'fecha_hora:timestamp|Momento',
  'tipo:text|depósito, retiro o transferencia',
  'monto:numeric|Monto (USD)',
  'cuenta_destino:text:null:fk=cuentas.id_cuenta|Cuenta destino (transferencias)',
], ops.map((o, i) => [i + 1, o[1], o[2], o[3], o[4], o[5]]));

const nPulidoVerified = docRows.filter((d) => d[5] === 3).filter((d) => verRows.some((v) => v[1] === d[0])).length;

export const case11: CaseDef = {
  id: 11,
  code: 'EXP-11',
  title: 'La red de identidades falsas',
  level: 3,
  tagline: 'Ocho ciudadanos que nunca existieron abrieron cuentas bancarias y movieron miles de dólares.',
  location: 'Registro Civil de Bruma y Banco Mercantil',
  date: 'Enero de 2025',
  scene: 'red',
  briefing: [
    'El Banco Mercantil reportó cuentas que recibían depósitos fraccionados —siempre por debajo de 10.000 USD— y luego transferían todo a una misma cuenta.',
    'Los titulares de esas cuentas tienen cédulas expedidas por el Registro Civil. Sin embargo, nadie los conoce en las direcciones declaradas.',
    'Por norma, todo documento debe tener una verificación de identidad. Encontrar lo que FALTA es tan importante como encontrar lo que está: necesitarás LEFT JOIN.',
  ],
  timeline: [
    { time: 'Ago–Nov 2024', event: 'Se expiden cédulas sospechosas.' },
    { time: 'Sep–Nov 2024', event: 'Se abren cuentas con esas cédulas.' },
    { time: 'Dic 2024', event: 'Transferencias masivas a una sola cuenta.' },
  ],
  concepts: ['LEFT JOIN', 'IS NULL', 'RIGHT JOIN', 'Varios JOIN', 'GROUP BY', 'HAVING', 'SUM'],
  tables: [direcciones, funcionarios, personas, documentos, verificaciones, sucursales, cuentas, operaciones],
  characters: [
    {
      id: 'vallejo', name: 'Leandro Vallejo', role: 'Registrador, Oficina Centro', age: 43, suspect: true,
      bio: 'Expide cédulas desde hace quince años. Tiene fama de eficiente: «nunca deja una fila esperando».',
      statement: 'Yo expido documentos; verificarlos es trabajo de otro departamento.',
      look: { skin: 2, hair: 'corto', hairColor: 1, accessory: 'gafas', outfitStyle: 'camisa', outfit: 6 },
      questions: [
        { id: 'q1', text: '¿Envía todos los documentos a verificación?', answer: 'Todos. El sistema lo hace automáticamente… casi siempre.' },
        { id: 'q2', text: 'Ocho cédulas que usted expidió no tienen ninguna verificación.', answer: 'Fallas del sistema. Si la verificación no se generó, no es culpa mía.', requires: ['E2'], contradiction: true },
        { id: 'q3', text: 'Dos documentos suyos fueron rechazados por la verificadora y después dejó de enviarlos.', answer: 'Eso… no tiene relación.', requires: ['E10'], contradiction: true },
        { id: 'q4', text: 'Las ocho cuentas transfirieron todo a la CTA-90017. Usted es el titular.', answer: 'Quiero un abogado.', requires: ['E5'], contradiction: true, note: 'Vallejo se niega a explicar las transferencias a su cuenta.' },
      ],
    },
    {
      id: 'pulido', name: 'Óscar Pulido', role: 'Registrador, Oficina Norte', age: 39, suspect: true,
      bio: 'Compañero de Vallejo. Tiene acceso al mismo sistema de expedición.',
      statement: 'Todos mis documentos pasan por verificación. Puede revisarlo.',
      look: { skin: 4, hair: 'rizado', hairColor: 0, outfitStyle: 'sueter', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Pudo alguien usar su usuario?', answer: 'Mi usuario solo funciona en la Oficina Norte. Las cédulas falsas salieron del Centro, ¿no?' },
      ],
    },
    {
      id: 'lucumi', name: 'Dora Lucumí', role: 'Verificadora biométrica', age: 50, suspect: true,
      bio: 'Verifica huellas y fotografías. Si las verificaciones faltan, ella debería haberlo notado.',
      statement: 'Yo verifico lo que me llega. Lo que no me envían, no lo veo.',
      look: { skin: 5, hair: 'coleta', hairColor: 0, accessory: 'gafas', outfitStyle: 'bata', outfit: 0 },
      questions: [
        { id: 'q1', text: '¿Rechazó documentos sospechosos?', answer: 'Dos, en junio y julio. Las huellas no correspondían a ninguna persona registrada. Los dos venían de la Oficina Centro.', note: 'Lucumí rechazó dos documentos de la Oficina Centro por huellas inexistentes.' },
      ],
    },
    {
      id: 'duque', name: 'Marcela Duque', role: 'Gerente, Sucursal Puerto', age: 46, suspect: true,
      bio: 'Su sucursal abrió algunas de las cuentas sospechosas.',
      statement: 'Abrimos cuentas con documentos oficiales. No somos el Registro Civil.',
      look: { skin: 1, hair: 'largo', hairColor: 4, accessory: 'aretes', outfitStyle: 'traje', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿Todas las cuentas sospechosas se abrieron en su sucursal?', answer: 'No. Revise: se abrieron en las tres sucursales, como para no llamar la atención.' },
      ],
    },
    {
      id: 'paz', name: 'Nicanor Paz', role: 'Comerciante (antecedentes de usura)', age: 59, suspect: true,
      bio: 'Conocido prestamista. Su cuenta recibe depósitos grandes con frecuencia.',
      statement: 'Mi dinero es legal y mi cédula también. Pregunten a quien quieran.',
      look: { skin: 3, hair: 'calvo', hairColor: 7, facial: 'barba', accessory: 'sombrero', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Conoce a Leandro Vallejo?', answer: 'Me expidió un duplicado hace años. Hombre rápido. Demasiado rápido, diría yo.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Documentos sin verificar', description: 'Con LEFT JOIN entre documentos y verificaciones aparecen 10 documentos sin verificación: 2 recientes de enero de 2025 y 8 cédulas CC-77001xx de 2024.', reference: 'SELECT d.numero, d.fecha_expedicion, d.registrado_por FROM documentos d LEFT JOIN verificaciones v ON d.id_documento = v.id_documento WHERE v.id_verificacion IS NULL;', match: { all: [['CC-7700101'], ['CC-7700108']], maxRows: 15, anyFeature: ['left_join', 'right_join', 'subquery'] } },
    { id: 'E2', key: true, title: 'Un solo registrador', description: 'Agrupando los documentos sin verificación de 2024 por registrador: los 8 los expidió Leandro Vallejo.', reference: "SELECT f.apellido, COUNT(*) FROM documentos d LEFT JOIN verificaciones v ON d.id_documento = v.id_documento INNER JOIN funcionarios f ON d.registrado_por = f.id_funcionario WHERE v.id_verificacion IS NULL AND d.fecha_expedicion < '2025-01-01' GROUP BY f.apellido;", match: { any: [['Vallejo', '8'], ['2', '8']], maxRows: 6, features: ['aggregate'], anyFeature: ['left_join', 'right_join', 'subquery'] }, implicates: ['vallejo'] },
    { id: 'E3', key: true, title: 'Teléfonos compartidos', description: 'Dos teléfonos (320-555-0101 y 320-555-0102) están declarados por 5 personas cada uno: las identidades falsas comparten contacto.', reference: 'SELECT telefono, COUNT(*) FROM personas GROUP BY telefono HAVING COUNT(*) > 1;', match: { all: [['320-555-0101', '5'], ['320-555-0102', '5']], maxRows: 6, features: ['aggregate'] } },
    { id: 'E4', key: true, title: 'Todo va a una cuenta', description: `Las transferencias de las cuentas sospechosas suman ${toVallejo} USD con destino a la cuenta CTA-90017.`, reference: "SELECT cuenta_destino, COUNT(*), SUM(monto) FROM operaciones WHERE tipo = 'transferencia' GROUP BY cuenta_destino HAVING SUM(monto) > 20000;", match: { any: [['CTA-90017', String(toVallejo)]], maxRows: 10, features: ['aggregate'] }, implicates: ['vallejo'] },
    { id: 'E5', key: true, title: 'El titular de la CTA-90017', description: 'La cuenta CTA-90017 pertenece a Leandro Vallejo.', reference: "SELECT c.id_cuenta, p.nombre, p.apellido FROM cuentas c INNER JOIN personas p ON c.id_persona = p.id_persona WHERE c.id_cuenta = 'CTA-90017';", match: { any: [['CTA-90017', 'Vallejo']], maxRows: 3, features: ['join'] }, implicates: ['vallejo'] },
    { id: 'E6', title: 'Direcciones imposibles', description: 'Varias identidades declaran vivir en un lote sin construir y en una bodega abandonada.', reference: 'SELECT d.calle, COUNT(*) FROM personas p INNER JOIN direcciones d ON p.id_direccion = d.id_direccion GROUP BY d.calle HAVING COUNT(*) >= 4;', match: { any: [['Lote 14']], maxRows: 6, features: ['aggregate'] } },
    { id: 'E7', title: 'El otro registrador', description: `Todos los documentos de Óscar Pulido tienen verificación (${nPulidoVerified} verificados); su único documento pendiente es de enero de 2025.`, reference: 'SELECT f.apellido, COUNT(v.id_verificacion) AS verificados, COUNT(*) AS expedidos FROM documentos d INNER JOIN funcionarios f ON d.registrado_por = f.id_funcionario LEFT JOIN verificaciones v ON v.id_documento = d.id_documento GROUP BY f.apellido;', match: { any: [['Pulido', String(nPulidoVerified)]], maxRows: 6, features: ['aggregate'] }, clears: ['pulido'] },
    { id: 'E8', title: 'Tres sucursales', description: 'Las cuentas de personas sin verificación se abrieron en las tres sucursales del banco, no solo en la de Marcela Duque.', reference: 'SELECT s.nombre, COUNT(*) FROM cuentas c INNER JOIN sucursales s ON c.id_sucursal = s.id_sucursal INNER JOIN documentos d ON d.id_persona = c.id_persona LEFT JOIN verificaciones v ON v.id_documento = d.id_documento WHERE v.id_verificacion IS NULL GROUP BY s.nombre;', match: { all: [['Centro'], ['Norte'], ['Puerto']], maxRows: 4, features: ['aggregate'], anyFeature: ['left_join', 'right_join', 'subquery'] }, clears: ['duque'] },
    { id: 'E9', title: 'El prestamista está en regla', description: 'La cédula de Nicanor Paz fue verificada y aprobada en 2018.', reference: "SELECT p.nombre, p.apellido, d.numero, v.resultado FROM personas p INNER JOIN documentos d ON p.id_persona = d.id_persona LEFT JOIN verificaciones v ON v.id_documento = d.id_documento WHERE p.apellido = 'Paz';", match: { any: [['Paz', 'aprobada']], maxRows: 3, features: ['join'] }, clears: ['paz'] },
    { id: 'E10', title: 'Rechazos de la verificadora', description: 'Dora Lucumí rechazó en 2024 dos cédulas (CC-7700091 y CC-7700092) expedidas por el registrador 2: después de eso, sus documentos sospechosos dejaron de llegar a verificación.', reference: "SELECT d.numero, d.registrado_por, v.resultado, f.apellido AS verificadora FROM verificaciones v INNER JOIN documentos d ON v.id_documento = d.id_documento INNER JOIN funcionarios f ON v.verificado_por = f.id_funcionario WHERE v.resultado = 'rechazada' AND v.fecha >= '2024-01-01';", match: { all: [['CC-7700091', 'Lucumí'], ['CC-7700092', 'Lucumí']], maxRows: 10, features: ['join'] }, implicates: ['vallejo'], clears: ['lucumi'] },
  ],
  objectives: [
    { id: 'O1', title: 'Detectar identidades sin verificar', description: 'Encuentra documentos que no tienen verificación y quién los expidió.', evidence: ['E1', 'E2'], tables: ['documentos', 'verificaciones', 'funcionarios'] },
    { id: 'O2', title: 'Encontrar los vínculos', description: '¿Qué tienen en común las identidades sospechosas?', evidence: ['E3', 'E6'], need: 1, tables: ['personas', 'direcciones'] },
    { id: 'O3', title: 'Seguir el dinero', description: '¿A dónde va el dinero de las cuentas sospechosas y de quién es?', evidence: ['E4', 'E5'], tables: ['operaciones', 'cuentas'] },
    { id: 'O4', title: 'Descartar a los involucrados', description: 'Registrador, verificadora, gerente y prestamista.', evidence: ['E7', 'E8', 'E9', 'E10'], need: 2, tables: ['sucursales', 'verificaciones', 'cuentas'] },
  ],
  hints: [
    { id: 'H1', title: 'Lo que falta', evidence: 'E1', levels: ['Un documento sin verificación no aparece en un INNER JOIN… porque no tiene pareja.', 'Usa documentos como tabla principal y une verificaciones conservando los documentos sin pareja.', 'documentos d LEFT JOIN verificaciones v ON d.id_documento = v.id_documento WHERE v.id_verificacion IS NULL'] },
    { id: 'H2', title: '¿Quién los expidió?', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Todos los documentos tienen un registrador.', 'Agrupa los documentos sin verificación por registrado_por (y une funcionarios para el nombre).', 'Combina el LEFT JOIN con INNER JOIN funcionarios y GROUP BY apellido.'] },
    { id: 'H3', title: 'Contactos repetidos', evidence: 'E3', levels: ['Las identidades falsas suelen compartir datos de contacto.', 'Agrupa personas por teléfono.', 'GROUP BY telefono HAVING COUNT(*) > 1'] },
    { id: 'H4', title: 'Seguir el dinero', evidence: 'E4', levels: ['Las cuentas sospechosas no gastan: transfieren.', 'Agrupa las transferencias por cuenta_destino y suma montos.', "WHERE tipo = 'transferencia' GROUP BY cuenta_destino con SUM(monto)"] },
    { id: 'H5', title: 'El destino final', evidence: 'E5', requires: { evidence: ['E4'] }, levels: ['Una cuenta tiene titular.', 'Une cuentas con personas.', "INNER JOIN personas ON cuentas.id_persona = personas.id_persona WHERE id_cuenta = '…'"] },
    { id: 'H6', title: '¿Dónde viven?', evidence: 'E6', levels: ['¿Las direcciones declaradas existen de verdad?', 'Cuenta cuántas personas declaran cada dirección.', 'JOIN personas con direcciones, GROUP BY calle HAVING COUNT(*) >= 4'] },
    { id: 'H7', title: 'Comparar registradores', evidence: 'E7', levels: ['¿Otros registradores también tienen documentos sin verificar?', 'Cuenta expedidos y verificados por registrador. COUNT(columna) no cuenta los NULL.', 'LEFT JOIN verificaciones y usa COUNT(v.id_verificacion) junto a COUNT(*).'] },
    { id: 'H8', title: 'Las sucursales', evidence: 'E8', levels: ['¿Se abrieron todas las cuentas en la misma sucursal?', 'Une cuentas, sucursales y documentos; filtra los que no tienen verificación.', 'Cuatro tablas: dos INNER JOIN, un LEFT JOIN y GROUP BY sucursal.'] },
    { id: 'H9', title: 'El prestamista', evidence: 'E9', levels: ['Que alguien tenga mucho dinero no lo convierte en falsificador.', 'Revisa la verificación del documento de Nicanor Paz.', 'personas → documentos → verificaciones, filtrando por apellido.'] },
    { id: 'H10', title: 'Los rechazos', evidence: 'E10', levels: ['La verificadora dice que rechazó documentos sospechosos.', 'Busca verificaciones rechazadas en 2024 y quién expidió esos documentos.', 'verificaciones → documentos → funcionarios con WHERE resultado = rechazada.'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'vallejo',
    motive: 'Lavar dinero para una red de contrabando a cambio de una comisión, usando identidades que él mismo fabricaba.',
    opportunity: 'Como registrador podía expedir cédulas; tras dos rechazos, aprendió a no enviarlas a verificación.',
    method: 'Expidió ocho cédulas falsas sin verificación, con teléfonos y direcciones repetidas; con ellas se abrieron cuentas en tres sucursales que recibían depósitos fraccionados y transferían todo a su cuenta CTA-90017.',
    justification: 'Las 8 cédulas sin verificación son suyas, dos documentos previos suyos fueron rechazados y el dinero termina en su propia cuenta.',
    eliminations: {
      pulido: { evidence: ['E7'], explanation: 'Todos sus documentos de 2024 están verificados.' },
      lucumi: { evidence: ['E10'], explanation: 'Rechazó los documentos falsos que le llegaron; los demás nunca se los enviaron.' },
      duque: { evidence: ['E8'], explanation: 'Las cuentas se repartieron entre las tres sucursales.' },
      paz: { evidence: ['E9'], explanation: 'Su cédula está verificada; sus depósitos no se relacionan con la red.' },
    },
    incriminating: ['E2', 'E4', 'E5', 'E10'],
    reveal: [
      'Leandro Vallejo fabricó diez ciudadanos. Cuando la verificadora rechazó los dos primeros, entendió el truco: simplemente no enviarlos.',
      'Ocho identidades sin verificar abrieron cuentas en tres sucursales. Los depósitos nunca superaban 10.000 dólares para no activar alertas.',
      'El rastro terminaba en la cuenta que Vallejo tenía desde 2012. Lo que el sistema no registró —las verificaciones ausentes— fue lo que lo delató.',
    ],
  },
  references: [
    { title: 'Funcionarios', sql: 'SELECT * FROM funcionarios;' },
    { title: 'Documentos por registrador', sql: 'SELECT registrado_por, COUNT(*) FROM documentos GROUP BY registrado_por;' },
    { title: 'Verificaciones rechazadas', sql: "SELECT * FROM verificaciones WHERE resultado = 'rechazada';" },
    { title: 'Personas del barrio El Recreo', sql: "SELECT p.nombre, p.apellido, d.calle FROM personas p INNER JOIN direcciones d ON p.id_direccion = d.id_direccion WHERE d.barrio = 'El Recreo';" },
    { title: 'Depósitos fraccionados', sql: "SELECT id_cuenta, COUNT(*) FROM operaciones WHERE tipo = 'depósito' AND monto BETWEEN 9000 AND 9999 GROUP BY id_cuenta HAVING COUNT(*) >= 3;" },
    { title: 'Cuentas abiertas en 2024', sql: "SELECT * FROM cuentas WHERE fecha_apertura >= '2024-01-01' ORDER BY fecha_apertura;" },
    { title: 'Cuentas sin movimientos (LEFT JOIN)', sql: 'SELECT c.id_cuenta FROM cuentas c LEFT JOIN operaciones o ON c.id_cuenta = o.id_cuenta WHERE o.id_operacion IS NULL;' },
    { title: 'Movimientos con titular (RIGHT JOIN)', sql: 'SELECT p.apellido, o.tipo, o.monto FROM personas p RIGHT JOIN cuentas c ON p.id_persona = c.id_persona INNER JOIN operaciones o ON o.id_cuenta = c.id_cuenta WHERE o.monto > 40000;' },
    { title: 'Saldo total por sucursal', sql: 'SELECT s.nombre, SUM(c.saldo) FROM cuentas c INNER JOIN sucursales s ON c.id_sucursal = s.id_sucursal GROUP BY s.nombre;' },
    { title: 'Personas con teléfono 320', sql: "SELECT * FROM personas WHERE telefono LIKE '320%';" },
    { title: 'Retiros grandes', sql: "SELECT * FROM operaciones WHERE tipo = 'retiro' AND monto >= 10000;" },
  ],
};
