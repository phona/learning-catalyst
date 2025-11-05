import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import viteMemoryPlugin from './src/utils/vite-memory-plugin.js'
// @ts-ignore
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  // Get workspace from environment variable
  const workspace = process.env.WORKSPACE_PATH || process.cwd()

  // Pass workspace to the renderer process via define
  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
        '@/renderer': path.join(__dirname, 'src/renderer'),
        '@/main': path.join(__dirname, 'src/main'),
        '@/shared': path.join(__dirname, 'src/shared'),
        // Use renderer-safe database module in renderer process
        // './src/modules/database/local-db': path.join(__dirname, 'src/modules/database/local-db-renderer.ts'),
      },
    },
    define: {
      __WORKSPACE_PATH__: JSON.stringify(workspace)
    },
    // Memory optimization settings
    esbuild: {
      target: 'es2020',
    },
    plugins: [
      react({
        // Minimal configuration to avoid preamble detection issues
        jsxImportSource: undefined,
        include: '**/*.{jsx,tsx}',
        exclude: ['node_modules', '**/node_modules/**']
      }),
      // Node.js polyfills for LangChain compatibility
      nodePolyfills({
        // Enable specific polyfills needed by LangChain
        protocolImports: true,
        // Enable polyfills for Node.js built-in modules
        include: [
          'async_hooks' as any,
          'events',
          'util',
          'crypto',
          'stream',
          'string_decoder',
          'url',
          'querystring',
          'path',
          'fs'
        ],
        // Exclude polyfills that might cause issues in browser
        exclude: [
          'buffer' // Use Vite's built-in buffer polyfill
        ]
      }),
      // Memory leak prevention plugin for development
      ...(isServe ? [viteMemoryPlugin({
        maxMemoryMB: 600, // Alert at 600MB
        checkIntervalMs: 15000, // Check every 15 seconds
        enableCleanup: true,
        verbose: process.env.DEBUG_VITE_MEMORY === 'true'
      })] : []),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main/index.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
            } else {
              args.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: [
                  'sqlite-electron',
                  'electron'
                ],
                output: {
                  format: 'cjs'
                }
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: [
                  ...Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                  'sqlite-electron'
                ],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].js'
                }
              },
            },
          },
        },
      }),
    ],
    server: (() => {
      const baseConfig = {
        // Memory optimization settings for development server
        fs: {
          // Limit file system watching to reduce memory usage
          strict: false,
        },
        watch: {
          // Use polling to reduce file watcher memory usage
          usePolling: false,
          interval: 1000,
          // Exclude node_modules and other large directories from watching
          ignored: [
            '**/node_modules/**',
            '**/dist/**',
            '**/dist-electron/**',
            '**/.git/**',
            '**/test_workspace/**',
            '**/external/**'
          ],
        },
        hmr: {
          // Limit HMR connections to prevent memory leaks
          port: 5174,
        },
      };

      if (process.env.VSCODE_DEBUG) {
        const url = new URL(pkg.debug?.env?.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173/')
        return {
          ...baseConfig,
          host: url.hostname,
          port: +url.port,
        };
      }

      return {
        ...baseConfig,
        host: '127.0.0.1',
        port: 5173,
      };
    })(),
    clearScreen: false,
    optimizeDeps: {
      // Pre-bundle dependencies to improve performance
      include: [
        'react',
        'react-dom',
        'zustand',
        '@langchain/openai',
        'langchain',
        '@langchain/community',
        '@langchain/core',
        '@langchain/textsplitters'
      ],
      // Memory optimization for dependency management
      force: false, // Don't force rebuild unless necessary
      // Exclude large dependencies that cause memory issues
      exclude: [
        '@anthropic-ai/claude-code',
        'qdrant-js',
        'sqlite-electron'
      ],
      // Add Node.js polyfills for LangChain
      add: [
        'async_hooks',
        'events',
        'util',
        'crypto',
        'stream',
        'string_decoder',
        'url',
        'querystring'
      ],
      // Limit the size of pre-bundled chunks
      maxChunkSize: 500000, // 500KB chunks
      // Enable more aggressive garbage collection
      noDedupe: false,
    },
    build: {
      // Reduce memory usage during development
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress warnings to reduce console noise
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
        // Memory optimization for build chunks
        ...(isServe && {
          output: {
            // Split code into smaller chunks to reduce memory usage
            manualChunks: {
              vendor: ['react', 'react-dom'],
              state: ['zustand'],
              electron: ['electron'],
            },
            // Limit chunk sizes in development
            maxChunkSize: 500000, // 500KB
          },
        }),
      },
      // Development-specific build optimizations
      ...(isServe && {
        minify: false, // Skip minification in dev to save memory
        sourcemap: true,
        target: 'es2020',
        // Reduce parallelism to save memory
        chunkSizeWarningLimit: 1000,
      }),
    },
  }
})