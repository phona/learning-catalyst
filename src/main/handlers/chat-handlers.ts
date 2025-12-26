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
import { Command } from '@langchain/langgraph';
import type { CheckpointTuple } from '@langchain/langgraph-checkpoint';
import { hasPendingInterrupt } from '@/main/services/domain/workflow/pending-interrupt';
import {
  toAssistantUIStream,
  createFinishChunk,
  createErrorChunk,
  createAbortChunk,
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

const getCheckpointIdFromTuple = (checkpointTuple: unknown): string | undefined => {
  const tuple = checkpointTuple as { config?: { configurable?: { checkpoint_id?: unknown } } } | undefined;
  const checkpointId = tuple?.config?.configurable?.checkpoint_id;
  return typeof checkpointId === 'string' ? checkpointId : undefined;
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

  type ReplyPortLike = { postMessage: (message: unknown) => void; close: () => void };
  type ActiveStreamState = {
    replyPort: ReplyPortLike;
    iterator?: AsyncIterator<string>;
    onCancel?: () => void;
    cancelled: boolean;
    terminal: boolean;
  };

  const activeStreams = new Map<string, ActiveStreamState>();

  ipcMainInstance.on(
    'chat:cancel-stream',
    (_event, payload: { streamId?: string } | undefined) => {
      const streamId = payload?.streamId;
      if (!streamId) return;

      const streamState = activeStreams.get(streamId);
      if (!streamState || streamState.terminal) return;

      streamState.cancelled = true;
      streamState.terminal = true;
      streamState.onCancel?.();

      try {
        streamState.iterator?.return?.();
      } catch {
        // best-effort cancellation
      }

      try {
        streamState.replyPort.postMessage(createAbortChunk());
      } catch {
        // best-effort: port may already be closed
      }

      try {
        streamState.replyPort.close();
      } catch {
        // best-effort: port may already be closed
      }

      activeStreams.delete(streamId);
    },
  );

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
      const streamId = payload.streamId ?? `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let cancelStreamLoop: (() => void) | undefined;
      const cancelPromise = new Promise<void>((resolve) => {
        cancelStreamLoop = resolve;
      });
      const streamState: ActiveStreamState = {
        replyPort: replyPort as ReplyPortLike,
        onCancel: cancelStreamLoop,
        cancelled: false,
        terminal: false,
      };
      activeStreams.set(streamId, streamState);

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

        let checkpointTuple: CheckpointTuple | undefined;
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

        const checkpointId = getCheckpointIdFromTuple(checkpointTuple);

        const streamConfig = {
          configurable: {
            thread_id: safeConversationId,
            llmStreamMode,
            ...(shouldResume && checkpointId ? { checkpoint_id: checkpointId } : {}),
          },
          // Include `updates` so interrupt-bearing events surface promptly.
          streamMode: ['messages', 'custom', 'updates'] as Array<'messages' | 'custom' | 'updates'>,
        };

        const stream = await workflowGraph.stream(
          shouldResume ? new Command({ resume: lastUserText }) : { messages: lcMessages },
          streamConfig,
        );

        // Convert workflow stream directly to assistant-ui AI SDK Protocol chunks
        const aiStream = toAssistantUIStream(stream);
        const iterator = aiStream[Symbol.asyncIterator]();
        streamState.iterator = iterator;

        while (!streamState.cancelled) {
          const next = await Promise.race([
            iterator.next(),
            cancelPromise.then(() => ({ done: true as const, value: undefined as unknown as string })),
          ]);

          const { value, done } = next;
          if (done) break;
          if (streamState.cancelled) break;
          replyPort.postMessage(value);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Use AI SDK protocol for stream-level errors (transport/runtime failures)
        if (!streamState.cancelled) {
          logger.error('chat:start-stream failed', { message: errorMessage });
          replyPort.postMessage(createErrorChunk(errorMessage));
        }
        // Do not emit `finish` here; the transport boundary owns it in `finally`.
      } finally {
        const isActive = activeStreams.get(streamId) === streamState;
        if (!streamState.terminal && !streamState.cancelled) {
          streamState.terminal = true;
          // Send finish event according to AI SDK Protocol
          try {
            replyPort.postMessage(createFinishChunk());
          } finally {
            replyPort.close();
          }
        }
        if (isActive) {
          activeStreams.delete(streamId);
        }
      }
    },
  );
};
