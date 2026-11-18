import { handle, json, requirePlayer } from '@/server/http';
import { investigationView, loadOwnInvestigation } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const GET = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  return json(await investigationView(await loadOwnInvestigation(p, id)));
});
