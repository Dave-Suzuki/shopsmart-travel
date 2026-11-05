import { defineConfig } from 'vitest/config';

// Unit tests for pure logic (money, dates, encoding). Security-rules tests live in
// tests/rules and run against the Firestore emulator via `npm run test:rules`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
