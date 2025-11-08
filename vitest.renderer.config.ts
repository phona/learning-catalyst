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
  plugins: [
    // Configure React plugin with minimal settings to avoid preamble issues
    react({
      include: '**/*.{jsx,tsx}',
      exclude: ['node_modules', '**/node_modules/**'],
      // Disable fast refresh to avoid preamble detection issues
      fastRefresh: false,
    })
  ],
  test: {
    name: 'renderer-thread',
    environment: 'jsdom',
    include: ['src/renderer/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'src/main/**',
      'src/__tests__/integration/**',
      'src/__tests__/performance/**'
    ],
    globals: true,
    setupFiles: ['src/renderer/__tests__/setup.ts'],
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
        'src/renderer/**/*.{js,ts,jsx,tsx}',
        'src/shared/**/*.{js,ts}'
      ],
      exclude: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**'
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
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/shared': path.resolve(__dirname, './src/shared')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  esbuild: {
    target: 'es2020'
  }
});