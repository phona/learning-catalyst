/**
 * Base types for Electron API
 *
 * Common types shared across all API modules.
 */

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface SystemReadyPayload {
  status: 'ready' | 'loading';
  ready: { ipcHandlersRegistered: boolean; startMs?: number };
}

export interface ConfigChangedPayload {
  changedKeys?: string[];
  config?: unknown;
  timestamp?: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
