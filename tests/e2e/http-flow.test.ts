// Prueba de extremo a extremo: levanta la aplicación compilada (next start) contra un PostgreSQL real
// y recorre el flujo completo por HTTP, como lo haría el navegador.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getCase } from '@/cases';
import { createAdmin } from '@/server/admin';
import { closePools } from '@/server/db';

const PORT = Number(process.env.E2E_PORT || 3199);
const BASE = `http://localhost:${PORT}`;
let server: ChildProcess | null = null;

class Client {
  cookies = new Map<string, string>();
  async req(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    for (const sc of res.headers.getSetCookie()) {
      const [kv] = sc.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i);
      const v = kv.slice(i + 1);
      if (v) this.cookies.set(k, v);
      else this.cookies.delete(k);
    }
    return res;
  }
  async json<T = Record<string, unknown>>(method: string, url: string, body?: unknown) {
    const r = await this.req(method, url, body);
    return { status: r.status, data: (await r.json().catch(() => ({}))) as T };
  }
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(BASE + '/api/health');
      if (r.ok) return;
    } catch {
      /* aún iniciando */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('El servidor Next.js no respondió a tiempo');
}

beforeAll(async () => {
  if (!fs.existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'))) throw new Error('Ejecuta "npm run build" antes de las pruebas e2e.');
  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], { env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) }, stdio: 'pipe' });
  server.stderr?.on('data', (d) => process.env.E2E_DEBUG && console.error(String(d)));
  await waitForServer();
  await createAdmin('docente_e2e', 'clave-docente-e2e-2026');
});

afterAll(async () => {
  server?.kill();
  await closePools();
});

