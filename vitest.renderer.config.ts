/**
 * Vitest Configuration for Renderer Thread Testing
 *
 * Configuration for testing React components and renderer-side code
 * with proper DOM environment and component testing setup.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'renderer-thread',
    environment: 'jsdom',
    include: ['src/test/renderer/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'src/test/main-thread',
      'src/test/integration'
    ],
    globals: true,
    setupFiles: ['src/test/renderer/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 5000,
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
      'junit': 'test-results/renderer/junit.xml',
      'json': 'test-results/renderer/results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/renderer',
      include: [
        'src/components/**/*.{js,ts,jsx,tsx}',
        'src/hooks/**/*.{js,ts}',
        'src/services/**/*.{js,ts}',
        'src/pages/**/*.{js,ts,jsx,tsx}'
      ],
      exclude: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        'electron/**'
      ],
      thresholds: {
        global: {
          branches: 65,
          functions: 70,
          lines: 75,
          statements: 75
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'es2020'
  }
});