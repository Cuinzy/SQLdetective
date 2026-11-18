import { handle, json, requireAdmin } from '@/server/http';
import { investigationDetail } from '@/server/admin';
import { audit } from '@/server/game';

type Ctx = { params: Promise<{ code: string }> };
export const GET = handle<Ctx>(async (req, { params }) => {
  const a = await requireAdmin(req);
  const { code } = await params;
  const d = await investigationDetail(decodeURIComponent(code));
  if (!d) return json({ error: 'No existe ninguna investigación con ese código.' }, 404);
  await audit('admin', a.id, 'admin.view_investigation', d.summary.id, { code: d.summary.code });
  return json(d);
});
