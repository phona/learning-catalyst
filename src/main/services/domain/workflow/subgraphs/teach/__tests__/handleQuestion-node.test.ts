import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command, MemorySaver, StateGraph, START, END } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { handleQuestionNode } from '../nodes/handleQuestion';
import { DEFAULT_TEACH_STATE } from '../types';
import { TeachAnnotation } from '../state';
import type { WorkflowDeps } from '../../../state';
import { extractInterrupt, isInterruptEvent } from '../../../interrupt';

const createMockDeps = (): WorkflowDeps =>
  ({
    providerFactory: {
      getModel: vi.fn(),
      getEmbeddings: vi.fn(),
      getEmbeddingModel: vi.fn(),
      getRerankModel: vi.fn(),
    },
    loggerService: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnValue({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    },
    agentManager: {} as any,
    checkpointer: {} as any,
    configService: {} as any,
    knowledgeService: {
      searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
    } as any,
    practiceService: {} as any,
    learningService: {} as any,
  }) as unknown as WorkflowDeps;

const createGraph = (deps: WorkflowDeps) =>
  new StateGraph(TeachAnnotation)
    .addNode('handleQuestion', handleQuestionNode(deps))
    .addEdge(START, 'handleQuestion')
    .addEdge('handleQuestion', END)
    .compile({ checkpointer: new MemorySaver() });

const consumeUntilInterrupt = async (stream: AsyncIterable<unknown>) => {
  for await (const evt of stream) {
    if (isInterruptEvent(evt)) {
      return extractInterrupt(evt) as any;
    }
  }

  return undefined;
};

const consumeUntilHandleQuestionUpdate = async (stream: AsyncIterable<unknown>) => {
  for await (const evt of stream) {
    if ((evt as any)?.handleQuestion) {
      return (evt as any).handleQuestion as any;
    }
  }

  return undefined;
};

describe('handleQuestion node (StateGraph interrupt pattern)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits teach_followup interrupt and resumes with Command({ resume })', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Closures are created when an inner function accesses outer scope variables.',
      }),
    };

    const deps = createMockDeps();
    (deps.providerFactory.getModel as any).mockResolvedValue(mockModel as any);

    const graph = createGraph(deps);
    const threadId = 'teach-handleQuestion-resume';

    const stream1 = await graph.stream(
      {
        ...TeachAnnotation.State,
        topic: 'JavaScript Closures',
        userAnswer: 'How are closures created?',
        messages: [],
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          questionsAsked: 0,
          teachIntent: 'question',
        },
      },
      { configurable: { thread_id: threadId }, streamMode: 'updates' as const }
    );

    const interruptValue = await consumeUntilInterrupt(stream1);
    expect(interruptValue?.type).toBe('teach_followup');
    expect(interruptValue?.prompt).toContain('Closures are created');

    const resumeText = 'yes';
    const stream2 = await graph.stream(new Command({ resume: resumeText }), {
      configurable: { thread_id: threadId },
      streamMode: 'updates' as const,
    });

    const update = await consumeUntilHandleQuestionUpdate(stream2);
    expect(update?.userAnswer).toBe(resumeText);
    expect(update?.teach?.questionsAsked).toBe(1);
    expect(update?.teach?.teachIntent).toBe(undefined);
    expect(update?.messages?.[0]).toBeInstanceOf(AIMessage);
    expect(update?.messages?.[0]?.content).toBe(interruptValue?.prompt);
    expect(update?.messages?.[1]).toBeInstanceOf(HumanMessage);
    expect(update?.messages?.[1]?.content).toBe(resumeText);
  });

  it('supports off_topic intent without calling the model', async () => {
    const deps = createMockDeps();
    const graph = createGraph(deps);
    const threadId = 'teach-handleQuestion-off-topic';

    const stream1 = await graph.stream(
      {
        ...TeachAnnotation.State,
        topic: 'Python Basics',
        userAnswer: 'Let’s talk about sports instead',
        messages: [],
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          questionsAsked: 0,
          teachIntent: 'off_topic',
        },
      },
      { configurable: { thread_id: threadId }, streamMode: 'updates' as const }
    );

    const interruptValue = await consumeUntilInterrupt(stream1);
    expect(interruptValue?.type).toBe('teach_followup');
    expect(String(interruptValue?.prompt ?? '')).toContain("Let's stay focused on Python Basics");
  });

  it('emits teach_max_questions when MAX_QUESTIONS is reached', async () => {
    const deps = createMockDeps();
    const graph = createGraph(deps);
    const threadId = 'teach-handleQuestion-max-questions';

    const stream1 = await graph.stream(
      {
        ...TeachAnnotation.State,
        topic: 'Test Topic',
        userAnswer: 'One more question',
        messages: [],
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          questionsAsked: 9,
          teachIntent: 'question',
        },
      },
      { configurable: { thread_id: threadId }, streamMode: 'updates' as const }
    );

    const interruptValue = await consumeUntilInterrupt(stream1);
    expect(interruptValue?.type).toBe('teach_max_questions');

    const stream2 = await graph.stream(new Command({ resume: 'summary' }), {
      configurable: { thread_id: threadId },
      streamMode: 'updates' as const,
    });

    const update = await consumeUntilHandleQuestionUpdate(stream2);
    expect(update?.teach?.questionsAsked).toBe(10);
  });

  it('emits chunks when config.writer is provided', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Answer to question',
      }),
    };

    const deps = createMockDeps();
    (deps.providerFactory.getModel as any).mockResolvedValue(mockModel as any);

    const graph = createGraph(deps);
    const threadId = 'teach-handleQuestion-chunks';

    const mockWriter = vi.fn();
    const config: LangGraphRunnableConfig = {
      writer: mockWriter,
      configurable: { thread_id: threadId },
      streamMode: 'updates' as any,
    } as any;

    const stream1 = await graph.stream(
      {
        ...TeachAnnotation.State,
        topic: 'Test Topic',
        userAnswer: 'What is this?',
        messages: [],
        teach: {
          ...DEFAULT_TEACH_STATE,
          teachingRound: 1,
          questionsAsked: 0,
          teachIntent: 'question',
        },
      },
      config
    );

    await consumeUntilInterrupt(stream1);

    const chunkTypes = mockWriter.mock.calls.map((call) => (call[0] as any)?.type);
    expect(chunkTypes).toContain('text-start');
    expect(chunkTypes).toContain('text-delta');
    expect(chunkTypes).toContain('text-end');
  });

  it('propagates model invocation errors', async () => {
    const mockModel = {
      invoke: vi.fn().mockRejectedValue(new Error('Model unavailable')),
    };

    const deps = createMockDeps();
    (deps.providerFactory.getModel as any).mockResolvedValue(mockModel as any);

    const graph = createGraph(deps);

    const run = async () => {
      const stream = await graph.stream(
        {
          ...TeachAnnotation.State,
          topic: 'Test Topic',
          userAnswer: 'Question',
          messages: [],
          teach: {
            ...DEFAULT_TEACH_STATE,
            teachingRound: 1,
            questionsAsked: 0,
            teachIntent: 'question',
          },
        },
        { configurable: { thread_id: 'teach-handleQuestion-error' }, streamMode: 'updates' as const }
      );

      for await (const _ of stream) {
        // consume
      }
    };

    await expect(run()).rejects.toThrow('Model unavailable');
  });
});
