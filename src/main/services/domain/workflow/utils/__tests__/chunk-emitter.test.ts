/**
 * Unit Tests: Chunk Emitter Utility
 *
 * PURPOSE:
 * Verify that the chunk emitter correctly creates and emits AI SDK protocol chunks
 * via config.writer(). Tests cover all chunk types, error handling, and edge cases.
 *
 * TEST STRATEGY:
 * 1. Test chunk emitter creation with valid config
 * 2. Test all chunk emission methods
 * 3. Test type safety and validation
 * 4. Test edge cases (undefined writer, invalid chunks)
 * 5. Test utility functions (generateId, isValidChunk, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import {
  createChunkEmitter,
  generateId,
  isValidChunk,
  isTextChunk,
  isToolChunk,
  isTerminalChunk,
} from '../chunk-emitter';
import type { DataStreamChunk } from '../assistant-ui-stream';

describe('ChunkEmitter', () => {
  /**
   * MOCK CONFIGURATION:
   * Create a mock config object with a spy writer function.
   * This allows us to verify that chunks are emitted correctly.
   */
  let mockWriter: ReturnType<typeof vi.fn>;
  let mockConfig: LangGraphRunnableConfig;

  beforeEach(() => {
    mockWriter = vi.fn();
    mockConfig = {
      writer: mockWriter,
    } as LangGraphRunnableConfig;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createChunkEmitter', () => {
    it('should create emitter with valid config', () => {
      const emitter = createChunkEmitter(mockConfig);
      expect(emitter).toBeDefined();
      expect(typeof emitter.textStart).toBe('function');
      expect(typeof emitter.toolInputStart).toBe('function');
      expect(typeof emitter.toolOutputAvailable).toBe('function');
    });

    it('should throw error when config without writer', () => {
      const configWithoutWriter = {} as LangGraphRunnableConfig;

      // Should throw when writer is missing
      expect(() => {
        createChunkEmitter(configWithoutWriter);
      }).toThrow(
        'ChunkEmitter requires a writer function in config. ' +
        'This node must be called with streaming enabled (stream() not invoke()).'
      );
    });

    it('should emit text-start chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.textStart('msg-1');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('text-start');
      if (emittedChunk.type === 'text-start') {
        expect(emittedChunk.id).toBe('msg-1');
      }
    });

    it('should emit text-delta chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.textDelta('msg-1', 'Hello world');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('text-delta');
      if (emittedChunk.type === 'text-delta') {
        expect(emittedChunk.id).toBe('msg-1');
        expect(emittedChunk.delta).toBe('Hello world');
      }
    });

    it('should emit text-end chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.textEnd('msg-1');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('text-end');
      if (emittedChunk.type === 'text-end') {
        expect(emittedChunk.id).toBe('msg-1');
      }
    });

    it('should emit tool-input-start chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.toolInputStart('tool-1', 'Practice');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('tool-input-start');
      if (emittedChunk.type === 'tool-input-start') {
        expect(emittedChunk.toolCallId).toBe('tool-1');
        expect(emittedChunk.toolName).toBe('Practice');
      }
    });

    it('should emit tool-input-available chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      const inputData = { query: 'python functions', limit: 5 };
      emitter.toolInputAvailable('tool-1', 'Practice', inputData);

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('tool-input-available');
      if (emittedChunk.type === 'tool-input-available') {
        expect(emittedChunk.toolCallId).toBe('tool-1');
        expect(emittedChunk.toolName).toBe('Practice');
        expect(emittedChunk.input).toEqual(inputData);
      }
    });

    it('should emit tool-output-available chunk with success', () => {
      const emitter = createChunkEmitter(mockConfig);
      const outputData = { ok: true as const, data: { exercises: [] } };
      emitter.toolOutputAvailable('tool-1', outputData);

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('tool-output-available');
      if (emittedChunk.type === 'tool-output-available') {
        expect(emittedChunk.toolCallId).toBe('tool-1');
        expect(emittedChunk.output).toEqual(outputData);
      }
    });

    it('should emit tool-output-available chunk with error', () => {
      const emitter = createChunkEmitter(mockConfig);
      const errorOutput = {
        ok: false as const,
        error: { message: 'Failed to generate exercises' }
      };
      emitter.toolOutputAvailable('tool-1', errorOutput);

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('tool-output-available');
      if (emittedChunk.type === 'tool-output-available') {
        expect(emittedChunk.toolCallId).toBe('tool-1');
        expect(emittedChunk.output).toEqual(errorOutput);
      }
    });

    it('should emit reasoning-start chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.reasoningStart('reason-1');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('reasoning-start');
      if (emittedChunk.type === 'reasoning-start') {
        expect(emittedChunk.id).toBe('reason-1');
      }
    });

    it('should emit reasoning-delta chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.reasoningDelta('reason-1', 'Let me think about this...');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('reasoning-delta');
      if (emittedChunk.type === 'reasoning-delta') {
        expect(emittedChunk.id).toBe('reason-1');
        expect(emittedChunk.delta).toBe('Let me think about this...');
      }
    });

    it('should emit reasoning-end chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.reasoningEnd('reason-1');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('reasoning-end');
      if (emittedChunk.type === 'reasoning-end') {
        expect(emittedChunk.id).toBe('reason-1');
      }
    });

    it('should emit error chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.error('Something went wrong');

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('error');
      if (emittedChunk.type === 'error') {
        expect(emittedChunk.errorText).toBe('Something went wrong');
      }
    });

    it('should emit finish chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.finish();

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('finish');
    });

    it('should emit abort chunk correctly', () => {
      const emitter = createChunkEmitter(mockConfig);
      emitter.abort();

      expect(mockWriter).toHaveBeenCalledTimes(1);
      const emittedChunk = mockWriter.mock.calls[0][0] as DataStreamChunk;
      expect(emittedChunk.type).toBe('abort');
    });

    it('should emit multiple chunks in sequence', () => {
      const emitter = createChunkEmitter(mockConfig);

      emitter.textStart('msg-1');
      emitter.textDelta('msg-1', 'First part');
      emitter.textDelta('msg-1', ' Second part');
      emitter.textEnd('msg-1');

      expect(mockWriter).toHaveBeenCalledTimes(4);

      const chunks = mockWriter.mock.calls.map(call => call[0]) as DataStreamChunk[];
      expect(chunks[0].type).toBe('text-start');
      expect(chunks[1].type).toBe('text-delta');
      expect(chunks[2].type).toBe('text-delta');
      expect(chunks[3].type).toBe('text-end');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('msg');
      const id2 = generateId('msg');
      const id3 = generateId('tool');

      expect(id1).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(id3).toMatch(/^tool-\d+-[a-z0-9]+$/);

      // IDs should be different
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp and random component', () => {
      const id = generateId('test');
      const parts = id.split('-');

      expect(parts[0]).toBe('test');
      expect(Number(parts[1])).toBeLessThanOrEqual(Date.now());
      expect(parts[2]).toHaveLength(7); // Random component (Math.random().toString(36).substring(2, 9) = 7 chars)
    });
  });

  describe('isValidChunk', () => {
    it('should return true for valid text-start chunk', () => {
      const chunk = { type: 'text-start', id: 'msg-1' };
      expect(isValidChunk(chunk)).toBe(true);
    });

    it('should return true for valid tool-output-available chunk', () => {
      const chunk = {
        type: 'tool-output-available',
        toolCallId: 'tool-1',
        output: { ok: true, data: {} }
      };
      expect(isValidChunk(chunk)).toBe(true);
    });

    it('should return false for invalid type', () => {
      const chunk = { type: 'invalid-type', id: 'msg-1' };
      expect(isValidChunk(chunk)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidChunk(null)).toBe(false);
      expect(isValidChunk(undefined)).toBe(false);
      expect(isValidChunk('string')).toBe(false);
      expect(isValidChunk(123)).toBe(false);
    });

    it('should return false for object without type', () => {
      const chunk = { id: 'msg-1' };
      expect(isValidChunk(chunk)).toBe(false);
    });
  });

  describe('isTextChunk', () => {
    it('should return true for text-start', () => {
      const chunk = { type: 'text-start', id: 'msg-1' } as DataStreamChunk;
      expect(isTextChunk(chunk)).toBe(true);
    });

    it('should return true for text-delta', () => {
      const chunk = { type: 'text-delta', id: 'msg-1', delta: 'text' } as DataStreamChunk;
      expect(isTextChunk(chunk)).toBe(true);
    });

    it('should return true for text-end', () => {
      const chunk = { type: 'text-end', id: 'msg-1' } as DataStreamChunk;
      expect(isTextChunk(chunk)).toBe(true);
    });

    it('should return false for tool chunks', () => {
      const chunk = { type: 'tool-input-start', toolCallId: 'tool-1', toolName: 'Test' } as DataStreamChunk;
      expect(isTextChunk(chunk)).toBe(false);
    });

    it('should return false for terminal chunks', () => {
      const chunk = { type: 'finish' } as DataStreamChunk;
      expect(isTextChunk(chunk)).toBe(false);
    });
  });

  describe('isToolChunk', () => {
    it('should return true for tool-input-start', () => {
      const chunk = { type: 'tool-input-start', toolCallId: 'tool-1', toolName: 'Test' } as DataStreamChunk;
      expect(isToolChunk(chunk)).toBe(true);
    });

    it('should return true for tool-input-available', () => {
      const chunk = { type: 'tool-input-available', toolCallId: 'tool-1', toolName: 'Test', input: {} } as DataStreamChunk;
      expect(isToolChunk(chunk)).toBe(true);
    });

    it('should return true for tool-output-available', () => {
      const chunk = { type: 'tool-output-available', toolCallId: 'tool-1', output: { ok: true, data: {} } } as DataStreamChunk;
      expect(isToolChunk(chunk)).toBe(true);
    });

    it('should return false for text chunks', () => {
      const chunk = { type: 'text-start', id: 'msg-1' } as DataStreamChunk;
      expect(isToolChunk(chunk)).toBe(false);
    });
  });

  describe('isTerminalChunk', () => {
    it('should return true for error', () => {
      const chunk = { type: 'error', errorText: 'Error' } as DataStreamChunk;
      expect(isTerminalChunk(chunk)).toBe(true);
    });

    it('should return true for finish', () => {
      const chunk = { type: 'finish' } as DataStreamChunk;
      expect(isTerminalChunk(chunk)).toBe(true);
    });

    it('should return true for abort', () => {
      const chunk = { type: 'abort' } as DataStreamChunk;
      expect(isTerminalChunk(chunk)).toBe(true);
    });

    it('should return false for text chunks', () => {
      const chunk = { type: 'text-start', id: 'msg-1' } as DataStreamChunk;
      expect(isTerminalChunk(chunk)).toBe(false);
    });

    it('should return false for tool chunks', () => {
      const chunk = { type: 'tool-output-available', toolCallId: 'tool-1', output: { ok: true, data: {} } } as DataStreamChunk;
      expect(isTerminalChunk(chunk)).toBe(false);
    });
  });
});

