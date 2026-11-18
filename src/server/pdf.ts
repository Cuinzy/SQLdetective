// Reporte PDF generado en el servidor con pdf-lib (sin dependencias nativas: apto para Vercel).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { SignedReport } from './report';

const W = 595.28;
const H = 841.89;
const M = 46;
const INK = rgb(0.13, 0.1, 0.08);
const RED = rgb(0.55, 0.16, 0.14);
const MUTED = rgb(0.4, 0.36, 0.3);
const PAPER = rgb(0.96, 0.93, 0.85);
const LINE = rgb(0.75, 0.68, 0.55);

/** WinAnsi (fuentes estándar) no cubre todo Unicode: se sustituyen caracteres no representables. */
function clean(s: string): string {
  return s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/[\t]/g, '  ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of clean(text).split('\n')) {
    let line = '';
    for (const word of raw.split(/(\s+)/)) {
      const tryLine = line + word;
      if (font.widthOfTextAtSize(tryLine, size) <= maxWidth) {
        line = tryLine;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      let w = word.trimStart();
      while (font.widthOfTextAtSize(w, size) > maxWidth) {
        let cut = w.length;
        while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--;
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      line = w;
    }
    out.push(line.trimEnd());
  }
  return out;
}

export async function renderReportPdf(rep: SignedReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`SQL Detective - ${rep.payload.identificacion.codigo_verificacion}`);
  doc.setAuthor('SQL Detective: Archivos del Crimen');
  doc.setSubject('Reporte oficial de investigación');
  doc.setCreator('SQL Detective');
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);
  const p = rep.payload;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const pages: PDFPage[] = [page];
  const newPage = () => {
    page = doc.addPage([W, H]);
    pages.push(page);
    y = H - M;
  };
  const ensure = (h: number) => {
    if (y - h < M + 30) newPage();
  };
  const text = (s: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) => {
    const font = opts.font ?? sans;
    const size = opts.size ?? 9.5;
    const x = opts.x ?? M;
    const lines = wrap(s, font, size, opts.width ?? W - x - M);
    for (const l of lines) {
      ensure(size + 3);
      page.drawText(l, { x, y: y - size, size, font, color: opts.color ?? INK });
      y -= size + (opts.gap ?? 3);
    }
  };
  const heading = (s: string) => {
    ensure(34);
    y -= 10;
    page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 18, color: INK });
    page.drawText(clean(s.toUpperCase()), { x: M + 8, y: y - 13, size: 10, font: bold, color: PAPER });
    y -= 26;
  };
  const kv = (rows: [string, string][]) => {
    for (const [k, v] of rows) {
      const lines = wrap(v, sans, 9.5, W - 2 * M - 170);
      ensure(lines.length * 12.5 + 2);
      page.drawText(clean(k), { x: M, y: y - 9.5, size: 9, font: bold, color: MUTED });
      for (const [i, l] of lines.entries()) page.drawText(l, { x: M + 170, y: y - 9.5 - i * 12.5, size: 9.5, font: sans, color: INK });
      y -= lines.length * 12.5 + 3;
      page.drawLine({ start: { x: M, y: y + 1 }, end: { x: W - M, y: y + 1 }, thickness: 0.3, color: LINE });
      y -= 2;
    }
  };

  // Portada / cabecera
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: INK });
  page.drawText('SQL DETECTIVE', { x: M, y: H - 52, size: 26, font: monoBold, color: rgb(0.95, 0.72, 0.25) });
  page.drawText('ARCHIVOS DEL CRIMEN  ·  INFORME OFICIAL DE INVESTIGACIÓN', { x: M, y: H - 72, size: 9, font: bold, color: PAPER });
  page.drawText(clean(`${p.identificacion.caso} — ${p.identificacion.titulo_caso}`), { x: M, y: H - 92, size: 12, font: bold, color: PAPER });
  const stamp = p.resultados.identifico_culpable ? 'CASO RESUELTO' : p.resultados.estado.toUpperCase();
  page.drawRectangle({ x: W - M - 150, y: H - 98, width: 150, height: 34, borderColor: RED, borderWidth: 2.5, color: rgb(0.96, 0.9, 0.85), rotate: undefined });
  page.drawText(clean(stamp), { x: W - M - 140, y: H - 86, size: 12, font: bold, color: RED });
  y = H - 130;

  heading('Identificación');
  kv([
    ['Estudiante', p.identificacion.estudiante],
    ['Grupo', p.identificacion.grupo],
    ['Código estudiantil', p.identificacion.codigo_estudiantil ?? '—'],
    ['Caso investigado', `${p.identificacion.caso} · ${p.identificacion.titulo_caso}`],
    ['Código de verificación', p.identificacion.codigo_verificacion],
    ['Inicio', p.identificacion.inicio],
    ['Finalización', p.identificacion.fin ?? '—'],
  ]);

  heading('Resultados');
  const r = p.resultados;
  kv([
    ['Estado del caso', r.estado],
    ['Culpable seleccionado', r.culpable_seleccionado ?? '—'],
    ['¿Identificó al culpable?', r.identifico_culpable ? 'SÍ' : 'NO'],
    ['Consultas ejecutadas (total)', String(r.consultas_totales)],
    ['Consultas válidas contabilizadas', String(r.consultas_validas_contabilizadas)],
    ['Consultas inválidas', String(r.consultas_invalidas)],
    ['Acusaciones fallidas', String(r.acusaciones_fallidas)],
    ['Pistas utilizadas (niveles)', String(r.pistas_utilizadas)],
    ['Evidencias descubiertas', `${r.evidencias_descubiertas} de ${r.evidencias_totales}`],
    ['Intentos de pegado bloqueados', String(r.intentos_de_pegado_bloqueados)],
    ['Tiempo empleado', r.tiempo_empleado],
  ]);

  heading('Conceptos SQL practicados (análisis estructural)');
  kv(p.conceptos_sql.map((c) => [c.concepto, `${c.consultas} consulta(s)`] as [string, string]));

  heading('Evidencias descubiertas');
  if (!p.evidencias.length) text('Ninguna evidencia descubierta.', { color: MUTED });
  for (const e of p.evidencias) text(`[${e.id}] ${e.titulo}  ·  consulta #${e.consulta ?? '—'}  ·  ${e.fecha_hora}`);

  heading('Acusaciones');
  if (!p.acusaciones.length) text('No se realizaron acusaciones.', { color: MUTED });
  for (const a of p.acusaciones) {
    text(`${a.correcta ? 'CORRECTA' : 'INCORRECTA'} · ${a.sospechoso} · ${a.fecha_hora}`, { font: bold });
    text(`Evidencias presentadas: ${a.evidencias_presentadas.join(', ')}`);
    text(`Justificación: ${a.justificacion}`, { color: MUTED });
    y -= 4;
  }

  heading('Pistas solicitadas');
  if (!p.pistas.length) text('No se solicitaron pistas.', { color: MUTED });
  for (const h of p.pistas) text(`${h.pista} · nivel ${h.nivel} · ${h.fecha_hora}`);

  heading('Interrogatorios');
  if (!p.interrogatorios.length) text('No se realizaron interrogatorios.', { color: MUTED });
  for (const i of p.interrogatorios) text(`${i.personaje}: «${i.pregunta}» · ${i.fecha_hora}`);

  heading(`Historial SQL completo (${p.consultas.length} consultas)`);
  for (const qy of p.consultas) {
    const status = !qy.ejecutada ? 'NO EJECUTADA' : qy.contabilizada ? 'VÁLIDA · CONTABILIZADA' : 'EJECUTADA · NO CONTABILIZADA';
    ensure(60);
    y -= 4;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: LINE });
    y -= 4;
    text(`#${qy.numero}  ·  ${qy.fecha_hora}  ·  ${status}`, { font: bold, size: 9 });
    text(`Sintaxis válida: ${qy.sintaxis_valida ? 'sí' : 'no'}  ·  Tablas: ${qy.tablas.join(', ') || '—'}  ·  Resultado: ${qy.resultado_resumen}`, { size: 8.5, color: MUTED });
    if (qy.evidencias.length) text(`Evidencia descubierta: ${qy.evidencias.join(', ')}`, { size: 8.5, color: RED, font: bold });
    if (qy.error) text(`Error: ${qy.error}`, { size: 8.5, color: RED });
    if (qy.motivo_no_contabilizada && qy.ejecutada) text(`No contabilizada: ${qy.motivo_no_contabilizada}`, { size: 8.5, color: MUTED });
    text(qy.sql, { font: mono, size: 8.5, x: M + 10, gap: 2 });
  }

  heading('Integridad');
  kv([
    ['Algoritmo', rep.integridad.algoritmo],
    ['ID del reporte', rep.integridad.id_reporte],
    ['Generado', rep.integridad.generado],
    ['SHA-256 del contenido', rep.integridad.sha256_contenido],
    ['Firma', rep.integridad.firma],
  ]);
  text('El docente puede contrastar este reporte con el registro oficial ingresando el código de verificación en el panel administrativo. La firma se calcula en el servidor con una clave que nunca se envía al navegador.', { size: 8.5, color: MUTED });

  pages.forEach((pg, i) => {
    pg.drawText(clean(`${p.identificacion.codigo_verificacion}  ·  página ${i + 1} de ${pages.length}  ·  firma ${rep.integridad.firma.slice(0, 16)}…`), { x: M, y: 24, size: 7.5, font: mono, color: MUTED });
  });
  return doc.save();
}
