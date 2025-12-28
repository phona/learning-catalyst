/**
 * Vitest Configuration for Renderer Thread Testing
 *
 * Configuration for testing React components and renderer-side code
 * with proper DOM environment and component testing setup.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

// Use a minimal React configuration to avoid type conflicts
export default defineConfig({
  plugins: [
    // Skip the React plugin for now to avoid type conflicts
    // JSX will be handled by TypeScript compiler
  ],
  test: {
    name: 'renderer-thread',
    environment: 'jsdom',
    include: ['src/renderer/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'src/main/**',
      'src/test/integration/**',
      'src/test/performance/**',
    ],
    globals: true,
    setupFiles: ['./src/test/setup/renderer/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    reporters: ['verbose'],
    outputFile: {
      junit: 'test-results/renderer/junit.xml',
      json: 'test-results/renderer/results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/renderer',
      // Cover all renderer code (UI, hooks, stores, services, utils)
      include: ['src/renderer/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        '**/index.ts',
        '**/index.tsx',
        'src/shared/**',
        'src/renderer/types/**',
      ],
      thresholds: {
        global: {
          branches: 65,
          functions: 70,
          lines: 75,
          statements: 75,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/test': path.resolve(__dirname, './src/test'),
      '@/stores': path.resolve(__dirname, './src/renderer/stores'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  esbuild: {
    target: 'es2020',
    jsx: 'automatic',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
});
