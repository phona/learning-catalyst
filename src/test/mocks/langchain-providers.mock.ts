/**
 * Enhanced LangChain Provider Mocks
 *
 * Provides realistic mocking scenarios for AI providers including
 * error conditions, rate limiting, and performance variations.
 */

import { vi, type Mock } from 'vitest'
import type { ChatOpenAI } from '@langchain/openai'
import type { ChatAnthropic } from '@langchain/anthropic'

/**
 * Error scenario types for testing
 */
export type ErrorScenario = 'timeout' | 'rate_limit' | 'auth_error' | 'content_filter' | 'server_error' | 'network_error'

/**
 * Provider configuration interface
 */
export interface ProviderMockConfig {
  defaultResponse?: string
  responseTime?: number
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  errorScenario?: ErrorScenario
  errorProbability?: number
  streamChunkCount?: number
  modelId?: string
}

/**
 * Mock response generator
 */
class MockResponseGenerator {
  private static responses = {
    openai: [
      "I'm an AI assistant powered by OpenAI's GPT model. I can help you with a wide range of tasks including answering questions, creative writing, analysis, and problem-solving.",
      "As an OpenAI assistant, I've been trained on diverse data to provide helpful and accurate responses. How can I assist you today?",
      "Based on my training with OpenAI, I can engage in detailed discussions, provide explanations, and help with various tasks. What would you like to explore?"
    ],
    anthropic: [
      "Hello! I'm Claude, an AI assistant created by Anthropic. I'm designed to be helpful, harmless, and honest in our conversations.",
      "As Claude, I aim to provide thoughtful and nuanced responses. I'm particularly good at analysis, writing, and complex reasoning tasks.",
      "I'm Claude, trained by Anthropic with a focus on being safe and beneficial. I can help with everything from creative work to technical problem-solving."
    ],
    chatglm: [
      "你好！我是智谱AI训练的GLM大语言模型。我可以帮助您回答问题、撰写内容、进行分析等各种任务。",
      "作为GLM模型，我具备中英文双语能力和广泛的知识储备。我很乐意为您提供帮助和支持。",
      "我是智谱AI开发的GLM语言模型，经过大规模数据训练，可以协助您完成多种语言任务。请问有什么可以帮您的吗？"
    ]
  }

  static getRandomResponse(provider: string): string {
    const providerResponses = this.responses[provider as keyof typeof this.responses] || this.responses.openai
    return providerResponses[Math.floor(Math.random() * providerResponses.length)]
  }

  static getStreamingChunks(provider: string, count: number = 5): string[] {
    const baseResponse = this.getRandomResponse(provider)
    const chunkSize = Math.ceil(baseResponse.length / count)
    const chunks: string[] = []

    for (let i = 0; i < count; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, baseResponse.length)
      chunks.push(baseResponse.substring(start, end))
    }

    return chunks
  }
}

/**
 * Error scenario generator
 */
class MockErrorGenerator {
  static generateError(scenario: ErrorScenario): Error {
    switch (scenario) {
      case 'timeout':
        const timeoutError = new Error('Request timeout')
        ;(timeoutError as any).code = 'ETIMEDOUT'
        ;(timeoutError as any).status = 408
        return timeoutError

      case 'rate_limit':
        const rateLimitError = new Error('Rate limit exceeded. Please try again later.')
        ;(rateLimitError as any).code = 'rate_limit_exceeded'
        ;(rateLimitError as any).status = 429
        ;(rateLimitError as any).retryAfter = 60
        return rateLimitError

      case 'auth_error':
        const authError = new Error('Invalid API key provided')
        ;(authError as any).code = 'authentication_error'
        ;(authError as any).status = 401
        return authError

      case 'content_filter':
        const contentFilterError = new Error('Content filtered due to policy violation')
        ;(contentFilterError as any).code = 'content_filter'
        ;(contentFilterError as any).status = 400
        return contentFilterError

      case 'server_error':
        const serverError = new Error('Internal server error')
        ;(serverError as any).code = 'internal_server_error'
        ;(serverError as any).status = 500
        return serverError

      case 'network_error':
        const networkError = new Error('Network connection failed')
        ;(networkError as any).code = 'ENOTFOUND'
        ;(networkError as any).status = 0
        return networkError

      default:
        return new Error('Unknown error occurred')
    }
  }
}

