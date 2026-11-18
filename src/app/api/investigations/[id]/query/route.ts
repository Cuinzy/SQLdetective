import { handle, json, readJson, requirePlayer } from '@/server/http';
import { executeQuery } from '@/server/game';

export const maxDuration = 30;
type Ctx = { params: Promise<{ id: string }> };
export const POST = handle<Ctx>(async (req, { params }) => {
  const p = await requirePlayer(req);
  const { id } = await params;
  const body = await readJson<{ sql?: unknown }>(req);
  if (typeof body.sql !== 'string') return json({ error: 'Falta la consulta.' }, 400);
  return json(await executeQuery(p, id, body.sql));
});
