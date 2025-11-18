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




/**
 * Test utilities for chat store - Clean dependency injection
 * No global state, no test flags, pure dependency injection
 */

import type { SessionService } from '../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';
import type { ChatStoreDependencies } from '../chat/chatStore';
import { createChatStore } from '../chat/chatStore';

// Mock implementations for testing
export function createMockSessionService(): SessionService {
  return {
    createNewSession: async () => 'test-session-id',
    saveSessionWithMessages: async () => undefined,
    generateAITitle: async (content: string, _provider: string, _model: string) => `AI Title for: ${content}`,
    updateSessionTitle: async () => undefined,
    saveMessage: async () => undefined,
  };
}

export function createMockElectronAPI(): { chat: ChatAPI; sessions: SessionsAPI } {
  return {
    chat: {
      startConversation: async () => ({
        id: 'test-conversation-id',
        title: 'Test Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      sendMessage: async ({ message }) => ({
        id: 'test-message-id',
        role: 'assistant' as const,
        content: `Mock response to: ${message}`,
        timestamp: new Date().toISOString(),
        status: 'delivered' as const,
      }),
      sendMessageStream: async function* ({ message }: { message: string }): AsyncGenerator<string> {
        yield `Mock streaming response to: ${message}`;
      },
      getConversationHistory: async () => ({
        messages: [],
        totalMessages: 0,
      }),
    },
    sessions: {
      createSession: async ({ title }: { title?: string }) => ({
        success: true,
        sessionId: 'test-session-id',
        session: {
          id: 'test-session-id',
          title: title ?? 'Test Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      }),
      getSession: async ({ sessionId }: { sessionId: string }) => ({
        success: true,
        session: {
          id: sessionId,
          title: 'Test Session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      }),
      updateSession: async () => ({
        success: true,
      }),
      deleteSession: async () => ({
        success: true,
      }),
      listSessions: async () => ({
        success: true,
        sessions: [],
        total: 0,
        hasMore: false,
      }),
      searchSessions: async () => ({
        success: true,
        results: [],
        total: 0,
      }),
    },
  };
}

// Test factory function
export function createTestChatStore(overrides?: Partial<ChatStoreDependencies>): ReturnType<typeof createChatStore> {
  const defaultDeps: ChatStoreDependencies = {
    sessionService: createMockSessionService(),
    electronAPI: createMockElectronAPI(),
  };

  return createChatStore({ ...defaultDeps, ...overrides });
}

// Test helper hook
export function useTestChatStore(overrides?: Partial<ChatStoreDependencies>): ReturnType<typeof createChatStore> {
  return createTestChatStore(overrides);
}

// Pre-configured test scenarios
export const testScenarios = {
  withError: (error: string): ReturnType<typeof createTestChatStore> => createTestChatStore({
    sessionService: {
      ...createMockSessionService(),
      createNewSession: async () => { throw new Error(error); },
    },
  }),

  withEmptyHistory: (): ReturnType<typeof createTestChatStore> => createTestChatStore({
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

  withPreloadedMessages: (messages: unknown[]): ReturnType<typeof createTestChatStore> => createTestChatStore({
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
            messages,
          },
        }),
      },
    },
  }),
};