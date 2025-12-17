/**
 * Type-Safe IPC Main Proxy with Interface Abstraction
 * Clean, testable, and type-safe IPC handler registration
 * Compatible with both old and new handler patterns
 */

import { ipcMain, IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { LoggerService } from '../services/core/logger/logger-service';
import type { ApiResponse } from '../../shared/types/api';

/**
 * Handler options - passed to ipc.handle() as 3rd parameter
 */
export interface HandlerOptions {
  name?: string;
  timeout?: number;
}

/**
 * IPC Proxy interface - describes what the proxy can do
 */
export interface IIpcProxy {
  handle<TParams, TReturn>(
    channel: string,
    handler: (event: IpcMainInvokeEvent, params: TParams) => Promise<TReturn>,
    options?: HandlerOptions
  ): void;
}

/**
 * Create a type-safe IPC proxy
 *
 * @param globalLogger - REQUIRED logger for all error messages
 * @param logSuccess - Whether to log successful requests (default: false)
 * @param mapError - Custom error mapper (optional)
 *
 * @example
 * ```typescript
 * const ipc = createIpcProxy(loggerService);
 *
 * // Handler receives services via closure
 * ipc.handle('learning:get-path', async (_event, params) => {
 *   return await learningService.getLearningPath(params.pathId);
 * });
 *
 * // Handler with options
 * ipc.handle('learning:start-session', async (event, params) => {
 *   return await learningService.startSession(params);
 * }, { name: 'startSession' });
 * ```
 */
export function createIpcProxy(
  globalLogger: LoggerService,
  logSuccess: boolean = false,
  mapError?: (error: unknown) => { code: string; message: string }
) {
  /**
   * Wrapped handle method that:
   * 1. Calls the original ipcMain.handle
   * 2. Automatically handles errors and wraps responses
   * 3. Uses simple 2-param handler signature
   * 4. Supports optional registration options
   */
  function handle<TParams, TReturn>(
    channel: string,
    handler: (event: IpcMainInvokeEvent, params: TParams) => Promise<TReturn>,
    options?: HandlerOptions
  ): void {
    const handlerLogger = globalLogger.child({ channel });

    return ipcMain.handle(channel, async (event, params) => {
      handlerLogger.info('IPC request received', {
        channel,
        hasParams: !!params,
      });

      try {
        const result = await handler(event, params);

        // Auto-wrap response
        const response: ApiResponse = {
          success: true,
          data: result,
          timestamp: new Date(),
        };

        if (logSuccess) {
          handlerLogger.info('✅ IPC request completed', {
            channel,
            hasData: !!result,
          });
        }

        return response;
      } catch (error: unknown) {
        const errorInfo = mapError ? mapError(error) : {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : String(error),
        };

        handlerLogger.error('❌ IPC request failed', {
          channel,
          error: errorInfo.message,
        });

        return {
          success: false,
          error: errorInfo.message,
          timestamp: new Date(),
        } satisfies ApiResponse;
      }
    });
  }

  // Return proxy that looks like ipcMain but uses our wrapped handle
  return {
    on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void) {
      ipcMain.on(channel, listener);
    },
    handle,
  } as typeof ipcMain & { handle: typeof handle };
}
