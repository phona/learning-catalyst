import { ipcMain } from 'electron';
import { ChatService } from '../services/domain/chat';
import { LoggerService } from '../services/core/logger/logger-service';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import {
  toAssistantUIStream,
  createFinishChunk,
  createErrorChunk,
} from '@/main/services/domain/workflow/utils/assistant-ui-stream';
import { AIMessage, HumanMessage } from 'langchain';
import { createWorkflowGraph } from '../services/domain/workflow';
import { ConfigService } from '../services/core/config/config-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { LearningService } from '../services/domain/learning/learning-service';
import { PracticeService } from '../services/domain/practice/practice-service';
import { AgentManager } from '../services/agent/agent-manager';
import { ProviderFactory } from '../services/agent/provider-factory';

type ChatDependencies = {
  chatService: ChatService;
  loggerService: LoggerService;
  checkpointSaver: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
  agentManager: AgentManager;
};

export const setupChatHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: ChatDependencies,
): void => {
  const logger = services.loggerService.child({ handler: 'chat' });
  const workflowGraph = createWorkflowGraph({
    agentManager: services.agentManager,
    loggerService: logger,
    checkpointer: services.checkpointSaver,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
    learningService: services.learningService,
  });

  ipcMainInstance.handle('chat:generate-title', async (_event, messageText: string) => {
    const title = await services.chatService.generateTitle(messageText);
    return { title };
  });

  ipcMainInstance.handle('chat:get-messages', async (_event, sessionId: string) => {
    const messages = await services.chatService.getMessages(sessionId);
    logger.info('Get messages requested', { sessionId, count: messages.length });
    // Return format expected by useThreadHistoryAdapter: { sessions: ChatHistoryMessage[] }
    return { sessions: messages, hasMore: false, total: messages.length };
  });

  // Keep old IPC streaming API as fallback (to be removed later)
  ipcMainInstance.on(
    'chat:start-stream',
    async (
      event,
      {
        messages = [],
        conversationId,
      }: {
        messages: Array<{
          role: string;
          content?: string;
          parts?: Array<{ type: string; text: string }>;
          id?: string;
        }>;
        conversationId?: string;
      },
    ) => {
      const [replyPort] = event.ports;

      const safeConversationId = conversationId || `thread_${Date.now()}`;
      logger.info('chat:start-stream', {
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
            streamMode: ['messages', 'custom'],
          },
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
