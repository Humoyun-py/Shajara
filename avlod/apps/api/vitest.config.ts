import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    // One database shared by all files; run them sequentially in a single process.
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
