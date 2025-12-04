import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../workflow-graph';

// Minimal stub checkpointer to satisfy LangGraph
const makeCheckpointer = () => {
  return new MemorySaver();
};

const makeDeps = () => {
  const runAgent = vi.fn();
  const child = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(() => child) };
  const loggerService = { child: vi.fn(() => child) };

  return {
    agentManager: { runAgent },
    loggerService,
    checkpointer: makeCheckpointer(),
  };
};

describe('workflow-graph interrupts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits await interrupt on standard practice path', async () => {
    const deps = makeDeps();
    // Assess -> Teach -> Practice -> WaitPractice (interrupt)
    deps.agentManager.runAgent
      .mockResolvedValueOnce({ content: 'Confidence: 50%' }) // Assess (low -> standard path)
      .mockResolvedValueOnce({ content: 'Teach content' }) // Teach
      .mockResolvedValueOnce({ content: 'Practice prompt' }); // Practice

    const graph = createWorkflowGraph(deps as any);

    const stream = await graph.stream(
      { messages: [{ role: 'user', content: 'Hi' }], topic: 'Topic' },
      { configurable: { thread_id: 's1' }, stream_mode: 'updates' as const },
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const payload = extractInterrupt(evt) as any;
        expect(payload?.prompt).toContain('Practice prompt');
        break;
      }
    }
    expect(gotInterrupt).toBe(true);
  });

  it('emits await interrupt on fast-track quiz path with checkpoint id', async () => {
    const deps = makeDeps();
    // Assess high -> FastTrackQuiz -> WaitQuizAnswer (interrupt)
    deps.agentManager.runAgent
      .mockResolvedValueOnce({ content: 'Confidence: 90%' }) // Assess high -> fast-track
      .mockResolvedValueOnce({ content: 'Diagnostic quiz prompt' }) // FastTrackQuiz
      .mockResolvedValueOnce({ content: 'Score: 95%' }); // GradeQuiz

    const graph = createWorkflowGraph(deps as any);

    const stream = await graph.stream(
      { messages: [{ role: 'user', content: 'Start' }], topic: 'Math' },
      { configurable: { thread_id: 's2' }, stream_mode: 'updates' as const },
    );

    let interruptPayload: any;
    let checkpointId: string | undefined;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        interruptPayload = extractInterrupt(evt);
        checkpointId = (evt as any)?.__interrupt__?.[0]?.checkpoint_id;
        break;
      }
    }
    expect(interruptPayload).toBeDefined();
    expect(interruptPayload.prompt).toContain('Diagnostic quiz prompt');

    // Resume with an answer should not throw
    const resumeStream = await graph.stream(
      new Command({ resume: { answer: '42' } }),
      {
        configurable: { thread_id: 's2', checkpoint_id: checkpointId },
        stream_mode: 'updates' as const,
      },
    );
    // Exhaust resume stream
    for await (const _ of resumeStream) {
      /* noop */
    }
  });
});
