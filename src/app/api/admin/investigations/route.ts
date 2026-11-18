import { handle, json, requireAdmin } from '@/server/http';
import { listInvestigations, toCsv } from '@/server/admin';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  const s = req.nextUrl.searchParams;
  const caseRaw = s.get('case');
  const csv = s.get('format') === 'csv';
  const rows = await listInvestigations({
    name: s.get('name') || undefined,
    group: s.get('group') || undefined,
    code: s.get('code') || undefined,
    caseId: caseRaw !== null && caseRaw !== '' ? Number(caseRaw) : undefined,
    from: s.get('from') || undefined,
    to: s.get('to') || undefined,
    status: s.get('status') || undefined,
    limit: csv ? 5000 : 500,
  });
  if (csv)
    return new Response(toCsv(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sql-detective-resultados.csv"', 'Cache-Control': 'no-store' },
    });
  return json({ rows });
});
