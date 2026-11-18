import { handle, json, requirePlayer } from '@/server/http';
import { abandonInvestigation } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  await abandonInvestigation(p, id);
  return json({ ok: true });
});
