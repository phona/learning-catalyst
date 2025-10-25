import axios, { AxiosInstance } from 'axios';
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
  private client: AxiosInstance | null = null;

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

    this.client = axios.create({
      baseURL: this.config.base_url,
      headers: {
        'Authorization': `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
      },
      timeout: this.config.timeout || 30000,
    });

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

  /**
   * Infer model type based on model ID naming patterns
   */
  private inferModelType(modelId: string): ModelType {
    const id = modelId.toLowerCase();

    // Check for embedding models
    if (id.includes('embedding') || id.includes('embed')) {
      return ModelType.EMBEDDING;
    }

    // Check for rerank models
    if (id.includes('rerank') || id.includes('re-rank')) {
      return ModelType.RERANK;
    }

    // Default to chat model for everything else
    return ModelType.CHAT;
  }

  /**
   * Get max tokens for a model based on its family
   */
  private getMaxTokensForModel(modelId: string): number {
    const id = modelId.toLowerCase();

    // Large models typically have higher token limits
    if (id.includes('70b') || id.includes('72b') || id.includes('8x7b')) {
      return 8192;
    }
    if (id.includes('32b') || id.includes('34b') || id.includes('405b')) {
      return 4096;
    }
    if (id.includes('13b') || id.includes('14b')) {
      return 16384;
    }
    if (id.includes('7b') || id.includes('8b')) {
      return 32768;
    }

    // Default fallback
    return 4096;
  }

  /**
   * Extract model name from model ID
   */
  private extractModelName(modelId: string): string {
    // Split by common separators and take the last meaningful part
    const parts = modelId.split(/[/\\]/);
    let name = parts[parts.length - 1];

    // Remove common suffixes
    name = name.replace(/-(chat|instruct|base|v\d+(\.\d+)*)$/i, '');

    return name || modelId;
  }

  async listModels(): Promise<ModelList> {
    try {
      if (!this.client) {
        throw new Error('SiliconFlow provider not initialized');
      }

      const response = await this.client.get('/models');
      const models = response.data.data || [];

      const chatModels: AIModel[] = [];
      const embeddingModels: AIModel[] = [];
      const rerankModels: AIModel[] = [];

      for (const model of models) {
        const aiModel: AIModel = {
          model_id: model.id,
          name: this.extractModelName(model.id),
          provider: this.name,
          type: this.inferModelType(model.id),
          description: model.id,
          max_tokens: this.getMaxTokensForModel(model.id),
        };

        // Categorize models based on inferred type
        switch (aiModel.type) {
          case ModelType.CHAT:
            chatModels.push(aiModel);
            break;
          case ModelType.EMBEDDING:
            embeddingModels.push(aiModel);
            break;
          case ModelType.RERANK:
            rerankModels.push(aiModel);
            break;
        }
      }

      return {
        chat: chatModels,
        embedding: embeddingModels,
        rerank: rerankModels,
      };
    } catch (error) {
      console.error('Failed to fetch SiliconFlow models:', error);

      // Return fallback hardcoded models if API call fails
      return {
        chat: [
          {
            model_id: 'Qwen/Qwen2.5-7B-Instruct',
            name: 'Qwen2.5 7B Instruct',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'Qwen2.5 7B instruction model',
            max_tokens: 32768,
          },
          {
            model_id: 'deepseek-ai/DeepSeek-V3',
            name: 'DeepSeek V3',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'DeepSeek V3 model',
            max_tokens: 8192,
          },
          {
            model_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
            name: 'Meta Llama 3.1 8B Instruct',
            provider: this.name,
            type: ModelType.CHAT,
            description: 'Meta Llama 3.1 8B instruction model',
            max_tokens: 32768,
          },
        ],
        embedding: [
          {
            model_id: 'BAAI/bge-large-en-v1.5',
            name: 'BGE Large English v1.5',
            provider: this.name,
            type: ModelType.EMBEDDING,
            description: 'BGE large English embedding model v1.5',
            max_tokens: 1024,
          },
          {
            model_id: 'BAAI/bge-large-zh-v1.5',
            name: 'BGE Large Chinese v1.5',
            provider: this.name,
            type: ModelType.EMBEDDING,
            description: 'BGE large Chinese embedding model v1.5',
            max_tokens: 1024,
          },
        ],
        rerank: [
          {
            model_id: 'BAAI/bge-reranker-v2-m3',
            name: 'BGE Reranker v2-m3',
            provider: this.name,
            type: ModelType.RERANK,
            description: 'BGE reranker model v2-m3',
            max_tokens: 512,
          },
        ],
      };
    }
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