/**
 * INTEGRATION TEST EXAMPLE:
 * Demonstrates how to use chunk emitter in a workflow node.
 */
describe('ChunkEmitter - Integration Example', () => {
  it('should work in a practice node scenario', async () => {
    const emittedChunks: DataStreamChunk[] = [];
    const mockWriter = (chunk: DataStreamChunk) => {
      emittedChunks.push(chunk);
    };

    const config = {
      writer: mockWriter,
    } as LangGraphRunnableConfig;

    const emitter = createChunkEmitter(config);

    // Simulate practice node execution
    const toolCallId = generateId('tool');
    emitter.toolInputStart(toolCallId, 'Practice');
    emitter.toolInputAvailable(toolCallId, 'Practice', { topic: 'Python Functions', limit: 5 });

    // Simulate work...
    await new Promise(resolve => setTimeout(resolve, 10));

    emitter.toolOutputAvailable(toolCallId, {
      ok: true,
      data: {
        exercises: [{ id: '1', content: 'Practice content' }],
        summary: 'Generated exercises',
      }
    });

    // Verify chunks were emitted in correct order
    expect(emittedChunks).toHaveLength(3);
    expect(emittedChunks[0].type).toBe('tool-input-start');
    expect(emittedChunks[1].type).toBe('tool-input-available');
    expect(emittedChunks[2].type).toBe('tool-output-available');

    // Verify IDs match
    expect(emittedChunks[0]).toMatchObject({ toolCallId });
    expect(emittedChunks[1]).toMatchObject({ toolCallId });
    expect(emittedChunks[2]).toMatchObject({ toolCallId });
  });
});
