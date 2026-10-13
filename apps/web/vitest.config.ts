import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: '../../coverage/web',
      thresholds: {
        statements: 53,
        branches: 51,
        functions: 53,
        lines: 55,
        'src/portal/extension-client.ts': {
          statements: 55,
          branches: 40,
          functions: 50,
          lines: 60,
        },
        'src/batch/controller.ts': {
          statements: 43,
          branches: 47,
          functions: 45,
          lines: 45,
        },
        'src/nfe/xml.ts': {
          statements: 95,
          branches: 75,
          functions: 95,
          lines: 95,
        },
        'src/danfe/render.ts': {
          statements: 75,
          branches: 65,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
