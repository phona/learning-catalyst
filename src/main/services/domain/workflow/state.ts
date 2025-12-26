import { Annotation, BaseCheckpointSaver } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../core/logger/logger-service';
import type { ConfigService } from '../../core/config/config-service';
import type { ProviderFactory } from '../../agent/provider-factory';
import type { LearningService } from '../learning/learning-service';
import type { KnowledgeService } from '../knowledge/knowledge-service';
import type { PracticeService } from '../practice/practice-service';
import type { SessionBlueprint } from './types/session-blueprint';

// Import types and reducers from subgraphs
import { TeachState, DEFAULT_TEACH_STATE } from './subgraphs/teach/types';
import { DEFAULT_PRACTICE_STATE, PracticeState } from './subgraphs/practice/types';
import { practiceStateReducer } from './subgraphs/practice/state';
import { teachStateReducer } from './subgraphs/teach/state';
import type { UserIntent } from './subgraphs/practice/types';

// Re-export types from subgraphs for convenience
export { UserIntent };
export type { TeachState, PracticeState };

const messagesStateReducer = (
  current: BaseMessage[] | undefined,
  update: BaseMessage[],
): BaseMessage[] => {
  const curr = current ?? [];
  return [...curr, ...update];
};

export const WorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer }),
  topic: Annotation<string>({ reducer: (current, update) => update ?? current }),
  error: Annotation<string | null>({
    reducer: (current, update) => (update === undefined ? (current ?? null) : update),
    default: () => null,
  }),
  confidence: Annotation<number>({ reducer: (current, update) => update ?? current }),
  mastery: Annotation<number>({ reducer: (current, update) => update ?? current }),
  attemptCount: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  practicePrompt: Annotation<string>({ reducer: (current, update) => update ?? current }),
  gaps: Annotation<string[]>({ reducer: (current, update) => update ?? current }),
  userAnswer: Annotation<string>({ reducer: (current, update) => update ?? current }),
  sessionBlueprint: Annotation<SessionBlueprint | undefined>({
    reducer: (current, update) => update ?? current,
  }),
  interactionCount: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  understandingLevel: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),
  readyForPractice: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => false,
  }),
  sessionMetadata: Annotation<{ title?: string; threadId?: string }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Practice subgraph state (nested object)
  practice: Annotation<PracticeState>({
    reducer: practiceStateReducer,
    default: () => DEFAULT_PRACTICE_STATE,
  }),

  // Teach subgraph state (nested object)
  teach: Annotation<TeachState>({
    reducer: teachStateReducer,
    default: () => DEFAULT_TEACH_STATE,
  }),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;

export type WorkflowDeps = {
  loggerService: LoggerService;
  checkpointer: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};
