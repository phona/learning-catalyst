/**
 * Electron IPC Adapter Test
 *
 * Tests the Kysely Electron IPC adapter implementation
 */

import { describe, it, expect, vi } from 'vitest'
import { ElectronIPCAdapter, DatabaseFactory } from '../../../modules/database/kysely-database'
import type { ElectronAPI } from '../../types/global'

// Mock ElectronAPI
const mockElectronAPI: Partial<ElectronAPI> = {
  getDatabasePath: vi.fn().mockResolvedValue('/test/path/database.db'),
  dbSetPath: vi.fn().mockResolvedValue({ success: true }),
  dbExecuteQuery: vi.fn(),
}

describe('ElectronIPCAdapter', () => {
  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await expect(adapter.init()).resolves.not.toThrow()
      expect(mockElectronAPI.getDatabasePath).toHaveBeenCalled()
      expect(mockElectronAPI.dbSetPath).toHaveBeenCalledWith('/test/path/database.db', false, false)
    })

    it('should not initialize twice', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await adapter.init()
      await adapter.init()
      expect(mockElectronAPI.getDatabasePath).toHaveBeenCalledTimes(1)
    })

    it('should handle initialization errors', async () => {
      const errorAPI = {
        ...mockElectronAPI,
        getDatabasePath: vi.fn().mockRejectedValue(new Error('Database not found'))
      }
      const adapter = new ElectronIPCAdapter(errorAPI as ElectronAPI)
      await expect(adapter.init()).rejects.toThrow('Failed to initialize database adapter: Database not found')
    })
  })

  describe('connection management', () => {
    it('should acquire a connection', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      expect(connection).toBeDefined()
      expect(connection).toHaveProperty('executeQuery')
      expect(connection).toHaveProperty('streamQuery')
    })

    it('should release connection without error', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      await expect(adapter.releaseConnection(connection)).resolves.not.toThrow()
    })

    it('should destroy adapter', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await adapter.init()

      await expect(adapter.destroy()).resolves.not.toThrow()
    })
  })

  describe('query execution', () => {
    it('should execute SELECT queries', async () => {
      const mockRows = [{ id: 1, name: 'test' }]
      const queryAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue(mockRows)
      }
      const adapter = new ElectronIPCAdapter(queryAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      const result = await connection.executeQuery({
        sql: 'SELECT * FROM test',
        parameters: [],
        query: {} as any, // Mock QueryNode
        queryId: 'test-id'
      })

      expect(queryAPI.dbExecuteQuery).toHaveBeenCalledWith('SELECT * FROM test', [])
      expect(result).toEqual({
        rows: mockRows
      })
    })

    it('should execute INSERT queries and return insertId', async () => {
      const mockResult = { changes: 1, lastID: 123 }
      const queryAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue(mockResult)
      }
      const adapter = new ElectronIPCAdapter(queryAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      const result = await connection.executeQuery({
        sql: 'INSERT INTO test (name) VALUES (?)',
        parameters: ['test'],
        query: {} as any,
        queryId: 'test-id'
      })

      expect(result).toEqual({
        rows: [],
        numAffectedRows: BigInt(1),
        insertId: BigInt(123)
      })
    })

    it('should handle different result formats', async () => {
      const mockResult = { rows: [{ id: 1 }], changes: 1 }
      const queryAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue(mockResult)
      }
      const adapter = new ElectronIPCAdapter(queryAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      const result = await connection.executeQuery({
        sql: 'UPDATE test SET name = ?',
        parameters: ['updated'],
        query: {} as any,
        queryId: 'test-id'
      })

      expect(result).toEqual({
        rows: [{ id: 1 }],
        numAffectedRows: BigInt(1)
      })
    })

    it('should handle query errors', async () => {
      const errorAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockRejectedValue(new Error('SQL syntax error'))
      }
      const adapter = new ElectronIPCAdapter(errorAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      await expect(connection.executeQuery({
        sql: 'INVALID SQL',
        parameters: [],
        query: {} as any,
        queryId: 'test-id'
      })).rejects.toThrow('Failed to execute query: SQL syntax error')
    })
  })

  describe('transactions', () => {
    it('should begin transaction', async () => {
      const transactionAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue({ success: true })
      }
      const adapter = new ElectronIPCAdapter(transactionAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      await expect(adapter.beginTransaction(connection, {} as any)).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('BEGIN TRANSACTION', [])
    })

    it('should commit transaction', async () => {
      const transactionAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue({ success: true })
      }
      const adapter = new ElectronIPCAdapter(transactionAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      await expect(adapter.commitTransaction(connection)).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('COMMIT', [])
    })

    it('should rollback transaction', async () => {
      const transactionAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue({ success: true })
      }
      const adapter = new ElectronIPCAdapter(transactionAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()
      await expect(adapter.rollbackTransaction(connection)).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('ROLLBACK', [])
    })

    it('should handle savepoints', async () => {
      const transactionAPI = {
        ...mockElectronAPI,
        dbExecuteQuery: vi.fn().mockResolvedValue({ success: true })
      }
      const adapter = new ElectronIPCAdapter(transactionAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()

      await expect(adapter.savepoint(connection, 'test_sp')).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('SAVEPOINT test_sp', [])

      await expect(adapter.rollbackToSavepoint(connection, 'test_sp')).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT test_sp', [])

      await expect(adapter.releaseSavepoint(connection, 'test_sp')).resolves.not.toThrow()
      expect(transactionAPI.dbExecuteQuery).toHaveBeenCalledWith('RELEASE SAVEPOINT test_sp', [])
    })
  })

  describe('streaming queries', () => {
    it('should throw error for stream queries', async () => {
      const adapter = new ElectronIPCAdapter(mockElectronAPI as ElectronAPI)
      await adapter.init()

      const connection = await adapter.acquireConnection()

      const streamIterator = connection.streamQuery({
        sql: 'SELECT * FROM test',
        parameters: [],
        query: {} as any,
        queryId: 'test-id'
      })

      await expect(streamIterator.next()).rejects.toThrow('Stream queries are not supported in Electron IPC adapter')
    })
  })
})

describe('DatabaseFactory', () => {
  it('should create Electron database with API', () => {
    const db = DatabaseFactory.createElectronDB(mockElectronAPI as ElectronAPI)
    expect(db).toBeDefined()
  })

  it('should throw error when API is not available', () => {
    // Mock window object without electronAPI
    const originalWindow = global.window
    delete (global as any).window

    expect(() => DatabaseFactory.createElectronDB()).toThrow(
      'ElectronAPI not available. Make sure this code is running in Electron renderer process.'
    )

    // Restore window
    global.window = originalWindow
  })

  it('should create custom database with adapter', () => {
    const mockAdapter = {
      init: vi.fn(),
      acquireConnection: vi.fn(),
      beginTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      releaseConnection: vi.fn(),
      destroy: vi.fn(),
    }

    const db = DatabaseFactory.createCustomDB(mockAdapter)
    expect(db).toBeDefined()
  })
})