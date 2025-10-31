import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '@/stores/useChatStore';
import type { Session } from '@/types/session';

describe('Recent Session Click Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useChatStore setCurrentSession', () => {
    it('should convert session messages to store format correctly', () => {
      const mockSession: Session = {
        id: 'test-session-1',
        title: 'Test Session',
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T12:00:00Z'),
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello, how are you?',
            timestamp: new Date('2024-01-01T10:00:00Z'),
            provider: 'openai',
            model: 'gpt-3.5-turbo',
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'I am doing well, thank you!',
            timestamp: new Date('2024-01-01T10:01:00Z'),
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            thinking_content: 'The user is asking how I am, I should respond politely.',
          },
          {
            id: 'msg-3',
            role: 'user',
            content: 'Can you help me with React testing?',
            timestamp: new Date('2024-01-01T11:00:00Z'),
            provider: 'openai',
            model: 'gpt-3.5-turbo',
          },
        ],
        metadata: {
          title: 'Test Session',
          description: 'A test session about React testing',
          tags: ['react', 'testing'],
          category: 'technical',
          difficulty: 'intermediate',
          learning_objectives: ['learn React testing'],
          topics_covered: ['react', 'testing'],
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
          total_messages: 3,
          user_messages: 2,
          assistant_messages: 1,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 7200,
          average_response_time: 60,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // Call setCurrentSession
      const { setCurrentSession } = useChatStore.getState();
      setCurrentSession(mockSession);

      // Get the updated state
      const currentState = useChatStore.getState();

      // Verify session was set correctly
      expect(currentState.currentSession?.id).toBe('test-session-1');
      expect(currentState.currentSession?.title).toBe('Test Session');

      // Verify messages were converted and set
      expect(currentState.messages).toHaveLength(3);

      // Check user message conversion
      const userMessage1 = currentState.messages[0];
      expect(userMessage1).toMatchObject({
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        showThinking: false, // User messages should not show thinking
      });

      // Check assistant message with thinking
      const assistantMessage = currentState.messages[1];
      expect(assistantMessage).toMatchObject({
        id: 'msg-2',
        role: 'assistant',
        content: 'I am doing well, thank you!',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        showThinking: true, // Assistant messages with thinking should show it
        thinking_content: 'The user is asking how I am, I should respond politely.',
      });

      // Check second user message
      const userMessage2 = currentState.messages[2];
      expect(userMessage2).toMatchObject({
        id: 'msg-3',
        role: 'user',
        content: 'Can you help me with React testing?',
        showThinking: false,
      });
    });

    it('should handle empty session gracefully', () => {
      const emptySession: Session = {
        id: 'empty-session',
        title: 'Empty Session',
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
        metadata: {
          title: 'Empty Session',
          description: 'Session with no messages',
          tags: [],
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
          enable_thinking: false,
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
          total_messages: 0,
          user_messages: 0,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // Call setCurrentSession
      const { setCurrentSession } = useChatStore.getState();
      setCurrentSession(emptySession);

      // Get the updated state
      const currentState = useChatStore.getState();

      // Verify session was set
      expect(currentState.currentSession?.id).toBe('empty-session');

      // Verify messages array is empty
      expect(currentState.messages).toHaveLength(0);
    });

    it('should preserve message metadata and timestamps', () => {
      const timestamp = new Date('2024-01-15T14:30:00Z');
      const sessionWithMetadata: Session = {
        id: 'metadata-session',
        title: 'Metadata Test Session',
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T15:00:00Z'),
        messages: [
          {
            id: 'msg-metadata',
            role: 'assistant',
            content: 'Response with rich metadata',
            timestamp,
            provider: 'chatglm',
            model: 'chatglm-4',
            thinking_content: 'Complex reasoning process',
            tool_calls: [
              {
                name: 'search',
                arguments: '{"query": "React testing best practices"}',
              },
            ],
          },
        ],
        metadata: {
          title: 'Metadata Test Session',
          description: 'Testing metadata preservation',
          tags: ['metadata', 'testing'],
          category: 'technical',
          difficulty: 'advanced',
          learning_objectives: ['metadata handling'],
          topics_covered: ['metadata'],
          archived: false,
          pinned: true,
        },
        context: {
          current_provider: 'chatglm',
          current_model: 'chatglm-4',
          temperature: 0.5,
          max_tokens: 8192,
          enable_thinking: true,
          conversation_style: 'technical',
          language: 'en',
          user_preferences: {
            learning_style: 'hands-on',
            detail_level: 'comprehensive',
            example_preference: 'practical',
            response_length: 'detailed',
            technical_level: 'advanced',
          },
        },
        checkpoints: [],
        statistics: {
          total_messages: 1,
          user_messages: 0,
          assistant_messages: 1,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 18000,
          average_response_time: 120,
          concepts_learned: 5,
          checkpoints_created: 2,
          productivity_score: 85,
          engagement_score: 92,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // Call setCurrentSession
      const { setCurrentSession } = useChatStore.getState();
      setCurrentSession(sessionWithMetadata);

      // Get the updated state
      const currentState = useChatStore.getState();

      // Verify session metadata is preserved
      expect(currentState.currentSession?.metadata).toMatchObject({
        title: 'Metadata Test Session',
        description: 'Testing metadata preservation',
        tags: ['metadata', 'testing'],
        pinned: true,
      });

      // Verify context is preserved
      expect(currentState.currentSession?.context).toMatchObject({
        current_provider: 'chatglm',
        current_model: 'chatglm-4',
        temperature: 0.5,
        conversation_style: 'technical',
      });

      // Verify message metadata is preserved
      const message = currentState.messages[0];
      expect(message).toMatchObject({
        id: 'msg-metadata',
        role: 'assistant',
        content: 'Response with rich metadata',
        timestamp,
        provider: 'chatglm',
        model: 'chatglm-4',
        showThinking: true,
        thinking_content: 'Complex reasoning process',
        tool_calls: [
          {
            name: 'search',
            arguments: '{"query": "React testing best practices"}',
          },
        ],
      });
    });

    it('should handle session without messages array', () => {
      const sessionWithoutMessages = {
        id: 'no-messages-session',
        title: 'No Messages Session',
        created_at: new Date(),
        updated_at: new Date(),
        messages: null as any, // This could potentially cause issues
        metadata: {
          title: 'No Messages Session',
          description: 'Session with null messages',
          tags: [],
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
          enable_thinking: false,
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
          total_messages: 0,
          user_messages: 0,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // This should not throw an error
      expect(() => {
        const { setCurrentSession } = useChatStore.getState();
        setCurrentSession(sessionWithoutMessages);
      }).not.toThrow();

      // Get the updated state
      const currentState = useChatStore.getState();

      // Verify session was set
      expect(currentState.currentSession?.id).toBe('no-messages-session');

      // Verify messages array is empty (not null or undefined)
      expect(currentState.messages).toEqual([]);
    });
  });

  describe('Message Conversion Edge Cases', () => {
    it('should handle messages with missing optional fields', () => {
      const sessionWithPartialMessages: Session = {
        id: 'partial-messages-session',
        title: 'Partial Messages Session',
        created_at: new Date(),
        updated_at: new Date(),
        messages: [
          {
            id: 'msg-minimal',
            role: 'user',
            content: 'Minimal message',
            timestamp: new Date(),
            // provider, model are optional
          },
          {
            id: 'msg-with-some-fields',
            role: 'assistant',
            content: 'Message with some fields',
            timestamp: new Date(),
            provider: 'openai',
            // thinking_content is optional
          },
        ],
        metadata: {
          title: 'Partial Messages Session',
          description: 'Testing partial message handling',
          tags: [],
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
          enable_thinking: false,
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
          total_messages: 2,
          user_messages: 1,
          assistant_messages: 1,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // Call setCurrentSession
      const { setCurrentSession } = useChatStore.getState();
      setCurrentSession(sessionWithPartialMessages);

      // Get the updated state
      const currentState = useChatStore.getState();

      // Verify messages were processed without errors
      expect(currentState.messages).toHaveLength(2);

      // Verify minimal message
      expect(currentState.messages[0]).toMatchObject({
        id: 'msg-minimal',
        role: 'user',
        content: 'Minimal message',
        showThinking: false,
        provider: undefined,
        model: undefined,
      });

      // Verify partial message
      expect(currentState.messages[1]).toMatchObject({
        id: 'msg-with-some-fields',
        role: 'assistant',
        content: 'Message with some fields',
        showThinking: false, // No thinking content
        provider: 'openai',
        model: undefined, // Model was not provided
      });
    });
  });

  describe('Session Loading Performance', () => {
    it('should handle sessions with many messages efficiently', () => {
      // Create a session with many messages
      const largeSession: Session = {
        id: 'large-session',
        title: 'Large Session',
        created_at: new Date(),
        updated_at: new Date(),
        messages: Array.from({ length: 50 }, (_, index) => ({
          id: `msg-${index}`,
          role: index % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
          content: `Message ${index + 1}: ${'This is a longer message to simulate realistic content '.repeat(5)}`,
          timestamp: new Date(Date.now() + index * 60000), // 1 minute apart
          provider: index % 3 === 0 ? 'openai' : 'chatglm',
          model: index % 3 === 0 ? 'gpt-3.5-turbo' : 'chatglm-4',
          ...(index % 2 === 1 && index % 4 === 1 && {
            thinking_content: `Thinking process for message ${index}: ${'Reasoning content '.repeat(10)}`
          }),
        })),
        metadata: {
          title: 'Large Session',
          description: 'Large session for performance testing',
          tags: ['performance', 'large'],
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
          total_messages: 50,
          user_messages: 25,
          assistant_messages: 25,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 3000000,
          average_response_time: 60,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      };

      // Reset the store state
      useChatStore.setState({
        currentSession: null,
        messages: [],
      });

      // Measure performance
      const startTime = performance.now();

      const { setCurrentSession } = useChatStore.getState();
      setCurrentSession(largeSession);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete in reasonable time (less than 50ms for 50 messages)
      expect(processingTime).toBeLessThan(50);

      // Verify all messages were processed
      const currentState = useChatStore.getState();
      expect(currentState.messages).toHaveLength(50);

      // Spot check some messages
      expect(currentState.messages[0].role).toBe('user');
      expect(currentState.messages[1].role).toBe('assistant');
      expect(currentState.messages[48].role).toBe('user');
      expect(currentState.messages[49].role).toBe('assistant');
    });
  });
});