

import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SetupScreen from '@/renderer/components/SetupScreen';
import { Layout } from '@/renderer/components/Layout';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';
import { SessionManager } from '@/renderer/components/Session/SessionManager';
import { DiscoveryPage } from '@/renderer/DiscoveryPage';
import { ServicesProvider, useConfigurationService } from '@/renderer/services/services-provider';
import { showError } from '@/renderer/utils/toast';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';

const MainRoutes = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<ChatInterface />} />
      <Route path="sessions" element={<SessionManager />} />
      <Route path="discovery" element={<DiscoveryPage />} />
      <Route path="*" element={<ChatInterface />} />
    </Route>
  </Routes>
);

type AppState = 'loading' | 'setup' | 'ready';

const formatIPCError = (payload: IPCErrorPayload): string => {
  const guidance =
    payload.details && typeof payload.details === 'object' && 'guidance' in payload.details
      ? ` – ${(payload.details as Record<string, unknown>).guidance}`
      : '';
  return `${payload.message}${guidance}`;
};

const AppContent: React.FC<{ status: AppState; message: string | null }> = ({ status, message }) => {
  const configService = useConfigurationService();

  if (status === 'setup') {
    return <SetupScreen message={message ?? undefined} configService={configService} />;
  }

  return <MainRoutes />;
};

export default function App(): JSX.Element {
  const [status, setStatus] = useState<AppState>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const location = useLocation();

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
  }, [location.pathname]);

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

  return (
    <ServicesProvider>
      <AppContent status={status} message={statusMessage} />
    </ServicesProvider>
  );
}