/**
 * Creates a realistic provider mock
 */
export function createProviderMock(provider: string, config: ProviderMockConfig = {}) {
  const {
    defaultResponse = MockResponseGenerator.getRandomResponse(provider),
    responseTime = 100 + Math.random() * 200, // 100-300ms
    tokenUsage = { prompt: 50, completion: 100, total: 150 },
    errorScenario,
    errorProbability = 0,
    streamChunkCount = 5,
    modelId = provider === 'openai' ? 'gpt-3.5-turbo' : `${provider}-model`
  } = config

  const mockProvider = {
    config: {
      modelName: modelId,
      temperature: 0.7,
      maxTokens: 2000,
      ...config
    },

    // Non-streaming invoke method
    invoke: vi.fn().mockImplementation(async (messages: any[]) => {
      // Simulate response time
      await new Promise(resolve => setTimeout(resolve, responseTime))

      // Check for error scenario
      if (errorScenario && Math.random() < errorProbability) {
        throw MockErrorGenerator.generateError(errorScenario)
      }

      return {
        content: defaultResponse,
        metadata: {
          model: modelId,
          usage: tokenUsage,
          finishReason: 'stop'
        }
      }
    }),

    // Streaming method
    stream: vi.fn().mockImplementation(async function* (messages: any[]) {
      const chunks = MockResponseGenerator.getStreamingChunks(provider, streamChunkCount)

      for (let i = 0; i < chunks.length; i++) {
        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, responseTime / chunks.length))

        // Check for error scenario during streaming
        if (errorScenario && Math.random() < errorProbability) {
          throw MockErrorGenerator.generateError(errorScenario)
        }

        const isLastChunk = i === chunks.length - 1

        yield {
          content: chunks[i],
          metadata: {
            model: modelId,
            usage: isLastChunk ? tokenUsage : { prompt: 0, completion: 0, total: 0 },
            finishReason: isLastChunk ? 'stop' : null
          }
        }
      }
    }),

    // Additional utility methods
    withResponseTime: (newResponseTime: number) => {
      mockProvider.invoke.mockImplementation(async (messages: any[]) => {
        await new Promise(resolve => setTimeout(resolve, newResponseTime))
        return {
          content: defaultResponse,
          metadata: { model: modelId, usage: tokenUsage }
        }
      })
      return mockProvider
    },

    withErrorScenario: (scenario: ErrorScenario, probability: number = 1) => {
      config.errorScenario = scenario
      config.errorProbability = probability
      return mockProvider
    },

    withTokenUsage: (usage: typeof tokenUsage) => {
      config.tokenUsage = usage
      return mockProvider
    },

    reset: () => {
      mockProvider.invoke.mockClear()
      mockProvider.stream.mockClear()
    }
  }

  return mockProvider
}

/**
 * Mock factory for different providers
 */
export class LangChainProviderMockFactory {
  private static mocks = new Map<string, any>()

  /**
   * Get or create a mock for the specified provider
   */
  static getProvider(provider: string, config: ProviderMockConfig = {}): any {
    if (!this.mocks.has(provider)) {
      this.mocks.set(provider, createProviderMock(provider, config))
    }
    return this.mocks.get(provider)
  }

  /**
   * Create OpenAI mock
   */
  static createOpenAIMock(config: ProviderMockConfig = {}): any {
    return createProviderMock('openai', {
      modelId: 'gpt-3.5-turbo',
      ...config
    })
  }

  /**
   * Create Anthropic mock
   */
  static createAnthropicMock(config: ProviderMockConfig = {}): any {
    return createProviderMock('anthropic', {
      modelId: 'claude-3-sonnet-20240229',
      responseTime: 200 + Math.random() * 300, // Slower but more thoughtful
      ...config
    })
  }

