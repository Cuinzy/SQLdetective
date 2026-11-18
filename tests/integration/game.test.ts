// Pruebas 2, 3, 4, 5, 6, 7, 8 y 9 sobre el motor de juego con PostgreSQL real.
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  accuse, askQuestion, executeQuery, GameError, investigationView, loadOwnInvestigation, playerByToken, registerPlayer, requestHint, startInvestigation, type PlayerRow,
} from '@/server/game';
import { getCase } from '@/cases';
import { closePools, q } from '@/server/db';
import { generateSignedReport, verifyReport } from '@/server/report';
import { renderReportPdf } from '@/server/pdf';
import { createAdmin, globalStats, investigationDetail, listInvestigations, loginAdmin, adminBySession } from '@/server/admin';

afterAll(closePools);

async function newPlayer(name: string): Promise<PlayerRow> {
  const r = await registerPlayer({ fullName: name, group: 'Pruebas' });
  return (await playerByToken(r.token))!;
}

/** Consultas distintas y válidas para un caso: referencias + evidencias (todas analizadas por el servidor). */
function caseQueries(caseId: number) {
  const c = getCase(caseId)!;
  return { refs: c.references.map((r) => r.sql), ev: c.evidence.map((e) => ({ id: e.id, sql: e.reference })) };
}

async function expectGameError(p: Promise<unknown>, status: number, re?: RegExp) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    expect((e as GameError).status).toBe(status);
    if (re) expect((e as Error).message).toMatch(re);
    return;
  }
  throw new Error('Se esperaba un error del juego');
}

