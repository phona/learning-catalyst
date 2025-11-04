/**
 * Catalyst Service Main Tests
 *
 * Comprehensive test suite for CatalystServiceMain orchestrator with TDD approach.
 * Tests service initialization, dependency injection, orchestration, health monitoring,
 * error handling, and performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CatalystServiceMain, initializeCatalystService, disposeCatalystService, getCatalystService } from '../../../electron/main/services/catalyst/catalyst-service'
import { DatabaseMocks } from '../../../test/utils/mocks/mock-database'
import type { BrowserWindow } from 'electron'

describe('CatalystServiceMain', () => {
  let catalystService: CatalystServiceMain
  let mockMainWindow: BrowserWindow | null
  let mockWorkspacePath: string

  beforeEach(() => {
    // Reset all mocks
    DatabaseMocks.Database._resetMocks()
    vi.clearAllMocks()

    // Create mock main window
    mockMainWindow = {
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

    mockWorkspacePath = '/test/workspace'

    // Create service instance
    catalystService = new CatalystServiceMain()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Initialization', () => {
    it('should create catalyst service instance', () => {
      expect(catalystService).toBeInstanceOf(CatalystServiceMain)
    })

    it('should initialize successfully with valid parameters', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockResolvedValue(DatabaseMocks.Database)
      const mockRunMigrations = vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })

      // Mock the database creation and migration
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).resolves.not.toThrow()

      const stats = catalystService.getStats()
      expect(stats.initialized).toBe(true)
      expect(stats.disposed).toBe(false)
    })

    it('should prevent multiple initializations', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      // Act
      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Catalyst service has already been initialized')
    })

    it('should prevent initialization of disposed service', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
      await catalystService.dispose()

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Catalyst service has been disposed and cannot be reinitialized')
    })

    it('should handle database initialization failure', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: vi.fn()
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Failed to initialize database: Database connection failed')

      const stats = catalystService.getStats()
      expect(stats.initialized).toBe(false)
    })

    it('should handle migration failure', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockResolvedValue(DatabaseMocks.Database)
      const mockRunMigrations = vi.fn().mockRejectedValue(new Error('Migration failed'))

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Failed to initialize database: Migration failed')
    })
  })

  describe('Service Registry and Dependency Injection', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should register core services during initialization', () => {
      // Act
      const configService = catalystService.getService('config')
      const loggerFactory = catalystService.getService('loggerFactory')
      const logger = catalystService.getService('logger')
      const database = catalystService.getService('database')

      // Assert
      expect(configService).toBeDefined()
      expect(loggerFactory).toBeDefined()
      expect(logger).toBeDefined()
      expect(database).toBeDefined()
    })

    it('should register tool executor service', () => {
      // Act
      const toolExecutor = catalystService.getService('toolExecutor')

      // Assert
      expect(toolExecutor).toBeDefined()
    })

    it('should register agent manager service', () => {
      // Act
      const agentManager = catalystService.getService('agentManager')

      // Assert
      expect(agentManager).toBeDefined()
    })

    it('should register dependencies object', () => {
      // Act
      const dependencies = catalystService.getService('dependencies')

      // Assert
      expect(dependencies).toBeDefined()
      expect(dependencies).toHaveProperty('database')
      expect(dependencies).toHaveProperty('toolExecutor')
      expect(dependencies).toHaveProperty('agentManager')
      expect(dependencies).toHaveProperty('config')
      expect(dependencies).toHaveProperty('loggerFactory')
      expect(dependencies).toHaveProperty('logger')
      expect(dependencies).toHaveProperty('als')
      expect(dependencies).toHaveProperty('registry')
    })

    it('should reject service access before initialization', () => {
      // Arrange
      const uninitializedService = new CatalystServiceMain()

      // Act & Assert
      expect(() => uninitializedService.getService('config')).toThrow('Catalyst service has not been initialized')
    })

    it('should return undefined for non-existent service', () => {
      // Act
      const nonExistentService = catalystService.getService('nonExistentService')

      // Assert
      expect(nonExistentService).toBeUndefined()
    })
  })

  describe('Execution Context Management', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should run operations within execution context', async () => {
      // Arrange
      const mockOperation = vi.fn().mockResolvedValue('test-result')
      const sessionId = 'test-session'
      const operation = 'test-operation'
      const metadata = { userId: 'test-user' }

      // Act
      const result = await catalystService.runWithContext(sessionId, operation, mockOperation, metadata)

      // Assert
      expect(result).toBe('test-result')
      expect(mockOperation).toHaveBeenCalled()
    })

    it('should handle context execution errors', async () => {
      // Arrange
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'))
      const sessionId = 'test-session'
      const operation = 'test-operation'

      // Act & Assert
      await expect(catalystService.runWithContext(sessionId, operation, mockOperation)).rejects.toThrow('Operation failed')
    })

    it('should reject context execution before initialization', async () => {
      // Arrange
      const uninitializedService = new CatalystServiceMain()
      const mockOperation = vi.fn().mockResolvedValue('result')

      // Act & Assert
      await expect(uninitializedService.runWithContext('session', 'op', mockOperation)).rejects.toThrow('Catalyst service has not been initialized')
    })
  })

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should return healthy status for all services', async () => {
      // Arrange
      DatabaseMocks.Database.connected = true
      DatabaseMocks.Database.fetchOne.mockResolvedValue({ test: 1 })

      // Act
      const health = await catalystService.getHealth()

      // Assert
      expect(health.status).toBe('healthy')
      expect(health.services.catalystService.status).toBe('healthy')
      expect(health.services.database.status).toBe('healthy')
      expect(health.services.toolExecutor.status).toBe('healthy')
      expect(health.services.agentManager.status).toBe('healthy')
    })

    it('should detect database health issues', async () => {
      // Arrange
      DatabaseMocks.Database._simulateConnectionFailure()

      // Act
      const health = await catalystService.getHealth()

      // Assert
      expect(health.status).toBe('unhealthy')
      expect(health.services.database.status).toBe('unhealthy')
      expect(health.services.database.error).toContain('Database connection failed')
    })

    it('should provide service metrics', async () => {
      // Act
      const health = await catalystService.getHealth()

      // Assert
      expect(health.services.catalystService.metrics).toHaveProperty('initialized')
      expect(health.services.catalystService.metrics).toHaveProperty('disposed')
      expect(health.services.catalystService.metrics).toHaveProperty('registrySize')

      expect(health.services.database.metrics).toHaveProperty('connected')
      expect(health.services.database.metrics.connected).toBe(false)

      expect(health.services.toolExecutor.metrics).toBeDefined()
      expect(health.services.agentManager.metrics).toBeDefined()
    })

    it('should handle health check errors gracefully', async () => {
      // Arrange
      DatabaseMocks.Database.fetchOne.mockRejectedValue(new Error('Health check failed'))

      // Act
      const health = await catalystService.getHealth()

      // Assert
      expect(health.services.database.status).toBe('unhealthy')
      expect(health.services.database.error).toBe('Health check failed')
    })
  })

  describe('Service Statistics', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should provide comprehensive service statistics', () => {
      // Act
      const stats = catalystService.getStats()

      // Assert
      expect(stats).toHaveProperty('initialized')
      expect(stats).toHaveProperty('disposed')
      expect(stats).toHaveProperty('registry')
      expect(stats).toHaveProperty('config')

      expect(stats.initialized).toBe(true)
      expect(stats.disposed).toBe(false)
      expect(typeof stats.registry).toBe('object')
      expect(typeof stats.config).toBe('object')
    })

    it('should track initialization state', () => {
      // Act
      const stats = catalystService.getStats()

      // Assert
      expect(stats.initialized).toBe(true)
    })

    it('should track disposal state', async () => {
      // Arrange
      await catalystService.dispose()

      // Act
      const stats = catalystService.getStats()

      // Assert
      expect(stats.disposed).toBe(true)
    })
  })

  describe('Service Lifecycle Management', () => {
    it('should dispose all services properly', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Act
      await catalystService.dispose()

      // Assert
      const stats = catalystService.getStats()
      expect(stats.disposed).toBe(true)
      expect(stats.initialized).toBe(false)
    })

    it('should handle multiple disposal calls gracefully', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Act
      await catalystService.dispose()
      await catalystService.dispose() // Should not throw

      // Assert
      expect(true).toBe(true) // Test passes if no exception thrown
    })

    it('should handle disposal errors gracefully', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Mock disposal error
      const mockAgentManager = catalystService.getService('agentManager') as any
      mockAgentManager.dispose = vi.fn().mockImplementation(() => {
        throw new Error('Agent manager disposal failed')
      })

      // Act & Assert
      await expect(catalystService.dispose()).rejects.toThrow('Agent manager disposal failed')
    })
  })

  describe('Force Reinitialization (Development Only)', () => {
    beforeEach(() => {
      // Mock development environment
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      delete process.env.NODE_ENV
    })

    it('should allow force reinitialization in development', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
      const originalStats = catalystService.getStats()

      // Act
      await catalystService.forceReinitialize(mockMainWindow, mockWorkspacePath)

      // Assert
      const newStats = catalystService.getStats()
      expect(newStats.initialized).toBe(true)
      expect(originalStats).not.toBe(newStats) // Should be a new instance
    })

    it('should reject force reinitialization in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production'
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Act & Assert
      await expect(catalystService.forceReinitialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Force reinitialization is not allowed in production')
    })

    it('should handle force reinitialization errors', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Mock database failure on reinitialization
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockRejectedValue(new Error('Reinit failed')),
        runMigrations: vi.fn()
      }))

      // Act & Assert
      await expect(catalystService.forceReinitialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Reinit failed')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle initialization failure with proper cleanup', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockRejectedValue(new Error('Critical database error'))

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: vi.fn()
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow()

      // Service should be in a clean state
      const stats = catalystService.getStats()
      expect(stats.initialized).toBe(false)
    })

    it('should handle tool executor initialization failure', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockResolvedValue(DatabaseMocks.Database)
      const mockRunMigrations = vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations
      }))

      // Mock tool executor constructor throwing error
      vi.doMock('../../../electron/main/services/tool-executor', () => ({
        ToolExecutorService: vi.fn().mockImplementation(() => {
          throw new Error('Tool executor initialization failed')
        })
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow()
    })

    it('should handle agent manager initialization failure', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockResolvedValue(DatabaseMocks.Database)
      const mockRunMigrations = vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations
      }))

      // Mock agent manager constructor throwing error
      vi.doMock('../../../electron/main/services/agents/agent-manager', () => ({
        AgentManagerMain: vi.fn().mockImplementation(() => {
          throw new Error('Agent manager initialization failed')
        })
      }))

      // Act & Assert
      await expect(catalystService.initialize(mockMainWindow, mockWorkspacePath)).rejects.toThrow()
    })
  })

  describe('Performance Requirements', () => {
    it('should initialize within performance threshold', async () => {
      // Arrange
      const mockCreateDatabase = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return DatabaseMocks.Database
      })
      const mockRunMigrations = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30))
        return { applied: 1, skipped: 0, failed: 0 }
      })

      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: mockCreateDatabase,
        runMigrations: mockRunMigrations
      }))

      const performanceThreshold = 1000 // ms

      // Act
      const startTime = performance.now()
      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
      const duration = performance.now() - startTime

      // Assert
      expect(duration).toBeLessThan(performanceThreshold)
    })

    it('should complete health checks quickly', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
      DatabaseMocks.Database.fetchOne.mockResolvedValue({ test: 1 })

      const performanceThreshold = 100 // ms

      // Act
      const startTime = performance.now()
      const health = await catalystService.getHealth()
      const duration = performance.now() - startTime

      // Assert
      expect(health.status).toBe('healthy')
      expect(duration).toBeLessThan(performanceThreshold)
    })

    it('should handle concurrent service access efficiently', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)

      // Act
      const startTime = performance.now()
      const concurrentRequests = Array.from({ length: 50 }, () =>
        catalystService.getService('config')
      )

      await Promise.all(concurrentRequests)
      const duration = performance.now() - startTime

      // Assert
      expect(duration).toBeLessThan(100) // Should handle concurrent access quickly
    })
  })

  describe('Global Service Management', () => {
    afterEach(() => {
      // Clean up global service after each test
      vi.doMock('../../../electron/main/services/catalyst/catalyst-service', () => ({
        globalCatalystService: null
      }))
    })

    it('should initialize global catalyst service', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      // Act
      const globalService = await initializeCatalystService(mockMainWindow, mockWorkspacePath)

      // Assert
      expect(globalService).toBeInstanceOf(CatalystServiceMain)
      expect(getCatalystService()).toBe(globalService)
    })

    it('should prevent multiple global service initialization', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      // Act
      await initializeCatalystService(mockMainWindow, mockWorkspacePath)

      // Assert
      await expect(initializeCatalystService(mockMainWindow, mockWorkspacePath)).rejects.toThrow('Catalyst service has already been initialized')
    })

    it('should dispose global catalyst service', async () => {
      // Arrange
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await initializeCatalystService(mockMainWindow, mockWorkspacePath)

      // Act
      await disposeCatalystService()

      // Assert
      expect(getCatalystService()).toBeNull()
    })

    it('should handle disposal of non-existent global service', async () => {
      // Act & Assert
      await expect(disposeCatalystService()).resolves.not.toThrow()
    })

    it('should return null when no global service exists', () => {
      // Act
      const service = getCatalystService()

      // Assert
      expect(service).toBeNull()
    })
  })

  describe('Integration with Other Services', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should integrate with tool executor service', () => {
      // Act
      const toolExecutor = catalystService.getService('toolExecutor')

      // Assert
      expect(toolExecutor).toBeDefined()
      expect(typeof toolExecutor.executeTool).toBe('function')
      expect(typeof toolExecutor.getStats).toBe('function')
    })

    it('should integrate with agent manager service', () => {
      // Act
      const agentManager = catalystService.getService('agentManager')

      // Assert
      expect(agentManager).toBeDefined()
      expect(typeof agentManager.getStats).toBe('function')
    })

    it('should provide access to database through dependency injection', () => {
      // Act
      const database = catalystService.getService('database')

      // Assert
      expect(database).toBeDefined()
      expect(database).toBe(DatabaseMocks.Database)
    })

    it('should provide access to logging infrastructure', () => {
      // Act
      const logger = catalystService.getService('logger')
      const loggerFactory = catalystService.getService('loggerFactory')

      // Assert
      expect(logger).toBeDefined()
      expect(loggerFactory).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
    })
  })

  describe('Configuration Management', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should provide access to configuration service', () => {
      // Act
      const config = catalystService.getService('config')

      // Assert
      expect(config).toBeDefined()
      expect(typeof config.getConfig).toBe('function')
      expect(typeof config.getDatabaseConfig).toBe('function')
    })

    it('should pass configuration to dependent services', () => {
      // Act
      const dependencies = catalystService.getService('dependencies')

      // Assert
      expect(dependencies).toBeDefined()
      expect(dependencies).toHaveProperty('config')
    })
  })

  describe('AsyncLocalStorage Integration', () => {
    beforeEach(async () => {
      vi.doMock('../../../src/modules/database', () => ({
        createDatabase: vi.fn().mockResolvedValue(DatabaseMocks.Database),
        runMigrations: vi.fn().mockResolvedValue({ applied: 1, skipped: 0, failed: 0 })
      }))

      await catalystService.initialize(mockMainWindow, mockWorkspacePath)
    })

    it('should provide access to AsyncLocalStorage', () => {
      // Act
      const als = catalystService.getService('als')

      // Assert
      expect(als).toBeDefined()
      expect(typeof als.run).toBe('function')
      expect(typeof als.getStore).toBe('function')
    })

    it('should use AsyncLocalStorage for context management', async () => {
      // Arrange
      const mockOperation = vi.fn().mockResolvedValue('result')
      const contextData = { sessionId: 'test-session', operation: 'test-op' }

      // Act
      await catalystService.runWithContext('test-session', 'test-op', mockOperation, contextData)

      // Assert
      expect(mockOperation).toHaveBeenCalled()
      // Additional assertions could be made about context propagation if loggerFactory is mocked
    })
  })
})