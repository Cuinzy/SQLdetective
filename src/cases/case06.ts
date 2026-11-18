import type { CaseDef, Cell } from './types';
import { table, rng, namePool, ts, hm } from './helpers';

// CASO 6 — El fraude del festival
// Culpable: Ignacio Benavides (vendedor 9, taquilla Norte, turno tarde).
// Vendía boletas en efectivo y luego anulaba la venta en el sistema («error de digitación», sin supervisor):
// 12 ventas anuladas, 23 boletas que SÍ ingresaron al festival, 1.610 USD en efectivo que no declaró.

const R = rng(606);
const DAYS = ['2025-09-05', '2025-09-06', '2025-09-07'];
const EXCL = ['Benavides', 'Toro', 'Montenegro', 'Cedeño', 'Ricaurte'];

const taquillas = table('taquillas', 'Puntos de venta del Festival Marea Sonora.', [
  'id_taquilla:integer:pk|Identificador',
  'nombre:text|Nombre',
  'ubicacion:text|Ubicación',
], [
  [1, 'Taquilla Norte', 'Acceso por la avenida del puerto'],
  [2, 'Taquilla Sur', 'Estación de tranvía'],
  [3, 'Taquilla Este', 'Parqueadero principal'],
  [4, 'Venta web', 'Plataforma en línea'],
]);

const fill = namePool(R, 6, EXCL);
const vendRows: Cell[][] = [
  [9, 'Ignacio', 'Benavides', 1, 'tarde'],
  [4, 'Fabiola', 'Cedeño', 1, 'mañana'],
  [5, 'Darío', 'Montenegro', 2, 'tarde'],
  [6, fill[0].nombre, fill[0].apellido, 2, 'mañana'],
  [7, fill[1].nombre, fill[1].apellido, 3, 'mañana'],
  [8, fill[2].nombre, fill[2].apellido, 3, 'tarde'],
  [10, fill[3].nombre, fill[3].apellido, 4, 'mañana'],
  [11, fill[4].nombre, fill[4].apellido, 4, 'tarde'],
];
const vendedores = table('vendedores', 'Vendedores de boletería.', [
  'id_vendedor:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'id_taquilla:integer:fk=taquillas.id_taquilla|Taquilla asignada',
  'turno:text|mañana (08–14) o tarde (14–22)',
], vendRows);

const supervisores = table('supervisores', 'Supervisores que pueden autorizar anulaciones.', [
  'codigo:text:pk|Código del supervisor',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'zona:text|Zona a cargo',
], [
  ['S-01', fill[5].nombre, fill[5].apellido, 'Taquillas Este y web'],
  ['S-02', 'Rebeca', 'Toro', 'Taquillas Norte y Sur'],
]);

const PRICES: Record<string, number> = { general: 70, vip: 180, abono: 160 };
type V = { id: number; vend: number; d: string; m: number; tipo: string; cant: number; metodo: string };
const ventas: V[] = [];
let vid = 1;
for (const d of DAYS)
  for (const v of vendRows) {
    const vendId = v[0] as number;
    const tarde = v[4] === 'tarde';
    const n = vendId === 5 ? 34 : R.int(18, 26);
    for (let i = 0; i < n; i++) {
      const m = tarde ? R.int(845, 1310) : R.int(485, 835);
      const tipo = R.chance(0.7) ? 'general' : R.chance(0.5) ? 'vip' : 'abono';
      const metodo = v[3] === 4 ? 'transferencia' : R.chance(0.55) ? 'efectivo' : 'tarjeta';
      ventas.push({ id: vid++, vend: vendId, d, m, tipo, cant: R.int(1, 4), metodo });
    }
  }
