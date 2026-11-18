import type { CaseDef, Cell } from './types';
import { table, rng, namePool } from './helpers';

// CASO 10 — La operación fantasma
// Culpable: Rodolfo Escalante (gerente de compras, id 6).
// Registró él mismo al proveedor «Servicios Integrales Delta SAS» (id 17), cuya dirección es la de su casa,
// y le aprobó 9 contratos de entre 45.000 y 49.999 USD (justo bajo el umbral de 50.000 que exige a la directora
// financiera). Delta cobró todo y nunca entregó nada.

const R = rng(1010);
const EXCL = ['Escalante', 'Tirado', 'Cortázar', 'Barragán', 'Ocampo'];
const fill = namePool(R, 15, EXCL);

const empRows: Cell[][] = [
  [3, 'Mónica', 'Tirado', 'Tesorera', 'Finanzas', 'Calle 40 # 18-22, Ciudad Bruma', 'BB-30017721'],
  [4, 'Pilar', 'Ocampo', 'Directora financiera', 'Finanzas', 'Carrera 11 # 92-15, Ciudad Bruma', 'BB-30044210'],
  [6, 'Rodolfo', 'Escalante', 'Gerente de compras', 'Compras', 'Calle 77 # 5-61, Ciudad Bruma', 'BB-30089934'],
  [8, 'Elisa', 'Cortázar', 'Asistente de compras', 'Compras', 'Carrera 30 # 45-08, Ciudad Bruma', 'BB-30012385'],
  [9, 'Julio', 'Barragán', 'Jefe de obra', 'Obras', 'Calle 12 # 3-47, Puerto Alto', 'BB-30067721'],
];
const cargos: [string, string][] = [['Jefe de compras', 'Compras'], ['Auxiliar de tesorería', 'Finanzas'], ['Ingeniera residente', 'Obras'], ['Ingeniero residente', 'Obras'], ['Contador', 'Finanzas'], ['Abogada', 'Jurídica'], ['Almacenista', 'Obras'], ['Almacenista', 'Obras'], ['Analista de costos', 'Finanzas'], ['Gerente general', 'Dirección']];
cargos.forEach(([c, d], i) => empRows.push([11 + i, fill[i].nombre, fill[i].apellido, c, d, `Calle ${R.int(1, 140)} # ${R.int(1, 99)}-${R.int(1, 99)}, Ciudad Bruma`, `BB-300${R.int(10000, 99999)}`]));
const empleados = table('empleados', 'Empleados de Constructora Atalaya S.A.', [
  'id_empleado:integer:pk|Identificador',
  'nombre:text|Nombre',
  'apellido:text|Apellido',
  'cargo:text|Cargo',
  'departamento:text|Departamento',
  'direccion:text|Dirección de residencia',
  'cuenta_bancaria:text|Cuenta de nómina',
], empRows);

const provNames = ['Concretos del Valle', 'Aceros Bruma', 'Ferretería Industrial Norte', 'Maquinaria Pesada Andes', 'Transportes Ríos', 'Eléctricos Faro', 'Vidrios y Ventanas Sur', 'Asfaltos del Puerto', 'Topografía Precisa', 'Seguridad Industrial Mar', 'Pinturas Atlántico', 'Madera Fina Ltda.', 'Geotecnia Avanzada', 'Andamios Express', 'Hidráulicos Lagos', 'Consultores Viales'];
const provRows: Cell[][] = provNames.map((n, i) => [i + 1, n, `900${R.int(100000, 999999)}-${R.int(1, 9)}`, `Zona Industrial, bodega ${R.int(1, 60)}`, `BC-7${R.int(1000000, 9999999)}`, `2022-${String(R.int(1, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}`, R.chance(0.8) ? 8 : 11]);
provRows.push([17, 'Servicios Integrales Delta SAS', '901555210-3', 'Calle 77 # 5-61, Ciudad Bruma', 'BC-79911002', '2024-02-01', 6]);
provRows.push([18, 'Limpieza Total', `900${R.int(100000, 999999)}-4`, 'Carrera 50 # 10-10, Ciudad Bruma', 'BC-71234098', '2023-06-10', 8]);
const proveedores = table('proveedores', 'Proveedores registrados.', [
  'id_proveedor:integer:pk|Identificador',
  'razon_social:text|Razón social',
  'nit:text|Identificación tributaria',
  'direccion:text|Dirección registrada',
  'cuenta_bancaria:text|Cuenta para pagos',
  'fecha_registro:date|Fecha de registro en el sistema',
  'registrado_por:integer:fk=empleados.id_empleado|Empleado que lo registró',
], provRows);

