/**
 * Session Service New Methods Tests
 *
 * Tests for the new in-memory session functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '@/services/sessionService';
import type { Database } from '@/modules/database/kysely-schema';
import type { MemorySession, ConversationMessage } from '@/types/session';

// Mock database instance
const mockDB = {
  transaction: vi.fn(),
  selectFrom: vi.fn(),
  insertInto: vi.fn(),
  updateTable: vi.fn(),
  deleteFrom: vi.fn(),
} as any;

// Mock transaction executor
const mockTransactionExecutor = {
  execute: vi.fn(),
};

// Mock session data generators
const createMockMemorySession = (overrides = {}): MemorySession => ({
  temporaryId: 'temp_test123456789',
  persistenceState: 'unsaved',
  title: 'Temporary Session',
  created_at: new Date('2024-01-01T10:00:00'),
  updated_at: new Date('2024-01-01T10:30:00'),
  messages: [],
  metadata: {
    title: 'Temporary Session',
    description: 'Temporary Description',
    tags: ['temp'],
    category: 'general',
    difficulty: 'intermediate',
    learning_objectives: [],
    topics_covered: [],
    archived: false,
    pinned: false,
  },
  context: {
    system_prompt: undefined,
    notes: undefined,
    learning_objectives: undefined,
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
  ...overrides,
});

const createMockMessage = (overrides = {}): ConversationMessage => ({
  id: 'msg_test123',
  role: 'user',
  content: 'Hello, this is a test message',
  timestamp: new Date('2024-01-01T10:15:00'),
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  thinking_content: undefined,
  tokens_used: 10,
  ...overrides,
});

describe('SessionService - New Methods', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionService = new SessionService(mockDB);

    // Setup default transaction mock
    mockDB.transaction.mockReturnValue(mockTransactionExecutor);
    mockTransactionExecutor.execute.mockImplementation(async (callback) => {
      // Simulate successful transaction
      return await callback(mockDB);
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveSessionWithMessages', () => {
    it('should save a new session with messages in a transaction', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = [
        createMockMessage({ id: 'msg_1', role: 'user' as const, content: 'Hello' }),
        createMockMessage({ id: 'msg_2', role: 'assistant' as const, content: 'Hi there!' })
      ];

      const expectedSessionId = 'session_new123456';
      vi.spyOn(sessionService, 'generateSessionId').mockReturnValue(expectedSessionId);

      // Mock database operations
      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act
      const result = await sessionService.saveSessionWithMessages(memorySession, messages);

      // Assert
      expect(result).toBe(expectedSessionId);
      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockTransactionExecutor.execute).toHaveBeenCalled();

      // Verify session insertion
      expect(mockDB.insertInto).toHaveBeenCalledWith('learning_sessions');
      expect(mockInsertInto.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expectedSessionId,
          title: memorySession.title,
          total_messages: messages.length,
        })
      );

      // Verify message insertion
      expect(mockDB.insertInto).toHaveBeenCalledWith('messages');
      expect(mockInsertInto.values).toHaveBeenCalledTimes(2); // Once for session, once for messages
    });

    it('should handle empty messages array', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages: any[] = [];

      const expectedSessionId = 'session_empty123';
      vi.spyOn(sessionService, 'generateSessionId').mockReturnValue(expectedSessionId);

      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act
      const result = await sessionService.saveSessionWithMessages(memorySession, messages);

      // Assert
      expect(result).toBe(expectedSessionId);
      expect(mockDB.insertInto).toHaveBeenCalledWith('learning_sessions');
      // Should not call messages insert for empty array
      expect(mockInsertInto.values).toHaveBeenCalledTimes(1);
    });

    it('should handle transaction rollback on error', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = [createMockMessage()];

      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act & Assert
      await expect(sessionService.saveSessionWithMessages(memorySession, messages))
        .rejects.toThrow('Failed to save session with messages');

      expect(mockDB.transaction).toHaveBeenCalled();
      expect(mockTransactionExecutor.execute).toHaveBeenCalled();
    });

    it('should preserve session metadata and context correctly', async () => {
      // Arrange
      const memorySession = createMockMemorySession({
        metadata: {
          title: 'Custom Title',
          description: 'Custom Description',
          tags: ['custom', 'test'],
          category: 'custom',
          difficulty: 'advanced',
          learning_objectives: ['learn testing'],
          topics_covered: ['testing'],
          archived: false,
          pinned: true,
        },
        context: {
          system_prompt: 'You are a helpful assistant',
          notes: 'Custom notes',
          learning_objectives: ['learn testing'],
        }
      });

      const messages = [createMockMessage()];
      const expectedSessionId = 'session_metadata123';
      vi.spyOn(sessionService, 'generateSessionId').mockReturnValue(expectedSessionId);

      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act
      await sessionService.saveSessionWithMessages(memorySession, messages);

      // Assert
      expect(mockInsertInto.values).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining('"title":"Custom Title"'),
        })
      );
    });

    it('should format message data correctly for database insertion', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = [
        createMockMessage({
          id: 'msg_user_1',
          role: 'user' as const,
          content: 'Test user message',
          timestamp: new Date('2024-01-01T10:00:00'),
          provider: 'openai',
          thinking_content: undefined,
          tokens_used: 15,
        }),
        createMockMessage({
          id: 'msg_assistant_1',
          role: 'assistant' as const,
          content: 'Test assistant response',
          timestamp: new Date('2024-01-01T10:01:00'),
          provider: 'openai',
          thinking_content: 'Some thinking content',
          tokens_used: 25,
        })
      ];

      const expectedSessionId = 'session_messages123';
      vi.spyOn(sessionService, 'generateSessionId').mockReturnValue(expectedSessionId);

      let capturedMessageValues: any[] = [];
      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insertInto = vi.fn().mockImplementation((table) => {
        if (table === 'messages') {
          return {
            values: vi.fn().mockImplementation((values) => {
              capturedMessageValues = values;
              return { execute: vi.fn().mockResolvedValue(undefined) };
            }),
          };
        }
        return mockInsertInto;
      });

      // Act
      await sessionService.saveSessionWithMessages(memorySession, messages);

      // Assert
      expect(capturedMessageValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'msg_user_1',
            role: 'user',
            content: 'Test user message',
            timestamp: '2024-01-01T10:00:00.000Z',
            provider: 'openai',
            thinking_content: undefined,
            tokens_used: expect.stringContaining('"total_tokens":15'),
            message_order: 1,
          }),
          expect.objectContaining({
            id: 'msg_assistant_1',
            role: 'assistant',
            content: 'Test assistant response',
            timestamp: '2024-01-01T10:01:00.000Z',
            provider: 'openai',
            thinking_content: 'Some thinking content',
            tokens_used: expect.stringContaining('"total_tokens":25'),
            message_order: 2,
          }),
        ])
      );
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      // Act
      const id1 = sessionService.generateSessionId();
      const id2 = sessionService.generateSessionId();

      // Assert
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in ID', () => {
      // Arrange
      const beforeTime = Date.now();

      // Act
      const sessionId = sessionService.generateSessionId();
      const afterTime = Date.now();

      // Assert
      const timestamp = parseInt(sessionId.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should generate valid random suffix', () => {
      // Act
      const sessionId = sessionService.generateSessionId();

      // Assert
      const parts = sessionId.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('session');
      expect(parts[1]).toMatch(/^\d+$/);
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle memory session validation errors', async () => {
      // Arrange
      const invalidSession = { ...createMockMemorySession(), title: undefined } as any; // Invalid session
      const messages = [createMockMessage()];

      // Act & Assert
      await expect(sessionService.saveSessionWithMessages(invalidSession, messages))
        .rejects.toThrow('Failed to save session with messages');
    });

    it('should handle database connection failures', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = [createMockMessage()];

      // Mock database failure
      mockDB.transaction.mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error('Connection lost')),
      });

      // Act & Assert
      await expect(sessionService.saveSessionWithMessages(memorySession, messages))
        .rejects.toThrow('Failed to save session with messages');
    });

    it('should handle constraint violations gracefully', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = [createMockMessage()];

      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed')),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act & Assert
      await expect(sessionService.saveSessionWithMessages(memorySession, messages))
        .rejects.toThrow('Failed to save session with messages');
    });
  });

  describe('Performance', () => {
    it('should handle large number of messages efficiently', async () => {
      // Arrange
      const memorySession = createMockMemorySession();
      const messages = Array.from({ length: 100 }, (_, i) =>
        createMockMessage({
          id: `msg_${i}`,
          content: `Message ${i}`,
          role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        })
      );

      const expectedSessionId = 'session_large123';
      vi.spyOn(sessionService, 'generateSessionId').mockReturnValue(expectedSessionId);

      const mockInsertInto = {
        values: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insertInto = vi.fn().mockReturnValue(mockInsertInto);

      // Act
      const startTime = Date.now();
      const result = await sessionService.saveSessionWithMessages(memorySession, messages);
      const endTime = Date.now();

      // Assert
      expect(result).toBe(expectedSessionId);
      expect(mockDB.insertInto).toHaveBeenCalledWith('messages');
      expect(mockInsertInto.values).toHaveBeenCalledWith(messages);

      // Performance assertion (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second max
    });
  });
});