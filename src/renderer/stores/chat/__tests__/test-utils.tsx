
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
      data: { sessions: [], total: 0, hasMore: false },
    } as any),
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
        success: true,
        data: {
          id: 'test-conversation-id',
          title: 'Test Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        data: {
          assistantMessage: {
            id: 'test-message-id',
            role: 'assistant' as const,
            content: 'Mock response',
            timestamp: new Date().toISOString(),
            status: 'delivered' as const,
          }
        }
      }),
      sendMessageStream: vi.fn().mockResolvedValue({
        success: true,
        data: (async function* ({ message }: { message: string }) {
          yield `Mock streaming response to: ${message}`;
        }) as any
      }),
      getConversationHistory: vi.fn().mockResolvedValue({
        success: true,
        data: {
          messages: [],
          totalMessages: 0,
        }
      }),
      getTypingIndicator: vi.fn().mockResolvedValue({ success: true, data: { isTyping: false, agentInfo: { name: 'Mock', avatar: '', color: '' } } } as any),
      pauseConversation: vi.fn().mockResolvedValue({ success: true, data: { message: 'paused' } } as any),
      resumeConversation: vi.fn().mockResolvedValue({ success: true, data: { context: {} } } as any),
      endConversation: vi.fn().mockResolvedValue({ success: true, data: { summary: '' } } as any),
      checkPracticeOpportunity: vi.fn().mockResolvedValue({ success: true, data: { hasOpportunity: false } } as any),
      getPracticeSuggestion: vi.fn().mockResolvedValue({ success: true, data: { suggestion: 'practice' } } as any),
    },
    sessions: {
      create: vi.fn().mockImplementation(async ({ title }) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          data: {
            sessionId,
            session: {
              id: sessionId,
              title: title || 'Test Session',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            },
          }
        };
      }),
      get: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'test-session-id',
          title: 'Test Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      }),
      list: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], total: 0, hasMore: false } } as any),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] } as any),
      saveSessionWithMessages: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'test-session-id' } } as any),
      saveMessage: vi.fn().mockResolvedValue({ success: true } as any),
      updateTitle: vi.fn().mockResolvedValue({ success: true } as any),
      search: vi.fn().mockResolvedValue({ success: true, data: { sessions: [], total: 0, query: '', hasMore: false } } as any),
      delete: vi.fn().mockResolvedValue({ success: true, data: { deleted: true } } as any),
      getStatistics: vi.fn().mockResolvedValue({ success: true, data: { totalSessions: 0, totalMessages: 0, totalUserMessages: 0, totalAssistantMessages: 0, totalTokensUsed: 0, averageMessagesPerSession: 0 } } as any),
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
        get: async () => ({
          success: true,
          data: {
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
          get: vi.fn().mockResolvedValue({
            success: true,
            data: {
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
