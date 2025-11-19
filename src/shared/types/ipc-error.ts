export type SimpleErrorType = 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'SYSTEM_ERROR';

// Error types
export interface IPCError extends Error {
  code: string;
  channel?: string;
  requestId?: string;
}

export type IPCErrorAction = 'openSettings' | 'retry' | 'openProviderSetup' | 'contactSupport';

export type IPCErrorPayload = {
  type: SimpleErrorType;
  code: string;
  message: string;
  needsSetup?: boolean;
  action?: IPCErrorAction;
  details?: Record<string, unknown>;
};

export const isIPCErrorPayload = (value: unknown): value is IPCErrorPayload => {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as IPCErrorPayload).type === 'string' &&
    typeof (value as IPCErrorPayload).code === 'string' &&
    typeof (value as IPCErrorPayload).message === 'string'
  );
};

export const createIPCError = (payload: IPCErrorPayload): IPCErrorPayload => ({
  ...payload
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
    Object.setPrototypeOf(this, IPCErrorException.prototype);
  }
}

export const isIPCErrorException = (value: unknown): value is IPCErrorException => {
  return value instanceof IPCErrorException;
};
