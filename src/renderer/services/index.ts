// Unified entry point for renderer services
// Simplified electronAPI client approach

export {
  // API Client functions
  createElectronAPIClient,
  createMockElectronAPIClient,
  createElectronAPIClientWith,
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

export { createChatService, type ChatService } from './chat/chat-service';

export { createAnalyticsService, type AnalyticsService } from './analytics/analytics-service';

export { createFileService, type FileService } from './file/file-service';
