/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    // Use esbuild for JSX transformation instead of React plugin
    {
      name: 'esbuild-jsx',
      configResolved(resolvedConfig) {
        // Configure esbuild to handle JSX/TSX
        resolvedConfig.esbuild = {
          ...resolvedConfig.esbuild,
          jsx: 'automatic',
          jsxImportSource: 'react'
        };
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './src/test/setup/global/setup.ts',
      './src/test/setup/renderer/setup.ts'
    ],
    css: true,
    include: ['src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}', 'src/test/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'dist-electron'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
})