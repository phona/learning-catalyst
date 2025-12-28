import { createContext, useContext } from 'react';
import type { ChatService } from './chat/chat-service';
import type { SessionService } from './session/session-service';
import type { DiscoveryService } from './discovery/discovery-service';
import type { AnalyticsService } from './analytics/analytics-service';
import type { CatalystService } from './catalyst/catalyst-service';
import type { ConfigurationService } from './configuration/configuration-service';
import type { ConceptParsingService } from './concept-parsing/concept-parsing-service';
import type { FileService } from './file/file-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

export interface ServiceContextType {
  electronAPIClient: ElectronAPI;
  sessionService: SessionService;
  chatService: ChatService;
  analyticsService: AnalyticsService;
  discoveryService: DiscoveryService;
  catalystService: CatalystService;
  configService: ConfigurationService;
  fileService: FileService;
  conceptParsing: ConceptParsingService;
}

export const ServiceContext = createContext<ServiceContextType | null>(null);

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

