import { handle, json, readJson, requirePlayer, str } from '@/server/http';
import { accuse } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const body = await readJson(req);
  const ev = Array.isArray(body.evidenceIds) ? (body.evidenceIds as unknown[]).slice(0, 30).map((x) => str(x, 10)) : [];
  return json(await accuse(p, id, str(body.suspectId, 40), ev, str(body.justification, 2100)));
});
