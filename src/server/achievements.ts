// Logros basados en hechos reales registrados en la base de datos.
import type pg from 'pg';
import type { Feature } from '@/cases/types';
import { ACHIEVEMENTS } from '@/lib/progression';
import { getCase } from '@/cases';
import type { InvRow } from './game';

interface Ctx {
  features: Feature[];
  executed: boolean;
  counted: boolean;
  accusation?: boolean;
}

export async function checkAchievements(client: pg.PoolClient, playerId: string, inv: InvRow, ctx: Ctx): Promise<{ id: string; title: string }[]> {
  const have = new Set((await client.query<{ achievement_id: string }>('SELECT achievement_id FROM game.achievements WHERE player_id = $1', [playerId])).rows.map((r) => r.achievement_id));
  const earn: string[] = [];
  const want = (id: string, cond: boolean) => {
    if (cond && !have.has(id)) earn.push(id);
  };
  const isCase = inv.case_id > 0;
  if (ctx.executed) {
    want('primera_consulta', isCase && ctx.counted);
    want('diez_seguidas', inv.consecutive_valid >= 10);
    want('inner_join', ctx.features.includes('inner_join'));
    want('left_join', ctx.features.includes('left_join'));
    want('right_join', ctx.features.includes('right_join'));
    want('agrupador', ctx.features.includes('group_by') && ctx.features.includes('having'));
  }
  if (inv.solved) {
    const c = getCase(inv.case_id)!;
    if (inv.case_id === 0) want('tutorial', true);
    else {
      const solved = (await client.query<{ n: string }>('SELECT count(DISTINCT case_id) AS n FROM game.investigations WHERE player_id = $1 AND solved AND case_id > 0', [playerId])).rows[0];
      const n = Number(solved.n);
      want('primer_caso', n >= 1);
      want('sin_errores', inv.failed_accusations === 0);
      want('pocas_pistas', inv.hints_used <= 3);
      want('cinco_casos', n >= 5);
      want('quince_casos', n >= 15);
      const found = (await client.query<{ n: string }>('SELECT count(*) AS n FROM game.evidence_found WHERE investigation_id = $1', [inv.id])).rows[0];
      want('coleccionista', Number(found.n) >= c.evidence.length);
    }
  }
  for (const id of earn)
    await client.query('INSERT INTO game.achievements (player_id, achievement_id, investigation_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [playerId, id, inv.id]);
  return earn.map((id) => ({ id, title: ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id }));
}
