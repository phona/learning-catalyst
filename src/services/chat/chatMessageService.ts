import type { Message, StreamChunk, ChatOptions } from '@/types/ai';
import type { Session } from '@/types/session';
import { chatService } from '../ai/chatService';
import { useConfigStore } from '@/stores/useConfigStore';

export interface ChatMessageServiceOptions {
  onStartStreaming?: () => void;
  onStopStreaming?: () => void;
  onStreamChunk?: (chunk: StreamChunk) => void;
  onError?: (error: string) => void;
  onMessageComplete?: (message: Message) => void;
}

/**
 * Service to handle complex chat message logic
 * Extracted from store to improve separation of concerns
 */
export class ChatMessageService {
  /**
   * Send a message and handle the streaming response
   */
  static async sendMessage(
    content: string,
    session: Session,
    provider: string,
    model: string,
    options: ChatOptions = {},
    serviceOptions: ChatMessageServiceOptions = {}
  ): Promise<void> {
    const {
      onStartStreaming,
      onStopStreaming,
      onStreamChunk,
      onError,
      onMessageComplete
    } = serviceOptions;

    try {
      // Get provider config from model type configuration
      const { config } = useConfigStore.getState();
      const chatModelConfig = config?.ai?.model_types?.chat;

      // Get API key from the new model type configuration
      const apiKey = chatModelConfig?.api_keys?.[provider as keyof typeof chatModelConfig.api_keys];

      // Create provider config object compatible with chat service
      const providerConfig = apiKey ? {
        api_key: apiKey,
        base_url: chatModelConfig?.custom_provider_url || undefined,
        provider: provider
      } : null;

      if (!providerConfig || !apiKey) {
        throw new Error(`No configuration found for provider: ${provider}. Please configure the API key in Settings.`);
      }

      // Initialize provider if not already done
      if (!chatService.getProviderInfo() ||
        chatService.getProviderInfo()?.name !== provider) {
        await chatService.initializeProvider(provider, providerConfig);
      }

      // Set current session in chat service
      chatService.setCurrentSession(session);

      // Send message to AI
      onStartStreaming?.();
      const response = await chatService.sendMessage(content, session, {
        ...options,
        provider,
        model,
        stream: true, // Always use streaming for better UX
      });

      // Check if response is an async generator
      const isAsyncGenerator = response && typeof (response as any)[Symbol.asyncIterator] === 'function';

      if (isAsyncGenerator) {
        let assistantContent = '';
        let thinkingContent = '';

        // Process stream
        for await (const chunk of chatService.processStreamResponse(response as AsyncGenerator<StreamChunk>)) {
          onStreamChunk?.(chunk);

          if (chunk.error) {
            onError?.(chunk.error);
            break;
          }

          if (chunk.content) {
            assistantContent += chunk.content;
          }

          if (chunk.thinkingContent) {
            thinkingContent += chunk.thinkingContent;
          }

          if (chunk.done) {
            break;
          }
        }

        // Create final assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          thinking_content: thinkingContent || undefined,
          timestamp: new Date(),
          provider,
          tokens_used: undefined, // Will be populated by the actual implementation
        };

        onMessageComplete?.(assistantMessage);

      } else {
        // Non-streaming response (fallback)
        const chatResponse = response as any;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: chatResponse.content,
          thinking_content: chatResponse.reasoning_content,
          timestamp: new Date(),
          provider,
          tokens_used: chatResponse.usage ? {
            prompt_tokens: chatResponse.usage.prompt_tokens || 0,
            completion_tokens: chatResponse.usage.completion_tokens || 0,
            total_tokens: chatResponse.usage.total_tokens || 0,
          } : undefined,
        };

        onMessageComplete?.(assistantMessage);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      onStopStreaming?.();
    }
  }

  /**
   * Validate provider configuration before sending a message
   */
  static validateProviderConfig(provider: string): string | null {
    const { config } = useConfigStore.getState();
    const chatModelConfig = config?.ai?.model_types?.chat;
    const apiKey = chatModelConfig?.api_keys?.[provider as keyof typeof chatModelConfig.api_keys];

    if (!apiKey) {
      return `No API key found for provider: ${provider}. Please configure the API key in Settings.`;
    }

    return null;
  }

  /**
   * Get provider configuration for the chat service
   */
  static getProviderConfig(provider: string) {
    const { config } = useConfigStore.getState();
    const chatModelConfig = config?.ai?.model_types?.chat;
    const apiKey = chatModelConfig?.api_keys?.[provider as keyof typeof chatModelConfig.api_keys];

    return apiKey ? {
      api_key: apiKey,
      base_url: chatModelConfig?.custom_provider_url || undefined,
      provider: provider
    } : null;
  }
}