const objetos = ['Suministro de concreto', 'Varilla corrugada', 'Alquiler de maquinaria', 'Transporte de material', 'Instalación eléctrica', 'Ventanería', 'Pavimentación', 'Levantamiento topográfico', 'Dotación de seguridad', 'Pintura de fachada', 'Formaletas de madera', 'Estudio de suelos', 'Andamiaje', 'Bombas hidráulicas', 'Interventoría vial', 'Aseo de obra'];
type C = { id: number; prov: number; obj: string; monto: number; fecha: string; aprob: number };
const contratos: C[] = [];
let cid = 100;
for (let i = 0; i < 72; i++) {
  const prov = R.int(1, 16) === 16 ? 18 : R.int(1, 16);
  let monto = R.int(5, 180) * 1000 + R.int(0, 9) * 100;
  if (monto >= 45000 && monto < 50000) monto += 6000;
  const aprob = monto >= 50000 ? 4 : R.chance(0.6) ? 6 : 11;
  contratos.push({ id: cid++, prov, obj: objetos[(prov - 1) % 16], monto, fecha: `2024-${String(R.int(1, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}`, aprob });
}
const deltaMontos = [48500, 49900, 47200, 49300, 46800, 49750, 48100, 49500, 47900];
deltaMontos.forEach((m, i) => contratos.push({ id: cid++, prov: 17, obj: 'Asesoría integral en gestión de obra', monto: m, fecha: `2024-${String(2 + i).padStart(2, '0')}-${String(5 + i).padStart(2, '0')}`, aprob: 6 }));
contratos.sort((a, b) => a.fecha.localeCompare(b.fecha));
const contratosT = table('contratos', 'Contratos firmados. Política: desde 50.000 USD deben ser aprobados por la directora financiera.', [
  'id_contrato:integer:pk|Identificador',
  'id_proveedor:integer:fk=proveedores.id_proveedor|Proveedor',
  'objeto:text|Objeto del contrato',
  'monto:numeric|Valor (USD)',
  'fecha_firma:date|Fecha de firma',
  'aprobado_por:integer:fk=empleados.id_empleado|Empleado que aprobó',
], contratos.map((c) => [c.id, c.prov, c.obj, c.monto, c.fecha, c.aprob]));

const facturas: Cell[][] = [];
const pagos: Cell[][] = [];
const entregas: Cell[][] = [];
let fid = 5000;
let pid = 8000;
let eid = 300;
const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
for (const c of contratos) {
  const parts = c.prov === 17 ? 1 : R.int(1, 2);
  for (let k = 0; k < parts; k++) {
    const valor = Math.round((c.monto / parts) * 100) / 100;
    const fdate = addDays(c.fecha, 15 + k * 30);
    facturas.push([fid, c.id, `F-${c.prov}-${fid}`, fdate, valor]);
    pagos.push([pid++, fid, addDays(fdate, R.int(5, 20)), valor, c.prov === 17 ? 3 : R.chance(0.88) ? 3 : 12]);
    fid++;
  }
  if (c.prov !== 17) {
    const n = R.int(1, 3);
    for (let k = 0; k < n; k++) entregas.push([eid++, c.id, addDays(c.fecha, R.int(3, 60)), R.pick([9, 9, 9, 13, 14, 17, 18]), `${c.obj} — entrega ${k + 1}`]);
  }
}
const facturasT = table('facturas', 'Facturas recibidas de proveedores.', [
  'id_factura:integer:pk|Identificador',
  'id_contrato:integer:fk=contratos.id_contrato|Contrato',
  'numero:text|Número de factura',
  'fecha:date|Fecha de emisión',
  'valor:numeric|Valor facturado (USD)',
], facturas);
const pagosT = table('pagos', 'Pagos realizados por tesorería.', [
  'id_pago:integer:pk|Identificador',
  'id_factura:integer:fk=facturas.id_factura|Factura pagada',
  'fecha_pago:date|Fecha del pago',
  'valor:numeric|Valor pagado (USD)',
  'autorizado_por:integer:fk=empleados.id_empleado|Quién autorizó el pago',
], pagos);
const entregasT = table('entregas', 'Actas de recibo de bienes y servicios en obra.', [
  'id_entrega:integer:pk|Identificador',
  'id_contrato:integer:fk=contratos.id_contrato|Contrato',
  'fecha:date|Fecha de recibo',
  'recibido_por:integer:fk=empleados.id_empleado|Quién firmó el recibo',
  'descripcion:text|Descripción',
], entregas);

