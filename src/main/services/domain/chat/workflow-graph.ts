import { randomUUID } from 'node:crypto';
import {
  StateGraph,
  START,
  END,
  Command,
  interrupt,
} from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import type { AgentManager } from '../../agent/agent-manager';
import type { AgentType } from '../../agent/types';
import type { LoggerService } from '../../core/logger/logger-service';
import type { SQLiteCheckpointSaver } from '../../core/checkpoints/SQLiteCheckpointSaver';
import type { BaseMessage } from '@langchain/core/messages';

// Node names enum
enum NodeName {
  ASSESS = 'Assess',
  FAST_TRACK_QUIZ = 'FastTrackQuiz',
  WAIT_QUIZ_ANSWER = 'WaitQuizAnswer',
  GRADE_QUIZ = 'GradeQuiz',
  TEACH = 'Teach',
  QA = 'QA',
  PRACTICE = 'Practice',
  WAIT_PRACTICE = 'WaitPractice',
  EVALUATE = 'Evaluate',
  MASTERY_CHECK = 'MasteryCheck',
  REMEDIATE = 'Remediate',
  BREAKER = 'Breaker',
  COMPLETE = 'Complete',
}

// Edge destinations enum
enum EdgeDestination {
  TEACH = 'Teach',
  FAST_TRACK_QUIZ = 'FastTrackQuiz',
  PRACTICE = 'Practice',
  COMPLETE = 'Complete',
  REMEDIATE = 'Remediate',
  MASTERY_CHECK = 'MasteryCheck',
}

// Define custom reducer for messages
const messagesStateReducer = (current: BaseMessage[] | undefined, update: BaseMessage[]): BaseMessage[] => {
  const curr = current ?? [];
  return [...curr, ...update];
};

// Define the state using Annotation.Root (LangGraph v1 pattern)
const WorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
  topic: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
  confidence: Annotation<number>({
    reducer: (current, update) => update ?? current,
  }),
  mastery: Annotation<number>({
    reducer: (current, update) => update ?? current,
  }),
  attemptCount: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  practicePrompt: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
  gaps: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
  }),
  userAnswer: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;

type WorkflowDeps = {
  agentManager: AgentManager;
  loggerService: LoggerService;
  checkpointer: SQLiteCheckpointSaver;
};

const parseScore = (text?: string | null): number | undefined => {
  if (!text) return undefined;
  const pctMatch = /(\d{1,3})\s*%/.exec(text);
  if (pctMatch) {
    const v = Number(pctMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  const numMatch = /(?:score|confidence)[:\s]*([0-9]+(?:\.[0-9]+)?)/i.exec(text);
  if (numMatch) {
    const v = Number(numMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  return undefined;
};

// ---------------------- Node implementations ----------------------
const assessNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'assessment',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  const confidence = parseScore(res.content) ?? 0.5;
  return {
    messages: [{ role: 'assistant', content: res.content }],
    confidence,
  };
};

const fastTrackQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'practice',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: [{ role: 'assistant', content: res.content }],
    practicePrompt: res.content,
  };
};

const waitAnswerNode = (_label: 'quiz' | 'practice') => async (state: typeof WorkflowStateAnnotation.State) => {
  const prompt = state.practicePrompt ?? 'Please answer the question to continue.';
  const questionId = randomUUID();
  const resumeVal = await interrupt({
    type: 'await_user_input',
    prompt,
    questionId,
  });
  const answer =
    typeof resumeVal === 'string'
      ? resumeVal
      : (resumeVal as any)?.answer ?? (resumeVal as any)?.content ?? '';
  return {
    userAnswer: answer,
    messages: [{ role: 'user', content: answer }],
  };
};

const gradeQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'assessment',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  const mastery = parseScore(res.content) ?? 0.5;
  return {
    mastery,
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const teachNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const qaNode = () => async (state: typeof WorkflowStateAnnotation.State) => {
  const prompt = 'Any questions before we practice?';
  return {
    messages: [{ role: 'assistant', content: prompt }],
  };
};

const practiceNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'practice',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    practicePrompt: res.content,
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const evaluateNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'assessment',
    conversationId: 'workflow',
    messages: [
      ...(state.messages as any),
      { role: 'user', content: state.userAnswer ?? '' },
    ],
    topic: state.topic,
  });
  const mastery = parseScore(res.content) ?? state.mastery ?? 0.5;
  const attemptCount = (state.attemptCount ?? 0) + 1;
  return {
    mastery,
    attemptCount,
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const masteryCheckNode = () => async (state: typeof WorkflowStateAnnotation.State) => ({ ...state });

const remediateNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const breakerNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'tutoring' as AgentType,
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: [{ role: 'assistant', content: res.content }],
  };
};

const completeNode = () => async (state: typeof WorkflowStateAnnotation.State) => {
  const summary =
    'Great work! You have completed this topic. Want to schedule a spaced review?';
  return {
    messages: [{ role: 'assistant', content: summary }],
  };
};

// ---------------------- Graph builder ----------------------
export const createWorkflowGraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(WorkflowStateAnnotation)
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

  graph.addEdge(START, NodeName.ASSESS);

  graph.addConditionalEdges(NodeName.ASSESS, (state: WorkflowState) => {
    const conf = state.confidence ?? 0.5;
    return conf >= 0.75 ? EdgeDestination.FAST_TRACK_QUIZ : EdgeDestination.TEACH;
  });

  graph.addEdge(NodeName.FAST_TRACK_QUIZ, NodeName.WAIT_QUIZ_ANSWER);
  graph.addEdge(NodeName.WAIT_QUIZ_ANSWER, NodeName.GRADE_QUIZ);
  graph.addConditionalEdges(NodeName.GRADE_QUIZ, (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= 0.9 ? EdgeDestination.COMPLETE : EdgeDestination.TEACH;
  });

  graph.addEdge(NodeName.TEACH, NodeName.QA);
  graph.addEdge(NodeName.QA, NodeName.PRACTICE);
  graph.addEdge(NodeName.PRACTICE, NodeName.WAIT_PRACTICE);
  graph.addEdge(NodeName.WAIT_PRACTICE, NodeName.EVALUATE);

  graph.addConditionalEdges(NodeName.EVALUATE, (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    const attempts = state.attemptCount ?? 0;
    if (mastery >= 0.85) return EdgeDestination.MASTERY_CHECK;
    return attempts >= 3 ? NodeName.BREAKER : EdgeDestination.REMEDIATE;
  });

  graph.addConditionalEdges(NodeName.MASTERY_CHECK, (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= 0.9 ? EdgeDestination.COMPLETE : EdgeDestination.PRACTICE;
  });

  graph.addEdge(NodeName.REMEDIATE, NodeName.PRACTICE);
  graph.addEdge(NodeName.BREAKER, END);
  graph.addEdge(NodeName.COMPLETE, END);

  const compiled = graph.compile({
    checkpointer: deps.checkpointer,
  });

  return compiled;
};

export type WorkflowGraphRunner = ReturnType<typeof createWorkflowGraph>;

type InterruptEvent = { __interrupt__?: Array<{ value?: unknown; checkpoint_id?: string }> };

export const isInterruptEvent = (evt: unknown): evt is InterruptEvent =>
  !!(evt as InterruptEvent)?.__interrupt__?.length;

export const extractInterrupt = (
  evt: InterruptEvent,
): Record<string, unknown> | unknown | undefined => {
  const raw = evt?.__interrupt__?.[0];
  return raw?.value ?? raw;
};
