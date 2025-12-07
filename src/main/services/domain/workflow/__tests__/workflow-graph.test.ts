import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../index';

const makeCheckpointer = () => new MemorySaver();

const makeDeps = () => {
  const runAgent = vi.fn();
  const child = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(() => child) } as any;
  const loggerService = { child: vi.fn(() => child) } as any;
  const configService = {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    onConfigChanged: vi.fn(),
    get: vi.fn(),
    isSetupComplete: vi.fn().mockResolvedValue(true),
  } as any;

  const providerFactory = {
    getModel: vi.fn().mockResolvedValue({
      model: {
        invoke: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            summary: 'Practice Summary',
            exercises: [
              {
                id: 'e1',
                title: 'Exercise 1',
                description: 'Do thing',
                difficulty: 'medium',
                type: 'general',
                steps: ['Step 1'],
                hints: ['Hint 1'],
                expectedOutcome: 'Outcome',
              },
            ],
            suggestions: ['Keep going'],
          }),
        }),
      },
    }),
  } as any;

  const knowledgeService = {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [{ id: 'c1', title: 'Concept 1' }] }),
    getRelatedConcepts: vi.fn().mockResolvedValue({ relatedConcepts: [{ name: 'Concept 2' }] }),
  } as any;

  const practiceService = {
    recordPracticeAttempt: vi.fn().mockResolvedValue(undefined),
  } as any;

  const learningService = {
    getPracticeHistory: vi.fn().mockResolvedValue([
      { result: 'partial' },
      { result: 'fail' },
      { result: 'pass' },
    ]),
    listMessages: vi.fn().mockResolvedValue([{ content: 'I understand basics' }]),
  } as any;

  return {
    agentManager: { runAgent },
    loggerService,
    checkpointer: makeCheckpointer(),
    configService,
    providerFactory,
    knowledgeService,
    practiceService,
    learningService,
  } as any;
};

describe('workflow-graph interrupts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('emits await interrupt on standard practice path', async () => {
    const deps = makeDeps();
    deps.agentManager.runAgent
      .mockResolvedValueOnce({ content: 'Confidence: 50%' })
      .mockResolvedValueOnce({ content: 'Teach content' })
      .mockResolvedValueOnce({ content: 'Practice prompt' });

    const graph = createWorkflowGraph(deps);
    const stream = await graph.stream(
      { messages: [{ role: 'user', content: 'Hi' }], topic: 'Topic' },
      { configurable: { thread_id: 's1' }, stream_mode: 'updates' as const },
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const payload = extractInterrupt(evt) as any;
        expect(payload?.prompt).toContain('Practice Summary');
        break;
      }
    }
    expect(gotInterrupt).toBe(true);
  });

  it('emits await interrupt on fast-track quiz path with checkpoint id', async () => {
    const deps = makeDeps();
    deps.providerFactory.getModel
      .mockResolvedValueOnce({
        model: {
          invoke: vi.fn().mockResolvedValue({
            content: JSON.stringify({
              summary: 'Practice Summary',
              exercises: [
                {
                  id: 'e1',
                  title: 'Exercise 1',
                  description: 'Do thing',
                  difficulty: 'medium',
                  type: 'general',
                  steps: ['Step 1'],
                  hints: ['Hint 1'],
                  expectedOutcome: 'Outcome',
                },
              ],
              suggestions: ['Keep going'],
            }),
          }),
        },
      })
      .mockResolvedValueOnce({ model: { invoke: vi.fn().mockResolvedValue({ content: 'Diagnostic quiz prompt' }) } })
      .mockResolvedValueOnce({ model: { invoke: vi.fn().mockResolvedValue({ content: 'Score: 95%' }) } });

    deps.learningService.getPracticeHistory.mockResolvedValue([
      { result: 'pass' },
      { result: 'pass' },
      { result: 'pass' },
      { result: 'pass' },
    ]);

    const graph = createWorkflowGraph(deps);
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

    const resumeStream = await graph.stream(
      new Command({ resume: { answer: '42' } }),
      { configurable: { thread_id: 's2', checkpoint_id: checkpointId }, stream_mode: 'updates' as const },
    );
    for await (const _ of resumeStream) {}
  });
});
