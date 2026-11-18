#!/bin/sh
# Regenera src/cases/index.ts con todos los archivos caseNN.ts presentes
cd "$(dirname "$0")/../src/cases"
{
  echo "// Catálogo de casos. CONTIENE SOLUCIONES: solo debe importarse desde código de servidor."
  echo "import type { CaseDef } from './types';"
  for f in case*.ts; do n=${f%.ts}; echo "import { $n } from './$n';"; done
  echo ""
  echo "if (typeof window !== 'undefined') throw new Error('Los casos solo pueden cargarse en el servidor.');"
  echo ""
  printf "export const ALL_CASES: CaseDef[] = ["
  sep=""; for f in case*.ts; do printf "%s%s" "$sep" "${f%.ts}"; sep=", "; done
  echo "];"
  echo ""
  echo "const byId = new Map(ALL_CASES.map((c) => [c.id, c]));"
  echo ""
  echo "export function getCase(id: number): CaseDef | undefined {"
  echo "  return byId.get(id);"
  echo "}"
} > index.ts
