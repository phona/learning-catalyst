/**
 * Integration Tests: Assistant UI Stream Handler
 *
 * PURPOSE:
 * Verify that toAssistantUIStream correctly processes both custom events and messages
 * from a LangGraph stream with streamMode: ['messages', 'custom'].
 *
 * TEST STRATEGY:
 * 1. Test direct pass-through of custom events
 * 2. Test conversion of messages to AI SDK chunks
 * 3. Test mixed stream (custom events + messages)
 * 4. Test error handling and edge cases
 * 5. Verify SSE formatting
 */

import { describe, it, expect } from 'vitest';
import { toAssistantUIStream } from '../assistant-ui-stream';
import type { DataStreamChunk } from '../assistant-ui-stream';

describe('toAssistantUIStream Integration', () => {
  /**
   * HELPER: Convert SSE chunks to objects for easier testing
   */
  const parseSSE = (sse: string) => {
    const match = sse.match(/data: (.+)\n\n/);
    return match ? JSON.parse(match[1]) : null;
  };

  describe('Custom Events (Direct Pass-Through)', () => {
    it('should pass through tool-input-start chunk', async () => {
      const stream = async function* () {
        yield [
          'custom',
          {
            type: 'tool-input-start',
            toolCallId: 'tool-1',
            toolName: 'Practice'
          }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('tool-input-start');
      expect(parsed.toolCallId).toBe('tool-1');
      expect(parsed.toolName).toBe('Practice');
    });

    it('should pass through tool-output-available chunk', async () => {
      const stream = async function* () {
        yield [
          'custom',
          {
            type: 'tool-output-available',
            toolCallId: 'tool-1',
            output: {
              ok: true,
              data: { exercises: [] }
            }
          }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('tool-output-available');
      expect(parsed.output.ok).toBe(true);
    });

    it('should pass through error chunk', async () => {
      const stream = async function* () {
        yield [
          'custom',
          {
            type: 'error',
            errorText: 'Something went wrong'
          }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('error');
      expect(parsed.errorText).toBe('Something went wrong');
    });

    it('should ignore invalid custom events', async () => {
      const stream = async function* () {
        // Invalid event (no 'type' field)
        yield ['custom', { data: 'test' }] as ['custom', unknown];

        // Valid event
        yield [
          'custom',
          { type: 'finish' }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      // Only the valid event should be passed through
      expect(chunks).toHaveLength(1);
      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('finish');
    });
  });

  describe('Interrupt Handling', () => {
    it('should end the generator when an interrupt event is observed', async () => {
      let upstreamClosed = false;
      const stream = async function* () {
        try {
          yield [
            'custom',
            { type: 'text-start', id: 'msg-1' }
          ] as ['custom', DataStreamChunk];

          yield [
            'updates',
            {
              __interrupt__: [{ value: { type: 'teach_response' }, checkpoint_id: 'checkpoint_1' }]
            }
          ] as ['updates', unknown];

          // Should never be observed once interrupt is detected.
          yield [
            'custom',
            { type: 'text-delta', id: 'msg-1', delta: 'should not appear' }
          ] as ['custom', DataStreamChunk];
        } finally {
          upstreamClosed = true;
        }
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(parseSSE(chunks[0])?.type).toBe('text-start');
      expect(upstreamClosed).toBe(true);
    });

    it('should ignore non-custom non-interrupt events', async () => {
      const stream = async function* () {
        yield ['updates', { foo: 'bar' }] as ['updates', unknown];
        yield [
          'custom',
          { type: 'text-start', id: 'msg-1' }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(parseSSE(chunks[0])?.type).toBe('text-start');
    });
  });

  // Message conversion is NO LONGER NEEDED
  // All chunks are now emitted directly via config.writer() in each node
  // The stream only contains custom events (AI SDK chunks), not BaseMessage objects
  describe.skip('Messages (Conversion) - DEPRECATED', () => {
    it('should convert assistant message to text chunks', async () => {
      // This test is deprecated - messages are no longer converted
      // All chunks are emitted directly via chunk emitter
    });
  });

  // Mixed stream handling - custom events only
  // Messages are no longer in the stream, only custom events (AI SDK chunks)
  describe.skip('Mixed Stream (Custom Events + Messages) - DEPRECATED', () => {
    it('should handle interleaved custom events and messages', async () => {
      // This test is deprecated - messages are no longer in the stream
      // All chunks are emitted directly via chunk emitter
    });
  });

  // Error handling for custom events
  // All errors should be emitted as custom events via the chunk emitter
  describe('Error Handling', () => {
    it('should pass through error chunks', async () => {
      const stream = async function* () {
        yield [
          'custom',
          {
            type: 'error',
            errorText: 'Something went wrong'
          }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('error');
      expect(parsed.errorText).toBe('Something went wrong');
    });
  });

  describe('SSE Formatting', () => {
    it('should format chunks as SSE with data: prefix and double newline', async () => {
      const stream = async function* () {
        yield [
          'custom',
          { type: 'text-start', id: 'msg-1' }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      // Each chunk should be formatted as "data: {json}\n\n"
      chunks.forEach(chunk => {
        expect(chunk).toMatch(/^data: .+\n\n$/);
      });

      const parsed = parseSSE(chunks[0]);
      expect(parsed.type).toBe('text-start');
    });

    it('should format custom events as SSE', async () => {
      const stream = async function* () {
        yield [
          'custom',
          { type: 'finish' }
        ] as ['custom', DataStreamChunk];
      };

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }

      expect(chunks[0]).toBe('data: {"type":"finish"}\n\n');
    });
  });

  describe('Performance', () => {
    it('should handle large streams efficiently', async () => {
      const stream = async function* () {
        // Generate 100 custom events
        for (let i = 0; i < 100; i++) {
          yield [
            'custom',
            { type: 'text-delta', id: `msg-${i}`, delta: `Message ${i}` }
          ] as ['custom', DataStreamChunk];
        }
      };

      const startTime = Date.now();
      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(stream())) {
        chunks.push(chunk);
      }
      const endTime = Date.now();

      // Should process 100 custom events
      expect(chunks).toHaveLength(100);

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});

/**
 * REAL-WORLD SCENARIO TEST:
 * Simulates a complete practice node execution flow
 *
 * In the new architecture, the practice node emits ALL chunks directly:
 * 1. tool-input-start
 * 2. tool-input-available
 * 3. text-start
 * 4. text-delta
 * 5. text-end
 * 6. tool-output-available
 */
describe('Practice Node Scenario', () => {
  /**
   * HELPER: Convert SSE chunks to objects for easier testing
   */
  const parseSSE = (sse: string) => {
    const match = sse.match(/data: (.+)\n\n/);
    return match ? JSON.parse(match[1]) : null;
  };

  it('should simulate complete practice node execution', async () => {
    const stream = async function* () {
      // 1. Tool input start
      yield [
        'custom',
        {
          type: 'tool-input-start',
          toolCallId: 'tool-123',
          toolName: 'Practice'
        }
      ] as ['custom', DataStreamChunk];

      // 2. Tool input available
      yield [
        'custom',
        {
          type: 'tool-input-available',
          toolCallId: 'tool-123',
          toolName: 'Practice',
          input: { topic: 'Python Functions', limit: 5 }
        }
      ] as ['custom', DataStreamChunk];

      // 3. Conversational message (emitted via chunk emitter)
      yield [
        'custom',
        { type: 'text-start', id: 'msg-0' }
      ] as ['custom', DataStreamChunk];

      yield [
        'custom',
        { type: 'text-delta', id: 'msg-0', delta: 'I\'ve created some practice exercises for you!' }
      ] as ['custom', DataStreamChunk];

      yield [
        'custom',
        { type: 'text-end', id: 'msg-0' }
      ] as ['custom', DataStreamChunk];

      // 4. Tool output available
      yield [
        'custom',
        {
          type: 'tool-output-available',
          toolCallId: 'tool-123',
          output: {
            ok: true,
            data: {
              exercises: [
                { id: '1', content: 'Define a function that adds two numbers' }
              ],
              summary: 'Generated 1 exercise'
            }
          }
        }
      ] as ['custom', DataStreamChunk];
    };

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(stream())) {
      chunks.push(chunk);
    }

    // Verify complete flow (6 chunks total)
    expect(chunks).toHaveLength(6);

    const parsed0 = parseSSE(chunks[0]);
    expect(parsed0.type).toBe('tool-input-start');

    const parsed1 = parseSSE(chunks[1]);
    expect(parsed1.type).toBe('tool-input-available');

    const parsed2 = parseSSE(chunks[2]);
    expect(parsed2.type).toBe('text-start');
    expect(parsed2.id).toBe('msg-0');

    const parsed3 = parseSSE(chunks[3]);
    expect(parsed3.type).toBe('text-delta');
    expect(parsed3.delta).toBe('I\'ve created some practice exercises for you!');

    const parsed4 = parseSSE(chunks[4]);
    expect(parsed4.type).toBe('text-end');

    const parsed5 = parseSSE(chunks[5]);
    expect(parsed5.type).toBe('tool-output-available');
    expect(parsed5.output.ok).toBe(true);
  });
});
