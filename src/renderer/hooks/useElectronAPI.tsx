/**
 * Simple ElectronAPI hook - returns plain API without wrapping
 *
 * Provides dependency injection context for testing
 * Use unwrapAPI() helper to unwrap APIResponse
 */

import { createContext, useContext, type FC, type ReactNode } from 'react';
import type { ElectronAPI } from '@/shared/types';
import type { APIResponse } from '@/shared/types/electron-api/base';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import { showError } from '@/renderer/utils/toast';

/** IPC call options */
export interface IPCCallOptions {
  /** Suppress toast notification on error */
  silent?: boolean;
}

/** Structured IPC error with code for programmatic handling */
export class IPCError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

/**
 * Unwraps APIResponse<T> to T
 * @param response - The API response to unwrap
 * @param options - Options for unwrapping behavior
 * @returns The unwrapped data
 * @throws IPCError if response indicates failure
 */
function unwrap<T>(response: APIResponse<T>, options: IPCCallOptions = {}): T {
  if (!response.success) {
    const errorObj = response.error;
    const error = new IPCError(
      errorObj?.code ?? 'IPC_ERROR',
      errorObj?.message ?? 'Unknown error',
      errorObj?.details as Record<string, unknown> | undefined,
    );

    // Toast unless silent
    if (!options.silent) {
      showError(error.message);
    }

    // Re-throw for caller handling
    throw error;
  }

  return response.data as T;
}

/**
 * Helper to unwrap API responses
 * @param responsePromise - Promise that resolves to APIResponse<T>
 * @returns Promise that resolves to unwrapped data T
 */
export function unwrapAPI<T>(responsePromise: Promise<APIResponse<T>>): Promise<T> {
  return responsePromise.then((response) => unwrap(response));
}

// Context for dependency injection
const ElectronAPIContext = createContext<ElectronAPI | null>(null);

interface ElectronAPIProviderProps {
  /** Optional mock API for testing */
  api?: ElectronAPI;
  children: ReactNode;
}

/**
 * Provider component for ElectronAPI injection
 *
 * @example
 * ```tsx
 * // Production (in main.tsx or App.tsx)
 * <ElectronAPIProvider>
 *   <App />
 * </ElectronAPIProvider>
 *
 * // Testing
 * <ElectronAPIProvider api={mockApi}>
 *   <MyComponent />
 * </ElectronAPIProvider>
 * ```
 */
export const ElectronAPIProvider: FC<ElectronAPIProviderProps> = ({ api, children }) => {
  // Use provided API or create default from Electron
  const electronAPI = api ?? createElectronAPIClient();

  return (
    <ElectronAPIContext.Provider value={electronAPI}>
      {children}
    </ElectronAPIContext.Provider>
  );
};

/**
 * React hook that returns the ElectronAPI
 *
 * @example
 * ```tsx
 * const api = useElectronAPI();
 *
 * // Use unwrapAPI to unwrap responses:
 * const data = await unwrapAPI(api.sessions.list());
 * const messages = await unwrapAPI(api.chat.getMessages(id));
 *
 * // Error handling with try/catch:
 * try {
 *   const data = await unwrapAPI(api.sessions.delete(id));
 * } catch (e) {
 *   if (e instanceof IPCError && e.code === 'NOT_FOUND') {
 *     // Handle specific error
 *   }
 * }
 * ```
 */
export function useElectronAPI(): ElectronAPI {
  const api = useContext(ElectronAPIContext);
  if (!api) {
    throw new Error('useElectronAPI must be used within ElectronAPIProvider');
  }
  return api;
}
