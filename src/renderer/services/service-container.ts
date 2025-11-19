/**
 * Service Container
 *
 * Provides a centralized way to create and manage service instances
 * with explicit dependencies following the functional factory pattern
 */

import type { ElectronAPI } from '@/shared/types/electron-api';

import { createElectronAPIClient } from './api/electron-api-client';
import { createSessionService } from './session/session-service';
import { createChatService } from './chat/chat-service';
import { createAnalyticsService } from './analytics/analytics-service';
import { createFileService } from './file/file-service';

import type {
  SessionService,
  ChatService,
  AnalyticsService,
  FileService
} from './index';

/**
 * Service container interface
 */
export interface ServiceContainer {
  session: SessionService;
  chat: ChatService;
  analytics: AnalyticsService;
  file: FileService;
}

/**
 * Creates a service container with the given electronAPI client
 */
export function createServiceContainer(electronAPI: ElectronAPI): ServiceContainer {
  // Create the API client as the base dependency
  const apiClient = createElectronAPIClient(electronAPI);

  // Create services with explicit dependencies
  const session = createSessionService(apiClient);
  const chat = createChatService(apiClient);
  const analytics = createAnalyticsService(apiClient);
  const file = createFileService(electronAPI);

  return {
    session,
    chat,
    analytics,
    file
  };
}

/**
 * Creates a test service container with mock dependencies
 */
export function createTestServiceContainer(mockElectronAPI: Partial<ElectronAPI>): ServiceContainer {
  // Create a mock electronAPI for testing
  const fullMockAPI: ElectronAPI = {
    // Add required ElectronAPI methods with mocks
    chat: {
      sendMessage: async () => ({ success: true, response: 'Mock response' }),
      getHistory: async () => ({ success: true, messages: [] }),
      clearHistory: async () => ({ success: true })
    },
    session: {
      create: async () => ({ success: true, sessionId: 'mock-session-id' }),
      get: async () => ({ success: true, session: null }),
      getAll: async () => ({ success: true, sessions: [] }),
      delete: async () => ({ success: true }),
      update: async () => ({ success: true })
    },
    analytics: {
      getDashboard: async () => ({ success: true, data: {} }),
      getProgressChart: async () => ({ success: true, data: [] }),
      getAchievements: async () => ({ success: true, data: [] }),
      trackSession: async () => ({ success: true, data: 'mock-tracking-id' })
    },
    knowledge: {
      searchKnowledge: async () => ({ success: true, results: [] }),
      exploreConcept: async () => ({ success: true, concept: null }),
      parseConcepts: async () => ({ success: true, concepts: [] })
    },
    learning: {
      getLearningPath: async () => ({ success: true, path: [] })
    },
    ...mockElectronAPI
  };

  return createServiceContainer(fullMockAPI);
}

// Export the service factory functions for direct use
export {
  createSessionService,
  createChatService,
  createAnalyticsService,
  createFileService
};

// Export type definitions
export type {
  SessionService,
  ChatService,
  AnalyticsService,
  FileService
};