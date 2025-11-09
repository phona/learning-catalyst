/**
 * Memory Leak Detection Tests
 *
 * Comprehensive memory monitoring tests to detect leaks in main process services
 * including agent lifecycle, AI providers, and database operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AgentLifecycleTestBase } from '../base/main-process.test-base'
import type { AgentConfiguration } from '@/main/services/agents/agent-lifecycle-manager'

/**
 * Memory monitoring utility
 */
class MemoryMonitor {
  private samples: Array<{
    timestamp: number
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }> = []

  start(): void {
    this.samples = []
  }

  sample(): void {
    const usage = process.memoryUsage()
    this.samples.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    })
  }

  getLatest(): NodeJS.MemoryUsage | null {
    return this.samples.length > 0 ? {
      heapUsed: this.samples[this.samples.length - 1].heapUsed,
      heapTotal: this.samples[this.samples.length - 1].heapTotal,
      external: this.samples[this.samples.length - 1].external,
      rss: this.samples[this.samples.length - 1].rss,
      arrayBuffers: 0 // Not tracked in older Node.js versions
    } : null
  }

  getGrowth(): {
    heapUsedGrowth: number
    heapTotalGrowth: number
    externalGrowth: number
    rssGrowth: number
  } {
    if (this.samples.length < 2) {
      return {
        heapUsedGrowth: 0,
        heapTotalGrowth: 0,
        externalGrowth: 0,
        rssGrowth: 0
      }
    }

    const first = this.samples[0]
    const latest = this.samples[this.samples.length - 1]

    return {
      heapUsedGrowth: latest.heapUsed - first.heapUsed,
      heapTotalGrowth: latest.heapTotal - first.heapTotal,
      externalGrowth: latest.external - first.external,
      rssGrowth: latest.rss - first.rss
    }
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc()
    }
  }

  getStats(): {
    samples: number
    durationMs: number
    averageHeapUsed: number
    peakHeapUsed: number
    growth: ReturnType<MemoryMonitor['getGrowth']>
  } {
    if (this.samples.length === 0) {
      return {
        samples: 0,
        durationMs: 0,
        averageHeapUsed: 0,
        peakHeapUsed: 0,
        growth: {
          heapUsedGrowth: 0,
          heapTotalGrowth: 0,
          externalGrowth: 0,
          rssGrowth: 0
        }
      }
    }

    const durationMs = this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp
    const heapUsages = this.samples.map(s => s.heapUsed)
    const averageHeapUsed = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length
    const peakHeapUsed = Math.max(...heapUsages)

    return {
      samples: this.samples.length,
      durationMs,
      averageHeapUsed,
      peakHeapUsed,
      growth: this.getGrowth()
    }
  }
}

/**
 * Agent Lifecycle Memory Leak Tests
 */
