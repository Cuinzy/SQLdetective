import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts } from './helpers';

// CASO 15 — El archivo maestro
// Autor intelectual: Sebastián Lombana (representante de Lombana Desarrollos).
// El incendio del Archivo Histórico (5 dic, 02:30) destruyó los títulos de tierras de una demanda contra él.
// Cadena: Lombana Desarrollos → Consultora Sigma (25.000, 28 nov) → tres ejecutores (1 dic).
// Lombana habló 6 veces con Peláez (representante de Sigma), se reunió con él en el Mirador del Río (23:10)
// y su camioneta pasó por la Av. del Archivo a las 01:55. Su esposa le dio una coartada falsa.

const R = rng(1515);
const EXCL = ['Lombana', 'Barco', 'Holguín', 'Sanabria', 'Elejalde', 'Peláez', 'Páez', 'Galindo', 'Escobar', 'Ospina'];

const fill = namePool(R, 28, EXCL);
const keyPeople: Cell[][] = [
  [1, 'Sebastián', 'Lombana', 'Promotor inmobiliario', '300-555-7001'],
  [2, 'Renata', 'Ospina', 'Esposa de S. Lombana', '300-555-7003'],
  [3, 'Darío', 'Peláez', 'Consultor', '300-555-7002'],
  [4, 'Rigoberto', 'Páez', 'Transportador', '311-555-1101'],
  [5, 'Fermín', 'Galindo', 'Vigilante del Archivo', '311-555-1102'],
  [6, 'Nubia', 'Escobar', 'Auxiliar de archivo', '311-555-1103'],
  [7, 'Clara Inés', 'Barco', 'Concejala', '300-555-7101'],
  [8, 'Patricio', 'Holguín', 'Promotor inmobiliario', '300-555-7201'],
  [9, 'Gloria Esther', 'Sanabria', 'Directora del Archivo Histórico', '300-555-7301'],
  [10, 'Mauricio', 'Elejalde', 'Abogado', '300-555-7401'],
];
const perRows: Cell[][] = [...keyPeople];
fill.forEach((n, i) => perRows.push([20 + i, n.nombre, n.apellido, R.pick(['Comerciante', 'Contadora', 'Ingeniero', 'Docente', 'Arquitecta', 'Conductor', 'Funcionaria municipal']), `3${R.int(10, 29)}-555-${String(R.int(2000, 9999))}`]));
const personas = table('personas', 'Personas relacionadas con la investigación.', [
  'id_persona:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'ocupacion:text|Ocupación',
  'telefono:text|Teléfono',
], perRows);
const phoneOf = (id: number) => perRows.find((p) => p[0] === id)![4] as string;

const empresas = table('empresas', 'Empresas y sus representantes legales.', [
  'id_empresa:integer:pk|Identificador',
  'razon_social:text|Razón social',
  'sector:text|Sector',
  'representante:integer:fk=personas.id_persona|Representante legal',
], [
  [1, 'Lombana Desarrollos S.A.S.', 'Inmobiliario', 1],
  [2, 'Consultora Sigma Ltda.', 'Consultoría', 3],
  [3, 'Holguín & Asociados', 'Inmobiliario', 8],
  [4, 'Campaña Barco al Concejo', 'Político', 7],
  [5, 'Elejalde Abogados', 'Legal', 10],
  [6, 'Transportes del Litoral', 'Transporte', 24],
  [7, 'Ferretería La Llave', 'Comercio', 27],
]);

const ctaRows: Cell[][] = [];
let cid = 1;
const ctaPersona = new Map<number, number>();
const ctaEmpresa = new Map<number, number>();
for (const p of perRows) {
  if ([2].includes(p[0] as number)) continue;
  ctaPersona.set(p[0] as number, cid);
  ctaRows.push([cid++, p[0], null, R.pick(['Banco Mercantil', 'Banco del Puerto', 'Cooperativa Bruma'])]);
}
for (let e = 1; e <= 7; e++) {
  ctaEmpresa.set(e, cid);
  ctaRows.push([cid++, null, e, R.pick(['Banco Mercantil', 'Banco del Puerto'])]);
}
const cuentas = table('cuentas', 'Cuentas bancarias (de una persona o de una empresa).', [
  'id_cuenta:integer:pk|Identificador',
  'id_persona:integer:null:fk=personas.id_persona|Titular persona (si aplica)',
  'id_empresa:integer:null:fk=empresas.id_empresa|Titular empresa (si aplica)',
  'banco:text|Banco',
], ctaRows);

