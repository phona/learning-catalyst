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

// Legacy Services (for compatibility during migration)
export { catalystService } from './CatalystService';
export { chatService } from './ChatService';
export { discoveryService } from './DiscoveryService';