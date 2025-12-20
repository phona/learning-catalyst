import { useState, useEffect, useCallback } from 'react';

/**
 * System error structure from main process IPC
 */
export interface SystemError {
  type: 'SYSTEM_ERROR' | 'CONFIG_ERROR' | 'NETWORK_ERROR';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Ready payload from main process
 */
export interface ReadyPayload {
  status: 'ready';
  ready: {
    ipcHandlersRegistered: boolean;
    startMs?: number;
  };
}

/**
 * Application initialization state
 */
type AppState = 'setup' | 'ready' | 'crashed' | 'config-error';

/**
 * Return type for the useInitializationState hook
 */
interface UseInitializationStateReturn {
  /** Current application state */
  appState: AppState;

  /** System error if app crashed */
  crashError: SystemError | null;

  /** Configuration error if setup required */
  configError: SystemError | null;

  /** Ready payload if app is ready */
  readyPayload: ReadyPayload | null;

  /** Manually transition to setup state (for testing) */
  resetToSetup: () => void;
}

/**
 * Custom hook for managing application initialization state.
 *
 * This hook:
 * - Listens for ready events from main process
 * - Listens for error events from main process
 * - Routes errors based on type (SYSTEM_ERROR → crash, CONFIG_ERROR → config)
 * - Maintains exclusive state (ready or error, not both)
 * - Provides reset capability for testing
 *
 * @returns Object containing current state and error information
 *
 * @example
 * ```tsx
 * function App() {
 *   const { appState, crashError, readyPayload } = useInitializationState();
 *
 *   if (appState === 'setup') return <SetupPage />;
 *   if (appState === 'crashed') return <ErrorBoundary crashError={crashError} />;
 *   if (appState === 'ready') return <MainApp />;
 *
 *   return null;
 * }
 * ```
 */
export function useInitializationState(): UseInitializationStateReturn {
  const [appState, setAppState] = useState<AppState>('setup');
  const [crashError, setCrashError] = useState<SystemError | null>(null);
  const [configError, setConfigError] = useState<SystemError | null>(null);
  const [readyPayload, setReadyPayload] = useState<ReadyPayload | null>(null);

  /**
   * Resets state to setup (primarily for testing)
   */
  const resetToSetup = useCallback(() => {
    setAppState('setup');
    setCrashError(null);
    setConfigError(null);
    setReadyPayload(null);
  }, []);

  /**
   * Handles ready event from main process
   */
  const handleReady = useCallback((payload: ReadyPayload) => {
    console.log('[Renderer] Received ready event', payload);

    // Only transition from setup state (respect exclusion)
    setAppState((current) => {
      if (current !== 'setup') {
        console.warn(
          `[Renderer] Ignoring ready event - already in ${current} state`,
        );
        return current;
      }

      setReadyPayload(payload);
      return 'ready';
    });
  }, []);

  /**
   * Handles error event from main process
   */
  const handleError = useCallback((error: SystemError) => {
    console.log('[Renderer] Received error event', error);

    // Only transition from setup state (respect exclusion)
    setAppState((current) => {
      if (current !== 'setup') {
        console.warn(
          `[Renderer] Ignoring error event - already in ${current} state`,
        );
        return current;
      }

      // Route based on error type
      if (error.type === 'SYSTEM_ERROR') {
        console.log('[Renderer] Routing to crash page', error);
        setCrashError(error);
        return 'crashed';
      }

      if (error.type === 'CONFIG_ERROR') {
        console.log('[Renderer] Routing to config setup', error);
        setConfigError(error);
        return 'config-error';
      }

      // Default: treat as system error (crash)
      console.log('[Renderer] Unknown error type, routing to crash', error);
      setCrashError(error);
      return 'crashed';
    });
  }, []);

  /**
   * Setup event listeners on mount
   */
  useEffect(() => {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('[Renderer] electronAPI not available');
      setCrashError({
        type: 'SYSTEM_ERROR',
        code: 'renderer.electronAPI.missing',
        message: 'Electron API not available. This may be a renderer initialization issue.',
        timestamp: Date.now(),
      });
      setAppState('crashed');
      return;
    }

    // Subscribe to ready events
    const unsubscribeReady = window.electronAPI.ready?.onReady?.(handleReady);

    // Subscribe to error events
    const unsubscribeError = window.electronAPI.errors?.onError?.(handleError);

    // Cleanup on unmount
    return () => {
      unsubscribeReady?.();
      unsubscribeError?.();
    };
  }, [handleReady, handleError]);

  return {
    appState,
    crashError,
    configError,
    readyPayload,
    resetToSetup,
  };
}

/**
 * Type declaration for electronAPI additions
 * This should be added to the global window type
 */
declare global {
  interface Window {
    electronAPI?: {
      ready?: {
        onReady?: (callback: (payload: ReadyPayload) => void) => () => void;
      };
      errors?: {
        onError?: (callback: (error: SystemError) => void) => () => void;
      };
    };
  }
}