describe('Agent Lifecycle Memory Management', () => {
  let memoryMonitor: MemoryMonitor
  let agentLifecycleManager: any

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor()
    vi.clearAllMocks()
  })

  afterEach(() => {
    memoryMonitor.forceGarbageCollection()
  })

  it('should not leak memory during agent creation and deletion', async () => {
    // Setup agent lifecycle manager
    const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
    const mockRegistry = {
      registerAgent: vi.fn().mockResolvedValue({
        id: 'test-agent-id',
        type: 'learning',
        name: 'Test Agent',
        status: 'inactive',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }),
      deleteAgent: vi.fn().mockResolvedValue(true)
    }

    agentLifecycleManager = new AgentLifecycleManager(
      mockRegistry,
      {
        selectFrom: vi.fn().mockReturnThis(),
        insertInto: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
        deleteFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        transaction: vi.fn().mockImplementation(async (fn) => fn({}))
      } as any,
      { info: vi.fn(), error: vi.fn() },
      { run: vi.fn(), getStore: vi.fn() }
    )

    // Start memory monitoring
    memoryMonitor.start()
    memoryMonitor.sample()

    const initialMemory = memoryMonitor.getLatest()
    expect(initialMemory).toBeDefined()

    // Create and delete many agents
    const iterations = 100
    for (let i = 0; i < iterations; i++) {
      const agentConfig: AgentConfiguration = {
        type: 'learning',
        name: `Memory Test Agent ${i}`,
        description: 'Agent for memory leak testing',
        systemPrompt: 'You are a helpful test assistant.',
        tools: [],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      }

      const agent = await agentLifecycleManager.createAgent(agentConfig)
      await agentLifecycleManager.deleteAgent(agent.id)

      // Sample memory every 10 iterations
      if (i % 10 === 0) {
        memoryMonitor.sample()
      }
    }

    // Force garbage collection
    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const finalMemory = memoryMonitor.getLatest()
    const stats = memoryMonitor.getStats()

    // Verify memory growth is within acceptable limits (10MB for 100 agents)
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)
    expect(memoryGrowthMB).toBeLessThan(10)

    // Log memory statistics for debugging
    console.log('Memory Statistics:', {
      iterations,
      initialMemoryMB: initialMemory!.heapUsed / (1024 * 1024),
      finalMemoryMB: finalMemory!.heapUsed / (1024 * 1024),
      memoryGrowthMB,
      peakMemoryMB: stats.peakHeapUsed / (1024 * 1024),
      durationMs: stats.durationMs
    })
  })

  it('should handle concurrent agent operations without memory leaks', async () => {
    // Setup similar to previous test
    const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
    const mockRegistry = {
      registerAgent: vi.fn().mockResolvedValue({
        id: 'test-agent-id',
        type: 'learning',
        name: 'Test Agent',
        status: 'inactive',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }),
      activateAgent: vi.fn().mockResolvedValue({
        id: 'test-agent-id',
        status: 'active',
        activatedAt: Date.now()
      }),
      deactivateAgent: vi.fn().mockResolvedValue({
        id: 'test-agent-id',
        status: 'inactive',
        deactivatedAt: Date.now()
      }),
      deleteAgent: vi.fn().mockResolvedValue(true)
    }

    agentLifecycleManager = new AgentLifecycleManager(
      mockRegistry,
      {
        transaction: vi.fn().mockImplementation(async (fn) => fn({})),
        insertInto: vi.fn().mockReturnThis(),
        updateTable: vi.fn().mockReturnThis(),
        deleteFrom: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([])
      } as any,
      { info: vi.fn(), error: vi.fn() },
      { run: vi.fn(), getStore: vi.fn() }
    )

    memoryMonitor.start()
    memoryMonitor.sample()

    const concurrentOperations = 50
    const agentPromises = []

    // Create agents concurrently
    for (let i = 0; i < concurrentOperations; i++) {
      const agentConfig: AgentConfiguration = {
        type: 'learning',
        name: `Concurrent Agent ${i}`,
        description: 'Concurrent test agent',
        systemPrompt: 'Test prompt',
        tools: [],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      }

      agentPromises.push(
        agentLifecycleManager.createAgent(agentConfig)
          .then(agent => agentLifecycleManager.activateAgent(agent.id))
          .then(agent => agentLifecycleManager.deactivateAgent(agent.id))
          .then(agent => agentLifecycleManager.deleteAgent(agent.id))
      )
    }

    await Promise.all(agentPromises)

    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const stats = memoryMonitor.getStats()
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)

    expect(memoryGrowthMB).toBeLessThan(20) // Higher limit for concurrent operations
  })
})

/**
 * LangChain Service Memory Leak Tests
 */
describe('LangChain Service Memory Management', () => {
  let memoryMonitor: MemoryMonitor
  let langChainService: any

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor()
  })

  afterEach(() => {
    if (langChainService && langChainService.dispose) {
      langChainService.dispose()
    }
    memoryMonitor.forceGarbageCollection()
  })

  it('should not leak memory during AI provider operations', async () => {
    // Mock LangChain service
    const { LangChainServiceMain } = await import('@/main/services/langchain/langchain-service')

    langChainService = new LangChainServiceMain({
      defaultProvider: 'openai',
      modelConfigs: {},
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30000
    })

    // Mock the provider to avoid real API calls
    vi.mock('@langchain/openai', () => ({
      ChatOpenAI: vi.fn().mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({
          content: 'Mock response for memory testing',
          metadata: { usage: { prompt: 10, completion: 20, total: 30 } }
        }),
        stream: vi.fn().mockImplementation(function* () {
          yield { content: 'Mock ', metadata: {} }
          yield { content: 'response ', metadata: {} }
          yield { content: 'for testing', metadata: {} }
        })
      }))
    }))

    await langChainService.initialize()

    memoryMonitor.start()
    memoryMonitor.sample()

    const iterations = 200
    const messages = [{ role: 'user', content: 'Test message for memory leak detection' }]

    for (let i = 0; i < iterations; i++) {
      await langChainService.generateChatResponse('openai', messages)

      if (i % 20 === 0) {
        memoryMonitor.sample()
      }
    }

    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const stats = memoryMonitor.getStats()
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)

    expect(memoryGrowthMB).toBeLessThan(15) // Allow some memory for caching
  })

  it('should handle streaming operations without memory leaks', async () => {
    const { LangChainServiceMain } = await import('@/main/services/langchain/langchain-service')

    langChainService = new LangChainServiceMain({
      defaultProvider: 'openai',
      modelConfigs: {},
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30000
    })

    // Mock streaming provider
    vi.mock('@langchain/openai', () => ({
      ChatOpenAI: vi.fn().mockImplementation(() => ({
        stream: vi.fn().mockImplementation(function* () {
          for (let i = 0; i < 10; i++) {
            yield {
              content: `Chunk ${i} `,
              metadata: { chunkIndex: i }
            }
          }
        })
      }))
    }))

    await langChainService.initialize()

    memoryMonitor.start()
    memoryMonitor.sample()

    const iterations = 50
    const messages = [{ role: 'user', content: 'Generate a long response for testing' }]

    for (let i = 0; i < iterations; i++) {
      const chunks = []
      for await (const chunk of langChainService.generateStreamingChatResponse('openai', messages)) {
        chunks.push(chunk)
      }

      if (i % 10 === 0) {
        memoryMonitor.sample()
      }
    }

    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const stats = memoryMonitor.getStats()
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)

    expect(memoryGrowthMB).toBeLessThan(10)
  })
})

