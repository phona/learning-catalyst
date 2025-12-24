/**
 * Unit Tests: LLM Streaming Utility
 *
 * PURPOSE:
 * Verify that streamLLM correctly handles both streaming and non-streaming LLM calls.
 * Tests cover both paths, error handling, and edge cases.
 *
 * TEST STRATEGY:
 * 1. Test streaming path with mock model
 * 2. Test non-streaming path with mock model
 * 3. Test complete content return in both modes
 * 4. Test error handling
 * 5. Test messageId generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { streamLLM } from '../stream-llm';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import type { DataStreamChunk } from '../assistant-ui-stream';

describe('streamLLM', () => {
  let mockWriter: ReturnType<typeof vi.fn>;
  let mockConfig: LangGraphRunnableConfig;
  let mockModel: BaseChatModel;
  const messages: BaseMessage[] = [new HumanMessage('Test prompt')];

  beforeEach(() => {
    mockWriter = vi.fn();
    mockConfig = {
      writer: mockWriter,
      configurable: {},
    } as LangGraphRunnableConfig;

    // Create a mock model
    mockModel = {
      invoke: vi.fn().mockResolvedValue(new AIMessage('Complete response')),
      stream: vi.fn().mockImplementation(async function* () {
        yield { content: 'Hello' };
        yield { content: ' world' };
        yield { content: '!' };
      }),
    } as unknown as BaseChatModel;
  });

  describe('streaming path (streamMode === true)', () => {
    it('should stream tokens and emit chunks', async () => {
      const content = await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: true,
      });

      // Verify model.stream was called
      expect(mockModel.stream).toHaveBeenCalledWith(messages);
      expect(mockModel.invoke).not.toHaveBeenCalled();

      // Verify complete content was returned
      expect(content).toBe('Hello world!');

      // Verify chunks were emitted in correct order
      expect(mockWriter).toHaveBeenCalledTimes(5); // text-start, 3x text-delta, text-end

      const chunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];
      expect(chunks[0].type).toBe('text-start');
      expect(chunks[1].type).toBe('text-delta');
      if (chunks[1].type === 'text-delta') {
        expect(chunks[1].delta).toBe('Hello');
      }
      expect(chunks[2].type).toBe('text-delta');
      if (chunks[2].type === 'text-delta') {
        expect(chunks[2].delta).toBe(' world');
      }
      expect(chunks[3].type).toBe('text-delta');
      if (chunks[3].type === 'text-delta') {
        expect(chunks[3].delta).toBe('!');
      }
      expect(chunks[4].type).toBe('text-end');
    });

    it('should use provided messageId', async () => {
      const customMessageId = 'custom-msg-123';

      await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: true,
        messageId: customMessageId,
      });

      const chunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];

      // Verify messageId is used in all text chunks
      expect(chunks[0].type).toBe('text-start');
      if (chunks[0].type === 'text-start') {
        expect(chunks[0].id).toBe(customMessageId);
      }
      expect(chunks[chunks.length - 1].type).toBe('text-end');
      if (chunks[chunks.length - 1].type === 'text-end') {
        expect(chunks[chunks.length - 1].id).toBe(customMessageId);
      }
    });

    it('should handle empty stream', async () => {
      const emptyModel = {
        stream: vi.fn().mockImplementation(async function* () {
          // Empty stream
        }),
      } as unknown as BaseChatModel;

      const content = await streamLLM({
        model: emptyModel,
        messages,
        config: mockConfig,
        streamMode: true,
      });

      expect(content).toBe('');
      expect(mockWriter).toHaveBeenCalledTimes(2); // text-start, text-end (no deltas)
    });
  });

  describe('non-streaming path (streamMode !== true)', () => {
    it('should invoke and emit as single chunk when streamMode is false', async () => {
      const content = await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: false,
      });

      // Verify model.invoke was called
      expect(mockModel.invoke).toHaveBeenCalledWith(messages);
      expect(mockModel.stream).not.toHaveBeenCalled();

      // Verify complete content was returned
      expect(content).toBe('Complete response');

      // Verify chunks were emitted (when writer is available)
      expect(mockWriter).toHaveBeenCalledTimes(3); // text-start, text-delta, text-end

      const chunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];
      expect(chunks[0].type).toBe('text-start');
      expect(chunks[1].type).toBe('text-delta');
      if (chunks[1].type === 'text-delta') {
        expect(chunks[1].delta).toBe('Complete response');
      }
      expect(chunks[2].type).toBe('text-end');
    });

    it('should invoke without emitting when streamMode is false and no writer', async () => {
      const configWithoutWriter = {} as LangGraphRunnableConfig;

      const content = await streamLLM({
        model: mockModel,
        messages,
        config: configWithoutWriter,
        streamMode: false,
      });

      // Verify model.invoke was called
      expect(mockModel.invoke).toHaveBeenCalledWith(messages);
      expect(mockModel.stream).not.toHaveBeenCalled();

      // Verify complete content was returned
      expect(content).toBe('Complete response');

      // No writer = no emission (no errors thrown)
    });

    it('should invoke and emit as single chunk when streamMode is undefined', async () => {
      const content = await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: undefined,
      });

      // Verify model.invoke was called
      expect(mockModel.invoke).toHaveBeenCalledWith(messages);
      expect(mockModel.stream).not.toHaveBeenCalled();

      // Verify complete content was returned
      expect(content).toBe('Complete response');

      // Verify chunks were emitted
      expect(mockWriter).toHaveBeenCalledTimes(3);
    });

    it('should use provided messageId in non-streaming mode', async () => {
      const customMessageId = 'custom-msg-123';

      await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: false,
        messageId: customMessageId,
      });

      const chunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];

      // Verify messageId is used in all text chunks
      expect(chunks[0].type).toBe('text-start');
      if (chunks[0].type === 'text-start') {
        expect(chunks[0].id).toBe(customMessageId);
      }
    });
  });

  describe('messageId generation', () => {
    it('should generate unique messageIds when not provided', async () => {
      // First call
      await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: true,
      });

      const firstChunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];
      const firstMessageId = firstChunks[0].type === 'text-start' ? firstChunks[0].id : '';

      // Reset mock
      mockWriter.mockClear();

      // Second call
      await streamLLM({
        model: mockModel,
        messages,
        config: mockConfig,
        streamMode: true,
      });

      const secondChunks = mockWriter.mock.calls.map((call) => call[0]) as DataStreamChunk[];
      const secondMessageId = secondChunks[0].type === 'text-start' ? secondChunks[0].id : '';

      // Verify messageIds are different
      expect(firstMessageId).not.toBe(secondMessageId);

      // Verify messageIds have correct format
      expect(firstMessageId).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(secondMessageId).toMatch(/^msg-\d+-[a-z0-9]+$/);
    });
  });

  describe('content handling', () => {
    it('should handle string content from invoke', async () => {
      const stringModel = {
        invoke: vi.fn().mockResolvedValue({ content: 'String content' }),
      } as unknown as BaseChatModel;

      const content = await streamLLM({
        model: stringModel,
        messages,
        config: mockConfig,
        streamMode: false,
      });

      expect(content).toBe('String content');
    });

    it('should handle empty content from invoke', async () => {
      const emptyModel = {
        invoke: vi.fn().mockResolvedValue({ content: null }),
      } as unknown as BaseChatModel;

      const content = await streamLLM({
        model: emptyModel,
        messages,
        config: mockConfig,
        streamMode: false,
      });

      expect(content).toBe('');
    });

    it('should handle undefined content from invoke', async () => {
      const undefinedModel = {
        invoke: vi.fn().mockResolvedValue({ content: undefined }),
      } as unknown as BaseChatModel;

      const content = await streamLLM({
        model: undefinedModel,
        messages,
        config: mockConfig,
        streamMode: false,
      });

      expect(content).toBe('');
    });
  });

  describe('error handling', () => {
    it('should throw when model.invoke fails in non-streaming mode', async () => {
      const errorModel = {
        invoke: vi.fn().mockRejectedValue(new Error('LLM error')),
      } as unknown as BaseChatModel;

      await expect(
        streamLLM({
          model: errorModel,
          messages,
          config: mockConfig,
          streamMode: false,
        })
      ).rejects.toThrow('LLM error');
    });

    it('should throw when model.stream fails in streaming mode', async () => {
      const errorModel = {
        stream: vi.fn().mockImplementation(async function* () {
          throw new Error('Stream error');
        }),
      } as unknown as BaseChatModel;

      await expect(
        streamLLM({
          model: errorModel,
          messages,
          config: mockConfig,
          streamMode: true,
        })
      ).rejects.toThrow('Stream error');
    });
  });

  describe('integration with chunk emitter', () => {
    it('should work in a realistic workflow node scenario', async () => {
      const capturedChunks: DataStreamChunk[] = [];
      const capturingWriter = (chunk: DataStreamChunk) => {
        capturedChunks.push(chunk);
      };

      const configWithWriter = {
        writer: capturingWriter,
        configurable: {},
      } as LangGraphRunnableConfig;

      const content = await streamLLM({
        model: mockModel,
        messages,
        config: configWithWriter,
        streamMode: true,
      });

      // Verify content
      expect(content).toBe('Hello world!');

      // Verify all chunks were captured
      expect(capturedChunks.length).toBeGreaterThan(0);

      // Verify text envelope is complete
      const hasTextStart = capturedChunks.some((c) => c.type === 'text-start');
      const hasTextEnd = capturedChunks.some((c) => c.type === 'text-end');
      expect(hasTextStart).toBe(true);
      expect(hasTextEnd).toBe(true);
    });
  });
});
