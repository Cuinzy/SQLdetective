import { handle, requirePlayer } from '@/server/http';
import { loadOwnInvestigation } from '@/server/game';
import { reportResponse } from '@/server/report-response';

export const maxDuration = 30;
type Ctx = { params: Promise<{ id: string }> };
export const GET = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const inv = await loadOwnInvestigation(p, id);
  return reportResponse(inv, req.nextUrl.searchParams.get('format'));
});
