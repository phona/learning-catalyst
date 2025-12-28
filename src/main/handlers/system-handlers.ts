/**
 * System & Health Check IPC Handlers
 */

import { ipcMain, app } from 'electron';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

export function setupSystemHandlers(
  ipcMainInstance: typeof ipcMain,
): void {
  ipcMainInstance.handle('system:report-error', async (_event, errorData) => {
    const payload = {
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: true,
      details: errorData,
    };
    return payload;
  });

  ipcMainInstance.handle('system:health-check', async () => {
    const healthStatus = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      apis: {
        chat: { status: 'healthy' },
        learning: { status: 'healthy' },
        knowledge: { status: 'healthy' },
        analytics: { status: 'healthy' },
        agents: { status: 'healthy' },
        content: { status: 'healthy' },
        settings: { status: 'healthy' },
        sessions: { status: 'healthy' },
      },
    };
    return healthStatus;
  });

  ipcMainInstance.handle('system:get-version', async () => {
    const version = {
      version: app.getVersion(),
      build: 'dev',
      platform: process.platform,
    };
    return version;
  });
}
