import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command, MemorySaver, StateGraph, START, END } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import { TeachAnnotation } from '../state';
import { DEFAULT_TEACH_STATE } from '../types';
import { explainNode } from '../nodes/explain';
import { isInterruptEvent } from '../../../interrupt';

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('explain node interrupt resume (streaming)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unmock('@langchain/langgraph');
  });

  it('resumes using Command({ resume }) and sets userAnswer', async () => {
    const deps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue({
          invoke: vi.fn().mockResolvedValue(new AIMessage('Do you have questions, or want to practice?')),
        }),
      },
      knowledgeService: {
        searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
      },
      loggerService: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as any;

    const graph = new StateGraph(TeachAnnotation)
      .addNode('explain', explainNode(deps))
      .addEdge(START, 'explain')
      .addEdge('explain', END)
      .compile({ checkpointer: new MemorySaver() });

    const threadId = 'test-explain-resume';

    const stream1 = await graph.stream(
      {
        topic: 'JavaScript',
        messages: [],
        userAnswer: '',
        teach: { ...DEFAULT_TEACH_STATE, teachingRound: 1 },
      },
      {
        ...createMockConfig(),
        configurable: { thread_id: threadId },
        streamMode: 'updates' as const,
      },
    );

    let gotInterrupt = false;
    for await (const evt of stream1) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        break;
      }
    }
    expect(gotInterrupt).toBe(true);

    const resumeText = 'yes';
    const stream2 = await graph.stream(
      new Command({ resume: resumeText }),
      {
        ...createMockConfig(),
        configurable: { thread_id: threadId },
        streamMode: 'updates' as const,
      },
    );

    let sawUserAnswer = false;
    for await (const update of stream2) {
      if ((update as any)?.explain?.userAnswer) {
        sawUserAnswer = true;
        expect((update as any).explain.userAnswer).toBe(resumeText);
        break;
      }
    }
    expect(sawUserAnswer).toBe(true);
  });
});

