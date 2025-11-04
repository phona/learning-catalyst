/**
 * LangChain Adapter for Existing AI Providers
 *
 * This module provides a bridge between LangChain and the existing AI provider system,
 * allowing seamless integration of LangChain capabilities with our current provider architecture.
 */

// Temporary interfaces until LangChain imports are fixed
interface BaseLanguageModel {
  invoke(messages: any[], options?: any): Promise<any>;
}

interface BaseChatModel extends BaseLanguageModel {
  _generate(messages: any[], options?: any, callbackManager?: any): Promise<any>;
  _stream(messages: any[], options?: any, callbackManager?: any): AsyncGenerator<any>;
  _llmType(): string;
}

interface CallbackManager {
  // Placeholder for callback manager
}

// Proper message classes that work with instanceof at runtime
export class HumanMessage {
  constructor(public content: string) {}
}

export class AIMessage {
  constructor(public content: string) {}
}

export class SystemMessage {
  constructor(public content: string) {}
}

export class BaseMessage {
  constructor(public content: string) {}
}
import { type AIProvider, Message, ChatOptions } from '@/shared/types/ai';
import { ModelConfig } from '@/shared/types/concept-parsing';

/**
 * Adapter class that wraps existing AI providers to be compatible with LangChain
 */
export class LangChainProviderAdapter implements BaseLanguageModel {
  private provider: AIProvider;
  private providerName: string;
  private modelId: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    provider: AIProvider,
    providerName: string,
    modelId: string,
    fields?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ) {
    this.provider = provider;
    this.providerName = providerName;
    this.modelId = modelId;
    this.temperature = fields?.temperature ?? 0.7;
    this.maxTokens = fields?.maxTokens ?? 2000;
  }

  /**
   * Invoke method for compatibility with LangChain interface
   */
  async invoke(messages: any[], options?: any): Promise<any> {
    // Convert messages to our format
    const internalMessages = this.convertLangChainMessages(messages);

    const chatOptions: ChatOptions = {
      temperature: options?.temperature ?? this.temperature,
      max_tokens: options?.maxTokens ?? this.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stream: false,
      provider: this.providerName,
      model: this.modelId
    };

    const response = await this.provider.sendMessage(internalMessages, chatOptions);
    return { content: response.content };
  }

  /**
   * Required by LangChain - returns the model identifier
   */
  _llmType(): string {
    return `${this.providerName}-${this.modelId}`;
  }

  /**
   * Convert LangChain messages to our internal Message format
   */
  private convertLangChainMessages(messages: BaseMessage[]): Message[] {
    return messages.map(msg => {
      if (msg instanceof HumanMessage) {
        return {
          role: 'user',
          content: msg.content as string,
          timestamp: new Date()
        };
      } else if (msg instanceof AIMessage) {
        return {
          role: 'assistant',
          content: msg.content as string,
          timestamp: new Date()
        };
      } else if (msg instanceof SystemMessage) {
        return {
          role: 'system',
          content: msg.content as string,
          timestamp: new Date()
        };
      }
      throw new Error(`Unsupported message type: ${msg.constructor.name}`);
    });
  }

  /**
   * Core method required by LangChain - handles message generation
   */
  async _generate(
    messages: BaseMessage[],
    options?: this['ParsedCallOptions'],
    callbackManager?: CallbackManager
  ): Promise<any> {
    try {
      // Convert LangChain messages to our format
      const internalMessages = this.convertLangChainMessages(messages);

      // Extract options from LangChain format
      const chatOptions: ChatOptions = {
        temperature: options?.temperature ?? this.temperature,
        max_tokens: options?.maxTokens ?? this.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stream: false,
        provider: this.providerName,
        model: this.modelId
      };

      // Call the underlying provider
      const response = await this.provider.sendMessage(internalMessages, chatOptions);

      // Convert response back to LangChain format
      const generation = {
        text: response.content,
        message: new AIMessage(response.content),
        generationInfo: {
          model: response.model,
          provider: response.provider,
          timestamp: response.timestamp,
          usage: response.usage
        }
      };

      return { generations: [generation] };
    } catch (error) {
      console.error(`Error in LangChain adapter for ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Streaming generation support (if provider supports it)
   */
  async *_stream(
    messages: BaseMessage[],
    options?: this['ParsedCallOptions'],
    callbackManager?: CallbackManager
  ): AsyncGenerator<any> {
    if (!this.provider.supportsStreaming()) {
      // Fallback to non-streaming if provider doesn't support streaming
      const result = await this._generate(messages, options, callbackManager);
      yield result.generations[0];
      return;
    }

    try {
      const internalMessages = this.convertLangChainMessages(messages);

      const chatOptions: ChatOptions = {
        temperature: options?.temperature ?? this.temperature,
        max_tokens: options?.maxTokens ?? this.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
        stream: true,
        provider: this.providerName,
        model: this.modelId
      };

      const streamResponse = await this.provider.sendMessage(internalMessages, chatOptions);

      if (typeof streamResponse === 'object' && Symbol.asyncIterator in streamResponse) {
        // Handle streaming response
        let accumulatedContent = '';
        for await (const chunk of streamResponse as AsyncGenerator<any>) {
          if (chunk.content) {
            accumulatedContent += chunk.content;
            yield {
              text: accumulatedContent,
              message: new AIMessage(accumulatedContent),
              generationInfo: {
                model: this.modelId,
                provider: this.providerName,
                isStreaming: true,
                chunk: chunk
              }
            };
          }
        }
      }
    } catch (error) {
      console.error(`Streaming error in LangChain adapter for ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): ModelConfig {
    return {
      name: this.modelId,
      provider: this.providerName,
      modelId: this.modelId,
      weight: 1.0,
      capabilities: [
        'chat',
        'extraction',
        'analysis',
        ...(this.provider.supportsStreaming() ? ['streaming'] : []),
        ...(this.provider.supportsThinking() ? ['thinking'] : []),
        ...(this.provider.supportsTools() ? ['tools'] : [])
      ],
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

/**
 * Factory class for creating LangChain-compatible model instances
 */
export class LangChainModelFactory {
  private static adapters = new Map<string, LangChainProviderAdapter>();

  /**
   * Create a LangChain-compatible model from an existing AI provider
   */
  static async createModel(
    provider: AIProvider,
    providerName: string,
    modelId: string,
    config?: Partial<ModelConfig>
  ): Promise<LangChainProviderAdapter> {
    const key = `${providerName}-${modelId}`;

    if (this.adapters.has(key)) {
      return this.adapters.get(key)!;
    }

    const adapter = new LangChainProviderAdapter(
      provider,
      providerName,
      modelId,
      {
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.maxTokens ?? 2000,
        topP: config?.topP,
        frequencyPenalty: config?.frequencyPenalty,
        presencePenalty: config?.presencePenalty
      }
    );

    this.adapters.set(key, adapter);
    return adapter;
  }

  /**
   * Create multiple models for ensemble/extraction
   */
  static async createModelEnsemble(
    providers: Array<{ provider: AIProvider; name: string; modelId: string; config?: ModelConfig }>
  ): Promise<LangChainProviderAdapter[]> {
    const models: LangChainProviderAdapter[] = [];

    for (const { provider, name, modelId, config } of providers) {
      try {
        const model = await this.createModel(provider, name, modelId, config);
        models.push(model);
      } catch (error) {
        console.warn(`Failed to create model adapter for ${name}-${modelId}:`, error);
      }
    }

    return models;
  }

  /**
   * Get cached adapter or create new one
   */
  static getAdapter(providerName: string, modelId: string): LangChainProviderAdapter | null {
    return this.adapters.get(`${providerName}-${modelId}`) || null;
  }

  /**
   * Clear adapter cache
   */
  static clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Get all available adapters
   */
  static getAllAdapters(): Map<string, LangChainProviderAdapter> {
    return new Map(this.adapters);
  }
}

/**
 * Utility functions for working with LangChain models
 */
export class LangChainUtils {
  /**
   * Check if a provider supports specific capabilities
   */
  static supportsCapability(provider: AIProvider, capability: string): boolean {
    const capabilities = {
      streaming: () => provider.supportsStreaming(),
      thinking: () => provider.supportsThinking(),
      tools: () => provider.supportsTools(),
      extraction: () => true, // All models support basic extraction
      analysis: () => true,
      generation: () => true
    };

    const checker = capabilities[capability as keyof typeof capabilities];
    return checker ? checker() : false;
  }

  /**
   * Create a system message for concept extraction
   */
  static createConceptExtractionSystemPrompt(): string {
    return `You are an expert educational content analyzer specializing in concept extraction from learning materials.

Your task is to identify and extract key learning concepts from the provided text. For each concept, you should:

1. Identify the concept name and type (topic, skill, fact, procedure, principle)
2. Assess the difficulty level (1-5 scale)
3. Provide a clear description
4. Identify relationships between concepts
5. Suggest learning objectives

Please respond in JSON format with the following structure:
{
  "concepts": [
    {
      "name": "Concept Name",
      "type": "topic|skill|fact|procedure|principle",
      "difficulty": 1-5,
      "description": "Clear description",
      "evidence": ["supporting text quotes"],
      "relationships": [
        {
          "target": "Related concept",
          "type": "prerequisite|related|contains|example|application",
          "strength": 0.0-1.0
        }
      ]
    }
  ]
}

Focus on concepts that are essential for learning and understanding the material. Consider the educational context and learning objectives.`;
  }

  /**
   * Create a system message for learning path generation
   */
  static createLearningPathSystemPrompt(): string {
    return `You are an expert instructional designer and learning path optimizer.

Based on the provided concepts and their relationships, generate an optimal learning path that:

1. Organizes concepts in logical learning order
2. Ensures prerequisites are covered before dependent concepts
3. Balances difficulty progression
4. Includes appropriate practice and assessment opportunities
5. Provides estimated time requirements

Respond in JSON format:
{
  "learningPath": {
    "title": "Learning Path Title",
    "description": "Overview of the learning journey",
    "modules": [
      {
        "title": "Module Title",
        "concepts": ["concept1", "concept2"],
        "order": 1,
        "estimatedTime": 45,
        "difficulty": 2,
        "objectives": ["Learning objective 1"],
        "activities": ["Study activity", "Practice exercise"]
      }
    ],
    "totalTime": 180,
    "difficulty": 3
  }
}

Consider cognitive load, learning theory principles, and optimal knowledge retention in your path design.`;
  }

  /**
   * Create a system message for assessment generation
   */
  static createAssessmentGenerationSystemPrompt(): string {
    return `You are an expert educational assessor specializing in creating effective learning evaluations.

For the given concepts, create appropriate assessment questions that:

1. Test different cognitive levels (recall, comprehension, application, analysis)
2. Align with learning objectives
3. Provide clear feedback mechanisms
4. Include appropriate difficulty progression
5. Support various question formats

Respond in JSON format:
{
  "assessment": {
    "title": "Assessment Title",
    "type": "quiz|exercise|project|practical",
    "questions": [
      {
        "type": "multiple-choice|short-answer|coding|essay",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Answer",
        "explanation": "Explanation of the correct answer",
        "difficulty": 1-5,
        "points": 10,
        "concepts": ["relatedConcept1"]
      }
    ],
    "passingScore": 70,
    "timeLimit": 30
  }
}

Ensure questions are clear, unambiguous, and effectively measure the intended learning outcomes.`;
  }

  /**
   * Format chat options for different extraction tasks
   */
  static formatChatOptionsForTask(
    task: 'extraction' | 'analysis' | 'generation' | 'validation',
    baseOptions?: Partial<ChatOptions>
  ): ChatOptions {
    const defaultOptions = {
      temperature: 0.3, // Lower temperature for consistent extraction
      max_tokens: 4000,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    const taskSpecificOptions = {
      extraction: { temperature: 0.2, max_tokens: 3000 },
      analysis: { temperature: 0.4, max_tokens: 2000 },
      generation: { temperature: 0.7, max_tokens: 4000 },
      validation: { temperature: 0.1, max_tokens: 1500 }
    };

    return {
      ...defaultOptions,
      ...taskSpecificOptions[task],
      ...baseOptions
    } as ChatOptions;
  }
}

/**
 * Error handling for LangChain operations
 */
export class LangChainAdapterError extends Error {
  constructor(
    message: string,
    public provider: string,
    public model: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LangChainAdapterError';
  }
}

export default LangChainProviderAdapter;