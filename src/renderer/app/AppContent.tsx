import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useConfigurationService, useElectronAPIClient } from '@/renderer/services/services-context';
import { LoadingScreen, ErrorPage } from '@/renderer/shared/ui';
import { setConfigurationService } from '@/renderer/stores/useConfigStore';
import SetupPage from '@/renderer/pages/setup/SetupPage';
import { ReadyApp } from './ReadyApp';
import { IPCErrorPayload } from '@/shared/types/ipc-error';
import { validateConfig } from './app-init';
import { showError } from '@/renderer/shared/lib';
import { READY_TIMEOUT_MS } from '@/shared/types/electron-api';
import {
  initialInitState,
  initReducer,
  mapIPCErrorToInitEvent,
  buildInitEventKey,
  type InitEvent,
} from '@/renderer/app/init/init-machine';

const toCrashPayload = (
  error: unknown,
  code = 'system.initialization_failed',
  fallbackMessage = 'Application failed to initialize.',
): IPCErrorPayload => {
  if (error && typeof error === 'object') {
    const maybePayload = error as Partial<IPCErrorPayload>;
    if (
      typeof maybePayload.type === 'string' &&
      typeof maybePayload.code === 'string' &&
      typeof maybePayload.message === 'string'
    ) {
      return maybePayload as IPCErrorPayload;
    }
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  return {
    type: 'SYSTEM_ERROR',
    code,
    message,
    details:
      error instanceof Error
        ? {
            errorMessage: error.message,
            stack: error.stack,
          }
        : {
            errorMessage: fallbackMessage,
          },
  };
};

function InitGuard({
  status,
  loadingError,
  crashError,
}: {
  status: 'loading' | 'setup' | 'crash' | 'ready';
  loadingError?: string | null;
  crashError: {
    type: string;
    code: string;
    message: string;
    details?: unknown;
  } | null;
}): JSX.Element {
  const location = useLocation();

  if (crashError) {
    return (
      <ErrorPage
        crashError={crashError}
        title="Application Failed to Start"
        description="Learning Catalyst encountered a critical error during initialization."
      />
    );
  }

  if (status === 'loading') {
    return <LoadingScreen message="Checking workspace configuration..." error={loadingError ?? undefined} />;
  }

  if (status === 'setup' && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (status === 'ready' && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function AppContent(): JSX.Element {
  const [state, dispatch] = useReducer(initReducer, initialInitState);

  const configService = useConfigurationService();
  const electronAPI = useElectronAPIClient();
  const statusRef = useRef(state.status);
  const location = useLocation();
  const initRunRef = useRef(0);

  useEffect(() => {
    setConfigurationService(configService);
  }, [configService]);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    const handleInitEvent = (event: InitEvent) => {
      if (event.type === 'nonfatal_error' && statusRef.current === 'ready') {
        showError(event.message);
        return;
      }
      dispatch(event);
    };

    const unsubscribe = electronAPI.onIPCError((payload: IPCErrorPayload) => {
      handleInitEvent(mapIPCErrorToInitEvent(payload));
    });

    let active = true;
    (async () => {
      try {
        const errors = await electronAPI.getErrorBuffer();
        if (!active) return;

        const seen = new Set<string>();
        for (const payload of errors as IPCErrorPayload[]) {
          const event = mapIPCErrorToInitEvent(payload);
          const key = buildInitEventKey(event);
          if (seen.has(key)) continue;
          seen.add(key);
          handleInitEvent(event);
        }

        await electronAPI.clearErrorBuffer();
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Unable to load startup error buffer.';
        handleInitEvent({ type: 'nonfatal_error', message });
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [electronAPI]);

  const initializeApp = useCallback(async (): Promise<void> => {
    const runId = ++initRunRef.current;

    try {
      const config = await configService.getConfig();
      if (initRunRef.current !== runId) return;

      const validation = validateConfig(config);
      if (validation.needsSetup) {
        dispatch({ type: 'config_needs_setup', message: validation.message });
        return;
      }
    } catch (error) {
      if (initRunRef.current !== runId) return;
      const message = error instanceof Error ? error.message : 'Unable to load workspace configuration.';
      showError(message);
      dispatch({ type: 'config_needs_setup', message: 'Unable to load workspace configuration.' });
      return;
    }

    dispatch({ type: 'config_ok' });

    try {
      await electronAPI.awaitReady({ timeoutMs: READY_TIMEOUT_MS });
      if (initRunRef.current !== runId) return;
      dispatch({ type: 'ready' });
    } catch (error) {
      if (initRunRef.current !== runId) return;
      const payload = toCrashPayload(
        error,
        'system.ready_timeout',
        `Main process did not signal ready within ${READY_TIMEOUT_MS} ms.`,
      );
      dispatch({ type: 'system_error', payload });
    }
  }, [configService, electronAPI]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (state.status !== 'setup') return;
    if (location.pathname === '/setup') return;
    initializeApp();
  }, [initializeApp, location.pathname, state.status]);

  const crashError =
    state.status === 'crash' && state.crash
      ? {
          type: state.crash.type,
          code: state.crash.code,
          message: state.crash.message,
          details: state.crash.details,
        }
      : null;

  return (
    <Routes>
      <Route
        element={
          <InitGuard
            status={state.status}
            loadingError={state.loadingError}
            crashError={crashError}
          />
        }
      >
        <Route
          path="/setup"
          element={
            <SetupPage
              message={state.status === 'setup' ? state.statusMessage ?? undefined : undefined}
            />
          }
        />
        <Route path="/*" element={<ReadyApp />} />
      </Route>
    </Routes>
  );
}
