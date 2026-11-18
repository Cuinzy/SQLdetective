import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globalSetup: ['tests/setup/global-pg.ts'],
    setupFiles: ['tests/setup/env.ts'],
    testTimeout: 180_000,
    hookTimeout: 300_000,
    pool: 'forks',
    fileParallelism: false,
    reporters: ['verbose'],
  },
});
