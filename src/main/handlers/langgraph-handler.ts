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
import type { NormalizedMessage } from '@/main/services/domain/workflow/utils/normalization';
import { convertToPlainMessage } from '@/main/services/domain/workflow/utils/normalization';

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
            stream_mode: 'updates',
          },
        );

        for await (const chunk of stream) {
          console.log('Adapter chunk:', JSON.stringify(chunk));

          // Check if chunk contains interrupt event
          if (isInterruptEvent(chunk)) {
            const interruptData = extractInterrupt(chunk);
            handlerLogger.info('Workflow interrupted, sending interrupt to UI', { interruptData });

            // Send interrupt event to UI
            replyPort.postMessage({
              type: 'interrupt',
              data: interruptData,
            });

            // Close the port - workflow is paused at checkpoint
            // UI will call start-stream again with same conversationId to resume
            replyPort.close();
            return; // Exit handler, resume will start a new stream
          }

          // Normal message streaming
          for (const [key, value] of Object.entries(chunk)) {
            const nodeName = key;

            // Type guard for value containing messages
            if (
              typeof value === 'object' &&
              value !== null &&
              'messages' in value &&
              Array.isArray(value.messages)
            ) {
              // Convert messages using normalization utilities
              // This replaces the old convertToPlainMessage logic
              const normalizedMessages: NormalizedMessage[] = value.messages.map((message: unknown) =>
                convertToPlainMessage(message, nodeName)
              );

              // Send each normalized message to the UI
              for (const normalizedMessage of normalizedMessages) {
                replyPort.postMessage(normalizedMessage);
              }
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        handlerLogger.error('chat:start-stream error', { message });
      } finally {
        replyPort.close();
      }
    },
  );
};

export default setupLangGraphHandler;
