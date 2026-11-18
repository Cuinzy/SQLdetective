import { handle, json, requirePlayer } from '@/server/http';
import { playerOverview } from '@/server/game';

export const GET = handle(async (req) => {
  const p = await requirePlayer(req);
  return json(await playerOverview(p));
});
