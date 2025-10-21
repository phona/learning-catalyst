import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/stores/useChatStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { chatService } from '@/services/ai/chatService';
import type { Message, Session, ChatOptions } from '@/types';

// Mock dependencies
jest.mock('@/stores/useConfigStore');
jest.mock('@/services/ai/chatService');

const mockUseConfigStore = useConfigStore as jest.MockedFunction<typeof useConfigStore>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;

describe('useChatStore', () => {
  const mockSession: Session = {
    id: 'session-1',
    title: 'Test Chat',
    created_at: new Date('2024-01-01T10:00:00'),
    updated_at: new Date('2024-01-01T10:00:00'),
    messages: [],
    metadata: {
      title: 'Test Chat',
      tags: [],
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

  const mockMessage: Message = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, AI!',
    timestamp: new Date('2024-01-01T10:00:00'),
  };

  const mockConfig = {
    ai: {
      default_provider: 'openai',
      default_model: 'gpt-3.5-turbo',
      providers: {
        openai: {
          name: 'OpenAI',
          api_key: 'test-key',
          base_url: 'https://api.openai.com/v1',
          models: ['gpt-3.5-turbo', 'gpt-4'],
        },
      },
      temperature: 0.7,
      max_tokens: 4096,
      streaming: true,
      enable_thinking: true,
    },
  };

  beforeEach(() => {
    // Reset store before each test
    useChatStore.getState().setCurrentSession(null);
    useChatStore.getState().setMessages([]);
    useChatStore.getState().clearMessages();
    useChatStore.getState().setError(null);
    useChatStore.getState().resetStreaming();

    mockUseConfigStore.mockReturnValue({
      config: mockConfig,
      setConfig: jest.fn(),
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      resetConfig: jest.fn(),
    } as any);

    mockChatService.getProviderInfo = jest.fn();
    mockChatService.initializeProvider = jest.fn().mockResolvedValue(undefined);
    mockChatService.setCurrentSession = jest.fn();
    mockChatService.sendMessage = jest.fn();
    mockChatService.processStreamResponse = jest.fn();

    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useChatStore());

      expect(result.current.currentSession).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.thinkingContent).toBe('');
      expect(result.current.inputText).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.showThinking).toBe(true);
      expect(result.current.autoScroll).toBe(true);
      expect(result.current.selectedProvider).toBe('openai');
      expect(result.current.selectedModel).toBe('gpt-3.5-turbo');
    });
  });

  describe('Session Management', () => {
    it('sets current session', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      expect(result.current.currentSession).toEqual(mockSession);
    });

    it('clears current session', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.setCurrentSession(null);
      });

      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('Message Management', () => {
    it('sets messages', () => {
      const { result } = renderHook(() => useChatStore());
      const messages = [mockMessage];

      act(() => {
        result.current.setMessages(messages);
      });

      expect(result.current.messages).toEqual(messages);
    });

    it('adds message', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.addMessage(mockMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(mockMessage);
    });

    it('updates message', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.addMessage(mockMessage);
        result.current.updateMessage(mockMessage.id, { content: 'Updated content' });
      });

      expect(result.current.messages[0].content).toBe('Updated content');
    });

    it('deletes message', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.addMessage(mockMessage);
        result.current.deleteMessage(mockMessage.id);
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('clears all messages', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.addMessage(mockMessage);
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('Loading and Streaming State', () => {
    it('sets loading state', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets streaming state', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setStreaming(true);
      });

      expect(result.current.isStreaming).toBe(true);

      act(() => {
        result.current.setStreaming(false);
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('appends stream chunks', () => {
      const { result } = renderHook(() => useChatStore());

      const chunk1 = { content: 'Hello' };
      const chunk2 = { reasoning_content: 'Thinking' };
      const chunk3 = { content: ' world' };

      act(() => {
        result.current.appendStreamChunk(chunk1);
        result.current.appendStreamChunk(chunk2);
        result.current.appendStreamChunk(chunk3);
      });

      expect(result.current.streamingContent).toBe('Hello world');
      expect(result.current.thinkingContent).toBe('Thinking');
    });

    it('sets thinking content', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setThinkingContent('Thinking process');
      });

      expect(result.current.thinkingContent).toBe('Thinking process');
    });

    it('resets streaming state', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setStreaming(true);
        result.current.appendStreamChunk({ content: 'Some content' });
        result.current.setThinkingContent('Some thinking');
        result.current.resetStreaming();
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.thinkingContent).toBe('');
    });
  });

  describe('Input Management', () => {
    it('sets input text', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setInputText('Hello, AI!');
      });

      expect(result.current.inputText).toBe('Hello, AI!');
    });
  });

  describe('Error Management', () => {
    it('sets error', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('clears error', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('UI State Management', () => {
    it('toggles thinking visibility', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setShowThinking(false);
      });

      expect(result.current.showThinking).toBe(false);

      act(() => {
        result.current.setShowThinking(true);
      });

      expect(result.current.showThinking).toBe(true);
    });

    it('toggles auto scroll', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setAutoScroll(false);
      });

      expect(result.current.autoScroll).toBe(false);

      act(() => {
        result.current.setAutoScroll(true);
      });

      expect(result.current.autoScroll).toBe(true);
    });

    it('sets selected provider', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setSelectedProvider('chatglm');
      });

      expect(result.current.selectedProvider).toBe('chatglm');
    });

    it('sets selected model', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setSelectedModel('gpt-4');
      });

      expect(result.current.selectedModel).toBe('gpt-4');
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully with streaming response', async () => {
      const { result } = renderHook(() => useChatStore());
      const mockStreamResponse = {
        [Symbol.asyncIterator]: async function* () {
          yield { content: 'Hello' };
          yield { content: ' world!' };
          yield { done: true };
        },
      };

      mockChatService.sendMessage.mockResolvedValue(mockStreamResponse as any);
      mockChatService.processStreamResponse.mockResolvedValue([
        { content: 'Hello' },
        { content: ' world!' },
        { done: true },
      ]);

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(result.current.messages).toHaveLength(2); // User + Assistant
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello, AI!');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Hello world!');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);
    });

    it('sends message successfully with non-streaming response', async () => {
      const { result } = renderHook(() => useChatStore());
      const mockResponse = {
        content: 'Hello world!',
        reasoning_content: 'Thinking process',
        usage: { total_tokens: 50 },
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello world!');
      expect(result.current.messages[1].reasoning_content).toBe('Thinking process');
      expect(result.current.messages[1].tokens_used).toBe(50);
    });

    it('handles send message error when no session', async () => {
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(result.current.error).toBe('No active session');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles send message error when no provider config', async () => {
      const { result } = renderHook(() => useChatStore());

      mockUseConfigStore.mockReturnValue({
        config: { ai: { providers: {} } },
      } as any);

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(result.current.error).toBe('No configuration found for provider: openai');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles provider initialization error', async () => {
      const { result } = renderHook(() => useChatStore());

      mockChatService.initializeProvider.mockRejectedValue(new Error('Provider init failed'));

      act(() => {
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(result.current.error).toBe('Provider init failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('does not send message when streaming', async () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setStreaming(true);
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('does not send message when loading', async () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setCurrentSession(mockSession);
      });

      await act(async () => {
        await result.current.sendMessage('Hello, AI!');
      });

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('stopStreaming', () => {
    it('stops streaming', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setStreaming(true);
        result.current.stopStreaming();
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('retryLastMessage', () => {
    it('retries last user message when assistant message exists', async () => {
      const { result } = renderHook(() => useChatStore());
      const mockResponse = { content: 'New response' };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.addMessage({ ...mockMessage, role: 'user', content: 'First message' });
        result.current.addMessage({ ...mockMessage, role: 'assistant', content: 'First response', id: 'msg-2' });
      });

      await act(async () => {
        result.current.retryLastMessage();
      });

      expect(result.current.messages).toHaveLength(3); // User + New Assistant (old one removed)
      expect(result.current.messages[0].content).toBe('First message');
      expect(result.current.messages[1].content).toBe('New response');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('First message', expect.any(Object));
    });

    it('retries last user message when no assistant message exists', async () => {
      const { result } = renderHook(() => useChatStore());
      const mockResponse = { content: 'Response' };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      act(() => {
        result.current.setCurrentSession(mockSession);
        result.current.addMessage({ ...mockMessage, role: 'user', content: 'Only user message' });
      });

      await act(async () => {
        result.current.retryLastMessage();
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('Only user message');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Only user message', expect.any(Object));
    });

    it('does nothing when no user messages exist', async () => {
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        result.current.retryLastMessage();
      });

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Stream Chunk Processing', () => {
    it('processes content chunks correctly', () => {
      const { result } = renderHook(() => useChatStore());

      const chunks = [
        { content: 'Hello' },
        { content: ' there' },
        { content: '!' },
      ];

      chunks.forEach(chunk => {
        act(() => {
          result.current.appendStreamChunk(chunk);
        });
      });

      expect(result.current.streamingContent).toBe('Hello there!');
    });

    it('processes thinking chunks correctly', () => {
      const { result } = renderHook(() => useChatStore());

      const chunks = [
        { reasoning_content: 'Let me ' },
        { reasoning_content: 'think...' },
      ];

      chunks.forEach(chunk => {
        act(() => {
          result.current.appendStreamChunk(chunk);
        });
      });

      expect(result.current.thinkingContent).toBe('Let me think...');
    });

    it('processes mixed chunks correctly', () => {
      const { result } = renderHook(() => useChatStore());

      const chunks = [
        { content: 'Answer' },
        { reasoning_content: 'Thinking' },
        { content: ' here' },
      ];

      chunks.forEach(chunk => {
        act(() => {
          result.current.appendStreamChunk(chunk);
        });
      });

      expect(result.current.streamingContent).toBe('Answer here');
      expect(result.current.thinkingContent).toBe('Thinking');
    });
  });
});