import React from 'react';
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
import { type ElectronAPI } from '@/shared/types/electron-api';
import { ServiceContext, type ServiceContextType } from './services-context';

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
  }>;
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
  children,
  overrides,
}) => {
  const client = apiClient;

  const sessionService = overrides?.sessionService ?? createSessionService(client);
  const chatService = overrides?.chatService ?? createChatService(client);
  const analyticsService = overrides?.analyticsService ?? createAnalyticsService(client);
  const discoveryService = overrides?.discoveryService ?? createDiscoveryService(client);
  const catalystService = overrides?.catalystService ?? createCatalystService(client);
  const configService = overrides?.configService ?? createConfigurationService(client);
  const fileService = overrides?.fileService ?? createFileService(client);
  const conceptParsing = overrides?.conceptParsing ?? createConceptParsingService(client);

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
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

// NOTE: Service hooks (`useSessionService`, `useChatService`, etc.) now live in
// `services-context.ts` to keep this TSX module focused on the provider
// component for Fast Refresh compatibility.
