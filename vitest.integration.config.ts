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
  plugins: [
    react({
      // Configure React plugin for integration testing to avoid preamble detection issues
      jsxImportSource: undefined,
      include: '**/*.{jsx,tsx}',
      exclude: ['node_modules', '**/node_modules/**'],
      // Test environment doesn't need Fast Refresh
      fastRefresh: false,
    }),
  ],
  test: {
    name: 'integration',
    environment: 'jsdom',
    include: ['src/test/integration/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'src/main/**/__tests__/**',
      'src/renderer/**/__tests__/**',
      'src/test/performance/**',
    ],
    globals: true,
    setupFiles: ['./src/test/setup/integration/setup.ts', './src/test/setup/main-process/setup.ts'],
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 15000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 2, // Reduced for integration tests to avoid resource conflicts
      },
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      junit: 'test-results/integration/junit.xml',
      json: 'test-results/integration/results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/integration',
      include: [
        'src/main/services/**/*.{js,ts}',
        'src/main/handlers/**/*.{js,ts}',
        'src/renderer/components/**/*.{js,ts,jsx,tsx}',
        'src/renderer/services/**/*.{js,ts}',
        'src/renderer/stores/**/*.{js,ts}',
        'src/shared/**/*.{js,ts}',
      ],
      exclude: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        'test/**',
        'coverage/**',
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 65,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Sequential test execution for integration tests to avoid conflicts
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@test': path.resolve(__dirname, './test'),
      '@integration': path.resolve(__dirname, './test'),
      '@fixtures': path.resolve(__dirname, './test/fixtures'),
      '@mocks': path.resolve(__dirname, './test/utils/mocks'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.INTEGRATION_TEST': '"true"',
  },
  esbuild: {
    target: 'node18',
  },
  // Additional dependencies for integration testing
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously',
  },
});
