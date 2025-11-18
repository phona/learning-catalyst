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




import type {
  AnalyticsAPI,
  SessionsAPI,
  ChatAPI,
  AgentsAPI,
  KnowledgeAPI
} from '@/shared/types/electron-api';

/**
 * Unified interface for all electronAPI calls
 */
export interface ElectronAPIClient {
  analytics: AnalyticsAPI;
  sessions: SessionsAPI;
  chat: ChatAPI;
  agents: AgentsAPI;
  knowledge: KnowledgeAPI;
}

/**
 * Create the default electronAPI client implementation
 */
export function createElectronAPIClient(): ElectronAPIClient {
  // Check if electronAPI is available
  if (!window.electronAPI) {
    console.warn('Electron API not available. Using mock client for browser environment.');
    return createMockElectronAPIClient();
  }

  // Return the API interfaces directly from window.electronAPI
  return {
    analytics: window.electronAPI.analytics,
    sessions: window.electronAPI.sessions,
    chat: window.electronAPI.chat,
    agents: window.electronAPI.agents,
    knowledge: window.electronAPI.knowledge,
  };
}

/**
 * Create a mock electronAPI client implementation for testing
 */
export function createMockElectronAPIClient(): ElectronAPIClient {
  // Note: These are vi.fn() which would be imported in test files
  // We'll export the factory function and let test files import vi
  return createElectronAPIClientWith({
    analytics: {
      getDashboard: () => Promise.resolve({ success: true, data: {} }),
      getProgressChart: () => Promise.resolve({ success: true, data: {} }),
      getAchievements: () => Promise.resolve({ success: true, data: [] }),
      trackSession: () => Promise.resolve({ success: true, data: 'test-session-id' }),
      getConceptProgress: () => Promise.resolve({ success: true, data: {} }),
      updateConceptProgress: () => Promise.resolve({ success: true }),
      getSessionHistory: () => Promise.resolve({ success: true, data: [] }),
      getLearningTrends: () => Promise.resolve({ success: true, data: {} }),
      getStudyStreak: () => Promise.resolve({ success: true, data: {} }),
      getTimeStats: () => Promise.resolve({ success: true, data: {} }),
      exportData: () => Promise.resolve({ success: true, data: '{}' }),
      importData: () => Promise.resolve({ success: true }),
    },
    sessions: {
      saveSessionWithMessages: () => Promise.resolve({ success: true, sessionId: 'test-session-id' }),
      saveMessage: () => Promise.resolve({ success: true }),
      updateTitle: () => Promise.resolve({ success: true }),
      getRecentSessions: () => Promise.resolve({ success: true, sessions: [] }),
      getStatistics: () => Promise.resolve({ 
        success: true, 
        statistics: {
          totalSessions: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokensUsed: 0,
          averageMessagesPerSession: 0
        }
      }),
      list: () => Promise.resolve({ success: true, sessions: [], total: 0, hasMore: false }),
    },
    chat: {
      send: () => Promise.resolve({ success: true, messageId: 'test-message-id' }),
      sendStream: () => Promise.resolve({}),
      getSession: () => Promise.resolve({ success: true, session: {}, messages: [] }),
      getStatus: () => Promise.resolve({ success: true, isTyping: false }),
    },
    agents: {
      list: () => Promise.resolve({ success: true, agents: [] }),
      get: () => Promise.resolve({ success: true, agent: {} as any }),
      select: () => Promise.resolve({ success: true }),
      getStatus: () => Promise.resolve({ success: true, isOnline: true, isProcessing: false }),
    },
    knowledge: {
      parseConcepts: () => Promise.resolve({ 
        success: true, 
        concepts: [], 
        relationships: [], 
        statistics: { totalConcepts: 0, extractedFiles: 0, processingTime: 0 },
        errors: []
      }),
    },
  });
}

/**
 * Create an electronAPI client with the provided implementation
 */
export function createElectronAPIClientWith(
  implementation: {
    analytics: AnalyticsAPI;
    sessions: SessionsAPI;
    chat: ChatAPI;
    agents: AgentsAPI;
    knowledge: KnowledgeAPI;
  }
): ElectronAPIClient {
  return implementation;
}