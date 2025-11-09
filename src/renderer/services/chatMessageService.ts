import type { Message, StreamChunk, ChatOptions } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';
import type { ChatService } from './ChatService';
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
  constructor(private chatService: ChatService) {}

  /**
   * Send a message and handle the streaming response
   */
  async sendMessage(
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
      console.log('[ChatMessageService] Config structure:', {
        hasConfig: !!config,
        hasAI: !!config?.ai,
        hasModelTypes: !!config?.ai?.model_types,
        hasChat: !!config?.ai?.model_types?.chat,
        chatConfig: config?.ai?.model_types?.chat,
        fullConfig: config
      });

      const chatModelConfig = config?.ai?.model_types?.chat;

      // Get API key from the new model type configuration
      const apiKey = chatModelConfig?.api_key;
      console.log('[ChatMessageService] API key check:', {
        provider,
        hasChatConfig: !!chatModelConfig,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        defaultProvider: chatModelConfig?.default_provider
      });

      // Create provider config object compatible with chat service
      const providerConfig = apiKey ? {
        api_key: apiKey,
        base_url: chatModelConfig?.custom_provider_url || undefined,
        type: provider
      } : null;

      if (!providerConfig || !apiKey) {
        const errorMsg = `No API key configured for provider: ${provider}. Please configure the API key in Settings.`;
        console.warn(`[ChatMessageService] ${errorMsg}`);
        onError?.(errorMsg);
        onStopStreaming?.();
        return;
      }

      // Initialize provider if not already done
      if (!this.chatService.getProviderInfo() ||
        this.chatService.getProviderInfo()?.type !== provider) {
        await this.chatService.initializeModel(provider, providerConfig);
      }

      // Set current session in chat service
      this.chatService.setCurrentSession(session);

      // Send message to AI
      onStartStreaming?.();
      const response = await this.chatService.sendMessage(content, session, {
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
        for await (const chunk of this.chatService.processStreamResponse(response as AsyncGenerator<StreamChunk>)) {
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
    const apiKey = chatModelConfig?.api_key;

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
    const apiKey = chatModelConfig?.api_key;

    return apiKey ? {
      api_key: apiKey,
      base_url: chatModelConfig?.custom_provider_url || undefined,
      type: provider
    } : null;
  }
}