// Ventas que Benavides anulará (efectivo, general)
const fraudQty = [2, 2, 1, 3, 2, 2, 1, 2, 2, 3, 1, 2];
const fraudSales: V[] = fraudQty.map((q, i) => ({ id: vid++, vend: 9, d: DAYS[i % 3], m: 912 + i * 33 + (i % 3) * 7, tipo: 'general', cant: q, metodo: 'efectivo' }));
ventas.push(...fraudSales);
ventas.sort((a, b) => (a.d + String(a.m).padStart(5, '0')).localeCompare(b.d + String(b.m).padStart(5, '0')));
const ventaIds = new Map<number, number>();
ventas.forEach((v, i) => ventaIds.set(v.id, 5000 + i));
const ventasT = table('ventas', 'Transacciones de venta registradas en el sistema de boletería.', [
  'id_venta:integer:pk|Identificador',
  'id_vendedor:integer:fk=vendedores.id_vendedor|Vendedor',
  'fecha_hora:timestamp|Momento de la venta',
  'tipo_entrada:text|general, vip o abono',
  'cantidad:integer|Número de boletas',
  'precio_unitario:numeric|Precio por boleta (USD)',
  'metodo_pago:text|efectivo, tarjeta o transferencia',
], ventas.map((v) => [ventaIds.get(v.id)!, v.vend, ts(v.d, v.m), v.tipo, v.cant, PRICES[v.tipo], v.metodo]));

// Anulaciones
const legit = ventas.filter((v) => v.vend !== 9 && !fraudSales.includes(v));
const legitAnnul: [V, string, string][] = [
  [legit[40], 'S-02', 'reembolso por lluvia'],
  [legit[95], 'S-02', 'reembolso por lluvia'],
  [legit[130], 'S-02', 'cobro duplicado con tarjeta'],
  [legit[200], 'S-01', 'boletas defectuosas'],
  [legit[260], 'S-01', 'cliente desistió antes de imprimir'],
];
const anul: Cell[][] = [];
for (const [v, sup, motivo] of legitAnnul) anul.push([ventaIds.get(v.id)!, ts(v.d, v.m + R.int(2, 9)), motivo, sup]);
for (const v of fraudSales) anul.push([ventaIds.get(v.id)!, ts(v.d, v.m + R.int(4, 9)), 'error de digitación', 'propio']);
anul.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
const anulaciones = table('anulaciones', 'Ventas anuladas. «propio» = anulada por el mismo vendedor sin supervisor (permitido hasta 10 minutos después).', [
  'id_anulacion:integer:pk|Identificador',
  'id_venta:integer:fk=ventas.id_venta|Venta anulada',
  'fecha_hora:timestamp|Momento de la anulación',
  'motivo:text|Motivo registrado',
  'autorizado_por:text|Código de supervisor o «propio»',
], anul.map((a, i) => [800 + i, ...a]));

// Boletas e ingresos
const annulledLegit = new Set(legitAnnul.map(([v]) => v.id));
const boletasRows: Cell[][] = [];
const ingresosRows: [string, string, string, string, number][] = [];
const gates: [string, string][] = [['Puerta Norte', 'Joel Ricaurte'], ['Puerta Sur', 'Marta Ibáñez'], ['Puerta Este', 'Hugo Varón']];
let bc = 1000;
let fraudIdx = 0;
for (const v of ventas) {
  for (let k = 0; k < v.cant; k++) {
    const code = `BF-${bc++}`;
    boletasRows.push([code, ventaIds.get(v.id)!, v.tipo]);
    if (annulledLegit.has(v.id)) continue;
    const isFraud = fraudSales.includes(v);
    if (!isFraud && !R.chance(0.86)) continue;
    let gate: [string, string];
    if (isFraud) gate = gates[[0, 1, 2, 0, 1, 2, 2, 0, 1][fraudIdx++ % 9]];
    else gate = R.pick(gates);
    const dayIdx = R.int(DAYS.indexOf(v.d), 2);
    const gm = Math.max(v.m + 15, R.int(900, 1320));
    ingresosRows.push([code, gate[0], gate[1], DAYS[dayIdx], dayIdx > DAYS.indexOf(v.d) ? R.int(900, 1320) : Math.min(gm, 1395)]);
  }
}
const boletas = table('boletas', 'Boletas impresas con código de barras.', [
  'codigo:text:pk|Código de barras',
  'id_venta:integer:fk=ventas.id_venta|Venta que la generó',
  'tipo:text|Tipo de entrada',
], boletasRows);
ingresosRows.sort((a, b) => (a[3] + String(a[4]).padStart(5, '0')).localeCompare(b[3] + String(b[4]).padStart(5, '0')));
const ingresos = table('ingresos', 'Lecturas de boletas en las puertas del festival.', [
  'id_ingreso:integer:pk|Identificador',
  'codigo_boleta:text:fk=boletas.codigo|Boleta leída',
  'puerta:text|Puerta',
  'portero:text|Portero que escaneó',
  'fecha_hora:timestamp|Momento de ingreso',
], ingresosRows.map(([c, p, po, d, m], i) => [20000 + i, c, p, po, ts(d, m)]));

