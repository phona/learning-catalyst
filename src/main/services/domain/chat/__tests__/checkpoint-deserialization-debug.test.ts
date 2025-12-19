import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createChatService } from '../index';
import type { ChatService } from '../index';

/**
 * Manual deserializer for LangChain checkpoint messages
 */
function deserializeLangChainMessage(msg: any): any {
  // Check if this is a serialized LangChain message
  if (msg &&
      typeof msg === 'object' &&
      !Array.isArray(msg) &&
      msg.lc === 1 &&
      msg.type === 'constructor' &&
      Array.isArray(msg.id) &&
      msg.kwargs) {

    const messageType = msg.id[2]; // e.g., "HumanMessage", "AIMessage"
    const content = msg.kwargs.content;

    if (messageType === 'HumanMessage') {
      return new HumanMessage(content);
    } else if (messageType === 'AIMessage') {
      return new AIMessage(content);
    }
  }

  // If already deserialized or unknown format, return as-is
  return msg;
}

/**
 * Test to debug checkpoint message deserialization
 *
 * This test simulates the exact checkpoint format from the logs:
 * {
 *   id: ["langchain_core", "messages", "HumanMessage"],
 *   kwargs: { content: "...", additional_kwargs: {}, response_metadata: {} },
 *   lc: 1,
 *   type: "constructor"
 * }
 */

