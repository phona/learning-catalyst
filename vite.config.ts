import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
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
        // Use renderer-safe database module in renderer process
        './src/modules/database/local-db': path.join(__dirname, 'src/modules/database/local-db-renderer.ts'),
      },
    },
    define: {
      __WORKSPACE_PATH__: JSON.stringify(workspace)
    },
    plugins: [
      react(),
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
                  ...Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                  'sqlite3'
                ],
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
                  'sqlite3'
                ],
              },
            },
          },
        },
      }),
    ],
    server: process.env.VSCODE_DEBUG && (() => {
      const url = new URL(pkg.debug?.env?.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173/')
      return {
        host: url.hostname,
        port: +url.port,
      }
    })(),
    clearScreen: false,
  }
})