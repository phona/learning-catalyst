import { BaseAIProvider } from '../base';
import type {
  Message,
  ChatOptions,
  StreamChunk,
  ChatResponse,
  ModelList,
  AIModel,
  ProviderConfig,
} from '@/types/ai';
import { ModelType } from '@/types/ai';

/**
 * ChatGLM Provider implementation with thinking support
 * Converted from Python ChatGLM provider
 */
export class ChatGLMProvider extends BaseAIProvider {
  private static readonly DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

  constructor() {
    super('chatglm', 'chatglm');
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    if (!this.config.api_key) {
      throw new Error('API key is required for ChatGLM');
    }

    if (!this.config.base_url) {
      this.config.base_url = ChatGLMProvider.DEFAULT_BASE_URL;
    }

    this.initialized = true;
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    return !!(config.api_key && config.base_url);
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsThinking(): boolean {
    return true;
  }

  async sendMessage(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse | AsyncGenerator<StreamChunk>> {
    this.validateMessages(messages);
    const finalOptions = this.validateOptions(options);

    if (!this.config.api_key) {
      throw new Error('API key is required for ChatGLM');
    }

    const requestBody = {
      model: finalOptions.model || 'glm-4',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: finalOptions.temperature ?? 0.7,
      max_tokens: finalOptions.max_tokens ?? 4096,
      stream: finalOptions.stream ?? true,
	  thinking: {
		type: finalOptions.enable_thinking ? "enabled" : "disabled"
	  },
	  top_p: finalOptions.top_p,
	  tools: finalOptions.tools,
    };

    console.log('ChatGLM API request:', { model: requestBody.model, messageCount: requestBody.messages.length });

    try {
      const response = await fetch(`${this.config.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ChatGLM API error: ${response.status} - ${errorText}`);
      }

      if (finalOptions.stream) {
        return this.handleStreamResponse(response);
      } else {
        const data = await response.json();
        return this.handleNonStreamResponse(data);
      }
    } catch (error) {
      console.error('ChatGLM API error:', error);
      throw new Error(`ChatGLM API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listModels(): Promise<ModelList> {
    try {
      if (!this.config.api_key) {
        throw new Error('API key is required to list models');
      }

      const response = await fetch(`${this.config.base_url}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ChatGLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        chat: data.data?.map((model: any) => ({
          model_id: model.id,
          name: model.id,
          provider: this.name,
          type: ModelType.CHAT,
          description: model.object || 'ChatGLM model',
          supports_thinking: model.id.includes('glm-4'),
          max_tokens: model.max_tokens || 8192,
        })) || [],
        embedding: [],
        rerank: [],
      };
    } catch (error) {
      console.error('Failed to fetch ChatGLM models:', error);
      // Fallback to known models
      return {
        chat: [
          {
            model_id: 'glm-4',
            name: 'GLM-4',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'Latest GLM model with thinking support',
            supports_thinking: true,
            max_tokens: 8192,
          },
          {
            model_id: 'glm-4-air',
            name: 'GLM-4 Air',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'Lighter GLM model',
            supports_thinking: true,
            max_tokens: 8192,
          },
          {
            model_id: 'glm-4-flash',
            name: 'GLM-4 Flash',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'Fast GLM model',
            supports_thinking: false,
            max_tokens: 8192,
          },
        ],
        embedding: [],
        rerank: [],
      };
    }
  }

  private async *handleStreamResponse(response: Response): AsyncGenerator<StreamChunk> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not available for streaming');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);

            if (data === '[DONE]') {
              yield this.createStreamChunk(undefined, undefined, true);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];

              if (choice?.delta?.content) {
                yield this.createStreamChunk(choice.delta.content);
              }

              // ChatGLM might include thinking in the delta
              if (choice?.delta?.reasoning_content) {
                yield this.createStreamChunk(undefined, choice.delta.reasoning_content);
              }

              if (choice?.finish_reason === 'stop') {
                yield this.createStreamChunk(undefined, undefined, true);
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
              console.warn('Failed to parse streaming chunk:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async handleNonStreamResponse(data: any): Promise<ChatResponse> {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('Invalid response format from ChatGLM API');
    }

    return this.createChatResponse(
      choice.message?.content || '',
      data.model || 'glm-4',
      data.usage ? {
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
      } : undefined,
      choice.message?.reasoning_content
    );
  }
}