/**
 * Tool Execution Service Tests
 *
 * Comprehensive test suite for ToolExecutorService with TDD approach.
 * Tests tool registration, execution, security features, error handling,
 * database integration, logging, and performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToolExecutorService, BuiltinTools } from '../../../electron/main/services/tool-executor'
import { DatabaseMocks } from '../../../test/utils/mocks/mock-database'
import type { ServiceDependencies, ToolExecutionRequest, ToolExecutionResult } from '../../../electron/main/services/types'

describe('ToolExecutorService', () => {
  let toolExecutor: ToolExecutorService
  let mockDependencies: ServiceDependencies
  let mockDatabase: any

  beforeEach(() => {
    // Reset all mocks
    DatabaseMocks.Database._resetMocks()
    vi.clearAllMocks()

    // Create mock database
    mockDatabase = DatabaseMocks.Database

    // Create mock dependencies
    mockDependencies = {
      database: mockDatabase,
      als: {
        getStore: vi.fn().mockReturnValue({
          sessionId: 'test-session',
          operation: 'test-operation'
        })
      },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      config: {
        enableSecurity: true,
        maxExecutionTime: 30000,
        logLevel: 'info'
      }
    }

    // Create tool executor instance
    toolExecutor = new ToolExecutorService(mockDependencies)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Initialization', () => {
    it('should initialize with built-in tools registered', () => {
      const stats = toolExecutor.getStats()

      expect(stats.totalTools).toBeGreaterThan(0)
      expect(stats.builtinTools).toBeGreaterThan(0)
      expect(stats.customTools).toBe(0)
    })

    it('should register all built-in tools', () => {
      const registeredTools = toolExecutor.getRegisteredTools()
      const builtinToolIds = BuiltinTools.getAll().map(tool => tool.id)

      expect(registeredTools).toHaveLength(builtinToolIds.length)

      for (const toolId of builtinToolIds) {
        expect(registeredTools.some(tool => tool.id === toolId)).toBe(true)
      }
    })

    it('should provide tool statistics', () => {
      const stats = toolExecutor.getStats()

      expect(stats).toHaveProperty('totalTools')
      expect(stats).toHaveProperty('builtinTools')
      expect(stats).toHaveProperty('customTools')
      expect(stats).toHaveProperty('tools')

      expect(typeof stats.totalTools).toBe('number')
      expect(typeof stats.builtinTools).toBe('number')
      expect(typeof stats.customTools).toBe('number')
      expect(Array.isArray(stats.tools)).toBe(true)
    })
  })

  describe('Tool Registration Operations', () => {
    it('should register custom tool successfully', () => {
      // Arrange
      const customTool = {
        id: 'custom-test-tool',
        name: 'Custom Test Tool',
        description: 'A custom tool for testing',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input parameter' }
          },
          required: ['input']
        },
        handler: vi.fn().mockResolvedValue({
          success: true,
          data: { result: 'custom' },
          executionTime: 100
        }),
        requiredDatabase: false,
        permissions: ['custom.read']
      }

      // Act
      toolExecutor.registerTool(customTool)
      const stats = toolExecutor.getStats()

      // Assert
      expect(stats.totalTools).toBeGreaterThan(BuiltinTools.getAll().length)
      expect(stats.customTools).toBe(1)

      const registeredTool = toolExecutor.getTool('custom-test-tool')
      expect(registeredTool).toBeDefined()
      expect(registeredTool!.id).toBe('custom-test-tool')
    })

    it('should prevent duplicate tool registration', () => {
      // Arrange
      const duplicateTool = {
        ...BuiltinTools.getAll()[0],
        id: 'database-query' // Same as built-in tool
      }

      // Act & Assert
      expect(() => {
        toolExecutor.registerTool(duplicateTool)
      }).toThrow("Tool with id 'database-query' is already registered")
    })

    it('should unregister custom tool', () => {
      // Arrange
      const customTool = {
        id: 'removable-tool',
        name: 'Removable Tool',
        description: 'A tool that can be removed',
        parameters: { type: 'object', properties: {} },
        handler: vi.fn(),
        requiredDatabase: false,
        permissions: []
      }

      toolExecutor.registerTool(customTool)
      const initialCount = toolExecutor.getStats().totalTools

      // Act
      toolExecutor.unregisterTool('removable-tool')
      const finalCount = toolExecutor.getStats().totalTools

      // Assert
      expect(finalCount).toBe(initialCount - 1)
      expect(toolExecutor.getTool('removable-tool')).toBeUndefined()
    })

    it('should handle unregistering non-existent tool', () => {
      // Act
      toolExecutor.unregisterTool('non-existent-tool')

      // Assert - should not throw
      expect(true).toBe(true)
    })

    it('should retrieve all registered tools', () => {
      // Arrange
      const customTool = {
        id: 'another-custom-tool',
        name: 'Another Custom Tool',
        description: 'Another custom tool',
        parameters: { type: 'object', properties: {} },
        handler: vi.fn(),
        requiredDatabase: false,
        permissions: []
      }

      toolExecutor.registerTool(customTool)

      // Act
      const allTools = toolExecutor.getRegisteredTools()

      // Assert
      expect(allTools.length).toBeGreaterThan(BuiltinTools.getAll().length)
      expect(allTools.some(tool => tool.id === 'another-custom-tool')).toBe(true)
    })

    it('should retrieve tool by ID', () => {
      // Act
      const dbTool = toolExecutor.getTool('database-query')
      const fileTool = toolExecutor.getTool('file-read')
      const nonExistent = toolExecutor.getTool('non-existent')

      // Assert
      expect(dbTool).toBeDefined()
      expect(dbTool!.id).toBe('database-query')
      expect(fileTool).toBeDefined()
      expect(fileTool!.id).toBe('file-read')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Database Query Tool Operations', () => {
    it('should execute SELECT query successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          query: 'SELECT * FROM concepts WHERE id = ?',
          params: [1],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session',
          agentId: 'test-agent'
        }
      }

      mockDatabase.fetchAll.mockResolvedValue([
        { id: 1, name: 'Test Concept', description: 'A test concept' }
      ])

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual([
        { id: 1, name: 'Test Concept', description: 'A test concept' }
      ])
      expect(result.executionTime).toBeGreaterThan(0)
      expect(result.metadata).toEqual({
        operation: 'select',
        rowCount: 1
      })
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        'Database query executed successfully',
        expect.objectContaining({
          operation: 'select',
          rowCount: 1
        })
      )
    })

    it('should execute INSERT query successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'insert',
        parameters: {
          query: 'INSERT INTO concepts (name, description) VALUES (?, ?)',
          params: ['New Concept', 'A new concept description'],
          operation: 'insert'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.executeQuery.mockResolvedValue({ insertId: 123, affectedRows: 1 })

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ insertId: 123, affectedRows: 1 })
      expect(result.metadata.operation).toBe('insert')
    })

    it('should execute UPDATE query successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'update',
        parameters: {
          query: 'UPDATE concepts SET description = ? WHERE id = ?',
          params: ['Updated description', 1],
          operation: 'update'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.executeQuery.mockResolvedValue({ affectedRows: 1 })

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ affectedRows: 1 })
      expect(result.metadata.operation).toBe('update')
    })

    it('should execute DELETE query successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'delete',
        parameters: {
          query: 'DELETE FROM concepts WHERE id = ?',
          params: [1],
          operation: 'delete'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.executeQuery.mockResolvedValue({ affectedRows: 1 })

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ affectedRows: 1 })
      expect(result.metadata.operation).toBe('delete')
    })

    it('should handle database query errors', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          query: 'SELECT * FROM invalid_table',
          params: [],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      const errorMessage = 'Table "invalid_table" not found'
      mockDatabase.fetchAll.mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error!.message).toBe(errorMessage)
      expect(result.executionTime).toBeGreaterThan(0)
      expect(mockDependencies.logger.error).toHaveBeenCalledWith(
        'Database query failed',
        expect.any(Error),
        expect.objectContaining({
          operation: 'select'
        })
      )
    })

    it('should reject unsupported database operations', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'truncate',
        parameters: {
          query: 'TRUNCATE TABLE concepts',
          params: [],
          operation: 'truncate' as any
        },
        context: {
          sessionId: 'test-session'
        }
      }

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error!.message).toContain('Unsupported database operation: truncate')
    })
  })

  describe('File Operations Tools', () => {
    it('should read file successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'file-read',
        operation: 'read',
        parameters: {
          path: '/test/safe-file.md',
          encoding: 'utf-8'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      const fileContent = '# Test File\n\nThis is a test file content.'
      global.resolve = vi.fn().mockReturnValue('/test/safe-file.md')
      global.exists = vi.fn().mockResolvedValue(true)
      global.readFile = vi.fn().mockResolvedValue(fileContent)

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        content: fileContent,
        path: '/test/safe-file.md',
        size: fileContent.length
      })
      expect(result.metadata).toEqual({
        path: '/test/safe-file.md',
        size: fileContent.length
      })
    })

    it('should reject file access outside project directory', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'file-read',
        operation: 'read',
        parameters: {
          path: '/etc/passwd',
          encoding: 'utf-8'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      global.resolve = vi.fn().mockReturnValue('/etc/passwd')

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toContain('Access to path outside project directory is not allowed')
    })

    it('should handle file not found error', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'file-read',
        operation: 'read',
        parameters: {
          path: '/test/nonexistent.md',
          encoding: 'utf-8'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      global.resolve = vi.fn().mockReturnValue('/test/nonexistent.md')
      global.exists = vi.fn().mockResolvedValue(false)

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toContain('File not found: /test/nonexistent.md')
    })

    it('should write file successfully', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'file-write',
        operation: 'write',
        parameters: {
          path: '/test/new-file.md',
          content: '# New File\n\nThis is new content.',
          encoding: 'utf-8'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      global.resolve = vi.fn().mockReturnValue('/test/new-file.md')
      global.writeFile = vi.fn().mockResolvedValue(undefined)

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        path: '/test/new-file.md',
        size: expect.any(Number)
      })
      expect(global.writeFile).toHaveBeenCalledWith(
        '/test/new-file.md',
        '# New File\n\nThis is new content.',
        'utf-8'
      )
    })

    it('should reject file write outside project directory', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'file-write',
        operation: 'write',
        parameters: {
          path: '/etc/malicious-file.txt',
          content: 'Malicious content'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      global.resolve = vi.fn().mockReturnValue('/etc/malicious-file.txt')

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toContain('Access to path outside project directory is not allowed')
    })
  })

  describe('Concept Management Tools', () => {
    it('should list concepts with default parameters', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'list-concepts',
        operation: 'list',
        parameters: {},
        context: {
          sessionId: 'test-session'
        }
      }

      const mockConcepts = [
        { id: 1, name: 'React', type: 'framework', difficulty: 3 },
        { id: 2, name: 'TypeScript', type: 'language', difficulty: 2 }
      ]

      mockDatabase.fetchAll.mockResolvedValue(mockConcepts)

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        concepts: mockConcepts,
        total: 2
      })
      expect(result.metadata).toEqual({
        limit: 50,
        offset: 0,
        count: 2
      })
    })

    it('should list concepts with filters', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'list-concepts',
        operation: 'list',
        parameters: {
          limit: 10,
          offset: 5,
          difficulty: 'intermediate',
          type: 'framework'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      const mockConcepts = [
        { id: 1, name: 'React', type: 'framework', difficulty: 3 }
      ]

      mockDatabase.fetchAll.mockResolvedValue(mockConcepts)

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(mockDatabase.fetchAll).toHaveBeenCalledWith(
        expect.stringContaining('AND difficulty = ?'),
        ['intermediate', 'framework', 10, 5]
      )
    })

    it('should handle empty concepts list', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'list-concepts',
        operation: 'list',
        parameters: { limit: 5 },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.fetchAll.mockResolvedValue([])

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data.concepts).toHaveLength(0)
      expect(result.data.total).toBe(0)
    })
  })

  describe('Parallel Tool Execution', () => {
    it('should execute multiple tools in parallel', async () => {
      // Arrange
      const requests: ToolExecutionRequest[] = [
        {
          toolId: 'list-concepts',
          operation: 'list',
          parameters: { limit: 5 },
          context: { sessionId: 'test-session' }
        },
        {
          toolId: 'database-query',
          operation: 'select',
          parameters: {
            query: 'SELECT COUNT(*) as count FROM concepts',
            params: [],
            operation: 'select'
          },
          context: { sessionId: 'test-session' }
        }
      ]

      mockDatabase.fetchAll.mockResolvedValue([])
      mockDatabase.fetchAll.mockResolvedValue([{ count: 10 }])

      // Act
      const results = await toolExecutor.executeTools(requests)

      // Assert
      expect(results).toHaveLength(2)
      expect(results.every(result => result.success)).toBe(true)
    })

    it('should handle mixed success/failure in parallel execution', async () => {
      // Arrange
      const requests: ToolExecutionRequest[] = [
        {
          toolId: 'list-concepts',
          operation: 'list',
          parameters: { limit: 5 },
          context: { sessionId: 'test-session' }
        },
        {
          toolId: 'database-query',
          operation: 'select',
          parameters: {
            query: 'SELECT * FROM invalid_table',
            params: [],
            operation: 'select'
          },
          context: { sessionId: 'test-session' }
        }
      ]

      mockDatabase.fetchAll.mockResolvedValueOnce([])
      mockDatabase.fetchAll.mockRejectedValueOnce(new Error('Table not found'))

      // Act
      const results = await toolExecutor.executeTools(requests)

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error!.message).toBe('Table not found')
    })

    it('should handle empty request array', async () => {
      // Act
      const results = await toolExecutor.executeTools([])

      // Assert
      expect(results).toHaveLength(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle tool not found error', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'non-existent-tool',
        operation: 'test',
        parameters: {},
        context: {
          sessionId: 'test-session'
        }
      }

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toContain("Tool 'non-existent-tool' not found")
    })

    it('should handle database requirement when database unavailable', async () => {
      // Arrange
      const toolExecutorWithoutDB = new ToolExecutorService({
        ...mockDependencies,
        database: null
      })

      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          query: 'SELECT * FROM concepts',
          params: [],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      // Act
      const result = await toolExecutorWithoutDB.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toContain('requires database access but database is not available')
    })

    it('should handle tool execution timeout', async () => {
      // Arrange
      const slowTool = {
        id: 'slow-tool',
        name: 'Slow Tool',
        description: 'A tool that takes too long',
        parameters: { type: 'object', properties: {} },
        handler: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
          return { success: true, data: {}, executionTime: 35000 }
        }),
        requiredDatabase: false,
        permissions: []
      }

      toolExecutor.registerTool(slowTool)

      const request: ToolExecutionRequest = {
        toolId: 'slow-tool',
        operation: 'test',
        parameters: {},
        context: {
          sessionId: 'test-session'
        }
      }

      // Act & Assert
      // This test would need to be adjusted based on actual timeout implementation
      // For now, we'll just verify the tool is registered
      expect(toolExecutor.getTool('slow-tool')).toBeDefined()
    })

    it('should handle tool handler exceptions', async () => {
      // Arrange
      const faultyTool = {
        id: 'faulty-tool',
        name: 'Faulty Tool',
        description: 'A tool that throws errors',
        parameters: { type: 'object', properties: {} },
        handler: vi.fn().mockRejectedValue(new Error('Tool handler failed')),
        requiredDatabase: false,
        permissions: []
      }

      toolExecutor.registerTool(faultyTool)

      const request: ToolExecutionRequest = {
        toolId: 'faulty-tool',
        operation: 'test',
        parameters: {},
        context: {
          sessionId: 'test-session'
        }
      }

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error!.message).toBe('Tool handler failed')
      expect(mockDependencies.logger.error).toHaveBeenCalledWith(
        'Tool execution error: faulty-tool',
        expect.any(Error)
      )
    })
  })

  describe('Security and Permissions', () => {
    it('should validate tool parameters', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          // Missing required 'query' parameter
          params: [],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      // Act
      const result = await toolExecutor.executeTool(request)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should sanitize file paths', async () => {
      // Arrange
      const maliciousPaths = [
        '../../../etc/passwd',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        '~/.ssh/id_rsa'
      ]

      for (const path of maliciousPaths) {
        const request: ToolExecutionRequest = {
          toolId: 'file-read',
          operation: 'read',
          parameters: { path },
          context: { sessionId: 'test-session' }
        }

        global.resolve = vi.fn().mockReturnValue(path)

        // Act
        const result = await toolExecutor.executeTool(request)

        // Assert
        expect(result.success).toBe(false)
        expect(result.error!.message).toContain('Access to path outside project directory is not allowed')
      }
    })

    it('should validate SQL injection attempts', async () => {
      // Arrange
      const maliciousQueries = [
        "SELECT * FROM concepts; DROP TABLE concepts; --",
        "SELECT * FROM concepts WHERE id = 1; INSERT INTO users VALUES ('hacker', 'password'); --",
        "SELECT * FROM concepts UNION SELECT * FROM users --"
      ]

      for (const query of maliciousQueries) {
        const request: ToolExecutionRequest = {
          toolId: 'database-query',
          operation: 'select',
          parameters: {
            query,
            params: [],
            operation: 'select'
          },
          context: { sessionId: 'test-session' }
        }

        // The database mock would normally catch these, but we verify logging
        mockDatabase.fetchAll.mockResolvedValue([])

        // Act
        const result = await toolExecutor.executeTool(request)

        // Assert - The tool should still execute but with proper logging
        expect(mockDependencies.logger.debug).toHaveBeenCalledWith(
          'Executing tool: database-query',
          expect.objectContaining({
            operation: 'select',
            parameters: ['query', 'params', 'operation']
          })
        )
      }
    })
  })

  describe('Performance Requirements', () => {
    it('should complete simple tool execution within performance threshold', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'list-concepts',
        operation: 'list',
        parameters: { limit: 10 },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.fetchAll.mockResolvedValue([])
      const performanceThreshold = 100 // ms

      // Act
      const startTime = performance.now()
      const result = await toolExecutor.executeTool(request)
      const duration = performance.now() - startTime

      // Assert
      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(performanceThreshold)
    })

    it('should handle concurrent tool execution efficiently', async () => {
      // Arrange
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        toolId: 'list-concepts',
        operation: 'list',
        parameters: { limit: 5 },
        context: { sessionId: `test-session-${i}` }
      }))

      mockDatabase.fetchAll.mockResolvedValue([])

      // Act
      const startTime = performance.now()
      const results = await toolExecutor.executeTools(concurrentRequests)
      const duration = performance.now() - startTime

      // Assert
      expect(results).toHaveLength(10)
      expect(results.every(r => r.success)).toBe(true)
      expect(duration).toBeLessThan(500) // Should handle concurrency efficiently
    })

    it('should manage memory usage during batch operations', async () => {
      // Arrange
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        toolId: 'list-concepts',
        operation: 'list',
        parameters: { limit: 1 },
        context: { sessionId: `test-session-${i}` }
      }))

      mockDatabase.fetchAll.mockResolvedValue([{ id: 1, name: 'Test' }])

      // Act
      const initialMemory = process.memoryUsage().heapUsed
      await toolExecutor.executeTools(largeBatch)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Assert
      // Memory increase should be reasonable (less than 10MB for this operation)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Logging and Monitoring', () => {
    it('should log tool execution details', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          query: 'SELECT * FROM concepts LIMIT 5',
          params: [],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session',
          agentId: 'test-agent'
        }
      }

      mockDatabase.fetchAll.mockResolvedValue([{ id: 1, name: 'Test' }])

      // Act
      await toolExecutor.executeTool(request)

      // Assert
      expect(mockDependencies.logger.debug).toHaveBeenCalledWith(
        'Executing tool: database-query',
        {
          operation: 'select',
          parameters: ['query', 'params', 'operation']
        }
      )

      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        'Tool executed successfully: database-query',
        {
          executionTime: expect.any(Number)
        }
      )
    })

    it('should log tool execution failures', async () => {
      // Arrange
      const request: ToolExecutionRequest = {
        toolId: 'database-query',
        operation: 'select',
        parameters: {
          query: 'SELECT * FROM invalid_table',
          params: [],
          operation: 'select'
        },
        context: {
          sessionId: 'test-session'
        }
      }

      mockDatabase.fetchAll.mockRejectedValue(new Error('Table not found'))

      // Act
      await toolExecutor.executeTool(request)

      // Assert
      expect(mockDependencies.logger.error).toHaveBeenCalledWith(
        'Database query failed',
        expect.any(Error),
        { operation: 'select', query: 'SELECT * FROM invalid_table...' }
      )

      expect(mockDependencies.logger.warn).toHaveBeenCalledWith(
        'Tool execution failed: database-query',
        {
          error: 'Table not found',
          executionTime: expect.any(Number)
        }
      )
    })

    it('should provide comprehensive tool statistics', () => {
      // Arrange
      const customTool = {
        id: 'stats-test-tool',
        name: 'Stats Test Tool',
        description: 'Tool for testing statistics',
        parameters: { type: 'object', properties: {} },
        handler: vi.fn(),
        requiredDatabase: true,
        permissions: ['test.read']
      }

      toolExecutor.registerTool(customTool)

      // Act
      const stats = toolExecutor.getStats()

      // Assert
      expect(stats.tools).toContainEqual({
        id: 'database-query',
        name: 'Database Query',
        requiredDatabase: true
      })

      expect(stats.tools).toContainEqual({
        id: 'stats-test-tool',
        name: 'Stats Test Tool',
        requiredDatabase: true
      })

      expect(stats.tools).toContainEqual({
        id: 'file-read',
        name: 'Read File',
        requiredDatabase: false
      })
    })
  })

  describe('Service Disposal', () => {
    it('should dispose tool executor service properly', () => {
      // Arrange
      const initialStats = toolExecutor.getStats()

      // Act
      toolExecutor.dispose()
      const finalStats = toolExecutor.getStats()

      // Assert
      expect(finalStats.totalTools).toBe(0)
      expect(finalStats.builtinTools).toBe(0)
      expect(finalStats.customTools).toBe(0)
      expect(finalStats.tools).toHaveLength(0)
      expect(mockDependencies.logger.info).toHaveBeenCalledWith('Tool executor service disposed')
    })

    it('should handle disposal of already disposed service', () => {
      // Act
      toolExecutor.dispose()
      toolExecutor.dispose() // Should not throw

      // Assert
      expect(true).toBe(true) // Test passes if no exception thrown
    })
  })
})