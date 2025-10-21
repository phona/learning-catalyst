import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'node:path'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupIpcHandlers } from './ipc-handlers'
import { createAppMenu } from './menu'
import { getQdrantManager } from './qdrant-manager'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
const preload = path.join(__dirname, '../preload/index.mjs')
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
    },
    // Fix GPU cache permission issues
    show: false,
  })

  // Suppress DevTools warnings
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Ignore autofill-related DevTools errors that are common in Electron
    if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
      event.preventDefault()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
    win.show() // Show window after loading
  } else {
    win.loadFile(indexHtml)
    win.show() // Show window after loading
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

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
  setupIpcHandlers(win, workspacePath)

  // Setup application menu
  const menu = createAppMenu(win)
  win.setMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize Qdrant manager
  const qdrantManager = getQdrantManager();

  // Create the main window
  await createWindow();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})