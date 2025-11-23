/**
 * Simplified Chat Store Tests
 *
 * Tests for the chat store using clean dependency injection pattern.
 * No global state, no test flags, pure factory approach.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { act } from '@testing-library/react';
import type { MessageDisplay } from '@/renderer/types/message';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import factory and test utilities
import { createChatStore } from '@/renderer/stores/chat/chatStore';
import {
  createMockSessionService,
  createMockElectronAPI,
} from '@/renderer/stores/chat/__tests__/test-utils';

describe('Simplified Chat Store', () => {
  let mockSessionService: ReturnType<typeof createMockSessionService>;
  let mockElectronAPI: ReturnType<typeof createMockElectronAPI>;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let store: ReturnType<typeof createChatStore>;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionService = createMockSessionService();
    mockElectronAPI = createMockElectronAPI();
    store = createChatStore({
      sessionService: mockSessionService,
      electronAPI: mockElectronAPI,
    });
  });

  describe('createNewSession', () => {
    it('should create a session with consistent ID format', async () => {
      const sessionId = await store.getState().createNewSession();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should generate unique session IDs', async () => {
      const sessionId1 = await store.getState().createNewSession();
      const sessionId2 = await store.getState().createNewSession();
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('saveCurrentSession', () => {
    it('should save session idempotently', async () => {
      // First create a session
      await store.getState().createNewSession();

      // Save the session twice - should not throw
      await act(async () => {
        await store.getState().saveCurrentSession();
      });

      await act(async () => {
        await store.getState().saveCurrentSession();
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockSessionService.saveSessionWithMessages).toHaveBeenCalledTimes(2);
    });

    it('should save current session with messages', async () => {
      // Create session and add messages
      const sessionId = await store.getState().createNewSession();

      const testMessage: MessageDisplay = {
        id: 'test-message',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date(),
        status: 'delivered',
        showThinking: false,
      };

      store.getState().addMessage(testMessage);

      await act(async () => {
        const result = await store.getState().saveCurrentSession();
        expect(result.success).toBe(true);
      });

      const callArgs =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (mockSessionService.saveSessionWithMessages as any).mock.calls[0] ?? [];
      const [savedSession, savedMessages] = callArgs as [unknown, unknown[]];

      expect((savedSession as { id: string }).id).toBe(sessionId);
      expect(Array.isArray(savedMessages)).toBe(true);
      expect((savedMessages as Array<Record<string, unknown>>)[0]).toMatchObject({
        id: testMessage.id,
        role: testMessage.role,
        content: testMessage.content,
      });
      expect((savedMessages as Array<Record<string, unknown>>)[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('addMessage', () => {
    it('should save messages for sessions with IDs', () => {
      const sessionId = 'test-session-123';
      store.getState().setCurrentSession(sessionId);

      const testMessage: MessageDisplay = {
        id: 'test-message',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
        status: 'delivered',
        showThinking: false,
      };

      expect(() => {
        store.getState().addMessage(testMessage);
      }).not.toThrow();

      const state = store.getState();
      expect(state.messages).toHaveLength(1);
      const savedMessage = state.messages[0];
      expect(savedMessage.id).toBe(testMessage.id);
      expect(savedMessage.role).toBe(testMessage.role);
      expect(savedMessage.content).toBe(testMessage.content);
      expect((savedMessage as any).status).toBe('delivered');
      expect(savedMessage.showThinking).toBe(testMessage.showThinking);
    });

    it('should trigger AI title generation on first assistant message', async () => {
      const sessionId = 'test-session-123';
      store.getState().setCurrentSession(sessionId);

      // Add user message first
      const userMessage: MessageDisplay = {
        id: 'user-msg',
        role: 'user',
        content: 'What is React?',
        timestamp: new Date(),
        status: 'delivered',
        showThinking: false,
      };

      store.getState().addMessage(userMessage);

      // Add first assistant message
      const assistantMessage: MessageDisplay = {
        id: 'assistant-msg',
        role: 'assistant',
        content: 'React is a JavaScript library',
        timestamp: new Date(),
        status: 'delivered',
        showThinking: false,
      };

      store.getState().addMessage(assistantMessage);

      // Wait for async title generation
      await new Promise((resolve) => setTimeout(resolve, 600));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockSessionService.generateAITitle).toHaveBeenCalledWith(
        'What is React?',
        'default-provider',
        'default-model',
      );
    });
  });

  describe('Idempotent Operations', () => {
    it('should handle save operations consistently', async () => {
      // Create a predetermined session ID
      const testSessionId = 'session_test123';
      store.getState().setCurrentSession(testSessionId);

      // Mock electronAPI to return our predetermined session
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (mockElectronAPI.sessions.get as any).mockResolvedValue({
        success: true,
        data: {
          id: testSessionId,
          title: 'Test Session',
          createdAt: new Date(),
          messages: [],
        },
      });

      await act(async () => {
        await store.getState().setCurrentSession(testSessionId);
      });

      expect(mockElectronAPI.sessions.get).toHaveBeenCalledWith(testSessionId);

      const state = store.getState();
      expect(state.currentSessionId).toBe(testSessionId);
    });
  });

  describe('Message Operations', () => {
    it('should handle streaming message lifecycle', () => {
      const messageId = 'streaming-msg-123';

      // Start streaming
      store.getState().startStreamingMessage(messageId);
      expect(store.getState().streamingMessageId).toBe(messageId);
      expect(store.getState().isTyping).toBe(true);

      // Append content
      store.getState().appendStreamingContent('Hello ');
      expect(store.getState().streamingContent).toBe('Hello ');

      // Append more content
      store.getState().appendStreamingContent('world!');
      expect(store.getState().streamingContent).toBe('Hello world!');

      // Finish streaming
      store.getState().finishStreamingMessage('Hello world!');
      expect(store.getState().streamingMessageId).toBeNull();
      expect(store.getState().streamingContent).toBe('');
      expect(store.getState().isTyping).toBe(false);
    });

    it('should update message content correctly', () => {
      const messageId = 'update-test-123';
      const originalMessage: MessageDisplay = {
        id: messageId,
        role: 'user',
        content: 'Original content',
        timestamp: new Date(),
        status: 'delivered',
      };

      store.getState().addMessage(originalMessage);

      // Update the message
      store
        .getState()
        .updateMessage(messageId, { content: 'Updated content', status: 'edited' } as any);

      const state = store.getState();
      const updatedMessage = state.messages.find((msg) => msg.id === messageId);
      expect(updatedMessage?.content).toBe('Updated content');
      expect((updatedMessage as any)?.status).toBe('edited');
    });

    it('should remove messages correctly', () => {
      const messageId1 = 'remove-test-1';
      const messageId2 = 'remove-test-2';

      const message1: MessageDisplay = {
        id: messageId1,
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
        status: 'delivered',
      };

      const message2: MessageDisplay = {
        id: messageId2,
        role: 'assistant',
        content: 'Message 2',
        timestamp: new Date(),
        status: 'delivered',
      };

      store.getState().addMessage(message1);
      store.getState().addMessage(message2);
      expect(store.getState().messages).toHaveLength(2);

      // Remove first message
      store.getState().removeMessage(messageId1);
      expect(store.getState().messages).toHaveLength(1);
      expect(store.getState().messages[0].id).toBe(messageId2);
    });

    it('should clear all messages', () => {
      const message1: MessageDisplay = {
        id: 'clear-test-1',
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
        status: 'delivered',
      };

      const message2: MessageDisplay = {
        id: 'clear-test-2',
        role: 'assistant',
        content: 'Message 2',
        timestamp: new Date(),
        status: 'delivered',
      };

      store.getState().addMessage(message1);
      store.getState().addMessage(message2);
      expect(store.getState().messages).toHaveLength(2);

      // Clear all messages
      store.getState().clearMessages();
      expect(store.getState().messages).toHaveLength(0);
    });
  });

  describe('State Management', () => {
    it('should manage loading state correctly', () => {
      expect(store.getState().isLoading).toBe(false);

      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);

      store.getState().setLoading(false);
      expect(store.getState().isLoading).toBe(false);
    });

    it('should manage error state correctly', () => {
      expect(store.getState().error).toBeNull();

      store.getState().setError('Test error');
      expect(store.getState().error).toBe('Test error');

      store.getState().setError(null);
      expect(store.getState().error).toBeNull();
    });

    it('should manage typing state correctly', () => {
      expect(store.getState().isTyping).toBe(false);

      store.getState().setTyping(true);
      expect(store.getState().isTyping).toBe(true);

      store.getState().setTyping(false);
      expect(store.getState().isTyping).toBe(false);
    });
  });
});
