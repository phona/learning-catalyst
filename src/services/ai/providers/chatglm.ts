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

    // TODO: Implement actual ChatGLM API integration
    console.log('ChatGLM send message:', { messages, options: finalOptions });

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
          model_id: 'glm-4',
          name: 'GLM-4',
          provider: this.name,
          type: ModelType.CHAT,
          description: 'Latest GLM model',
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
      ],
      embedding: [],
      rerank: [],
    };
  }

  private async mockResponse(): Promise<ChatResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.createChatResponse(
      'This is a placeholder response from ChatGLM. The actual implementation will connect to the ChatGLM API with thinking support.',
      'glm-4',
      {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80,
      },
      'This is the thinking process from ChatGLM.'
    );
  }

  private async *mockStreamResponse(): AsyncGenerator<StreamChunk> {
    // Simulate thinking process
    yield this.createStreamChunk(
      undefined,
      'Let me think about this question step by step...\n'
    );
    await new Promise(resolve => setTimeout(resolve, 500));

    yield this.createStreamChunk(
      undefined,
      'First, I need to understand the core concepts involved.\n'
    );
    await new Promise(resolve => setTimeout(resolve, 500));

    yield this.createStreamChunk(
      undefined,
      'Now I can formulate a comprehensive answer.\n'
    );
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start actual response
    yield this.createStreamChunk('This is the beginning of my response. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('I\'m thinking as I generate this content. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('This demonstrates the streaming capability. ');
    await new Promise(resolve => setTimeout(resolve, 300));

    yield this.createStreamChunk('Response complete!');
    yield this.createStreamChunk(undefined, undefined, true);
  }
}