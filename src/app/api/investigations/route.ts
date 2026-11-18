import { handle, json, readJson, requirePlayer, str } from '@/server/http';
import { startInvestigation } from '@/server/game';

export const POST = handle(async (req) => {
  const p = await requirePlayer(req);
  const body = await readJson(req);
  const caseId = Number(body.caseId);
  if (!Number.isInteger(caseId)) return json({ error: 'Caso inválido.' }, 400);
  const inv = await startInvestigation(p, caseId, str(body.group, 60));
  return json({ id: inv.id, code: inv.verification_code });
});
