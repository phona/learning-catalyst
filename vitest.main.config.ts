/**
 * Vitest Configuration for Main Thread Testing
 *
 * Separate configuration for testing main thread services with proper
 * environment setup, mocking, and test isolation.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'main-thread',
    environment: 'node',
    include: ['src/test/main-thread/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      'dist',
      'src/test/renderer-thread',
      'src/test/integration'
    ],
    globals: true,
    setupFiles: ['src/test/main-thread/setup.ts'],
    testTimeout: 30000, // 30 seconds for async operations
    hookTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    reporters: ['verbose'],
    outputFile: {
      'junit': 'test-results/main-thread/junit.xml',
      'json': 'test-results/main-thread/results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/main-thread',
      include: [
        'electron/main/services/**/*.{js,ts}',
        'electron/main/handlers/agent-handlers.{js,ts}'
      ],
      exclude: [
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/node_modules/**',
        '**/dist/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron/main'),
      '@test': path.resolve(__dirname, './src/test')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'node18'
  }
});