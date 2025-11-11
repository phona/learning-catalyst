/**
 * Simplified Chat Store Tests
 *
 * Tests for the simplified session management without persistenceState
 */

import { renderHook, act } from '@testing-library/react';
import type { Message } from '@/shared/types/ai';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock session service
const mockSessionService = {
  saveSessionWithMessages: vi.fn().mockResolvedValue('session_test123'),
  saveMessage: vi.fn().mockResolvedValue(undefined),
  generateAITitle: vi.fn().mockResolvedValue('AI Generated Title'),
  updateSessionTitle: vi.fn().mockResolvedValue(undefined),
};

// Mock AgentManager
const mockAgentManager = {
  getAgent: vi.fn().mockResolvedValue({
    stream: vi.fn().mockImplementation(async function* () {
      yield { content: 'Mock response' };
    })
  }),
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn()
};

let sessionServiceMock: typeof mockSessionService | null = mockSessionService;

// Mock the dependencies first
vi.mock('@/renderer/hooks/useAppServices', () => ({
  useAppServices: () => ({
    services: {
      sessionService: sessionServiceMock,
      agentManager: mockAgentManager
    }
  })
}));

vi.mock('@/renderer/stores/useConfigStore', () => ({
  useConfigStore: {
    getState: () => ({
      config: {
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-3.5-turbo'
            }
          }
        }
      }
    })
  }
}));

// Import after mocking
import { useChatStore, resetChatStoreCacheForTests } from '@/renderer/hooks/useChatStore';

// Mock window events
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: vi.fn(),
});

describe('Simplified Chat Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChatStoreCacheForTests();
    sessionServiceMock = mockSessionService;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createNewSession', () => {
    it('should create a session with consistent ID format', async () => {
      const { result } = renderHook(() => useChatStore());

      
      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createNewSession();
      });

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(result.current.currentSession?.id).toBe(sessionId);
      expect(result.current.currentSession?.title).toBe('Untitled Session');
      expect(result.current.messages).toEqual([]);
    });

    it('should generate unique session IDs', async () => {
      const { result } = renderHook(() => useChatStore());

      
      let sessionId1: string;
      let sessionId2: string;

      await act(async () => {
        sessionId1 = await result.current.createNewSession();
      });
      await act(async () => {
        sessionId2 = await result.current.createNewSession();
      });

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('saveCurrentSession', () => {
    it('should save session idempotently', async () => {
      const { result } = renderHook(() => useChatStore());

      
      // Create a new session
      await act(async () => {
        await result.current.createNewSession();
      });

      // Add some messages
      const userMessage: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        provider: 'openai',
      };

      const assistantMessage: Message = {
        id: 'msg2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
        provider: 'openai',
      };

      await act(async () => {
        result.current.addMessage(userMessage);
        result.current.addMessage(assistantMessage);
      });

      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      const initialCalls = mockSessionService.saveSessionWithMessages.mock.calls.length;

      // Save session (first time - should create/update)
      let saveResult1;
      await act(async () => {
        saveResult1 = await result.current.saveCurrentSession();
      });

      expect(saveResult1.success).toBe(true);
      expect(mockSessionService.saveSessionWithMessages).toHaveBeenCalledTimes(initialCalls + 1);

      // Save session again (should update - idempotent)
      let saveResult2;
      await act(async () => {
        saveResult2 = await result.current.saveCurrentSession();
      });

      expect(saveResult2.success).toBe(true);
      expect(mockSessionService.saveSessionWithMessages).toHaveBeenCalledTimes(initialCalls + 2);
    });

    it('should throw error when no session service is available', () => {
      sessionServiceMock = null;
      resetChatStoreCacheForTests();

      expect(() => renderHook(() => useChatStore())).toThrow('SessionService is required');
    });
  });

  describe('addMessage', () => {
    it('should save messages for sessions with IDs', async () => {
      const { result } = renderHook(() => useChatStore());

      
      // Create session with ID
      await act(async () => {
        await result.current.createNewSession();
      });

      const message: Message = {
        id: 'msg1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
        provider: 'openai',
      };

      await act(async () => {
        result.current.addMessage(message);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({ ...message, showThinking: false });
    });

    it('should trigger AI title generation on first assistant message', async () => {
      const { result } = renderHook(() => useChatStore());

      
      // Create session
      await act(async () => {
        await result.current.createNewSession();
      });

      const userMessage: Message = {
        id: 'msg1',
        role: 'user',
        content: 'What is React?',
        timestamp: new Date(),
        provider: 'openai',
      };

      const assistantMessage: Message = {
        id: 'msg2',
        role: 'assistant',
        content: 'React is a JavaScript library...',
        timestamp: new Date(),
        provider: 'openai',
      };

      // Add user message (should not trigger title generation)
      await act(async () => {
        result.current.addMessage(userMessage);
      });

      // Add first assistant message (should trigger title generation)
      await act(async () => {
        result.current.addMessage(assistantMessage);
      });

      await act(async () => {
        vi.advanceTimersByTime(600);
        await Promise.resolve();
      });

      expect(mockSessionService.generateAITitle).toHaveBeenCalledWith(
        'What is React?',
        expect.any(String), // selectedProvider
        expect.any(String)  // selectedModel
      );
    });
  });

  describe('Idempotent Operations', () => {
    it('should handle save operations consistently', async () => {
      const { result } = renderHook(() => useChatStore());

      
      // Create session
      await act(async () => {
        await result.current.createNewSession();
      });

      // Save multiple times
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          const saveResult = await result.current.saveCurrentSession();
          expect(saveResult.success).toBe(true);
        });
      }

      expect(result.current.currentSession?.id).toBe('session_test123');
      expect(mockSessionService.saveSessionWithMessages).toHaveBeenCalledTimes(3);
    });
  });
});
