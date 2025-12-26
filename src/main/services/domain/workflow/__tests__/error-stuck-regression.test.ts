import { describe, it, expect } from 'vitest';
import { StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { WorkflowStateAnnotation } from '../state';

describe('workflow error persistence regression', () => {
  it('clears error so the next user turn does not repeat the old error', async () => {
    /**
     * This test captures the reported user flow:
     *
     * Turn 1: user "1"
     *   TOPIC_PARSE -> sets state.error = `I couldn't find learning materials for "1"...`
     *   COMPLETE    -> tries to clear with { error: null }
     *   BUG: error reducer keeps the old string, so error stays "stuck" in the thread state.
     *
     * Turn 2: user "how to learn python?"
     *   TOPIC_PARSE -> would normally succeed, but doesn't clear error
     *   Routing sees state.error and goes to COMPLETE, which prints the *old* error again.
     */

    const ERROR_FOR_1 =
      `I couldn't find learning materials for "1". ` +
      `Try being more specific, like "Python programming" or try a different topic.`;

    const topicParseStub = async (state: typeof WorkflowStateAnnotation.State) => {
      const messages = state.messages ?? [];
      const lastUser = [...messages].reverse().find(HumanMessage.isInstance);
      const text = String(lastUser?.content ?? '').trim();

      if (!text) {
        return { error: "I didn't receive any message. What would you like to learn about?" };
      }

      if (text === '1') {
        return { error: ERROR_FOR_1 };
      }

      // Simulate a successful parse for any other input (important: do not clear error here).
      return { topic: 'Python' };
    };

    const completeStub = async (state: typeof WorkflowStateAnnotation.State) => {
      if (!state.error) return {};
      const errorMessage = `Learning session ended with an error: ${state.error}`;
      return { messages: [new AIMessage(errorMessage)], error: null };
    };

    const checkpointer = new MemorySaver();
    const graph = new StateGraph(WorkflowStateAnnotation)
      .addNode('TOPIC_PARSE', topicParseStub)
      .addNode('COMPLETE', completeStub)
      .addEdge(START, 'TOPIC_PARSE')
      .addConditionalEdges('TOPIC_PARSE', (state) => (state.error ? 'COMPLETE' : END))
      .addEdge('COMPLETE', END)
      .compile({ checkpointer });

    const threadId = 'regression-error-stuck-1';

    // Turn 1
    await graph.invoke(
      { messages: [new HumanMessage('1')] } as any,
      { configurable: { thread_id: threadId } } as any,
    );

    const tupleAfterTurn1 = await checkpointer.getTuple({ configurable: { thread_id: threadId } } as any);
    const errorAfterTurn1 = (tupleAfterTurn1 as any)?.checkpoint?.channel_values?.error;

    // Desired behavior: COMPLETE returns { error: null } and the state reducer must persist that clear.
    // Current bug: reducer keeps the prior error string, so this assertion fails today.
    expect(errorAfterTurn1).toBeNull();

    // Turn 2
    const result2 = await graph.invoke(
      { messages: [new HumanMessage('how to learn python?')] } as any,
      { configurable: { thread_id: threadId } } as any,
    );

    // The original bug would route to COMPLETE again, which would append a *new* AI error message.
    // With the fix, TOPIC_PARSE goes to END and no new AI message is added on turn 2.
    const messagesAfterTurn2 = result2.messages ?? [];
    const aiMessagesAfterTurn2 = messagesAfterTurn2.filter(AIMessage.isInstance);
    expect(aiMessagesAfterTurn2).toHaveLength(1);
    expect(HumanMessage.isInstance(messagesAfterTurn2.at(-1))).toBe(true);
  });
});
