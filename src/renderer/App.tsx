import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { READY_TIMEOUT_MS } from '@/shared/types/electron-api';
import SetupScreen from '@/renderer/components/SetupScreen';
import { Layout } from '@/renderer/components/Layout';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';
import { SessionManager } from '@/renderer/components/Session/SessionManager';
import { DiscoveryPage } from '@/renderer/DiscoveryPage';
import { SettingsPanel } from '@/renderer/components/Config/SettingsPanel';
import { LearningDashboard } from '@/renderer/components/Dashboard/LearningDashboard';
import { useAgentService, useConfigurationService, useServiceContext, useElectronAPIClient } from '@/renderer/services/services-provider';
import { showError } from '@/renderer/utils/toast';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { setConfigurationService } from '@/renderer/stores/useConfigStore';
import { setAgentService, useAgentStore } from '@/renderer/stores/agents/agentStore';
import { LoadingScreen } from '@/renderer/components/UI/LoadingScreen';

const MainRoutes = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<ChatInterface />} />
      <Route path="sessions" element={<SessionManager />} />
      <Route path="discovery" element={<DiscoveryPage />} />
      <Route path="progress" element={<LearningDashboard />} />
      <Route path="settings" element={<SettingsPanel />} />
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
  const [initError, setInitError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const configService = useConfigurationService();
  const { ipcErrors, needsSetup, setupMessage } = useServiceContext();
  const agentService = useAgentService();
  const electronAPI = useElectronAPIClient();
  const [processedErrors, setProcessedErrors] = useState<number>(0);

  useEffect(() => {
    setConfigurationService(configService);
  }, [configService]);

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
  }, [agentService, status]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      console.log('[App] init run start');
      try {
        const config = await configService.getConfig();
        console.log('[App] Loaded config', config);
        
        if (!mounted) return;

        if (!config) {
          console.log('[App] status -> setup: electron API unavailable');
          setStatus('setup');
          setStatusMessage('Electron API is unavailable.');
          return;
        }

        const chatConfig = config?.ai?.modelTypes?.chat;
        console.log('[App] Chat config', chatConfig);
        
        if (!chatConfig?.provider || !chatConfig?.model) {
          console.log('[App] status -> setup: chat assignment missing');
          setStatus('setup');
          setStatusMessage('AI provider is not configured yet.');
          return;
        }

        try {
          console.log('[App] awaitReady start', { timeout: READY_TIMEOUT_MS });
          await electronAPI.awaitReady({ timeoutMs: READY_TIMEOUT_MS });
          console.log('[App] awaitReady finished');
        } catch (error) {
           console.error('[App] awaitReady failed', error);
           if (mounted) {
             setInitError('System initialization timed out. Please restart the application.');
           }
           return;
        }

        if (mounted) {
          console.log('[App] status -> ready');
          setStatus('ready');
          setStatusMessage(null);
        }
      } catch (error) {
        console.error('[App] Config load failed', error);
        if (mounted) {
          showError(
            error instanceof Error ? error.message : 'Failed to load workspace configuration.',
          );
          console.log('[App] status -> setup: config load failed');
          setStatus('setup');
          setStatusMessage('Unable to load workspace configuration.');
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  // Monitor for external setup requirements
  useEffect(() => {
    if (status === 'ready') return;
    
    if (needsSetup) {
      console.log('[App] status -> setup due to needsSetup', setupMessage);
      setStatus('setup');
      setStatusMessage(setupMessage);
    }
  }, [needsSetup, setupMessage, status]);

  useEffect(() => {
    console.log('[App] status effect', { status, needsSetup, processedErrors });
    if (status === 'ready') {
      return;
    }
    if (needsSetup) {
      console.log('[App] status -> setup due to needsSetup', setupMessage);
      setStatus('setup');
      setStatusMessage(setupMessage);
      return;
    }
    const newErrors = ipcErrors.slice(processedErrors);
    if (newErrors.length === 0) return;
    for (const payload of newErrors) {
      const msg = formatIPCError(payload);
      if (status === 'loading') {
        setInitError(msg);
      } else {
        showError(msg);
      }
    }
    console.log('[App] processed IPC errors', { count: ipcErrors.length });
    setProcessedErrors(ipcErrors.length);
  }, [ipcErrors, needsSetup, setupMessage, status, processedErrors]);

  if (status === 'loading') {
    return <LoadingScreen message="Checking workspace configuration…" error={initError} />;
  }

  return <AppContent status={status} message={statusMessage} />;
}
