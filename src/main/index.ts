import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_EVENTS } from '@/shared/types/ipc';
import { mkdir } from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupAllIpcHandlers } from './handlers';
import { setupSessionsHandlers } from './handlers/sessions-handlers';
import { setupEnhancedAgentHandlers } from './handlers/agent-enhanced-handlers';
import { setupSettingsHandlers } from './handlers/settings-handlers';
import {
  serializeIPCError,
  applyStructuredErrorHandling,
  getRegisteredIpcChannels,
} from './handlers/ipc-error-handler';
import { createAppMenu } from './menu';
import { MainThreadLogger } from './services/logger';

// Import the new service factories
import { createConfigService } from '@/main/services/core/config/config-service';
import { createLoggerService } from '@/main/services/core/logger/logger-service';
import { createChatService } from '@/main/services/domain/chat/chat-service';
import { createLearningService } from '@/main/services/domain/learning/learning-service';
import { createKnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import { createConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import { createPracticeService } from '@/main/services/domain/practice/practice-service';
import { createContentService } from '@/main/services/domain/content/content-service';
import { createAnalyticsService } from '@/main/services/domain/analytics/analytics-service';
import { createAiServiceManager } from '@/main/services/core/ai/ai-service-manager';
import { createAgentManager, type AgentManager } from '@/main/services/agent/agent-manager';
import { createProviderFactory } from '@/main/services/agent/provider-factory';
import { IPC_ERROR_CHANNEL, MAX_ERROR_BUFFER_SIZE } from '@/shared/types/ipc-error';
import { createVectorDatabase } from './services/domain/knowledge/vector/vector-database';
import { createQdrantManager } from '@/main/qdrant-manager';

import type { IPCErrorPayload, BufferedIPCError } from '@/shared/types/ipc-error';

// Import database from existing implementation
import {
  createDatabase,
  createSqliteDriverFactory,
  runMigrations,
} from './services/core/database/kysely-database';
import { createConfigStorage } from './services/core/config/storage';

// Memory debugging utility for development
// import { startMemoryDebug, cleanupMemoryDebug } from '../shared/utils/memory-debug';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

const remoteDebugPort = +(process.env.REMOTE_DEBUGGING_PORT || '9222');
try {
  app.commandLine.appendSwitch('remote-debugging-port', String(remoteDebugPort));
} catch (e) {
  void e;
}

let win: BrowserWindow | null = null;
let isShuttingDown = false;
let readySnapshotSent = false;
let lastSystemReadyPayload: any | null = null;
const pendingIpcErrors: IPCErrorPayload[] = [];
const globalErrorBuffer: BufferedIPCError[] = [];

const addToErrorBuffer = (payload: IPCErrorPayload) => {
  const buffered: BufferedIPCError = { ...payload, timestamp: Date.now() };
  if (globalErrorBuffer.length >= MAX_ERROR_BUFFER_SIZE) {
    globalErrorBuffer.shift();
  }
  globalErrorBuffer.push(buffered);
};

const getErrorBuffer = (): BufferedIPCError[] => {
  return [...globalErrorBuffer];
};

const clearErrorBuffer = (): void => {
  globalErrorBuffer.length = 0;
};

const enqueueIpcError = (payload: IPCErrorPayload) => {
  // Always add to the global buffer for renderer to drain on init
  addToErrorBuffer(payload);
  if (win?.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(IPC_ERROR_CHANNEL, payload);
    return;
  }

  pendingIpcErrors.push(payload);
};

const flushPendingIpcErrors = () => {
  if (!win?.webContents || win.webContents.isDestroyed()) {
    return;
  }

  while (pendingIpcErrors.length > 0) {
    const payload = pendingIpcErrors.shift();
    if (!payload) {
      continue;
    }
    win.webContents.send(IPC_ERROR_CHANNEL, payload);
  }
};

const reportMainError = (error: unknown, channel = 'main') => {
  console.error(error);
  const payload = serializeIPCError(error, channel);
  enqueueIpcError(payload);
  return payload;
};

// IPC handlers to expose the global error buffer to the renderer via preload
ipcMain.handle('system:get-error-buffer', async () => {
  return getErrorBuffer();
});

ipcMain.handle('system:clear-error-buffer', async () => {
  clearErrorBuffer();
  return { cleared: true };
});

ipcMain.handle('system:relaunch-app', async () => {
  try {
    clearErrorBuffer();
    app.relaunch();
    app.exit(0);
    return { relaunching: true };
  } catch (error) {
    reportMainError(error, 'relaunch');
    return { relaunching: false };
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception', error);
  reportMainError(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection', reason);
  reportMainError(reason, 'unhandledRejection');
});

const preload = path.join(__dirname, '../preload/index.cjs');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

// Disable GPU acceleration to avoid possible blank window issues on some drivers

async function createWindow(): Promise<void> {
  win = new BrowserWindow({
    title: 'Learning Catalyst',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC ?? '', 'favicon.ico'),
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
    // Show window immediately to avoid missing show on init errors
    show: true,
    backgroundColor: '#ffffff',
  });

  // Add proper cleanup on window close
  win.on('closed', () => {
    win = null;
  });

  // Enhanced native memory cleanup when window is closing
  win.webContents.on('will-navigate', () => {
    // Clear resources before navigation
    win?.webContents.session?.clearCache?.();
  });

  win.webContents.once('did-finish-load', () => {
    console.log('[Main] webContents did-finish-load');
    flushPendingIpcErrors();
    if (!win || !win.webContents) return;

    // Always replay the latest known snapshot so renderer reloads don't miss ready.
    if (lastSystemReadyPayload) {
      console.log(
        '[Main] Replaying last SYSTEM_READY snapshot after reload',
        lastSystemReadyPayload,
      );
      win.webContents.send(IPC_EVENTS.SYSTEM_READY, lastSystemReadyPayload);
      return;
    }

    // Fallback: emit loading if no snapshot recorded yet.
    if (!readySnapshotSent) {
      const loadingPayload = {
        status: 'loading',
        ready: { ipcHandlersRegistered: false },
      };
      lastSystemReadyPayload = loadingPayload;
      console.log('[Main] SYSTEM_READY loading (no snapshot yet)');
      win.webContents.send(IPC_EVENTS.SYSTEM_READY, loadingPayload);
    }
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Get workspace from environment variable or command line arguments or use current directory as default
  const workspaceEnv = process.env.WORKSPACE_PATH;
  const workspaceArg = process.argv.find((arg) => !arg.includes('electron') && !arg.includes('--'));
  const workspacePath = workspaceEnv
    ? path.resolve(workspaceEnv)
    : workspaceArg
      ? path.resolve(workspaceArg)
      : process.cwd();
  const learningCatalystPath = path.join(workspacePath, '.catalyst');
  await mkdir(learningCatalystPath, { recursive: true });

  console.log(`Using workspace: ${workspacePath}`);

  // Defer service initialization until after window is shown

  if (VITE_DEV_SERVER_URL) {
    console.log('[Main] Loading renderer URL', VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
    if (process.env.NODE_ENV !== 'production') {
      win.webContents.openDevTools();
    }
    console.log('[Main] Showing window');
    win.show();
  } else {
    console.log('[Main] Loading renderer file', indexHtml);
    win.loadFile(indexHtml);
    console.log('[Main] Showing window');
    win.show();
  }

  let readyStart = 0;
  try {
    readyStart = Date.now();
    console.log('[Main] createWindow start service initialization');
    const baseLogger = new MainThreadLogger('info', true, 1000);
    const loggerService = createLoggerService({ logger: baseLogger });

    // Persist the database inside the selected workspace (dev:workspace or production)
    const dbPath = path.join(learningCatalystPath, 'learning_catalyst.db');
    const driverFactory = await createSqliteDriverFactory(dbPath);
    const database = createDatabase(driverFactory);

    await runMigrations(driverFactory);

    const configStorage = createConfigStorage(learningCatalystPath);

    const configService = createConfigService({
      storage: configStorage,
      logger: loggerService,
    });
    configService.onConfigChanged((config) => {
      console.log('[Main] Config changed, broadcasting settings:config:changed');
      if (win?.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('settings:config:changed', {
          changedKeys: undefined,
          config,
          timestamp: Date.now(),
        });
      }
    });

    applyStructuredErrorHandling();
    setupSettingsHandlers({ configService });

    const aiServiceManager = createAiServiceManager({
      loggerService,
      configService,
    });
    try {
      await aiServiceManager.waitForReady();
    } catch (error) {
      reportMainError(error, 'ai.ready');
    }
    const aiService = aiServiceManager;

    const learningService = createLearningService({
      db: database,
      loggerService,
    });

    qdrantManagerInstance = createQdrantManager();
    const vectorDatabase = createVectorDatabase(qdrantManagerInstance);
    try {
      await vectorDatabase.start();
    } catch (error) {
      reportMainError(error, 'qdrant.start');
    }
    const providerFactory = createProviderFactory(configService);
    const knowledgeService = createKnowledgeService({
      db: database,
      vectorDatabase,
      providerFactory,
      loggerService,
    });

    const conceptParsingService = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const analyticsService = createAnalyticsService({ db: database, loggerService });

    const contentService = createContentService({ loggerService, aiService });

    const agentManager = await createAgentManager({
      aiService,
      analyticsService,
      conceptParsingService,
      learningService,
      loggerService,
      configService,
    });

    const learningAgent = agentManager.getAgent('learning');
    await learningService.rebuild(learningAgent);
    // const practiceAgent - REMOVED (practice agent deleted, migrated to workflow node)
    const practiceService = createPracticeService({
      loggerService,
      knowledgeService,
      db: database,
    });

    const chatService = createChatService({
      db: database,
      loggerService,
      aiService,
      agentManager,
    });

    console.log('[Main] setupAllIpcHandlers begin', { workspacePath });
    await setupAllIpcHandlers(win, workspacePath, {
      agentManager,
      db: database,
      learningService,
      knowledgeService,
      conceptParsingService,
      practiceService,
      analyticsService,
      contentService,
      aiService,
      loggerService,
      configService,
      providerFactory,
    });
    console.log('[Main] setupAllIpcHandlers complete');

    const menu = createAppMenu(win);
    win.setMenu(menu);

    const channels = getRegisteredIpcChannels();
    console.log('IPC channels registered', { count: channels.length, channels });
    aiServiceManager.onConfigReloaded(async () => {
      try {
        await conceptParsingService.rebuild();
        await practiceService.rebuild();
        await learningService.rebuild(agentManager.getAgent('learning'));
      } catch (error) {
        reportMainError(error, 'configReload');
      }
    });
  } catch (error) {
    console.error('[Main] startup fatal error before ready emit', error);
    reportMainError(error, 'startup');
    return sendReadySnapshot({ error, startMs: readyStart });
  }
  return sendReadySnapshot({ startMs: readyStart });
}

function sendReadySnapshot({ error, startMs }: { error?: unknown; startMs?: number }) {
  if (!win || !win.webContents || win.webContents.isDestroyed()) return;
  const payload: any = {
    status: 'ready',
    ready: { ipcHandlersRegistered: true },
  };
  if (startMs && typeof startMs === 'number') {
    payload.ready.startMs = startMs;
  }
  if (error) {
    payload.error = {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      type: (error as any)?.type,
    };
  }
  const elapsed = startMs ? Date.now() - startMs : undefined;
  console.log('[Main] SYSTEM_READY ready send (final)', { elapsedMs: elapsed, payload });
  lastSystemReadyPayload = payload;
  readySnapshotSent = true;
  win.webContents.send(IPC_EVENTS.SYSTEM_READY, payload);
}

// Allow preload to fetch the latest readiness snapshot (useful on renderer reloads)
ipcMain.handle('system:get-latest-ready', async () => {
  return lastSystemReadyPayload;
});

// Cleanup function to prevent memory leaks
async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🧹 Cleaning up resources...');

  // Clean up memory debugging
  // cleanupMemoryDebug();

  // Clean up any additional resources as needed
  if (qdrantManagerInstance) {
    try {
      await qdrantManagerInstance.shutdown();
    } finally {
      qdrantManagerInstance.cleanup();
    }
  }
  console.log('✅ Cleanup completed');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  console.log('🚀 Learning Catalyst starting with new architecture...');

  // Initialize memory debugging for development
  // startMemoryDebug();

  // Create the main window
  await createWindow();

  console.log('✅ Learning Catalyst ready with new service architecture!');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await cleanup();
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle app before-quit for proper cleanup
app.on('before-quit', async () => {
  await cleanup();
});

// Handle app will-quit for final cleanup
app.on('will-quit', async () => {
  await cleanup();
});
let qdrantManagerInstance: ReturnType<typeof createQdrantManager> | null = null;