const trx: Cell[][] = [];
const sigma = ctaEmpresa.get(2)!;
const lombanaDes = ctaEmpresa.get(1)!;
const allCtas = ctaRows.map((c) => c[0] as number).filter((c) => c !== sigma);
for (let i = 0; i < 130; i++) {
  const o = R.pick(allCtas);
  let d = R.pick(allCtas);
  if (d === o) d = allCtas[(allCtas.indexOf(o) + 1) % allCtas.length];
  trx.push([o, d, ts(`2025-${R.pick(['10', '11', '12'])}-${String(R.int(1, 28)).padStart(2, '0')}`, R.int(480, 1080)), R.int(10, 900) * 10, R.pick(['pago de factura', 'arriendo', 'préstamo', 'servicios', 'compra'])]);
}
trx.push([lombanaDes, sigma, '2025-11-28 10:15:00', 25000, 'asesoría estratégica']);
trx.push([sigma, ctaPersona.get(4)!, '2025-12-01 09:05:00', 8000, 'transporte']);
trx.push([sigma, ctaPersona.get(5)!, '2025-12-01 09:07:00', 6000, 'servicios']);
trx.push([sigma, ctaPersona.get(6)!, '2025-12-01 09:10:00', 5000, 'digitalización']);
trx.push([sigma, ctaPersona.get(3)!, '2025-12-02 11:00:00', 4000, 'honorarios']);
trx.push([lombanaDes, ctaEmpresa.get(4)!, '2025-10-02 15:30:00', 10000, 'donación de campaña']);
trx.push([lombanaDes, ctaEmpresa.get(5)!, '2025-11-15 12:00:00', 7500, 'honorarios jurídicos']);
trx.push([ctaEmpresa.get(3)!, ctaEmpresa.get(6)!, '2025-11-20 16:00:00', 3200, 'transporte de materiales']);
trx.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const transferencias = table('transferencias', 'Transferencias bancarias (octubre–diciembre de 2025).', [
  'id_transferencia:integer:pk|Identificador',
  'cuenta_origen:integer:fk=cuentas.id_cuenta|Cuenta que envía',
  'cuenta_destino:integer:fk=cuentas.id_cuenta|Cuenta que recibe',
  'fecha_hora:timestamp|Momento',
  'monto:numeric|Monto (USD)',
  'concepto:text|Concepto declarado',
], trx.map((t, i) => [i + 1, ...t]));

const cl: Cell[][] = [];
const randPhones = perRows.slice(10).map((p) => p[4] as string);
for (let i = 0; i < 200; i++) {
  const o = R.pick(randPhones);
  const d = R.pick([...randPhones, phoneOf(7), phoneOf(8), phoneOf(9), phoneOf(10)].filter((x) => x !== o));
  cl.push([o, d, ts(`2025-${R.pick(['11', '12'])}-${String(R.int(1, 4)).padStart(2, '0')}`, R.int(420, 1300)), R.int(15, 600)]);
}
const LP = [['2025-11-20', 610, 1, 3], ['2025-11-24', 900, 3, 1], ['2025-11-27', 1210, 1, 3], ['2025-11-30', 800, 3, 1], ['2025-12-03', 1350, 1, 3], ['2025-12-04', 1290, 1, 3]] as [string, number, number, number][];
for (const [d, m, a, b] of LP) cl.push([phoneOf(a), phoneOf(b), ts(d, m), R.int(60, 400)]);
for (const ex of [4, 5, 6]) for (const d of ['2025-11-25', '2025-11-29', '2025-12-04']) cl.push([phoneOf(3), phoneOf(ex), ts(d, R.int(600, 1200)), R.int(40, 200)]);
for (const d of ['2025-11-03', '2025-11-10', '2025-11-14', '2025-11-21', '2025-11-26', '2025-12-01', '2025-12-02', '2025-12-03']) {
  const a = R.pick([1, 10]);
  cl.push([phoneOf(a), phoneOf(a === 1 ? 10 : 1), ts(d, R.int(540, 1000)), R.int(120, 900)]);
}
cl.push([phoneOf(8), phoneOf(5), '2025-10-15 11:20:00', 210]);
cl.push([phoneOf(9), '119', '2025-12-05 02:44:00', 95]);
cl.push([phoneOf(2), phoneOf(1), '2025-12-05 01:40:00', 30]);
cl.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const llamadas = table('llamadas', 'Registros de llamadas obtenidos por orden judicial (119 = bomberos).', [
  'id_llamada:integer:pk|Identificador',
  'telefono_origen:text|Origen',
  'telefono_destino:text|Destino',
  'fecha_hora:timestamp|Inicio',
  'duracion_seg:integer|Duración (segundos)',
], cl.map((c, i) => [i + 1, ...c]));

