/**
 * Practice Subgraph State
 *
 * Defines the annotation for the practice subgraph.
 * Shares keys with parent graph for auto-mapping.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { PracticeState, DEFAULT_PRACTICE_STATE } from './types';

/**
 * Messages reducer - appends new messages to existing
 */
const messagesReducer = (
  current: BaseMessage[] | undefined,
  update: BaseMessage[]
): BaseMessage[] => {
  return [...(current ?? []), ...update];
};

/**
 * Practice state reducer - merges partial updates
 */
export const practiceStateReducer = (
  current: PracticeState | undefined,
  update: Partial<PracticeState> | undefined
): PracticeState => {
  if (!update) return current ?? DEFAULT_PRACTICE_STATE;
  return { ...(current ?? DEFAULT_PRACTICE_STATE), ...update };
};

/**
 * Practice Subgraph Annotation
 *
 * Contains only the state keys needed by practice subgraph.
 * Shared keys (topic, messages, userAnswer, practicePrompt, mastery) are auto-mapped with parent.
 */
export const PracticeAnnotation = Annotation.Root({
  // Shared with parent (auto-mapped)
  topic: Annotation<string>({ reducer: (_, update) => update }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesReducer,
    default: () => [],
  }),
  userAnswer: Annotation<string | undefined>({
    reducer: (_, update) => update,
  }),
  practicePrompt: Annotation<string>({
    reducer: (_, update) => update ?? '',
    default: () => '',
  }),
  mastery: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),

  // Subgraph-owned state
  practice: Annotation<PracticeState>({
    reducer: practiceStateReducer,
    default: () => DEFAULT_PRACTICE_STATE,
  }),
});

export type PracticeSubgraphState = typeof PracticeAnnotation.State;
