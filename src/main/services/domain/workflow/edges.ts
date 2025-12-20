import { START, END } from '@langchain/langgraph';
import { NodeName } from './types';
import type { WorkflowState } from './state';
import { THRESHOLDS } from './thresholds';

export const SIMPLE_EDGES: Array<[any, any]> = [
  // Workflow initialization
  // Start([**User said**]: Start Module X) --> DelegateConf([**Orchestrator**]: Request Assessment)
  [START, NodeName.TOPIC_PARSE],

  // Path B: Standard Learning Loop - Initial setup
  // StandardStart([**Orchestrator**]: Start Topic) --> CheckProfile & Analyze([**Assessment Agent**]: Fetch Profile & History)
  // Note: TOPIC_PARSE -> ASSESS is now conditional (see CONDITIONALS below)
  // Analyze([**Assessment Agent**]: Analyze Readiness) --> PlanUpdate([**Orchestrator**]: Update Learning Plan)
  [NodeName.ASSESS, NodeName.PLAN],

  // Path A: Fast Track Assessment - Quiz flow (simplified)
  // DiagAssess([**Practice Agent**]: Generate Diagnostic Assessment) --> Grade([**Assessment Agent**]: Grade & Analyze Gaps)
  [NodeName.FAST_TRACK_QUIZ, NodeName.GRADE_QUIZ],

  // Path B: Standard Learning Loop - Teaching and practice
  // Deliver([**Learning Agent**]: Deliver Lesson Content) --> PracticeStart([**Practice Agent**]: Generate Problem)
  // NOTE: TEACH is now interactive and handles Q&A within the node
  [NodeName.TEACH, NodeName.PRACTICE],
  // PresentProblem([**Practice Agent**]: Present Problem) --> Eval([**Assessment Agent**]: Evaluate)
  // PRACTICE subgraph now handles all failure detection internally
  [NodeName.PRACTICE, NodeName.EVALUATE],

  // Workflow termination paths
  // EndSuccess([**Orchestrator**]: Module Success / Exit) when mastery threshold met
  [NodeName.COMPLETE, END],
];

export const CONDITIONALS: Partial<Record<NodeName, (state: WorkflowState) => NodeName>> = {
  // Error handling and topic validation: Stop workflow if error or no valid topic
  // Direct routing from TOPIC_PARSE to ASSESS (title generation moved outside workflow)
  [NodeName.TOPIC_PARSE]: (state: WorkflowState) => {
    if (state.error) return NodeName.COMPLETE;
    if (!state.topic) return NodeName.COMPLETE;  // No matching concept found - can't proceed
    return NodeName.ASSESS;  // Direct to ASSESS - title gen runs in parallel
  },

  // Path A vs B decision point: CheckConf[**Orchestrator**]: Confidence High?
  [NodeName.ASSESS]: (state: WorkflowState) => {
    const conf = state.confidence ?? 0.5;
    // High confidence: Fast track to diagnostic quiz
    // Low confidence: Standard teaching path
    return conf >= THRESHOLDS.CONFIDENCE_FAST_TRACK ? NodeName.FAST_TRACK_QUIZ : NodeName.TEACH;
  },

  // Path A: Quiz outcome decision - CheckMastery[**Orchestrator**]: Mastery > 90%?
  [NodeName.GRADE_QUIZ]: (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    // High mastery: Module complete / expert
    // Low mastery: Fall back to standard learning path with gap-focused plan
    return mastery >= THRESHOLDS.MASTERY_COMPLETE ? NodeName.COMPLETE : NodeName.TEACH;
  },

  // Path B: Post-evaluation decision - Eval[**Assessment Agent**]: Evaluate
  // Simplified: PRACTICE subgraph now handles all failure detection internally
  // EVALUATE now routes directly between practice and completion
  [NodeName.EVALUATE]: (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    // Mastery achieved: Complete module
    // Otherwise: Continue practice (PRACTICE will handle remediation/circuit breaking)
    return mastery >= THRESHOLDS.MASTERY_COMPLETE ? NodeName.COMPLETE : NodeName.PRACTICE;
  },
};
