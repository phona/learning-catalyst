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
  serviceContainer,
  createTestServiceContainer,
  getElectronAPIClient,
  getSessionService,
  getChatService,
  getAnalyticsService,
} from './service-container';

export {
  // Simplified services
  DefaultSessionService,
  type SessionService,
} from './session/session-service';

export {
  DefaultChatService,
  type ChatService,
} from './chat/chat-service';

export {
  DefaultAnalyticsService,
  type AnalyticsService,
} from './analytics/analytics-service';

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