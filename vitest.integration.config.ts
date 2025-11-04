/**
 * Vitest Configuration for Integration Testing
 *
 * Configuration for end-to-end integration tests that validate
 * cross-process communication, service orchestration, and complete
 * user workflows from UI to backend.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'jsdom',
    include: [
      'test/integration/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/test/integration/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/test/main-thread',
      'src/test/renderer-thread',
      'test/performance'
    ],
    globals: true,
    setupFiles: [
      'test/setup/integration-setup.ts',
      'src/test/main-thread/setup.ts'
    ],
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 15000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 2 // Reduced for integration tests to avoid resource conflicts
      }
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      'junit': 'test-results/integration/junit.xml',
      'json': 'test-results/integration/results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/integration',
      include: [
        'electron/main/services/**/*.{js,ts}',
        'electron/main/handlers/**/*.{js,ts}',
        'src/components/**/*.{js,ts,jsx,tsx}',
        'src/services/**/*.{js,ts}',
        'src/modules/**/*.{js,ts}'
      ],
      exclude: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        'test/**',
        'coverage/**'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 65,
          lines: 70,
          statements: 70
        }
      }
    },
    // Sequential test execution for integration tests to avoid conflicts
    sequence: {
      concurrent: false
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron/main'),
      '@test': path.resolve(__dirname, './src/test'),
      '@integration': path.resolve(__dirname, './test'),
      '@fixtures': path.resolve(__dirname, './test/fixtures'),
      '@mocks': path.resolve(__dirname, './test/utils/mocks')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.INTEGRATION_TEST': '"true"'
  },
  esbuild: {
    target: 'node18'
  },
  // Additional dependencies for integration testing
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously'
  }
});