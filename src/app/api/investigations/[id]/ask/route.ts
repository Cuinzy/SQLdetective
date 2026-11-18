import { handle, json, readJson, requirePlayer, str } from '@/server/http';
import { askQuestion } from '@/server/game';

type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const body = await readJson(req);
  return json(await askQuestion(p, id, str(body.characterId, 40), str(body.questionId, 20)));
});
