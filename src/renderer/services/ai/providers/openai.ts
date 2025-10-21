import axios, { AxiosInstance } from 'axios';
import { BaseAIProvider } from '../base';
import type {
  Message,
  ChatOptions,
  StreamChunk,
  ChatResponse,
  ModelList,
  AIModel,
  ModelType,
  ProviderConfig,
  AuthenticationError,
  RateLimitError,
  ModelNotFoundError,
  TimeoutError,
  ProviderError,
} from '@/types/ai';

/**
 * OpenAI Provider implementation
 * Converted from Python OpenAI provider
 */
export class OpenAIProvider extends BaseAIProvider {
  private client: AxiosInstance | null = null;
  private static readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1';

  constructor() {
    super('openai', 'openai');
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    if (!this.config.api_key) {
      throw new AuthenticationError(this.name, 'API key is required');
    }

    this.client = axios.create({
      baseURL: this.config.base_url || OpenAIProvider.DEFAULT_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
        ...(this.config.organization_id && {
          'OpenAI-Organization': this.config.organization_id,
        }),
        ...this.config.custom_headers,
      },
      timeout: this.config.timeout || 30000,
    });

    this.initialized = true;
  }

  async validateConfig(config: ProviderConfig): Promise<boolean> {
    try {
      if (!config.api_key) {
        return false;
      }

      // Test with a simple models list request
      const testClient = axios.create({
        baseURL: config.base_url || OpenAIProvider.DEFAULT_BASE_URL,
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      await testClient.get('/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsThinking(): boolean {
    return false;
  }

  async sendMessage(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse | AsyncGenerator<StreamChunk>> {
    this.validateMessages(messages);
    const finalOptions = this.validateOptions(options);

    if (!this.client) {
      throw new ProviderError(this.name, 'Provider not initialized');
    }

    if (finalOptions.stream) {
      return this.sendStreamingMessage(messages, finalOptions);
    } else {
      return this.sendNonStreamingMessage(messages, finalOptions);
    }
  }

  private async sendNonStreamingMessage(
    messages: Message[],
    options: ChatOptions
  ): Promise<ChatResponse> {
    try {
      const response = await this.retryWithBackoff(async () => {
        if (!this.client) throw new Error('Client not initialized');
        return this.client.post('/chat/completions', {
          model: options.model || 'gpt-3.5-turbo',
          messages: this.formatMessages(messages),
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
        });
      });

      const data = response.data;
      const choice = data.choices[0];

      if (!choice) {
        throw new ProviderError(this.name, 'No response choice returned');
      }

      return this.createChatResponse(
        choice.message.content || '',
        data.model,
        this.formatTokenUsage(data.usage)
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  private async *sendStreamingMessage(
    messages: Message[],
    options: ChatOptions
  ): AsyncGenerator<StreamChunk> {
    try {
      const response = await this.retryWithBackoff(async () => {
        if (!this.client) throw new Error('Client not initialized');
        return this.client.post('/chat/completions', {
          model: options.model || 'gpt-3.5-turbo',
          messages: this.formatMessages(messages),
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stop: options.stop,
          stream: true,
        }, {
          responseType: 'stream',
        });
      });

      if (!response.data) {
        throw new ProviderError(this.name, 'No stream data received');
      }

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield this.createStreamChunk(undefined, undefined, true);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                yield this.createStreamChunk(delta.content);
              }

              if (parsed.choices?.[0]?.finish_reason === 'stop') {
                yield this.createStreamChunk(undefined, undefined, true);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async listModels(): Promise<ModelList> {
    try {
      if (!this.client) {
        throw new ProviderError(this.name, 'Provider not initialized');
      }

      const response = await this.client.get('/models');
      const models = response.data.data || [];

      const chatModels: AIModel[] = [];
      const embeddingModels: AIModel[] = [];

      for (const model of models) {
        const aiModel: AIModel = {
          model_id: model.id,
          name: model.id,
          provider: this.name,
          type: this.inferModelType(model.id),
          description: model.id,
          max_tokens: this.getMaxTokensForModel(model.id),
        };

        if (aiModel.type === ModelType.CHAT) {
          chatModels.push(aiModel);
        } else if (aiModel.type === ModelType.EMBEDDING) {
          embeddingModels.push(aiModel);
        }
      }

      return {
        chat: chatModels,
        embedding: embeddingModels,
        rerank: [],
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private formatMessages(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
    }));
  }

  private inferModelType(modelId: string): ModelType {
    if (modelId.includes('embedding') || modelId.includes('text-embedding')) {
      return ModelType.EMBEDDING;
    }
    return ModelType.CHAT;
  }

  private getMaxTokensForModel(modelId: string): number {
    // Approximate token limits for different models
    if (modelId.includes('gpt-4')) {
      return modelId.includes('32k') ? 32768 : 8192;
    }
    if (modelId.includes('gpt-3.5')) {
      return modelId.includes('16k') ? 16384 : 4096;
    }
    return 4096; // Default
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      switch (status) {
        case 401:
          throw new AuthenticationError(this.name, data?.error?.message || 'Invalid API key');
        case 429:
          throw new RateLimitError(this.name, data?.error?.message || 'Rate limit exceeded');
        case 404:
          throw new ModelNotFoundError(data?.model || 'unknown', this.name);
        case 408:
          throw new TimeoutError(this.name, 'Request timed out');
        default:
          throw new ProviderError(this.name, data?.error?.message || `HTTP ${status}`);
      }
    }

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new TimeoutError(this.name, error.message);
    }

    throw new ProviderError(this.name, error.message || 'Unknown error');
  }
}