describe('Checkpoint Deserialization Debug', () => {
  let chatService: ChatService;
  let mockCheckpointSaver: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Manual deserialization', () => {
    it('should deserialize HumanMessage from checkpoint format', () => {
      // Simulate exact checkpoint format from logs
      const serializedHumanMessage = {
        id: ["langchain_core", "messages", "HumanMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "1",
          response_metadata: {}
        },
        lc: 1,
        type: "constructor"
      };

      console.log('\n=== Test 1: HumanMessage ===');
      console.log('Input serialized message:', JSON.stringify(serializedHumanMessage, null, 2));

      const deserialized = deserializeLangChainMessage(serializedHumanMessage);
      console.log('Deserialized message:', deserialized);
      console.log('Deserialized type:', deserialized.constructor.name);
      console.log('Deserialized content:', deserialized.content);

      expect(deserialized).toBeInstanceOf(HumanMessage);
      expect(deserialized.content).toBe("1");
    });

    it('should deserialize AIMessage from checkpoint format', () => {
      // Simulate exact checkpoint format from logs
      const serializedAIMessage = {
        id: ["langchain_core", "messages", "AIMessage"],
        kwargs: {
          additional_kwargs: {},
          content: "Great work! You have completed this topic. Want to schedule a spaced review?",
          response_metadata: {},
          id: "run-b62da75d-dca0-47cf-a95d-825e1d22f623",
          invalid_tool_calls: [],
          tool_calls: []
        },
        lc: 1,
        type: "constructor"
      };

      console.log('\n=== Test 2: AIMessage ===');
      console.log('Input serialized AIMessage:', JSON.stringify(serializedAIMessage, null, 2));

      const deserialized = deserializeLangChainMessage(serializedAIMessage);
      console.log('Deserialized AIMessage:', deserialized);
      console.log('Deserialized type:', deserialized.constructor.name);
      console.log('Deserialized content:', deserialized.content);

      expect(deserialized).toBeInstanceOf(AIMessage);
      expect(deserialized.content).toBe("Great work! You have completed this topic. Want to schedule a spaced review?");
    });

    it('should handle multiple messages in array', () => {
      const serializedMessages = [
        {
          id: ["langchain_core", "messages", "HumanMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "1",
            response_metadata: {}
          },
          lc: 1,
          type: "constructor"
        },
        {
          id: ["langchain_core", "messages", "AIMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "Great work!",
            response_metadata: {}
          },
          lc: 1,
          type: "constructor"
        }
      ];

      console.log('\n=== Test 3: Multiple messages ===');
      console.log('Input array:', JSON.stringify(serializedMessages, null, 2));

      const deserialized = serializedMessages.map(msg => deserializeLangChainMessage(msg));

      console.log('Deserialized array:', deserialized);
      console.log('Types:', deserialized.map(m => m.constructor.name));
      console.log('Contents:', deserialized.map(m => m.content));

      expect(deserialized).toHaveLength(2);
      expect(deserialized[0]).toBeInstanceOf(HumanMessage);
      expect(deserialized[0].content).toBe("1");
      expect(deserialized[1]).toBeInstanceOf(AIMessage);
      expect(deserialized[1].content).toBe("Great work!");
    });
  });

  describe('getMessages with serialized checkpoint data', () => {
    beforeEach(() => {
      const serializedMessages = [
        {
          id: ["langchain_core", "messages", "HumanMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "1",
            response_metadata: {}
          },
          lc: 1,
          type: "constructor"
        },
        {
          id: ["langchain_core", "messages", "AIMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "Great work! You have completed this topic. Want to schedule a spaced review?",
            response_metadata: {},
            id: "run-b62da75d-dca0-47cf-a95d-825e1d22f623",
            invalid_tool_calls: [],
            tool_calls: []
          },
          lc: 1,
          type: "constructor"
        },
        {
          id: ["langchain_core", "messages", "HumanMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "1",
            response_metadata: {}
          },
          lc: 1,
          type: "constructor"
        },
        {
          id: ["langchain_core", "messages", "AIMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "Great work! You have completed this topic. Want to schedule a spaced review?",
            response_metadata: {},
            id: "run-8c5c8f45-3d10-435a-b124-d35a992a3277",
            invalid_tool_calls: [],
            tool_calls: []
          },
          lc: 1,
          type: "constructor"
        }
      ];

      const checkpoints = [
        {
          checkpoint: {
            channel_values: {
              messages: serializedMessages
            }
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } }
        }
      ];

      mockCheckpointSaver = {
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

      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });
    });

    it('should correctly deserialize and format messages from checkpoint', async () => {
      console.log('\n=== Testing getMessages ===\n');

      const result = await chatService.getMessages('test-session');

      console.log('\n=== Result ===');
      console.log('Message count:', result.length);
      console.log('Messages:', JSON.stringify(result, null, 2));

      console.log('\n=== Message Details ===');
      result.forEach((msg, idx) => {
        console.log(`Message ${idx}:`);
        console.log('  ID:', msg.id);
        console.log('  Role:', msg.role);
        console.log('  Content:', msg.content);
        console.log('  Timestamp:', msg.timestamp);
      });

      expect(result).toHaveLength(4);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('1');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toBe('Great work! You have completed this topic. Want to schedule a spaced review?');
      expect(result[2].role).toBe('user');
      expect(result[2].content).toBe('1');
      expect(result[3].role).toBe('assistant');
      expect(result[3].content).toBe('Great work! You have completed this topic. Want to schedule a spaced review?');
    });

    it('should handle mixed serialized and instantiated messages', async () => {
      const mixedMessages = [
        new HumanMessage("Test message 1"),
        {
          id: ["langchain_core", "messages", "AIMessage"],
          kwargs: {
            additional_kwargs: {},
            content: "Test message 2",
            response_metadata: {}
          },
          lc: 1,
          type: "constructor"
        }
      ];

      const checkpoints = [
        {
          checkpoint: {
            channel_values: {
              messages: mixedMessages
            }
          },
          metadata: { created_at: '2024-01-01T00:00:00Z' },
          config: { configurable: { checkpoint_id: 'cp-1' } }
        }
      ];

      mockCheckpointSaver = {
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

      chatService = createChatService({
        providerFactory: {} as any,
        loggerService: mockLogger as any,
        checkpointSaver: mockCheckpointSaver as any,
      });

      console.log('\n=== Testing mixed messages ===\n');

      const result = await chatService.getMessages('test-session');

      console.log('\n=== Result ===');
      console.log('Message count:', result.length);
      console.log('Messages:', JSON.stringify(result, null, 2));

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Test message 1');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toBe('Test message 2');
    });
  });
});