const deltaPaid = deltaMontos.reduce((s, x) => s + x, 0);
const nTirado = pagos.filter((p) => p[4] === 3).length;
const nCortazar = provRows.filter((p) => p[6] === 8).length;
const nBarragan = entregas.filter((e) => e[3] === 9).length;
const nOcampo = contratos.filter((c) => c.aprob === 4).length;
const fmt = (n: number) => n.toLocaleString('es-CO');

export const case10: CaseDef = {
  id: 10,
  code: 'EXP-10',
  title: 'La operación fantasma',
  level: 2,
  tagline: 'Un proveedor cobró casi medio millón de dólares sin entregar un solo ladrillo.',
  location: 'Constructora Atalaya S.A., oficinas centrales',
  date: 'Auditoría de enero de 2025',
  scene: 'oficina',
  briefing: [
    'Una auditoría externa detectó que los costos de obra de Constructora Atalaya crecieron un 18 % en 2024 sin que crecieran las obras.',
    'La política de la empresa exige que todo contrato de 50.000 USD o más sea aprobado por la directora financiera. Los contratos menores los aprueba el área de compras.',
    'Las tablas de proveedores, contratos, facturas, pagos y entregas cuentan, juntas, una historia que ninguna cuenta por separado.',
  ],
  timeline: [
    { time: 'Feb 2024', event: 'Se registra un nuevo proveedor de «asesoría integral».' },
    { time: 'Feb–Oct 2024', event: 'Se firman contratos con ese proveedor cada mes.' },
    { time: 'Ene 2025', event: 'La auditoría externa da la alarma.' },
  ],
  concepts: ['INNER JOIN', 'JOIN por columnas no clave', 'COUNT', 'SUM', 'MAX', 'GROUP BY', 'HAVING', 'BETWEEN'],
  tables: [empleados, proveedores, contratosT, facturasT, pagosT, entregasT],
  characters: [
    {
      id: 'escalante', name: 'Rodolfo Escalante', role: 'Gerente de compras', age: 52, suspect: true,
      bio: 'Veinte años en la empresa. Aprueba los contratos menores de 50.000 USD.',
      statement: 'Delta es un proveedor serio. Nos asesoró en la gestión de todas las obras.',
      look: { skin: 1, hair: 'corto', hairColor: 6, facial: 'bigote', accessory: 'gafas', outfitStyle: 'traje', outfit: 4, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Quién recomendó a Servicios Integrales Delta?', answer: 'Lo encontré en una feria de proveedores. Tenían buenas referencias.' },
        { id: 'q2', text: '¿Por qué todos los contratos de Delta están justo por debajo de 50.000?', answer: 'Así cotizan ellos. Es una coincidencia comercial.', requires: ['E1'], contradiction: true },
        { id: 'q3', text: 'La dirección de Delta es la misma de su casa: Calle 77 # 5-61.', answer: '…Mi cuñado usa mi dirección para recibir correspondencia. Él es el representante de Delta.', requires: ['E3'], contradiction: true, note: 'Escalante admite que su cuñado es el representante de Delta.' },
        { id: 'q4', text: 'Usted mismo registró a Delta en el sistema, aunque esa tarea es de su asistente.', answer: 'Quería agilizar el trámite. No veo el problema.', requires: ['E5'], contradiction: true },
      ],
    },
    {
      id: 'tirado', name: 'Mónica Tirado', role: 'Tesorera', age: 44, suspect: true,
      bio: 'Autoriza los pagos de casi todas las facturas.',
      statement: 'Yo pago lo que compras aprueba y la obra factura. No elijo a los proveedores.',
      look: { skin: 3, hair: 'largo', hairColor: 1, accessory: 'aretes', outfitStyle: 'traje', outfit: 5 },
      questions: [
        { id: 'q1', text: '¿Revisa que los servicios se hayan entregado antes de pagar?', answer: 'Para asesorías no hay acta de entrega física. El gerente de compras certificaba el servicio.', note: 'Los pagos a asesorías se certificaban solo con la firma de compras.' },
      ],
    },
    {
      id: 'cortazar', name: 'Elisa Cortázar', role: 'Asistente de compras', age: 29, suspect: true,
      bio: 'Registra a los proveedores nuevos en el sistema.',
      statement: 'Yo registro a los proveedores, pero a Delta no lo registré yo.',
      look: { skin: 0, hair: 'flequillo', hairColor: 3, outfitStyle: 'camisa', outfit: 1, age: 'joven' },
      questions: [
        { id: 'q1', text: '¿Le pareció raro Delta?', answer: 'Sí. El NIT era nuevo y nunca vi a nadie de Delta en la oficina. El gerente dijo que él se encargaba.' },
      ],
    },
    {
      id: 'barragan', name: 'Julio Barragán', role: 'Jefe de obra', age: 47, suspect: true,
      bio: 'Firma las actas de recibo de materiales y servicios en obra.',
      statement: 'Nunca vi a un asesor de Delta en ninguna obra.',
      look: { skin: 4, hair: 'calvo', hairColor: 0, facial: 'barba', accessory: 'gorra', outfitStyle: 'chaqueta', outfit: 7 },
      questions: [
        { id: 'q1', text: '¿Firmó entregas de Delta?', answer: 'Ninguna. Ni una sola. Revise las actas.' },
      ],
    },
    {
      id: 'ocampo', name: 'Pilar Ocampo', role: 'Directora financiera', age: 58, suspect: true,
      bio: 'Aprueba los contratos de 50.000 USD o más.',
      statement: 'Ningún contrato de Delta pasó por mi escritorio.',
      look: { skin: 2, hair: 'canoso', hairColor: 7, accessory: 'gafas', outfitStyle: 'traje', outfit: 6, age: 'mayor' },
      questions: [
        { id: 'q1', text: '¿Por qué el umbral es de 50.000?', answer: 'Para no frenar las compras pequeñas. Ahora veo que alguien aprendió a esquivarlo.' },
      ],
    },
  ],
  evidence: [
    { id: 'E1', key: true, title: 'Justo debajo del umbral', description: 'Contando contratos entre 45.000 y 49.999 USD por proveedor: Servicios Integrales Delta tiene 9; ningún otro proveedor tiene contratos en ese rango.', reference: 'SELECT p.razon_social, COUNT(*) AS contratos, MAX(c.monto) AS maximo FROM contratos c INNER JOIN proveedores p ON c.id_proveedor = p.id_proveedor WHERE c.monto BETWEEN 45000 AND 49999 GROUP BY p.razon_social;', match: { any: [['Delta', '9'], ['17', '9']], maxRows: 6, features: ['aggregate'] } },
    { id: 'E2', key: true, title: 'Quién aprobó a Delta', description: 'Los 9 contratos de Delta fueron aprobados por Rodolfo Escalante, gerente de compras.', reference: 'SELECT e.nombre, e.apellido, COUNT(*) FROM contratos c INNER JOIN empleados e ON c.aprobado_por = e.id_empleado WHERE c.id_proveedor = 17 GROUP BY e.nombre, e.apellido;', match: { any: [['Escalante', '9']], maxRows: 5, features: ['join', 'aggregate'] }, implicates: ['escalante'] },
    { id: 'E3', key: true, title: 'Una dirección compartida', description: 'La dirección registrada de Delta (Calle 77 # 5-61) es la dirección de residencia de Rodolfo Escalante.', reference: 'SELECT e.nombre, e.apellido, p.razon_social, p.direccion FROM empleados e INNER JOIN proveedores p ON e.direccion = p.direccion;', match: { any: [['Escalante', 'Delta']], maxRows: 5, features: ['join'] }, implicates: ['escalante'] },
    { id: 'E4', key: true, title: 'El dinero pagado', description: `Delta recibió ${fmt(deltaPaid)} USD en pagos durante 2024.`, reference: 'SELECT SUM(pg.valor) FROM pagos pg INNER JOIN facturas f ON pg.id_factura = f.id_factura INNER JOIN contratos c ON f.id_contrato = c.id_contrato WHERE c.id_proveedor = 17;', match: { any: [[String(deltaPaid)]], maxRows: 20, features: ['join', 'aggregate'] }, implicates: ['escalante'] },
    { id: 'E5', title: 'Un registro inusual', description: 'Delta fue registrado el 1 de febrero de 2024 por el empleado 6 (Escalante), no por la asistente de compras.', reference: "SELECT * FROM proveedores WHERE razon_social LIKE '%Delta%';", match: { any: [['Delta', '2024-02-01', '6']], maxRows: 3 }, implicates: ['escalante'] },
    { id: 'E6', title: 'La tesorera firma casi todo', description: `Mónica Tirado autorizó ${nTirado} pagos de ${pagos.length}: firmar pagos es su función, para todos los proveedores.`, reference: 'SELECT e.apellido, COUNT(*) FROM pagos pg INNER JOIN empleados e ON pg.autorizado_por = e.id_empleado GROUP BY e.apellido;', match: { any: [['Tirado', String(nTirado)], ['3', String(nTirado)]], maxRows: 6, features: ['aggregate'] }, clears: ['tirado'] },
    { id: 'E7', title: 'Quién registra proveedores', description: `Elisa Cortázar registró ${nCortazar} proveedores; Delta no fue uno de ellos.`, reference: 'SELECT e.apellido, COUNT(*) FROM proveedores p INNER JOIN empleados e ON p.registrado_por = e.id_empleado GROUP BY e.apellido;', match: { any: [['Cortázar', String(nCortazar)], ['8', String(nCortazar)]], maxRows: 6, features: ['aggregate'] }, clears: ['cortazar'] },
    { id: 'E8', title: 'Actas del jefe de obra', description: `Julio Barragán firmó ${nBarragan} actas de recibo, todas de proveedores con entregas reales. Delta no tiene ni una sola acta.`, reference: 'SELECT e.apellido, COUNT(*) FROM entregas en INNER JOIN empleados e ON en.recibido_por = e.id_empleado GROUP BY e.apellido;', match: { any: [['Barragán', String(nBarragan)], ['9', String(nBarragan)]], maxRows: 8, features: ['aggregate'] }, clears: ['barragan'] },
    { id: 'E9', title: 'Los contratos grandes', description: `La directora financiera aprobó ${nOcampo} contratos de 50.000 USD o más; ninguno de Delta.`, reference: 'SELECT aprobado_por, COUNT(*) FROM contratos WHERE monto >= 50000 GROUP BY aprobado_por;', match: { any: [['=4', String(nOcampo)], ['Ocampo', String(nOcampo)]], maxRows: 4, features: ['aggregate'] }, clears: ['ocampo'] },
  ],
  objectives: [
    { id: 'O1', title: 'Detectar el patrón', description: '¿Qué proveedor tiene un comportamiento fuera de lo normal?', evidence: ['E1', 'E4'], need: 1, tables: ['contratos', 'pagos', 'facturas'] },
    { id: 'O2', title: 'Seguir las aprobaciones', description: '¿Quién aprobó qué?', evidence: ['E2', 'E9'], need: 1, tables: ['contratos', 'empleados'] },
    { id: 'O3', title: 'Investigar al proveedor', description: '¿Quién está detrás de Delta?', evidence: ['E3', 'E5'], need: 1, tables: ['proveedores', 'empleados'] },
    { id: 'O4', title: 'Revisar pagos y entregas', description: 'Tesorería, registro de proveedores y obra.', evidence: ['E6', 'E7', 'E8'], need: 2, tables: ['pagos', 'entregas', 'proveedores'] },
  ],
  hints: [
    { id: 'H1', title: 'El umbral', evidence: 'E1', levels: ['Si 50.000 USD exige otra firma, ¿alguien firma contratos de 49.000 una y otra vez?', 'Cuenta contratos entre 45.000 y 49.999 por proveedor.', 'WHERE monto BETWEEN 45000 AND 49999 GROUP BY id_proveedor con COUNT(*). Une con proveedores para ver el nombre.'] },
    { id: 'H2', title: 'Las firmas', evidence: 'E2', requires: { evidence: ['E1'] }, levels: ['Un contrato no se aprueba solo.', 'Relaciona contratos.aprobado_por con empleados.', 'INNER JOIN empleados ON contratos.aprobado_por = empleados.id_empleado, agrupando por empleado.'] },
    { id: 'H3', title: 'Domicilios', evidence: 'E3', levels: ['Las empresas fachada suelen usar direcciones prestadas.', 'Compara la dirección de los proveedores con la de los empleados.', 'Un JOIN puede unir por cualquier columna: ON empleados.direccion = proveedores.direccion'] },
    { id: 'H4', title: 'Seguir el dinero', evidence: 'E4', levels: ['¿Cuánto se le pagó al proveedor sospechoso?', 'Los pagos se relacionan con facturas, y estas con contratos.', 'pagos → facturas → contratos: dos INNER JOIN y SUM(valor).'] },
    { id: 'H5', title: 'El registro', evidence: 'E5', levels: ['Todo proveedor entra al sistema por alguien.', 'proveedores tiene fecha_registro y registrado_por.', "WHERE razon_social LIKE '%Delta%'"] },
    { id: 'H6', title: 'La tesorería', evidence: 'E6', levels: ['La tesorera firmó pagos a Delta. ¿Es eso sospechoso?', 'Cuenta cuántos pagos autorizó cada empleado.', 'GROUP BY autorizado_por con COUNT(*)'] },
    { id: 'H7', title: 'La asistente', evidence: 'E7', levels: ['La asistente registra proveedores. ¿Registró a Delta?', 'Cuenta proveedores por registrado_por.', 'GROUP BY registrado_por con COUNT(*)'] },
    { id: 'H8', title: 'Las actas de obra', evidence: 'E8', levels: ['Si Delta prestó servicios, alguien firmó su recibo.', 'Cuenta actas de entrega por quien las recibió.', 'GROUP BY recibido_por con COUNT(*)'] },
    { id: 'H9', title: 'Los contratos grandes', evidence: 'E9', levels: ['¿La directora financiera aprobó algo de Delta?', 'Filtra contratos de 50.000 o más y agrupa por aprobador.', 'WHERE monto >= 50000 GROUP BY aprobado_por'] },
  ],
  accusation: { minKeyEvidence: 3, minObjectives: 3 },
  solution: {
    culprit: 'escalante',
    motive: 'Desviar dinero de la empresa a través de una sociedad a nombre de su cuñado.',
    opportunity: 'Podía aprobar sin otra firma cualquier contrato menor de 50.000 USD y certificar «asesorías» sin acta de entrega.',
    method: 'Registró él mismo a Delta con la dirección de su casa, le aprobó nueve contratos justo por debajo del umbral y certificó servicios inexistentes para que tesorería pagara.',
    justification: 'Delta es el único proveedor con contratos en la franja 45.000–49.999; todos los aprobó él, lo registró él y su dirección es la de su residencia.',
    eliminations: {
      tirado: { evidence: ['E6'], explanation: 'Autoriza casi todos los pagos de la empresa: pagó lo que compras certificó.' },
      cortazar: { evidence: ['E7', 'E5'], explanation: 'Registró a la mayoría de proveedores, pero a Delta lo registró Escalante.' },
      barragan: { evidence: ['E8'], explanation: 'Nunca firmó actas de Delta: no hubo entregas.' },
      ocampo: { evidence: ['E9'], explanation: 'Ningún contrato de Delta superó el umbral que requería su firma.' },
    },
    incriminating: ['E2', 'E3', 'E4', 'E5'],
    reveal: [
      'Rodolfo Escalante conocía el sistema de aprobaciones mejor que nadie. Sabía que 49.999 dólares no necesitaban otra firma.',
      'Creó Servicios Integrales Delta a nombre de su cuñado, con la dirección de su propia casa, y facturó «asesorías» que nadie podía ver ni tocar.',
      'En nueve meses, la operación fantasma cobró casi medio millón de dólares. La empresa ahora exige acta de entrega para todo servicio, por pequeño que sea.',
    ],
  },
  references: [
    { title: 'Contratos por proveedor', sql: 'SELECT id_proveedor, COUNT(*), SUM(monto) FROM contratos GROUP BY id_proveedor ORDER BY SUM(monto) DESC;' },
    { title: 'Contratos más grandes', sql: 'SELECT * FROM contratos ORDER BY monto DESC LIMIT 10;' },
    { title: 'Promedio de contrato por proveedor', sql: 'SELECT p.razon_social, AVG(c.monto) FROM contratos c INNER JOIN proveedores p ON c.id_proveedor = p.id_proveedor GROUP BY p.razon_social;' },
    { title: 'Proveedores registrados en 2024', sql: "SELECT * FROM proveedores WHERE fecha_registro >= '2024-01-01';" },
    { title: 'Contratos aprobados por persona', sql: 'SELECT aprobado_por, COUNT(*) FROM contratos GROUP BY aprobado_por;' },
    { title: 'Pagos por mes', sql: "SELECT date_trunc('month', fecha_pago) AS mes, SUM(valor) FROM pagos GROUP BY date_trunc('month', fecha_pago) ORDER BY mes;" },
    { title: 'Entregas por contrato', sql: 'SELECT id_contrato, COUNT(*) FROM entregas GROUP BY id_contrato HAVING COUNT(*) >= 3;' },
    { title: 'Empleados de compras', sql: "SELECT * FROM empleados WHERE departamento = 'Compras';" },
    { title: 'Facturas de asesorías', sql: "SELECT f.* FROM facturas f INNER JOIN contratos c ON f.id_contrato = c.id_contrato WHERE c.objeto LIKE 'Asesor%';" },
    { title: 'Proveedores con mayor pago total', sql: 'SELECT c.id_proveedor, SUM(pg.valor) AS pagado FROM pagos pg INNER JOIN facturas f ON pg.id_factura = f.id_factura INNER JOIN contratos c ON f.id_contrato = c.id_contrato GROUP BY c.id_proveedor HAVING SUM(pg.valor) > 400000;' },
    { title: 'Contratos menores de 10.000', sql: 'SELECT * FROM contratos WHERE monto < 10000;' },
    { title: 'Proveedores en la Zona Industrial', sql: "SELECT razon_social, direccion FROM proveedores WHERE direccion LIKE 'Zona Industrial%';" },
    { title: 'Pagos autorizados por la auxiliar', sql: 'SELECT * FROM pagos WHERE autorizado_por = 12;' },
    { title: 'Monto mínimo y máximo por aprobador', sql: 'SELECT aprobado_por, MIN(monto), MAX(monto) FROM contratos GROUP BY aprobado_por;' },
    { title: 'Entregas firmadas por almacenistas', sql: "SELECT en.* FROM entregas en INNER JOIN empleados e ON en.recibido_por = e.id_empleado WHERE e.cargo = 'Almacenista';" },
  ],
};