const vehRows: Cell[][] = [
  ['LMB-001', 1, 'Camioneta Volvo XC90 negra'],
  ['PLZ-220', 3, 'Sedán Toyota gris'],
  ['TRK-905', 4, 'Camión Chevrolet NPR'],
  ['BRC-118', 7, 'Hatchback Kia blanco'],
  ['HLG-777', 8, 'Camioneta BMW X5 azul'],
  ['SNB-310', 9, 'Sedán Mazda rojo'],
  ['ELJ-404', 10, 'Sedán Audi A4 plata'],
];
const L = 'ABCDEFGHJKMNPRSTUVWXYZ';
for (let i = 0; i < 24; i++) vehRows.push([`${L[R.int(0, 21)]}${L[R.int(0, 21)]}${L[R.int(0, 21)]}-${R.int(100, 999)}`, 20 + i, R.pick(['Sedán', 'Camioneta', 'Motocicleta', 'Furgón'])]);
const vehiculos = table('vehiculos', 'Vehículos registrados a nombre de las personas investigadas.', [
  'placa:text:pk|Placa',
  'id_propietario:integer:fk=personas.id_persona|Propietario',
  'descripcion:text|Descripción',
], vehRows);

const lec: Cell[][] = [];
const camaras = ['Centro', 'Zona Industrial', 'Barrio El Bosque', 'Mirador del Río', 'Av. del Archivo', 'Concejo Municipal', 'Barrio Alameda', 'Aeropuerto - parqueadero', 'Puerto Alto - peaje'];
for (const v of vehRows.slice(7)) {
  const n = R.int(1, 4);
  for (let k = 0; k < n; k++) {
    const night = R.chance(0.4);
    const cam = night ? R.pick(['Centro', 'Zona Industrial', 'Barrio Alameda']) : R.pick(camaras.slice(0, 6));
    lec.push([v[0], cam, night ? ts('2025-12-05', R.int(0, 300)) : ts('2025-12-04', R.int(480, 1080))]);
  }
}
const add = (p: string, c: string, t: string) => lec.push([p, c, t]);
add('LMB-001', 'Barrio El Bosque', '2025-12-04 22:30:00'); add('LMB-001', 'Mirador del Río', '2025-12-04 23:12:00'); add('LMB-001', 'Mirador del Río', '2025-12-05 00:40:00');
add('LMB-001', 'Av. del Archivo', '2025-12-05 01:55:00'); add('LMB-001', 'Barrio El Bosque', '2025-12-05 02:20:00');
add('PLZ-220', 'Mirador del Río', '2025-12-04 23:05:00'); add('PLZ-220', 'Centro', '2025-12-05 00:50:00');
add('TRK-905', 'Zona Industrial', '2025-12-05 01:30:00'); add('TRK-905', 'Av. del Archivo', '2025-12-05 02:10:00'); add('TRK-905', 'Zona Industrial', '2025-12-05 02:50:00');
add('BRC-118', 'Concejo Municipal', '2025-12-04 22:58:00'); add('BRC-118', 'Barrio Alameda', '2025-12-04 23:31:00');
add('HLG-777', 'Aeropuerto - parqueadero', '2025-12-03 06:10:00');
add('ELJ-404', 'Puerto Alto - peaje', '2025-12-04 21:00:00'); add('ELJ-404', 'Puerto Alto - peaje', '2025-12-05 09:30:00');
add('SNB-310', 'Centro', '2025-12-04 18:20:00'); add('SNB-310', 'Av. del Archivo', '2025-12-05 03:05:00');
lec.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
const lecturas = table('lecturas_placa', 'Lecturas de cámaras de placas (3 al 5 de diciembre).', [
  'id_lectura:integer:pk|Identificador',
  'placa:text:fk=vehiculos.placa|Placa',
  'camara:text|Ubicación de la cámara',
  'fecha_hora:timestamp|Momento',
], lec.map((l, i) => [i + 1, ...l]));

const testimonios = table('testimonios', 'Declaraciones recogidas tras el incendio.', [
  'id_testimonio:integer:pk|Identificador',
  'id_persona:integer:fk=personas.id_persona|Declarante',
  'fecha:date|Fecha',
  'declaracion:text|Declaración',
  'coartada_para:integer:null:fk=personas.id_persona|Persona a la que la declaración sirve de coartada',
], [
  [1, 1, '2025-12-06', 'Pasé toda la noche en casa con mi esposa. No conozco a ningún Peláez.', null],
  [2, 2, '2025-12-06', 'Mi esposo no salió de casa en toda la noche del 4 al 5 de diciembre.', 1],
  [3, 7, '2025-12-06', 'Presidí la sesión del Concejo hasta las 23:00 y me fui a casa.', null],
  [4, 8, '2025-12-07', 'Estoy en Ciudad de México desde el 3 de diciembre por una feria inmobiliaria.', null],
  [5, 9, '2025-12-05', 'La empresa de alarmas me despertó a las 02:40. Llamé a los bomberos y fui al archivo.', null],
  [6, 10, '2025-12-06', 'Viajé a Puerto Alto el 4 por una audiencia del día 5 a primera hora.', null],
  [7, 6, '2025-12-08', 'Retiré las cintas de respaldo el 4 porque el señor Peláez dijo que eran para digitalizarlas.', null],
  [8, 5, '2025-12-08', 'No voy a declarar.', null],
  [9, 4, '2025-12-08', 'Me pagaron por un transporte de bidones. El que me contrató se llama Peláez.', null],
  [10, 3, '2025-12-09', 'Soy consultor. Sigma presta servicios legítimos. Mis clientes son confidenciales.', null],
  [11, 20, '2025-12-06', 'Vi un camión blanco frente al archivo pasadas las dos de la mañana.', null],
  [12, 21, '2025-12-06', 'En el Mirador del Río había dos hombres hablando en voz baja hasta tarde.', null],
]);

