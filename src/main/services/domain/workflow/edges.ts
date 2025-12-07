import { START, END } from '@langchain/langgraph';
import { NodeName } from './types';
import type { WorkflowState } from './state';
import { THRESHOLDS } from './thresholds';

export const SIMPLE_EDGES: Array<[any, any]> = [
  [START, NodeName.TOPIC_PARSE],
  [NodeName.TOPIC_PARSE, NodeName.ASSESS],
  [NodeName.ASSESS, NodeName.PLAN],
  [NodeName.FAST_TRACK_QUIZ, NodeName.WAIT_QUIZ_ANSWER],
  [NodeName.WAIT_QUIZ_ANSWER, NodeName.GRADE_QUIZ],
  [NodeName.TEACH, NodeName.QA],
  [NodeName.QA, NodeName.PRACTICE],
  [NodeName.PRACTICE, NodeName.WAIT_PRACTICE],
  [NodeName.WAIT_PRACTICE, NodeName.EVALUATE],
  [NodeName.REMEDIATE, NodeName.PRACTICE],
  [NodeName.BREAKER, END],
  [NodeName.COMPLETE, END],
];

export const CONDITIONALS: Partial<Record<NodeName, (state: WorkflowState) => NodeName>> = {
  [NodeName.ASSESS]: (state: WorkflowState) => {
    const conf = state.confidence ?? 0.5;
    return conf >= THRESHOLDS.CONFIDENCE_FAST_TRACK ? NodeName.FAST_TRACK_QUIZ : NodeName.TEACH;
  },
  [NodeName.GRADE_QUIZ]: (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= THRESHOLDS.MASTERY_COMPLETE ? NodeName.COMPLETE : NodeName.TEACH;
  },
  [NodeName.EVALUATE]: (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    const attempts = state.attemptCount ?? 0;
    if (mastery >= THRESHOLDS.MASTERY_PASS) return NodeName.MASTERY_CHECK;
    return attempts >= THRESHOLDS.BREAKER_ATTEMPTS ? NodeName.BREAKER : NodeName.REMEDIATE;
  },
  [NodeName.MASTERY_CHECK]: (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= THRESHOLDS.MASTERY_COMPLETE ? NodeName.COMPLETE : NodeName.PRACTICE;
  },
};
