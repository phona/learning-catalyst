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

import type { Message, StreamChunk, ChatOptions } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import type { ChatService } from '@/renderer/services/chat/chat-service';

export interface ChatMessageServiceOptions {
  onStartStreaming?: () => void;
  onStopStreaming?: () => void;
  onStreamChunk?: (chunk: StreamChunk) => void;
  onError?: (error: string) => void;
  onMessageComplete?: (message: Message) => void;
}

const getChatModelConfig = () => {
  const { config } = useConfigStore.getState();
  return config?.ai?.model_types?.chat;
};

const buildProviderConfig = (provider: string) => {
  const chatModelConfig = getChatModelConfig();
  const apiKey = chatModelConfig?.api_key;

  return apiKey
    ? {
        api_key: apiKey,
        base_url: chatModelConfig?.custom_provider_url || undefined,
        type: provider
      }
    : null;
};

export const createChatMessageService = (chatService: ChatService) => {
  const validateProviderConfig = (provider: string): string | null => {
    const chatModelConfig = getChatModelConfig();
    if (!chatModelConfig?.api_key) {
      return `No API key found for provider: ${provider}. Please configure the API key in Settings.`;
    }
    return null;
  };

  const getProviderConfig = (provider: string) => buildProviderConfig(provider);

  const sendMessage = async (
    content: string,
    session: Session,
    provider: string,
    model: string,
    options: ChatOptions = {},
    serviceOptions: ChatMessageServiceOptions = {}
  ): Promise<void> => {
    const {
      onStartStreaming,
      onStopStreaming,
      onStreamChunk,
      onError,
      onMessageComplete
    } = serviceOptions;

    try {
      const providerConfig = buildProviderConfig(provider);

      if (!providerConfig) {
        const errorMsg = `No API key configured for provider: ${provider}. Please configure the API key in Settings.`;
        console.warn(`[ChatMessageService] ${errorMsg}`);
        onError?.(errorMsg);
        onStopStreaming?.();
        return;
      }

      if (
        !chatService.getProviderInfo() ||
        chatService.getProviderInfo()?.type !== provider
      ) {
        await chatService.initializeModel(provider, providerConfig);
      }

      chatService.setCurrentSession(session);

      onStartStreaming?.();
      const response = await chatService.sendMessage(content, session, {
        ...options,
        provider,
        model,
        stream: true
      });

      const isAsyncGenerator =
        response &&
        typeof (response as any)[Symbol.asyncIterator] === 'function';

      if (isAsyncGenerator) {
        let assistantContent = '';
        let thinkingContent = '';

        for await (const chunk of chatService.processStreamResponse(
          response as AsyncGenerator<StreamChunk>
        )) {
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

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          thinking_content: thinkingContent || undefined,
          timestamp: new Date(),
          provider,
          tokens_used: undefined
        };

        onMessageComplete?.(assistantMessage);
      } else {
        const chatResponse = response as any;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: chatResponse.content,
          thinking_content: chatResponse.reasoning_content,
          timestamp: new Date(),
          provider,
          tokens_used: chatResponse.usage
            ? {
                prompt_tokens: chatResponse.usage.prompt_tokens || 0,
                completion_tokens: chatResponse.usage.completion_tokens || 0,
                total_tokens: chatResponse.usage.total_tokens || 0
              }
            : undefined
        };

        onMessageComplete?.(assistantMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      onStopStreaming?.();
    }
  };

  return {
    sendMessage,
    validateProviderConfig,
    getProviderConfig
  };
};

export type ChatMessageService = ReturnType<typeof createChatMessageService>;
