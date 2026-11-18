// Crea (o actualiza) un usuario docente con contraseña cifrada con scrypt.
// Uso: npm run admin:create -- <usuario>            (pide la contraseña de forma interactiva)
//   o: ADMIN_USERNAME=docente ADMIN_PASSWORD='...' npm run admin:create
import './env';
import readline from 'node:readline';
import { createAdmin } from '../src/server/admin';
import { closePools } from '../src/server/db';

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.includes(question)) out.output.write(s);
        else out.output.write('*');
      };
    }
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(a);
    });
  });
}

async function main() {
  const username = process.argv[2] || process.env.ADMIN_USERNAME || (await ask('Usuario docente: '));
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await ask('Contraseña (mínimo 12 caracteres): ', true);
    const again = await ask('Repite la contraseña: ', true);
    if (password !== again) throw new Error('Las contraseñas no coinciden.');
  }
  await createAdmin(username.trim(), password);
  console.log(`Docente «${username.trim()}» listo. Ingresa en /admin.`);
  await closePools();
}
main().catch(async (e) => {
  console.error('Error:', e.message);
  await closePools();
  process.exit(1);
});
