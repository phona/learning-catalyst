/**
 * LangChain Service Main Thread
 *
 * Main thread LangChain integration service that provides access to
 * LangChain models, agents, chains, and tools. This service runs
 * in the main thread where Node.js APIs are available for proper
 * LangChain functionality.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ServiceConfig, ServiceExecutionContext } from '../types';
import { LoggerFactory } from '../logger';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { ModelFactory } from './ModelFactory';
import { ProviderConfig, ProviderType } from '@/shared/types/config';

export interface LangChainServiceConfig {
  defaultProvider: string;
  modelConfigs: Record<string, any>;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface ModelProvider {
  name: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  providerType: ProviderType;
  langchainModel?: ChatOpenAI; // Real LangChain model instance
}

export interface StreamingResponse {
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    provider: string;
    timestamp: number;
  };
  isComplete: boolean;
}

/**
 * Main thread LangChain service
 */
export class LangChainServiceMain {
  private readonly config: LangChainServiceConfig;
  private readonly logger: any;
  private readonly als: AsyncLocalStorage<ServiceExecutionContext>;
  private initialized = false;
  private readonly providers: Map<string, ModelProvider> = new Map();

  constructor(config: LangChainServiceConfig) {
    this.config = config;
    const loggerFactory = LoggerFactory.getInstance();
    this.logger = loggerFactory.createContextAwareLogger();
    this.als = loggerFactory.getAsyncLocalStorage();

    this.logger.info('LangChain service main created');
  }

  /**
   * Initialize LangChain service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('LangChain service already initialized');
    }

    try {
      this.logger.info('Initializing LangChain service...');

      // Initialize model providers
      await this.initializeProviders();

      // Validate configurations
      await this.validateConfigurations();

      // Validate that default provider exists
      if (!this.providers.has(this.config.defaultProvider)) {
        throw new Error(`Default provider '${this.config.defaultProvider}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
      }

      this.initialized = true;
      this.logger.info('✅ LangChain service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize LangChain service', error as Error);
      throw error;
    }
  }

  /**
   * Initialize model providers
   */
  private async initializeProviders(): Promise<void> {
    this.logger.info('Initializing model providers...');

    // Register default providers
    const defaultProviders: Array<{name: string, providerType: ProviderType, modelId: string}> = [
      {
        name: 'openai',
        providerType: 'openai',
        modelId: 'gpt-3.5-turbo'
      },
      {
        name: 'chatglm',
        providerType: 'chatglm',
        modelId: 'glm-4'
      },
      {
        name: 'deepseek',
        providerType: 'deepseek',
        modelId: 'deepseek-chat'
      },
      {
        name: 'siliconflow',
        providerType: 'siliconflow',
        modelId: 'qwen2.5-7b-instruct'
      }
    ];

    for (const defaultProvider of defaultProviders) {
      try {
        // Create provider configuration
        const providerConfig: ProviderConfig = {
          type: defaultProvider.providerType,
          provider_type: defaultProvider.providerType,
          model: defaultProvider.modelId,
          api_key: undefined, // Will be set via updateProvider later
          base_url: undefined, // Will be set via updateProvider later
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          streaming: true
        };

        // Create LangChain model
        const langchainModel = ModelFactory.createModel(defaultProvider.providerType, providerConfig);

        const provider: ModelProvider = {
          name: defaultProvider.name,
          modelId: defaultProvider.modelId,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
          providerType: defaultProvider.providerType,
          langchainModel
        };

        this.providers.set(provider.name, provider);
        this.logger.info(`✅ Registered provider: ${provider.name} with model: ${provider.modelId}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize provider ${defaultProvider.name}:`, error);
        // Continue with other providers even if one fails
      }
    }

    // Add custom providers from config
    if (this.config.modelConfigs) {
      this.logger.info(`Processing ${Object.keys(this.config.modelConfigs).length} custom providers from config`);
      for (const [name, config] of Object.entries(this.config.modelConfigs)) {
        try {
          this.logger.info(`Processing custom provider: ${name} with modelId: "${config.modelId}"`);

          // Validate provider configuration before creating model
          if (!config.modelId || config.modelId.trim() === '') {
            this.logger.warn(`Provider ${name} missing modelId - skipping registration`);
            continue; // Skip this provider and continue with others
          }

          // Determine provider type from config or detect from base URL
          let providerType: ProviderType = 'openai-compatible';
          if (config.providerType) {
            providerType = config.providerType as ProviderType;
          } else if (config.baseUrl) {
            const detected = ModelFactory.detectProviderType(config.baseUrl);
            if (detected) providerType = detected;
          }

          // Create provider configuration
          const providerConfig: ProviderConfig = {
            type: providerType,
            provider_type: providerType,
            model: config.modelId || 'default',
            api_key: config.apiKey,
            base_url: config.baseUrl,
            temperature: config.temperature || this.config.temperature,
            max_tokens: config.maxTokens || this.config.maxTokens,
            streaming: true
          };

          // Create LangChain model
          const langchainModel = ModelFactory.createModel(providerType, providerConfig);

          const provider: ModelProvider = {
            name,
            modelId: config.modelId || 'default',
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            maxTokens: config.maxTokens || this.config.maxTokens,
            temperature: config.temperature || this.config.temperature,
            providerType,
            langchainModel
          };

          this.providers.set(name, provider);
          this.logger.info(`✅ Registered custom provider: ${name} with model: ${provider.modelId}`);
        } catch (error) {
          this.logger.warn(`Failed to initialize custom provider ${name}:`, error);
          this.logger.info(`Error details for provider ${name}:`, { modelName: config.modelId, hasApiKey: !!config.apiKey, error: error.message });
        }
      }
    }
  }

