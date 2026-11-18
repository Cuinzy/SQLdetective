import { handle, json, readJson, requirePlayer, str } from '@/server/http';
import { requestHint } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const body = await readJson(req);
  return json(await requestHint(p, id, str(body.hintId, 20)));
});
