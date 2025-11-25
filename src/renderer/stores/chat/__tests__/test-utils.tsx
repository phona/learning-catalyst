/**
 * Test utilities for chat store - Clean dependency injection
 * No global state, no test flags, pure dependency injection
 */

import { vi } from 'vitest';
import type { SessionService } from '../../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { ChatStoreDependencies } from '../chatStore';
import { createChatStore } from '../chatStore';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import type { Message, StreamChunk } from '@/shared/types/ai';

const makeSessionDisplay = (): SessionDisplay => ({
  id: 'test-session-id',
  title: 'Test Session',
  topic: 'Test Topic',
  difficulty: 'beginner',
  status: 'active',
  progress: 0,
  agent: { type: 'learning', name: 'Test Agent' },
  lastActivity: new Date().toISOString(),
  duration: '0 min',
});

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
    listSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, hasMore: false }),
    getSession: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({
      id: 'test-session-id',
      title: 'Test Session',
      topic: 'Test Topic',
      difficulty: 'beginner',
      status: 'active',
      progress: 0,
      agent: { type: 'learning', name: 'Test Agent' },
      lastActivity: new Date().toISOString(),
      duration: '0 min',
    }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    searchSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, hasMore: false }),
    generateAITitle: vi.fn().mockResolvedValue('AI Title for test content'),
    generateSessionId: vi
      .fn()
      .mockReturnValue(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
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
        },
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
          },
        },
      }),
      sendMessageStream: vi.fn().mockResolvedValue({
        success: true,
        data: async function* ({ message }: { message: string }) {
          yield `Mock streaming response to: ${message}`;
        } as any,
      }),
      getConversationHistory: vi.fn().mockResolvedValue({
        success: true,
        data: {
          messages: [],
          totalMessages: 0,
        },
      }),
      getTypingIndicator: vi.fn().mockResolvedValue({
        success: true,
        data: { isTyping: false, agentInfo: { name: 'Mock', avatar: '', color: '' } },
      } as any),
      pauseConversation: vi
        .fn()
        .mockResolvedValue({ success: true, data: { message: 'paused' } } as any),
      resumeConversation: vi
        .fn()
        .mockResolvedValue({ success: true, data: { context: {} } } as any),
      endConversation: vi.fn().mockResolvedValue({ success: true, data: { summary: '' } } as any),
      checkPracticeOpportunity: vi
        .fn()
        .mockResolvedValue({ success: true, data: { hasOpportunity: false } } as any),
      getPracticeSuggestion: vi
        .fn()
        .mockResolvedValue({ success: true, data: { suggestion: 'practice' } } as any),
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
          },
        };
      }),
      get: vi.fn().mockImplementation(async (sessionId: string) => ({
        success: true,
        data: {
          id: sessionId,
          title: 'Test Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      })),
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { sessions: [], total: 0, hasMore: false },
      } as any),
      getRecentSessions: vi.fn().mockResolvedValue({ success: true, data: [] } as any),
      saveSessionWithMessages: vi
        .fn()
        .mockResolvedValue({ success: true, data: { sessionId: 'test-session-id' } } as any),
      update: vi.fn().mockResolvedValue({ success: true, data: undefined } as any),
      saveMessage: vi.fn().mockResolvedValue({ success: true } as any),
      updateTitle: vi.fn().mockResolvedValue({ success: true } as any),
      search: vi.fn().mockResolvedValue({
        success: true,
        data: { sessions: [], total: 0, query: '', hasMore: false },
      } as any),
      delete: vi.fn().mockResolvedValue({ success: true, data: { deleted: true } } as any),
      getStatistics: vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalSessions: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokensUsed: 0,
          averageMessagesPerSession: 0,
        },
      } as any),
    },
  };
}

export function createMockChatService(electron: { chat: ChatAPI; sessions: SessionsAPI }): ChatService {
  return {
    sendMessage: async (
      content: string,
      options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
    ): Promise<Message> => {
      const sessionId = options?.sessionId ?? 'test-session-id';
      const response = await electron.chat.sendMessage({
        conversationId: sessionId,
        message: content,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to send message');
      }
      const data = response.data as any;
      return {
        id: data.id ?? `assistant_${Date.now()}`,
        role: (data.role as Message['role']) ?? 'assistant',
        content: data.content ?? '',
        timestamp: new Date(data.timestamp ?? Date.now()),
        provider: sessionId,
      };
    },
    sendMessageStream: async (
      content: string,
      onChunk: (chunk: StreamChunk) => void,
      options?: { sessionId?: string; agentId?: string; provider?: string; model?: string },
    ): Promise<Message> => {
      const sessionId = options?.sessionId ?? 'test-session-id';
      const started = await electron.chat.sendMessageStream(
        { conversationId: sessionId, message: content },
        (evt: any) => {
          if (evt?.type === 'chunk') {
            const part = String(evt.chunk ?? '');
            onChunk({ content: part });
          }
        },
      );
      let aggregated = '';
      const data = (started as any)?.data;
      const isAsyncIterable = data && typeof data[Symbol.asyncIterator] === 'function';
      if (isAsyncIterable) {
        for await (const chunk of data as AsyncIterable<string>) {
          const part = String(chunk ?? '');
          aggregated += part;
          onChunk({ content: part });
        }
      }
      if (!aggregated) {
        aggregated = 'Mock streaming response';
      }
      return {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: aggregated,
        timestamp: new Date(),
        provider: sessionId,
      };
    },
    checkPracticeOpportunity: async () => ({ hasOpportunity: false, reason: '', suggestions: [] } as any),
  };
}

// Test factory function
export function createTestChatStore(overrides?: Partial<ChatStoreDependencies>) {
  const defaultDeps: ChatStoreDependencies = {
    sessionService: createMockSessionService(),
    electronAPI: createMockElectronAPI(),
    chatService: createMockChatService(createMockElectronAPI()),
  };

  return createChatStore({ ...defaultDeps, ...overrides });
}

// Test helper hook
export function useTestChatStore(overrides?: Partial<ChatStoreDependencies>) {
  return createTestChatStore(overrides);
}

// Pre-configured test scenarios
export const testScenarios = {
  withError: (error: string) =>
    createTestChatStore({
      sessionService: {
        ...createMockSessionService(),
        saveSessionWithMessages: async () => {
          throw new Error(error);
        },
      },
    }),

  withEmptyHistory: () =>
    createTestChatStore({
      electronAPI: {
        ...createMockElectronAPI(),
        sessions: {
          ...createMockElectronAPI().sessions,
          get: async () => ({
            success: true,
            data: makeSessionDisplay(),
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
            data: { ...makeSessionDisplay(), messages } as SessionDisplay,
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
