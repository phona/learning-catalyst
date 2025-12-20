/**
 * Test utilities for chat store - Clean dependency injection
 * No global state, no test flags, pure dependency injection
 */

import type { SessionService } from '../../services/session/session-service';
import type { SessionsAPI } from '@/shared/types/electron-api';
import type { APIResponse } from '@/shared/types/electron-api/base';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type { ChatStoreDependencies } from '../chat/chatStore';
import { createChatStore } from '../chat/chatStore';

const makeSessionDisplay = (overrides: Partial<SessionDisplay> = {}): SessionDisplay => ({
  id: 'test-session-id',
  title: 'Test Session',
  topic: 'Test Topic',
  difficulty: 'beginner',
  status: 'active',
  progress: 0,
  agent: { type: 'learning', name: 'Test Agent' },
  lastActivity: new Date().toISOString(),
  duration: '0 min',
  ...overrides,
});

const successResponse = <T,>(data: T): APIResponse<T> => ({ success: true, data });

// Mock implementations for testing
export function createMockSessionService(): SessionService {
  return {
    getRecentSessions: async () => [],
    getGlobalStatistics: async () => ({
      totalSessions: 0,
      totalMessages: 0,
      totalUserMessages: 0,
      totalAssistantMessages: 0,
      totalTokensUsed: 0,
      averageMessagesPerSession: 0,
    }),
    listSessions: async () => ({ sessions: [], total: 0, hasMore: false }),
    getSession: async () => null,
    generateAITitle: async (content: string, _provider?: string, _model?: string) =>
      `AI Title for: ${content}`,
    generateSessionId: () => 'generated-id',
    updateSessionTitle: async () => undefined,
    createSession: async (payload) =>
      makeSessionDisplay({
        id: 'test-session-id',
        title: payload.title ?? 'Test Session',
        topic: payload.title ?? 'Test Topic',
      }),
    deleteSession: async () => undefined,
    searchSessions: async () => ({ sessions: [], total: 0, hasMore: false }),
  };
}

export function createMockElectronAPI(): { sessions: SessionsAPI } {
  const baseSession = (): SessionDisplay => ({
    ...makeSessionDisplay(),
  });

  return {
    sessions: {
      create: async (payload) =>
        successResponse<{ sessionId: string; session?: SessionDisplay }>({
          sessionId: payload.threadId ?? 'test-session-id',
          session: {
            ...baseSession(),
            id: payload.threadId ?? 'test-session-id',
            title: payload.title ?? 'Test Session',
            topic: payload.title ?? 'Test Topic',
          },
        }),
      get: async (sessionId: string) =>
        successResponse<SessionDisplay | undefined>({ ...baseSession(), id: sessionId }),
      update: async () => successResponse<SessionDisplay | undefined>(undefined),
      delete: async () => successResponse({ deleted: true }),
      updateTitle: async () => successResponse<void>(undefined),
      list: async () =>
        successResponse({
          sessions: [],
          total: 0,
          hasMore: false,
        }),
      getRecentSessions: async () => successResponse<SessionDisplay[]>([]),
      search: async () =>
        successResponse({
          sessions: [],
          total: 0,
          hasMore: false,
        }),
      getStatistics: async () =>
        successResponse({
          totalSessions: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokensUsed: 0,
          averageMessagesPerSession: 0,
        }),
    },
  };
}

// Test factory function
export function createTestChatStore(
  overrides?: Partial<ChatStoreDependencies>,
): ReturnType<typeof createChatStore> {
  const defaultDeps: ChatStoreDependencies = {
    electronAPI: createMockElectronAPI(),
  };

  return createChatStore({ ...defaultDeps, ...overrides });
}

// Test helper hook
export function useTestChatStore(
  overrides?: Partial<ChatStoreDependencies>,
): ReturnType<typeof createChatStore> {
  return createTestChatStore(overrides);
}

// Pre-configured test scenarios
export const testScenarios = {
  withError: (error: string): ReturnType<typeof createTestChatStore> =>
    createTestChatStore({
      electronAPI: {
        ...createMockElectronAPI(),
        sessions: {
          ...createMockElectronAPI().sessions,
          get: async () => {
            throw new Error(error);
          },
        },
      },
    }),

  withEmptyHistory: (): ReturnType<typeof createTestChatStore> =>
    createTestChatStore({
      electronAPI: {
        ...createMockElectronAPI(),
        sessions: {
          ...createMockElectronAPI().sessions,
          get: async () => successResponse<SessionDisplay>(makeSessionDisplay()),
        },
      },
    }),

  withPreloadedMessages: (messages: unknown[]): ReturnType<typeof createTestChatStore> =>
    createTestChatStore({
      electronAPI: {
        ...createMockElectronAPI(),
        sessions: {
          ...createMockElectronAPI().sessions,
          get: async () =>
            successResponse<SessionDisplay>({
              ...makeSessionDisplay(),
              messages,
            } as SessionDisplay),
        },
      },
    }),
};
