import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Hand-rolled Vitest setup for this Expo/React Native project — there is no
// official `jest-expo`-equivalent Vitest preset (see SPEC.md "Testing
// Strategy"). Scope: `lib/` and `hooks/` only. Route files (`app/**`) and
// components are intentionally not unit-tested here; they're QA'd manually
// via Argent per AGENTS.md.
export default defineConfig({
  resolve: {
    alias: {
      '@': dirname,
    },
    // React Native's package.json uses the "react-native" export condition
    // for its own entry points; keep this in case any transitive import
    // relies on it during resolution.
    conditions: ['react-native'],
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['lib/**/*.ts', 'hooks/**/*.ts'],
      exclude: ['lib/habit-types.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