export const case15: CaseDef = {
  id: 15,
  code: 'EXP-15',
  title: 'El archivo maestro',
  level: 3,
  tagline: 'Tres ejecutores detenidos, ninguno habla. ¿Quién ordenó quemar el archivo?',
  location: 'Archivo Histórico Municipal de Bruma',
  date: '5 de diciembre de 2025, 02:30',
  scene: 'maestro',
  briefing: [
    'A las 02:30 del 5 de diciembre un incendio destruyó el ala de títulos de propiedad del Archivo Histórico. Entre los documentos perdidos estaban las pruebas de una demanda millonaria por tierras.',
    'La policía detuvo a tres ejecutores: el transportador que llevó combustible, el vigilante que apagó la alarma y la auxiliar que retiró las cintas de respaldo. Ninguno sabe —o dice— quién está detrás.',
    'Tu misión no es encontrar a los ejecutores, sino al AUTOR INTELECTUAL. Sigue el dinero, las llamadas, los vehículos y los testimonios: cada tabla es una pieza y solo encajan unidas.',
  ],
  timeline: [
    { time: '28 nov', event: 'Movimiento de dinero inusual.' },
    { time: '4 dic 23:00', event: 'Reunión nocturna en un mirador.' },
    { time: '5 dic 02:05', event: 'La alarma del archivo se desactiva.' },
    { time: '5 dic 02:30', event: 'Incendio.' },
  ],
  concepts: ['Múltiples JOIN', 'LEFT JOIN', 'Unir una tabla consigo misma', 'GROUP BY', 'HAVING', 'SUM / COUNT'],
  tables: [personas, empresas, cuentas, transferencias, llamadas, vehiculos, lecturas, testimonios],
  characters: [
    {
      id: 'lombana', name: 'Sebastián Lombana', role: 'Promotor inmobiliario', age: 56, suspect: true,
      bio: 'Dueño de Lombana Desarrollos. La demanda por tierras podía costarle tres urbanizaciones.',
      statement: 'Esa noche estaba en mi casa con mi esposa. No conozco a nadie llamado Peláez.',
      look: { skin: 1, hair: 'canoso', hairColor: 7, facial: 'perilla', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Qué ganaba usted con el incendio?', answer: 'Nada. La demanda la iba a ganar de todas formas.' },
        { id: 'q2', text: 'Lombana Desarrollos transfirió 25.000 USD a Consultora Sigma el 28 de noviembre.', answer: 'Una asesoría estratégica. Contratamos muchas.', requires: ['E2', 'E3'], contradiction: true },
        { id: 'q3', text: 'Usted habló seis veces con Darío Peláez, representante de Sigma.', answer: 'Hablo con muchos consultores. No recuerdo los nombres.', requires: ['E4'], contradiction: true },
        { id: 'q4', text: 'Su camioneta pasó por la Av. del Archivo a las 01:55, media hora antes del incendio.', answer: '…Hablaré solo en presencia de mi abogado.', requires: ['E5'], contradiction: true, note: 'Lombana se niega a explicar por qué estaba cerca del archivo.' },
      ],
    },
    {
      id: 'barco', name: 'Clara Inés Barco', role: 'Concejala', age: 49, suspect: true,
      bio: 'Se opuso al presupuesto del Archivo. Recibió una donación de campaña de Lombana Desarrollos.',
      statement: 'Presidí la sesión del Concejo hasta las once. La donación fue legal y está declarada.',
      look: { skin: 3, hair: 'corto', hairColor: 1, accessory: 'gafas', outfitStyle: 'traje', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Por qué se opuso al presupuesto del Archivo?', answer: 'Porque se caía a pedazos y nadie quería invertir. Irónico, ¿no?' },
      ],
    },
    {
      id: 'holguin', name: 'Patricio Holguín', role: 'Promotor inmobiliario rival', age: 61, suspect: true,
      bio: 'También tiene reclamaciones de tierras. El vigilante detenido trabajó antes para él.',
      statement: 'Estoy en Ciudad de México desde el 3. Llamé a Galindo en octubre por su liquidación, nada más.',
      look: { skin: 0, hair: 'calvo', hairColor: 7, facial: 'bigote', accessory: 'sombrero', outfitStyle: 'traje', outfit: 6, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Por qué llamó al vigilante Galindo?', answer: 'Trabajó en mis obras. En octubre le pagué la liquidación. Desde entonces, nada.' },
      ],
    },
    {
      id: 'sanabria', name: 'Gloria Esther Sanabria', role: 'Directora del Archivo Histórico', age: 58, suspect: true,
      bio: 'Firmó la orden de digitalización que justificó retirar las cintas de respaldo.',
      statement: 'La orden de digitalización era real. Alguien la aprovechó.',
      look: { skin: 2, hair: 'largo', hairColor: 6, accessory: 'gafas', outfitStyle: 'sueter', outfit: 2, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Conoce a Darío Peláez?', answer: 'Nunca lo había oído nombrar hasta que la auxiliar lo mencionó.' },
      ],
    },
    {
      id: 'elejalde', name: 'Mauricio Elejalde', role: 'Abogado de Lombana Desarrollos', age: 45, suspect: true,
      bio: 'Lleva la defensa en la demanda por tierras. Habla con Lombana casi a diario.',
      statement: 'Mi trabajo es ganar en los tribunales, no quemar archivos. Esa noche estaba en Puerto Alto.',
      look: { skin: 4, hair: 'corto', hairColor: 0, accessory: 'gafas', outfitStyle: 'traje', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿Sabía de los pagos a Sigma?', answer: 'No pasan por mi despacho. Lombana maneja sus cuentas personalmente.', note: 'Elejalde afirma que Lombana maneja las cuentas personalmente.' },
      ],
    },
    {
      id: 'pelaez', name: 'Darío Peláez', role: 'Representante de Consultora Sigma (intermediario detenido)', age: 41, suspect: false,
      bio: 'Pagó a los tres ejecutores. Se niega a revelar quién es su cliente.',
      statement: 'Mis clientes son confidenciales.',
      look: { skin: 2, hair: 'mono', hairColor: 1, facial: 'barba', outfitStyle: 'chaqueta', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Quién financió los pagos de Sigma?', answer: 'Revise las cuentas usted mismo, detective. Yo no diré nombres.', requires: ['E1'] },
        { id: 'q2', text: '¿Con quién estuvo en el Mirador del Río la noche del 4?', answer: 'Con un cliente que quería ver el río de noche. Muy romántico.', requires: ['E11'], contradiction: true },
      ],
    },
    {
      id: 'escobar', name: 'Nubia Escobar', role: 'Auxiliar de archivo (ejecutora detenida)', age: 33, suspect: false,
      bio: 'Retiró las cintas de respaldo el día anterior al incendio.',
      statement: 'Creí que era para digitalizar. El señor Peláez me pagó.',
      look: { skin: 5, hair: 'rizado', hairColor: 0, outfitStyle: 'camisa', outfit: 0, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿La directora sabía lo de las cintas?', answer: 'No. Ella firmó la digitalización hace meses; Peláez me dijo que era «el momento».' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Quién pagó a los ejecutores', description: 'El 1 de diciembre, la cuenta de Consultora Sigma transfirió 8.000, 6.000 y 5.000 USD a Páez, Galindo y Escobar.', reference: 'SELECT e.razon_social AS origen, p.apellido AS destinatario, t.monto, t.fecha_hora FROM transferencias t INNER JOIN cuentas co ON t.cuenta_origen = co.id_cuenta INNER JOIN empresas e ON co.id_empresa = e.id_empresa INNER JOIN cuentas cd ON t.cuenta_destino = cd.id_cuenta INNER JOIN personas p ON cd.id_persona = p.id_persona WHERE p.id_persona IN (4, 5, 6);', match: { all: [['Sigma', 'Páez'], ['Sigma', 'Galindo'], ['Sigma', 'Escobar']], maxRows: 20, features: ['join'] } },
    { id: 'E2', key: true, title: 'Quién financió a Sigma', description: 'La única cuenta que envió dinero a Consultora Sigma fue la de Lombana Desarrollos: 25.000 USD el 28 de noviembre.', reference: 'SELECT eo.razon_social AS origen, t.monto, t.fecha_hora, t.concepto FROM transferencias t INNER JOIN cuentas cd ON t.cuenta_destino = cd.id_cuenta INNER JOIN cuentas co ON t.cuenta_origen = co.id_cuenta LEFT JOIN empresas eo ON co.id_empresa = eo.id_empresa WHERE cd.id_empresa = 2;', match: { any: [['Lombana Desarrollos', '25000']], maxRows: 6, features: ['join'] }, implicates: ['lombana'] },
    { id: 'E3', key: true, title: 'Detrás de Lombana Desarrollos', description: 'El representante legal de Lombana Desarrollos S.A.S. es Sebastián Lombana; el de Consultora Sigma, Darío Peláez.', reference: 'SELECT e.razon_social, p.nombre, p.apellido FROM empresas e INNER JOIN personas p ON e.representante = p.id_persona;', match: { all: [['Lombana Desarrollos', 'Sebastián'], ['Sigma', 'Peláez']], maxRows: 10, features: ['join'] }, implicates: ['lombana'] },
    { id: 'E4', key: true, title: 'Llamadas con el intermediario', description: 'Uniendo personas dos veces (origen y destino): Sebastián Lombana y Darío Peláez hablaron 6 veces entre el 20 de noviembre y el 4 de diciembre.', reference: "SELECT po.apellido AS llama, pd.apellido AS recibe, COUNT(*) FROM llamadas l INNER JOIN personas po ON l.telefono_origen = po.telefono INNER JOIN personas pd ON l.telefono_destino = pd.telefono WHERE 'Peláez' IN (po.apellido, pd.apellido) GROUP BY po.apellido, pd.apellido;", match: { any: [['Lombana', 'Peláez']], maxRows: 12, features: ['join'] }, implicates: ['lombana'] },
    { id: 'E5', key: true, title: 'Cerca del archivo', description: 'La camioneta LMB-001 de Sebastián Lombana pasó por la cámara de la Av. del Archivo a las 01:55 del 5 de diciembre.', reference: "SELECT p.apellido, v.placa, l.camara, l.fecha_hora FROM lecturas_placa l INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN personas p ON v.id_propietario = p.id_persona WHERE l.camara = 'Av. del Archivo' AND l.fecha_hora BETWEEN '2025-12-05 00:00' AND '2025-12-05 04:00';", match: { any: [['Lombana', 'Av. del Archivo', '01:55'], ['LMB-001', '01:55']], maxRows: 15 }, implicates: ['lombana'] },
    { id: 'E6', title: 'Una coartada de casa', description: 'La única declaración que sirve de coartada a otra persona es la de Renata Ospina a favor de su esposo Sebastián Lombana, desmentida por las cámaras.', reference: 'SELECT d.apellido AS declarante, b.apellido AS beneficiario, t.declaracion FROM testimonios t INNER JOIN personas d ON t.id_persona = d.id_persona INNER JOIN personas b ON t.coartada_para = b.id_persona;', match: { any: [['Ospina', 'Lombana']], maxRows: 4, features: ['join'] }, implicates: ['lombana'] },
    { id: 'E7', title: 'La concejala se fue a casa', description: 'El auto de Clara Inés Barco pasó por el Concejo a las 22:58 y por el Barrio Alameda (su casa) a las 23:31; ninguna lectura después.', reference: "SELECT p.apellido, l.camara, l.fecha_hora FROM lecturas_placa l INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN personas p ON v.id_propietario = p.id_persona WHERE p.apellido = 'Barco';", match: { any: [['Barco', 'Alameda']], maxRows: 6, features: ['join'] }, clears: ['barco'] },
    { id: 'E8', title: 'El rival estaba de viaje', description: 'La camioneta de Patricio Holguín quedó en el parqueadero del aeropuerto el 3 de diciembre a las 06:10 y no volvió a moverse.', reference: "SELECT p.apellido, l.camara, l.fecha_hora FROM lecturas_placa l INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN personas p ON v.id_propietario = p.id_persona WHERE p.apellido = 'Holguín';", match: { any: [['Holguín', 'Aeropuerto']], maxRows: 4, features: ['join'] }, clears: ['holguin'] },
    { id: 'E9', title: 'El nombre que repiten los ejecutores', description: 'Las declaraciones de dos ejecutores mencionan a Peláez como quien los contrató; ninguna menciona a la directora.', reference: "SELECT p.apellido, t.declaracion FROM testimonios t INNER JOIN personas p ON t.id_persona = p.id_persona WHERE t.declaracion LIKE '%Peláez%';", match: { all: [['Escobar', 'Peláez'], ['Páez', 'Peláez']], maxRows: 6, features: ['join'] }, clears: ['sanabria'] },
    { id: 'E10', title: 'El abogado en Puerto Alto', description: 'El auto de Mauricio Elejalde pasó por el peaje de Puerto Alto el 4 a las 21:00 y regresó el 5 a las 09:30.', reference: "SELECT p.apellido, l.camara, l.fecha_hora FROM lecturas_placa l INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN personas p ON v.id_propietario = p.id_persona WHERE p.apellido = 'Elejalde';", match: { all: [['Elejalde', 'Puerto Alto', '2025-12-04 21:00'], ['Elejalde', 'Puerto Alto', '2025-12-05 09:30']], maxRows: 4, features: ['join'] }, clears: ['elejalde'] },
    { id: 'E11', title: 'Reunión en el Mirador', description: 'La camioneta de Lombana (23:12) y el auto de Peláez (23:05) fueron captados en el Mirador del Río la noche del 4 de diciembre.', reference: "SELECT p.apellido, l.fecha_hora FROM lecturas_placa l INNER JOIN vehiculos v ON l.placa = v.placa INNER JOIN personas p ON v.id_propietario = p.id_persona WHERE l.camara = 'Mirador del Río';", match: { all: [['Lombana', '23:12'], ['Peláez', '23:05']], maxRows: 8, features: ['join'] }, implicates: ['lombana'] },
  ],
  objectives: [
    { id: 'O1', title: 'Seguir el dinero', description: 'Desde los ejecutores hasta el origen de los fondos.', evidence: ['E1', 'E2', 'E3'], need: 2, tables: ['transferencias', 'cuentas', 'empresas'] },
    { id: 'O2', title: 'Reconstruir las comunicaciones', description: '¿Quién habló con el intermediario?', evidence: ['E4', 'E9'], need: 1, tables: ['llamadas', 'personas', 'testimonios'] },
    { id: 'O3', title: 'Rastrear los vehículos', description: '¿Quién estuvo dónde la noche del incendio?', evidence: ['E5', 'E11'], need: 1, tables: ['lecturas_placa', 'vehiculos'] },
    { id: 'O4', title: 'Contrastar testimonios', description: '¿Alguien cubre a alguien?', evidence: ['E6'], tables: ['testimonios'] },
    { id: 'O5', title: 'Descartar a los demás', description: 'Concejala, rival, directora y abogado.', evidence: ['E7', 'E8', 'E10'], need: 2, tables: ['lecturas_placa', 'vehiculos'] },
  ],
  hints: [
    { id: 'H1', title: 'El pago a los ejecutores', evidence: 'E1', levels: ['Nadie arriesga la cárcel gratis. Los ejecutores recibieron dinero.', 'transferencias usa cuentas; las cuentas pertenecen a personas o empresas.', 'Une transferencias con cuentas dos veces (origen y destino) y esas cuentas con empresas y personas.'] },
    { id: 'H2', title: '¿De dónde salió el dinero?', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Sigma pagó. ¿Quién le pagó a Sigma?', 'Busca transferencias cuya cuenta destino sea de la empresa 2.', 'Une la cuenta origen con empresas usando LEFT JOIN (el origen podría ser una persona).'] },
    { id: 'H3', title: 'Las caras detrás de las empresas', evidence: 'E3', levels: ['Las empresas tienen representantes legales.', 'Une empresas con personas.', 'INNER JOIN personas ON empresas.representante = personas.id_persona'] },
    { id: 'H4', title: 'El intermediario', evidence: 'E4', levels: ['Peláez no actúa solo. ¿Con quién habla?', 'Une llamadas con personas DOS veces: una por teléfono de origen y otra por destino.', 'Agrupa por los dos apellidos y cuenta las llamadas.'] },
    { id: 'H5', title: 'La noche del incendio', evidence: 'E5', levels: ['Hay una cámara en la Av. del Archivo.', 'Une lecturas_placa → vehiculos → personas y filtra la cámara y la madrugada del 5.', "WHERE camara = 'Av. del Archivo' AND fecha_hora BETWEEN …"] },
    { id: 'H6', title: 'Coartadas prestadas', evidence: 'E6', levels: ['Algunas declaraciones sirven para proteger a otra persona.', 'testimonios tiene la columna coartada_para.', 'Une personas dos veces: declarante y beneficiario.'] },
    { id: 'H7', title: 'La concejala', evidence: 'E7', levels: ['Recibió dinero de Lombana Desarrollos. ¿Dónde estaba esa noche?', 'Busca las lecturas de su vehículo.', 'lecturas_placa → vehiculos → personas'] },
    { id: 'H8', title: 'El rival', evidence: 'E8', levels: ['El vigilante trabajó para Holguín. ¿Pudo Holguín organizarlo todo?', 'Revisa dónde estuvo su camioneta.', 'Filtra las lecturas de su vehículo.'] },
    { id: 'H9', title: 'Lo que dicen los ejecutores', evidence: 'E9', levels: ['Los ejecutores no saben mucho, pero algo dijeron.', 'Busca un nombre dentro de las declaraciones.', "WHERE declaracion LIKE '%nombre%'"] },
    { id: 'H10', title: 'El abogado', evidence: 'E10', levels: ['El abogado habla con Lombana a diario. ¿Estuvo en la ciudad?', 'Revisa las lecturas de su vehículo.', 'lecturas_placa → vehiculos → personas'] },
    { id: 'H11', title: 'El mirador', evidence: 'E11', requires: { evidence: ['E4'] }, levels: ['Un testigo vio a dos hombres hablando en el Mirador del Río.', '¿Qué vehículos captó esa cámara?', "WHERE camara = 'Mirador del Río'"] },
  ],
  accusation: { minKeyEvidence: 4, minObjectives: 4, minSupportingEvidence: 3 },
  solution: {
    culprit: 'lombana',
    motive: 'La demanda por tierras podía costarle tres urbanizaciones; los títulos originales estaban en el Archivo Histórico.',
    opportunity: 'Usó a Darío Peláez y su Consultora Sigma como intermediarios para pagar a tres ejecutores sin aparecer directamente.',
    method: 'Lombana Desarrollos transfirió 25.000 USD a Sigma; Sigma pagó al transportador, al vigilante y a la auxiliar. Lombana se reunió con Peláez la noche del 4 y pasó por el archivo a las 01:55 para comprobar que todo estuviera listo.',
    justification: 'El dinero de los ejecutores sale de su empresa a través de Sigma; habló seis veces con Peláez, se reunió con él la noche del incendio, su vehículo estuvo frente al archivo y su coartada es falsa.',
    eliminations: {
      barco: { evidence: ['E7'], explanation: 'Su donación fue legal; esa noche estuvo en el Concejo y luego en su casa.' },
      holguin: { evidence: ['E8'], explanation: 'Estaba fuera del país desde el 3; su llamada a Galindo fue en octubre por la liquidación.' },
      sanabria: { evidence: ['E9'], explanation: 'Los ejecutores señalan a Peláez; la orden de digitalización fue aprovechada por otros.' },
      elejalde: { evidence: ['E10'], explanation: 'Estaba en Puerto Alto; no tiene vínculos con Sigma.' },
    },
    incriminating: ['E2', 'E3', 'E4', 'E5', 'E11'],
    reveal: [
      'Sebastián Lombana nunca habló con los ejecutores. Para eso estaba Darío Peláez, y para eso estaba Sigma.',
      'Pero el dinero deja rastro: de Lombana Desarrollos a Sigma, de Sigma a tres cuentas personales. Seis llamadas, una reunión junto al río y una camioneta frente al archivo completaron el archivo maestro.',
      'Los títulos originales se perdieron, pero las copias microfilmadas de la Biblioteca Nacional permitieron continuar la demanda. Lombana fue acusado como autor intelectual del incendio.',
    ],
  },
  references: [
    { title: 'Empresas', sql: 'SELECT * FROM empresas;' },
    { title: 'Cuentas de empresas', sql: 'SELECT c.id_cuenta, e.razon_social FROM cuentas c INNER JOIN empresas e ON c.id_empresa = e.id_empresa;' },
    { title: 'Transferencias grandes', sql: 'SELECT * FROM transferencias WHERE monto >= 5000 ORDER BY monto DESC;' },
    { title: 'Total enviado por cuenta', sql: 'SELECT cuenta_origen, SUM(monto) FROM transferencias GROUP BY cuenta_origen HAVING SUM(monto) > 30000;' },
    { title: 'Transferencias de diciembre', sql: "SELECT * FROM transferencias WHERE fecha_hora >= '2025-12-01';" },
    { title: 'Llamadas del 4 de diciembre', sql: "SELECT * FROM llamadas WHERE fecha_hora BETWEEN '2025-12-04 00:00' AND '2025-12-04 23:59';" },
    { title: 'Llamadas a emergencias', sql: "SELECT * FROM llamadas WHERE telefono_destino = '119';" },
    { title: 'Personas que más llaman', sql: 'SELECT p.apellido, COUNT(*) FROM llamadas l INNER JOIN personas p ON l.telefono_origen = p.telefono GROUP BY p.apellido ORDER BY COUNT(*) DESC LIMIT 8;' },
    { title: 'Lecturas nocturnas', sql: "SELECT * FROM lecturas_placa WHERE fecha_hora BETWEEN '2025-12-04 22:00' AND '2025-12-05 04:00' ORDER BY fecha_hora;" },
    { title: 'Personas sin vehículo (LEFT JOIN)', sql: 'SELECT p.apellido FROM personas p LEFT JOIN vehiculos v ON p.id_persona = v.id_propietario WHERE v.placa IS NULL;' },
    { title: 'Cuentas sin movimientos (RIGHT JOIN)', sql: 'SELECT c.id_cuenta FROM transferencias t RIGHT JOIN cuentas c ON t.cuenta_origen = c.id_cuenta WHERE t.id_transferencia IS NULL;' },
    { title: 'Declaraciones', sql: 'SELECT * FROM testimonios ORDER BY fecha;' },
    { title: 'Vehículos en la Av. del Archivo', sql: "SELECT placa, COUNT(*) FROM lecturas_placa WHERE camara = 'Av. del Archivo' GROUP BY placa;" },
  ],
};