  /**
   * Validate provider configurations
   */
  private async validateConfigurations(): Promise<void> {
    this.logger.info('Validating provider configurations...');

    for (const [name, provider] of this.providers) {
      // Validate required fields
      if (!provider.modelId) {
        throw new Error(`Provider ${name} missing modelId`);
      }

      // Validate API key for providers that require it
      if (['openai', 'anthropic'].includes(name) && !provider.apiKey) {
        this.logger.warn(`Provider ${name} missing API key - may not work properly`);
      }

      this.logger.debug(`Provider ${name} configuration validated`);
    }
  }

  /**
   * Get available providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider configuration
   */
  getProvider(name: string): ModelProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Generate chat response (non-streaming)
   */
  async generateChatResponse(
    providerName: string,
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<StreamingResponse> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const provider = this.providers.get(providerName);
    if (!provider?.langchainModel) {
      throw new Error(`Provider ${providerName} not found or not properly initialized`);
    }

    return this.runWithContext('generate-chat-response', async () => {
      this.logger.info(`Generating chat response using provider: ${providerName}`);

      try {
        // Convert messages to LangChain format
        const langchainMessages = this.convertToLangChainMessages(messages, options?.systemPrompt);

        // Create a new model instance with custom options if provided
        let model = provider.langchainModel;
        if (options?.temperature !== undefined || options?.maxTokens !== undefined) {
          const modelConfig: ProviderConfig = {
            type: provider.providerType,
            provider_type: provider.providerType,
            model: provider.modelId,
            api_key: provider.apiKey,
            base_url: provider.baseUrl,
            temperature: options.temperature ?? provider.temperature,
            max_tokens: options.maxTokens ?? provider.maxTokens,
            streaming: false
          };
          model = ModelFactory.createModel(provider.providerType, modelConfig);
        }

        // Generate response using LangChain
        const startTime = Date.now();
        const response = await model.invoke(langchainMessages);
        const endTime = Date.now();

        // Extract content and estimate tokens
        const rawContent = typeof response.content === 'string' ? response.content : response.content?.toString() || '';
        const content = rawContent || 'Error: No content generated';
        const tokensUsed = this.estimateTokens(content);

        // Create defensive metadata with defaults
        const metadata = {
          model: provider.modelId || 'unknown',
          tokensUsed,
          provider: providerName,
          timestamp: Date.now(),
          responseTime: endTime - startTime
        };

        const result: StreamingResponse = {
          content,
          metadata,
          isComplete: true
        };

        this.logger.info(`✅ Chat response generated from ${providerName}`, {
          model: provider.modelId,
          tokensUsed,
          responseTime: endTime - startTime
        });

        return result;

      } catch (error) {
        this.logger.error(`Failed to generate chat response from ${providerName}:`, error as Error);
        throw new Error(`LangChain API error: ${(error as Error).message}`);
      }
    });
  }

  /**
   * Execute agent (non-streaming)
   */
  async executeAgent(
    providerName: string,
    agentConfig: {
      systemPrompt?: string;
      instructions?: string;
      tools?: any[];
    },
    input: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    response: string;
    metadata: {
      model: string;
      tokensUsed: number;
      provider: string;
      timestamp: number;
    };
  }> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const provider = this.providers.get(providerName);
    if (!provider?.langchainModel) {
      throw new Error(`Provider ${providerName} not found or not properly initialized`);
    }

