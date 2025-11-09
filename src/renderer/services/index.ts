/**
 * Services Index - Frontend API clients
 * Clean architecture with display-optimized API clients
 */

// Chat Services
export { ChatClient, chatClient } from './chat/chatClient';

// Session Services
export { SessionClient, sessionClient } from './sessions/sessionClient';

// Agent Services
export { AgentClient, agentClient } from './agents/agentClient';

// Service Container and DI Access
export {
  rendererServiceContainer,
  getService,
  getCatalystService,
  getChatService,
  getAnalyticsService,
  getDiscoveryService,
  getSessionService,
  RENDERER_SERVICE_NAMES
} from './ServiceContainer';

// Service Classes (for injection)
export { CatalystService } from './CatalystService';
export { ChatService } from './ChatService';
export { AnalyticsService } from './AnalyticsService';
export { DiscoveryService } from './DiscoveryService';

// Legacy Singleton Exports (Deprecated - use DI container instead)
// Note: discoveryService, catalystService, and chatService singletons removed - use DI container