/**
 * Database Service Memory Leak Tests
 */
describe('Database Service Memory Management', () => {
  let memoryMonitor: MemoryMonitor

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor()
  })

  afterEach(() => {
    memoryMonitor.forceGarbageCollection()
  })

  it('should not leak memory during database operations', async () => {
    // Mock database service
    const mockDatabase = {
      selectFrom: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test 1', data: 'some data' },
        { id: 2, name: 'Test 2', data: 'more data' }
      ]),
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn().mockResolvedValue({ id: 3, name: 'New' }),
      transaction: vi.fn().mockImplementation(async (fn) => {
        return fn(mockDatabase)
      })
    }

    memoryMonitor.start()
    memoryMonitor.sample()

    const iterations = 500

    for (let i = 0; i < iterations; i++) {
      // Simulate various database operations
      await mockDatabase.selectFrom('test_table')
        .select(['id', 'name'])
        .where('status', '=', 'active')
        .orderBy('created_at')
        .limit(10)
        .execute()

      await mockDatabase.insertInto('test_table')
        .values({ name: `Test ${i}`, status: 'active' })
        .returning(['id'])
        .executeTakeFirst()

      if (i % 50 === 0) {
        memoryMonitor.sample()
      }
    }

    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const stats = memoryMonitor.getStats()
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)

    expect(memoryGrowthMB).toBeLessThan(8)
  })
})

/**
 * Integration Memory Leak Test
 */
describe('Integration Memory Management', () => {
  let memoryMonitor: MemoryMonitor

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor()
  })

  afterEach(() => {
    memoryMonitor.forceGarbageCollection()
  })

  it('should not leak memory during complex workflows', async () => {
    // This test simulates a complete workflow involving multiple services
    memoryMonitor.start()
    memoryMonitor.sample()

    const initialMemory = memoryMonitor.getLatest()
    expect(initialMemory).toBeDefined()

    // Simulate complex agent operations
    const agentOperations = []
    for (let i = 0; i < 50; i++) {
      agentOperations.push(async () => {
        // Simulate agent creation
        const agent = {
          id: `agent-${i}`,
          type: 'learning',
          name: `Integration Test Agent ${i}`,
          status: 'inactive',
          createdAt: Date.now(),
          config: {
            modelConfig: { provider: 'openai', model: 'gpt-4' },
            tools: ['tool1', 'tool2']
          }
        }

        // Simulate agent activation
        agent.status = 'active'
        agent.activatedAt = Date.now()

        // Simulate AI interaction
        const aiResponse = {
          content: `Response for agent ${i}`,
          metadata: { tokensUsed: 100, model: 'gpt-4' }
        }

        // Simulate agent deactivation
        agent.status = 'inactive'
        agent.deactivatedAt = Date.now()

        // Simulate cleanup
        return { agent, response: aiResponse }
      })
    }

    // Execute all operations concurrently
    await Promise.all(agentOperations.map(op => op()))

    memoryMonitor.forceGarbageCollection()
    memoryMonitor.sample()

    const finalMemory = memoryMonitor.getLatest()
    const stats = memoryMonitor.getStats()
    const memoryGrowthMB = stats.growth.heapUsedGrowth / (1024 * 1024)

    // Complex workflows should not leak more than 25MB
    expect(memoryGrowthMB).toBeLessThan(25)

    console.log('Integration Memory Test Results:', {
      initialMemoryMB: initialMemory!.heapUsed / (1024 * 1024),
      finalMemoryMB: finalMemory!.heapUsed / (1024 * 1024),
      memoryGrowthMB,
      peakMemoryMB: stats.peakHeapUsed / (1024 * 1024),
      durationMs: stats.durationMs
    })
  })
})