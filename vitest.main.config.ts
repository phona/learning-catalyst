/**
 * Vitest Configuration for Main Process Tests
 *
 * Optimized configuration for Node.js environment testing of main process services
 * with comprehensive coverage reporting and performance monitoring.
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
      'src/devtools/**/concept-parsing.smoke.ts',
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
    globalSetup: ['./src/test/setup/main-process/global-setup.ts'],

    // Reporting configuration
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: 'test-results/main-process/results.json',
      html: 'test-results/main-process/index.html',
      junit: 'test-results/main-process/junit.xml',
    },

    // Enhanced coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/main-process',
      include: ['src/main/**/*.{js,ts}', 'src/shared/modules/**/*.{js,ts}'],
      exclude: [
        'src/main/**/*.test.{js,ts}',
        'src/main/**/*.spec.{js,ts}',
        'src/main/**/*.d.ts',
        'src/main/index.ts', // Entry point tested separately
        '**/__tests__/**',
        '**/__mocks__/**',
        'node_modules/**',
        'dist/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Service-specific higher thresholds
        'src/main/services/agents/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/main/services/langchain/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/main/services/catalyst/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/main/services/core/database/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
      clean: true,
      cleanOnRerun: true,
    },

    // Performance and memory monitoring
    logHeapUsage: true,
    dangerouslyIgnoreUnhandledErrors: false,

    // TypeScript checking (temporarily disabled to allow test execution)
    typecheck: {
      enabled: false,
      tsconfig: './tsconfig.json',
      only: true,
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
