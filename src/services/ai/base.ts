import type {
  AIProvider,
  ProviderConfig,
  Message,
  ChatOptions,
  StreamChunk,
  ChatResponse,
  ModelList,
  TokenUsage,
} from '@/types/ai';

/**
 * Abstract base class for AI providers
 * Converted from Python base provider classes
 */
export abstract class BaseAIProvider implements AIProvider {
  public readonly name: string;
  public readonly type: string;
  public initialized = false;
  public config: ProviderConfig;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    this.config = {
      name,
      api_key: '',
      timeout: 30000,
      max_retries: 3,
    };
  }

  abstract initialize(config: ProviderConfig): Promise<void>;
  abstract sendMessage(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse | AsyncGenerator<StreamChunk>>;
  abstract listModels(): Promise<ModelList>;
  abstract validateConfig(config: ProviderConfig): Promise<boolean>;

  supportsStreaming(): boolean {
    return true;
  }

  supportsThinking(): boolean {
    return false;
  }

  protected validateMessages(messages: Message[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have a role and content');
      }
    }
  }

  protected validateOptions(options?: ChatOptions): ChatOptions {
    const defaultOptions: ChatOptions = {
      temperature: 0.7,
      max_tokens: 4096,
      stream: false,
      enable_thinking: false,
    };

    return {
      ...defaultOptions,
      ...options,
      temperature: Math.max(0, Math.min(2, options?.temperature ?? 0.7)),
      max_tokens: Math.max(1, Math.min(32768, options?.max_tokens ?? 4096)),
    };
  }

  protected formatTokenUsage(usage: any): TokenUsage {
    return {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    };
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  protected createStreamChunk(
    content?: string,
    reasoningContent?: string,
    done?: boolean,
    usage?: TokenUsage,
    error?: string
  ): StreamChunk {
    return {
      content,
      reasoning_content: reasoningContent,
      done,
      usage,
      error,
    };
  }

  protected createChatResponse(
    content: string,
    model: string,
    usage?: TokenUsage,
    reasoningContent?: string
  ): ChatResponse {
    return {
      content,
      reasoning_content: reasoningContent,
      usage,
      model,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  /**
   * Check if this provider supports tools/function calling
   */
  supportsTools(): boolean {
    // Default implementation - most providers don't support tools
    return false;
  }
}