/**
 * Infrastructure Summary Test
 *
 * Demonstrates all components of our enhanced test infrastructure working together.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MainProcessTestBase, AgentLifecycleTestBase } from '../base/main-process.test-base'
import { LangChainProviderMockFactory, setupLangChainMocks } from '../mocks/langchain-providers.mock'

// Import custom matchers to make them available
import '../matchers/agent-lifecycle.matchers'

describe('Enhanced Test Infrastructure Summary', () => {
  let testBase: MainProcessTestBase

  beforeEach(() => {
    testBase = new MainProcessTestBase()
    testBase.setupTest()
    setupLangChainMocks()
  })

  afterEach(() => {
    testBase.cleanupTest()
    LangChainProviderMockFactory.resetAllMocks()
  })

  it('should demonstrate complete test infrastructure capabilities', async () => {
    // 1. Test Base Classes
    expect(testBase.mockServices.database).toBeDefined()
    expect(testBase.mockServices.logger).toBeDefined()
    expect(testBase.performanceMonitor).toBeDefined()

    // 2. Performance Monitoring
    testBase.performanceMonitor.start('test-operation')

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 10))

    const duration = testBase.performanceMonitor.end('test-operation')
    expect(duration).toBeGreaterThan(5)

    const metrics = testBase.performanceMonitor.getMetrics()
    expect(metrics['test-operation'].count).toBe(1)

    // 3. Custom Matchers - Agent Lifecycle
    const validTransition = { from: 'inactive', to: 'active' }
    expect(validTransition).toBeValidAgentTransition()

    const invalidTransition = { from: 'active', to: 'active' }
    expect(() => expect(invalidTransition).toBeValidAgentTransition()).toThrow()

    // 4. Custom Matchers - Performance
    expect({ duration: 50 }).toMeetPerformanceThreshold(100)
    expect(() => expect({ duration: 200 }).toMeetPerformanceThreshold(100)).toThrow()

    // 5. Custom Matchers - Memory
    const normalMemory = 50 * 1024 * 1024 // 50MB
    expect(normalMemory).toBeWithinMemoryRange(10, 100)

    // 6. Enhanced Provider Mocking
    const openaiMock = LangChainProviderMockFactory.createOpenAIMock()
    const response = await openaiMock.invoke([{ role: 'user', content: 'test' }])
    expect(response.content).toBeDefined()
    expect(response.metadata.model).toBe('gpt-3.5-turbo')

    // 7. Streaming Mocks
    const chunks = []
    for await (const chunk of openaiMock.stream([{ role: 'user', content: 'stream test' }])) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[chunks.length - 1].metadata.finishReason).toBe('stop')

    // 8. Error Scenarios
    const errorMock = LangChainProviderMockFactory.createErrorProvider(
      'openai',
      'rate_limit' as const
    )

    await expect(
      errorMock.invoke([{ role: 'user', content: 'test' }])
    ).rejects.toThrow('Rate limit exceeded')

    // 9. Call Statistics
    const stats = LangChainProviderMockFactory.getCallStats('openai')
    expect(stats).toBeDefined()
    if (stats) {
      expect(stats.invokeCount).toBe(2) // From our two calls above
      expect(stats.streamCount).toBe(1)
    }

    // 10. Database Mocking
    expect(testBase.mockServices.database.insertInto).toBeDefined()
    expect(testBase.mockServices.database.transaction).toBeDefined()

    // Test transaction mock
    testBase.mockServices.database.transaction.mockImplementation(async (fn) => {
      return fn(testBase.mockServices.database)
    })

    expect(typeof testBase.mockServices.database.transaction).toBe('function')

    // 11. Logger Mocking
    testBase.mockServices.logger.info('Test info message')
    testBase.mockServices.logger.error('Test error message')

    const logEntries = testBase.mockServices.logger.getLogEntries()
    expect(logEntries.info).toHaveLength(1)
    expect(logEntries.error).toHaveLength(1)

    // 12. Configuration Validation
    const validAgentConfig = {
      type: 'learning',
      name: 'Test Agent',
      description: 'A test agent',
      systemPrompt: 'You are helpful.',
      tools: ['tool1'],
      capabilities: ['capability1'],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      }
    }

    expect(validAgentConfig).toBeValidAgentConfiguration()

    // 13. Lifecycle Event Validation
    const validEvent = {
      agentId: 'agent-123',
      event: 'activated',
      timestamp: Date.now(),
      metadata: { reason: 'user_request' }
    }

    expect(validEvent).toBeValidLifecycleEvent()

    // 14. Performance Metrics Validation
    const validMetrics = {
      averageResponseTime: 250,
      totalRequests: 1000,
      successRate: 0.95,
      uptime: 86400000
    }

    expect(validMetrics).toHaveValidPerformanceMetrics()

    // 15. Health Status Validation
    const healthyStatus = {
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 150,
      errorCount: 0
    }

    expect(healthyStatus).toBeHealthyAgentStatus()
  })

  it('should demonstrate test infrastructure integration', async () => {
    // Create an agent lifecycle test to show specialized base classes
    const agentTest = new AgentLifecycleTestBase()
    agentTest.setupAgentMocks()

    // Test agent configuration creation
    const agentConfig = agentTest.createTestAgentConfig({
      name: 'Integration Test Agent',
      type: 'learning',
      capabilities: ['test-capability'] // Add missing capabilities array
    })

    expect(agentConfig.name).toBe('Integration Test Agent')
    expect(agentConfig.type).toBe('learning')
    expect(agentConfig).toBeValidAgentConfiguration()

    // Test performance monitoring with agent operations
    agentTest.performanceMonitor.start('agent-creation')

    // Simulate agent creation
    await new Promise(resolve => setTimeout(resolve, 20))

    const creationTime = agentTest.performanceMonitor.end('agent-creation')
    expect({ duration: creationTime }).toMeetPerformanceThreshold(100)

    agentTest.cleanupTest()
  })

  it('should show comprehensive test statistics', () => {
    // Get final performance statistics
    const stats = testBase.performanceMonitor.getMetrics()

    // The performance monitor should have data from our tests
    expect(typeof stats).toBe('object')

    // Show all mock services are working
    expect(testBase.mockServices.database.insertInto).toBeDefined()
    expect(testBase.mockServices.logger.info).toBeDefined()
    expect(testBase.mockServices.asyncLocalStorage.run).toBeDefined()
    expect(testBase.mockServices.config.getConfig).toBeDefined()

    // Verify logger is working
    const logEntries = testBase.mockServices.logger.getLogEntries()
    expect(logEntries).toBeDefined()
    expect(logEntries.info).toBeDefined()
  })
})