    return this.runWithContext('execute-agent', async () => {
      this.logger.info(`Executing agent using provider: ${providerName}`);

      try {
        // Prepare messages
        const messages: Array<{ role: string; content: string }> = [
          { role: 'user', content: input }
        ];

        // Add system prompt if provided
        const systemPrompt = agentConfig.systemPrompt || agentConfig.instructions;

        // Generate response using existing chat method
        const response = await this.generateChatResponse(providerName, messages, {
          systemPrompt,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens
        });

        return {
          response: response.content,
          metadata: response.metadata
        };

      } catch (error) {
        this.logger.error(`Failed to execute agent with ${providerName}:`, error as Error);
        throw new Error(`Agent execution error: ${(error as Error).message}`);
      }
    });
  }

  /**
   * Execute agent (streaming)
   */
  async *executeAgentStream(
    providerName: string,
    agentConfig: {
      systemPrompt?: string;
      instructions?: string;
      tools?: any[];
    },
    input: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<{
    content: string;
    metadata: {
      model: string;
      tokensUsed: number;
      provider: string;
      timestamp: number;
    };
    isComplete: boolean;
  }> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const provider = this.providers.get(providerName);
    if (!provider?.langchainModel) {
      throw new Error(`Provider ${providerName} not found or not properly initialized`);
    }

    yield* this.runWithContextGenerator('execute-agent-stream', async function* () {
      this.logger.info(`Executing agent stream using provider: ${providerName}`);

      try {
        // Prepare messages
        const messages: Array<{ role: string; content: string }> = [
          { role: 'user', content: input }
        ];

        // Add system prompt if provided
        const systemPrompt = agentConfig.systemPrompt || agentConfig.instructions;

        // Generate streaming response using existing method
        yield* this.generateStreamingChatResponse(providerName, messages, {
          systemPrompt,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens
        });

      } catch (error) {
        this.logger.error(`Failed to execute agent stream with ${providerName}:`, error as Error);
        throw new Error(`Agent stream execution error: ${(error as Error).message}`);
      }
    }.bind(this));
  }

  /**
   * Generate streaming chat response
   */
  async *generateStreamingChatResponse(
    providerName: string,
    messages: Array<{ role: string; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<StreamingResponse> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const provider = this.providers.get(providerName);
    if (!provider?.langchainModel) {
      throw new Error(`Provider ${providerName} not found or not properly initialized`);
    }

    yield* this.runWithContextGenerator('generate-streaming-chat-response', async function* () {
      this.logger.info(`Generating streaming chat response using provider: ${providerName}`);

      try {
        // Convert messages to LangChain format
        const langchainMessages = this.convertToLangChainMessages(messages, options?.systemPrompt);

        // Create a new model instance with custom options if provided
        let model = provider.langchainModel;
        if (options?.temperature !== undefined || options?.maxTokens !== undefined) {
          const modelConfig: ProviderConfig = {
            type: provider.providerType,
            provider_type: provider.providerType,
            model: provider.modelId,
            api_key: provider.apiKey,
            base_url: provider.baseUrl,
            temperature: options.temperature ?? provider.temperature,
            max_tokens: options.maxTokens ?? provider.maxTokens,
            streaming: true
          };
          model = ModelFactory.createModel(provider.providerType, modelConfig);
        }

        const startTime = Date.now();
        let totalTokens = 0;
        let accumulatedContent = '';

        // Stream response using LangChain
        const stream = await model.stream(langchainMessages);

        for await (const chunk of stream) {
          const chunkContent = typeof chunk.content === 'string' ? chunk.content : chunk.content.toString();
          accumulatedContent += chunkContent;
          const chunkTokens = this.estimateTokens(chunkContent);
          totalTokens += chunkTokens;

          const response: StreamingResponse = {
            content: chunkContent,
            metadata: {
              model: provider.modelId,
              tokensUsed: chunkTokens,
              provider: providerName,
              timestamp: Date.now(),
              accumulatedTokens: totalTokens,
              responseTime: Date.now() - startTime
            },
            isComplete: false
          };

          yield response;
        }

        // Send final completion message
        const completionResponse: StreamingResponse = {
          content: '',
          metadata: {
            model: provider.modelId,
            tokensUsed: 0,
            provider: providerName,
            timestamp: Date.now(),
            totalTokens,
            responseTime: Date.now() - startTime,
            isCompletion: true
          },
          isComplete: true
        };

        yield completionResponse;

        this.logger.info(`✅ Streaming chat response completed from ${providerName}`, {
          model: provider.modelId,
          totalTokens,
          responseTime: Date.now() - startTime
        });

      } catch (error) {
        this.logger.error(`Failed to generate streaming chat response from ${providerName}:`, error as Error);

        // Yield error response
        const errorResponse: StreamingResponse = {
          content: `Error: ${(error as Error).message}`,
          metadata: {
            model: provider.modelId,
            tokensUsed: 0,
            provider: providerName,
            timestamp: Date.now(),
            isError: true
          },
          isComplete: true
        };

        yield errorResponse;
      }
    }.bind(this));
  }

  /**
   * Execute function within execution context
   */
  async runWithContext<T>(
    operation: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const context = { service: 'langchain-service', operation };
    return new Promise<T>((resolve, reject) => {
      this.als.run(context, async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Execute async generator within execution context
   */
  async *runWithContextGenerator<T>(
    operation: string,
    fn: () => AsyncGenerator<T>
  ): AsyncGenerator<T> {
    if (!this.initialized) {
      throw new Error('LangChain service not initialized');
    }

    const context = { service: 'langchain-service', operation };

    // Run the generator function within context and yield from it
    const generator = await new Promise<AsyncGenerator<T>>((resolve, reject) => {
      this.als.run(context, async () => {
        try {
          const gen = fn();
          resolve(gen);
        } catch (error) {
          reject(error);
        }
      });
    });

    yield* generator;
  }

  /**
   * Get service configuration
   */
  getConfig(): LangChainServiceConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  async updateProvider(name: string, config: Partial<ModelProvider>): Promise<void> {
    const existingProvider = this.providers.get(name);
    if (!existingProvider) {
      throw new Error(`Provider ${name} not found`);
    }

    try {
      // Create updated provider configuration
      const updatedProvider: ModelProvider = {
        ...existingProvider,
        ...config
      };

      // If LangChain-related fields changed, recreate the model
      if (config.apiKey !== undefined || config.baseUrl !== undefined ||
          config.modelId !== undefined || config.temperature !== undefined ||
          config.maxTokens !== undefined) {

        const providerConfig: ProviderConfig = {
          type: updatedProvider.providerType,
          provider_type: updatedProvider.providerType,
          model: updatedProvider.modelId,
          api_key: updatedProvider.apiKey,
          base_url: updatedProvider.baseUrl,
          temperature: updatedProvider.temperature,
          max_tokens: updatedProvider.maxTokens,
          streaming: true
        };

        // Recreate LangChain model with new configuration
        updatedProvider.langchainModel = ModelFactory.createModel(updatedProvider.providerType, providerConfig);

        this.logger.info(`✅ Recreated LangChain model for provider: ${name}`);
      }

      this.providers.set(name, updatedProvider);
      this.logger.info(`✅ Updated provider configuration: ${name}`);

    } catch (error) {
      this.logger.error(`Failed to update provider ${name}:`, error as Error);
      throw new Error(`Failed to update provider configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Convert messages to LangChain format
   */
  private convertToLangChainMessages(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Array<HumanMessage | AIMessage | SystemMessage> {
    const langchainMessages: Array<HumanMessage | AIMessage | SystemMessage> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      langchainMessages.push(new SystemMessage(systemPrompt));
    }

    // Convert other messages
    for (const message of messages) {
      switch (message.role.toLowerCase()) {
      case 'system':
        langchainMessages.push(new SystemMessage(message.content));
        break;
      case 'user':
      case 'human':
        langchainMessages.push(new HumanMessage(message.content));
        break;
      case 'assistant':
      case 'ai':
        langchainMessages.push(new AIMessage(message.content));
        break;
      default:
        // Default to human message for unknown roles
        langchainMessages.push(new HumanMessage(message.content));
        break;
      }
    }

    return langchainMessages;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Simple token estimation: ~4 characters per token for English
    // This is a rough approximation - real tokenization depends on the model
    return Math.ceil(text.length / 4);
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: number;
    lastCheck: number;
    details: Record<string, any>;
  }> {
    try {
      const providerCount = this.providers.size;
      const hasDefaultProvider = this.providers.has(this.config.defaultProvider);
      const workingProviders = Array.from(this.providers.values()).filter(p => p.langchainModel).length;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!hasDefaultProvider || workingProviders === 0) {
        status = 'unhealthy';
      } else if (workingProviders < providerCount) {
        status = 'degraded';
      }

      return {
        status,
        providers: providerCount,
        lastCheck: Date.now(),
        details: {
          defaultProvider: this.config.defaultProvider,
          availableProviders: this.getProviders(),
          workingProviders,
          initialized: this.initialized
        }
      };
    } catch (error) {
      // Handle health check failures gracefully
      this.logger.warn('Health check failed', error as Error);
      return {
        status: 'unhealthy',
        providers: 0,
        lastCheck: Date.now(),
        details: {
          error: (error as Error).message,
          initialized: this.initialized
        }
      };
    }
  }

  /**
   * Dispose of LangChain service
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing LangChain service...');

    // Clear providers
    this.providers.clear();

    this.initialized = false;
    this.logger.info('✅ LangChain service disposed');
  }
}

/**
 * Create LangChain service instance
 */
export function createLangChainService(config: LangChainServiceConfig): LangChainServiceMain {
  return new LangChainServiceMain(config);
}

/**
 * Default LangChain service configuration
 */
export const DEFAULT_LANGCHAIN_CONFIG: LangChainServiceConfig = {
  defaultProvider: 'openai',
  modelConfigs: {},
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30000
};