import { StateGraph } from '@langchain/langgraph';
import { WorkflowStateAnnotation, WorkflowDeps, WorkflowState } from './state';
import { NodeName } from './types';
import { planNode } from './nodes/plan';
import { assessNode } from './nodes/assess';
import { topicParseNode } from './nodes/topicParse';
import { fastTrackQuizNode } from './nodes/fastTrackQuiz';
import { gradeQuizNode } from './nodes/gradeQuiz';
import { teachNode } from './nodes/teach';
import { practiceNode } from './nodes/practice';
import { evaluateNode } from './nodes/evaluate';
import { masteryCheckNode } from './nodes/masteryCheck';
import { remediateNode } from './nodes/remediate';
import { breakerNode } from './nodes/breaker';
import { completeNode } from './nodes/complete';
import { SIMPLE_EDGES, CONDITIONALS } from './edges';

/**
 * Workflow Graph Configuration
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - Removed QA node (interactve TEACH now handles Q&A)
 * - Updated edge from TEACH to PRACTICE (direct, no QA in between)
 * - All question/assessment nodes (PRACTICE, FAST_TRACK_QUIZ, GRADE_QUIZ) now use ASSISTANT role
 * - TEACH node is fully interactive with interrupts
 */
export const createWorkflowGraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(WorkflowStateAnnotation)
    .addNode(NodeName.TOPIC_PARSE, topicParseNode(deps))
    .addNode(NodeName.PLAN, planNode(deps))
    .addNode(NodeName.ASSESS, assessNode(deps))
    .addNode(NodeName.FAST_TRACK_QUIZ, fastTrackQuizNode(deps))
    .addNode(NodeName.GRADE_QUIZ, gradeQuizNode(deps))
    .addNode(NodeName.TEACH, teachNode(deps))
    // QA node removed - interactive TEACH handles Q&A
    .addNode(NodeName.PRACTICE, practiceNode(deps))
    .addNode(NodeName.EVALUATE, evaluateNode(deps))
    .addNode(NodeName.MASTERY_CHECK, masteryCheckNode())
    .addNode(NodeName.REMEDIATE, remediateNode(deps))
    .addNode(NodeName.BREAKER, breakerNode(deps))
    .addNode(NodeName.COMPLETE, completeNode());

  SIMPLE_EDGES.forEach(([from, to]) => graph.addEdge(from, to));
  (Object.entries(CONDITIONALS) as Array<[NodeName, (state: WorkflowState) => NodeName]>).forEach(([from, fn]) =>
    graph.addConditionalEdges(from, fn)
  );

  const compiled = graph.compile({ checkpointer: deps.checkpointer });
  return compiled;
};

export type WorkflowGraphRunner = ReturnType<typeof createWorkflowGraph>;
