
import React, { createContext, useContext } from 'react';
import type { ICatalystService } from './interfaces/ICatalystService';
import type { IAnalyticsService } from './interfaces/IAnalyticsService';
import type { ChatService } from './chat/chat-service';
import type { SessionService } from './session/session-service';
import type { DiscoveryService } from './discovery/discovery-service';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import { createSessionService } from './session/session-service';
import { createChatService } from './chat/chat-service';
import { createAnalyticsService } from './analytics/analytics-service';
import { createDiscoveryService } from './discovery/discovery-service';
import { createCatalystService } from './catalyst/catalyst-service';
import { createConfigurationService } from './configuration/configuration-service';
import { createElectronAPIClient, createMockElectronAPIClient } from './api/electron-api-client';
import { createConceptParsingService, type ConceptParsingService } from './concept-parsing/concept-parsing-service';
import type { ConfigurationService } from './configuration/configuration-service';
import { createFileService } from './file/file-service';
import type { FileService } from './file/file-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createAgentService, type AgentService } from './agents/agent-service';

interface ServiceContextType {
  electronAPIClient: ElectronAPI;
  sessionService: SessionService;
  chatService: ChatService;
  analyticsService: IAnalyticsService;
  discoveryService: DiscoveryService;
  catalystService: ICatalystService;
  configService: IConfigurationService;
  fileService: FileService;
  conceptParsing: ConceptParsingService;
  agentService: AgentService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export interface ServicesProviderProps {
  apiClient?: ElectronAPI;
  children: React.ReactNode;
}

/**
 * Unified Services Provider Component
 *
 * Provides a single, consistent pattern for service dependency injection.
 * Automatically creates services from an apiClient, with fallback to mock
 * client when electronAPI is not available (browser environment).
 */
export const ServicesProvider: React.FC<ServicesProviderProps> = ({
  apiClient,
  children
}) => {
  // Create the actual service instances
  const client = apiClient || (typeof window !== 'undefined' && window.electronAPI
    ? createElectronAPIClient()
    : createMockElectronAPIClient());

  const sessionService = createSessionService(client);
  const chatService = createChatService(client);
  const analyticsService = createAnalyticsService(client);
  const discoveryService = createDiscoveryService(client);
  const catalystService = createCatalystService(client);
  const configService = createConfigurationService(client);
  const fileService = createFileService(client);
  const conceptParsing = createConceptParsingService(client);
  const agentService = createAgentService(client);

  return (
    <ServiceContext.Provider value={{
      electronAPIClient: client,
      sessionService,
      chatService,
      analyticsService,
      discoveryService,
      catalystService,
      configService,
      fileService,
      conceptParsing,
      agentService
    }}>
      {children}
    </ServiceContext.Provider>
  );
};

// Service hooks for accessing services through context
export const useCatalystService = (): ICatalystService => {
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

export const useAnalyticsService = (): IAnalyticsService => {
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
export const useConfigurationService = (): IConfigurationService => {
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
  serviceName: T
): ServiceContextType[T] => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error(`useService(${serviceName}) must be used within ServicesProvider`);
  }
  return context[serviceName];
};
