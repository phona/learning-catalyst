import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { ILogger } from '../../types';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { AgentManager } from '@/main/services/agent/agent-manager';
import type { AgentType } from '@/main/services/agent/types';
import type { ChatStatus, ErrorCategory } from '@/shared/types/electron-api/chat-api';
import type { LearningSessionRow, MessageRow } from '@/shared/types/database';
import type { Database as CoreDatabase } from '@/main/services/core/database/kysely-schema';
import type { AiService } from '@/main/services/ai/ai-service';
import type { DomainAgent } from '@/main/services/agent/domain-agent';
import { ContextUpdateRequest } from '@/shared/types/practice';
import { createUserContextTracker, UserContextTrackerService } from '@/main/services/core/context';

interface MessageAttachment {
  id?: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface Conversation {
  id: string;
  title: string;
  agentType: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'closed' | 'paused';
  messages: Message[];
  metadata?: Record<string, unknown>;
}

interface AssistantReplyPayload {
  reply: string;
  reasoning?: string[];
  suggestions?: string[];
  confidence?: number;
}

type ConversationMetadata = {
  agentType?: string;
  topic?: string;
  status?: Conversation['status'];
  assistantTyping?: boolean;
} & Record<string, unknown>;

const safeParseJson = <T>(value?: string | null, fallback: T = {} as T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const serializeMetadata = (metadata?: ConversationMetadata): string =>
  JSON.stringify(metadata ?? {});

const normalizeAgentType = (value?: string): AgentType => {
  const supported: AgentType[] = ['learning', 'tutoring', 'assessment', 'practice'];
  return supported.includes(value as AgentType) ? (value as AgentType) : 'learning';
};

const classifyError = (error: unknown): { category: ErrorCategory; retryable: boolean; reason: string; suggestion?: string } => {
  const err = error as any;
  const message: string = err?.message ?? '';
  const status = err?.response?.status ?? err?.status;
  const code = err?.code ?? err?.error?.code;

  const lower = message.toLowerCase();
  if (status === 401 || lower.includes('api key') || code === 'invalid_api_key') {
    return { category: 'auth', retryable: false, reason: message || 'Authentication required', suggestion: 'Add or update your API key' };
  }
  if (status === 403 || lower.includes('quota') || code === 'insufficient_quota') {
    return { category: 'quota', retryable: false, reason: message || 'Quota exceeded', suggestion: 'Wait or switch provider/model' };
  }
  if (status === 429 || lower.includes('rate limit')) {
    return { category: 'rate_limit', retryable: true, reason: message || 'Rate limited', suggestion: 'Retry shortly or reduce load' };
  }
  if (code === 'ECONNABORTED' || lower.includes('timeout') || err?.name === 'AbortError') {
    return { category: 'timeout', retryable: true, reason: message || 'Timed out', suggestion: 'Try again or simplify the request' };
  }
  if (code === 'ENOTFOUND' || code === 'ECONNRESET') {
    return { category: 'network', retryable: true, reason: message || 'Network error', suggestion: 'Check connection or proxy settings' };
  }
  if (lower.includes('tool') || lower.includes('function call')) {
    return { category: 'tool_fail', retryable: false, reason: message || 'Tool execution failed', suggestion: 'Retry without tools or adjust input' };
  }
  return { category: 'unknown', retryable: false, reason: message || 'Unexpected error' };
};

export const createChatService = ({
  db,
  loggerService,
  aiService,
  domainAgent,
  agentManager,
}: {
  db: Kysely<CoreDatabase>;
  loggerService: LoggerService;
  aiService: AiService;
  domainAgent: DomainAgent;
  agentManager: AgentManager;
}) => {
  const serviceLogger = loggerService.child({ service: 'chat' });
  const chatModelPreset = aiService.getModelPreset('chat.reply');
  const contextTrackers = new Map<string, UserContextTrackerService>();
  const trackerLogger = serviceLogger.child({ component: 'user-context-tracker' });
  const trackerDependencies = { logger: trackerLogger };
  const canceledStreams = new Set<string>();

  const extractConceptsFromContent = (content: string): string[] => {
    if (!content) return [];
    const tokens = content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 3);
    return Array.from(new Set(tokens)).slice(0, 5);
  };

  const getTrackerForConversation = (conversationId: string, userId?: string) => {
    let tracker = contextTrackers.get(conversationId);
    if (!tracker) {
      tracker = createUserContextTracker(
        userId ?? 'anonymous-user',
        conversationId,
        trackerDependencies,
      );
      contextTrackers.set(conversationId, tracker);
    }
    return tracker;
  };

  const updateContextTracker = async (params: {
    conversationId: string;
    messageType: ContextUpdateRequest['messageType'];
    content: string;
    userId?: string;
  }) => {
    try {
      const tracker = getTrackerForConversation(params.conversationId, params.userId);
      await tracker.updateContext({
        sessionId: params.conversationId,
        messageType: params.messageType,
        content: params.content,
        timestamp: Date.now(),
        concepts: extractConceptsFromContent(params.content),
        confidence: 0.5,
      });
    } catch (error) {
      trackerLogger.warn('Failed to update user context tracker', error as Error);
    }
  };

  const disposeTracker = (conversationId: string) => {
    const tracker = contextTrackers.get(conversationId);
    if (tracker) {
      tracker.dispose();
      contextTrackers.delete(conversationId);
    }
  };

  const loadMessages = async (sessionId: string): Promise<Message[]> => {
    const rows = await db
      .selectFrom('messages')
      .select([
        'id',
        'session_id',
        'role',
        'content',
        'timestamp',
        'message_order',
        'provider',
        'model',
        'tokens_used',
        'thinking_content',
      ])
      .where('session_id', '=', sessionId)
      .orderBy('message_order')
      .execute();

    return rows.map((row) => ({
      id: row.id,
      conversationId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: {
        provider: row.provider,
        model: row.model,
        thinking: row.thinking_content,
        tokens: safeParseJson<Record<string, unknown>>(row.tokens_used, {}),
      },
    }));
  };

  const buildConversation = async (
    session: LearningSessionRow,
    includeMessages = true,
  ): Promise<Conversation> => {
    const metadata = safeParseJson<ConversationMetadata>(session.metadata, {
      agentType: 'learning',
      topic: session.title,
      status: 'active',
    });

    return {
      id: session.id,
      title: session.title,
      agentType: metadata.agentType ?? 'learning',
      topic: metadata.topic ?? session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      status: (metadata.status as Conversation['status']) ?? 'active',
      messages: includeMessages ? await loadMessages(session.id) : [],
      metadata,
    };
  };

  const createSessionRow = async (params: {
    id?: string;
    title: string;
    agentType: string;
    topic?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LearningSessionRow> => {
    const now = new Date().toISOString();
    const id = params.id ?? randomUUID();
    const metadata: ConversationMetadata = {
      agentType: params.agentType,
      topic: params.topic ?? params.title,
      status: 'active',
      sessionId: params.sessionId,
      ...params.metadata,
    };

    const row: LearningSessionRow = {
      id,
      title: params.title,
      description: '',
      start_time: now,
      end_time: undefined,
      duration_seconds: 0,
      total_messages: 0,
      concepts_studied: 0,
      difficulty_level: 2,
      session_type: 'general',
      metadata: serializeMetadata(metadata),
      created_at: now,
      updated_at: now,
    };

    await db.insertInto('learning_sessions').values(row).execute();
    return row;
  };

  const loadConversationIfExists = async (conversationId: string): Promise<Conversation | null> => {
    const session = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('id', '=', conversationId)
      .executeTakeFirst();
    return session ? buildConversation(session, true) : null;
  };

  const ensureConversation = async (conversationId: string): Promise<Conversation> => {
    const existing = await loadConversationIfExists(conversationId);
    if (existing) {
      return existing;
    }
    const session = await createSessionRow({
      id: conversationId,
      title: `Conversation ${conversationId}`,
      agentType: 'learning',
    });
    return buildConversation(session, true);
  };

  const persistConversation = async (conversation: Conversation): Promise<void> => {
    await db
      .updateTable('learning_sessions')
      .set({
        title: conversation.title,
        updated_at: conversation.updatedAt,
        total_messages: conversation.messages.length,
        metadata: serializeMetadata({
          ...conversation.metadata,
          agentType: conversation.agentType,
          topic: conversation.topic,
          status: conversation.status,
        }),
      })
      .where('id', '=', conversation.id)
      .execute();
  };

  const getNextMessageOrder = async (conversationId: string): Promise<number> => {
    const result = await db
      .selectFrom('messages')
      .select((eb) => eb.fn.max('message_order').as('maxOrder'))
      .where('session_id', '=', conversationId)
      .executeTakeFirst();
    return (result?.maxOrder ?? 0) + 1;
  };

  const saveMessage = async (
    message: Message,
    options?: {
      provider?: string;
      model?: string;
      tokens?: Record<string, unknown>;
      thinkingContent?: string;
    },
  ): Promise<void> => {
    const order = await getNextMessageOrder(message.conversationId);
    await db
      .insertInto('messages')
      .values({
        id: message.id,
        session_id: message.conversationId,
        role: message.role,
        content: message.content,
        thinking_content: options?.thinkingContent,
        provider: options?.provider,
        model: options?.model,
        tokens_used: JSON.stringify(options?.tokens ?? {}),
        timestamp: message.timestamp,
        message_order: order,
        created_at: message.timestamp,
      } satisfies MessageRow)
      .execute();
  };

  const buildAssistantMessage = (
    conversation: Conversation,
    reply: AssistantReplyPayload,
  ): Message => ({
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    conversationId: conversation.id,
    role: 'assistant',
    content: reply.reply,
    timestamp: new Date().toISOString(),
    metadata: {
      reasoning: reply.reasoning ?? [],
      suggestions: reply.suggestions ?? [],
      confidence: reply.confidence ?? 0.75,
      agentType: conversation.agentType,
    },
  });

  const generateAssistantReply = async (
    conversation: Conversation,
    userMessage: Message,
  ): Promise<Message> => {
    const agentResponse = await agentManager.runAgent({
      agentType: normalizeAgentType(conversation.agentType),
      conversationId: conversation.id,
      topic: conversation.topic,
      userId: userMessage.metadata?.userId as string | undefined,
      messages: conversation.messages
        .filter(
          (message): message is Message & { role: 'user' | 'assistant' } =>
            message.role === 'user' || message.role === 'assistant',
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    });

    return buildAssistantMessage(conversation, {
      reply: agentResponse.content,
      reasoning: [],
      suggestions: [],
      confidence: 0.75,
    });
  };

  return {
    createConversation: async (params: {
      title: string;
      agentType: string;
      topic?: string;
      sessionId?: string;
      preferences?: Record<string, unknown>;
    }): Promise<Conversation> => {
      serviceLogger.info('Creating new conversation', { params });
      const session = await createSessionRow({
        title: params.title,
        agentType: params.agentType,
        topic: params.topic,
        sessionId: params.sessionId,
        metadata: params.preferences,
      });
      serviceLogger.info('Conversation created successfully', { conversationId: session.id });
      return buildConversation(session, true);
    },

    sendMessage: async (params: {
      conversationId: string;
      role: 'user' | 'assistant';
      content: string;
      attachments?: MessageAttachment[];
      metadata?: Record<string, unknown>;
    }): Promise<{ userMessage: Message; assistantMessage?: Message }> => {
      const conversation = await ensureConversation(params.conversationId);
      serviceLogger.info('Sending message', { conversationId: params.conversationId });

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        conversationId: params.conversationId,
        role: params.role,
        content: params.content,
        timestamp: new Date().toISOString(),
        metadata: {
          ...params.metadata,
          attachments: params.attachments || [],
        },
      };

      conversation.messages.push(message);
      conversation.updatedAt = message.timestamp;
      await saveMessage(message);
      await persistConversation(conversation);

      await updateContextTracker({
        conversationId: params.conversationId,
        messageType: params.role === 'assistant' ? 'assistant_message' : 'user_message',
        content: params.content,
        userId: params.metadata?.userId as string | undefined,
      });

      let assistantMessage: Message | undefined;
      if (params.role === 'user') {
        assistantMessage = await generateAssistantReply(conversation, message);
        conversation.messages.push(assistantMessage);
        conversation.updatedAt = assistantMessage.timestamp;
        await saveMessage(assistantMessage);
        await persistConversation(conversation);
        await updateContextTracker({
          conversationId: params.conversationId,
          messageType: 'assistant_message',
          content: assistantMessage.content,
          userId: params.metadata?.userId as string | undefined,
        });
      }

      return { userMessage: message, assistantMessage };
    },

    getConversation: async (conversationId: string): Promise<Conversation | null> => {
      return loadConversationIfExists(conversationId);
    },

    listConversations: async (): Promise<Conversation[]> => {
      const sessions = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .orderBy('updated_at', 'desc')
        .limit(50)
        .execute();
      const conversations = await Promise.all(
        sessions.map((session) => buildConversation(session, false)),
      );
      return conversations;
    },

    deleteConversation: async (conversationId: string): Promise<boolean> => {
      serviceLogger.info('Deleting conversation', { conversationId });
      await db.deleteFrom('messages').where('session_id', '=', conversationId).execute();
      const result = await db
        .deleteFrom('learning_sessions')
        .where('id', '=', conversationId)
        .executeTakeFirst();
      disposeTracker(conversationId);
      return Boolean(result?.numDeletedRows ?? 0);
    },

    getTypingIndicator: async (conversationId: string) => {
      const conversation = await loadConversationIfExists(conversationId);
      return {
        conversationId,
        isTyping: Boolean(conversation?.metadata?.assistantTyping),
        agentType: conversation?.agentType ?? 'learning',
        topic: conversation?.topic ?? 'General',
      };
    },

    pauseConversation: async (conversationId: string) => {
      const conversation = await ensureConversation(conversationId);
      conversation.status = 'paused';
      conversation.metadata = {
        ...conversation.metadata,
        pausedAt: new Date().toISOString(),
      };
      conversation.updatedAt = new Date().toISOString();
      await persistConversation(conversation);
    },

    resumeConversation: async (conversationId: string) => {
      const conversation = await ensureConversation(conversationId);
      conversation.status = 'active';
      conversation.metadata = {
        ...conversation.metadata,
        resumedAt: new Date().toISOString(),
      };
      conversation.updatedAt = new Date().toISOString();
      await persistConversation(conversation);
    },

    endConversation: async (conversationId: string) => {
      const conversation = await ensureConversation(conversationId);
      conversation.status = 'closed';
      conversation.metadata = {
        ...conversation.metadata,
        endedAt: new Date().toISOString(),
      };
      conversation.updatedAt = new Date().toISOString();
      await persistConversation(conversation);
      disposeTracker(conversationId);
    },

    streamAssistantResponse: async (params: {
      conversationId: string;
      content: string;
      attachments?: MessageAttachment[];
      metadata?: Record<string, unknown>;
      onStatus?: (status: ChatStatus) => void;
    }): Promise<{ userMessage: Message; stream: AsyncGenerator<string> }> => {
      serviceLogger.info('streamAssistantResponse invoked', { conversationId: params.conversationId });
      const conversation = await ensureConversation(params.conversationId);

      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        conversationId: params.conversationId,
        role: 'user',
        content: params.content,
        timestamp: new Date().toISOString(),
        metadata: {
          ...params.metadata,
          attachments: params.attachments || [],
        },
      };

      conversation.messages.push(userMessage);
      conversation.updatedAt = userMessage.timestamp;
      conversation.metadata = { ...conversation.metadata, assistantTyping: true };
      await saveMessage(userMessage);
      await persistConversation(conversation);
      serviceLogger.info('Streaming start', { conversationId: params.conversationId });
      await updateContextTracker({
        conversationId: params.conversationId,
        messageType: 'user_message',
        content: userMessage.content,
        userId: params.metadata?.userId as string | undefined,
      });

      const history = conversation.messages
        .slice(-10)
        .map((message) => `[${message.role.toUpperCase()}] ${message.content}`)
        .join('\n');

      serviceLogger.info('Streaming history', { history });
      const input = `Conversation Topic: ${conversation.topic}
Agent Type: ${conversation.agentType}
History:
${history}

Respond to the latest user message in a helpful, encouraging tone.`;

      const stream = async function* () {
        let aggregated = '';
        let canceled = false;
        const streamStart = Date.now();
        const emitStatus = (status: ChatStatus) => {
          try {
            serviceLogger.debug('Emitting chat status', {
              conversationId: params.conversationId,
              status,
              elapsedMs: Date.now() - streamStart,
            });
            params.onStatus?.(status);
          } catch (emitError) {
            serviceLogger.debug('Failed to emit status', { error: emitError });
          }
        };

        try {
          serviceLogger.info('Agent run start', { conversationId: conversation.id });
          if (canceledStreams.has(conversation.id)) {
            canceled = true;
            serviceLogger.warn('Stream canceled before agent run', {
              conversationId: conversation.id,
              elapsedMs: Date.now() - streamStart,
            });
            throw new Error('Stream canceled');
          }
          const agentResponse = await agentManager.runAgent({
            agentType: normalizeAgentType(conversation.agentType),
            conversationId: conversation.id,
            topic: conversation.topic,
            userId: params.metadata?.userId as string | undefined,
            messages: [{ role: 'user', content: input }],
          });
          serviceLogger.info('Agent run complete', { conversationId: conversation.id, contentLen: agentResponse?.content?.length ?? 0 });

          // Convert the response to a stream
          const content = agentResponse.content;
          if (content) {
            const chunks = content.match(/.{1,60}/g) ?? [content];
            for (const chunk of chunks) {
              if (canceledStreams.has(conversation.id)) {
                canceled = true;
                serviceLogger.warn('Stream canceled during chunking', {
                  conversationId: conversation.id,
                  aggregatedLen: aggregated.length,
                  elapsedMs: Date.now() - streamStart,
                });
                break;
              }
              aggregated += chunk;
              yield chunk;
              serviceLogger.debug('Stream chunk', {
                conversationId: conversation.id,
                len: chunk.length,
                aggregatedLen: aggregated.length,
                elapsedMs: Date.now() - streamStart,
              });
            }
          }
        } catch (error) {
          const info = classifyError(error);
          const rawJson = (() => {
            if (typeof error === 'string') return error;
            if (error instanceof Error) return error.message;
            try {
              return JSON.stringify(error);
            } catch {
              return String(error ?? info.reason ?? 'Unknown error');
            }
          })();
          emitStatus({ type: 'fail', category: info.category, suggestion: rawJson });
          serviceLogger.error('Streaming assistant reply failed', {
            conversationId: conversation.id,
            error,
            totalElapsedMs: Date.now() - streamStart,
          });
          throw error;
        } finally {
          const assistantMessage = buildAssistantMessage(conversation, {
            reply: aggregated,
            reasoning: [],
            suggestions: [],
            confidence: 0.75,
          });
          if (aggregated) {
            conversation.messages.push(assistantMessage);
            conversation.updatedAt = assistantMessage.timestamp;
          }
          conversation.metadata = {
            ...conversation.metadata,
            assistantTyping: false,
          };
          if (aggregated) {
            await saveMessage(assistantMessage);
            await updateContextTracker({
              conversationId: params.conversationId,
              messageType: 'assistant_message',
              content: assistantMessage.content,
              userId: params.metadata?.userId as string | undefined,
            });
          }
          await persistConversation(conversation);
          if (canceled) {
            canceledStreams.delete(conversation.id);
            serviceLogger.info('Stream canceled', { conversationId: conversation.id, finalLen: aggregated.length });
          } else {
            serviceLogger.info('Stream finished', { conversationId: conversation.id, finalLen: aggregated.length });
          }
        }
      };

      return { userMessage, stream: stream() };
    },

    cancelStream: (conversationId: string) => {
      serviceLogger.info('Cancel requested for conversation stream', { conversationId });
      canceledStreams.add(conversationId);
    },
  };
};

export type ChatService = ReturnType<typeof createChatService>;
