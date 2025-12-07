import { StateGraph } from '@langchain/langgraph';
import { WorkflowStateAnnotation, WorkflowDeps, WorkflowState } from './state';
import { NodeName } from './types';
import { planNode } from './nodes/plan';
import { assessNode } from './nodes/assess';
import { topicParseNode } from './nodes/topicParse';
import { fastTrackQuizNode } from './nodes/fastTrackQuiz';
import { waitAnswerNode } from './nodes/waitAnswer';
import { gradeQuizNode } from './nodes/gradeQuiz';
import { teachNode } from './nodes/teach';
import { qaNode } from './nodes/qa';
import { practiceNode } from './nodes/practice';
import { evaluateNode } from './nodes/evaluate';
import { masteryCheckNode } from './nodes/masteryCheck';
import { remediateNode } from './nodes/remediate';
import { breakerNode } from './nodes/breaker';
import { completeNode } from './nodes/complete';
import { SIMPLE_EDGES, CONDITIONALS } from './edges';

export const createWorkflowGraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(WorkflowStateAnnotation)
    .addNode(NodeName.TOPIC_PARSE, topicParseNode(deps))
    .addNode(NodeName.PLAN, planNode(deps))
    .addNode(NodeName.ASSESS, assessNode(deps))
    .addNode(NodeName.FAST_TRACK_QUIZ, fastTrackQuizNode(deps))
    .addNode(NodeName.WAIT_QUIZ_ANSWER, waitAnswerNode('quiz'))
    .addNode(NodeName.GRADE_QUIZ, gradeQuizNode(deps))
    .addNode(NodeName.TEACH, teachNode(deps))
    .addNode(NodeName.QA, qaNode())
    .addNode(NodeName.PRACTICE, practiceNode(deps))
    .addNode(NodeName.WAIT_PRACTICE, waitAnswerNode('practice'))
    .addNode(NodeName.EVALUATE, evaluateNode(deps))
    .addNode(NodeName.MASTERY_CHECK, masteryCheckNode())
    .addNode(NodeName.REMEDIATE, remediateNode(deps))
    .addNode(NodeName.BREAKER, breakerNode(deps))
    .addNode(NodeName.COMPLETE, completeNode());

  SIMPLE_EDGES.forEach(([from, to]) => graph.addEdge(from, to));
  Object.entries(CONDITIONALS).forEach(([from, fn]) => graph.addConditionalEdges(from as NodeName, fn));

  const compiled = graph.compile({ checkpointer: deps.checkpointer });
  return compiled;
};

export type WorkflowGraphRunner = ReturnType<typeof createWorkflowGraph>;
