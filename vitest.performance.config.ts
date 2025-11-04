/**
 * Vitest Configuration for Performance Testing
 *
 * Configuration for load testing, performance validation, and
 * stress testing of concurrent sessions, streaming responses,
 * and resource management.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'performance',
    environment: 'node',
    include: [
      'test/performance/**/*.{test,spec}.{js,ts}',
      'src/test/performance/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/test/main-thread',
      'src/test/renderer-thread',
      'test/integration'
    ],
    globals: true,
    setupFiles: [
      'test/setup/performance-setup.ts'
    ],
    testTimeout: 300000, // 5 minutes for performance tests
    hookTimeout: 30000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 8 // Maximum threads for concurrent testing
      }
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      'junit': 'test-results/performance/junit.xml',
      'json': 'test-results/performance/results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/performance',
      include: [
        'electron/main/services/**/*.{js,ts}',
        'electron/main/handlers/**/*.{js,ts}',
        'src/modules/**/*.{js,ts}'
      ],
      exclude: [
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/node_modules/**',
        '**/dist/**',
        'test/**',
        'coverage/**'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 55,
          lines: 60,
          statements: 60
        }
      }
    },
    // Performance-specific configuration
    benchmark: {
      include: [
        'test/performance/**/*.{bench,benchmark}.{js,ts}'
      ],
      exclude: [
        'node_modules',
        'dist'
      ],
      outputFile: 'test-results/performance/benchmarks.json'
    },
    // Allow concurrent test execution for performance testing
    sequence: {
      concurrent: true,
      shuffle: false // Keep order for predictable performance metrics
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron/main'),
      '@test': path.resolve(__dirname, './src/test'),
      '@performance': path.resolve(__dirname, './test/performance'),
      '@fixtures': path.resolve(__dirname, './test/fixtures'),
      '@mocks': path.resolve(__dirname, './test/utils/mocks')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.PERFORMANCE_TEST': '"true"'
  },
  esbuild: {
    target: 'node18'
  }
});