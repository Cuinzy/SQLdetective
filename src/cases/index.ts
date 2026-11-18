// Catálogo de casos. CONTIENE SOLUCIONES: solo debe importarse desde código de servidor.
import type { CaseDef } from './types';
import { case00 } from './case00';
import { case01 } from './case01';
import { case02 } from './case02';
import { case03 } from './case03';
import { case04 } from './case04';
import { case05 } from './case05';
import { case06 } from './case06';
import { case07 } from './case07';
import { case08 } from './case08';
import { case09 } from './case09';
import { case10 } from './case10';
import { case11 } from './case11';
import { case12 } from './case12';
import { case13 } from './case13';
import { case14 } from './case14';
import { case15 } from './case15';

if (typeof window !== 'undefined') throw new Error('Los casos solo pueden cargarse en el servidor.');

export const ALL_CASES: CaseDef[] = [case00, case01, case02, case03, case04, case05, case06, case07, case08, case09, case10, case11, case12, case13, case14, case15];

const byId = new Map(ALL_CASES.map((c) => [c.id, c]));

export function getCase(id: number): CaseDef | undefined {
  return byId.get(id);
}
