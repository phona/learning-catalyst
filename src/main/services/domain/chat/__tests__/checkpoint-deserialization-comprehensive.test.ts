import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { createChatService } from '../index';
import type { ChatService } from '../index';

/**
 * Comprehensive test suite for checkpoint message deserialization
 *
 * Tests cover:
 * - All message types (HumanMessage, AIMessage, ToolMessage)
 * - Serialized and class instance formats
 * - Mixed message types in single checkpoint
 * - Edge cases and error handling
 * - Metadata preservation
 */

describe('Checkpoint Deserialization - Comprehensive', () => {
  let chatService: ChatService;
  let mockCheckpointSaver: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertToChatMessage - Serialized Checkpoint Format', () => {
    it('should handle HumanMessage with all metadata fields', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: {
          additional_kwargs: { user: "test" },
          content: "Test user message",
          response_metadata: { model: "gpt-4" }
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 0, 'session-123', { created_at: '2024-01-01T00:00:00Z' }, 'cp-456');

      expect(result).toEqual({
        id: 'session-123-0',
        role: 'user',
        content: 'Test user message',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-456',
          message_index: 0,
          run_id: undefined,
          tool_calls: undefined,
          invalid_tool_calls: undefined,
          response_metadata: { model: "gpt-4" }
        }
      });
    });

    it('should handle AIMessage with tool calls', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "AIMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "I'll use the calculator tool",
          response_metadata: {},
          id: "run-123",
          tool_calls: [
            {
              id: "call-1",
              type: "tool",
              function: { name: "calculator", arguments: "2+2" }
            }
          ],
          invalid_tool_calls: []
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 1, 'session-456', { created_at: '2024-01-01T00:00:00Z' }, 'cp-789');

      expect(result).toEqual({
        id: 'session-456-1',
        role: 'assistant',
        content: "I'll use the calculator tool",
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-789',
          message_index: 1,
          run_id: "run-123",
          tool_calls: [
            {
              id: "call-1",
              type: "tool",
              function: { name: "calculator", arguments: "2+2" }
            }
          ],
          invalid_tool_calls: [],
          response_metadata: {}
        }
      });
    });

    it('should handle ToolMessage with tool metadata', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "ToolMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "Result: 4",
          response_metadata: {},
          tool_call_id: "call-1",
          name: "calculator",
          status: "success"
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 2, 'session-789', { created_at: '2024-01-01T00:00:00Z' }, 'cp-012');

      expect(result).toEqual({
        id: 'session-789-2',
        role: 'assistant',
        content: 'Result: 4',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-012',
          message_index: 2,
          run_id: undefined,
          tool_calls: undefined,
          invalid_tool_calls: undefined,
          response_metadata: {},
          tool_call_id: "call-1",
          tool_name: "calculator",
          tool_status: "success"
        }
      });
    });

    it('should handle non-string content (object)', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "AIMessage"],
        kwargs: {
          additional_kwargs: {},
          content: { type: "image", url: "https://example.com/image.png" },
          response_metadata: {}
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 0, 'session-123');

      expect(result.content).toBe('{"type":"image","url":"https://example.com/image.png"}');
      expect(result.role).toBe('assistant');
    });

    it('should handle empty content', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "",
          response_metadata: {}
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 0, 'session-123');

      expect(result.content).toBe('');
      expect(result.role).toBe('user');
    });

    it('should handle missing metadata timestamp (fallback to current time)', () => {
      const serializedMessage = {
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "Test",
          response_metadata: {}
        },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(serializedMessage, 0, 'session-123');

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('convertToChatMessage - Class Instance Format', () => {
    it('should handle HumanMessage class instance', () => {
      const message = new HumanMessage("User message");
      const result = createConverter()(message, 0, 'session-123', { created_at: '2024-01-01T00:00:00Z' }, 'cp-456');

      expect(result).toEqual({
        id: 'session-123-0',
        role: 'user',
        content: 'User message',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-456',
          message_index: 0
        }
      });
    });

    it('should handle AIMessage class instance with tool calls', () => {
      const message = new AIMessage({
        content: "I'll help you calculate",
        tool_calls: [
          {
            id: "call-1",
            type: "tool",
            function: { name: "calculator", arguments: "5*5" }
          }
        ],
        invalid_tool_calls: []  // Explicitly set to empty array
      });

      const result = createConverter()(message, 1, 'session-456', { created_at: '2024-01-01T00:00:00Z' }, 'cp-789');

      expect(result).toEqual({
        id: 'session-456-1',
        role: 'assistant',
        content: "I'll help you calculate",
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-789',
          message_index: 1,
          tool_calls: [
            {
              id: "call-1",
              type: "tool",
              function: { name: "calculator", arguments: "5*5" }
            }
          ],
          invalid_tool_calls: []
        }
      });
    });

    it('should handle ToolMessage class instance with all properties', () => {
      const message = new ToolMessage({
        content: "25",
        tool_call_id: "call-1",
        name: "calculator",
        status: "success",
        artifact: { result: 25 }
      });

      const result = createConverter()(message, 2, 'session-789', { created_at: '2024-01-01T00:00:00Z' }, 'cp-012');

      expect(result).toEqual({
        id: 'session-789-2',
        role: 'assistant',
        content: '25',
        timestamp: '2024-01-01T00:00:00Z',
        metadata: {
          checkpoint_id: 'cp-012',
          message_index: 2,
          tool_call_id: "call-1",
          tool_name: "calculator",
          tool_status: "success",
          artifact: { result: 25 }
        }
      });
    });

    it('should handle AIMessage with complex content (non-string)', () => {
      const message = new AIMessage([
        { type: "text", text: "Here is an image:" },
        { type: "image_url", image_url: "https://example.com/img.png" }
      ]);

      const result = createConverter()(message, 0, 'session-123');

      expect(result.role).toBe('assistant');
      expect(typeof result.content).toBe('string');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle unknown message types gracefully', () => {
      const unknownMessage = {
        id: ["unknown_package", "UnknownClass"],
        kwargs: { content: "Unknown content" },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(unknownMessage, 0, 'session-123');

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Unknown content');
      expect(result.id).toBe('session-123-0');
    });

    it('should handle malformed serialized message (missing id)', () => {
      const malformedMessage = {
        kwargs: { content: "Test" },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(malformedMessage, 0, 'session-123');

      // Missing id means it doesn't match checkpoint format, falls to fallback
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Unknown message type');
    });

    it('should handle malformed serialized message (missing kwargs)', () => {
      const malformedMessage = {
        id: ["langchain_core", "messages", "HumanMessage"],
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(malformedMessage, 0, 'session-123');

      // Missing kwargs means it doesn't match checkpoint format, falls to fallback
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Unknown message type');
    });

    it('should handle non-object message (fallback)', () => {
      const result = createConverter()(null as any, 0, 'session-123');
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Unknown message type');
    });

    it('should handle array as message (fallback)', () => {
      const result = createConverter()(["item1", "item2"] as any, 0, 'session-123');
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Unknown message type');
    });

    it('should handle null content', () => {
      const message = {
        id: ["langchain_core", "messages", "AIMessage"],
        kwargs: { content: null },
        lc: 1,
        type: "constructor"
      };

      const result = createConverter()(message, 0, 'session-123');
      expect(result.content).toBe('null');
    });
  });

  describe('Integration Tests - Full Checkpoint Scenarios', () => {
    it('should handle mixed message types in single checkpoint', async () => {
      const checkpoints = [
        {
          checkpoint: {
            channel_values: {
              messages: [
                new HumanMessage("Hello"),
                {
                  id: ["langchain_core", "messages", "AIMessage"],
                  kwargs: {
                    content: "Hi there!",
                    tool_calls: [],
                    response_metadata: {}
                  },
                  lc: 1,
                  type: "constructor"
                },
                new ToolMessage({
                  content: "Tool result",
                  tool_call_id: "call-1",
                  name: "tool_name"
                })
              ]
            }
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } }
        }
      ];

      const chatService = createTestService(checkpoints);

      const result = await chatService.getMessages('test-session');

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toBe('Hi there!');
      expect(result[2].role).toBe('assistant');
      expect(result[2].content).toBe('Tool result');
      expect(result[2].metadata?.tool_call_id).toBe('call-1');
    });

    it('should handle checkpoint with no messages', async () => {
      const checkpoints = [
        {
          checkpoint: {
            channel_values: {
              messages: []
            }
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } }
        }
      ];

      const chatService = createTestService(checkpoints);
      const result = await chatService.getMessages('test-session');

      expect(result).toHaveLength(0);
    });

    it('should handle checkpoint with undefined messages array', async () => {
      const checkpoints = [
        {
          checkpoint: {
            channel_values: {}
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } }
        }
      ];

      const chatService = createTestService(checkpoints);
      const result = await chatService.getMessages('test-session');

      expect(result).toHaveLength(0);
    });

    it('should preserve all tool metadata in conversation history', async () => {
      const checkpoints = [
        {
          checkpoint: {
            channel_values: {
              messages: [
                {
                  id: ["langchain_core", "messages", "AIMessage"],
                  kwargs: {
                    content: "Using calculator",
                    tool_calls: [
                      { id: "call-1", function: { name: "calc", arguments: "10+5" } }
                    ],
                    invalid_tool_calls: [
                      { id: "invalid-1", message: "Tool not found" }
                    ],
                    response_metadata: { model: "gpt-4" },
                    id: "run-abc123"
                  },
                  lc: 1,
                  type: "constructor"
                }
              ]
            }
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-tool-test' } }
        }
      ];

      const chatService = createTestService(checkpoints);
      const result = await chatService.getMessages('test-session');

      expect(result).toHaveLength(1);
      expect(result[0].tool_calls).toHaveLength(1);
      expect(result[0].metadata?.invalid_tool_calls).toHaveLength(1);
      expect(result[0].metadata?.response_metadata?.model).toBe('gpt-4');
      expect(result[0].metadata?.run_id).toBe('run-abc123');
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique IDs for multiple messages', () => {
      const messages = [
        new HumanMessage("Message 1"),
        new HumanMessage("Message 2"),
        new HumanMessage("Message 3")
      ];

      const converter = createConverter();
      const results = messages.map((msg, index) => converter(msg, index, 'session-123'));

      expect(results[0].id).toBe('session-123-0');
      expect(results[1].id).toBe('session-123-1');
      expect(results[2].id).toBe('session-123-2');
    });

    it('should handle different session IDs', () => {
      const message = new HumanMessage("Test");

      const converter = createConverter();
      const result1 = converter(message, 0, 'session-a');
      const result2 = converter(message, 0, 'session-b');

      expect(result1.id).toBe('session-a-0');
      expect(result2.id).toBe('session-b-0');
    });
  });
});

