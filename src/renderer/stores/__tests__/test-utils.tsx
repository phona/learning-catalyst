/**
 * Test utilities for chat store - Clean dependency injection
 * No global state, no test flags, pure dependency injection
 */

import type { SessionService } from '../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';
import type { APIResponse } from '@/shared/types/electron-api';
import type { SessionDisplay } from '@/shared/types/electron-api/learning-api';
import type {
  ConversationDisplay,
  MessageDisplay,
  ConversationContext,
  ConversationSummary,
} from '@/shared/types/electron-api/chat-api';
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
    saveSessionWithMessages: async () => 'test-session-id',
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
    saveMessage: async () => undefined,
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

export function createMockElectronAPI(): { chat: ChatAPI; sessions: SessionsAPI } {
  const baseConversation = (): ConversationDisplay => ({
    id: 'test-conversation-id',
    agent: {
      id: 'agent-1',
      type: 'learning',
      name: 'Test Agent',
      avatar: '',
      color: '#000',
      capabilities: ['chat'],
      isAvailable: true,
      category: 'general',
    },
    status: 'active',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    suggestedTopics: [],
    metadata: {
      totalMessages: 0,
      duration: '0 min',
      lastActivity: 'just now',
    },
  });

  const baseSession = (): SessionDisplay => ({
    ...makeSessionDisplay(),
  });

  return {
    chat: {
      startConversation: async () => successResponse(baseConversation()),
      sendMessage: async ({ message }) =>
        successResponse<MessageDisplay>({
          id: 'test-message-id',
          role: 'assistant',
          content: `Mock response to: ${message}`,
          timestamp: new Date().toISOString(),
          status: 'sent',
          conversationId: 'test-conversation-id',
          relativeTime: 'just now',
        }),
      sendMessageStream: async ({ message }) =>
        successResponse<AsyncIterable<string>>(
          (async function* stream() {
            yield `Mock streaming response to: ${message}`;
          })(),
        ),
      getConversationHistory: async () =>
        successResponse({
          messages: [],
          totalMessages: 0,
          conversationId: 'test-conversation-id',
          pagination: { hasMore: false, total: 0 },
        }),
      getTypingIndicator: async () =>
        successResponse({ isTyping: false, agentInfo: baseConversation().agent }),
      pauseConversation: async () => successResponse({ message: 'paused' }),
      resumeConversation: async () =>
        successResponse<ConversationContext>({
          conversationId: 'test-conversation-id',
          lastMessage: {
            id: 'last-msg',
            conversationId: 'test-conversation-id',
            role: 'assistant',
            content: 'Last message',
            status: 'completed',
            timestamp: new Date().toISOString(),
            relativeTime: 'just now',
          },
          agentState: {
            currentTopic: 'testing',
            contextPoints: [],
            userPreferences: {},
          },
          suggestedReopenings: [],
        }),
      endConversation: async () =>
        successResponse<ConversationSummary>({
          conversationId: 'test-conversation-id',
          summary: 'Test summary',
          keyTopics: ['testing'],
          duration: '0 min',
          messageCount: 0,
          suggestedFollowUps: [],
        }),
      checkPracticeOpportunity: async () =>
        successResponse({
          hasOpportunity: false,
          shouldSuggest: false,
          reason: 'mock',
          timing: 'not-appropriate' as const,
          confidence: 0,
        }),
      getPracticeSuggestion: async () =>
        successResponse({
          id: 'suggestion-1',
          type: 'gentle-nudge',
          introduction: 'Try a quick practice',
          challenge: 'Summarize what you learned.',
          context: 'general',
          estimatedTime: 1,
          difficulty: 'easy',
          vibe: 'understanding',
          timing: { when: 'right now', urgency: 'low' },
          expectedBenefit: 'reinforcement',
          requiredEffort: 'low',
          options: {
            accept: 'Sure, let’s do it',
            decline: 'Maybe later',
            postpone: 'Remind me in a bit',
          },
          metadata: {
            concept: 'testing',
            relatedTopics: [],
            prerequisites: [],
            nextSteps: [],
          },
        }),
    },
    sessions: {
      create: async ({ title }: { title?: string }) =>
        successResponse<{ sessionId: string; session?: SessionDisplay }>({
          sessionId: 'test-session-id',
          session: { ...baseSession(), title: title ?? 'Test Session', topic: title ?? 'Test Topic' },
        }),
      get: async (sessionId: string) => successResponse<SessionDisplay | undefined>({ ...baseSession(), id: sessionId }),
      update: async () => successResponse<SessionDisplay | undefined>(undefined),
      delete: async () => successResponse({ deleted: true }),
      saveMessage: async () => successResponse<void>(undefined),
      saveSessionWithMessages: async () =>
        successResponse<{ sessionId: string }>({ sessionId: 'test-session-id' }),
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
    sessionService: createMockSessionService(),
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
      sessionService: {
        ...createMockSessionService(),
        createSession: async () => {
          throw new Error(error);
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
            successResponse<SessionDisplay>(
              { ...makeSessionDisplay(), messages } as SessionDisplay,
            ),
        },
      },
    }),
};
