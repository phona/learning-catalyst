import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatMessageService } from '@/services/chat/chatMessageService';
import { chatService } from '@/services/ai/chatService';
import { useConfigStore } from '@/stores/useConfigStore';
import type { Session, Message } from '@/types/ai';

// Mock dependencies
vi.mock('@/services/ai/chatService');
vi.mock('@/stores/useConfigStore');

describe('ChatMessageService', () => {
  const mockSession: Session = {
    id: 'test-session-1',
    title: 'Test Session',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    messages: [],
    metadata: {},
    context: {},
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

  const mockConfig = {
    ai: {
      model_types: {
        chat: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          available_providers: ['openai', 'chatglm'],
          api_keys: {
            openai: 'test-api-key',
            chatglm: 'test-chatglm-key',
          },
          custom_provider_url: undefined,
          settings: {
            temperature: 0.7,
            max_tokens: 4096,
          },
          capabilities: {
            streaming: true,
            thinking: true,
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfigStore.getState).mockReturnValue({
      config: mockConfig,
    });
  });

  describe('validateProviderConfig', () => {
    it('should return null when provider config is valid', () => {
      const result = ChatMessageService.validateProviderConfig('openai');
      expect(result).toBeNull();
    });

    it('should return error message when provider API key is missing', () => {
      const result = ChatMessageService.validateProviderConfig('unknown-provider');
      expect(result).toContain('No API key found for provider');
      expect(result).toContain('unknown-provider');
    });

    it('should return error message when config is missing', () => {
      vi.mocked(useConfigStore.getState).mockReturnValue({
        config: null,
      });

      const result = ChatMessageService.validateProviderConfig('openai');
      expect(result).toContain('No API key found for provider');
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider config when valid', () => {
      const config = ChatMessageService.getProviderConfig('openai');

      expect(config).toEqual({
        api_key: 'test-api-key',
        base_url: undefined,
        provider: 'openai',
      });
    });

    it('should return null when provider is not configured', () => {
      const config = ChatMessageService.getProviderConfig('unknown-provider');
      expect(config).toBeNull();
    });

    it('should include custom URL when configured', () => {
      const mockConfigWithCustomUrl = {
        ai: {
          model_types: {
            chat: {
              ...mockConfig.ai.model_types.chat,
              custom_provider_url: 'https://custom.api.com/v1',
              api_keys: {
                'openai-compatible': 'custom-key',
              },
              available_providers: ['openai-compatible'],
              default_provider: 'openai-compatible',
            },
          },
        },
      };

      vi.mocked(useConfigStore.getState).mockReturnValue({
        config: mockConfigWithCustomUrl,
      });

      const config = ChatMessageService.getProviderConfig('openai-compatible');

      expect(config).toEqual({
        api_key: 'custom-key',
        base_url: 'https://custom.api.com/v1',
        provider: 'openai-compatible',
      });
    });
  });

  describe('sendMessage', () => {
    const mockServiceOptions = {
      onStartStreaming: vi.fn(),
      onStopStreaming: vi.fn(),
      onStreamChunk: vi.fn(),
      onError: vi.fn(),
      onMessageComplete: vi.fn(),
    };

    it('should call service options in correct order', async () => {
      const mockResponse = Symbol('mock-response');
      const mockAsyncGenerator = (async function* () {
        yield { content: 'Hello' };
        yield { done: true };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockResponse);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      expect(mockServiceOptions.onStartStreaming).toHaveBeenCalled();
      expect(mockServiceOptions.onStopStreaming).toHaveBeenCalled();
      expect(mockServiceOptions.onMessageComplete).toHaveBeenCalled();

      const completedMessage = mockServiceOptions.onMessageComplete.mock.calls[0][0];
      expect(completedMessage).toMatchObject({
        role: 'assistant',
        content: 'Hello',
        provider: 'openai',
      });
    });

    it('should handle streaming responses correctly', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { content: 'Part 1' };
        yield { content: 'Part 2' };
        yield { thinkingContent: 'Thinking...' };
        yield { done: true };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockAsyncGenerator);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      // Check that stream chunks were processed
      expect(mockServiceOptions.onStreamChunk).toHaveBeenCalledTimes(4);
      expect(mockServiceOptions.onStreamChunk).toHaveBeenNthCalledWith(1, { content: 'Part 1' });
      expect(mockServiceOptions.onStreamChunk).toHaveBeenNthCalledWith(2, { content: 'Part 2' });
      expect(mockServiceOptions.onStreamChunk).toHaveBeenNthCalledWith(3, { thinkingContent: 'Thinking...' });
      expect(mockServiceOptions.onStreamChunk).toHaveBeenNthCalledWith(4, { done: true });

      const completedMessage = mockServiceOptions.onMessageComplete.mock.calls[0][0];
      expect(completedMessage).toMatchObject({
        role: 'assistant',
        content: 'Part 1Part 2',
        thinking_content: 'Thinking...',
        provider: 'openai',
      });
    });

    it('should handle errors correctly', async () => {
      const testError = new Error('API error');
      vi.mocked(chatService.sendMessage).mockRejectedValue(testError);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      expect(mockServiceOptions.onError).toHaveBeenCalledWith('API error');
      expect(mockServiceOptions.onStopStreaming).toHaveBeenCalled();
      expect(mockServiceOptions.onMessageComplete).not.toHaveBeenCalled();
    });

    it('should handle stream errors correctly', async () => {
      const mockAsyncGenerator = (async function* () {
        yield { error: 'Stream error' };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockAsyncGenerator);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      expect(mockServiceOptions.onError).toHaveBeenCalledWith('Stream error');
    });

    it('should handle non-streaming responses', async () => {
      const mockNonStreamingResponse = {
        content: 'Non-streaming response',
        reasoning_content: 'Reasoning',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockNonStreamingResponse);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      const completedMessage = mockServiceOptions.onMessageComplete.mock.calls[0][0];
      expect(completedMessage).toMatchObject({
        role: 'assistant',
        content: 'Non-streaming response',
        thinking_content: 'Reasoning',
        tokens_used: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        provider: 'openai',
      });
    });

    it('should initialize provider when needed', async () => {
      const mockResponse = Symbol('mock-response');
      const mockAsyncGenerator = (async function* () {
        yield { content: 'Hello' };
        yield { done: true };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockResponse);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      expect(chatService.initializeProvider).toHaveBeenCalledWith('openai', {
        api_key: 'test-api-key',
        base_url: undefined,
        provider: 'openai',
      });

      expect(chatService.setCurrentSession).toHaveBeenCalledWith(mockSession);
    });

    it('should not initialize provider when already initialized', async () => {
      const mockResponse = Symbol('mock-response');
      const mockAsyncGenerator = (async function* () {
        yield { content: 'Hello' };
        yield { done: true };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockResponse);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue({ name: 'openai' });

      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        mockServiceOptions
      );

      expect(chatService.initializeProvider).not.toHaveBeenCalled();
      expect(chatService.setCurrentSession).toHaveBeenCalledWith(mockSession);
    });

    it('should handle missing service options gracefully', async () => {
      const mockResponse = Symbol('mock-response');
      const mockAsyncGenerator = (async function* () {
        yield { content: 'Hello' };
        yield { done: true };
      })();

      vi.mocked(chatService.sendMessage).mockResolvedValue(mockResponse);
      vi.mocked(chatService.processStreamResponse).mockReturnValue(mockAsyncGenerator);
      vi.mocked(chatService.getProviderInfo).mockReturnValue(null);

      // Call with minimal options
      await ChatMessageService.sendMessage(
        'Test message',
        mockSession,
        'openai',
        'gpt-3.5-turbo',
        {},
        {}
      );

      // Should not throw errors
      expect(chatService.sendMessage).toHaveBeenCalled();
    });
  });
});