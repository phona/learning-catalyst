import { useEffect, useState } from 'react';
import { useConfigurationService, useServiceContext, useElectronAPIClient } from '@/renderer/services/services-provider';
import { SetupPage } from '@/renderer/components/Setup/SetupPage';
import { LoadingScreen } from '@/renderer/components/UI/LoadingScreen';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';
import { setConfigurationService } from '@/renderer/stores/useConfigStore';
import { ReadyApp } from './ReadyApp';
import { IPCErrorPayload } from '@/shared/types/ipc-error';
import { validateConfig, handleInitError } from './app-init';
import { showError } from '@/renderer/utils/toast';
import { READY_TIMEOUT_MS } from '@/shared/types/electron-api';

/**
 * Application state represents the current phase of the app initialization
 */
type AppState = 'loading' | 'setup' | 'error' | 'ready';

const formatIPCError = (payload: IPCErrorPayload): string => {
  const guidance =
    payload.details && typeof payload.details === 'object' && 'guidance' in payload.details
      ? ` – ${(payload.details as Record<string, unknown>).guidance}`
      : '';
  return `${payload.message}${guidance}`;
};

export function AppContent(): JSX.Element {
  const [status, setStatus] = useState<AppState>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{
    message: string;
    details?: string;
    stack?: string;
    errorId?: string;
  } | null>(null);

  const configService = useConfigurationService();
  const { ipcErrors, needsSetup, setupMessage } = useServiceContext();
  const electronAPI = useElectronAPIClient();
  const [processedErrors, setProcessedErrors] = useState<number>(0);

  useEffect(() => {
    setConfigurationService(configService);
  }, [configService]);

  /**
   * Initialize application by:
   * 1. Loading configuration
   * 2. Validating AI provider setup
   * 3. Waiting for main process readiness
   * 4. Transitioning to ready state
   *
   * Cleanup handled via mounted flag to prevent state updates after unmount
   */
  useEffect(() => {
    let mounted = true;

    const initializeApp = async (): Promise<void> => {
      console.log('[App] init run start');

      try {
        // Step 1: Load configuration
        const config = await configService.getConfig();
        console.log('[App] Loaded config', config);

        // Exit early if component unmounted
        if (!mounted) return;

        // Step 2: Validate configuration
        const validation = validateConfig(config);
        if (validation.needsSetup) {
          console.log('[App] status -> setup:', validation.message);
          setStatus('setup');
          setStatusMessage(validation.message || 'Unspecified setup required');
          return;
        }

        // Step 3: Wait for main process readiness
        console.log('[App] awaitReady start', { timeout: READY_TIMEOUT_MS });
        await electronAPI.awaitReady({ timeoutMs: READY_TIMEOUT_MS });
        console.log('[App] awaitReady finished');

        // Step 4: Transition to ready state
        if (mounted) {
          console.log('[App] status -> ready');
          setStatus('ready');
          setStatusMessage(null);
        }
      } catch (error) {
        // Handle initialization errors
        handleInitError(error, 'load-config', setInitError, setStatus, setStatusMessage);
      }
    };

    // Execute initialization
    initializeApp();

    // Cleanup on unmount
    return () => {
      mounted = false;
    };
  }, [configService, electronAPI]);

  // Monitor external signals: forced setup or buffered IPC errors.
  useEffect(() => {
    console.log('[App] status watcher', { status, needsSetup, processedErrors });
    if (status === 'ready') return;

    // Process IPC errors FIRST - SYSTEM_ERROR takes priority over setup
    const newErrors = ipcErrors.slice(processedErrors);
    if (newErrors.length > 0) {
      for (const payload of newErrors) {
        const msg = formatIPCError(payload);
        console.log(payload)

        if (payload.type === 'SYSTEM_ERROR') {
          // SYSTEM_ERROR always transitions to error page regardless of current state
          console.log('[App] SYSTEM_ERROR received, transitioning to error page', { msg });
          setErrorState({
            message: payload.message,
            details: String(payload.details?.errorMessage || payload.details?.error || msg),
            stack: String(payload.details?.stack),
            errorId: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          });
          setStatus('error');
          setProcessedErrors(ipcErrors.length);
          return; // Exit early - error page takes priority
        } else if (status === 'loading') {
          // Non-system errors during loading: show in loading screen
          setInitError(msg);
        } else {
          // Non-system errors in other states: show as toast
          showError(msg);
        }
      }
      console.log('[App] processed IPC errors', { count: ipcErrors.length });
      setProcessedErrors(ipcErrors.length);
    }

    // Only redirect to setup if no SYSTEM_ERROR was found
    if (needsSetup) {
      console.log('[App] status -> setup due to needsSetup', setupMessage);
      setStatus('setup');
      setStatusMessage(setupMessage);
    }
  }, [ipcErrors, needsSetup, setupMessage, status, processedErrors]);

  if (status === 'loading') {
    return <LoadingScreen message="Checking workspace configuration…" error={initError} />;
  }

  if (status === 'setup') {
    return <SetupPage message={statusMessage ?? undefined} />;
  }

  if (status === 'error' && errorState) {
    return (
      <ErrorBoundary
        variant="full"
        crashError={{
          type: 'SYSTEM_ERROR',
          code: errorState.errorId || 'system.initialization_failed',
          message: errorState.message,
          details: {
            errorMessage: errorState.details,
            stack: errorState.stack,
          },
        }}
        title="Application Failed to Start"
        description="Learning Catalyst encountered a critical error during initialization."
      >
        {/* Children won't render when crashError is provided */}
        <div />
      </ErrorBoundary>
    );
  }

  return <ReadyApp />;
}