describe('Flujo completo por HTTP', () => {
  const student = new Client();
  let invId = '';
  let code = '';

  it('las páginas principales responden', async () => {
    for (const p of ['/', '/registro', '/recuperar', '/admin']) {
      const r = await fetch(BASE + p);
      expect(r.status, p).toBe(200);
      expect(await r.text()).toContain('SQL Detective');
    }
  });

  it('registro del estudiante con credencial y sesión persistente (cookie httpOnly)', async () => {
    const r = await student.req('POST', '/api/player/register', { fullName: 'Lucía E2E Prueba', group: 'Grupo E2E', studentCode: '2026-001' });
    expect(r.status).toBe(200);
    const sc = r.headers.getSetCookie().join(' ');
    expect(sc).toMatch(/HttpOnly/i);
    const me = await student.json<{ player: { fullName: string } }>('GET', '/api/player/me');
    expect(me.data.player.fullName).toBe('Lucía E2E Prueba');
  });

  it('inicia el caso 5 y obtiene un código único', async () => {
    const r = await student.json<{ id: string; code: string }>('POST', '/api/investigations', { caseId: 5 });
    expect(r.status).toBe(200);
    invId = r.data.id;
    code = r.data.code;
    expect(code).toMatch(/^SQLD-/);
  });

  it('rechaza peticiones de otro origen (CSRF) y SQL destructivo', async () => {
    const r = await student.req('POST', `/api/investigations/${invId}/query`, { sql: 'SELECT * FROM usuarios' }, { Origin: 'https://sitio-malicioso.example' });
    expect(r.status).toBe(403);
    const d = await student.json<{ query: { executed: boolean; errorMessage: string } }>('POST', `/api/investigations/${invId}/query`, { sql: 'DROP TABLE usuarios' });
    expect(d.data.query.executed).toBe(false);
    expect(d.data.query.errorMessage).toMatch(/solo lectura/);
  });

  it('no permite acusar con menos de 20 consultas válidas', async () => {
    const r = await student.json<{ error: string }>('POST', `/api/investigations/${invId}/accuse`, { suspectId: 'simon', evidenceIds: ['E1', 'E2'], justification: 'Justificación de prueba con suficientes caracteres.' });
    expect(r.status).toBe(403);
  });

  it('investiga con consultas reales hasta resolver el caso', async () => {
    const c = getCase(5)!;
    for (const sql of [...c.evidence.map((e) => e.reference), ...c.references.map((r) => r.sql)]) {
      const r = await student.json<{ view: { stats: { valid: number } } }>('POST', `/api/investigations/${invId}/query`, { sql });
      expect(r.status).toBe(200);
    }
    const v = await student.json<{ stats: { valid: number }; gate: { unlocked: boolean }; evidence: { id: string }[] }>('GET', `/api/investigations/${invId}`);
    expect(v.data.stats.valid).toBeGreaterThanOrEqual(20);
    expect(v.data.gate.unlocked).toBe(true);
    const wrong = await student.json<{ correct: boolean }>('POST', `/api/investigations/${invId}/accuse`, { suspectId: 'nadia', evidenceIds: ['E1', 'E6'], justification: 'Su cuenta soporte2 hizo los cambios de notas esa noche.' });
    expect(wrong.data.correct).toBe(false);
    const blocked = await student.json('POST', `/api/investigations/${invId}/accuse`, { suspectId: 'simon', evidenceIds: ['E3', 'E4'], justification: 'Reservó el equipo y forzó la contraseña desde allí.' });
    expect(blocked.status).toBe(403);
  });

  it('el informe PDF y el JSON firmado se descargan con el código y las consultas', async () => {
    const pdf = await student.req('GET', `/api/investigations/${invId}/report?format=pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    const json = await student.json<{ payload: { identificacion: { codigo_verificacion: string }; consultas: unknown[]; resultados: { estado: string; culpable_seleccionado: string } }; integridad: { firma: string } }>('GET', `/api/investigations/${invId}/report?format=json`);
    expect(json.data.payload.identificacion.codigo_verificacion).toBe(code);
    expect(json.data.payload.consultas.length).toBeGreaterThan(20);
    expect(json.data.payload.resultados.estado).toBe('en proceso');
    expect(json.data.payload.resultados.culpable_seleccionado).toBe('Nadia Fonseca');
    expect(json.data.integridad.firma).toMatch(/^[0-9a-f]{64}$/);
    (globalThis as Record<string, unknown>).__report = json.data;
    const csv = await student.req('GET', `/api/investigations/${invId}/report?format=csv`);
    expect(await csv.text()).toContain(code);
  });

  it('otro estudiante no puede ver la investigación ajena', async () => {
    const other = new Client();
    await other.req('POST', '/api/player/register', { fullName: 'Intruso E2E', group: 'X' });
    expect((await other.req('GET', `/api/investigations/${invId}`)).status).toBe(404);
    expect((await other.req('GET', `/api/investigations/${invId}/report?format=json`)).status).toBe(404);
    expect((await new Client().req('GET', `/api/investigations/${invId}`)).status).toBe(401);
  });

  it('el panel docente exige autenticación y verifica el código', async () => {
    const anon = new Client();
    expect((await anon.req('GET', '/api/admin/stats')).status).toBe(401);
    expect((await anon.req('GET', `/api/admin/investigations/${code}`)).status).toBe(401);
    const redirect = await anon.req('GET', `/admin/investigacion/${code}`);
    expect([307, 308]).toContain(redirect.status);
    const prof = new Client();
    expect((await prof.req('POST', '/api/admin/login', { username: 'docente_e2e', password: 'mala' })).status).toBe(401);
    expect((await prof.req('POST', '/api/admin/login', { username: 'docente_e2e', password: 'clave-docente-e2e-2026' })).status).toBe(200);
    const d = await prof.json<{ summary: { student: string; code: string; failedAccusations: number }; correctCulprit: string; queries: unknown[] }>('GET', `/api/admin/investigations/${code}`);
    expect(d.status).toBe(200);
    expect(d.data.summary.student).toBe('Lucía E2E Prueba');
    expect(d.data.summary.failedAccusations).toBe(1);
    expect(d.data.correctCulprit).toBe('Simón Echeverri');
    expect(d.data.queries.length).toBeGreaterThan(20);
    const csv = await prof.req('GET', '/api/admin/investigations?format=csv');
    expect(await csv.text()).toContain(code);
    const verify = await prof.json<{ firmaValida: boolean; registrado: boolean }>('POST', '/api/admin/verify-report', (globalThis as Record<string, unknown>).__report);
    expect(verify.data.firmaValida && verify.data.registrado).toBe(true);
    // el código por sí solo no da acceso público: el estudiante no puede usar rutas docentes
    expect((await student.req('GET', `/api/admin/investigations/${code}`)).status).toBe(401);
  });

  it('el estudiante recupera su credencial desde otro navegador con placa + clave', async () => {
    const c = new Client();
    const reg = await c.json<{ badge: string; recoveryKey: string }>('POST', '/api/player/register', { fullName: 'Recuperación E2E', group: 'G' });
    const fresh = new Client();
    expect((await fresh.req('POST', '/api/player/recover', { badge: reg.data.badge, recoveryKey: 'XXXX-XXXX-XXXX-XXXX' })).status).toBe(401);
    expect((await fresh.req('POST', '/api/player/recover', { badge: reg.data.badge, recoveryKey: reg.data.recoveryKey })).status).toBe(200);
    const me = await fresh.json<{ player: { fullName: string } }>('GET', '/api/player/me');
    expect(me.data.player.fullName).toBe('Recuperación E2E');
  });
});
