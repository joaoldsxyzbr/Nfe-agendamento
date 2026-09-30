import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: '../../coverage/extension',
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
        'src/background.ts': {
          statements: 60,
          branches: 55,
          functions: 60,
          lines: 60,
        },
        'src/protocol.ts': {
          statements: 88,
          branches: 88,
          functions: 95,
          lines: 90,
        },
        'src/supplier-store.ts': {
          statements: 90,
          branches: 80,
          functions: 95,
          lines: 90,
        },
        'src/portal-request.ts': {
          statements: 50,
          branches: 55,
          functions: 40,
          lines: 50,
        },
        'src/portal-dom.ts': {
          statements: 80,
          branches: 80,
          functions: 95,
          lines: 85,
        },
      },
    },
  },
});
