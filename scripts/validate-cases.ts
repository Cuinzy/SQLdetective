import './env';
import { ALL_CASES } from '../src/cases';
import { validateCaseData } from '../src/server/validate';
import { closePools } from '../src/server/db';

async function main() {
  const only = process.argv[2] ? Number(process.argv[2]) : undefined;
  let bad = 0;
  for (const c of ALL_CASES) {
    if (only !== undefined && c.id !== only) continue;
    const r = await validateCaseData(c);
    console.log(`${r.code}: ${r.errors.length ? 'ERRORES' : 'OK'} · consultas útiles de referencia: ${r.usefulQueries} · registros: ${r.totalRows}`);
    for (const e of r.errors) console.log('   ✗', e);
    if (r.errors.length) bad++;
  }
  await closePools();
  process.exit(bad ? 1 : 0);
}
main();
