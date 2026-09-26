import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node environment
    environment: 'node',

    // Global test utilities (describe, it, expect) without imports
    globals: true,

    // Test file patterns
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/config/**',
        'node_modules/**',
        'tests/**',
        'coverage/**',
      ],
      // Enforce thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Isolate test files — each file runs in a fresh module scope
    isolate: true,
    fileParallelism: false,

    // Timeout per test and hook (ms)
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Setup file for global test utilities (DB connection, etc.)
    // setupFiles: ['./tests/setup.js'],
  },
});