// Cierres de caja: efectivo declarado = efectivo del sistema (sin ventas anuladas)
const annulledIds = new Set([...legitAnnul.map(([v]) => v.id), ...fraudSales.map((v) => v.id)]);
const cierres: Cell[][] = [];
let cid = 1;
for (const d of DAYS)
  for (const v of vendRows) {
    if (v[3] === 4) continue;
    const vend = v[0] as number;
    const total = ventas.filter((x) => x.vend === vend && x.d === d && x.metodo === 'efectivo' && !annulledIds.has(x.id)).reduce((s, x) => s + x.cant * PRICES[x.tipo], 0);
    cierres.push([cid++, vend, d, total]);
  }
const cierresCaja = table('cierres_caja', 'Efectivo entregado por cada vendedor al cerrar su caja.', [
  'id_cierre:integer:pk|Identificador',
  'id_vendedor:integer:fk=vendedores.id_vendedor|Vendedor',
  'fecha:date|Día',
  'efectivo_declarado:numeric|Efectivo entregado (USD)',
], cierres);

const darioCash = ventas.filter((x) => x.vend === 5 && x.metodo === 'efectivo' && !annulledIds.has(x.id)).reduce((s, x) => s + x.cant * PRICES[x.tipo], 0);
const fraudTimes = fraudSales.map((v) => hm(v.m).slice(0, 5)).sort();
const firstFraud = fraudTimes[0];
const lastFraud = fraudTimes[fraudTimes.length - 1];

