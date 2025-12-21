import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { IPC_EVENTS } from '@/shared/types/ipc';
import { mkdir } from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupAllIpcHandlers } from './handlers';
import {
  serializeIPCError,
  applyStructuredErrorHandling,
  getRegisteredIpcChannels,
} from './handlers/ipc-error-handler';
import { createAppMenu } from './menu';
import { MainThreadLogger } from './services/logger';
import { AsyncLocalStorage } from 'async_hooks';

// Import the new service factories
import { createConfigService } from '@/main/services/core/config/config-service';
import { createLoggerService } from '@/main/services/core/logger/logger-service';
import { createWinstonLoggerService } from './services/core/logger/winston-logger';
import { createLearningService } from '@/main/services/domain/learning/learning-service';
import { createKnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import { createConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import { createPracticeService } from '@/main/services/domain/practice/practice-service';
import { createContentService } from '@/main/services/domain/content/content-service';
import { createAnalyticsService } from '@/main/services/domain/analytics/analytics-service';
import { createAiServiceManager } from '@/main/services/core/ai/ai-service-manager';
import { createProviderFactory } from '@/main/services/agent/provider-factory';
import { IPC_ERROR_CHANNEL, IPC_ERROR_CODES, IPCErrorException, MAX_ERROR_BUFFER_SIZE } from '@/shared/types/ipc-error';
import { createVectorDatabase } from './services/domain/knowledge/vector/vector-database';
import { createQdrantProcessService } from './services/core/database/qdrant-process-service';
import { createVectorStore } from './services/core/database/vector-store';

import type { IPCErrorPayload, BufferedIPCError } from '@/shared/types/ipc-error';
import type { SystemReadyPayload } from '@/shared/types/electron-api/base';

// Import database from existing implementation
import {
  createDatabaseAtPath,
  runMigrationsAtPath,
} from './services/core/database/kysely-database';
import { createConfigStorage } from './services/core/config/storage';
import { createChatService } from './services/domain/chat';
import { SQLiteCheckpointSaver } from './services/core/checkpoints';

// Memory debugging utility for development
// import { startMemoryDebug, cleanupMemoryDebug } from '../shared/utils/memory-debug';

// Enable source map support for better error stack traces
// import './utils/source-map-support';

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

/**
 * Application initialization state machine.
 *
 * Enforces mutual exclusion between ready and error events during startup.
 * Once a terminal state is reached (ready or failed), no further state
 * transitions are allowed, ensuring deterministic renderer behavior.
 */
enum InitializationState {
  /** Initial state before any startup attempts */
  PENDING = 'pending',

  /** All services initialized successfully, app is ready */
  READY = 'ready',

  /** Startup failed with a system error, app cannot start */
  FAILED = 'failed',
}

let win: BrowserWindow | null = null;
let isShuttingDown = false;
let readySnapshotSent = false;
let lastSystemReadyPayload: SystemReadyPayload | null = null;

/**
 * Single source of truth for initialization state.
 * Guards all event emissions to prevent race conditions.
 */
let initializationState: InitializationState = InitializationState.PENDING;

/**
 * Timeout identifier for initialization timeout detection.
 * Cleared when initialization completes successfully.
 */
let initializationTimeoutId: NodeJS.Timeout | null = null;

/**
 * Maximum time allowed for initialization before treating as failure.
 * Prevents renderer from hanging indefinitely on main process issues.
 */
const INITIALIZATION_TIMEOUT_MS = 30000;

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

/**
 * Initializes the startup timeout mechanism.
 *
 * Sets a timer that will trigger a failure if initialization takes too long.
 * The timeout is cleared when initialization completes successfully.
 */
function initializeTimeout(): void {
  initializationTimeoutId = setTimeout(() => {
    // Timeout reached - treat as initialization failure
    if (initializationState === InitializationState.PENDING) {
      console.error(
        `[Main] Initialization timeout after ${INITIALIZATION_TIMEOUT_MS}ms`,
      );

      const timeoutError = new Error(
        `Initialization timed out after ${INITIALIZATION_TIMEOUT_MS}ms`,
      );

      // sendInitializationError handles state transition internally
      sendInitializationError(new IPCErrorException({
        type: 'SYSTEM_ERROR',
        code: IPC_ERROR_CODES.system.unknown,
        message: timeoutError.message,
      }));
    }
  }, INITIALIZATION_TIMEOUT_MS);
}

/**
 * Clears the initialization timeout timer.
 *
 * Called when initialization completes successfully to prevent
 * timeout from triggering after successful startup.
 */
function clearInitializationTimeout(): void {
  if (initializationTimeoutId !== null) {
    clearTimeout(initializationTimeoutId);
    initializationTimeoutId = null;
  }
}

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

/**
 * Sends initialization success event to renderer with state guards.
 *
 * Only sends if:
 * - Current state is PENDING (not already terminal)
 * - Window is available and not destroyed
 *
 * @param payload - System ready payload with service status
 * @returns True if event was sent, false if blocked by guards
 */
function sendInitializationSuccess(payload: SystemReadyPayload): boolean {
  // Guard: Only transition from PENDING state
  if (initializationState !== InitializationState.PENDING) {
    console.warn(
      `[Main] Blocked ready event - state is already ${initializationState}`,
    );
    return false;
  }

  // Guard: Window must be available
  if (!win?.webContents || win.webContents.isDestroyed()) {
    console.warn('[Main] Blocked ready event - window not available');
    return false;
  }

  // Transition to READY state (terminal state)
  initializationState = InitializationState.READY;

  // Clear timeout to prevent race condition
  clearInitializationTimeout();

  // Cache and send the payload
  lastSystemReadyPayload = payload;
  readySnapshotSent = true;

  const elapsed = payload.ready.startMs ? Date.now() - payload.ready.startMs : undefined;
  console.log('[Main] SYSTEM_READY sent', {
    elapsedMs: elapsed,
    state: initializationState,
  });

  win.webContents.send(IPC_EVENTS.SYSTEM_READY, payload);
  return true;
}

/**
 * Sends initialization error event to renderer with state guards.
 *
 * Only sends if:
 * - Current state is PENDING (not already terminal)
 * - Window is available and not destroyed
 *
 * @param error - Error that caused initialization failure
 * @param errorCode - Specific error code for categorization
 * @returns True if event was sent, false if blocked by guards
 */
function sendInitializationError(error: IPCErrorException): boolean {
  // Guard: Only transition from PENDING state
  if (initializationState !== InitializationState.PENDING) {
    console.warn(
      `[Main] Blocked error event - state is already ${initializationState}`,
    );
    return false;
  }

  // Transition to FAILED state (terminal state)
  initializationState = InitializationState.FAILED;

  // Clear timeout to prevent race condition
  clearInitializationTimeout();

  // Serialize error using IPC error handler - let it handle the conversion
  // Pass errorCode as channel for better error categorization
  const errorPayload = serializeIPCError(error);

  console.error('[Main] SYSTEM_ERROR sent', {
    state: initializationState,
    message: errorPayload.message,
  });

  // Always enqueue - this adds to buffer even if window isn't ready yet
  enqueueIpcError(errorPayload);
  return true;
}

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
      const loadingPayload: SystemReadyPayload = {
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

  // Load the renderer
  if (VITE_DEV_SERVER_URL) {
    console.log('[Main] Loading renderer URL', VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
    if (process.env.NODE_ENV !== 'production') {
      win.webContents.openDevTools();
    }
  } else {
    console.log('[Main] Loading renderer file', indexHtml);
    win.loadFile(indexHtml);
  }

  // Initialize the startup timeout mechanism
  // This prevents the renderer from hanging if main process fails
  initializeTimeout();

  const readyStart = Date.now();
  console.log('[Main] Starting service initialization', { timestamp: readyStart });

  // Setup Winston file logger
  const logDirectory = path.join(learningCatalystPath, 'logs');
  const als = new AsyncLocalStorage<Record<string, unknown>>();
  const winstonLogger = createWinstonLoggerService({
    logDirectory,
    als,
  });
  const loggerService = createLoggerService({ logger: winstonLogger });

  // Log startup information
  loggerService.info('Learning Catalyst starting', {
    environment: winstonLogger.getEnvironment(),
    workspacePath: learningCatalystPath,
    logDirectory,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
  });

  // Persist the database inside the selected workspace (dev:workspace or production)
  const dbPath = path.join(learningCatalystPath, 'learning_catalyst.db');
  const database = await createDatabaseAtPath(dbPath);

  await runMigrationsAtPath(dbPath);

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

  const aiServiceManager = createAiServiceManager({
    loggerService,
    configService,
  });

  await aiServiceManager.waitForReady().catch((error) => {
    // Log but don't fail - AI service errors are runtime, not initialization
    loggerService.warn('AI service not ready', { error: error.message });
  });

  const aiService = aiServiceManager;

  // Create and initialize Qdrant process service (infrastructure layer)
  const qdrantDataPath = path.join(learningCatalystPath, 'qdrant');
  await mkdir(qdrantDataPath, { recursive: true });
  const qdrantProcessService = createQdrantProcessService(
    workspacePath,
    loggerService,
    {
      host: '127.0.0.1',
      port: 6333,
      dataPath: qdrantDataPath,
    },
  );

  // Create vector store (core database layer)
  const vectorStore = createVectorStore(qdrantProcessService, {
    host: '127.0.0.1',
    port: 6333,
  });

  // Create provider factory (needs to be before vectorDatabase)
  const providerFactory = createProviderFactory(configService);

  // Create vector database adapter (domain layer)
  const vectorDatabase = createVectorDatabase(vectorStore, providerFactory);

  // Start vector database services
  await qdrantProcessService.start();
  await vectorDatabase.start();

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

  // Create checkpoint saver for chat service
  const checkpointSaver = new SQLiteCheckpointSaver(database);

  const learningService = createLearningService({
    db: database,
    loggerService,
    checkpointSaver,
  });

  const practiceService = createPracticeService({
    loggerService,
    knowledgeService,
    db: database,
  });

  const chatService = createChatService({
    loggerService,
    providerFactory,
    checkpointSaver,
  });

  console.log('[Main] setupAllIpcHandlers begin', { workspacePath });
  await setupAllIpcHandlers(win, workspacePath, {
    db: database,
    knowledgeService,
    conceptParsingService,
    practiceService,
    analyticsService,
    contentService,
    aiService,
    loggerService,
    configService,
    providerFactory,
    chatService,
    checkpointSaver,
    learningService,
  });
  console.log('[Main] setupAllIpcHandlers complete');

  const menu = createAppMenu(win);
  win.setMenu(menu);

  const channels = getRegisteredIpcChannels();
  console.log('IPC channels registered', { count: channels.length, channels });

  aiServiceManager.onConfigReloaded(async () => {
    await conceptParsingService.rebuild();
    await practiceService.rebuild();
  });

  // Send success event with timing information
  const readyPayload: SystemReadyPayload = {
    status: 'ready',
    ready: {
      ipcHandlersRegistered: true,
      startMs: readyStart,
    },
  };

  sendInitializationSuccess(readyPayload);
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
  console.log('✅ Cleanup completed');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize memory debugging for development
  // startMemoryDebug();

  // Create the main window with error handling
  try {
    await createWindow();
  } catch (error) {
    if (error instanceof IPCErrorException) {
      sendInitializationError(error);
    } else {
      throw error;
    }
  }
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
