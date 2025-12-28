/**
 * Teach Subgraph State
 *
 * Defines the annotation for the teach subgraph.
 * Shares keys with parent graph for auto-mapping.
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { TeachState, DEFAULT_TEACH_STATE } from './types';

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
 * Teach state reducer - merges partial updates
 */
export const teachStateReducer = (
  current: TeachState | undefined,
  update: Partial<TeachState> | undefined
): TeachState => {
  if (!update) return current ?? DEFAULT_TEACH_STATE;
  return { ...(current ?? DEFAULT_TEACH_STATE), ...update };
};

/**
 * Teach Subgraph Annotation
 *
 * Contains only the state keys needed by teach subgraph.
 * Shared keys (topic, messages, userAnswer) are auto-mapped with parent.
 */
export const TeachAnnotation = Annotation.Root({
  // Shared with parent (auto-mapped)
  topic: Annotation<string>({ reducer: (_, update) => update }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesReducer,
    default: () => [],
  }),
  userAnswer: Annotation<string | undefined>({
    reducer: (_, update) => update,
  }),

  // Subgraph-owned state
  teach: Annotation<TeachState>({
    reducer: teachStateReducer,
    default: () => DEFAULT_TEACH_STATE,
  }),
});

export type TeachSubgraphState = typeof TeachAnnotation.State;
