import { app, BrowserWindow } from 'electron';
import { mkdir } from 'fs/promises';
import { createAppMenu } from '../menu';
import { getRegisteredIpcChannels, applyStructuredErrorHandling } from '../handlers/ipc-error-handler';
import { setupAllIpcHandlers } from '../handlers';
import type { SystemReadyPayload } from '@/shared/types/electron-api/base';
import { IPCErrorException } from '@/shared/types/ipc-error';
import { createMainWindow } from './window';
import { resolveWorkspacePath } from './workspace';
import { initializeAppServices } from './services';
import { initializeTimeout, sendInitializationError, sendInitializationSuccess } from './readiness';

export const registerAppLifecycle = (params: {
  preloadPath: string;
  indexHtmlPath: string;
  viteDevServerUrl?: string;
}) => {
  let isShuttingDown = false;

  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('?? Cleaning up resources...');
    console.log('? Cleanup completed');
  };

  const createWindow = async () => {
    const { workspacePath, learningCatalystPath } = resolveWorkspacePath({
      argv: process.argv,
      envWorkspacePath: process.env.WORKSPACE_PATH,
      cwd: process.cwd(),
    });

    await mkdir(learningCatalystPath, { recursive: true });
    console.log(`Using workspace: ${workspacePath}`);

    const win = createMainWindow({
      preloadPath: params.preloadPath,
      indexHtmlPath: params.indexHtmlPath,
      viteDevServerUrl: params.viteDevServerUrl,
    });

    initializeTimeout();
    applyStructuredErrorHandling();

    const services = await initializeAppServices({ workspacePath, learningCatalystPath });

    services.configService.onConfigChanged((config) => {
      console.log('[Main] Config changed, broadcasting settings:config:changed');
      if (win?.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('settings:config:changed', {
          changedKeys: undefined,
          config,
          timestamp: Date.now(),
        });
      }
    });

    console.log('[Main] setupAllIpcHandlers begin', { workspacePath });
    await setupAllIpcHandlers(win, workspacePath, {
      db: services.db,
      knowledgeService: services.knowledgeService,
      conceptParsingService: services.conceptParsingService,
      practiceService: services.practiceService,
      analyticsService: services.analyticsService,
      loggerService: services.loggerService,
      configService: services.configService,
      providerFactory: services.providerFactory,
      chatService: services.chatService,
      checkpointSaver: services.checkpointSaver,
      learningService: services.learningService,
    });
    console.log('[Main] setupAllIpcHandlers complete');

    const menu = createAppMenu(win);
    win.setMenu(menu);

    const channels = getRegisteredIpcChannels();
    console.log('IPC channels registered', { count: channels.length, channels });

    const readyPayload: SystemReadyPayload = {
      status: 'ready',
      ready: {
        ipcHandlersRegistered: true,
        startMs: services.readyStart,
      },
    };

    sendInitializationSuccess(readyPayload);
  };

  app.whenReady().then(async () => {
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

  app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
      await cleanup();
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });

  app.on('before-quit', async () => {
    await cleanup();
  });
};
