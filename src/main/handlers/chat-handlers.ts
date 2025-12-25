/**
 * Chat IPC Handlers
 *
 * Handles chat-related IPC communication including message streaming,
 * title generation, and LangGraph workflow integration.
 *
 * NOTE: All handlers return raw data. The ipc-main-proxy wraps responses in APIResponse<T> format.
 * - Return raw objects: { sessions, total }
 * - Throw errors directly: throw new Error('message')
 * - No createSuccessResponse/createErrorResponse wrappers needed
 */
import { ipcMain } from 'electron';
import { ChatService } from '../services/domain/chat';
import { LoggerService } from '../services/core/logger/logger-service';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { Command, INTERRUPT } from '@langchain/langgraph';
import {
  toAssistantUIStream,
  createFinishChunk,
  createErrorChunk,
} from '@/main/services/domain/workflow/utils/assistant-ui-stream';
import { HumanMessage } from 'langchain';
import { createWorkflowGraph } from '../services/domain/workflow';
import { ConfigService } from '../services/core/config/config-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { LearningService } from '../services/domain/learning/learning-service';
import { PracticeService } from '../services/domain/practice/practice-service';
import { ProviderFactory } from '../services/agent/provider-factory';
import type { AISDKNewUserMessage, AISDKTextPart } from '@/shared/types/electron-api/base';

type ChatDependencies = {
  chatService: ChatService;
  loggerService: LoggerService;
  checkpointSaver: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};

const hasPendingInterrupt = (checkpointTuple: unknown): boolean => {
  const tuple = checkpointTuple as {
    checkpoint?: { channel_values?: Record<string, unknown> };
    pendingWrites?: Array<[string, string, unknown]>;
  } | undefined;

  const channelValues = tuple?.checkpoint?.channel_values;
  const interruptChannelValue = channelValues?.[INTERRUPT];
  if (Array.isArray(interruptChannelValue) && interruptChannelValue.length > 0) {
    return true;
  }

  if (Array.isArray(tuple?.pendingWrites)) {
    return tuple.pendingWrites.some((write) => write?.[1] === INTERRUPT);
  }

  return false;
};

const partsToText = (parts: AISDKTextPart[] | undefined): string => {
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (p?.type === 'text' ? p.text : '')).join('');
};

const newUserMessageToText = (newUserMessage: AISDKNewUserMessage): string => {
  if (typeof newUserMessage === 'string') return newUserMessage;
  const partsText = partsToText(newUserMessage?.parts);
  return partsText || (newUserMessage?.content ?? '');
};

const legacyMessagesToLastUserText = (
  messages: Array<{ role: string; content?: string; parts?: AISDKTextPart[] }>,
): string => {
  const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
  if (!lastUser) return '';
  const partsText = partsToText(lastUser.parts);
  return partsText || (lastUser.content ?? '');
};

type ChatStartStreamPayload =
  | {
      streamId?: string;
      conversationId?: string;
      newUserMessage: AISDKNewUserMessage;
    }
  | {
      streamId?: string;
      conversationId?: string;
      messages: Array<{
        role: string;
        content?: string;
        parts?: AISDKTextPart[];
        id?: string;
      }>;
    };

export const setupChatHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: ChatDependencies,
): void => {
  const logger = services.loggerService.child({ handler: 'chat' });
  const workflowGraph = createWorkflowGraph({
    loggerService: logger,
    checkpointer: services.checkpointSaver,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
    learningService: services.learningService,
  });

  ipcMainInstance.handle('chat:generate-title', async (_event, messageText: string) => {
    try {
      const title = await services.chatService.generateTitle(messageText);
      return title;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('chat:generate-title failed', { message });
      throw new Error(message);
    }
  });

  ipcMainInstance.handle('chat:get-messages', async (_event, sessionId: string) => {
    const messages = await services.chatService.getMessages(sessionId);
    logger.info('Get messages requested', { sessionId, count: messages.length });
    // Return format expected by ChatAPI.getMessages: { sessions: ChatHistoryMessage[] }
    return { sessions: messages, hasMore: false, total: messages.length };
  });

  // Keep old IPC streaming API as fallback (to be removed later)
  ipcMainInstance.on(
    'chat:start-stream',
    async (
      event,
      payload: ChatStartStreamPayload,
    ) => {
      const [replyPort] = event.ports;

      const safeConversationId = payload.conversationId || `thread_${Date.now()}`;
      const lastUserText =
        'newUserMessage' in payload
          ? newUserMessageToText(payload.newUserMessage)
          : legacyMessagesToLastUserText(payload.messages);
      logger.info('chat:start-stream', {
        conversationId: safeConversationId,
        input: 'newUserMessage' in payload ? 'delta' : 'legacy',
      });

      try {
        const lcMessages =
          lastUserText.trim().length > 0 ? [new HumanMessage(lastUserText)] : [];

        // Read existing stream config to propagate to workflow nodes
        const appConfig = await services.configService.getConfig();
        const llmStreamMode = appConfig?.ai?.modelTypes?.chat?.stream;

        let checkpointTuple: unknown;
        try {
          checkpointTuple = await services.checkpointSaver.getTuple({
            configurable: { thread_id: safeConversationId },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn('chat:start-stream failed to read checkpoint tuple', { message });
        }

        const shouldResume =
          lastUserText.trim().length > 0 && hasPendingInterrupt(checkpointTuple);

        const checkpointId = (checkpointTuple as any)?.config?.configurable?.checkpoint_id as
          | string
          | undefined;

        const streamConfig = {
          configurable: {
            thread_id: safeConversationId,
            llmStreamMode,
            ...(shouldResume && checkpointId ? { checkpoint_id: checkpointId } : {}),
          },
          streamMode: ['messages', 'custom'] as Array<'messages' | 'custom'>,
        };

        const stream = await workflowGraph.stream(
          shouldResume ? new Command({ resume: lastUserText }) : { messages: lcMessages },
          streamConfig,
        );

        // Convert workflow stream directly to assistant-ui AI SDK Protocol chunks
        for await (const chunk of toAssistantUIStream(stream)) {
          replyPort.postMessage(chunk);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Use AI SDK protocol for stream-level errors (transport/runtime failures)
        replyPort.postMessage(createErrorChunk(errorMessage));
        replyPort.postMessage(createFinishChunk());
        replyPort.close();
        throw error;
        // Don't re-throw to ensure finally block executes and stream is properly closed
      } finally {
        // Send finish event according to AI SDK Protocol
        replyPort.postMessage(createFinishChunk());
        replyPort.close();
      }
    },
  );
};
