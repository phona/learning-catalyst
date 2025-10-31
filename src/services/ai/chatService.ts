import { AIProviderFactory } from './factory';
import type {
  Message,
  ChatOptions,
  StreamChunk,
  ChatResponse,
} from '@/types/ai';
import type { Session } from '@/types/session';
import { useConfigStore } from '@/stores/useConfigStore';

/**
 * Chat service to manage AI interactions
 * Connects AI providers with the chat interface
 */
export class ChatService {
  private static instance: ChatService;
  private currentProvider: any = null;
  private currentSession: Session | null = null;

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Initialize AI provider
   */
  async initializeProvider(providerName: string, providerConfig: any): Promise<void> {
    try {
      this.currentProvider = await AIProviderFactory.createProvider(providerName, providerConfig);
      console.log(`Initialized ${providerName} provider`);
    } catch (error) {
      console.error(`Failed to initialize ${providerName} provider:`, error);
      throw error;
    }
  }

  /**
   * Send a message to the AI provider
   */
  async sendMessage(
    content: string,
    session: Session,
    options?: ChatOptions
  ): Promise<AsyncGenerator<StreamChunk> | ChatResponse> {
    if (!this.currentProvider) {
      throw new Error('No AI provider initialized');
    }

    // Build message list
    const messages: Message[] = [
      // System prompt
      {
        id: 'system',
        role: 'system',
        content: session.context.system_prompt || this.getDefaultSystemPrompt(),
        timestamp: new Date(),
      },
      // Full conversation history from session
      ...session.messages.map(msg => ({
        ...msg,
        tokens_used: msg.tokens_used ? {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: msg.tokens_used
        } : undefined
      })),
      // Current user message
      {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      },
    ];

    // Get global config
    const { config } = useConfigStore.getState();
    const globalChatConfig = config?.ai?.model_types?.chat;

    // Send to provider with global config (not session context)
    const mergedOptions = {
      ...options,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
      enable_thinking: options?.enable_thinking ?? false,
      model: options?.model,
    };

    return await this.currentProvider.sendMessage(messages, mergedOptions);
  }

  /**
   * Get available models from current provider
   */
  async getAvailableModels(): Promise<any[]> {
    if (!this.currentProvider) {
      return [];
    }

    try {
      const modelList = await this.currentProvider.listModels();
      return modelList.chat || [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Check if current provider supports thinking
   */
  supportsThinking(): boolean {
    return this.currentProvider?.supportsThinking() || false;
  }

  /**
   * Check if current provider supports streaming
   */
  supportsStreaming(): boolean {
    return this.currentProvider?.supportsStreaming() || false;
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { name: string; type: string } | null {
    if (!this.currentProvider) {
      return null;
    }

    return {
      name: this.currentProvider.name,
      type: this.currentProvider.type,
    };
  }

  /**
   * Get default system prompt for learning
   */
  private getDefaultSystemPrompt(): string {
    return `You are Learning Catalyst, an AI-powered learning companion designed to help users understand concepts, solve problems, and expand their knowledge.

Your approach should be:
- Educational and patient
- Clear and well-structured explanations
- Include examples and analogies when helpful
- Ask follow-up questions to deepen understanding
- Provide step-by-step reasoning for complex problems
- Adapt to the user's learning style and level

Focus on:
1. Conceptual understanding over rote memorization
2. Practical applications and real-world examples
3. Building knowledge progressively
4. Encouraging curiosity and critical thinking

Remember to be encouraging, clear, and thorough in your explanations.`;
  }

  /**
   * Process streaming response
   */
  async *processStreamResponse(
    streamGenerator: AsyncGenerator<StreamChunk>
  ): AsyncGenerator<{
    content?: string;
    thinkingContent?: string;
    done: boolean;
    error?: string;
  }> {
    let accumulatedContent = '';
    let accumulatedThinking = '';

    try {
      for await (const chunk of streamGenerator) {
        if (chunk.error) {
          yield { error: chunk.error, done: false };
          return;
        }

        if (chunk.reasoning_content) {
          accumulatedThinking += chunk.reasoning_content;
          yield {
            thinkingContent: chunk.reasoning_content,
            done: false,
          };
        }

        if (chunk.content) {
          accumulatedContent += chunk.content;
          yield {
            content: chunk.content,
            done: false,
          };
        }

        if (chunk.done) {
          yield {
            content: '',
            thinkingContent: '',
            done: true,
          };
          break;
        }
      }
    } catch (error) {
      yield {
        error: error instanceof Error ? error.message : 'Stream processing failed',
        done: false,
      };
    }
  }

  /**
   * Set current session
   */
  setCurrentSession(session: Session): void {
    this.currentSession = session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Validate provider configuration
   */
  async validateProviderConfig(
    providerName: string,
    config: any
  ): Promise<boolean> {
    return await AIProviderFactory.validateProviderConfig(providerName, config);
  }

  /**
   * Get default configuration for a provider
   */
  getProviderDefaultConfig(providerName: string): any {
    return AIProviderFactory.getDefaultConfig(providerName);
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance();