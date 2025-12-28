import { StateGraph } from '@langchain/langgraph';
import { WorkflowStateAnnotation, WorkflowDeps, WorkflowState } from './state';
import { NodeName } from './types';
import { planNode } from './nodes/plan';
import { assessNode } from './nodes/assess';
import { topicParseNode } from './nodes/topicParse';
import { fastTrackQuizNode } from './nodes/fastTrackQuiz';
import { gradeQuizNode } from './nodes/gradeQuiz';
import { createTeachSubgraph } from './subgraphs/teach';
import { createPracticeSubgraph } from './subgraphs/practice';
import { evaluateNode } from './nodes/evaluate';
import { completeNode } from './nodes/complete';
import { SIMPLE_EDGES, CONDITIONALS } from './edges';

/**
 * Workflow Graph Configuration
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - TEACH is now a subgraph with teach-assess loop:
 *   EXPLAIN → CLASSIFY_RESPONSE → HANDLE_QUESTION/ASSESS_UNDERSTANDING
 * - PRACTICE is now a subgraph with integrated failure handling:
 *   - detectFailure: Analyzes mastery and failure patterns
 *   - circuitBreaker: Provides support when user struggles
 *   - remediatePractice: Re-teaches gaps before continuing
 * - Removed BREAKER and REMEDIATE nodes (integrated into PRACTICE)
 * - Simplified EVALUATE routing (direct to PRACTICE)
 * - All question/assessment nodes (PRACTICE, FAST_TRACK_QUIZ, GRADE_QUIZ) now use ASSISTANT role
 */
export const createWorkflowGraph = (deps: WorkflowDeps) => {
  // Create subgraphs
  const teachSubgraph = createTeachSubgraph(deps);
  const practiceSubgraph = createPracticeSubgraph(deps);

  const graph = new StateGraph(WorkflowStateAnnotation)
    .addNode(NodeName.TOPIC_PARSE, topicParseNode(deps))
    .addNode(NodeName.ASSESS, assessNode(deps))
    .addNode(NodeName.PLAN, planNode(deps))
    .addNode(NodeName.FAST_TRACK_QUIZ, fastTrackQuizNode(deps))
    .addNode(NodeName.GRADE_QUIZ, gradeQuizNode(deps))
    // TEACH is now a subgraph with teach-assess loop
    .addNode(NodeName.TEACH, teachSubgraph)
    // PRACTICE is a subgraph with integrated failure handling
    .addNode(NodeName.PRACTICE, practiceSubgraph)
    .addNode(NodeName.EVALUATE, evaluateNode(deps))
    .addNode(NodeName.COMPLETE, completeNode());

  SIMPLE_EDGES.forEach(([from, to]) => graph.addEdge(from, to));
  (Object.entries(CONDITIONALS) as Array<[NodeName, (state: WorkflowState) => NodeName]>).forEach(([from, fn]) =>
    graph.addConditionalEdges(from as NodeName | '__start__', fn)
  );

  const compiled = graph.compile({ checkpointer: deps.checkpointer });
  return compiled;
};

export type WorkflowGraphRunner = ReturnType<typeof createWorkflowGraph>;
