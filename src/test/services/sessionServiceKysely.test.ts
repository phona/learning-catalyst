/**
 * Tests for Session Service
 *
 * This test suite validates that the SessionService
 * provides proper functionality with dependency injection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import SessionService from '../../services/sessionService'
import type { Database } from '../../modules/database/kysely-schema'
import { SessionSearchQuery } from '../../types/session'
import { Kysely } from 'kysely'

// Mock Kysely instance for testing
const createMockKysely = (shouldFail = false) => {
  const mockData: Record<string, any[]> = {}

  return {
    selectFrom: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error('Mock database error')
      }
      return mockData.sessions || []
    }),
    executeTakeFirst: vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error('Mock database error')
      }
      return (mockData.session || [])[0]
    }),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    fn: {
      count: vi.fn().mockReturnThis()
    },
    setMockData: (key: string, data: any[]) => {
      mockData[key] = data
    }
  } as any
}

describe('SessionService', () => {
  let sessionService: SessionService
  let mockDB: any

  beforeEach(() => {
    // Create mock Kysely instance
    mockDB = createMockKysely()

    // Create service with injected dependencies
    sessionService = new SessionService(mockDB)
  })

  describe('searchSessions', () => {
    it('should search sessions with basic query', async () => {
      // Mock database responses
      const mockSessions = [
        {
          id: 'session_1',
          title: 'Test Session',
          description: 'Test Description',
          start_time: '2024-01-01T00:00:00Z',
          end_time: '2024-01-01T01:00:00Z',
          duration_seconds: 3600,
          total_messages: 10,
          concepts_studied: 5,
          difficulty_level: 1,
          session_type: 'general',
          metadata: '{"tags":["test"],"provider":"openai","archived":false}',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
          message_count: 10
        }
      ]

      mockDB.setMockData('sessions', mockSessions)
      mockDB.setMockData('count', [{ total: 1 }])

      const query: SessionSearchQuery = {
        query: 'test',
        limit: 10,
        offset: 0
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].title).toBe('Test Session')
      expect(result.total).toBe(1)
      expect(result.has_more).toBe(false)
    })

    it('should search sessions with tags filter', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        tags: ['javascript', 'typescript'],
        limit: 10
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should search sessions with provider filter', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        providers: ['openai', 'anthropic'],
        limit: 10
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should search sessions with date range filter', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        limit: 10
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should search sessions with archived filter', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        archived: true,
        limit: 10
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should handle pagination correctly', async () => {
      const mockSessions = [
        { id: 'session_1', title: 'Session 1', metadata: '{}', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T01:00:00Z', message_count: 5 },
        { id: 'session_2', title: 'Session 2', metadata: '{}', created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T01:00:00Z', message_count: 3 },
      ]

      mockDB.setMockData('sessions', mockSessions)
      mockDB.setMockData('count', [{ total: 5 }]) // Total 5 sessions, but only 2 returned due to pagination

      const query: SessionSearchQuery = {
        limit: 2,
        offset: 1
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.has_more).toBe(true) // 1 + 2 < 5, so there are more
    })

    it('should handle empty results correctly', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        query: 'nonexistent',
        limit: 10
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.has_more).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      const failingService = new SessionService(createMockKysely(true))

      const query: SessionSearchQuery = {
        query: 'test',
        limit: 10
      }

      await expect(failingService.searchSessions(query)).rejects.toThrow('Failed to search sessions')
    })

    it('should handle complex queries with multiple filters', async () => {
      mockDB.setMockData('sessions', [])
      mockDB.setMockData('count', [{ total: 0 }])

      const query: SessionSearchQuery = {
        query: 'learning',
        tags: ['javascript', 'react'],
        providers: ['openai'],
        models: ['gpt-4'],
        categories: ['programming'],
        archived: false,
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        limit: 20,
        offset: 0
      }

      const result = await sessionService.searchSessions(query)

      expect(result.sessions).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getSessionById', () => {
    it('should retrieve session with messages', async () => {
      const mockSession = {
        id: 'session_1',
        title: 'Test Session',
        description: 'Test Description',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-01T01:00:00Z',
        duration_seconds: 3600,
        total_messages: 2,
        concepts_studied: 5,
        difficulty_level: 1,
        session_type: 'general',
        metadata: '{"tags":["test"],"provider":"openai"}',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      }

      const mockMessages = [
        {
          id: 'msg_1',
          session_id: 'session_1',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:05:00Z',
          message_order: 1,
          created_at: '2024-01-01T00:05:00Z',
          tokens_used: '{"total":10}',
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        },
        {
          id: 'msg_2',
          session_id: 'session_1',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:05:05Z',
          message_order: 2,
          created_at: '2024-01-01T00:05:05Z',
          tokens_used: '{"total":15}',
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        }
      ]

      mockDB.setMockData('session', [mockSession])
      mockDB.setMockData('messages', mockMessages)

      const result = await sessionService.getSessionById('session_1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('session_1')
      expect(result?.title).toBe('Test Session')
      expect(result?.messages).toHaveLength(2)
      expect(result?.messages[0].role).toBe('user')
      expect(result?.messages[1].role).toBe('assistant')
    })

    it('should return null for non-existent session', async () => {
      mockDB.setMockData('session', [])

      const result = await sessionService.getSessionById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createSession', () => {
    it('should create a new session', async () => {
      const sessionData = {
        title: 'New Session',
        metadata: {
          title: 'New Session',
          description: 'Test session',
          tags: ['test'],
          category: 'general',
          difficulty: 'intermediate' as const,
          learning_objectives: [],
          topics_covered: [],
          user_id: 'user_1',
          archived: false,
          pinned: false,
        },
        context: {
          current_provider: 'openai',
          current_model: 'gpt-3.5-turbo',
          system_prompt: 'You are a helpful assistant',
          temperature: 0.7,
          max_tokens: 4096,
          enable_thinking: true,
          conversation_style: 'educational' as const,
          language: 'en',
          user_preferences: {
            learning_style: 'reading' as const,
            detail_level: 'detailed' as const,
            example_preference: 'all' as const,
            response_length: 'medium' as const,
            technical_level: 'intermediate' as const,
          },
        },
        checkpoints: [],
        statistics: {
          total_messages: 0,
          user_messages: 0,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      }

      const sessionId = await sessionService.createSession(sessionData)

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
    })
  })

  describe('deleteSession', () => {
    it('should delete a session and its messages', async () => {
      const result = await sessionService.deleteSession('session_1')

      expect(result).toBe(true)
    })
  })
})