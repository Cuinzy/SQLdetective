import { handle, json, requireAdmin } from '@/server/http';
import { investigationByCode } from '@/server/admin';
import { reportResponse } from '@/server/report-response';

export const maxDuration = 30;
type Ctx = { params: Promise<{ code: string }> };
export const GET = handle<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const { code } = await params;
  const inv = await investigationByCode(decodeURIComponent(code));
  if (!inv) return json({ error: 'Código inexistente.' }, 404);
  return reportResponse(inv, req.nextUrl.searchParams.get('format'));
});
