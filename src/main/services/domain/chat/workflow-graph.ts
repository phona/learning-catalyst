import { z } from 'zod';
import {
  StateGraph,
  START,
  END,
  Command,
  interrupt,
  type StreamEvent,
} from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { AgentManager } from '@/main/services/agent/agent-manager';
import type { AgentType } from '@/main/services/agent/types';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { SQLiteCheckpointSaver } from '@/main/services/core/checkpoints/SQLiteCheckpointSaver';
import type { ChatStatus } from '@/shared/types/electron-api/chat-api';
import { randomUUID } from 'node:crypto';

const WorkflowStateSchema = z.object({
  messages: z.array(z.any()),
  topic: z.string().optional(),
  confidence: z.number().optional(),
  mastery: z.number().optional(),
  attemptCount: z.number().optional(),
  practicePrompt: z.string().optional(),
  gaps: z.array(z.string()).optional(),
  userAnswer: z.string().optional(),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

type NodeFn = (state: WorkflowState, config?: any) => Promise<Partial<WorkflowState>>;

type WorkflowDeps = {
  agentManager: AgentManager;
  loggerService: LoggerService;
  checkpointer: SQLiteCheckpointSaver;
};

const appendMessage = (state: WorkflowState, role: 'assistant' | 'user', content: string) => {
  const messages = [...(state.messages ?? [])];
  messages.push({ role, content });
  return messages;
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
const assessNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'assessment',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  const confidence = parseScore(res.content) ?? 0.5;
  return {
    messages: appendMessage(state, 'assistant', res.content),
    confidence,
  };
};

const fastTrackQuizNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'practice',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: appendMessage(state, 'assistant', res.content),
    practicePrompt: res.content,
  };
};

const waitAnswerNode = (_label: 'quiz' | 'practice'): NodeFn => async (state) => {
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
    messages: appendMessage(state, 'user', answer),
  };
};

const gradeQuizNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'assessment',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  const mastery = parseScore(res.content) ?? 0.5;
  return {
    mastery,
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const teachNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const qaNode = (): NodeFn => async (state) => {
  const prompt = 'Any questions before we practice?';
  return {
    messages: appendMessage(state, 'assistant', prompt),
  };
};

const practiceNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'practice',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    practicePrompt: res.content,
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const evaluateNode = (deps: WorkflowDeps): NodeFn => async (state) => {
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
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const masteryCheckNode = (): NodeFn => async (state) => ({ ...state });

const remediateNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const breakerNode = (deps: WorkflowDeps): NodeFn => async (state) => {
  const res = await deps.agentManager.runAgent({
    agentType: 'tutoring' as AgentType,
    conversationId: 'workflow',
    messages: state.messages as any,
    topic: state.topic,
  });
  return {
    messages: appendMessage(state, 'assistant', res.content),
  };
};

const completeNode = (): NodeFn => async (state) => {
  const summary =
    'Great work! You have completed this topic. Want to schedule a spaced review?';
  return {
    messages: appendMessage(state, 'assistant', summary),
  };
};

// ---------------------- Graph builder ----------------------
export const createWorkflowGraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(WorkflowStateSchema)
    .addNode('Assess', assessNode(deps))
    .addNode('FastTrackQuiz', fastTrackQuizNode(deps))
    .addNode('WaitQuizAnswer', waitAnswerNode('quiz'))
    .addNode('GradeQuiz', gradeQuizNode(deps))
    .addNode('Teach', teachNode(deps))
    .addNode('QA', qaNode())
    .addNode('Practice', practiceNode(deps))
    .addNode('WaitPractice', waitAnswerNode('practice'))
    .addNode('Evaluate', evaluateNode(deps))
    .addNode('MasteryCheck', masteryCheckNode())
    .addNode('Remediate', remediateNode(deps))
    .addNode('Breaker', breakerNode(deps))
    .addNode('Complete', completeNode());

  graph.addEdge(START, 'Assess');

  graph.addConditionalEdges('Assess', (state: WorkflowState) => {
    const conf = state.confidence ?? 0.5;
    return conf >= 0.75 ? 'FastTrackQuiz' : 'Teach';
  });

  graph.addEdge('FastTrackQuiz', 'WaitQuizAnswer');
  graph.addEdge('WaitQuizAnswer', 'GradeQuiz');
  graph.addConditionalEdges('GradeQuiz', (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= 0.9 ? 'Complete' : 'Teach';
  });

  graph.addEdge('Teach', 'QA');
  graph.addEdge('QA', 'Practice');
  graph.addEdge('Practice', 'WaitPractice');
  graph.addEdge('WaitPractice', 'Evaluate');

  graph.addConditionalEdges('Evaluate', (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    const attempts = state.attemptCount ?? 0;
    if (mastery >= 0.85) return 'MasteryCheck';
    if (attempts >= 3) return 'Breaker';
    return 'Remediate';
  });

  graph.addConditionalEdges('MasteryCheck', (state: WorkflowState) => {
    const mastery = state.mastery ?? 0;
    return mastery >= 0.9 ? 'Complete' : 'Practice';
  });

  graph.addEdge('Remediate', 'Practice');
  graph.addEdge('Breaker', END);
  graph.addEdge('Complete', END);

  const compiled = graph.compile({
    checkpointer: deps.checkpointer,
  });

  return compiled;
};

export type WorkflowGraphRunner = ReturnType<typeof createWorkflowGraph>;

export const isInterruptEvent = (evt: StreamEvent<any>) =>
  !!(evt as any)?.__interrupt__?.length;

export const extractInterrupt = (evt: StreamEvent<any>) => {
  const raw = (evt as any)?.__interrupt__?.[0];
  return raw?.value ?? raw;
};
