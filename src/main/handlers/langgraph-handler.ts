import { ipcMain } from 'electron';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { SQLiteCheckpointSaver } from '@/main/services/core/checkpoints/SQLiteCheckpointSaver';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '@/main/services/domain/chat/workflow-graph';
import type { AgentManager } from '@/main/services/agent/agent-manager';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import { Kysely } from 'kysely';
import { Database } from '../services/core/database';
import { BrowserWindow } from 'electron/main';

export type LangGraphHandlerDeps = {
  window: BrowserWindow;
  agentManager: AgentManager;
  loggerService: LoggerService;
  db: Kysely<Database>;
};

/**
 * Converts LangChain messages to plain objects compatible with AI SDK
 */
const convertToPlainMessage = (msg: any): { role: string; content: string } => {
  // Handle LangChain message objects
  if (msg?.lc_serializable || msg?.lc_kwargs) {
    return {
      role: msg.lc_kwargs?.role || 'assistant',
      content: typeof msg.lc_kwargs?.content === 'string'
        ? msg.lc_kwargs.content
        : JSON.stringify(msg.lc_kwargs?.content || ''),
    };
  }

  // Handle plain messages
  return {
    role: msg.role || 'assistant',
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || ''),
  };
};

export const setupLangGraphHandler = ({ window, agentManager, loggerService, db }: LangGraphHandlerDeps) => {
  const handlerLogger = loggerService.child({ handler: 'langgraph-adapter' });
  const checkpointSaver = new SQLiteCheckpointSaver(db);
  const workflowGraph = createWorkflowGraph({ agentManager, loggerService, checkpointer: checkpointSaver });

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
      handlerLogger.info('chat:start-stream', { conversationId: safeConversationId, messageCount: messages.length });

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
            // Convert LangChain messages to plain objects compatible with AI SDK
            if (value.messages && Array.isArray(value.messages)) {
              for (const message of value.messages) {
                const plainMessage = convertToPlainMessage(message);
                replyPort.postMessage(plainMessage);
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
