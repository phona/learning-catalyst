
import React, { createContext, useContext } from 'react';
import type { ElectronAPIClient } from './api/electron-api-client';
import type { ICatalystService } from './interfaces/ICatalystService';
import type { IAnalyticsService } from './interfaces/IAnalyticsService';
import type { IChatService } from './interfaces/IChatService';
import type { ISessionService } from './interfaces/ISessionService';
import type { IDiscoveryService } from './interfaces/IDiscoveryService';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import { createSessionService } from './session/session-service';
import { createChatService } from './chat/chat-service';
import { createAnalyticsService } from './analytics/analytics-service';
import { createDiscoveryService } from './discovery/discovery-service';
import { createCatalystService } from './catalyst/catalyst-service';
import { createConfigurationService } from './configuration/configuration-service';
import { createElectronAPIClient, createMockElectronAPIClient } from './api/electron-api-client';
import { useFileService } from './file/file-service';
import { createConceptParsingService, type ConceptParsingService } from './concept-parsing/concept-parsing-service';
import type { ConfigurationService } from './configuration/configuration-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

interface ServiceContextType {
  electronAPIClient: ElectronAPIClient;
  sessionService: ISessionService;
  chatService: IChatService;
  analyticsService: IAnalyticsService;
  discoveryService: IDiscoveryService;
  catalystService: ICatalystService;
  configService: IConfigurationService;
  conceptParsing: ConceptParsingService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export interface ServicesProviderProps {
  apiClient?: ElectronAPIClient;
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
  const conceptParsing = createConceptParsingService(client);

  return (
    <ServiceContext.Provider value={{
      electronAPIClient: client,
      sessionService,
      chatService,
      analyticsService,
      discoveryService,
      catalystService,
      configService,
      conceptParsing
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

export const useChatService = (): IChatService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useChatService must be used within ServicesProvider');
  }
  return context.chatService;
};

export const useSessionService = (): ISessionService => {
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

export const useDiscoveryService = (): IDiscoveryService => {
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
export const useElectronAPIClient = (): ElectronAPIClient => {
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
