import { handle, json, requireAdmin } from '@/server/http';
import { globalStats } from '@/server/admin';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json(await globalStats());
});
