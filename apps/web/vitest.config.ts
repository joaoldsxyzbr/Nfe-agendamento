import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', '../../worker/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: '../../coverage/web',
      thresholds: {
        statements: 48,
        branches: 48,
        functions: 50,
        lines: 50,
      },
    },
  },
});
