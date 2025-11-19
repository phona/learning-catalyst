
/**
 * Test utilities for chat store - Clean dependency injection
 * No global state, no test flags, pure dependency injection
 */

import { vi } from 'vitest';
import type { SessionService } from '../../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';
import type { ChatStoreDependencies } from '../chatStore';
import { createChatStore } from '../chatStore';

// Mock implementations for testing
export function createMockSessionService(): SessionService {
  return {
    saveSessionWithMessages: vi.fn().mockResolvedValue('test-session-id'),
    getRecentSessions: vi.fn().mockResolvedValue([]),
    getGlobalStatistics: vi.fn().mockResolvedValue({
      totalSessions: 0,
      totalMessages: 0,
      totalConcepts: 0,
      averageSessionLength: 0,
    }),
    listSessions: vi.fn().mockResolvedValue({
      success: true,
      sessions: [],
      total: 0,
      hasMore: false,
    }),
    generateAITitle: vi.fn().mockResolvedValue('AI Title for test content'),
    generateSessionId: vi.fn().mockReturnValue(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
    saveMessage: vi.fn().mockResolvedValue(undefined),
    updateSessionTitle: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockElectronAPI(): { chat: ChatAPI; sessions: SessionsAPI } {
  return {
    chat: {
      startConversation: vi.fn().mockResolvedValue({
        id: 'test-conversation-id',
        title: 'Test Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sendMessage: vi.fn().mockResolvedValue({
        id: 'test-message-id',
        role: 'assistant' as const,
        content: 'Mock response',
        timestamp: new Date().toISOString(),
        status: 'delivered' as const,
      }),
      sendMessageStream: vi.fn().mockImplementation(async function* ({ message }) {
        yield `Mock streaming response to: ${message}`;
      }),
      getConversationHistory: vi.fn().mockResolvedValue({
        messages: [],
        totalMessages: 0,
      }),
    },
    sessions: {
      createSession: vi.fn().mockImplementation(async ({ title }) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          sessionId,
          session: {
            id: sessionId,
            title: title || 'Test Session',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        };
      }),
      getSession: vi.fn().mockResolvedValue({
        success: true,
        session: {
          id: 'test-session-id',
          title: 'Test Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      }),
      updateSession: vi.fn().mockResolvedValue({
        success: true,
      }),
      deleteSession: vi.fn().mockResolvedValue({
        success: true,
      }),
      listSessions: vi.fn().mockResolvedValue({
        success: true,
        sessions: [],
        total: 0,
        hasMore: false,
      }),
      searchSessions: vi.fn().mockResolvedValue({
        success: true,
        results: [],
        total: 0,
      }),
    },
  };
}

// Test factory function
export function createTestChatStore(overrides?: Partial<ChatStoreDependencies>) {
  const defaultDeps: ChatStoreDependencies = {
    sessionService: createMockSessionService(),
    electronAPI: createMockElectronAPI(),
  };

  return createChatStore({ ...defaultDeps, ...overrides });
}

// Test helper hook
export function useTestChatStore(overrides?: Partial<ChatStoreDependencies>) {
  return createTestChatStore(overrides);
}

// Pre-configured test scenarios
export const testScenarios = {
  withError: (error: string) => createTestChatStore({
    sessionService: {
      ...createMockSessionService(),
      saveSessionWithMessages: async () => { throw new Error(error); },
    },
  }),

  withEmptyHistory: () => createTestChatStore({
    electronAPI: {
      ...createMockElectronAPI(),
      sessions: {
        ...createMockElectronAPI().sessions,
        getSession: async () => ({
          success: true,
          session: {
            id: 'test-session-id',
            title: 'Test Session',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        }),
      },
    },
  }),

  withPreloadedMessages: (messages: any[]) => {
    const store = createTestChatStore({
      electronAPI: {
        ...createMockElectronAPI(),
        sessions: {
          ...createMockElectronAPI().sessions,
          getSession: vi.fn().mockResolvedValue({
            success: true,
            session: {
              id: 'test-session-id',
              title: 'Test Session',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages,
            },
          }),
        },
      },
    });

    // Initialize the store with the preloaded messages
    store.getState().setCurrentSession('test-session-id');
    messages.forEach((message: any) => {
      store.getState().addMessage(message);
    });

    return store;
  },
};