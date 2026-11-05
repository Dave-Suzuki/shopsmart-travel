import { defineConfig } from 'vitest/config';

// Firestore security-rules tests. Run with `npm run test:rules`, which starts the
// Firestore emulator around this suite.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
