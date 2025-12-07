import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { AgentManager } from '../../agent/agent-manager';
import type { LoggerService } from '../../core/logger/logger-service';
import type { SQLiteCheckpointSaver } from '../../core/checkpoints/SQLiteCheckpointSaver';
import type { ConfigService } from '../../core/config/config-service';
import type { ProviderFactory } from '../../agent/provider-factory';
import type { LearningService } from '../learning/learning-service';
import type { KnowledgeService } from '../knowledge/knowledge-service';
import type { PracticeService } from '../practice/practice-service';
import type { SessionBlueprint } from './nodes/plan';

const messagesStateReducer = (current: BaseMessage[] | undefined, update: BaseMessage[]): BaseMessage[] => {
  const curr = current ?? [];
  return [...curr, ...update];
};

export const WorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer }),
  topic: Annotation<string>({ reducer: (current, update) => update ?? current }),
  confidence: Annotation<number>({ reducer: (current, update) => update ?? current }),
  mastery: Annotation<number>({ reducer: (current, update) => update ?? current }),
  attemptCount: Annotation<number>({ reducer: (current, update) => update ?? current, default: () => 0 }),
  practicePrompt: Annotation<string>({ reducer: (current, update) => update ?? current }),
  gaps: Annotation<string[]>({ reducer: (current, update) => update ?? current }),
  userAnswer: Annotation<string>({ reducer: (current, update) => update ?? current }),
  sessionBlueprint: Annotation<SessionBlueprint | undefined>({ reducer: (current, update) => update ?? current }),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;

export type WorkflowDeps = {
  agentManager: AgentManager;
  loggerService: LoggerService;
  checkpointer: SQLiteCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};
