import { isFatalError, requiresSetup, type IPCErrorPayload } from '@/shared/types/ipc-error';

export type InitStatus = 'loading' | 'setup' | 'crash' | 'ready';

export interface InitState {
  status: InitStatus;
  statusMessage?: string | null;
  loadingError?: string | null;
  crash?: IPCErrorPayload | null;
}

export type InitEvent =
  | { type: 'config_ok' }
  | { type: 'config_needs_setup'; message?: string }
  | { type: 'ready' }
  | { type: 'system_error'; payload: IPCErrorPayload }
  | { type: 'nonfatal_error'; message: string };

export const initialInitState: InitState = {
  status: 'loading',
  statusMessage: null,
  loadingError: null,
  crash: null,
};

export function initReducer(state: InitState, event: InitEvent): InitState {
  if (event.type === 'system_error') {
    return {
      status: 'crash',
      crash: event.payload,
      statusMessage: null,
      loadingError: null,
    };
  }

  if (state.status === 'ready' || state.status === 'crash') {
    // Only system errors can preempt a ready/crashed app; ignore other events.
    return state;
  }

  switch (event.type) {
    case 'config_needs_setup':
      return {
        status: 'setup',
        statusMessage: event.message ?? null,
        loadingError: null,
        crash: null,
      };
    case 'config_ok':
      return state.status === 'setup'
        ? { status: 'loading', statusMessage: null, loadingError: null, crash: null }
        : { ...state, statusMessage: null };
    case 'ready':
      return state.status === 'loading'
        ? { status: 'ready', statusMessage: null, loadingError: null, crash: null }
        : state;
    case 'nonfatal_error':
      return state.status === 'loading'
        ? { ...state, loadingError: event.message }
        : state;
    default:
      return state;
  }
}

export const mapIPCErrorToInitEvent = (payload: IPCErrorPayload): InitEvent => {
  if (isFatalError(payload)) {
    return { type: 'system_error', payload };
  }
  if (requiresSetup(payload)) {
    return { type: 'config_needs_setup', message: payload.message };
  }
  return { type: 'nonfatal_error', message: payload.message };
};

export const buildInitEventKey = (event: InitEvent): string => {
  switch (event.type) {
    case 'system_error':
      return `${event.type}:${event.payload.code}:${event.payload.message}`;
    case 'config_needs_setup':
      return `${event.type}:${event.message ?? ''}`;
    case 'nonfatal_error':
      return `${event.type}:${event.message}`;
    default:
      return event.type;
  }
};
