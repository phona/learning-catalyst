import { ipcMain } from 'electron';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { SQLiteCheckpointSaver } from '@/main/services/core/checkpoints/SQLiteCheckpointSaver';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '@/main/services/domain/workflow';
import type { AgentManager } from '@/main/services/agent/agent-manager';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import type { KnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import type { PracticeService } from '@/main/services/domain/practice/practice-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import { Kysely } from 'kysely';
import { Database } from '../services/core/database';
import { BrowserWindow } from 'electron/main';
import {
  toAssistantUIStream,
  createFinishChunk,
  createErrorChunk
} from '@/main/services/domain/workflow/utils/assistant-ui-stream';

export type LangGraphHandlerDeps = {
  window: BrowserWindow;
  agentManager: AgentManager;
  loggerService: LoggerService;
  db: Kysely<Database>;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};

export const setupLangGraphHandler = ({
  window,
  agentManager,
  loggerService,
  db,
  configService,
  providerFactory,
  knowledgeService,
  practiceService,
  learningService
}: LangGraphHandlerDeps) => {
  const handlerLogger = loggerService.child({ handler: 'langgraph-adapter' });
  const checkpointSaver = new SQLiteCheckpointSaver(db);
  const workflowGraph = createWorkflowGraph({
    agentManager,
    loggerService,
    checkpointer: checkpointSaver,
    configService,
    providerFactory,
    knowledgeService,
    practiceService,
    learningService
  });

  // Keep old IPC streaming API as fallback (to be removed later)
  ipcMain.on(
    'chat:start-stream',
    async (
      event,
      {
        streamId,
        messages = [],
        conversationId,
      }: {
        streamId: string;
        messages: Array<{ role: string; content?: string; parts?: Array<{ type: string; text: string }>; id?: string }>;
        conversationId?: string;
      },
    ) => {
      const [replyPort] = event.ports;

      const safeConversationId = conversationId || `thread_${Date.now()}`;
      handlerLogger.info('chat:start-stream', {
        conversationId: safeConversationId,
        messageCount: messages.length,
      });

      try {
        const lcMessages = messages.map((m) => {
          const content = Array.isArray(m.parts)
            ? m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')
            : (m.content ?? '');
          return m.role === 'user' ? new HumanMessage(content) : new AIMessage(content);
        });

        const stream = await workflowGraph.stream(
          { messages: lcMessages },
          {
            configurable: { thread_id: safeConversationId },
            streamMode: 'updates',
          },
        );

        // Convert workflow stream directly to assistant-ui AI SDK Protocol chunks
        for await (const chunk of toAssistantUIStream(stream)) {
          handlerLogger.info('Adapter chunk:', chunk);
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

export default setupLangGraphHandler;
