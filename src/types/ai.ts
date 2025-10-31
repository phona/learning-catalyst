/**
 * AI Provider and Model Types
 * Converted from Python AI integration layer
 */

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: Date;
  tool_calls?: ToolCall[];
  id?: string;
  provider?: string;
  thinking_content?: string;
  tokens_used?: TokenUsage;
  showThinking?: boolean; // Individual thinking visibility control
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface StreamChunk {
  content?: string;
  reasoning_content?: string;
  thinkingContent?: string; // Alias for reasoning_content for consistency
  done?: boolean;
  usage?: TokenUsage;
  error?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  content: string;
  reasoning_content?: string;
  usage?: TokenUsage;
  model: string;
  provider: string;
  timestamp: Date;
}

export interface AIModel {
  model_id: string;
  name: string;
  description?: string;
  max_tokens?: number;
  supports_thinking?: boolean;
  provider: string;
  type: ModelType;
}

export enum ModelType {
  CHAT = 'chat',
  EMBEDDING = 'embedding',
  RERANK = 'rerank'
}

export interface ProviderConfig {
  name: string;
  api_key: string;
  base_url?: string;
  timeout?: number;
  max_retries?: number;
  organization_id?: string;
  custom_headers?: Record<string, string>;
}

export interface AIProvider {
  name: string;
  type: string;
  initialized: boolean;
  config: ProviderConfig;

  initialize(config: ProviderConfig): Promise<void>;
  sendMessage(
    messages: Message[],
    options?: ChatOptions
  ): Promise<ChatResponse | AsyncGenerator<StreamChunk>>;
  listModels(): Promise<ModelList>;
  validateConfig(config: ProviderConfig): Promise<boolean>;
  supportsStreaming(): boolean;
  supportsThinking(): boolean;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  enable_thinking?: boolean;
  stop?: string[];
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  provider?: string;
  model?: string;
}

export interface ModelList {
  chat: AIModel[];
  embedding: AIModel[];
  rerank: AIModel[];
}

export interface ProviderFactory {
  providers: Map<string, () => AIProvider>;

  register(name: string, factory: () => AIProvider): void;
  create(name: string, config: ProviderConfig): AIProvider;
  getAvailableProviders(): string[];
  isProviderRegistered(name: string): boolean;
}

// Specific provider types
export interface OpenAIConfig extends ProviderConfig {
  organization_id?: string;
  base_url?: string;
}

export interface ChatGLMConfig extends ProviderConfig {
  base_url: string; // Required for ChatGLM
}

export interface DeepSeekConfig extends ProviderConfig {
  base_url: string; // Required for DeepSeek
}

export interface SiliconFlowConfig extends ProviderConfig {
  base_url: string; // Required for SiliconFlow
}

// Error types
export class AIError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AuthenticationError extends AIError {
  constructor(provider: string, message = 'Authentication failed') {
    super(message, provider, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ModelNotFoundError extends AIError {
  constructor(model: string, provider: string) {
    super(`Model '${model}' not found in provider '${provider}'`, provider, 'MODEL_NOT_FOUND');
    this.name = 'ModelNotFoundError';
  }
}

export class ProviderError extends AIError {
  constructor(provider: string, message: string) {
    super(message, provider, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends AIError {
  constructor(provider: string, message = 'Rate limit exceeded') {
    super(message, provider, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends AIError {
  constructor(provider: string, message = 'Request timed out') {
    super(message, provider, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}