/**
 * Cross-Service Integration Tests
 *
 * Tests the integration between main process services including agent lifecycle,
 * LangChain providers, catalyst service, and database operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MainProcessTestBase } from '../base/main-process.test-base'
import { setupLangChainMocks, LangChainProviderMockFactory } from '../mocks/langchain-providers.mock'

/**
 * Integration test suite for main process services
 */
describe('Main Process Service Integration', () => {
  let testBase: MainProcessTestBase
  let mockServices: any

  beforeEach(async () => {
    testBase = new MainProcessTestBase()
    testBase.setupTest()
    mockServices = testBase.mockServices

    // Setup LangChain mocks
    setupLangChainMocks()

    // Mock Electron APIs
    vi.mock('electron', () => ({
      app: {
        getPath: vi.fn().mockReturnValue('/test/path')
      },
      BrowserWindow: vi.fn().mockImplementation(() => ({
        webContents: { send: vi.fn() },
        on: vi.fn(),
        show: vi.fn()
      }))
    }))
  })

  afterEach(() => {
    testBase.cleanupTest()
    LangChainProviderMockFactory.resetAllMocks()
  })

  describe('Agent Service Integration', () => {
    it('should integrate agent lifecycle with database operations', async () => {
      // Setup agent lifecycle manager with database integration
      const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
      const { AgentRegistry } = await import('@/main/services/agents/agent-registry')

      const agentRegistry = new AgentRegistry(
        mockServices.database,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      const agentLifecycleManager = new AgentLifecycleManager(
        agentRegistry,
        mockServices.database,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      // Create agent configuration
      const agentConfig = {
        type: 'learning' as const,
        name: 'Integration Test Agent',
        description: 'Agent for integration testing',
        systemPrompt: 'You are a helpful integration test assistant.',
        tools: ['concept-parser', 'knowledge-graph'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        }
      }

      // Test agent creation
      const agent = await agentLifecycleManager.createAgent(agentConfig)
      expect(agent).toBeDefined()
      expect(agent.id).toBeDefined()
      expect(agent.status).toBe('inactive')

      // Verify database insertion was called
      expect(mockServices.database.insertInto).toHaveBeenCalledWith('agent_lifecycle_events')

      // Test agent activation
      const activatedAgent = await agentLifecycleManager.activateAgent(agent.id)
      expect(activatedAgent.status).toBe('active')

      // Verify database update was called
      expect(mockServices.database.updateTable).toHaveBeenCalledWith('agent_lifecycle_events')

      // Test agent deactivation
      const deactivatedAgent = await agentLifecycleManager.deactivateAgent(agent.id)
      expect(deactivatedAgent.status).toBe('inactive')

      // Test agent deletion
      const deleteResult = await agentLifecycleManager.deleteAgent(agent.id)
      expect(deleteResult.success).toBe(true)

      // Cleanup
      await agentLifecycleManager.dispose()
    })

    it('should integrate agent lifecycle with LangChain service', async () => {
      // Setup both services
      const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
      const { LangChainServiceMain } = await import('@/main/services/langchain/langchain-service')

      const mockAgentRegistry = {
        registerAgent: vi.fn().mockResolvedValue({
          id: 'test-agent-id',
          type: 'learning',
          name: 'Test Agent',
          status: 'inactive',
          createdAt: Date.now()
        }),
        activateAgent: vi.fn().mockResolvedValue({
          id: 'test-agent-id',
          status: 'active',
          activatedAt: Date.now()
        })
      }

      const agentLifecycleManager = new AgentLifecycleManager(
        mockAgentRegistry,
        mockServices.database,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      const langChainService = new LangChainServiceMain({
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      })

      await langChainService.initialize()

      // Create agent
      const agentConfig = {
        type: 'learning' as const,
        name: 'AI Integration Agent',
        description: 'Agent that uses LangChain service',
        systemPrompt: 'You are a helpful AI assistant.',
        tools: ['text-generation'],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      }

      const agent = await agentLifecycleManager.createAgent(agentConfig)
      await agentLifecycleManager.activateAgent(agent.id)

      // Test AI interaction through LangChain service
      const messages = [{ role: 'user', content: 'Hello, integration test!' }]
      const response = await langChainService.generateChatResponse('openai', messages)

      expect(response.content).toBeDefined()
      expect(response.metadata.provider).toBe('openai')
      expect(response.isComplete).toBe(true)

      // Verify the mock was called with correct parameters
      const openaiMock = LangChainProviderMockFactory.getProvider('openai')
      expect(openaiMock.invoke).toHaveBeenCalledWith(messages)

      // Cleanup
      await langChainService.dispose()
      await agentLifecycleManager.dispose()
    })
  })

  describe('Catalyst Service Integration', () => {
    it('should integrate catalyst service with all main process services', async () => {
      const { CatalystServiceMain } = await import('@/main/services/catalyst/catalyst-service')

      // Mock main window
      const mockMainWindow = {
        webContents: {
          openDevTools: vi.fn(),
          send: vi.fn()
        },
        on: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        close: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false),
        focus: vi.fn()
      } as any

      const catalystService = new CatalystServiceMain()

      // Mock database creation
      const mockCreateDatabase = vi.fn().mockResolvedValue(mockServices.database)
      const mockRunMigrations = vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })

      vi.doMock('@/main/services/database/kysely-database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations,
        getMigrationStatus: vi.fn().mockResolvedValue({ executed: [], pending: [], total: 0 }),
        rollbackMigrations: vi.fn().mockResolvedValue([]),
        DatabaseFactory: {
          createElectronDB: vi.fn().mockReturnValue(mockServices.database),
          createCustomDB: vi.fn().mockReturnValue(mockServices.database),
        }
      }))

      // Initialize catalyst service
      await catalystService.initialize(mockMainWindow, '/test/workspace')

      // Test service registration
      const database = catalystService.getService('database')
      const logger = catalystService.getService('logger')
      const config = catalystService.getService('config')

      expect(database).toBeDefined()
      expect(logger).toBeDefined()
      expect(config).toBeDefined()

      // Test execution context management
      const mockOperation = vi.fn().mockResolvedValue('test-result')
      const sessionId = 'test-session'
      const operation = 'test-operation'

      const result = await catalystService.runWithContext(sessionId, operation, mockOperation)

      expect(result).toBe('test-result')
      expect(mockOperation).toHaveBeenCalled()

      // Test health monitoring
      const health = await catalystService.getHealth()
      expect(health.status).toBe('healthy')
      expect(health.services).toBeDefined()

      // Test statistics
      const stats = catalystService.getStats()
      expect(stats.initialized).toBe(true)
      expect(stats.disposed).toBe(false)

      // Cleanup
      await catalystService.dispose()
    })

    it('should handle service failures gracefully', async () => {
      const { CatalystServiceMain } = await import('@/main/services/catalyst/catalyst-service')

      const catalystService = new CatalystServiceMain()
      const mockMainWindow = {
        webContents: { send: vi.fn() },
        on: vi.fn(),
        show: vi.fn()
      } as any

      // Mock database failure
      const mockCreateDatabase = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      vi.doMock('@/main/services/database/kysely-database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: vi.fn()
      }))

      // Should handle initialization failure gracefully
      await expect(
        catalystService.initialize(mockMainWindow, '/test/workspace')
      ).rejects.toThrow('Failed to initialize database: Database connection failed')

      // Service should not be initialized
      const stats = catalystService.getStats()
      expect(stats.initialized).toBe(false)
    })
  })

  describe('Database Transaction Integration', () => {
    it('should maintain consistency across service operations', async () => {
      // Setup database with transaction support
      let transactionCallbacks: Array<(db: any) => Promise<any>> = []

      const mockDatabase = {
        ...mockServices.database,
        transaction: vi.fn().mockImplementation(async (callback) => {
          transactionCallbacks.push(callback)
          return callback(mockServices.database)
        })
      }

      // Mock agent registry that uses transactions
      const mockAgentRegistry = {
        registerAgent: vi.fn().mockImplementation(async (config) => {
          // Simulate database operation within transaction
          await mockDatabase.insertInto('agents').values(config).execute()
          return {
            id: 'transaction-agent-id',
            ...config,
            status: 'inactive',
            createdAt: Date.now()
          }
        }),
        activateAgent: vi.fn().mockImplementation(async (id) => {
          await mockDatabase.updateTable('agents').set({ status: 'active' }).where('id', '=', id).execute()
          return { id, status: 'active', activatedAt: Date.now() }
        })
      }

      const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
      const agentLifecycleManager = new AgentLifecycleManager(
        mockAgentRegistry,
        mockDatabase,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      // Create agent (should use transaction)
      const agentConfig = {
        type: 'learning' as const,
        name: 'Transaction Test Agent',
        description: 'Agent for transaction testing',
        systemPrompt: 'Test prompt',
        tools: [],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      }

      const agent = await agentLifecycleManager.createAgent(agentConfig)
      expect(agent.id).toBe('transaction-agent-id')

      // Verify transaction was used
      expect(mockDatabase.transaction).toHaveBeenCalled()
      expect(transactionCallbacks.length).toBeGreaterThan(0)

      // Activate agent (should also use transaction)
      await agentLifecycleManager.activateAgent(agent.id)
      expect(mockDatabase.transaction).toHaveBeenCalledTimes(2)

      // Verify all operations were consistent
      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledWith(agentConfig)
      expect(mockAgentRegistry.activateAgent).toHaveBeenCalledWith(agent.id)

      await agentLifecycleManager.dispose()
    })

    it('should handle transaction rollback on failures', async () => {
      // Setup database with transaction failure
      let shouldFail = false
      const mockDatabase = {
        ...mockServices.database,
        transaction: vi.fn().mockImplementation(async (callback) => {
          if (shouldFail) {
            throw new Error('Transaction failed')
          }
          try {
            return callback(mockServices.database)
          } catch (error) {
            // Simulate rollback
            throw error
          }
        })
      }

      const mockAgentRegistry = {
        registerAgent: vi.fn().mockImplementation(async (config) => {
          if (shouldFail) {
            throw new Error('Agent registration failed')
          }
          return { id: 'fail-agent-id', ...config, status: 'inactive' }
        })
      }

      const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
      const agentLifecycleManager = new AgentLifecycleManager(
        mockAgentRegistry,
        mockDatabase,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      const agentConfig = {
        type: 'learning' as const,
        name: 'Failure Test Agent',
        description: 'Agent that will fail',
        systemPrompt: 'Test prompt',
        tools: [],
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.7
        }
      }

      // First operation succeeds
      const agent1 = await agentLifecycleManager.createAgent(agentConfig)
      expect(agent1).toBeDefined()

      // Second operation fails
      shouldFail = true
      await expect(
        agentLifecycleManager.createAgent(agentConfig)
      ).rejects.toThrow('Agent registration failed')

      // Verify transaction was attempted
      expect(mockDatabase.transaction).toHaveBeenCalledTimes(2)

      await agentLifecycleManager.dispose()
    })
  })

  describe('AsyncLocalStorage Integration', () => {
    it('should maintain context across service calls', async () => {
      const { CatalystServiceMain } = await import('@/main/services/catalyst/catalyst-service')
      const { LangChainServiceMain } = await import('@/main/services/langchain/langchain-service')

      // Setup catalyst service
      const catalystService = new CatalystServiceMain()
      const mockMainWindow = {
        webContents: { send: vi.fn() },
        on: vi.fn(),
        show: vi.fn()
      } as any

      // Mock database
      const mockCreateDatabase = vi.fn().mockResolvedValue(mockServices.database)
      const mockRunMigrations = vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })

      vi.doMock('@/main/services/database/kysely-database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations,
        DatabaseFactory: {
          createElectronDB: vi.fn().mockReturnValue(mockServices.database)
        }
      }))

      await catalystService.initialize(mockMainWindow, '/test/workspace')

      // Setup LangChain service
      const langChainService = new LangChainServiceMain({
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      })
      await langChainService.initialize()

      // Track context propagation
      let capturedContexts: any[] = []

      // Mock context tracking
      const mockAls = catalystService.getService('als')
      mockAls.getStore = vi.fn().mockReturnValue({
        correlationId: 'test-correlation-id',
        sessionId: 'test-session',
        operation: 'test-operation'
      })

      // Run operation within context
      await catalystService.runWithContext('test-session', 'cross-service-test', async () => {
        // Get current context
        const context = mockAls.getStore()
        capturedContexts.push(context)

        // Perform LangChain operation
        const messages = [{ role: 'user', content: 'Context test message' }]
        const response = await langChainService.generateChatResponse('openai', messages)

        capturedContexts.push({
          ...context,
          langChainResponse: response
        })

        return response
      })

      // Verify context was maintained
      expect(capturedContexts).toHaveLength(2)
      expect(capturedContexts[0]).toHaveProperty('correlationId', 'test-correlation-id')
      expect(capturedContexts[1]).toHaveProperty('correlationId', 'test-correlation-id')
      expect(capturedContexts[1]).toHaveProperty('langChainResponse')

      // Cleanup
      await catalystService.dispose()
      await langChainService.dispose()
    })
  })

  describe('Performance Integration', () => {
    it('should handle concurrent cross-service operations efficiently', async () => {
      const { AgentLifecycleManager } = await import('@/main/services/agents/agent-lifecycle-manager')
      const { LangChainServiceMain } = await import('@/main/services/langchain/langchain-service')

      // Setup services
      const mockAgentRegistry = {
        registerAgent: vi.fn().mockImplementation(async (config) => ({
          id: `concurrent-agent-${Math.random()}`,
          ...config,
          status: 'inactive',
          createdAt: Date.now()
        })),
        activateAgent: vi.fn().mockImplementation(async (id) => ({
          id,
          status: 'active',
          activatedAt: Date.now()
        }))
      }

      const agentLifecycleManager = new AgentLifecycleManager(
        mockAgentRegistry,
        mockServices.database,
        mockServices.logger,
        mockServices.asyncLocalStorage
      )

      const langChainService = new LangChainServiceMain({
        defaultProvider: 'openai',
        modelConfigs: {},
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      })
      await langChainService.initialize()

      // Start performance monitoring
      testBase.performanceMonitor.start('concurrent-operations')

      // Create multiple concurrent operations
      const concurrentOperations = 20
      const operations = []

      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(async () => {
          const operationStart = performance.now()

          // Create agent
          const agentConfig = {
            type: 'learning' as const,
            name: `Concurrent Agent ${i}`,
            description: `Agent ${i} for concurrent testing`,
            systemPrompt: 'You are a helpful assistant.',
            tools: [],
            modelConfig: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.7
            }
          }

          const agent = await agentLifecycleManager.createAgent(agentConfig)
          await agentLifecycleManager.activateAgent(agent.id)

          // Perform AI operation
          const messages = [{ role: 'user', content: `Concurrent test message ${i}` }]
          const response = await langChainService.generateChatResponse('openai', messages)

          const operationEnd = performance.now()
          const operationDuration = operationEnd - operationStart

          return { agent, response, duration: operationDuration }
        })
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations.map(op => op()))

      testBase.performanceMonitor.end('concurrent-operations')

      // Verify all operations succeeded
      expect(results).toHaveLength(concurrentOperations)
      results.forEach(result => {
        expect(result.agent).toBeDefined()
        expect(result.response).toBeDefined()
        expect(result.response.content).toBeDefined()
        expect(result.duration).toBeGreaterThan(0)
      })

      // Check performance metrics
      const performanceMetrics = testBase.performanceMonitor.getMetrics()
      expect(performanceMetrics['concurrent-operations']).toBeDefined()

      const averageDuration = performanceMetrics['concurrent-operations'].average
      expect(averageDuration).toBeLessThan(2000) // Should complete within 2 seconds average

      // Cleanup
      await agentLifecycleManager.dispose()
      await langChainService.dispose()
    })
  })
})