import { app, type BrowserWindow, ipcMain } from 'electron';
import { IPC_EVENTS } from '@/shared/types/ipc';
import type { IPCErrorPayload, BufferedIPCError } from '@/shared/types/ipc-error';
import {
  IPC_ERROR_CHANNEL,
  IPC_ERROR_CODES,
  IPCErrorException,
  MAX_ERROR_BUFFER_SIZE,
} from '@/shared/types/ipc-error';
import { serializeIPCError } from '../handlers/ipc-error-handler';
import type { SystemReadyPayload } from '@/shared/types/electron-api/base';

enum InitializationState {
  PENDING = 'pending',
  READY = 'ready',
  FAILED = 'failed',
}

let mainWindow: BrowserWindow | null = null;
let readySnapshotSent = false;
let lastSystemReadyPayload: SystemReadyPayload | null = null;

let initializationState: InitializationState = InitializationState.PENDING;
let initializationTimeoutId: NodeJS.Timeout | null = null;

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

const enqueueIpcError = (payload: IPCErrorPayload) => {
  addToErrorBuffer(payload);

  if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send(IPC_ERROR_CHANNEL, payload);
    return;
  }

  pendingIpcErrors.push(payload);
};

export const setMainWindow = (window: BrowserWindow | null) => {
  mainWindow = window;
};

export const flushPendingIpcErrors = () => {
  if (!mainWindow?.webContents || mainWindow.webContents.isDestroyed()) {
    return;
  }

  while (pendingIpcErrors.length > 0) {
    const payload = pendingIpcErrors.shift();
    if (!payload) continue;
    mainWindow.webContents.send(IPC_ERROR_CHANNEL, payload);
  }
};

export const reportMainError = (error: unknown, channel = 'main') => {
  console.error(error);
  const payload = serializeIPCError(error, channel);
  enqueueIpcError(payload);
  return payload;
};

export const initializeTimeout = () => {
  initializationTimeoutId = setTimeout(() => {
    if (initializationState !== InitializationState.PENDING) return;

    console.error(`[Main] Initialization timeout after ${INITIALIZATION_TIMEOUT_MS}ms`);
    const timeoutError = new Error(`Initialization timed out after ${INITIALIZATION_TIMEOUT_MS}ms`);

    sendInitializationError(
      new IPCErrorException({
        type: 'SYSTEM_ERROR',
        code: IPC_ERROR_CODES.system.unknown,
        message: timeoutError.message,
      }),
    );
  }, INITIALIZATION_TIMEOUT_MS);
};

const clearInitializationTimeout = () => {
  if (initializationTimeoutId !== null) {
    clearTimeout(initializationTimeoutId);
    initializationTimeoutId = null;
  }
};

export const sendInitializationSuccess = (payload: SystemReadyPayload): boolean => {
  if (initializationState !== InitializationState.PENDING) {
    console.warn(`[Main] Blocked ready event - state is already ${initializationState}`);
    return false;
  }

  if (!mainWindow?.webContents || mainWindow.webContents.isDestroyed()) {
    console.warn('[Main] Blocked ready event - window not available');
    return false;
  }

  initializationState = InitializationState.READY;
  clearInitializationTimeout();

  lastSystemReadyPayload = payload;
  readySnapshotSent = true;

  const elapsed = payload.ready.startMs ? Date.now() - payload.ready.startMs : undefined;
  console.log('[Main] SYSTEM_READY sent', { elapsedMs: elapsed, state: initializationState });

  mainWindow.webContents.send(IPC_EVENTS.SYSTEM_READY, payload);
  return true;
};

export const sendInitializationError = (error: IPCErrorException): boolean => {
  if (initializationState !== InitializationState.PENDING) {
    console.warn(`[Main] Blocked error event - state is already ${initializationState}`);
    return false;
  }

  initializationState = InitializationState.FAILED;
  clearInitializationTimeout();

  const errorPayload = serializeIPCError(error);
  console.error('[Main] SYSTEM_ERROR sent', { state: initializationState, message: errorPayload.message });

  enqueueIpcError(errorPayload);
  return true;
};

export const handleMainWindowDidFinishLoad = () => {
  if (!mainWindow?.webContents || mainWindow.webContents.isDestroyed()) return;

  if (lastSystemReadyPayload) {
    console.log('[Main] Replaying last SYSTEM_READY snapshot after reload', lastSystemReadyPayload);
    mainWindow.webContents.send(IPC_EVENTS.SYSTEM_READY, lastSystemReadyPayload);
    return;
  }

  if (!readySnapshotSent) {
    const loadingPayload: SystemReadyPayload = {
      status: 'loading',
      ready: { ipcHandlersRegistered: false },
    };
    lastSystemReadyPayload = loadingPayload;
    console.log('[Main] SYSTEM_READY loading (no snapshot yet)');
    mainWindow.webContents.send(IPC_EVENTS.SYSTEM_READY, loadingPayload);
  }
};

export const registerReadinessIpcHandlers = () => {
  ipcMain.handle('system:get-error-buffer', async () => {
    return [...globalErrorBuffer];
  });

  ipcMain.handle('system:clear-error-buffer', async () => {
    globalErrorBuffer.length = 0;
    return { cleared: true };
  });

  ipcMain.handle('system:relaunch-app', async () => {
    try {
      globalErrorBuffer.length = 0;
      app.relaunch();
      app.exit(0);
      return { relaunching: true };
    } catch (error) {
      reportMainError(error, 'relaunch');
      return { relaunching: false };
    }
  });

  ipcMain.handle('system:get-latest-ready', async () => {
    return lastSystemReadyPayload;
  });
};

export const registerProcessErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception', error);
    reportMainError(error, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Main] Unhandled rejection', reason);
    reportMainError(reason, 'unhandledRejection');
  });
};

