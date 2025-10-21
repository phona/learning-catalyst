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
 * SiliconFlow Provider implementation
 * Converted from Python SiliconFlow provider
 */
export class SiliconFlowProvider extends BaseAIProvider {
  private static readonly DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1';

  constructor() {
    super('siliconflow', 'siliconflow');
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    if (!this.config.api_key) {
      throw new Error('API key is required for SiliconFlow');
    }

    if (!this.config.base_url) {
      this.config.base_url = SiliconFlowProvider.DEFAULT_BASE_URL;
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

    // TODO: Implement actual SiliconFlow API integration
    console.log('SiliconFlow send message:', { messages, options: finalOptions });

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
          model_id: 'qwen/Qwen2.5-7B-Instruct',
          name: 'Qwen2.5 7B Instruct',
          provider: this.name,
          type: ModelType.CHAT,
          description: 'Qwen2.5 7B instruction model',
          max_tokens: 32768,
        },
        {
          model_id: 'deepseek-ai/DeepSeek-V2.5',
          name: 'DeepSeek V2.5',
          provider: this.name,
          type: ModelType.CHAT,
          description: 'DeepSeek V2.5 model',
          max_tokens: 8192,
        },
      ],
      embedding: [],
      rerank: [],
    };
  }

  private async mockResponse(): Promise<ChatResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.createChatResponse(
      'This is a placeholder response from SiliconFlow. The actual implementation will connect to the SiliconFlow API.',
      'qwen/Qwen2.5-7B-Instruct',
      {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80,
      }
    );
  }

  private async *mockStreamResponse(): AsyncGenerator<StreamChunk> {
    yield this.createStreamChunk('This is a streaming response from SiliconFlow. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('SiliconFlow provides access to various open-source models. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('The actual implementation will connect to their API infrastructure.');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('Response complete!');
    yield this.createStreamChunk(undefined, undefined, true);
  }
}