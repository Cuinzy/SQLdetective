import { describe, it, expect } from 'vitest';
import { analyzeSql, SqlRejected } from '@/server/sql/analyzer';

const ctx = { schema: 'case_01', tables: ['empleados', 'registros_acceso', 'salas', 'objetos'] };
const ok = (sql: string) => analyzeSql(sql, ctx);
const rejected = (sql: string) => {
  try {
    analyzeSql(sql, ctx);
  } catch (e) {
    expect(e).toBeInstanceOf(SqlRejected);
    return e as SqlRejected;
  }
  throw new Error('Se esperaba un rechazo para: ' + sql);
};

describe('Analizador SQL — consultas permitidas', () => {
  it('acepta SELECT con WHERE, ORDER BY, LIKE, IN, BETWEEN', () => {
    const a = ok("SELECT nombre FROM empleados WHERE apellido LIKE 'Q%' AND id_empleado IN (1,2) AND nivel_acceso BETWEEN 1 AND 3 ORDER BY nombre DESC");
    expect(a.tables).toEqual(['empleados']);
    for (const f of ['where', 'like', 'in', 'between', 'and', 'order_by']) expect(a.features).toContain(f);
  });
  it('detecta INNER, LEFT y RIGHT JOIN', () => {
    expect(ok('SELECT * FROM empleados e JOIN registros_acceso r ON e.tarjeta_acceso = r.tarjeta').features).toContain('inner_join');
    expect(ok('SELECT * FROM salas s LEFT JOIN registros_acceso r ON r.id_sala = s.id_sala WHERE r.id_registro IS NULL').features).toEqual(expect.arrayContaining(['left_join', 'is_null']));
    expect(ok('SELECT * FROM registros_acceso r RIGHT JOIN salas s ON r.id_sala = s.id_sala').features).toContain('right_join');
  });
  it('detecta agregaciones, GROUP BY, HAVING, DISTINCT y subconsultas', () => {
    const a = ok('SELECT id_sala, COUNT(DISTINCT tarjeta) FROM registros_acceso GROUP BY id_sala HAVING COUNT(*) > 3');
    expect(a.features).toEqual(expect.arrayContaining(['aggregate', 'count', 'group_by', 'having', 'distinct']));
    expect(ok('SELECT * FROM objetos WHERE valor_estimado = (SELECT MAX(valor_estimado) FROM objetos)').features).toContain('subquery');
    expect(ok('SELECT * FROM objetos').features).not.toContain('subquery');
  });
  it('permite CTE y UNION sin confundirlos con tablas ajenas', () => {
    const a = ok('WITH nocturnos AS (SELECT * FROM registros_acceso WHERE fecha_hora > \'2025-03-14 22:00\') SELECT * FROM nocturnos');
    expect(a.tables).toEqual(['registros_acceso']);
    expect(a.features).toContain('cte');
    expect(ok('SELECT nombre FROM empleados UNION SELECT nombre FROM salas').features).toContain('union');
  });
  it('acepta el esquema propio calificado', () => {
    expect(ok('SELECT * FROM case_01.salas').tables).toEqual(['salas']);
  });
});

describe('Analizador SQL — seguridad', () => {
  it.each([
    ['INSERT INTO salas VALUES (9, \'x\', 1, 1)', 'not_select'],
    ['UPDATE empleados SET nombre = \'x\'', 'not_select'],
    ['DELETE FROM salas', 'not_select'],
    ['DROP TABLE salas', 'not_select'],
    ['CREATE TABLE x (a int)', 'not_select'],
    ['SELECT 1; DELETE FROM salas', 'multiple'],
    ['SELECT * FROM game.players', 'forbidden_schema'],
    ['SELECT * FROM case_02.mesas', 'forbidden_schema'],
    ['SELECT * FROM pg_catalog.pg_roles', 'forbidden_schema'],
    ['SELECT * FROM pg_roles', 'forbidden_table'],
    ['SELECT * FROM information_schema.tables', 'forbidden_schema'],
    ['SELECT * FROM jugadores', 'forbidden_table'],
    ["SELECT pg_sleep(10)", 'forbidden_function'],
    ["SELECT set_config('role', 'postgres', true)", 'forbidden_function'],
    ["SELECT query_to_xml('select 1', true, true, '')", 'forbidden_function'],
    ['SELECT pg_catalog.upper(nombre) FROM empleados', 'forbidden_function'],
    ['SELECT * FROM generate_series(1, 10)', 'table_function'],
    ['SELECT * FROM empleados WHERE id_empleado = $1', 'parameter'],
    ['SELECT * FROM empleados FOR UPDATE', 'locking'],
  ])('rechaza: %s', (sql, code) => {
    expect(rejected(sql).code).toBe(code);
  });
  it('rechaza referencias de columna a otro esquema', () => {
    expect(rejected('SELECT game.players.full_name FROM empleados').code).toBe('forbidden_schema');
  });
});

describe('Analizador SQL — retroalimentación', () => {
  it('sugiere la palabra clave correcta ante errores de tipeo', () => {
    const e = rejected('SELEC * FROM empleados');
    expect(e.code).toBe('syntax');
    expect(e.hint).toMatch(/SELECT/);
    expect(rejected('SELECT nombre FROM empleados WERE id_empleado = 1').hint).toMatch(/WHERE/);
  });
  it('detecta comillas sin cerrar y sugiere tablas parecidas', () => {
    expect(rejected("SELECT * FROM empleados WHERE nombre = 'Ana").hint).toMatch(/comilla/i);
    expect(rejected('SELECT * FROM empleado').hint).toMatch(/empleados/);
  });
});

describe('Huellas de normalización', () => {
  it('normaliza espacios y mayúsculas de palabras clave', () => {
    expect(ok('select   nombre from EMPLEADOS').normalizedHash).toBe(ok('SELECT nombre\n FROM empleados;').normalizedHash);
  });
  it('misma plantilla con distintos literales', () => {
    const a = ok('SELECT * FROM empleados WHERE id_empleado = 1');
    const b = ok('SELECT * FROM empleados WHERE id_empleado = 2');
    expect(a.normalizedHash).not.toBe(b.normalizedHash);
    expect(a.templateHash).toBe(b.templateHash);
  });
  it('misma forma (FROM/WHERE) con distinta proyección', () => {
    const a = ok("SELECT nombre FROM empleados WHERE turno = 'noche'");
    const b = ok("SELECT apellido, cargo FROM empleados WHERE turno = 'tarde' ORDER BY apellido");
    expect(a.shapeHash).toBe(b.shapeHash);
    expect(a.templateHash).not.toBe(b.templateHash);
  });
});
