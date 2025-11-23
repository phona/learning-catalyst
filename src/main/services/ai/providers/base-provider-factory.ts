/**
 * AI Provider Base Factory
 *
 * Eliminates 90% of code duplication across AI providers while letting errors bubble naturally.
 * Each provider just defines its configuration - all common logic is shared.
 */

import { LoggerService } from '../../core/logger/logger-service';
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionResult,
  EmbeddingParams,
  EmbeddingResult,
  ModelProvider,
  ModelConfig,
} from '@/main/services/ai/ai-types';

export interface ProviderDefinition {
  name: string;
  apiUrl?: string; // Optional for local models that don't need external APIs
  embeddingDimensions: number;
  requiresApiKey: boolean;
  supportedModels: string[];
  defaultCompletionTokens: number;
  responseTransformer?: {
    chatCompletion?: (rawResponse: any, params: ChatCompletionParams) => ChatCompletionResult;
    embedding?: (rawResponse: any, params: EmbeddingParams) => EmbeddingResult;
  };
}

/**
 * Base provider factory that eliminates 90% of duplication
 */
export const createProviderService =
  (config: ProviderDefinition) =>
  ({ loggerService }: { loggerService: LoggerService }): ModelProvider => {
    const logger = loggerService.child({ service: `ai-${config.name}` });

    // Let errors bubble naturally - no wrapping here!
    return {
      chatCompletion: async (params: ChatCompletionParams): Promise<ChatCompletionResult> => {
        logger.info('Starting chat completion', { model: params.modelConfig.model });

        // Basic validation - let errors bubble naturally
        if (!params.modelConfig.model) {
          throw new Error('Model is required');
        }

        if (config.requiresApiKey && !params.modelConfig.apiKey) {
          throw new Error(`${config.name} API key is required`);
        }

        // Create mock response (in real implementation, make API call)
        const rawResponse = {
          id: `chatcmpl_${Date.now()}_${config.name}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: params.modelConfig.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `This is a mock response from ${config.name} (${params.modelConfig.model}). The user asked: "${params.messages[params.messages.length - 1]?.content || 'Hello'}".`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: params.messages.reduce(
              (sum: number, msg: ChatMessage) => sum + msg.content.length,
              0,
            ),
            completion_tokens: config.defaultCompletionTokens,
            total_tokens:
              params.messages.reduce(
                (sum: number, msg: ChatMessage) => sum + msg.content.length,
                0,
              ) + config.defaultCompletionTokens,
          },
        };

        // Transform response using provider-specific transformer if available
        const result = config.responseTransformer?.chatCompletion
          ? config.responseTransformer.chatCompletion(rawResponse, params)
          : {
              content: rawResponse.choices[0].message.content,
              model: rawResponse.model,
              usage: {
                promptTokens: rawResponse.usage.prompt_tokens,
                completionTokens: rawResponse.usage.completion_tokens,
                totalTokens: rawResponse.usage.total_tokens,
              },
              finishReason: rawResponse.choices[0].finish_reason,
            };

        logger.info('Chat completion completed', {
          model: result.model,
          tokensUsed: result.usage.totalTokens,
        });

        return result;
      },

      embedding: async (params: EmbeddingParams): Promise<EmbeddingResult> => {
        logger.info('Starting embedding generation', { model: params.modelConfig.model });

        // Basic validation - let errors bubble naturally
        if (!params.modelConfig.model) {
          throw new Error('Model is required');
        }

        if (config.requiresApiKey && !params.modelConfig.apiKey) {
          throw new Error(`${config.name} API key is required`);
        }

        const inputArray = Array.isArray(params.input) ? params.input : [params.input];
        const mockEmbeddings = inputArray.map(() =>
          Array.from({ length: config.embeddingDimensions }, () => Math.random() * 2 - 1),
        );

        const rawResponse = {
          object: 'list',
          data: mockEmbeddings.map((embedding: number[], index: number) => ({
            object: 'embedding',
            index,
            embedding,
          })),
          model: params.modelConfig.model,
          usage: {
            prompt_tokens: inputArray.reduce((sum: number, text: string) => sum + text.length, 0),
            total_tokens: inputArray.reduce((sum: number, text: string) => sum + text.length, 0),
          },
        };

        const result = config.responseTransformer?.embedding
          ? config.responseTransformer.embedding(rawResponse, params)
          : {
              embeddings: Array.isArray(params.input)
                ? rawResponse.data.map((item: any) => item.embedding)
                : rawResponse.data[0].embedding,
              model: rawResponse.model,
              usage: {
                promptTokens: rawResponse.usage.prompt_tokens,
                totalTokens: rawResponse.usage.total_tokens,
              },
            };

        logger.info('Embedding generation completed', {
          model: result.model,
          embeddingCount: Array.isArray(result.embeddings) ? result.embeddings.length : 1,
        });

        return result;
      },

      validateConfig: (modelConfig: ModelConfig): boolean => {
        logger.info('Validating configuration', { model: modelConfig.model });

        try {
          // Basic validation logic
          if (!modelConfig.model) {
            logger.warn('Model not specified');
            return false;
          }

          if (
            config.requiresApiKey &&
            (!modelConfig.apiKey || typeof modelConfig.apiKey !== 'string')
          ) {
            logger.warn('Invalid API key');
            return false;
          }

          // Check if model is supported
          const isSupportedModel = config.supportedModels.some((supported) =>
            modelConfig.model.toLowerCase().includes(supported.toLowerCase()),
          );

          if (!isSupportedModel) {
            logger.warn('Unsupported model', { model: modelConfig.model });
            return false;
          }

          logger.info('Configuration is valid');
          return true;
        } catch (error) {
          logger.error('Configuration validation failed', error as Error);
          return false;
        }
      },
    };
  };

/**
 * Provider configurations - eliminate duplicate configuration
 */
export const providerConfigs = {
  openai: {
    name: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    embeddingDimensions: 1536,
    requiresApiKey: true,
    supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-32k'],
    defaultCompletionTokens: 50,
    responseTransformer: {
      chatCompletion: (rawResponse: any, params: ChatCompletionParams): ChatCompletionResult => ({
        content: rawResponse.choices[0].message.content,
        model: rawResponse.model,
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        },
        finishReason: rawResponse.choices[0].finish_reason,
      }),
      embedding: (rawResponse: any, params: EmbeddingParams): EmbeddingResult => ({
        embeddings: Array.isArray(params.input)
          ? rawResponse.data.map((item: any) => item.embedding)
          : rawResponse.data[0].embedding,
        model: rawResponse.model,
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        },
      }),
    },
  },

  deepseek: {
    name: 'deepseek',
    apiUrl: 'https://api.deepseek.com/v1',
    embeddingDimensions: 2048,
    requiresApiKey: true,
    supportedModels: ['deepseek-chat', 'deepseek-coder'],
    defaultCompletionTokens: 55,
    responseTransformer: {
      chatCompletion: (rawResponse: any, params: ChatCompletionParams): ChatCompletionResult => ({
        content: `DeepSeek: ${rawResponse.choices[0].message.content}`,
        model: rawResponse.model,
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        },
        finishReason: rawResponse.choices[0].finish_reason,
      }),
    },
  },

  chatglm: {
    name: 'chatglm',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    embeddingDimensions: 1024,
    requiresApiKey: true,
    supportedModels: ['chatglm_pro', 'chatglm_std', 'chatglm_lite', 'glm-4', 'glm-4v', 'charglm-3'],
    defaultCompletionTokens: 60,
    responseTransformer: {
      chatCompletion: (rawResponse: any, params: ChatCompletionParams): ChatCompletionResult => ({
        content: `ChatGLM: ${rawResponse.choices[0].message.content}`,
        model: rawResponse.model,
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        },
        finishReason: rawResponse.choices[0].finish_reason,
      }),
    },
  },

  localModel: {
    name: 'local-model',
    embeddingDimensions: 4096,
    requiresApiKey: false,
    supportedModels: ['llama-2-7b', 'llama-2-13b', 'mistral', 'phi'],
    defaultCompletionTokens: 70,
  },
};
