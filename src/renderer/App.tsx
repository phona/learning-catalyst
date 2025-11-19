/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */

import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import SetupScreen from '@/renderer/components/SetupScreen';
import { showError } from '@/renderer/utils/toast';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';

const MainRoutes = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Routes>
      <Route
        path="/"
        element={
          <main role="main" className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Learning Catalyst
            </h1>
            <div>Welcome to Learning Catalyst</div>
          </main>
        }
      />
      <Route
        path="/settings"
        element={
          <main role="main" className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Learning Catalyst
            </h1>
            <div>Preferences</div>
          </main>
        }
      />
      <Route
        path="/sessions"
        element={
          <main role="main" className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Learning Catalyst
            </h1>
            <div>Session Manager</div>
          </main>
        }
      />
    </Routes>
  </div>
);

type AppState = 'loading' | 'setup' | 'ready';

const formatIPCError = (payload: IPCErrorPayload): string => {
  const guidance =
    payload.details && typeof payload.details === 'object' && 'guidance' in payload.details
      ? ` – ${(payload.details as Record<string, unknown>).guidance}`
      : '';
  return `${payload.message}${guidance}`;
};

export default function App(): JSX.Element {
  const [status, setStatus] = useState<AppState>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      if (!window?.electronAPI) {
        setStatus('setup');
        setStatusMessage('Electron API is unavailable.');
        return;
      }

      try {
        const config = await window.electronAPI.settings.getConfig();
        const chatConfig = config?.ai?.model_types?.chat;

        if (!chatConfig?.provider || !chatConfig?.model) {
          setStatus('setup');
          setStatusMessage('AI provider is not configured yet.');
          return;
        }

        setStatus('ready');
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to load workspace configuration.');
        setStatus('setup');
        setStatusMessage('Unable to load workspace configuration.');
      }
    };

    checkConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = window?.electronAPI?.onIPCError?.((payload) => {
      showError(formatIPCError(payload));
      if (payload.needsSetup) {
        setStatus('setup');
        setStatusMessage(payload.message);
      }
    });

    return () => unsubscribe?.();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center text-gray-600 dark:text-gray-300">
          Checking workspace configuration…
        </div>
      </div>
    );
  }

  if (status === 'setup') {
    return <SetupScreen message={statusMessage ?? undefined} />;
  }

  return <MainRoutes />;
}
