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
 * DeepSeek Provider implementation
 * Converted from Python DeepSeek provider
 */
export class DeepSeekProvider extends BaseAIProvider {
  private static readonly DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';

  constructor() {
    super('deepseek', 'deepseek');
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    if (!this.config.api_key) {
      throw new Error('API key is required for DeepSeek');
    }

    if (!this.config.base_url) {
      this.config.base_url = DeepSeekProvider.DEFAULT_BASE_URL;
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
    return false;
  }

  async sendMessage(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse | AsyncGenerator<StreamChunk>> {
    this.validateMessages(messages);
    const finalOptions = this.validateOptions(options);

    // TODO: Implement actual DeepSeek API integration
    console.log('DeepSeek send message:', { messages, options: finalOptions });

    if (finalOptions.stream) {
      return this.mockStreamResponse();
    } else {
      return this.mockResponse();
    }
  }

  async listModels(): Promise<ModelList> {
    // TODO: Implement actual model listing
    return {
      chat: [
        {
          model_id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          provider: this.name,
          type: ModelType.CHAT,
          description: 'DeepSeek chat model',
          max_tokens: 4096,
        },
        {
          model_id: 'deepseek-coder',
          name: 'DeepSeek Coder',
          provider: this.name,
          type: ModelType.CHAT,
          description: 'DeepSeek coding model',
          max_tokens: 4096,
        },
      ],
      embedding: [],
      rerank: [],
    };
  }

  private async mockResponse(): Promise<ChatResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.createChatResponse(
      'This is a placeholder response from DeepSeek. The actual implementation will connect to the DeepSeek API.',
      'deepseek-chat',
      {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80,
      }
    );
  }

  private async *mockStreamResponse(): AsyncGenerator<StreamChunk> {
    yield this.createStreamChunk('This is a streaming response from DeepSeek. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('The actual implementation will provide real AI responses. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('DeepSeek is known for strong coding and reasoning capabilities.');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('Response complete!');
    yield this.createStreamChunk(undefined, undefined, true);
  }
}