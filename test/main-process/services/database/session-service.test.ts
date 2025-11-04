/**
 * Session Service Tests
 *
 * Comprehensive test suite for SessionService with TDD approach.
 * Tests all CRUD operations, transaction support, error handling,
 * and performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionService } from '../../../src/services/sessionService'
import { DatabaseMocks } from '../../../test/utils/mocks/mock-database'
import type { Database } from '../../../src/modules/database/kysely-schema'
import type { SessionSearchQuery, Session, ConversationMessage, MemorySession } from '../../../src/types/session'

describe('SessionService', () => {
  let sessionService: SessionService
  let mockDb: any
  let mockAgentManager: any

  beforeEach(() => {
    // Reset all mocks
    DatabaseMocks.Database._resetMocks()
    DatabaseMocks.KyselyDatabase._clearMocks()

    // Create mock instances
    mockDb = DatabaseMocks.KyselyDatabase
    mockAgentManager = {
      generateSessionTitle: vi.fn()
    }

    // Create service instance
    sessionService = new SessionService(mockDb, mockAgentManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Initialization', () => {
    it('should initialize with database instance', () => {
      expect(sessionService).toBeInstanceOf(SessionService)
    })

    it('should work without agent manager (optional dependency)', () => {
      const serviceWithoutAgent = new SessionService(mockDb)
      expect(serviceWithoutAgent).toBeInstanceOf(SessionService)
    })
  })

  describe('Session Search Operations', () => {
    it('should search sessions with basic query', async () => {
      // Arrange
      const searchQuery: SessionSearchQuery = {
        query: 'test',
        limit: 10,
        offset: 0
      }

      // Mock database responses
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: vi.fn().mockResolvedValue([
                        {
                          id: 'session1',
                          title: 'Test Session',
                          description: 'A test session',
                          metadata: JSON.stringify({ tags: ['test'] }),
                          created_at: '2025-01-01T00:00:00Z',
                          updated_at: '2025-01-01T01:00:00Z',
                          total_messages: 5
                        }
                      ])
                    })
                  })
                })
              })
            })
          })
        })
      })

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{ total: 1 }])
        })
      })

      // Act
      const result = await sessionService.searchSessions(searchQuery)

      // Assert
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].title).toBe('Test Session')
      expect(result.total).toBe(1)
      expect(result.has_more).toBe(false)
    })

    it('should handle search with date range filtering', async () => {
      // Arrange
      const searchQuery: SessionSearchQuery = {
        date_range: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31')
        },
        limit: 20
      }

      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  groupBy: vi.fn().mockReturnValue({
                    execute: mockExecute
                  })
                })
              })
            })
          })
        })
      })

      // Act
      await sessionService.searchSessions(searchQuery)

      // Assert
      expect(mockDb.selectFrom).toHaveBeenCalledWith('learning_sessions')
      expect(mockExecute).toHaveBeenCalled()
    })

    it('should handle empty search results', async () => {
      // Arrange
      const searchQuery: SessionSearchQuery = {
        limit: 10
      }

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: vi.fn().mockResolvedValue([])
                    })
                  })
                })
              })
            })
          })
        })
      })

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{ total: 0 }])
        })
      })

      // Act
      const result = await sessionService.searchSessions(searchQuery)

      // Assert
      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.has_more).toBe(false)
    })

    it('should handle search errors gracefully', async () => {
      // Arrange
      const searchQuery: SessionSearchQuery = { limit: 10 }
      const errorMessage = 'Database connection failed'

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: vi.fn().mockRejectedValue(new Error(errorMessage))
                    })
                  })
                })
              })
            })
          })
        })
      })

      // Act & Assert
      await expect(sessionService.searchSessions(searchQuery)).rejects.toThrow(`Failed to search sessions: ${errorMessage}`)
    })
  })

  describe('Recent Sessions Operations', () => {
    it('should get recent sessions with default limit', async () => {
      // Arrange
      const mockSessions = [
        {
          id: 'session1',
          title: 'Recent Session 1',
          metadata: JSON.stringify({ tags: ['recent'] }),
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          total_messages: 3
        }
      ]

      const mockMessages = [
        {
          id: 'msg1',
          session_id: 'session1',
          role: 'user',
          content: 'Hello',
          timestamp: '2025-01-01T00:30:00Z',
          message_order: 1
        }
      ]

      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'learning_sessions') {
          return {
            selectAll: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  execute: vi.fn().mockResolvedValue(mockSessions)
                })
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            selectAll: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  execute: vi.fn().mockResolvedValue(mockMessages)
                })
              })
            })
          }
        }
        return mockDb
      })

      // Act
      const result = await sessionService.getRecentSessions()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('session1')
      expect(result[0].title).toBe('Recent Session 1')
      expect(result[0].messages).toHaveLength(1)
    })

    it('should get recent sessions with custom limit', async () => {
      // Arrange
      const limit = 5
      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              execute: mockExecute
            })
          })
        })
      })

      // Act
      await sessionService.getRecentSessions(limit)

      // Assert
      expect(mockExecute).toHaveBeenCalled()
    })

    it('should handle empty recent sessions', async () => {
      // Arrange
      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'learning_sessions') {
          return {
            selectAll: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  execute: vi.fn().mockResolvedValue([])
                })
              })
            })
          }
        }
        return mockDb
      })

      // Act
      const result = await sessionService.getRecentSessions()

      // Assert
      expect(result).toHaveLength(0)
    })
  })

  describe('Session by ID Operations', () => {
    it('should get session by ID with messages', async () => {
      // Arrange
      const sessionId = 'session1'
      const mockSession = {
        id: sessionId,
        title: 'Test Session',
        metadata: JSON.stringify({ category: 'test' }),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
        total_messages: 2
      }

      const mockMessages = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: '2025-01-01T00:30:00Z',
          message_order: 1
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2025-01-01T00:31:00Z',
          message_order: 2
        }
      ]

      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'learning_sessions') {
          return {
            selectAll: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                executeTakeFirst: vi.fn().mockResolvedValue(mockSession)
              })
            })
          }
        }
        if (table === 'messages') {
          return {
            selectAll: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  execute: vi.fn().mockResolvedValue(mockMessages)
                })
              })
            })
          }
        }
        return mockDb
      })

      // Act
      const result = await sessionService.getSessionById(sessionId)

      // Assert
      expect(result).not.toBeNull()
      expect(result!.id).toBe(sessionId)
      expect(result!.title).toBe('Test Session')
      expect(result!.messages).toHaveLength(2)
      expect(result!.messages[0].role).toBe('user')
      expect(result!.messages[1].role).toBe('assistant')
    })

    it('should return null for non-existent session', async () => {
      // Arrange
      const sessionId = 'nonexistent'
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(null)
          })
        })
      })

      // Act
      const result = await sessionService.getSessionById(sessionId)

      // Assert
      expect(result).toBeNull()
    })

    it('should handle session by ID errors', async () => {
      // Arrange
      const sessionId = 'session1'
      const errorMessage = 'Database error'

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockRejectedValue(new Error(errorMessage))
          })
        })
      })

      // Act & Assert
      await expect(sessionService.getSessionById(sessionId)).rejects.toThrow(`Failed to get session: ${errorMessage}`)
    })
  })

  describe('Session Update Operations', () => {
    it('should update session title successfully', async () => {
      // Arrange
      const sessionId = 'session1'
      const newTitle = 'Updated Session Title'
      const currentSession = {
        metadata: JSON.stringify({ category: 'test' })
      }

      const mockUpdateExecute = vi.fn().mockResolvedValue({ numUpdatedRows: 1 })

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(currentSession)
          })
        })
      })

      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: mockUpdateExecute
          })
        })
      })

      // Act
      await sessionService.updateSessionTitle(sessionId, newTitle)

      // Assert
      expect(mockUpdateExecute).toHaveBeenCalled()
    })

    it('should handle updating non-existent session', async () => {
      // Arrange
      const sessionId = 'nonexistent'
      const newTitle = 'New Title'

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(null)
          })
        })
      })

      // Act & Assert
      await expect(sessionService.updateSessionTitle(sessionId, newTitle)).rejects.toThrow('Session nonexistent not found')
    })
  })

  describe('Session Creation Operations', () => {
    it('should create new session successfully', async () => {
      // Arrange
      const sessionData = {
        title: 'New Session',
        metadata: {
          description: 'A new test session',
          tags: ['new'],
          category: 'test'
        },
        context: {
          system_prompt: 'You are a helpful assistant',
          learning_objectives: ['Learn testing']
        },
        checkpoints: [],
        statistics: {
          total_messages: 0,
          session_duration: 0
        }
      }

      const mockExecute = vi.fn().mockResolvedValue({ insertId: 123 })
      mockDb.insertInto.mockReturnValue({
        values: vi.fn().mockReturnValue({
          execute: mockExecute
        })
      })

      // Act
      const sessionId = await sessionService.createSession(sessionData)

      // Assert
      expect(sessionId).toBeDefined()
      expect(typeof sessionId).toBe('string')
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(mockExecute).toHaveBeenCalled()
    })

    it('should handle session creation errors', async () => {
      // Arrange
      const sessionData = {
        title: 'Error Session',
        metadata: {},
        context: {},
        checkpoints: [],
        statistics: { total_messages: 0, session_duration: 0 }
      }

      const errorMessage = 'Database constraint violation'
      mockDb.insertInto.mockReturnValue({
        values: vi.fn().mockReturnValue({
          execute: vi.fn().mockRejectedValue(new Error(errorMessage))
        })
      })

      // Act & Assert
      await expect(sessionService.createSession(sessionData)).rejects.toThrow(`Failed to create session: ${errorMessage}`)
    })
  })

  describe('Message Operations', () => {
    it('should save message to existing session', async () => {
      // Arrange
      const sessionId = 'session1'
      const message: ConversationMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date(),
        tokens_used: 10
      }

      // Mock session exists
      mockDb.selectFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue({ id: sessionId })
          })
        })
      })

      // Mock last message order
      mockDb.selectFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                executeTakeFirst: vi.fn().mockResolvedValue({ message_order: 0 })
              })
            })
          })
        })
      })

      // Mock message insert
      const mockInsertExecute = vi.fn().mockResolvedValue({ insertId: 1 })
      mockDb.insertInto.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          execute: mockInsertExecute
        })
      })

      // Mock session update
      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
          })
        })
      })

      // Act
      await sessionService.saveMessage(sessionId, message)

      // Assert
      expect(mockInsertExecute).toHaveBeenCalled()
    })

    it('should create session if it does not exist when saving message', async () => {
      // Arrange
      const sessionId = 'newsession'
      const message: ConversationMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Start new session',
        timestamp: new Date()
      }

      // Mock session does not exist
      mockDb.selectFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(null)
          })
        })
      })

      // Mock session creation (in createSessionFromMessage)
      mockDb.insertInto.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ insertId: 1 })
        })
      })

      // Mock message order and insert
      mockDb.selectFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                executeTakeFirst: vi.fn().mockResolvedValue(null)
              })
            })
          })
        })
      })

      mockDb.insertInto.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ insertId: 2 })
        })
      })

      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
          })
        })
      })

      // Act
      await sessionService.saveMessage(sessionId, message)

      // Assert
      expect(mockDb.insertInto).toHaveBeenCalledTimes(2) // Once for session, once for message
    })

    it('should save multiple messages in batch', async () => {
      // Arrange
      const sessionId = 'session1'
      const messages: ConversationMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date()
        }
      ]

      // Mock message order
      mockDb.selectFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                executeTakeFirst: vi.fn().mockResolvedValue({ message_order: 0 })
              })
            })
          })
        })
      })

      // Mock batch insert
      const mockBatchExecute = vi.fn().mockResolvedValue({ insertId: 1 })
      mockDb.insertInto.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          execute: mockBatchExecute
        })
      })

      // Mock session update
      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
          })
        })
      })

      // Act
      await sessionService.saveMessages(sessionId, messages)

      // Assert
      expect(mockBatchExecute).toHaveBeenCalled()
    })

    it('should handle empty messages array', async () => {
      // Arrange
      const sessionId = 'session1'
      const messages: ConversationMessage[] = []

      // Act
      await sessionService.saveMessages(sessionId, messages)

      // Assert
      // Should not attempt database operations for empty array
      expect(mockDb.insertInto).not.toHaveBeenCalled()
    })

    it('should update existing message', async () => {
      // Arrange
      const sessionId = 'session1'
      const messageId = 'msg1'
      const updates = {
        content: 'Updated content'
      }

      mockDb.updateTable.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
          })
        })
      })

      // Act
      await sessionService.updateMessage(sessionId, messageId, updates)

      // Assert
      expect(mockDb.updateTable).toHaveBeenCalledWith('messages')
    })
  })

  describe('Session Deletion Operations', () => {
    it('should delete session and messages successfully', async () => {
      // Arrange
      const sessionId = 'session1'

      const mockDeleteExecute = vi.fn().mockResolvedValue({ numDeletedRows: 1 })
      mockDb.deleteFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockDeleteExecute
        })
      })

      // Act
      const result = await sessionService.deleteSession(sessionId)

      // Assert
      expect(result).toBe(true)
      expect(mockDb.deleteFrom).toHaveBeenCalledTimes(2) // Messages first, then session
    })

    it('should handle deletion errors', async () => {
      // Arrange
      const sessionId = 'session1'
      const errorMessage = 'Foreign key constraint failed'

      mockDb.deleteFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockRejectedValue(new Error(errorMessage))
        })
      })

      // Act & Assert
      await expect(sessionService.deleteSession(sessionId)).rejects.toThrow(`Failed to delete session: ${errorMessage}`)
    })
  })

  describe('Transaction Operations', () => {
    it('should save session with messages in transaction', async () => {
      // Arrange
      const memorySession: MemorySession = {
        id: 'session1',
        title: 'Transaction Session',
        metadata: { category: 'test' },
        context: { system_prompt: 'Test prompt' },
        checkpoints: []
      }

      const messages: ConversationMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ]

      // Mock transaction
      const mockTx = {
        selectFrom: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(null) // Session doesn't exist
            })
          })
        }),
        insertInto: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ insertId: 1 })
          })
        }),
        deleteFrom: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numDeletedRows: 0 })
          })
        }),
        updateTable: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
            })
          })
        })
      }

      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation(async (fn) => {
          return await fn(mockTx)
        })
      })

      // Act
      const result = await sessionService.saveSessionWithMessages(memorySession, messages)

      // Assert
      expect(result).toBe('session1')
      expect(mockDb.transaction).toHaveBeenCalled()
    })

    it('should handle update existing session in transaction', async () => {
      // Arrange
      const memorySession: MemorySession = {
        id: 'session1',
        title: 'Updated Session',
        metadata: { category: 'test' },
        context: {},
        checkpoints: []
      }

      const messages: ConversationMessage[] = []

      // Mock transaction for existing session
      const mockTx = {
        selectFrom: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue({ id: 'session1' }) // Session exists
            })
          })
        }),
        updateTable: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 })
            })
          })
        }),
        deleteFrom: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ numDeletedRows: 2 })
          })
        }),
        insertInto: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue({ insertId: 1 })
          })
        })
      }

      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation(async (fn) => {
          return await fn(mockTx)
        })
      })

      // Act
      const result = await sessionService.saveSessionWithMessages(memorySession, messages)

      // Assert
      expect(result).toBe('session1')
      expect(mockTx.updateTable).toHaveBeenCalledWith('learning_sessions')
    })

    it('should handle transaction rollback on error', async () => {
      // Arrange
      const memorySession: MemorySession = {
        id: 'session1',
        title: 'Error Session',
        metadata: {},
        context: {},
        checkpoints: []
      }

      const messages: ConversationMessage[] = []

      const errorMessage = 'Transaction failed'
      mockDb.transaction.mockReturnValue({
        execute: vi.fn().mockImplementation(async (fn) => {
          throw new Error(errorMessage)
        })
      })

      // Act & Assert
      await expect(sessionService.saveSessionWithMessages(memorySession, messages)).rejects.toThrow(`Failed to save session with messages: ${errorMessage}`)
    })
  })

  describe('AI Title Generation', () => {
    it('should generate AI title using agent manager', async () => {
      // Arrange
      const userMessage = 'I want to learn about React hooks'
      const expectedTitle = 'Learning React Hooks'

      mockAgentManager.generateSessionTitle.mockResolvedValue(expectedTitle)

      // Act
      const result = await sessionService.generateAITitle(userMessage)

      // Assert
      expect(result).toBe(expectedTitle)
      expect(mockAgentManager.generateSessionTitle).toHaveBeenCalledWith(userMessage)
    })

    it('should fallback to simple title when agent manager unavailable', async () => {
      // Arrange
      const serviceWithoutAgent = new SessionService(mockDb)
      const userMessage = 'What is TypeScript and why should I use it?'

      // Act
      const result = await serviceWithoutAgent.generateAITitle(userMessage)

      // Assert
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThanOrEqual(33) // 30 chars + '...'
    })

    it('should fallback to simple title on agent manager error', async () => {
      // Arrange
      const userMessage = 'Explain machine learning'
      const errorMessage = 'AI service unavailable'

      mockAgentManager.generateSessionTitle.mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await sessionService.generateAITitle(userMessage)

      // Assert
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^(Explain|machine)$/) // Should contain meaningful words
    })

    it('should generate simple title from short message', async () => {
      // Arrange
      const serviceWithoutAgent = new SessionService(mockDb)
      const userMessage = 'Hi'

      // Act
      const result = await serviceWithoutAgent.generateAITitle(userMessage)

      // Assert
      expect(result).toBe('Untitled Session')
    })
  })

  describe('Global Statistics Operations', () => {
    it('should get global message count', async () => {
      // Arrange
      const expectedCount = 150
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue({ total_messages: expectedCount })
        })
      })

      // Act
      const result = await sessionService.getGlobalMessageCount()

      // Assert
      expect(result).toBe(expectedCount)
    })

    it('should get comprehensive global statistics', async () => {
      // Arrange
      const mockMessageStats = {
        total_messages: 200,
        total_user_messages: 100,
        total_assistant_messages: 100,
        total_tokens: 15000
      }

      const mockSessionStats = {
        total_sessions: 50,
        avg_messages_per_session: 4
      }

      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(mockMessageStats)
            })
          }
        }
        if (table === 'learning_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue(mockSessionStats)
            })
          }
        }
        return mockDb
      })

      // Act
      const result = await sessionService.getGlobalStatistics()

      // Assert
      expect(result.totalMessages).toBe(200)
      expect(result.totalSessions).toBe(50)
      expect(result.totalUserMessages).toBe(100)
      expect(result.totalAssistantMessages).toBe(100)
      expect(result.averageMessagesPerSession).toBe(4)
      expect(result.totalTokensUsed).toBe(15000)
    })

    it('should handle zero statistics', async () => {
      // Arrange
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(null)
        })
      })

      // Act
      const result = await sessionService.getGlobalStatistics()

      // Assert
      expect(result.totalMessages).toBe(0)
      expect(result.totalSessions).toBe(0)
      expect(result.totalUserMessages).toBe(0)
      expect(result.totalAssistantMessages).toBe(0)
      expect(result.averageMessagesPerSession).toBe(0)
      expect(result.totalTokensUsed).toBe(0)
    })

    it('should handle statistics errors', async () => {
      // Arrange
      const errorMessage = 'Statistics query failed'
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockRejectedValue(new Error(errorMessage))
        })
      })

      // Act & Assert
      await expect(sessionService.getGlobalStatistics()).rejects.toThrow(`Failed to get global statistics: ${errorMessage}`)
    })
  })

  describe('Session ID Generation', () => {
    it('should generate unique session IDs', async () => {
      // Act
      const id1 = sessionService.generateSessionId()
      const id2 = sessionService.generateSessionId()

      // Assert
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should generate valid session ID format', async () => {
      // Act
      const sessionId = sessionService.generateSessionId()

      // Assert
      expect(sessionId).toMatch(/^session_\d{13,}_[a-z0-9]{9}$/)
      expect(sessionId.length).toBeGreaterThan(20) // timestamp + underscore + random part
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed metadata gracefully', async () => {
      // Arrange
      const sessionId = 'session1'
      const sessionWithBadMetadata = {
        id: sessionId,
        title: 'Bad Metadata Session',
        metadata: 'invalid json string',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
        total_messages: 1
      }

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(sessionWithBadMetadata)
          })
        })
      })

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue([])
            })
          })
        })
      })

      // Act
      const result = await sessionService.getSessionById(sessionId)

      // Assert
      expect(result).not.toBeNull()
      expect(result!.id).toBe(sessionId)
      expect(result!.metadata).toBeDefined() // Should have default metadata
    })

    it('should handle database connection issues', async () => {
      // Arrange
      DatabaseMocks.Database._simulateConnectionFailure()
      const searchQuery: SessionSearchQuery = { limit: 10 }

      // Act & Assert
      await expect(sessionService.searchSessions(searchQuery)).rejects.toThrow()
    })

    it('should restore database connection', async () => {
      // Arrange
      DatabaseMocks.Database._simulateConnectionFailure()
      DatabaseMocks.Database._restoreConnection()

      const mockExecute = vi.fn().mockResolvedValue([])
      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: mockExecute
                    })
                  })
                })
              })
            })
          })
        })
      })

      // Act
      const result = await sessionService.searchSessions({ limit: 10 })

      // Assert
      expect(result.sessions).toBeDefined()
    })
  })

  describe('Performance Requirements', () => {
    it('should complete search operations within performance threshold', async () => {
      // Arrange
      const searchQuery: SessionSearchQuery = { limit: 50 }
      const performanceThreshold = 100 // ms

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: vi.fn().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 20)) // Simulate DB delay
                        return []
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
            return [{ total: 0 }]
          })
        })
      })

      // Act
      const startTime = performance.now()
      await sessionService.searchSessions(searchQuery)
      const duration = performance.now() - startTime

      // Assert
      expect(duration).toBeLessThan(performanceThreshold)
    })

    it('should handle large result sets efficiently', async () => {
      // Arrange
      const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
        id: `session${i}`,
        title: `Session ${i}`,
        metadata: JSON.stringify({ index: i }),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T01:00:00Z',
        total_messages: 10
      }))

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockReturnValue({
                    groupBy: vi.fn().mockReturnValue({
                      execute: vi.fn().mockImplementation(async () => {
                        await new Promise(resolve => setTimeout(resolve, 5))
                        return largeResultSet
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })

      mockDb.selectFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([{ total: 100 }])
        })
      })

      // Act
      const startTime = performance.now()
      const result = await sessionService.searchSessions({ limit: 100 })
      const duration = performance.now() - startTime

      // Assert
      expect(result.sessions).toHaveLength(100)
      expect(duration).toBeLessThan(200) // Should handle large sets quickly
    })
  })
})