  /**
   * Create ChatGLM mock
   */
  static createChatGLMMock(config: ProviderMockConfig = {}): any {
    return createProviderMock('chatglm', {
      modelId: 'glm-4',
      responseTime: 300 + Math.random() * 400, // Generally slower
      ...config
    })
  }

  /**
   * Create mock with specific error scenario
   */
  static createErrorProvider(provider: string, scenario: ErrorScenario): any {
    return createProviderMock(provider, {
      errorScenario: scenario,
      errorProbability: 1.0
    })
  }

  /**
   * Create mock with intermittent errors
   */
  static createIntermittentErrorProvider(provider: string, scenario: ErrorScenario, errorRate: number = 0.1): any {
    return createProviderMock(provider, {
      errorScenario: scenario,
      errorProbability: errorRate
    })
  }

  /**
   * Create slow provider for performance testing
   */
  static createSlowProvider(provider: string, responseTimeMs: number = 5000): any {
    return createProviderMock(provider, {
      responseTime: responseTimeMs
    })
  }

  /**
   * Reset all mocks
   */
  static resetAllMocks(): void {
    this.mocks.forEach(mock => {
      if (mock.reset) mock.reset()
    })
    this.mocks.clear()
  }

  /**
   * Get mock call statistics
   */
  static getCallStats(provider: string): { invokeCount: number; streamCount: number } | null {
    const mock = this.mocks.get(provider)
    if (!mock) return null

    return {
      invokeCount: mock.invoke.mock.calls.length,
      streamCount: mock.stream.mock.calls.length
    }
  }
}

/**
 * Common error scenarios for testing
 */
export const ErrorScenarios = {
  TIMEOUT: 'timeout' as ErrorScenario,
  RATE_LIMIT: 'rate_limit' as ErrorScenario,
  AUTH_ERROR: 'auth_error' as ErrorScenario,
  CONTENT_FILTER: 'content_filter' as ErrorScenario,
  SERVER_ERROR: 'server_error' as ErrorScenario,
  NETWORK_ERROR: 'network_error' as ErrorScenario
}

/**
 * Predefined provider configurations
 */
export const ProviderConfigs = {
  FAST: { responseTime: 50 },
  SLOW: { responseTime: 2000 },
  UNRELIABLE: { errorProbability: 0.3, errorScenario: ErrorScenarios.SERVER_ERROR },
  RATE_LIMITED: { errorScenario: ErrorScenarios.RATE_LIMIT, errorProbability: 0.2 },
  HIGH_TOKEN_USAGE: { tokenUsage: { prompt: 100, completion: 500, total: 600 } },
  LOW_TOKEN_USAGE: { tokenUsage: { prompt: 10, completion: 20, total: 30 } }
}

/**
 * Vitest mock setup for LangChain imports
 */
export function setupLangChainMocks() {
  vi.mock('@langchain/openai', () => ({
    ChatOpenAI: vi.fn().mockImplementation((config) => {
      return LangChainProviderMockFactory.createOpenAIMock({
        modelId: config.modelName || 'gpt-3.5-turbo',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 2000
      })
    })
  }))

  vi.mock('@langchain/anthropic', () => ({
    ChatAnthropic: vi.fn().mockImplementation((config) => {
      return LangChainProviderMockFactory.createAnthropicMock({
        modelId: config.model || 'claude-3-sonnet-20240229',
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 2000
      })
    })
  }))

  vi.mock('langchain', () => ({
    createAgent: vi.fn().mockImplementation((config) => {
      return {
        config,
        invoke: vi.fn().mockResolvedValue({
          content: 'Mock agent response',
          metadata: { model: 'agent-model' }
        }),
        stream: vi.fn().mockImplementation(function* () {
          yield { content: 'Mock ', metadata: {} }
          yield { content: 'agent ', metadata: {} }
          yield { content: 'response', metadata: {} }
        })
      }
    })
  }))
}