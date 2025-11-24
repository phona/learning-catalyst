import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { mkdir } from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupAllIpcHandlers } from './handlers';
import { setupChatHandlers } from './handlers/chat-handlers';
import { setupSessionsHandlers } from './handlers/sessions-handlers';
import { setupEnhancedAgentHandlers } from './handlers/agent-enhanced-handlers';
import { setupSettingsHandlers } from './handlers/settings-handlers';
import { serializeIPCError, applyStructuredErrorHandling, getRegisteredIpcChannels } from './handlers/ipc-error-handler';
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
import { createDomainAgent } from '@/main/services/agent/domain-agent';
import { IPC_ERROR_CHANNEL } from '@/shared/types/ipc-error';
import { createVectorDatabase } from './services/domain/knowledge/vector/vector-database';
import { createQdrantManager } from '@/main/qdrant-manager';

import type { IPCErrorPayload } from '@/shared/types/ipc-error';

// Import database from existing implementation
import {
  createDatabase,
  createSqliteDriverFactory,
  getDefaultDatabasePath,
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
const pendingIpcErrors: IPCErrorPayload[] = [];

const enqueueIpcError = (payload: IPCErrorPayload) => {
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
  const payload = serializeIPCError(error, channel);
  enqueueIpcError(payload);
  return payload;
};

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
    flushPendingIpcErrors();
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

  // Initialize all services using the new functional architecture
  const baseLogger = new MainThreadLogger('info', true, 1000);
  const loggerService = createLoggerService({ logger: baseLogger });

  // Create the actual database instance using the new driver factory pattern
  const dbPath = getDefaultDatabasePath();
  const driverFactory = await createSqliteDriverFactory(dbPath);
  const database = createDatabase(driverFactory);

  // Run database migrations before wiring domain services
  await runMigrations(driverFactory);

  // Create real config storage
  const configStorage = createConfigStorage(learningCatalystPath);

  const configService = createConfigService({
    storage: configStorage,
    logger: loggerService,
  });

  applyStructuredErrorHandling();
  setupSettingsHandlers({ configService });

  try {
    const domainAgent = await createDomainAgent({
      configService,
    });

    console.log('[Main] Creating AI service manager...');
    const aiServiceManager = createAiServiceManager({
      loggerService,
      configService,
    });
    console.log('[Main] AI service manager created. Waiting for ready...');
    await aiServiceManager.waitForReady();
    console.log('[Main] AI service manager is ready');
    const aiService = aiServiceManager;

    const learningService = createLearningService({
      db: database,
      loggerService,
      aiService,
      domainAgent,
    });
    qdrantManagerInstance = createQdrantManager();
    const vectorDatabase = createVectorDatabase(qdrantManagerInstance);
    await vectorDatabase.start();
    const knowledgeService = createKnowledgeService({
      db: database,
      loggerService,
    });
    const conceptParsingService = createConceptParsingService({
      aiService,
      domainAgent,
      vectorDatabase,
      loggerService,
    });
    const practiceService = createPracticeService({
      aiService,
      domainAgent,
      loggerService,
      knowledgeService,
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

    const chatService = createChatService({
      db: database,
      loggerService,
      aiService,
      domainAgent,
      agentManager,
    });

    // Setup IPC handlers with all services
    await setupAllIpcHandlers(win, workspacePath, {
      chatService,
      learningService,
      knowledgeService,
      conceptParsingService,
      practiceService,
      analyticsService,
      contentService,
      aiService,
      loggerService,
      configService,
    });

    // Setup application menu
    const menu = createAppMenu(win);
    win.setMenu(menu);

    const channels = getRegisteredIpcChannels();
    console.log('IPC channels registered', { count: channels.length, channels });

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
  } catch (error) {
    console.error('? Error initializing services:', error);
    reportMainError(error, 'services:init');
    // Fallback: still load and show window even if services initialization fails
    try {
      if (VITE_DEV_SERVER_URL) {
        console.log('[Main] Fallback load URL', VITE_DEV_SERVER_URL);
        win?.loadURL(VITE_DEV_SERVER_URL);
      } else {
        console.log('[Main] Fallback load file', indexHtml);
        win?.loadFile(indexHtml);
      }
      if (process.env.NODE_ENV !== 'production') {
        try {
          win?.webContents.openDevTools({ mode: 'detach' });
        } catch {}
      }
      console.log('[Main] Fallback show window');
      win?.show();
    } catch (e) {
      void e;
    }

    try {
      const baseLogger = new MainThreadLogger('info', true, 1000);
      const loggerService = createLoggerService({ logger: baseLogger });
      const fallbackLearningService: any = {
        getRecentSessions: async () => [],
        searchSessions: async () => ({ sessions: [], totalResults: 0, query: '' }),
        startLearningSession: async () => ({ id: `session_${Date.now()}` }),
      };
      setupSessionsHandlers(ipcMain, { learningService: fallbackLearningService, loggerService });
      setupEnhancedAgentHandlers(ipcMain, {
        aiService: {} as any,
        learningService: fallbackLearningService,
        knowledgeService: {} as any,
        loggerService,
      });

      const canceledFallbackStreams = new Set<string>();
      const fallbackChatService: any = {
        streamAssistantResponse: async (params: { conversationId: string; content: string }) => {
          const userMessage = {
            id: `user_${Date.now()}`,
            conversationId: params.conversationId,
            role: 'user',
            content: params.content,
            timestamp: new Date().toISOString(),
          };
          const stream = async function* () {
            const text = params.content || 'Hello! (fallback stream)';
            const chunks = text.match(/.{1,50}/g) ?? [text];
            for (const chunk of chunks) {
              if (canceledFallbackStreams.has(params.conversationId)) break;
              yield chunk;
            }
          };
          return { userMessage, stream: stream() };
        },
        cancelStream: (conversationId: string) => {
          canceledFallbackStreams.add(conversationId);
        },
      };
      setupChatHandlers(ipcMain, {
        chatService: fallbackChatService,
        practiceService: {
          generatePracticePlan: async () => ({ id: `suggestion_${Date.now()}`, options: { accept: {}, decline: {} } }),
        } as any,
        loggerService,
      });
      console.log('Fallback IPC handlers registered');
    } catch {}
  }
}

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
