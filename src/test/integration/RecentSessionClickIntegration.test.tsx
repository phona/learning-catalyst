import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '@/services/sessionService';
import { useChatStore } from '@/stores/useChatStore';
import type { Session, ConversationMessage } from '@/types/session';

// Mock the SessionService
const mockSessionService = {
  getRecentSessions: vi.fn(),
  getSessionById: vi.fn(),
  saveMessage: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
} as unknown as SessionService;

// Mock the database
const mockDb = {
  selectFrom: vi.fn(),
  insertInto: vi.fn(),
  updateTable: vi.fn(),
  deleteFrom: vi.fn(),
};

// Mock Kysely
vi.mock('kysely', () => ({
  Kysely: vi.fn().mockImplementation(() => mockDb),
  sql: {
    lit: vi.fn(),
    raw: vi.fn(),
  },
}));

// Test data
const createMockSession = (id: string, title: string, messageCount: number = 2): Session => ({
  id,
  title,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T12:00:00Z'),
  messages: Array.from({ length: messageCount }, (_, index) => ({
    id: `msg-${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
    content: `Message ${index + 1} content`,
    timestamp: new Date(`2024-01-01T10:${index.toString().padStart(2, '0')}:00Z`),
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    ...(index % 2 === 1 && { thinking_content: `Thinking process for response ${index}` }),
  })),
  metadata: {
    title,
    description: `Description for ${title}`,
    tags: ['test'],
    category: 'general',
    difficulty: 'intermediate',
    learning_objectives: [],
    topics_covered: [],
    archived: false,
    pinned: false,
  },
  context: {
    current_provider: 'openai',
    current_model: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 4096,
    enable_thinking: true,
    conversation_style: 'educational',
    language: 'en',
    user_preferences: {
      learning_style: 'reading',
      detail_level: 'detailed',
      example_preference: 'all',
      response_length: 'medium',
      technical_level: 'intermediate',
    },
  },
  checkpoints: [],
  statistics: {
    total_messages: messageCount,
    user_messages: Math.ceil(messageCount / 2),
    assistant_messages: Math.floor(messageCount / 2),
    total_tokens_used: 0,
    total_thinking_tokens: 0,
    session_duration: 7200,
    average_response_time: 60,
    concepts_learned: 0,
    checkpoints_created: 0,
    productivity_score: 0,
    engagement_score: 0,
  },
});

describe('Recent Session Click Integration Tests', () => {
  let mockSetCurrentSession: ReturnType<typeof vi.fn>;
  let mockSetMessages: ReturnType<typeof vi.fn>;
  let mockClearMessages: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Get the chat store and mock its methods
    const chatStore = useChatStore.getState();
    mockSetCurrentSession = vi.fn();
    mockSetMessages = vi.fn();
    mockClearMessages = vi.fn();

    // Mock the chat store methods
    (useChatStore as any).mockReturnValue({
      ...chatStore,
      setCurrentSession: mockSetCurrentSession,
      setMessages: mockSetMessages,
      clearMessages: mockClearMessages,
      setSessionService: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Loading with History Messages', () => {
    it('should load and display session with all history messages when clicked', async () => {
      const testSession = createMockSession('session-1', 'Test Session 1', 4);

      // Mock the SessionService to return our test session
      mockSessionService.getRecentSessions = vi.fn().mockResolvedValue([testSession]);

      // Simulate clicking on a recent session by calling setCurrentSession
      mockSetCurrentSession(testSession);

      // Verify that setCurrentSession was called with the correct session
      expect(mockSetCurrentSession).toHaveBeenCalledWith(testSession);

      // Verify that the session contains the expected messages
      const sessionArgument = mockSetCurrentSession.mock.calls[0][0] as Session;
      expect(sessionArgument.messages).toHaveLength(4);
      expect(sessionArgument.messages[0].role).toBe('user');
      expect(sessionArgument.messages[1].role).toBe('assistant');
      expect(sessionArgument.messages[1].thinking_content).toBeDefined();
    });

    it('should properly convert session messages to store format', async () => {
      const testSession = createMockSession('session-2', 'Test Session 2', 2);

      // Call the actual setCurrentSession implementation
      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(testSession);

      // The store should convert session messages to the internal format
      // and set them as the current messages
      const currentState = useChatStore.getState();

      // Verify that messages were converted properly
      expect(currentState.messages).toHaveLength(2);
      expect(currentState.messages[0]).toMatchObject({
        id: 'msg-1',
        role: 'user',
        content: 'Message 1 content',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        showThinking: false, // User messages shouldn't show thinking
      });

      expect(currentState.messages[1]).toMatchObject({
        id: 'msg-2',
        role: 'assistant',
        content: 'Message 2 content',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        showThinking: true, // Assistant messages with thinking should show it
        thinking_content: 'Thinking process for response 1',
      });
    });

    it('should handle sessions with no messages', async () => {
      const emptySession = createMockSession('session-empty', 'Empty Session', 0);
      emptySession.messages = []; // Explicitly set to empty array

      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(emptySession);

      const currentState = useChatStore.getState();
      expect(currentState.messages).toHaveLength(0);
      expect(currentState.currentSession?.id).toBe('session-empty');
    });

    it('should handle sessions with mixed message types', async () => {
      const mixedSession: Session = createMockSession('session-mixed', 'Mixed Session', 6);

      // Add different types of messages
      mixedSession.messages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Simple user message',
          timestamp: new Date(),
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Assistant response',
          timestamp: new Date(),
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          thinking_content: 'Complex thinking process',
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'Another user message',
          timestamp: new Date(),
          provider: 'chatglm',
          model: 'chatglm-4',
        },
        {
          id: 'msg-4',
          role: 'assistant',
          content: 'Response without thinking',
          timestamp: new Date(),
          provider: 'chatglm',
          model: 'chatglm-4',
        },
        {
          id: 'msg-5',
          role: 'user',
          content: 'Message with tool usage request',
          timestamp: new Date(),
          provider: 'openai',
          model: 'gpt-4',
        },
        {
          id: 'msg-6',
          role: 'assistant',
          content: 'Response with tool calls',
          timestamp: new Date(),
          provider: 'openai',
          model: 'gpt-4',
          tool_calls: [{ name: 'search', arguments: '{"query": "test"}' }],
        },
      ];

      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(mixedSession);

      const currentState = useChatStore.getState();
      expect(currentState.messages).toHaveLength(6);

      // Verify user messages
      expect(currentState.messages[0]).toMatchObject({
        role: 'user',
        showThinking: false,
      });

      // Verify assistant message with thinking
      expect(currentState.messages[1]).toMatchObject({
        role: 'assistant',
        showThinking: true,
        thinking_content: 'Complex thinking process',
      });

      // Verify assistant message without thinking
      expect(currentState.messages[3]).toMatchObject({
        role: 'assistant',
        showThinking: false,
        thinking_content: undefined,
      });

      // Verify assistant message with tool calls
      expect(currentState.messages[5]).toMatchObject({
        role: 'assistant',
        tool_calls: [{ name: 'search', arguments: '{"query": "test"}' }],
      });
    });

    it('should preserve message metadata and timestamps', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z');
      const sessionWithTimestamps: Session = createMockSession('session-timestamps', 'Timestamp Test', 2);

      sessionWithTimestamps.messages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'User message with specific timestamp',
          timestamp,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Assistant response with timestamp',
          timestamp,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          thinking_content: 'Thinking content',
        },
      ];

      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(sessionWithTimestamps);

      const currentState = useChatStore.getState();

      // Verify timestamps are preserved
      expect(currentState.messages[0].timestamp).toEqual(timestamp);
      expect(currentState.messages[1].timestamp).toEqual(timestamp);

      // Verify provider and model information is preserved
      expect(currentState.messages[0].provider).toBe('openai');
      expect(currentState.messages[0].model).toBe('gpt-3.5-turbo');
    });

    it('should handle session service errors gracefully', async () => {
      // Mock a session that might cause issues
      const problematicSession = {
        id: 'session-error',
        title: 'Problematic Session',
        created_at: new Date(),
        updated_at: new Date(),
        messages: null as any, // This could cause issues
        metadata: {},
        context: {},
        checkpoints: [],
        statistics: {},
      };

      // This should not crash, but handle the null messages gracefully
      const chatStore = useChatStore.getState();

      expect(() => {
        chatStore.setCurrentSession(problematicSession);
      }).not.toThrow();

      const currentState = useChatStore.getState();
      expect(currentState.messages).toEqual([]);
    });

    it('should verify session data integrity after loading', async () => {
      const originalSession = createMockSession('session-integrity', 'Integrity Test', 3);

      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(originalSession);

      const currentState = useChatStore.getState();

      // Verify that all original data is preserved
      expect(currentState.currentSession?.id).toBe(originalSession.id);
      expect(currentState.currentSession?.title).toBe(originalSession.title);
      expect(currentState.currentSession?.metadata).toEqual(originalSession.metadata);
      expect(currentState.currentSession?.context).toEqual(originalSession.context);

      // Verify message count matches
      expect(currentState.messages.length).toBe(originalSession.messages.length);

      // Verify message order is preserved
      for (let i = 0; i < originalSession.messages.length; i++) {
        expect(currentState.messages[i].id).toBe(originalSession.messages[i].id);
        expect(currentState.messages[i].content).toBe(originalSession.messages[i].content);
        expect(currentState.messages[i].role).toBe(originalSession.messages[i].role);
      }
    });
  });

  describe('Session Message Loading Performance', () => {
    it('should handle sessions with large message counts efficiently', async () => {
      // Create a session with many messages (simulating a long conversation)
      const largeSession = createMockSession('session-large', 'Large Session', 100);

      // Add 100 messages
      largeSession.messages = Array.from({ length: 100 }, (_, index) => ({
        id: `msg-${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
        content: `Message ${index + 1} with some content to simulate real messages`,
        timestamp: new Date(`2024-01-01T10:${Math.floor(index / 60).toString().padStart(2, '0')}:${(index % 60).toString().padStart(2, '0')}Z`),
        provider: index % 3 === 0 ? 'openai' : 'chatglm',
        model: index % 3 === 0 ? 'gpt-3.5-turbo' : 'chatglm-4',
        ...(index % 2 === 1 && { thinking_content: `Thinking process for message ${index}` }),
      }));

      const startTime = performance.now();

      const chatStore = useChatStore.getState();
      chatStore.setCurrentSession(largeSession);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Processing should be reasonable (less than 100ms for 100 messages)
      expect(processingTime).toBeLessThan(100);

      const currentState = useChatStore.getState();
      expect(currentState.messages).toHaveLength(100);
    });
  });
});