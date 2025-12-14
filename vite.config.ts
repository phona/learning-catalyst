import { rmSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
// import viteMemoryPlugin from './src/utils/vite-memory-plugin.js'
// @ts-ignore
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true });

  const isServe = command === 'serve';
  const isBuild = command === 'build';
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;

  // Get workspace from environment variable
  const workspace = process.env.WORKSPACE_PATH || process.cwd();

  // Pass workspace to the renderer process via define
  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
        '@/renderer': path.join(__dirname, 'src/renderer'),
        '@/main': path.join(__dirname, 'src/main'),
        '@/shared': path.join(__dirname, 'src/shared'),
      },
    },
    define: {
      __WORKSPACE_PATH__: JSON.stringify(workspace),
    },
    // Memory optimization settings
    esbuild: {
      target: 'es2020',
    },
    plugins: [
      react({
        // Explicit JSX runtime configuration to avoid preamble detection issues
        jsxRuntime: 'automatic',
        jsxImportSource: undefined,
        include: '**/*.{jsx,tsx}',
        exclude: ['node_modules', '**/node_modules/**'],
        // Add Babel configuration to handle semicolon imports correctly
        babel: {
          presets: [
            [
              '@babel/preset-react',
              {
                runtime: 'automatic',
                development: isServe,
                importSource: undefined,
              },
            ],
          ],
        },
      }),
      // Memory leak prevention plugin for development
      // ...(isServe ? [viteMemoryPlugin({
      //   maxMemoryMB: 600, // Alert at 600MB
      //   checkIntervalMs: 15000, // Check every 15 seconds
      //   enableCleanup: true,
      //   verbose: process.env.DEBUG_VITE_MEMORY === 'true'
      // })] : []),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'src/main/index.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Electron App');
            } else {
              args.startup();
            }
          },
          vite: {
            resolve: {
              alias: {
                '@': path.join(__dirname, 'src'),
                '@/renderer': path.join(__dirname, 'src/renderer'),
                '@/main': path.join(__dirname, 'src/main'),
                '@/shared': path.join(__dirname, 'src/shared'),
              },
            },
            build: {
              sourcemap: true,
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: [
                  'better-sqlite3',
                  'sqlite-electron',
                  'electron',
                  'langchain',
                  '@langchain/core',
                  '@langchain/openai',
                  '@langchain/community',
                  '@langchain/langgraph',
                  '@langchain/textsplitters',
                  '@qdrant/js-client-rest',
                  '@qdrant/qdrant-js',
                  '@xenova/transformers',
                  'axios',
                  '@assistant-ui/react-markdown',
                ],
                output: {
                  format: 'cjs',
                },
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'src/main/preload/index.ts',
          vite: {
            resolve: {
              alias: {
                '@': path.join(__dirname, 'src'),
                '@/renderer': path.join(__dirname, 'src/renderer'),
                '@/main': path.join(__dirname, 'src/main'),
                '@/shared': path.join(__dirname, 'src/shared'),
              },
            },
            build: {
              sourcemap: true, // generate maps for preload
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: [
                  ...Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                  'sqlite-electron',
                ],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].cjs',
                },
              },
            },
          },
        },
      }),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
    },
    server: (() => {
      const devPort = +(process.env.VITE_DEV_PORT || process.env.PORT || '3010');
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
            '**/external/**',
          ],
        },
        hmr: {},
      };

      if (process.env.VSCODE_DEBUG) {
        const url = new URL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173/');
        return {
          ...baseConfig,
          host: url.hostname,
          port: +url.port,
          strictPort: false,
        };
      }

      return {
        ...baseConfig,
        host: '127.0.0.1',
        port: devPort,
        strictPort: false,
      };
    })(),
    clearScreen: false,
    build: {
      sourcemap: true, // emit source maps for renderer build
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
  };
});
