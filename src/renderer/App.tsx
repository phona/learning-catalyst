import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SetupScreen from '@/renderer/components/SetupScreen';
import { Layout } from '@/renderer/components/Layout';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';
import { SessionManager } from '@/renderer/components/Session/SessionManager';
import { DiscoveryPage } from '@/renderer/DiscoveryPage';
import {
  useAgentService,
  useConfigurationService,
  useElectronAPIClient,
} from '@/renderer/services/services-provider';
import { showError } from '@/renderer/utils/toast';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { setConfigurationService } from '@/renderer/stores/useConfigStore';
import { setAgentService, useAgentStore } from '@/renderer/stores/agents/agentStore';

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

const AppContent: React.FC<{ status: AppState; message: string | null }> = ({
  status,
  message,
}) => {
  if (status === 'setup') {
    return <SetupScreen message={message ?? undefined} />;
  }

  return <MainRoutes />;
};

export default function App(): JSX.Element {
  const [status, setStatus] = useState<AppState>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const location = useLocation();
  const configService = useConfigurationService();
  const electronAPIClient = useElectronAPIClient();
  const agentService = useAgentService();

  useEffect(() => {
    setConfigurationService(configService);
  }, [configService, setConfigurationService]);

  useEffect(() => {
    setAgentService(agentService);
    if (status === 'ready') {
      useAgentStore
        .getState()
        .loadAgents()
        .catch((error) => {
          console.error('Failed to load agents:', error);
        });
    }
  }, [agentService, setAgentService, status]);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await configService.getConfig();
        if (!config) {
          setStatus('setup');
          setStatusMessage('Electron API is unavailable.');
          return;
        }

        const chatConfig = config?.ai?.modelTypes?.chat;

        if (!chatConfig?.provider || !chatConfig?.model) {
          setStatus('setup');
          setStatusMessage('AI provider is not configured yet.');
          return;
        }

        setStatus('ready');
        setStatusMessage(null);
      } catch (error) {
        showError(
          error instanceof Error ? error.message : 'Failed to load workspace configuration.',
        );
        setStatus('setup');
        setStatusMessage('Unable to load workspace configuration.');
      }
    };

    checkConfig();
  }, [location.pathname, configService]);

  useEffect(() => {
    const unsubscribe = electronAPIClient.onIPCError?.((payload) => {
      showError(formatIPCError(payload));
      if (payload.needsSetup) {
        setStatus('setup');
        setStatusMessage(payload.message);
      }
    });

    return () => unsubscribe?.();
  }, [electronAPIClient]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center text-gray-600 dark:text-gray-300">
          Checking workspace configuration…
        </div>
      </div>
    );
  }

  return <AppContent status={status} message={statusMessage} />;
}
