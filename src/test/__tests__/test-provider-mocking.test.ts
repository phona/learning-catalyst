/**
 * Test Enhanced Provider Mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  LangChainProviderMockFactory,
  ErrorScenarios,
  ProviderConfigs,
  setupLangChainMocks
} from '../mocks/langchain-providers.mock'

describe('Enhanced Provider Mocking', () => {
  beforeEach(() => {
    setupLangChainMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    LangChainProviderMockFactory.resetAllMocks()
  })

  describe('Basic Provider Mocking', () => {
    it('should create OpenAI provider mock', () => {
      const openaiMock = LangChainProviderMockFactory.createOpenAIMock()

      expect(openaiMock.invoke).toBeDefined()
      expect(openaiMock.stream).toBeDefined()
      expect(openaiMock.config.modelName).toBe('gpt-3.5-turbo')
    })

    it('should create Anthropic provider mock', () => {
      const anthropicMock = LangChainProviderMockFactory.createAnthropicMock()

      expect(anthropicMock.invoke).toBeDefined()
      expect(anthropicMock.stream).toBeDefined()
      expect(anthropicMock.config.modelName).toBe('claude-3-sonnet-20240229')
    })

    it('should create ChatGLM provider mock', () => {
      const chatglmMock = LangChainProviderMockFactory.createChatGLMMock()

      expect(chatglmMock.invoke).toBeDefined()
      expect(chatglmMock.stream).toBeDefined()
      expect(chatglmMock.config.modelName).toBe('glm-4')
    })

    it('should handle non-streaming invoke calls', async () => {
      const openaiMock = LangChainProviderMockFactory.createOpenAIMock()

      const messages = [{ role: 'user', content: 'Hello, world!' }]
      const response = await openaiMock.invoke(messages)

      expect(response.content).toBeDefined()
      expect(response.metadata.model).toBe('gpt-3.5-turbo')
      expect(response.metadata.usage).toBeDefined()
    })

    it('should handle streaming calls', async () => {
      const anthropicMock = LangChainProviderMockFactory.createAnthropicMock()

      const messages = [{ role: 'user', content: 'Stream this response' }]
      const chunks = []

      for await (const chunk of anthropicMock.stream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].content).toBeDefined()
      expect(chunks[chunks.length - 1].metadata.finishReason).toBe('stop')
    })
  })

  describe('Error Scenario Testing', () => {
    it('should simulate timeout errors', async () => {
      const timeoutMock = LangChainProviderMockFactory.createErrorProvider(
        'openai',
        ErrorScenarios.TIMEOUT
      )

      await expect(
        timeoutMock.invoke([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Request timeout')
    })

    it('should simulate rate limit errors', async () => {
      const rateLimitMock = LangChainProviderMockFactory.createErrorProvider(
        'anthropic',
        ErrorScenarios.RATE_LIMIT
      )

      try {
        await rateLimitMock.invoke([{ role: 'user', content: 'test' }])
      } catch (error) {
        expect(error.message).toContain('Rate limit exceeded')
        expect(error.code).toBe('rate_limit_exceeded')
        expect(error.status).toBe(429)
      }
    })

    it('should simulate authentication errors', async () => {
      const authErrorMock = LangChainProviderMockFactory.createErrorProvider(
        'openai',
        ErrorScenarios.AUTH_ERROR
      )

      await expect(
        authErrorMock.invoke([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Invalid API key')
    })

    it('should simulate intermittent errors', async () => {
      const intermittentMock = LangChainProviderMockFactory.createIntermittentErrorProvider(
        'openai',
        ErrorScenarios.SERVER_ERROR,
        0.5 // 50% error rate
      )

      let successCount = 0
      let errorCount = 0

      // Use fewer iterations for faster testing
      for (let i = 0; i < 10; i++) {
        try {
          await intermittentMock.invoke([{ role: 'user', content: `test ${i}` }])
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      // Should have both successes and errors (approximately 50/50 split)
      expect(successCount).toBeGreaterThan(0)
      expect(errorCount).toBeGreaterThan(0)
      expect(successCount + errorCount).toBe(10)
    }, 10000)
  })

  describe('Performance Variations', () => {
    it('should create fast provider', async () => {
      const fastMock = LangChainProviderMockFactory.createOpenAIMock(ProviderConfigs.FAST)

      const startTime = performance.now()
      await fastMock.invoke([{ role: 'user', content: 'test' }])
      const duration = performance.now() - startTime

      expect(duration).toBeLessThan(100) // Should be very fast (< 100ms)
    })

    it('should create slow provider', async () => {
      const slowMock = LangChainProviderMockFactory.createOpenAIMock(ProviderConfigs.SLOW)

      const startTime = performance.now()
      await slowMock.invoke([{ role: 'user', content: 'test' }])
      const duration = performance.now() - startTime

      expect(duration).toBeGreaterThan(1000) // Should be slow (> 1000ms)
    })

    it('should handle custom response times', async () => {
      const customMock = LangChainProviderMockFactory.createSlowProvider('openai', 500)

      const startTime = performance.now()
      await customMock.invoke([{ role: 'user', content: 'test' }])
      const duration = performance.now() - startTime

      expect(duration).toBeGreaterThan(400) // Allow some variance
      expect(duration).toBeLessThan(600)
    })
  })

  describe('Token Usage Simulation', () => {
    it('should simulate high token usage', async () => {
      const highTokenMock = LangChainProviderMockFactory.createOpenAIMock(ProviderConfigs.HIGH_TOKEN_USAGE)

      const response = await highTokenMock.invoke([{ role: 'user', content: 'long test' }])

      expect(response.metadata.usage.prompt).toBe(100)
      expect(response.metadata.usage.completion).toBe(500)
      expect(response.metadata.usage.total).toBe(600)
    })

    it('should simulate low token usage', async () => {
      const lowTokenMock = LangChainProviderMockFactory.createOpenAIMock(ProviderConfigs.LOW_TOKEN_USAGE)

      const response = await lowTokenMock.invoke([{ role: 'user', content: 'short test' }])

      expect(response.metadata.usage.prompt).toBe(10)
      expect(response.metadata.usage.completion).toBe(20)
      expect(response.metadata.usage.total).toBe(30)
    })

    it('should allow custom token usage', async () => {
      const customMock = LangChainProviderMockFactory.createOpenAIMock({
        tokenUsage: { prompt: 25, completion: 75, total: 100 }
      })

      const response = await customMock.invoke([{ role: 'user', content: 'custom test' }])

      expect(response.metadata.usage.prompt).toBe(25)
      expect(response.metadata.usage.completion).toBe(75)
      expect(response.metadata.usage.total).toBe(100)
    })
  })

  describe('Mock Configuration and Customization', () => {
    it('should allow provider configuration', () => {
      const customMock = LangChainProviderMockFactory.createOpenAIMock({
        modelId: 'gpt-4',
        temperature: 0.1,
        maxTokens: 5000
      })

      expect(customMock.config.modelName).toBe('gpt-4')
      expect(customMock.config.temperature).toBe(0.1)
      expect(customMock.config.maxTokens).toBe(5000)
    })

    it('should track call statistics', async () => {
      const provider = LangChainProviderMockFactory.getProvider('openai')

      // Make some calls
      await provider.invoke([{ role: 'user', content: 'test 1' }])
      await provider.invoke([{ role: 'user', content: 'test 2' }])

      const chunks = []
      for await (const chunk of provider.stream([{ role: 'user', content: 'stream test' }])) {
        chunks.push(chunk)
      }

      const stats = LangChainProviderMockFactory.getCallStats('openai')
      expect(stats).toBeDefined()
      expect(stats.invokeCount).toBe(2)
      expect(stats.streamCount).toBe(1)
    })

    it('should reset all mocks', async () => {
      const openaiMock = LangChainProviderMockFactory.getProvider('openai')
      const anthropicMock = LangChainProviderMockFactory.getProvider('anthropic')

      // Make calls
      await openaiMock.invoke([{ role: 'user', content: 'test' }])
      await anthropicMock.invoke([{ role: 'user', content: 'test' }])

      // Check stats before reset
      let openaiStats = LangChainProviderMockFactory.getCallStats('openai')
      let anthropicStats = LangChainProviderMockFactory.getCallStats('anthropic')
      expect(openaiStats.invokeCount).toBe(1)
      expect(anthropicStats.invokeCount).toBe(1)

      // Reset mocks
      LangChainProviderMockFactory.resetAllMocks()

      // Stats should be cleared
      openaiStats = LangChainProviderMockFactory.getCallStats('openai')
      anthropicStats = LangChainProviderMockFactory.getCallStats('anthropic')
      expect(openaiStats).toBeNull()
      expect(anthropicStats).toBeNull()
    })
  })

  describe('Streaming Behavior', () => {
    it('should generate realistic streaming chunks', async () => {
      const provider = LangChainProviderMockFactory.createOpenAIMock({
        streamChunkCount: 3
      })

      const chunks = []
      for await (const chunk of provider.stream([{ role: 'user', content: 'stream test' }])) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBe(3)
      expect(chunks[0].content).toBeDefined()
      expect(chunks[2].metadata.finishReason).toBe('stop')
    })

    it('should handle streaming errors', async () => {
      const errorProvider = LangChainProviderMockFactory.createIntermittentErrorProvider(
        'openai',
        ErrorScenarios.NETWORK_ERROR,
        1.0 // 100% error rate
      )

      const chunks = []

      try {
        for await (const chunk of errorProvider.stream([{ role: 'user', content: 'test' }])) {
          chunks.push(chunk)
        }
      } catch (error) {
        expect(error.message).toContain('Network connection failed')
      }
    })
  })
})