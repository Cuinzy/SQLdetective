// Prueba 1: ejecución SQL real (SELECT, WHERE, ORDER BY, GROUP BY, HAVING, INNER/LEFT/RIGHT JOIN) y aislamiento.
import { describe, it, expect, afterAll } from 'vitest';
import pg from 'pg';
import { runSandboxed } from '@/server/sql/sandbox';
import { closePools, sandboxConnectionString } from '@/server/db';
import { ALL_CASES } from '@/cases';
import { validateCaseData } from '@/server/validate';

afterAll(closePools);

describe('Prueba 1 · Ejecución SQL real sobre PostgreSQL', () => {
  it('SELECT + WHERE + ORDER BY', async () => {
    const r = await runSandboxed(0, "SELECT nombre, anios_servicio FROM agentes WHERE turno = 'tarde' ORDER BY anios_servicio DESC");
    expect(r.columns).toEqual(['nombre', 'anios_servicio']);
    expect(r.rows.map((x) => x[0])).toEqual(['Inés Varela', 'Lía Montoya', 'Bruno Salas', 'Tomás Ibarra']);
  });
  it('GROUP BY + HAVING', async () => {
    const r = await runSandboxed(0, 'SELECT turno, COUNT(*) AS n FROM agentes GROUP BY turno HAVING COUNT(*) >= 4 ORDER BY turno');
    expect(r.rows).toEqual([['mañana', '4'], ['tarde', '4']]);
  });
  it('INNER JOIN', async () => {
    const r = await runSandboxed(0, "SELECT a.nombre, c.hora_entrada FROM registro_cocina c INNER JOIN agentes a ON a.id_agente = c.id_agente WHERE c.accion LIKE '%taza%' ORDER BY c.hora_entrada");
    expect(r.rows.at(-1)).toEqual(['Tomás Ibarra', '14:52:00']);
  });
  it('LEFT JOIN encuentra filas sin pareja', async () => {
    const r = await runSandboxed(0, 'SELECT a.nombre FROM agentes a LEFT JOIN registro_cocina c ON c.id_agente = a.id_agente WHERE c.id_registro IS NULL ORDER BY a.nombre');
    expect(r.rows.map((x) => x[0])).toEqual(['Gael Restrepo', 'Ulises Pardo']);
  });
  it('RIGHT JOIN conserva la tabla derecha', async () => {
    const r = await runSandboxed(0, 'SELECT a.nombre, c.id_registro FROM registro_cocina c RIGHT JOIN agentes a ON c.id_agente = a.id_agente');
    expect(r.rowCount).toBe(12);
  });
  it('limita el resultado a 500 filas y lo marca como recortado', async () => {
    const r = await runSandboxed(9, 'SELECT * FROM lecturas_sensor');
    expect(r.rowCount).toBe(500);
    expect(r.truncated).toBe(true);
  });
});

describe('Aislamiento del entorno de consultas (segunda línea de defensa en PostgreSQL)', () => {
  it('rechaza múltiples sentencias incluso si se saltara el analizador', async () => {
    await expect(runSandboxed(1, 'SELECT 1; SELECT 2')).rejects.toThrow();
  });
  it('transacción de solo lectura: no se puede modificar', async () => {
    await expect(runSandboxed(1, 'DELETE FROM salas')).rejects.toThrow();
    const r = await runSandboxed(1, 'SELECT count(*) FROM salas');
    expect(r.rows[0][0]).toBe('8');
  });
  it('el rol del caso no puede leer datos de estudiantes ni de otros casos', async () => {
    await expect(runSandboxed(1, 'SELECT * FROM game.players')).rejects.toMatchObject({ code: '42501' });
    await expect(runSandboxed(1, 'SELECT * FROM case_02.mesas')).rejects.toMatchObject({ code: '42501' });
  });
  it('la conexión aislada sin SET ROLE tampoco accede al esquema game', async () => {
    const { url, mode } = sandboxConnectionString();
    expect(mode).toBe('login');
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    await expect(c.query('SELECT * FROM game.investigations')).rejects.toMatchObject({ code: '42501' });
    await expect(c.query('SELECT * FROM case_01.salas')).rejects.toMatchObject({ code: '42501' });
    await c.end();
  });
  it('detiene consultas demasiado lentas (statement_timeout)', async () => {
    const t = Date.now();
    await expect(runSandboxed(1, 'SELECT pg_sleep(30)')).rejects.toMatchObject({ code: '57014' });
    expect(Date.now() - t).toBeLessThan(15_000);
  });
});

describe('Prueba 10 · Los 15 casos tienen datos, evidencias alcanzables y solución verificable', () => {
  it.each(ALL_CASES.map((c) => [c.code, c] as const))('%s', async (_code, c) => {
    const rep = await validateCaseData(c);
    expect(rep.errors).toEqual([]);
    if (c.level > 0) expect(rep.usefulQueries).toBeGreaterThanOrEqual(20);
  });
});
