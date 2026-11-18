import { handle, json, readJson, requirePlayer } from '@/server/http';
import { recordPasteAttempts } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const body = await readJson(req);
  await recordPasteAttempts(p, id, Number(body.count));
  return json({ ok: true });
});
