export type ErrorType = 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'SYSTEM_ERROR';

// Error types
export interface IPCError extends Error {
  code: string;
  channel?: string;
  requestId?: string;
}

export type IPCErrorPayload = {
  type: ErrorType;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export const isIPCErrorPayload = (value: unknown): value is IPCErrorPayload => {
  const maybePayload = value as IPCErrorPayload;
  return (
    !!maybePayload &&
    typeof maybePayload === 'object' &&
    typeof maybePayload.type === 'string' &&
    typeof maybePayload.code === 'string' &&
    typeof maybePayload.message === 'string' &&
    (maybePayload.details === undefined ||
      (typeof maybePayload.details === 'object' && maybePayload.details !== null))
  );
};

export const createIPCError = (payload: IPCErrorPayload): IPCErrorPayload => ({
  ...payload,
});

export const IPC_ERROR_CHANNEL = 'ipc:error';

export class IPCErrorException extends Error implements IPCError {
  public readonly payload: IPCErrorPayload;
  public readonly code: string;

  constructor(payload: IPCErrorPayload) {
    super(payload.message);
    this.payload = payload;
    this.code = payload.code;
    this.name = 'IPCErrorException';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPCErrorException);
    } else {
      this.stack = new Error(payload.message).stack;
    }

    Object.setPrototypeOf(this, IPCErrorException.prototype);
  }
}

export const isIPCErrorException = (value: unknown): value is IPCErrorException => {
  return value instanceof IPCErrorException;
};

// Global error buffer types
export type BufferedIPCError = IPCErrorPayload & { timestamp: number };
export const MAX_ERROR_BUFFER_SIZE = 50;

export const requiresSetup = (payload: IPCErrorPayload): boolean => {
  if (!payload) return false;
  if (payload.type === 'CONFIG_ERROR') return true;
  return (
    typeof payload.code === 'string' &&
    payload.code.endsWith('provider.config.missing_api_key')
  );
};
