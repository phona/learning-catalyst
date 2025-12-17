import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ChatService } from './chat/chat-service';
import type { SessionService } from './session/session-service';
import type { DiscoveryService } from './discovery/discovery-service';
import { createSessionService } from './session/session-service';
import { createChatService } from './chat/chat-service';
import { createAnalyticsService, type AnalyticsService } from './analytics/analytics-service';
import { createDiscoveryService } from './discovery/discovery-service';
import { createCatalystService, type CatalystService } from './catalyst/catalyst-service';
import {
  createConfigurationService,
  type ConfigurationService,
} from './configuration/configuration-service';

import {
  createConceptParsingService,
  type ConceptParsingService,
} from './concept-parsing/concept-parsing-service';
import { createFileService, type FileService } from './file/file-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createAgentService, type AgentService } from './agents/agent-service';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { requiresSetup } from '@/shared/types/ipc-error';

interface ServiceContextType {
  electronAPIClient: ElectronAPI;
  sessionService: SessionService;
  chatService: ChatService;
  analyticsService: AnalyticsService;
  discoveryService: DiscoveryService;
  catalystService: CatalystService;
  configService: ConfigurationService;
  fileService: FileService;
  conceptParsing: ConceptParsingService;
  agentService: AgentService;
  ipcErrors: IPCErrorPayload[];
  needsSetup: boolean;
  setupMessage: string | null;
  markSetupComplete: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export interface ServicesProviderProps {
  apiClient: ElectronAPI;
  children: React.ReactNode;
  overrides?: Partial<{
    sessionService: SessionService;
    chatService: ChatService;
    analyticsService: AnalyticsService;
    discoveryService: DiscoveryService;
    catalystService: CatalystService;
    configService: ConfigurationService;
    fileService: FileService;
    conceptParsing: ConceptParsingService;
    agentService: AgentService;
  }>;
}

/**
 * Unified Services Provider Component
 *
 * Provides a single, consistent pattern for service dependency injection.
 * Automatically creates services from an apiClient, with fallback to mock
 * client when electronAPI is not available (browser environment).
 */
export const ServicesProvider: React.FC<ServicesProviderProps> = ({ apiClient, children, overrides }) => {
  const client = apiClient;

  const sessionService = overrides?.sessionService ?? createSessionService(client);
  const chatService = overrides?.chatService ?? createChatService(client);
  const analyticsService = overrides?.analyticsService ?? createAnalyticsService(client);
  const discoveryService = overrides?.discoveryService ?? createDiscoveryService(client);
  const catalystService = overrides?.catalystService ?? createCatalystService(client);
  const configService = overrides?.configService ?? createConfigurationService(client);
  const fileService = overrides?.fileService ?? createFileService(client);
  const conceptParsing = overrides?.conceptParsing ?? createConceptParsingService(client);
  const agentService = overrides?.agentService ?? createAgentService(client);

  const [ipcErrors, setIpcErrors] = useState<IPCErrorPayload[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const api = client as unknown;
    let active = true;
    (async () => {
      try {
        if (api && typeof api === 'object' && 'getErrorBuffer' in api) {
          const errors = await (api as { getErrorBuffer: () => Promise<unknown[]> }).getErrorBuffer();
          if (Array.isArray(errors) && errors.length > 0) {
            setIpcErrors((prev) => [...prev, ...errors as IPCErrorPayload[]]);
            console.log('[ServicesProvider] loaded IPC error buffer', { count: errors.length });
            for (const payload of errors as IPCErrorPayload[]) {
              if (requiresSetup(payload)) {
                console.log('[ServicesProvider] needsSetup triggered by buffered error');
                setNeedsSetup(true);
                setSetupMessage(String((payload as any)?.message ?? ''));
                break;
              }
            }
          }
          try {
            if (api?.clearErrorBuffer) {
              console.log('[ServicesProvider] clearing IPC error buffer');
              await api.clearErrorBuffer();
            }
          } catch {}
        }
      } catch {}
      try {
        if (active && api?.onIPCError) {
          unsubscribe = api.onIPCError((payload: unknown) => {
            const typed = payload as IPCErrorPayload;
            setIpcErrors((prev) => [...prev, typed]);
            console.log('[ServicesProvider] IPC error received');
            if (requiresSetup(typed)) {
              console.log('[ServicesProvider] needsSetup triggered by live error');
              setNeedsSetup(true);
              setSetupMessage(String((typed as any)?.message ?? ''));
            }
          });
        }
      } catch {}
    })();
    return () => {
      active = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [client]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await configService.getConfig();
        const chat = (cfg?.ai as any)?.modelTypes?.chat;
        const providers = (cfg?.ai as any)?.providers ?? {};
        const providerId = chat?.provider as string | undefined;
        const providerCfg = providerId ? providers[providerId] : undefined;
        const localIds = ['openai-compatible', 'ollama', 'lmstudio'];
        const isLocal = typeof (providerCfg?.providerType) === 'string' && localIds.includes(String(providerCfg?.providerType));
        const hasModel = typeof chat?.model === 'string' && chat.model.trim().length > 0;
        const hasProvider = typeof providerId === 'string' && providerId.trim().length > 0 && !!providerCfg;
        const hasBaseUrl = typeof providerCfg?.baseUrl === 'string' && providerCfg.baseUrl.trim().length > 0;
        const hasApiKey = typeof providerCfg?.apiKey === 'string' && providerCfg.apiKey.trim().length > 0;
        const hasModels = Array.isArray(providerCfg?.models) && providerCfg.models.length > 0;
        const credsOk = isLocal ? hasBaseUrl : (hasApiKey || hasModels);
        const valid = hasProvider && hasModel && credsOk;
        if (active && valid) {
          console.log('[ServicesProvider] derived config valid, clearing needsSetup');
          setNeedsSetup(false);
          setSetupMessage(null);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [configService]);

  const markSetupComplete = async (): Promise<void> => {
    try {
      const api = client as unknown;
      if (api && typeof api === 'object' && 'clearErrorBuffer' in api) {
        console.log('[ServicesProvider] markSetupComplete: clearing IPC error buffer');
        await (api as { clearErrorBuffer: () => Promise<void> }).clearErrorBuffer();
      }
    } catch {}
    console.log('[ServicesProvider] markSetupComplete: needsSetup=false');
    setNeedsSetup(false);
    setSetupMessage(null);
  };

  return (
    <ServiceContext.Provider
      value={{
        electronAPIClient: client,
        sessionService,
        chatService,
        analyticsService,
        discoveryService,
        catalystService,
        configService,
        fileService,
        conceptParsing,
        agentService,
        ipcErrors,
        needsSetup,
        setupMessage,
        markSetupComplete,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

// Service hooks for accessing services through context
export const useCatalystService = (): CatalystService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useCatalystService must be used within ServicesProvider');
  }
  return context.catalystService;
};

export const useChatService = (): ChatService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useChatService must be used within ServicesProvider');
  }
  return context.chatService;
};

export const useSessionService = (): SessionService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useSessionService must be used within ServicesProvider');
  }
  return context.sessionService;
};

export const useAnalyticsService = (): AnalyticsService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useAnalyticsService must be used within ServicesProvider');
  }
  return context.analyticsService;
};

export const useDiscoveryService = (): DiscoveryService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useDiscoveryService must be used within ServicesProvider');
  }
  return context.discoveryService;
};

// Custom hook to get the service container context
export const useServiceContext = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServiceContext must be used within ServicesProvider');
  }
  return context;
};

// Hook to access electron API client
export const useElectronAPIClient = (): ElectronAPI => {
  return useServiceContext().electronAPIClient;
};

// Hook to access configuration service
export const useConfigurationService = (): ConfigurationService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useConfigurationService must be used within ServicesProvider');
  }
  return context.configService;
};

// Hook to access file service
export const useFileService = (): FileService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useFileService must be used within ServicesProvider');
  }
  return context.fileService;
};

export const useAgentService = (): AgentService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useAgentService must be used within ServicesProvider');
  }
  return context.agentService;
};

// Generic service hook for backward compatibility
export const useService = <T extends keyof ServiceContextType>(
  serviceName: T,
): ServiceContextType[T] => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error(`useService(${serviceName}) must be used within ServicesProvider`);
  }
  return context[serviceName];
};
