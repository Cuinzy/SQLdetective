import { handle, json, readJson, requireAdmin } from '@/server/http';
import { verifyReport } from '@/server/report';

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const body = await readJson(req, 3_000_000);
  return json(await verifyReport(body));
});
