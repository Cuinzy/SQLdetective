import { generateSignedReport } from './report';
import { renderReportPdf } from './pdf';
import type { InvRow } from './game';

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // evita inyección de fórmulas en hojas de cálculo
  return /[",;\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
};

export async function reportResponse(inv: InvRow, format: string | null): Promise<Response> {
  const base = `sql-detective-${inv.verification_code}`;
  if (format === 'pdf') {
    const rep = await generateSignedReport(inv, 'pdf');
    const bytes = await renderReportPdf(rep);
    return new Response(Buffer.from(bytes), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${base}.pdf"`, 'Cache-Control': 'no-store' },
    });
  }
  if (format === 'csv') {
    const rep = await generateSignedReport(inv, 'csv');
    const head = ['numero', 'fecha_hora', 'sql', 'sintaxis_valida', 'ejecutada', 'contabilizada', 'tablas', 'filas', 'evidencias', 'error', 'motivo_no_contabilizada'];
    const lines = rep.payload.consultas.map((c) =>
      [c.numero, c.fecha_hora, c.sql, c.sintaxis_valida, c.ejecutada, c.contabilizada, c.tablas.join(' '), c.filas, c.evidencias.join(' '), c.error, c.motivo_no_contabilizada].map(esc).join(','),
    );
    const meta = `# ${rep.payload.identificacion.codigo_verificacion} · ${rep.payload.identificacion.estudiante} · reporte ${rep.integridad.id_reporte} · firma ${rep.integridad.firma}`;
    return new Response('﻿' + [meta, head.join(','), ...lines].join('\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.csv"`, 'Cache-Control': 'no-store' },
    });
  }
  const rep = await generateSignedReport(inv, 'json');
  return new Response(JSON.stringify(rep, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.json"`, 'Cache-Control': 'no-store' },
  });
}
