import { describe, it, expect, vi } from 'vitest';
import { Command, StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { WorkflowStateAnnotation } from '../state';
import { fastTrackQuizNode } from '../nodes/fastTrackQuiz';
import { isInterruptEvent } from '../interrupt';

describe('interrupt message persistence (checkpoint)', () => {
  it('persists resumed user reply as a HumanMessage in checkpoints', async () => {
    const quizContent =
      "Let's quickly check what you know about JavaScript closures:\n\n1) What is a closure?\n2) How would you use one for a private counter?\n3) When are closures essential?\n";

    const mockLlm = new RunnableLambda({
      func: async () => new AIMessage(quizContent),
    });

    const deps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        child: vi.fn().mockReturnValue({
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        }),
      },
    } as any;

    const checkpointer = new MemorySaver();
    const graph = new StateGraph(WorkflowStateAnnotation)
      .addNode('fastTrackQuiz', fastTrackQuizNode(deps))
      .addEdge(START, 'fastTrackQuiz')
      .addEdge('fastTrackQuiz', END)
      .compile({ checkpointer });

    const threadId = 'checkpoint-persistence-fastTrackQuiz';

    // First run: hits interrupt
    const stream1 = await graph.stream(
      {
        topic: 'JavaScript Closures',
        confidence: 0.9,
        messages: [new HumanMessage('I know this well')],
        practicePrompt: null,
      } as any,
      { configurable: { thread_id: threadId }, streamMode: 'updates' as const },
    );

    let gotInterrupt = false;
    for await (const evt of stream1) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        break;
      }
    }
    expect(gotInterrupt).toBe(true);

    // Second run: resume and complete
    const resumeText = 'A closure is a function that remembers its outer variables.';
    const stream2 = await graph.stream(
      new Command({ resume: resumeText }),
      { configurable: { thread_id: threadId }, streamMode: 'updates' as const },
    );
    for await (const _ of stream2) {
      // consume to completion to ensure checkpoint is written
    }

    const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } } as any);
    expect(tuple).toBeDefined();

    const savedMessages = (tuple as any)?.checkpoint?.channel_values?.messages as any[] | undefined;
    expect(Array.isArray(savedMessages)).toBe(true);
    expect(
      (savedMessages ?? []).some((m) => HumanMessage.isInstance(m) && m.content === resumeText),
    ).toBe(true);
  });
});

