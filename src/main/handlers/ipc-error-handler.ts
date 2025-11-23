import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  IPCErrorException,
  isIPCErrorPayload,
  type IPCErrorPayload,
} from '@/shared/types/ipc-error';

const PATCH_FLAG = Symbol.for('learning-catalyst:ipc-error-handled');

export const serializeIPCError = (error: unknown, channel = 'system'): IPCErrorPayload => {
  if (error instanceof IPCErrorException) {
    return error.payload;
  }
  if (isIPCErrorPayload(error)) {
    return error;
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Unknown error occurred';

  const code = error instanceof Error ? error.name : 'unknown_error';

  const details =
    error instanceof Error && error.stack ? { stack: error.stack, channel } : { channel };

  return {
    type: 'SYSTEM_ERROR',
    code: `${channel}.${code}`,
    message,
    action: 'retry',
    details,
  };
};

const handleWithError =
  <Args extends unknown[], Return>(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Return>,
  ) =>
  async (
    event: IpcMainInvokeEvent,
    ...args: Args
  ): Promise<Return | { success: false; error: IPCErrorPayload }> => {
    try {
      return await listener(event, ...args);
    } catch (error) {
      console.error(`[main][IPC] ${channel} failed`, error);
      return {
        success: false,
        error: serializeIPCError(error, channel),
      };
    }
  };

export const applyStructuredErrorHandling = () => {
  const target = ipcMain as typeof ipcMain & { [PATCH_FLAG]?: boolean };
  if (target[PATCH_FLAG]) {
    return;
  }

  const originalHandle = target.handle.bind(target);
  target.handle = ((channel: string, listener: (...args: unknown[]) => Promise<unknown>) => {
    return originalHandle(channel, handleWithError(channel, listener));
  }) as typeof ipcMain.handle;

  target[PATCH_FLAG] = true;
};
