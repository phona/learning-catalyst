/**
 * Simple ElectronAPI hook - returns plain API without wrapping
 *
 * Provides dependency injection context for testing.
 * Use `unwrapAPI()` helper (from useElectronAPI.helpers.ts) to unwrap APIResponse.
 */

import { createContext, useContext, type FC, type ReactNode } from 'react';
import type { ElectronAPI } from '@/shared/types';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';

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
 * NOTE: This file only exports React-facing APIs (provider + hook).
 * The unwrapAPI helper and IPCError live in useElectronAPI.helpers.ts
 * to keep Fast Refresh boundaries simple. The react-refresh rule
 * currently flags this hook export as a false-positive, so we disable
 * it for this line only.
 *
 * @example
 * ```tsx
 * const api = useElectronAPI();
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useElectronAPI(): ElectronAPI {
  const api = useContext(ElectronAPIContext);
  if (!api) {
    throw new Error('useElectronAPI must be used within ElectronAPIProvider');
  }
  return api;
}
