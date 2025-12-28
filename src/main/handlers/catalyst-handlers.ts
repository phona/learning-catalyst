import { ipcMain } from 'electron';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import type { CheckpointTuple } from '@langchain/langgraph-checkpoint';
import { Command } from '@langchain/langgraph';
import { HumanMessage } from 'langchain';
import type { LoggerService } from '../services/core/logger/logger-service';
import type { ConfigService } from '../services/core/config/config-service';
import type { ProviderFactory } from '../services/agent/provider-factory';
import type { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import type { PracticeService } from '../services/domain/practice/practice-service';
import type { LearningService } from '../services/domain/learning/learning-service';
import { createWorkflowGraph } from '@/main/services/domain/workflow';
import { hasPendingInterrupt } from '@/main/services/domain/workflow/pending-interrupt';

type CatalystDeps = {
  loggerService: LoggerService;
  checkpointSaver: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};

const getCheckpointIdFromTuple = (checkpointTuple: unknown): string | undefined => {
  const tuple = checkpointTuple as { config?: { configurable?: { checkpoint_id?: unknown } } } | undefined;
  const checkpointId = tuple?.config?.configurable?.checkpoint_id;
  return typeof checkpointId === 'string' ? checkpointId : undefined;
};

const messageContentToText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof (part as any).text === 'string') {
          return (part as any).text;
        }
        return '';
      })
      .join('');
  }
  if (content == null) return '';
  return String(content);
};

const extractLatestAssistantText = (messages: unknown): string => {
  if (!Array.isArray(messages)) return '';

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as any;
    const type =
      typeof message?._getType === 'function'
        ? message._getType()
        : typeof message?.getType === 'function'
          ? message.getType()
          : undefined;

    if (type === 'ai') {
      return messageContentToText(message?.content);
    }
  }

  const last = messages.at(-1) as any;
  return messageContentToText(last?.content);
};

export const setupCatalystHandlers = (ipcMainInstance: typeof ipcMain, services: CatalystDeps): void => {
  const logger = services.loggerService.child({ handler: 'catalyst' });

  const workflowGraph = createWorkflowGraph({
    loggerService: logger,
    checkpointer: services.checkpointSaver,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
    learningService: services.learningService,
  });

  const runWorkflowOnce = async (sessionId: string, lastUserText: string) => {
    const appConfig = await services.configService.getConfig();
    const llmStreamMode = appConfig?.ai?.modelTypes?.chat?.stream;

    let checkpointTuple: CheckpointTuple | undefined;
    try {
      checkpointTuple = await services.checkpointSaver.getTuple({
        configurable: { thread_id: sessionId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('catalyst workflow failed to read checkpoint tuple', { message });
    }

    const shouldResume = lastUserText.trim().length > 0 && hasPendingInterrupt(checkpointTuple);
    const checkpointId = getCheckpointIdFromTuple(checkpointTuple);

    const invokeConfig = {
      configurable: {
        thread_id: sessionId,
        llmStreamMode,
        ...(shouldResume && checkpointId ? { checkpoint_id: checkpointId } : {}),
      },
    };

    const input = shouldResume
      ? new Command({ resume: lastUserText })
      : { messages: [new HumanMessage(lastUserText)] };

    const resultState = await workflowGraph.invoke(input as any, invokeConfig);
    const response = extractLatestAssistantText((resultState as any)?.messages);

    return response;
  };

  ipcMainInstance.handle('catalyst:send-chat', async (_event, params: any) => {
    const messageText = typeof params?.message === 'string' ? params.message.trim() : '';
    if (!messageText) {
      throw new Error('Message cannot be empty');
    }

    const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim().length > 0
      ? params.sessionId.trim()
      : 'default';

    const response = await runWorkflowOnce(sessionId, messageText);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      response,
    };
  });

  ipcMainInstance.handle('catalyst:send-chat-stream', async (_event, params: any) => {
    // Minimal compat: treat as non-streaming until a MessagePort-based protocol is introduced.
    const messageText = typeof params?.message === 'string' ? params.message.trim() : '';
    if (!messageText) {
      throw new Error('Message cannot be empty');
    }

    const sessionId = typeof params?.sessionId === 'string' && params.sessionId.trim().length > 0
      ? params.sessionId.trim()
      : 'default';

    const response = await runWorkflowOnce(sessionId, messageText);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      response,
    };
  });

  ipcMainInstance.handle('catalyst:cancel-agent', async () => {
    // Minimal compat: we currently do not track executions independently of workflow state.
    return { cancelled: true };
  });

  ipcMainInstance.handle('catalyst:execute-agent', async (_event, params: any) => {
    const input = typeof params?.input === 'string' ? params.input.trim() : '';
    if (!input) {
      throw new Error('Input cannot be empty');
    }

    const sessionId =
      typeof params?.context?.sessionId === 'string' && params.context.sessionId.trim().length > 0
        ? params.context.sessionId.trim()
        : 'default';

    const response = await runWorkflowOnce(sessionId, input);
    return {
      success: true,
      executionId: `exec_${Date.now()}`,
      response,
      metadata: { model: 'workflow', tokensUsed: 0, processingTime: 0 },
    };
  });

  ipcMainInstance.handle('catalyst:execute-agent-stream', async (_event, params: any) => {
    // Minimal compat: ignore streaming port and run as non-stream.
    const input = typeof params?.input === 'string' ? params.input.trim() : '';
    if (!input) {
      throw new Error('Input cannot be empty');
    }

    const sessionId =
      typeof params?.context?.sessionId === 'string' && params.context.sessionId.trim().length > 0
        ? params.context.sessionId.trim()
        : 'default';

    const response = await runWorkflowOnce(sessionId, input);
    return {
      success: true,
      executionId: `exec_${Date.now()}`,
      response,
      metadata: { model: 'workflow', tokensUsed: 0, processingTime: 0 },
    };
  });

  ipcMainInstance.handle('catalyst:get-agent-status', async () => {
    return { found: false };
  });

  ipcMainInstance.handle('catalyst:register-agent', async (_event, agentConfig: any) => {
    const agentId = typeof agentConfig?.id === 'string' && agentConfig.id.trim().length > 0
      ? agentConfig.id.trim()
      : `agent_${Date.now()}`;
    return { agentId };
  });

  ipcMainInstance.handle('catalyst:unregister-agent', async (_event, agentId: string) => {
    return { unregistered: agentId };
  });

  ipcMainInstance.handle('catalyst:get-session', async (_event, params: any) => {
    const sessionId = typeof params?.sessionId === 'string' ? params.sessionId.trim() : '';
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const session = await services.learningService.getSession(sessionId);
    return { success: true, session };
  });

  ipcMainInstance.handle('catalyst:cancel-execution', async () => {
    // Kept for parity with preload; map to cancel-agent once execution tracking exists.
    return { success: true };
  });
};
