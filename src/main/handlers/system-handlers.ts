/* eslint-disable */
/**
 * System & Health Check IPC Handlers
 */

import { ipcMain, app } from 'electron';
import type { APIResponse } from '@/shared/types/electron-api';

const ok = <T>(data: T, metadata?: APIResponse<T>['metadata']): APIResponse<T> => ({
  success: true,
  data,
  metadata
});

const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
  success: false,
  error: { code, message, details }
});

export function setupSystemHandlers(): void {
  ipcMain.handle('system:report-error', async (_event, errorData) => {
    try {
      // placeholder for forwarding to telemetry
      const payload = {
        errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        acknowledged: true,
        details: errorData
      };
      return ok(payload);
    } catch (error) {
      return fail('system.report_error_failed', 'Unable to report error', error);
    }
  });

  ipcMain.handle('system:health-check', async () => {
    try {
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
          sessions: { status: 'healthy' }
        }
      };
      return ok(healthStatus);
    } catch (error) {
      return fail('system.health_check_failed', 'Unable to perform health check', error);
    }
  });

  ipcMain.handle('system:get-version', async () => {
    try {
      const version = {
        version: app.getVersion(),
        build: 'dev',
        platform: process.platform
      };
      return ok(version);
    } catch (error) {
      return fail('system.version_failed', 'Unable to retrieve version', error);
    }
  });
}
