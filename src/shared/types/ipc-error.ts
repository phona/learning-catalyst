export type SimpleErrorType = 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'SYSTEM_ERROR';

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
