import { inject } from 'vitest';

const env = inject('testEnv');
if (env) Object.assign(process.env, env);
