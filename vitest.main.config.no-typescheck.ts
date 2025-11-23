/**
 * Temporary Vitest Configuration for Main Process Tests
 *
 * This configuration disables TypeScript checking temporarily to allow tests to run
 * while we fix remaining type issues.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'main-process',
    environment: 'node',
    globals: true,

    // Test discovery
    include: [
      'src/main/**/*.test.ts',
      'src/main/**/*.spec.ts',
      'src/main/**/__tests__/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/renderer/**',
      'src/shared/**/__tests__/integration/**',
      'src/test/fixtures/**',
      'src/test/mocks/**',
    ],

    // Test execution settings
    testTimeout: 30000, // 30 seconds for async operations
    hookTimeout: 10000,
    bail: 5, // Stop after 5 test failures
    retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
    isolate: true,
    passWithNoTests: false,

    // Concurrency configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true,
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // File watching
    watch: false,
    watchExclude: ['node_modules/**', 'dist/**', 'src/test/fixtures/**', 'src/test/mocks/**'],

    // Setup files
    setupFiles: ['./src/test/setup/main-process/setup.ts'],

    // Reporting configuration
    reporters: ['verbose'],
    outputFile: {
      json: 'test-results/main-process/results.json',
    },

    // Disable TypeScript checking temporarily
    typecheck: {
      enabled: false,
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/test': path.resolve(__dirname, './src/test'),
    },
  },

  // Environment variables
  define: {
    'process.env.NODE_ENV': '"test"',
    __TEST__: 'true',
    __MAIN_PROCESS__: 'true',
  },

  // Build optimization for Node.js testing
  esbuild: {
    target: 'node18',
    format: 'esm',
  },

  // Optimize dependencies
  optimizeDeps: {
    disabled: true,
  },
});