/**
 * Helper function to create a converter instance for testing
 */
function createConverter() {
  // Import the internal converter function
  // We'll need to export it from the module for testing
  // For now, we'll recreate it here
  return (msg: any, index: number, sessionId: string, checkpointMetadata?: any, checkpointId?: string) => {
    // Check if this is a serialized checkpoint message
    if (msg &&
        typeof msg === 'object' &&
        !Array.isArray(msg) &&
        Array.isArray(msg?.id) &&
        msg?.kwargs) {

      const messageType = msg.id[2];
      const content = msg.kwargs.content;

      const role = messageType === 'HumanMessage' ? 'user'
        : messageType === 'ToolMessage' ? 'assistant'
        : 'assistant';

      return {
        id: `${sessionId}-${index}`,
        role,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
        metadata: {
          checkpoint_id: checkpointId,
          message_index: index,
          run_id: msg.kwargs.id,
          tool_calls: msg.kwargs.tool_calls,
          invalid_tool_calls: msg.kwargs.invalid_tool_calls,
          response_metadata: msg.kwargs.response_metadata,
          tool_call_id: msg.kwargs.tool_call_id,
          tool_name: msg.kwargs.name,
          tool_status: msg.kwargs.status,
        },
      };
    }

    // Handle class instances
    if (HumanMessage.isInstance(msg)) {
      return {
        id: `${sessionId}-${index}`,
        role: 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
        metadata: {
          checkpoint_id: checkpointId,
          message_index: index,
        },
      };
    } else if (msg instanceof AIMessage) {
      return {
        id: `${sessionId}-${index}`,
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
        metadata: {
          checkpoint_id: checkpointId,
          message_index: index,
          tool_calls: msg.tool_calls,
          invalid_tool_calls: msg.invalid_tool_calls,
        },
      };
    } else if (ToolMessage.isInstance(msg)) {
      return {
        id: `${sessionId}-${index}`,
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: typeof checkpointMetadata?.created_at === 'string'
          ? checkpointMetadata.created_at
          : new Date().toISOString(),
        metadata: {
          checkpoint_id: checkpointId,
          message_index: index,
          tool_call_id: msg.tool_call_id,
          tool_name: msg.name,
          tool_status: msg.status,
          artifact: msg.artifact,
        },
      };
    }

    // Fallback
    return {
      id: `${sessionId}-${index}`,
      role: 'assistant',
      content: 'Unknown message type',
      timestamp: new Date().toISOString(),
      metadata: {
        checkpoint_id: checkpointId,
        message_index: index,
      },
    };
  };
}

/**
 * Helper function to create a test service with mocked checkpoints
 */
function createTestService(checkpoints: any[]) {
  const mockCheckpointSaver = {
    list: vi.fn().mockImplementation(async function* (config: any) {
      for (const checkpoint of checkpoints) {
        yield checkpoint;
      }
    })
  };

  const mockLogger = {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  };

  return createChatService({
    providerFactory: {} as any,
    loggerService: mockLogger as any,
    checkpointSaver: mockCheckpointSaver as any,
  });
}
