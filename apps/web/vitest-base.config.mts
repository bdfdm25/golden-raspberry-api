import { defineConfig } from 'vitest/config';

/**
 * Loaded by the Angular unit-test builder through angular.json (runnerConfig).
 * Thresholds live here because the builder has no CLI flag for them, and a threshold
 * nobody enforces is worse than none.
 */
export default defineConfig({
  test: {
    coverage: {
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
