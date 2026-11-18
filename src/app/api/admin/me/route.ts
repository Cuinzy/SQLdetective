import { handle, json, requireAdmin } from '@/server/http';

export const GET = handle(async (req) => {
  const a = await requireAdmin(req);
  return json({ username: a.username });
});