describe('Reglas de investigación (caso 1)', () => {
  let p: PlayerRow;
  let invId: string;
  const c = getCase(1)!;
  beforeAll(async () => {
    p = await newPlayer('Estudiante Reglas');
    invId = (await startInvestigation(p, 1)).id;
  });

  it('cada investigación recibe un código único con formato SQLD', async () => {
    const inv = await loadOwnInvestigation(p, invId);
    expect(inv.verification_code).toMatch(/^SQLD-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const again = await startInvestigation(p, 1);
    expect(again.id).toBe(invId); // reabrir no genera otro código mientras está en proceso
  });

  it('Prueba 3 · la misma consulta 20 veces suma una sola consulta válida', async () => {
    for (let i = 0; i < 20; i++) await executeQuery(p, invId, 'SELECT * FROM salas;');
    const inv = await loadOwnInvestigation(p, invId);
    expect(inv.total_queries).toBe(20);
    expect(inv.valid_queries).toBe(1);
  });

  it('Prueba 2 · con menos de 20 consultas válidas se rechaza la acusación', async () => {
    await expectGameError(accuse(p, invId, 'valeria', ['E1', 'E2'], 'Su tarjeta entró a la sala de la máscara a las 23:41.'), 403, /20 consultas/);
  });

  it('el entorno no revela la solución antes de resolver', async () => {
    const inv = await loadOwnInvestigation(p, invId);
    const v = await investigationView(inv);
    const s = JSON.stringify(v);
    expect(v.resolution).toBeUndefined();
    expect(s).not.toContain(c.solution.motive);
    expect(s).not.toContain(c.evidence[0].reference);
    expect(s).not.toContain('incriminating');
    // las preguntas bloqueadas por evidencia no se envían
    const val = v.characters.find((x) => x.id === 'valeria')!;
    expect(val.questions.find((qq) => qq.id === 'q3')).toBeUndefined();
    await expectGameError(askQuestion(p, invId, 'valeria', 'q3'), 403);
  });

  it('descubre evidencias por resultados reales y desbloquea interrogatorios y pistas', async () => {
    const r = await executeQuery(p, invId, "SELECT tarjeta, fecha_hora FROM registros_acceso WHERE id_sala = 3 AND fecha_hora >= '2025-03-14 22:00'");
    expect(r.newEvidence.map((e) => e.id)).toContain('E1');
    await executeQuery(p, invId, "SELECT * FROM empleados WHERE tarjeta_acceso = 'T-0457'");
    const a = await askQuestion(p, invId, 'valeria', 'q3');
    expect(a.contradiction).toBe(true);
    const h = await requestHint(p, invId, 'H2');
    expect(h.level).toBe(1);
    expect((await requestHint(p, invId, 'H2')).level).toBe(2);
  });

  it('Prueba 4 · acusación incorrecta exige 10 consultas adicionales y evidencia nueva; no se repite el sospechoso', async () => {
    const { refs, ev } = caseQueries(1);
    // Investigar hasta 20+ válidas con casi todas las evidencias (se reserva E10 para después)
    for (const e of ev.filter((x) => x.id !== 'E10')) await executeQuery(p, invId, e.sql);
    for (const s of refs) {
      const inv = await loadOwnInvestigation(p, invId);
      if (inv.valid_queries >= 21) break;
      await executeQuery(p, invId, s);
    }
    let inv = await loadOwnInvestigation(p, invId);
    expect(inv.valid_queries).toBeGreaterThanOrEqual(20);
    const wrong = await accuse(p, invId, 'hector', ['E1', 'E5'], 'El guardia estaba de turno y mintió sobre los accesos posteriores.');
    expect(wrong.correct).toBe(false);
    expect(wrong.view.gate.requiredQueries).toBe(30);
    await expectGameError(accuse(p, invId, 'valeria', ['E1', 'E2'], 'Su tarjeta entró a la sala de la máscara a las 23:41.'), 403, /30 consultas/);
    await expectGameError(accuse(p, invId, 'hector', ['E1', 'E2'], 'Insisto en que el guardia mintió sobre los accesos.'), 409, /Ya acusaste/);

    // 10 consultas válidas nuevas, pero aún sin evidencia nueva
    const extra = [
      "SELECT nombre FROM salas WHERE piso = 2", "SELECT * FROM objetos WHERE valor_estimado > 200000", "SELECT apellido, cargo FROM empleados WHERE nivel_acceso = 2",
      "SELECT * FROM visitantes WHERE tipo_invitacion = 'prensa'", "SELECT DISTINCT cargo FROM empleados", "SELECT * FROM camaras WHERE id_sala IN (1, 2)",
      "SELECT * FROM eventos_camara WHERE evento = 'autodiagnostico'", "SELECT nombre FROM objetos WHERE estado = 'en_bodega'", "SELECT * FROM visitantes WHERE hora_entrada < '19:30'",
      "SELECT declarante FROM testimonios WHERE cargo LIKE 'Guía%'", "SELECT COUNT(*) FROM registros_acceso WHERE tipo = 'salida'", "SELECT * FROM salas WHERE nivel_seguridad < 3",
    ];
    for (const s of extra) {
      inv = await loadOwnInvestigation(p, invId);
      if (inv.valid_queries >= 30) break;
      await executeQuery(p, invId, s);
    }
    inv = await loadOwnInvestigation(p, invId);
    expect(inv.valid_queries).toBeGreaterThanOrEqual(30);
    await expectGameError(accuse(p, invId, 'valeria', ['E1', 'E2'], 'Su tarjeta entró a la sala de la máscara a las 23:41.'), 403, /evidencia nueva/);

    // Prueba 5 · evidencia nueva → acusación correcta evaluada en el servidor
    const found = await executeQuery(p, invId, "SELECT nombre, manipulado_por FROM objetos WHERE nombre LIKE '%jade%'");
    expect(found.newEvidence.map((e) => e.id)).toContain('E10');
    const right = await accuse(p, invId, 'valeria', ['E1', 'E2', 'E3'], 'Su tarjeta entró a la sala a las 23:41 y su usuario desconectó la cámara.');
    expect(right.correct).toBe(true);
    expect(right.view.status).toBe('resuelto');
    expect(right.view.resolution?.culpritName).toBe('Valeria Quintero');
    expect(right.relevantEvidence).toBe(3);
  });

  it('una investigación cerrada no acepta más consultas ni acusaciones', async () => {
    await expectGameError(executeQuery(p, invId, 'SELECT * FROM objetos'), 409);
    await expectGameError(accuse(p, invId, 'nora', ['E1', 'E2'], 'Otra acusación después de cerrar el caso.'), 409);
  });

  it('Prueba 6 · el reporte contiene consultas, culpable, estado y código; la firma detecta manipulaciones', async () => {
    const inv = await loadOwnInvestigation(p, invId);
    const rep = await generateSignedReport(inv, 'json');
    expect(rep.payload.identificacion.codigo_verificacion).toBe(inv.verification_code);
    expect(rep.payload.resultados.estado).toBe('resuelto');
    expect(rep.payload.resultados.culpable_seleccionado).toBe('Valeria Quintero');
    expect(rep.payload.resultados.identifico_culpable).toBe(true);
    expect(rep.payload.consultas).toHaveLength(inv.total_queries);
    expect(rep.payload.consultas.some((x) => !x.ejecutada || !x.contabilizada)).toBe(true);
    expect(rep.payload.consultas[0].sql).toBe('SELECT * FROM salas;');
    const ok = await verifyReport(JSON.parse(JSON.stringify(rep)));
    expect(ok.firmaValida && ok.registrado && ok.coincideConBaseDeDatos).toBe(true);
    const bad = JSON.parse(JSON.stringify(rep));
    bad.payload.resultados.consultas_validas_contabilizadas += 5;
    expect((await verifyReport(bad)).firmaValida).toBe(false);
    const pdf = await renderReportPdf(rep);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-');
  });

  it('Prueba 7 · el panel docente encuentra la investigación por su código', async () => {
    await createAdmin('profe_pruebas', 'contraseña-muy-segura-123');
    const bad = await loginAdmin('profe_pruebas', 'incorrecta', '10.0.0.1');
    expect(bad.ok).toBe(false);
    const login = await loginAdmin('profe_pruebas', 'contraseña-muy-segura-123', '10.0.0.1');
    expect(login.ok).toBe(true);
    if (login.ok) expect((await adminBySession(login.token))?.username).toBe('profe_pruebas');
    const inv = await loadOwnInvestigation(p, invId);
    const d = (await investigationDetail(inv.verification_code.toLowerCase()))!;
    expect(d.summary.id).toBe(invId);
    expect(d.summary.student).toBe('Estudiante Reglas');
    expect(d.summary.solved).toBe(true);
    expect(d.correctCulprit).toBe('Valeria Quintero');
    expect(d.queries).toHaveLength(inv.total_queries);
    expect(d.concepts.find((c) => c.concepto === 'SELECT y filtros')!.consultas).toBeGreaterThan(10);
    const list = await listInvestigations({ code: inv.verification_code });
    expect(list).toHaveLength(1);
    const stats = await globalStats();
    expect(stats.solved).toBeGreaterThanOrEqual(1);
  });
});

describe('Prueba 8 · independencia entre estudiantes del mismo caso', () => {
  it('dos estudiantes no comparten consultas, evidencias ni historial', async () => {
    const a = await newPlayer('Estudiante A');
    const b = await newPlayer('Estudiante B');
    const ia = await startInvestigation(a, 2);
    const ib = await startInvestigation(b, 2);
    expect(ia.verification_code).not.toBe(ib.verification_code);
    await executeQuery(a, ia.id, 'SELECT * FROM solicitudes WHERE peso_devolucion_g < peso_entrega_g');
    await executeQuery(a, ia.id, 'SELECT * FROM mesas');
    const vb = await investigationView(await loadOwnInvestigation(b, ib.id));
    expect(vb.queries).toHaveLength(0);
    expect(vb.evidence).toHaveLength(0);
    // el mismo SQL en B sí cuenta: el historial es por investigación
    const rb = await executeQuery(b, ib.id, 'SELECT * FROM mesas');
    expect(rb.query.counted).toBe(true);
    // B no puede abrir la investigación de A
    await expectGameError(loadOwnInvestigation(b, ia.id), 404);
    await expectGameError(executeQuery(b, ia.id, 'SELECT * FROM mesas'), 404);
  });
});

describe('Prueba 9 · integridad: el cliente no puede alterar contadores ni el estado', () => {
  it('no se aceptan evidencias no descubiertas ni sospechosos inexistentes', async () => {
    const p = await newPlayer('Estudiante Integridad');
    const inv = await startInvestigation(p, 3);
    await expectGameError(accuse(p, inv.id, 'nadie', ['E1', 'E2'], 'Justificación suficientemente larga para la prueba.'), 400);
    // forzar el umbral directamente en la base simula a alguien con 20 consultas; aun así las evidencias deben ser propias
    await q('UPDATE game.investigations SET valid_queries = 25 WHERE id = $1', [inv.id]);
    await expectGameError(accuse(p, inv.id, 'ferro', ['E4', 'E5'], 'Justificación suficientemente larga para la prueba.'), 403, /fundamentales/);
  });
  it('los contadores solo cambian por consultas ejecutadas en el servidor', async () => {
    const p = await newPlayer('Estudiante Contador');
    const inv = await startInvestigation(p, 4);
    const r = await executeQuery(p, inv.id, 'SELECT * FROM habitaciones WHERE piso = 5');
    expect(r.view.stats.valid).toBe(1);
    const bad = await executeQuery(p, inv.id, 'SELECT * FROM habitaciones WHERE');
    expect(bad.query.executed).toBe(false);
    expect(bad.view.stats).toMatchObject({ total: 2, valid: 1, invalid: 1 });
  });
});
