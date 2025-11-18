/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupAllIpcHandlers } from './handlers'
import { createAppMenu } from './menu'
import { getQdrantManager } from './qdrant-manager'
import { QdrantManager } from './qdrant-manager'
import { initializeCatalystService, disposeCatalystService } from './services/catalyst/catalyst-service'
import { mainServiceRegistry } from './services/registry/MainServiceRegistry'
import { mainServiceContainerManager } from './services/container/service-container'
import { MAIN_SERVICE_TOKENS } from './services/registry/ServiceTokens'
// Memory debugging utility for development
import { startMemoryDebug, cleanupMemoryDebug } from '../shared/utils/memory-debug'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null
let isShuttingDown = false

const preload = path.join(__dirname, '../preload/index.cjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow(): Promise<void> {
  win = new BrowserWindow({
    title: 'Learning Catalyst',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC || '', 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
      // Enable Node.js APIs for LangChain compatibility
      nodeIntegration: false,
      contextIsolation: true,
      // Allow Node.js APIs in renderer for LangChain
      sandbox: false,
      // Enhanced memory optimization settings
      backgroundThrottling: false,
      offscreen: false,
      // Reduce native memory footprint
      enablePreferredSizeMode: false,
      experimentalFeatures: false,
      // Optimize for memory usage
      spellcheck: false,
      plugins: false,
      // Control memory usage
      webSecurity: true,
    },
    // Fix GPU cache permission issues and memory optimization
    show: false,
    backgroundColor: '#ffffff',
  })

  // Suppress DevTools warnings
  win.webContents.on('console-message', (event, _level, message, _line, _sourceId) => {
    // Ignore autofill-related DevTools errors that are common in Electron
    if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
      event.preventDefault()
    }
  })

  // Add proper cleanup on window close
  win.on('closed', () => {
    win = null
  })

  // Enhanced native memory cleanup when window is closing
  win.webContents.on('will-navigate', () => {
    // Clear resources before navigation
    if (win && win.webContents.session?.clearCache) {
      win.webContents.session.clearCache()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Only open DevTools in development and not in production
    if (process.env.NODE_ENV !== 'production') {
      win.webContents.openDevTools()
    }
    win.show() // Show window after loading
  } else {
    win.loadFile(indexHtml)
    win.show() // Show window after loading
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Setup IPC handlers
  // Get workspace from environment variable or command line arguments or use current directory as default
  const workspaceEnv = process.env.WORKSPACE_PATH
  const workspaceArg = process.argv.find(arg => !arg.includes('electron') && !arg.includes('--'))
  const workspacePath = workspaceEnv ? path.resolve(workspaceEnv) : (workspaceArg ? path.resolve(workspaceArg) : process.cwd())
  console.log(`Using workspace: ${workspacePath}`)

  // Initialize Catalyst service before setting up IPC handlers
  try {
    await initializeCatalystService(win, workspacePath)
    console.log('✅ Catalyst service initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Catalyst service:', error)
    // Continue with IPC handler setup but log the error
  }

  setupAllIpcHandlers(win, workspacePath)

  // Setup application menu
  const menu = createAppMenu(win)
  win.setMenu(menu)
}

// Cleanup function to prevent memory leaks
async function cleanup() {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log('🧹 Cleaning up resources...')

  // Clean up memory debugging
  cleanupMemoryDebug();

  // Clean up main process service registry
  if (mainServiceRegistry.isInitialized()) {
    try {
      await mainServiceRegistry.dispose()
      console.log('✅ Main process service registry disposed successfully')
    } catch (error) {
      console.warn('Failed to dispose main process service registry:', error)
    }
  }

  // Clean up main process service container
  if (mainServiceContainerManager.isInitialized()) {
    try {
      await mainServiceContainerManager.dispose()
      console.log('✅ Main process service container disposed successfully')
    } catch (error) {
      console.warn('Failed to dispose main process service container:', error)
    }
  }

  // Clean up Catalyst service
  try {
    await disposeCatalystService()
    console.log('✅ Catalyst service disposed successfully')
  } catch (error) {
    console.warn('Failed to dispose Catalyst service:', error)
  }

  // Clean up Qdrant manager
  const qdrantManager = getQdrantManager()
  if (qdrantManager && typeof qdrantManager.shutdown === 'function') {
    qdrantManager.shutdown()
  }

  // Clean up static Qdrant resources
  try {
    if (QdrantManager && typeof QdrantManager.cleanup === 'function') {
      QdrantManager.cleanup()
    }
  } catch (error) {
    console.warn('Failed to cleanup Qdrant static resources:', error)
  }

  // Cleanup completed
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  console.log('🚀 Learning Catalyst starting...')

  // Initialize main process service registry first
  await mainServiceRegistry.initialize()
  console.log('✅ Main process service registry initialized successfully')

  // Initialize main process service container
  const logger = mainServiceRegistry.get(MAIN_SERVICE_TOKENS.LOGGER);
  await mainServiceContainerManager.initialize({
    databasePath: path.join(process.env.APP_ROOT || '', 'data', 'learning-catalyst.db'),
    logger
  })
  console.log('✅ Main process service container initialized successfully')

  // Initialize memory debugging for development
  startMemoryDebug();

  // Initialize Qdrant service
  const qdrantManager = getQdrantManager();
  qdrantManager.initialize().catch((error: any) => {
    console.error('Failed to initialize Qdrant manager:', error);
  });

  // Create the main window
  await createWindow();

  console.log('✅ Learning Catalyst ready!')
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await cleanup()
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Handle app before-quit for proper cleanup
app.on('before-quit', async () => {
  await cleanup()
})

// Handle app will-quit for final cleanup
app.on('will-quit', async () => {
  await cleanup()
})

