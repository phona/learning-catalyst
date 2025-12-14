import { describe, it, expect, vi } from 'vitest';
import {
  toAssistantUIStream,
  createFinishChunk,
  createErrorChunk,
  createAbortChunk
} from '../assistant-ui-stream';
import { AIMessage } from '@langchain/core/messages';

describe('assistant-ui-stream', () => {
  it('converts assistant messages to AI SDK text chunks with envelope', async () => {
    // Create a workflow stream with a single assistant node
    const workflowStream = (async function* () {
      yield {
        TEACH: {
          messages: [new AIMessage('Hello, world!')],
        },
      } as Record<string, { messages: any[] }>;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    // Assistant messages send THREE chunks: text-start, text-delta, text-end
    expect(chunks).toHaveLength(3);

    // First chunk: text-start
    const textStart = JSON.parse(chunks[0].replace('data: ', ''));
    expect(textStart.type).toBe('text-start');
    expect(textStart.id).toBe('msg-TEACH-0');

    // Second chunk: text-delta
    const textDelta = JSON.parse(chunks[1].replace('data: ', ''));
    expect(textDelta.type).toBe('text-delta');
    expect(textDelta.id).toBe('msg-TEACH-0');
    expect(textDelta.delta).toBe('Hello, world!');

    // Third chunk: text-end
    const textEnd = JSON.parse(chunks[2].replace('data: ', ''));
    expect(textEnd.type).toBe('text-end');
    expect(textEnd.id).toBe('msg-TEACH-0');
  });

  it('converts tool messages to AI SDK tool chunks with text envelope', async () => {
    // Create a workflow stream with a single tool node
    const workflowStream = (async function* () {
      yield {
        Practice: {
          messages: [
            new AIMessage(
              JSON.stringify({
                type: 'practice_exercises',
                exercises: [
                  { title: 'Exercise 1', steps: ['Step 1', 'Step 2'] },
                ],
              })
            ),
          ],
          topic: 'JavaScript Basics',
          practicePrompt: 'Practice exercises for JavaScript Basics',
        },
      } as Record<string, { messages: any[]; [key: string]: unknown }>;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    // Tool messages send FIVE chunks: text-start, tool-input-start, tool-input-available, tool-output-available, text-end
    // Note: tool-input-delta is not used (simplified per AI SDK protocol)
    expect(chunks).toHaveLength(5);

    // First chunk: text-start
    const textStart = JSON.parse(chunks[0].replace('data: ', ''));
    expect(textStart.type).toBe('text-start');
    expect(textStart.id).toBe('msg-Practice-0');

    // Second chunk: tool-input-start
    const inputStart = JSON.parse(chunks[1].replace('data: ', ''));
    expect(inputStart.type).toBe('tool-input-start');
    expect(inputStart.toolName).toBe('Practice');

    // Third chunk: tool-input-available
    const inputAvailable = JSON.parse(chunks[2].replace('data: ', ''));
    expect(inputAvailable.type).toBe('tool-input-available');
    expect(inputAvailable.toolName).toBe('Practice');

    // Fourth chunk: tool-output-available
    const outputAvailable = JSON.parse(chunks[3].replace('data: ', ''));
    expect(outputAvailable.type).toBe('tool-output-available');
    expect(outputAvailable.toolCallId).toBe('tool-Practice-0');
    // Contains extracted output data with ok flag
    expect(outputAvailable.output).toBeTruthy();
    const outputResult = outputAvailable.output as { ok: boolean; data: Record<string, unknown> };
    expect(outputResult.ok).toBe(true);
    expect(outputResult.data.practiceContent).toBeTruthy();
    expect(Array.isArray(outputResult.data.exercises)).toBe(true);

    // Fifth chunk: text-end
    const textEnd = JSON.parse(chunks[4].replace('data: ', ''));
    expect(textEnd.type).toBe('text-end');
    expect(textEnd.id).toBe('msg-Practice-0');
  });

  it('handles node errors by yielding error chunk with errorText field', async () => {
    // Create a workflow stream with an error node
    const workflowStream = (async function* () {
      yield {
        TOPIC_PARSE: {
          error: 'Something went wrong',
        },
      } as Record<string, { error: string }>;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    const parsed = JSON.parse(chunks[0].replace('data: ', ''));
    expect(parsed.type).toBe('error');
    expect(parsed.errorText).toBe('Something went wrong');
  });

  it('handles empty workflow stream', async () => {
    // Create an empty workflow stream
    const workflowStream = (async function* () {
      return;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(0);
  });

  it('handles multiple nodes in workflow stream', async () => {
    // Create a workflow stream with multiple nodes
    const workflowStream = (async function* () {
      yield {
        TEACH: {
          messages: [new AIMessage('Hello')],
        },
      } as Record<string, { messages: any[] }>;
      yield {
        Practice: {
          messages: [new AIMessage(JSON.stringify({ exercises: [] }))],
        },
      } as Record<string, { messages: any[] }>;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    // First node: 3 chunks (text-start, text-delta, text-end) at indices 0, 1, 2
    // Second node: 5 chunks (text-start, tool-input-start, tool-input-available, tool-output-available, text-end) at indices 3, 4, 5, 6, 7
    // Total: 8 chunks
    expect(chunks).toHaveLength(8);

    // Verify first node (TEACH)
    const textStart1 = JSON.parse(chunks[0].replace('data: ', ''));
    expect(textStart1.type).toBe('text-start');
    expect(textStart1.id).toBe('msg-TEACH-0');

    // Verify second node (Practice) has unique IDs
    const textStart2 = JSON.parse(chunks[3].replace('data: ', ''));
    expect(textStart2.type).toBe('text-start');
    expect(textStart2.id).toBe('msg-Practice-1'); // Should be index 1, not 0
  });

  it('handles tool messages with plain content', async () => {
    // Create a workflow stream with a tool node containing plain text
    const workflowStream = (async function* () {
      yield {
        Practice: {
          messages: [
            new AIMessage('Plain text tool result'),
          ],
          topic: 'React Basics',
        },
      } as Record<string, { messages: any[]; [key: string]: unknown }>;
    })();

    const chunks: string[] = [];
    for await (const chunk of toAssistantUIStream(workflowStream)) {
      chunks.push(chunk);
    }

    // Tool messages send FIVE chunks: text-start, tool-input-start, tool-input-available, tool-output-available, text-end
    // Note: tool-input-delta is not used (simplified per AI SDK protocol)
    expect(chunks).toHaveLength(5);

    // First chunk: text-start
    const textStart = JSON.parse(chunks[0].replace('data: ', ''));
    expect(textStart.type).toBe('text-start');
    expect(textStart.id).toBe('msg-Practice-0');

    // Second chunk: tool-input-start
    const inputStart = JSON.parse(chunks[1].replace('data: ', ''));
    expect(inputStart.type).toBe('tool-input-start');
    expect(inputStart.toolName).toBe('Practice');

    // Third chunk: tool-input-available
    const inputAvailable = JSON.parse(chunks[2].replace('data: ', ''));
    expect(inputAvailable.type).toBe('tool-input-available');
    expect(inputAvailable.toolName).toBe('Practice');

    // Fourth chunk: tool-output-available
    const outputAvailable = JSON.parse(chunks[3].replace('data: ', ''));
    expect(outputAvailable.type).toBe('tool-output-available');
    expect(outputAvailable.toolCallId).toBe('tool-Practice-0');
    // Contains extracted output data with ok flag
    expect(outputAvailable.output).toBeTruthy();
    const outputResult = outputAvailable.output as { ok: boolean; data: Record<string, unknown> };
    expect(outputResult.ok).toBe(true);

    // Fifth chunk: text-end
    const textEnd = JSON.parse(chunks[4].replace('data: ', ''));
    expect(textEnd.type).toBe('text-end');
    expect(textEnd.id).toBe('msg-Practice-0');
  });

  describe('helper functions', () => {
    it('creates properly formatted finish chunk', () => {
      const finishChunk = createFinishChunk();
      expect(finishChunk).toMatch(/^data: /);
      const parsed = JSON.parse(finishChunk.replace('data: ', ''));
      expect(parsed.type).toBe('finish');
    });

    it('creates properly formatted error chunk', () => {
      const errorChunk = createErrorChunk('Test error message');
      expect(errorChunk).toMatch(/^data: /);
      const parsed = JSON.parse(errorChunk.replace('data: ', ''));
      expect(parsed.type).toBe('error');
      expect(parsed.errorText).toBe('Test error message');
    });

    it('creates properly formatted abort chunk', () => {
      const abortChunk = createAbortChunk();
      expect(abortChunk).toMatch(/^data: /);
      const parsed = JSON.parse(abortChunk.replace('data: ', ''));
      expect(parsed.type).toBe('abort');
    });
  });

  describe('node-type-specific extractors', () => {
    it('extracts PRACTICE node input and output correctly', async () => {
      const workflowStream = (async function* () {
        yield {
          Practice: {
            messages: [new AIMessage('Practice content')],
            topic: 'Python Variables',
            practicePrompt: 'Practice with variables',
          },
        } as Record<string, { messages: any[]; [key: string]: unknown }>;
      })();

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(workflowStream)) {
        chunks.push(chunk);
      }

      // Find the tool-input-available chunk (no tool-input-delta)
      const inputAvailable = JSON.parse(chunks[2].replace('data: ', ''));
      expect(inputAvailable.type).toBe('tool-input-available');
      expect(inputAvailable.toolName).toBe('Practice');

      // Find the tool-output-available chunk
      const outputAvailable = JSON.parse(chunks[3].replace('data: ', ''));
      expect(outputAvailable.type).toBe('tool-output-available');
      const outputResult = outputAvailable.output as { ok: boolean; data: Record<string, unknown> };
      expect(outputResult.ok).toBe(true);
      expect(outputResult.data.practiceContent).toBe('Practice with variables');
      expect(Array.isArray(outputResult.data.exercises)).toBe(true);
      expect(outputResult.data.exercises).toHaveLength(3);
    });

    it('extracts ASSESS node input and output correctly', async () => {
      const workflowStream = (async function* () {
        yield {
          Assess: {
            messages: [new AIMessage('Confidence: 75%')],
            topic: 'JavaScript',
            confidence: 0.75,
            gaps: ['closures', 'prototypes'],
          },
        } as Record<string, { messages: any[]; [key: string]: unknown }>;
      })();

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(workflowStream)) {
        chunks.push(chunk);
      }

      // Find the tool-input-available chunk
      const inputAvailable = JSON.parse(chunks[2].replace('data: ', ''));
      expect(inputAvailable.type).toBe('tool-input-available');
      expect(inputAvailable.toolName).toBe('Assess');

      // Find the tool-output-available chunk
      const outputAvailable = JSON.parse(chunks[3].replace('data: ', ''));
      expect(outputAvailable.type).toBe('tool-output-available');
      const outputResult = outputAvailable.output as { ok: boolean; data: Record<string, unknown> };
      expect(outputResult.ok).toBe(true);
      expect(outputResult.data.confidence).toBe(0.75);
      expect(outputResult.data.gaps).toContain('closures');
    });

    it('extracts TEACH node input and output correctly', async () => {
      const workflowStream = (async function* () {
        yield {
          Teach: {
            messages: [new AIMessage('Let me explain variables...')],
            topic: 'Python Variables',
            interactionCount: 1,
            understandingLevel: 0.5,
            readyForPractice: false,
          },
        } as Record<string, { messages: any[]; [key: string]: unknown }>;
      })();

      const chunks: string[] = [];
      for await (const chunk of toAssistantUIStream(workflowStream)) {
        chunks.push(chunk);
      }

      // TEACH is an assistant node, so it should have text-delta, not tool chunks
      const textDelta = JSON.parse(chunks[1].replace('data: ', ''));
      expect(textDelta.type).toBe('text-delta');
      expect(textDelta.delta).toContain('Let me explain variables');
    });
  });
});
