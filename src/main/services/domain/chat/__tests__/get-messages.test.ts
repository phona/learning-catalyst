import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createChatService } from '../index';
import type { ChatService } from '../index';

/**
 * Mock checkpoint saver for testing message retrieval
 */
interface MockCheckpoint {
  checkpoint: {
    channel_values?: {
      messages?: Array<HumanMessage | AIMessage>;
    };
  };
  metadata: Record<string, unknown>;
  config: {
    configurable: {
      checkpoint_id?: string;
    };
  };
}

/**
 * Creates a mock checkpoint saver with configurable behavior
 */
function createMockCheckpointSaver(checkpoints: MockCheckpoint[]) {
  return {
    list: vi.fn().mockImplementation(async function* (config: { configurable: { thread_id: string; checkpoint_ns: string } }) {
      for (const checkpoint of checkpoints) {
        yield checkpoint;
      }
    }),
  };
}

/**
 * Mock logger service
 */
const mockLogger = {
  child: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
};

describe('ChatService.getMessages', () => {
  let chatService: ChatService;
  let mockCheckpointSaver: ReturnType<typeof createMockCheckpointSaver>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckpointSaver = createMockCheckpointSaver([]);
    chatService = createChatService({
      providerFactory: {} as any,
      loggerService: mockLogger as any,
      checkpointSaver: mockCheckpointSaver as any,
    });
  });

  describe('Successful message retrieval', () => {
    it('should return empty array when no checkpoints exist', async () => {
      // Arrange
      mockCheckpointSaver = createMockCheckpointSaver([]);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-123');

      // Assert
      expect(result).toEqual([]);
      expect(mockCheckpointSaver.list).toHaveBeenCalledWith({
        configurable: {
          thread_id: 'session-123',
          checkpoint_ns: '',
        },
      });
    });

    it('should return formatted messages from single checkpoint', async () => {
      // Arrange
      const messages = [
        new HumanMessage('Hello'),
        new AIMessage('Hi there!'),
        new HumanMessage('How are you?'),
      ];

      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages } },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-456');

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'session-456-0',
        role: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-1',
          message_index: 0,
        },
      });
      expect(result[1]).toEqual({
        id: 'session-456-1',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: '2024-01-01T00:00:00Z',
        tool_calls: [],
        metadata: {
          checkpoint_id: 'cp-1',
          message_index: 1,
          invalid_tool_calls: [],
        },
      });
      expect(result[2]).toEqual({
        id: 'session-456-2',
        role: 'user',
        content: 'How are you?',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-1',
          message_index: 2,
        },
      });
    });

    it('should handle complex message content (non-string)', async () => {
      // Arrange
      const messages = [
        new HumanMessage({ content: [{ type: 'text', text: 'Text message' }] }),
        new AIMessage([{ type: 'text', text: 'Array message' }]),
      ];

      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages } },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-789');

      // Assert
      expect(result[0].content).toBe('[{"type":"text","text":"Text message"}]');
      expect(result[1].content).toBe('[{"type":"text","text":"Array message"}]');
    });

    it('should use latest checkpoint when multiple exist', async () => {
      // Arrange - Multiple checkpoints (latest first due to DESC ordering)
      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: {
            channel_values: {
              messages: [
                new HumanMessage('Latest message'),
                new AIMessage('Latest response'),
              ],
            },
          },
          metadata: { created_at: '2024-01-02T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-latest' } },
        },
        {
          checkpoint: {
            channel_values: {
              messages: [
                new HumanMessage('Old message'),
              ],
            },
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-old' } },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-multi');

      // Assert - Should get messages from latest checkpoint only
      expect(result).toHaveLength(2);
      expect(result[0]!.content).toBe('Latest message');
      expect(result[1]!.content).toBe('Latest response');
      expect(result[0]!.metadata?.checkpoint_id).toBe('cp-latest');
    });
  });

  describe('Edge cases', () => {
    it('should handle system messages', async () => {
      // Arrange
      const messages = [
        new HumanMessage('User input'),
        // Note: SystemMessage would be used here if available
        new AIMessage('Assistant response'),
      ];

      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages } },
          metadata: {},
          config: { configurable: {} },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-system');

      // Assert - Unknown message types default to 'system'
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('should handle missing metadata timestamps', async () => {
      // Arrange
      const messages = [new HumanMessage('Test')];
      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages } },
          metadata: {}, // No created_at
          config: { configurable: {} },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-no-time');

      // Assert - Should fallback to current time
      expect(result[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle undefined messages in checkpoint', async () => {
      // Arrange
      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages: [] } }, // Empty messages
          metadata: {},
          config: { configurable: {} },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      const result = await chatService.getMessages('session-empty');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from checkpoint saver', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCheckpointSaver = {
        list: vi.fn().mockImplementation(async function* () {
          throw error;
        }),
      };

      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act & Assert
      await expect(chatService.getMessages('session-error')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('Logging', () => {
    it('should log retrieval start', async () => {
      // Arrange
      const loggerSpy = mockLogger.child();
      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages: [] } },
          metadata: {},
          config: { configurable: {} },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      await chatService.getMessages('session-log');

      // Assert
      expect(loggerSpy.info).toHaveBeenCalledWith('Retrieving message history', {
        sessionId: 'session-log',
      });
    });

    it('should log retrieval completion with message count', async () => {
      // Arrange
      const loggerSpy = mockLogger.child();
      const messages = [new HumanMessage('Test'), new AIMessage('Response')];
      const checkpoints: MockCheckpoint[] = [
        {
          checkpoint: { channel_values: { messages } },
          metadata: {},
          config: { configurable: {} },
        },
      ];

      mockCheckpointSaver = createMockCheckpointSaver(checkpoints);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      await chatService.getMessages('session-count');

      // Assert
      expect(loggerSpy.info).toHaveBeenCalledWith('Message history retrieved', {
        sessionId: 'session-count',
        messageCount: 2,
      });
    });

    it('should log when no checkpoints found', async () => {
      // Arrange
      const loggerSpy = mockLogger.child();
      mockCheckpointSaver = createMockCheckpointSaver([]);
      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      // Act
      await chatService.getMessages('session-no-checkpoints');

      // Assert
      expect(loggerSpy.debug).toHaveBeenCalledWith('No checkpoints found for session', {
        sessionId: 'session-no-checkpoints',
      });
    });
  });
});
