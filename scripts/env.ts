// Carga .env / .env.local para los scripts de línea de comandos (Next.js los carga por su cuenta).
import fs from 'node:fs';
for (const f of ['.env.local', '.env']) {
  if (fs.existsSync(f)) {
    try {
      (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(f);
    } catch {
      /* ignorar */
    }
  }
}
