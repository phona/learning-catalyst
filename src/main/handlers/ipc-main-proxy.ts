/**
 * Type-Safe IPC Main Proxy with Interface Abstraction
 * Clean, testable, and type-safe IPC handler registration
 * Compatible with both old and new handler patterns
 */

import { ipcMain, IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { LoggerService } from '../services/core/logger/logger-service';
import type { APIResponse, APIResponseError } from '@/shared/types/electron-api/base';
import { isIPCErrorException, isIPCErrorPayload } from '@/shared/types/ipc-error';

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
  handle<TArgs extends unknown[], TReturn>(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn>,
    options?: HandlerOptions,
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
  mapError?: (error: unknown) => APIResponseError,
) {
  const toAPIResponseError = (channel: string, error: unknown): APIResponseError => {
    if (mapError) {
      return mapError(error);
    }

    if (isIPCErrorException(error)) {
      return {
        code: error.payload.code,
        message: error.payload.message,
        details: error.payload.details,
      };
    }

    if (isIPCErrorPayload(error)) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    if (error && typeof error === 'object') {
      const maybe = error as Partial<{
        code: unknown;
        message: unknown;
        details: unknown;
      }>;

      if (typeof maybe.code === 'string' && typeof maybe.message === 'string') {
        return {
          code: maybe.code,
          message: maybe.message,
          details:
            typeof maybe.details === 'object' && maybe.details !== null
              ? (maybe.details as Record<string, unknown>)
              : undefined,
        };
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof Error ? error.name : 'HANDLER_ERROR';
    const details =
      error instanceof Error && error.stack
        ? ({ channel, stack: error.stack } satisfies Record<string, unknown>)
        : ({ channel } satisfies Record<string, unknown>);

    return { code, message, details };
  };

  /**
   * Wrapped handle method that:
   * 1. Calls the original ipcMain.handle
   * 2. Automatically handles errors and wraps responses
   * 3. Uses simple 2-param handler signature
   * 4. Supports optional registration options
   */
  function handle<TArgs extends unknown[], TReturn>(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TReturn>,
    _options?: HandlerOptions,
  ): void {
    const handlerLogger = globalLogger.child({ channel });

    return ipcMain.handle(channel, async (event, ...args) => {
      handlerLogger.info('IPC request received', {
        channel,
        hasParams: args.length > 0,
      });

      try {
        const result = await handler(event, ...(args as TArgs));

        const response: APIResponse<TReturn> = {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        };

        if (logSuccess) {
          handlerLogger.info('IPC request completed', {
            channel,
            hasData: !!result,
          });
        }

        return response;
      } catch (error: unknown) {
        const errorInfo = toAPIResponseError(channel, error);

        handlerLogger.error('IPC request failed', {
          channel,
          error: errorInfo.message,
          code: errorInfo.code,
        });

        return {
          success: false,
          code: errorInfo.code,
          error: errorInfo,
          timestamp: new Date().toISOString(),
        } satisfies APIResponse<never>;
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
