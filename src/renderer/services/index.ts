
// Unified entry point for renderer services
// Simplified electronAPI client approach

export {
  // API Client functions
  createElectronAPIClient,
  createMockElectronAPIClient,
  createElectronAPIClientWith,
  type ElectronAPIClient,
} from './api/electron-api-client';

export {
  // Service container
  createServiceContainer,
  createTestServiceContainer,
} from './service-container';

export {
  // Simplified services
  createSessionService,
  type SessionService,
} from './session/session-service';

export {
  createChatService,
  type ChatService,
} from './chat/chat-service';

export {
  createAnalyticsService,
  type AnalyticsService,
} from './analytics/analytics-service';

export {
  createFileService,
  type FileService,
} from './file/file-service';

// Legacy services for backward compatibility
export {
  SessionService as LegacySessionService,
  sessionService as legacySessionService,
} from './sessionService';

export {
  AnalyticsService as LegacyAnalyticsService,
} from './AnalyticsService';

// Legacy service container for backward compatibility
export {
  rendererServiceContainer,
  getCatalystService,
  getChatService as getLegacyChatService,
  getAnalyticsService as getLegacyAnalyticsService,
  getDiscoveryService,
  getSessionService as getLegacySessionService,
  getConfigService,
  getService,
  RENDERER_SERVICE_NAMES,
  enableTestMode,
  disableTestMode,
  isInTestMode,
  type RendererServices,
} from './ServiceContainer';