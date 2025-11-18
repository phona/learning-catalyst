/**
 * AI-related type definitions
 */

export interface ModelConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  provider?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  modelConfig: ModelConfig;
  stream?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface EmbeddingParams {
  input: string | string[];
  modelConfig: ModelConfig;
}

export interface EmbeddingResult {
  embeddings: number[] | number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface ModelProvider {
  chatCompletion: (params: ChatCompletionParams) => Promise<ChatCompletionResult>;
  embedding: (params: EmbeddingParams) => Promise<EmbeddingResult>;
  validateConfig: (config: ModelConfig) => boolean;
}

export interface ModelType {
  id: string;
  name: string;
  provider: 'openai' | 'chatglm' | 'deepseek' | 'local' | 'ollama';
  maxTokens: number;
  description: string;
  pricing?: {
    inputCost: number; // Cost per 1K tokens
    outputCost: number; // Cost per 1K tokens
  };
}
