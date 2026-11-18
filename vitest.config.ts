import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globalSetup: ['tests/setup/global-pg.ts'],
    setupFiles: ['tests/setup/env.ts'],
    testTimeout: 120_000,
    hookTimeout: 300_000,
    pool: 'forks',
    fileParallelism: false,
    reporters: ['verbose'],
  },
});