export const case06: CaseDef = {
  id: 6,
  code: 'EXP-06',
  title: 'El fraude del festival',
  level: 2,
  tagline: 'Las cuentas del Festival Marea Sonora cuadran… demasiado bien.',
  location: 'Festival Marea Sonora, explanada del puerto',
  date: '5 al 7 de septiembre de 2025',
  scene: 'festival',
  briefing: [
    'El Festival Marea Sonora vendió miles de boletas en tres días. Las cajas cuadraron al centavo cada noche.',
    'Sin embargo, el conteo de asistentes en las puertas superó a las boletas vendidas. Alguien hizo entrar público con boletas que, según el sistema, nunca se vendieron.',
    'Necesitarás relacionar ventas, anulaciones, boletas e ingresos: ninguna tabla por sí sola cuenta la historia completa.',
  ],
  timeline: [
    { time: '5 sep', event: 'Primer día del festival.' },
    { time: '7 sep 23:00', event: 'Cierre del festival.' },
    { time: '8 sep', event: 'Auditoría: hay más ingresos que boletas válidas.' },
  ],
  concepts: ['INNER JOIN', 'COUNT', 'SUM', 'MIN / MAX', 'GROUP BY', 'HAVING'],
  tables: [taquillas, vendedores, supervisores, ventasT, anulaciones, boletas, ingresos, cierresCaja],
  characters: [
    {
      id: 'ignacio', name: 'Ignacio Benavides', role: 'Vendedor, taquilla Norte (tarde)', age: 29, suspect: true,
      bio: 'Rápido con el teclado y con las palabras. Pidió el turno de tarde, el de más público.',
      statement: 'Mis cierres cuadraron todos los días. Revisen el sistema.',
      look: { skin: 2, hair: 'corto', hairColor: 3, accessory: 'gorra', outfitStyle: 'chaqueta', outfit: 7, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Anuló ventas durante el festival?', answer: 'Alguna, por errores de digitación. Con la fila larga, uno se equivoca.' },
        { id: 'q2', text: 'Usted anuló 12 ventas, cuando el resto de vendedores no pasa de 2.', answer: 'Mi taquilla era la más congestionada. Más ventas, más errores.', requires: ['E1'], contradiction: true },
        { id: 'q3', text: 'Las boletas de esas ventas «anuladas» ingresaron al festival. ¿Cómo lo explica?', answer: 'Eso… habrá que preguntarle a los porteros, no a mí.', requires: ['E2'], contradiction: true, note: 'Ignacio culpa a los porteros por las boletas anuladas que ingresaron.' },
        { id: 'q4', text: 'Esas ventas suman 1.610 dólares en efectivo que no entregó.', answer: 'No tengo nada más que decir.', requires: ['E3'], contradiction: true },
      ],
    },
    {
      id: 'rebeca', name: 'Rebeca Toro', role: 'Supervisora de taquillas Norte y Sur', age: 41, suspect: true,
      bio: 'Autoriza anulaciones y reembolsos. Tiene acceso al sistema de boletería.',
      statement: 'Yo autoricé reembolsos el sábado por la lluvia. Todo documentado.',
      look: { skin: 1, hair: 'coleta', hairColor: 2, accessory: 'auriculares', outfitStyle: 'chaqueta', outfit: 1 },
      questions: [
        { id: 'q1', text: '¿Cuántas anulaciones autorizó?', answer: 'Tres. Dos reembolsos por lluvia y un cobro duplicado con tarjeta.' },
        { id: 'q2', text: '¿Pueden los vendedores anular sin usted?', answer: 'Sí, hasta diez minutos después de la venta. Se registra como «propio». Era para agilizar la fila.', note: 'Los vendedores podían anular sin supervisor («propio») durante 10 minutos.' },
      ],
    },
    {
      id: 'dario', name: 'Darío Montenegro', role: 'Vendedor, taquilla Sur (tarde)', age: 33, suspect: true,
      bio: 'El vendedor con más ventas del festival. Maneja mucho efectivo.',
      statement: 'Vendí más que nadie y entregué hasta el último dólar.',
      look: { skin: 4, hair: 'rizado', hairColor: 0, facial: 'barba', outfitStyle: 'camisa', outfit: 3 },
      questions: [
        { id: 'q1', text: '¿Por qué vendió tanto más que los demás?', answer: 'La taquilla Sur está junto al tranvía. Llega todo el mundo por ahí.' },
        { id: 'q2', text: '¿Anuló alguna venta?', answer: 'Una sola, por lluvia, y la autorizó Rebeca.' },
      ],
    },
    {
      id: 'fabiola', name: 'Fabiola Cedeño', role: 'Vendedora, taquilla Norte (mañana)', age: 26, suspect: true,
      bio: 'Comparte la taquilla Norte con Benavides. Usa el mismo computador.',
      statement: 'Yo trabajo de mañana. A las dos le dejo la caja a Ignacio.',
      look: { skin: 0, hair: 'largo', hairColor: 4, accessory: 'aretes', outfitStyle: 'sueter', outfit: 5, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Alguien más pudo usar el usuario de Benavides?', answer: 'No lo creo. Cada uno inicia sesión con su propia clave al empezar el turno.' },
        { id: 'q2', text: '¿Notó algo extraño en la taquilla?', answer: 'Ignacio guardaba billetes en un sobre aparte. Decía que era el cambio.', note: 'Fabiola vio a Ignacio guardar billetes en un sobre aparte.' },
      ],
    },
    {
      id: 'joel', name: 'Joel Ricaurte', role: 'Portero, Puerta Norte', age: 37, suspect: true,
      bio: 'Escanea boletas en la Puerta Norte. Su lector a veces «no sonaba».',
      statement: 'Yo escaneo lo que me pasan. Si el lector dice verde, entra.',
      look: { skin: 5, hair: 'calvo', hairColor: 0, facial: 'barba', outfitStyle: 'uniforme', outfit: 2 },
      questions: [
        { id: 'q1', text: '¿El lector rechaza boletas anuladas?', answer: 'Debería, pero el lector trabaja sin conexión y se sincroniza cada noche. Las anulaciones del día no le llegan.', note: 'Los lectores de las puertas no conocían las anulaciones del mismo día.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Récord de anulaciones', description: 'Al contar anulaciones por vendedor, Ignacio Benavides (vendedor 9) acumula 12; ningún otro supera 2.', reference: 'SELECT v.id_vendedor, v.apellido, COUNT(*) AS anulaciones FROM anulaciones a INNER JOIN ventas ve ON a.id_venta = ve.id_venta INNER JOIN vendedores v ON ve.id_vendedor = v.id_vendedor GROUP BY v.id_vendedor, v.apellido ORDER BY anulaciones DESC;', match: { any: [['Benavides', '12'], ['9', '12']], maxRows: 12, features: ['join', 'aggregate'] }, implicates: ['ignacio'] },
    { id: 'E2', key: true, title: 'Boletas anuladas que entraron', description: '23 boletas de ventas anuladas fueron escaneadas en las puertas: eran boletas reales vendidas por la taquilla Norte.', reference: 'SELECT COUNT(*) AS boletas_anuladas_que_ingresaron FROM anulaciones a INNER JOIN boletas b ON a.id_venta = b.id_venta INNER JOIN ingresos i ON i.codigo_boleta = b.codigo;', match: { any: [['23']], maxRows: 30, features: ['join'] }, implicates: ['ignacio'] },
    { id: 'E3', key: true, title: 'El efectivo invisible', description: 'Las ventas anuladas por Benavides suman 1.610 USD en efectivo que nunca llegaron a su cierre de caja.', reference: "SELECT SUM(ve.cantidad * ve.precio_unitario) AS efectivo_anulado FROM anulaciones a INNER JOIN ventas ve ON a.id_venta = ve.id_venta WHERE ve.id_vendedor = 9 AND ve.metodo_pago = 'efectivo';", match: { any: [['1610']], maxRows: 12, features: ['join', 'aggregate'] }, implicates: ['ignacio'] },
    { id: 'E4', title: 'Anulaciones sin supervisor', description: 'Doce anulaciones se hicieron como «propio» con el motivo «error de digitación», sin supervisor.', reference: "SELECT * FROM anulaciones WHERE autorizado_por = 'propio';", match: { any: [['propio', 'error de digitación']], minRows: 10, maxRows: 15 }, implicates: ['ignacio'] },
    { id: 'E5', title: 'Lo que autorizó la supervisora', description: 'Rebeca Toro (S-02) autorizó solo 3 anulaciones, ninguna de ellas con boletas que ingresaran.', reference: 'SELECT autorizado_por, COUNT(*) FROM anulaciones GROUP BY autorizado_por;', match: { any: [['S-02', '3']], maxRows: 6, features: ['aggregate'] }, clears: ['rebeca'] },
    { id: 'E6', title: 'El mejor vendedor no ocultaba nada', description: `Darío Montenegro vendió ${darioCash} USD en efectivo válido y su total declarado en los cierres es idéntico.`, reference: 'SELECT SUM(efectivo_declarado) FROM cierres_caja WHERE id_vendedor = 5;', match: { any: [[String(darioCash)]], maxRows: 6, features: ['aggregate'] }, clears: ['dario'] },
    { id: 'E7', title: 'Horario de las anulaciones', description: `Las ventas anuladas como «propio» ocurrieron entre las ${firstFraud} y las ${lastFraud}: siempre en el turno de tarde, no en el de Fabiola.`, reference: "SELECT MIN(CAST(ve.fecha_hora AS time)) AS primera, MAX(CAST(ve.fecha_hora AS time)) AS ultima FROM anulaciones a INNER JOIN ventas ve ON a.id_venta = ve.id_venta WHERE a.autorizado_por = 'propio';", match: { any: [[firstFraud, lastFraud]], maxRows: 6, features: ['join', 'aggregate'] }, clears: ['fabiola'] },
    { id: 'E8', title: 'Tres puertas, tres porteros', description: 'Las boletas anuladas ingresaron por las tres puertas, con porteros distintos: no fue un portero cómplice.', reference: 'SELECT i.puerta, i.portero, COUNT(*) FROM anulaciones a INNER JOIN boletas b ON a.id_venta = b.id_venta INNER JOIN ingresos i ON i.codigo_boleta = b.codigo GROUP BY i.puerta, i.portero;', match: { all: [['Norte'], ['Sur'], ['Este']], maxRows: 6, features: ['join', 'aggregate'] }, clears: ['joel'] },
  ],
  objectives: [
    { id: 'O1', title: 'Encontrar el patrón de anulaciones', description: '¿Quién anula, cuánto y sin supervisión?', evidence: ['E1', 'E4', 'E5'], need: 2, tables: ['anulaciones', 'ventas', 'vendedores', 'supervisores'] },
    { id: 'O2', title: 'Seguir las boletas anuladas', description: 'Una boleta anulada no debería cruzar ninguna puerta.', evidence: ['E2', 'E8'], need: 1, tables: ['boletas', 'ingresos'] },
    { id: 'O3', title: 'Cuadrar el efectivo', description: 'Compara ventas, anulaciones y cierres de caja.', evidence: ['E3', 'E6'], need: 1, tables: ['ventas', 'cierres_caja'] },
    { id: 'O4', title: 'Establecer horarios', description: '¿En qué turno ocurrió el fraude?', evidence: ['E7'], tables: ['ventas', 'vendedores'] },
  ],
  hints: [
    { id: 'H1', title: 'Contar por persona', evidence: 'E1', levels: ['Un vendedor honesto anula poco. ¿Alguien anula mucho más que los demás?', 'anulaciones solo tiene id_venta; el vendedor está en ventas.', 'Une con INNER JOIN ventas ON anulaciones.id_venta = ventas.id_venta y agrupa: GROUP BY id_vendedor con COUNT(*).'] },
    { id: 'H2', title: 'Boletas que no debían existir', evidence: 'E2', levels: ['Si una venta se anuló, sus boletas no deberían haber entrado al festival.', 'Relaciona anulaciones → boletas (por id_venta) → ingresos (por código de boleta).', 'Encadena dos INNER JOIN y cuenta las filas con COUNT(*).'] },
    { id: 'H3', title: 'Dinero que desaparece', evidence: 'E3', requires: { evidence: ['E1'] }, levels: ['Cada venta anulada en efectivo es dinero que el vendedor no tuvo que entregar.', 'Suma cantidad × precio_unitario de las ventas anuladas del vendedor sospechoso.', "SUM(cantidad * precio_unitario) con JOIN entre anulaciones y ventas, filtrando metodo_pago = 'efectivo'."] },
    { id: 'H4', title: 'Sin supervisión', evidence: 'E4', levels: ['Algunas anulaciones no pasaron por un supervisor.', 'La columna autorizado_por distingue supervisores de «propio».', "WHERE autorizado_por = 'propio'"] },
    { id: 'H5', title: 'La supervisora', evidence: 'E5', levels: ['¿Cuántas anulaciones autorizó cada supervisor?', 'Agrupa anulaciones por autorizado_por.', 'SELECT autorizado_por, COUNT(*) FROM anulaciones GROUP BY autorizado_por'] },
    { id: 'H6', title: 'El vendedor estrella', evidence: 'E6', levels: ['El que más vende maneja más efectivo… ¿entregó todo?', 'Suma lo declarado en cierres_caja por ese vendedor y compáralo con sus ventas en efectivo.', 'SUM(efectivo_declarado) con WHERE id_vendedor = …'] },
    { id: 'H7', title: '¿Mañana o tarde?', evidence: 'E7', levels: ['Dos personas comparten la taquilla Norte. ¿En qué turno ocurrieron las anulaciones?', 'Busca la hora de la primera y la última venta anulada como «propio».', 'MIN() y MAX() sobre fecha_hora (puedes convertirla a hora con CAST(fecha_hora AS time)).'] },
    { id: 'H8', title: 'Las puertas', evidence: 'E8', levels: ['¿Hubo un portero cómplice que dejaba pasar boletas anuladas?', 'Agrupa los ingresos de boletas anuladas por puerta y portero.', 'GROUP BY puerta, portero sobre el JOIN de anulaciones, boletas e ingresos.'] },
  ],
  accusation: { minKeyEvidence: 2, minObjectives: 2 },
  solution: {
    culprit: 'ignacio',
    motive: 'Quedarse con el efectivo de boletas vendidas.',
    opportunity: 'El sistema permitía anular ventas propias durante 10 minutos sin supervisor, y los lectores de las puertas no recibían las anulaciones del día.',
    method: 'Cobraba en efectivo, entregaba boletas reales y luego anulaba la venta por «error de digitación». Su cierre de caja cuadraba con el sistema, pero el dinero iba a un sobre aparte.',
    justification: 'Acumula 12 anulaciones sin supervisor, todas en su turno; las 23 boletas de esas ventas ingresaron al festival, y el efectivo correspondiente (1.610 USD) no figura en sus cierres.',
    eliminations: {
      rebeca: { evidence: ['E5'], explanation: 'Autorizó solo 3 reembolsos documentados; ninguna de esas boletas ingresó.' },
      dario: { evidence: ['E6'], explanation: 'Sus ventas en efectivo coinciden exactamente con lo que entregó.' },
      fabiola: { evidence: ['E7'], explanation: 'Las anulaciones fraudulentas ocurrieron siempre en el turno de tarde.' },
      joel: { evidence: ['E8'], explanation: 'Las boletas anuladas entraron por tres puertas distintas; los lectores no conocían las anulaciones.' },
    },
    incriminating: ['E1', 'E2', 'E3', 'E4'],
    reveal: [
      'Ignacio Benavides descubrió el primer día que podía anular sus propias ventas sin supervisor… y que las puertas nunca se enteraban.',
      'Cobraba en efectivo, entregaba boletas reales y anulaba la venta minutos después. Su cierre cuadraba siempre.',
      'El sobre «del cambio» que vio Fabiola contenía 1.610 dólares. El festival cambió el sistema: ninguna anulación sin supervisor.',
    ],
  },
  references: [
    { title: 'Vendedores por taquilla', sql: 'SELECT t.nombre, v.nombre, v.apellido, v.turno FROM vendedores v INNER JOIN taquillas t ON v.id_taquilla = t.id_taquilla ORDER BY t.nombre;' },
    { title: 'Ventas por vendedor', sql: 'SELECT id_vendedor, COUNT(*) AS ventas, SUM(cantidad) AS boletas FROM ventas GROUP BY id_vendedor ORDER BY ventas DESC;' },
    { title: 'Ingresos por método de pago', sql: 'SELECT metodo_pago, SUM(cantidad * precio_unitario) AS total FROM ventas GROUP BY metodo_pago;' },
    { title: 'Promedio de boletas por venta', sql: 'SELECT tipo_entrada, AVG(cantidad) AS promedio FROM ventas GROUP BY tipo_entrada;' },
    { title: 'Vendedores con más de 70 ventas', sql: 'SELECT id_vendedor, COUNT(*) FROM ventas GROUP BY id_vendedor HAVING COUNT(*) > 70;' },
    { title: 'Ingresos por puerta', sql: 'SELECT puerta, COUNT(*) FROM ingresos GROUP BY puerta;' },
    { title: 'Ingresos por día', sql: 'SELECT CAST(fecha_hora AS date) AS dia, COUNT(*) FROM ingresos GROUP BY CAST(fecha_hora AS date) ORDER BY dia;' },
    { title: 'Cierres por vendedor', sql: 'SELECT v.apellido, SUM(c.efectivo_declarado) AS total FROM cierres_caja c INNER JOIN vendedores v ON c.id_vendedor = v.id_vendedor GROUP BY v.apellido;' },
    { title: 'Anulaciones con vendedor', sql: 'SELECT a.*, ve.id_vendedor FROM anulaciones a INNER JOIN ventas ve ON a.id_venta = ve.id_venta;' },
    { title: 'Venta máxima', sql: 'SELECT MAX(cantidad * precio_unitario) FROM ventas;' },
    { title: 'Boletas por tipo', sql: 'SELECT tipo, COUNT(*) FROM boletas GROUP BY tipo;' },
    { title: 'Supervisores', sql: 'SELECT * FROM supervisores;' },
    { title: 'Porteros', sql: 'SELECT DISTINCT puerta, portero FROM ingresos;' },
  ],
};
