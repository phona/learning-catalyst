/**
 * Chat Store - Frontend state management for chat functionality
 * Shared single store instance exposes session metadata, messages, and helper actions.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MessageDisplay as UIMessageDisplay, AgentDisplay } from '../../types';
import type {
  ConversationMessage,
  Session,
  SessionContext,
  SessionMetadata,
  SessionStatistics,
  MemorySession,
} from '@/shared/types/session';
import type { SessionService } from '../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';
import type { MessageDisplay as ChatAPIMessageDisplay } from '@/shared/types/electron-api/chat-api';

type SendMessageResponse =
  | ChatAPIMessageDisplay
  | { assistantMessage?: Partial<ChatAPIMessageDisplay> };

type SessionDetailFromAPI = Partial<Session> & {
  id: string;
  title?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  metadata?: Partial<SessionMetadata>;
  context?: Partial<SessionContext>;
  statistics?: Partial<SessionStatistics>;
  checkpoints?: Session['checkpoints'];
  messages?: ConversationMessage[];
};

// Factory dependencies interface
export interface ChatStoreDependencies {
  sessionService: SessionService;
  electronAPI: {
    chat: ChatAPI;
    sessions: SessionsAPI;
  };
}

// Session helpers
const DEFAULT_SESSION_METADATA: SessionMetadata = {
  title: '',
  description: '',
  tags: [],
  category: undefined,
  difficulty: 'beginner',
  learningObjectives: [],
  topicsCovered: [],
  userId: undefined,
  archived: false,
  pinned: false,
  color: undefined,
  primaryAgentId: undefined,
  agentMode: undefined,
};

const DEFAULT_SESSION_STATISTICS: SessionStatistics = {
  totalMessages: 0,
  userMessages: 0,
  assistantMessages: 0,
  totalTokensUsed: 0,
  totalThinkingTokens: 0,
  sessionDuration: 0,
  averageResponseTime: 0,
  conceptsLearned: 0,
  checkpointsCreated: 0,
  productivityScore: 0,
  engagementScore: 0,
};

const DEFAULT_PROVIDER_NAME = 'default-provider';
const DEFAULT_MODEL_NAME = 'default-model';

const ensureMetadata = (partial?: Partial<SessionMetadata>, title?: string): SessionMetadata => ({
  ...DEFAULT_SESSION_METADATA,
  ...partial,
  title: partial?.title ?? title ?? DEFAULT_SESSION_METADATA.title,
});

const ensureStatistics = (partial?: Partial<SessionStatistics>): SessionStatistics => ({
  ...DEFAULT_SESSION_STATISTICS,
  ...partial,
});

const buildSessionRecord = (partial: Partial<Session>): Session => ({
  id: partial.id ?? `session_${Date.now()}`,
  title: partial.title ?? 'Untitled Session',
  createdAt: partial.createdAt ?? new Date(),
  updatedAt: partial.updatedAt ?? new Date(),
  messages: partial.messages ?? [],
  metadata: ensureMetadata(partial.metadata, partial.title),
  context: partial.context ?? ({} as SessionContext),
  checkpoints: partial.checkpoints ?? [],
  statistics: ensureStatistics(partial.statistics),
  agents: partial.agents ?? [],
  agent_states: partial.agent_states ?? [],
});

const normalizeConversationMessages = (messages: ConversationMessage[] = []): UIMessageDisplay[] =>
  messages.map((message) => {
    const tokens =
      typeof message.tokensUsed === 'number'
        ? {
          prompt_tokens: message.tokensUsed,
          completion_tokens: 0,
          total_tokens: message.tokensUsed,
        }
        : undefined;

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp ?? new Date(),
      status: message.status ?? 'delivered',
      provider: message.provider,
      thinking_content: message.thinkingContent,
      showThinking: message.showThinking ?? false,
      tool_calls: message.toolCalls,
      tokens_used: tokens,
      agentInfo:
        message.agentId || message.agentType
          ? { type: message.agentType ?? 'assistant', avatar: '', color: '#2563eb' }
          : undefined,
    };
  });

const chatDisplayToConversationMessage = (display: ChatAPIMessageDisplay): ConversationMessage => {
  const mapStatus = (status: ChatAPIMessageDisplay['status']): ConversationMessage['status'] => {
    switch (status) {
    case 'sending':
      return 'sending';
    case 'processing':
      return 'typing';
    case 'error':
      return 'error';
    case 'sent':
    case 'completed':
    default:
      return 'delivered';
    }
  };

  return {
    id: display.id,
    role: display.role,
    content: display.content,
    timestamp: new Date(display.timestamp),
    provider: display.conversationId,
    status: mapStatus(display.status),
    showThinking: display.status === 'processing',
  };
};

const convertToConversationMessage = (display: UIMessageDisplay): ConversationMessage => ({
  id: display.id,
  role: display.role,
  content: display.content,
  timestamp:
    display.timestamp instanceof Date
      ? display.timestamp
      : new Date(display.timestamp ?? Date.now()),
  thinkingContent: display.thinking_content,
  provider: display.provider,
  status: display.status,
  showThinking: display.showThinking,
  tokensUsed:
    display.tokens_used?.total_tokens ??
    display.tokens_used?.completion_tokens ??
    display.tokens_used?.prompt_tokens,
  agentType: display.agentInfo?.type,
});

// Chat store state interface
export interface ChatState {
  currentSessionId: string | null;
  currentSession: Session | null;
  messages: UIMessageDisplay[];
  currentAgent: AgentDisplay | null;
  selectedProvider?: string;
  selectedModel?: string;
  isTyping: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  autoScroll: boolean;
  fontSize: 'small' | 'medium' | 'large';
  showThinking: boolean;
  thinkingContent: string;
  streamingMessageId: string | null;
  streamingContent: string;
  setCurrentSession: (sessionOrId: Partial<Session> | string) => Promise<void>;
  addMessage: (message: UIMessageDisplay) => void;
  updateMessage: (messageId: string, updates: Partial<UIMessageDisplay>) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  setTyping: (isTyping: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentAgent: (agent: AgentDisplay | null) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void;
  setShowThinking: (showThinking: boolean) => void;
  setThinkingContent: (thinkingContent: string) => void;
  startStreamingMessage: (messageId: string) => void;
  appendStreamingContent: (content: string) => void;
  finishStreamingMessage: (finalContent?: string) => void;
  resetChatState: () => void;
  createNewSession: () => Promise<string>;
  saveCurrentSession: () => Promise<{ success: boolean }>;
  sendMessage: (content: string) => Promise<void>;
  updateCurrentSessionTitle: (title: string) => Promise<void>;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
}

const initialState = {
  currentSessionId: null,
  currentSession: null,
  messages: [],
  currentAgent: null,
  selectedProvider: DEFAULT_PROVIDER_NAME,
  selectedModel: DEFAULT_MODEL_NAME,
  isTyping: false,
  isLoading: false,
  isStreaming: false,
  error: null,
  autoScroll: true,
  fontSize: 'medium' as const,
  showThinking: false,
  thinkingContent: '',
  streamingMessageId: null,
  streamingContent: '',
};

export function createChatStore(dependencies: ChatStoreDependencies) {
  const { sessionService, electronAPI } = dependencies;

  const loadSessionById = async (sessionId: string): Promise<Session | null> => {
    const sessionResponse = await electronAPI.sessions.get(sessionId);
    if (!sessionResponse.success || !sessionResponse.data) {
      return null;
    }

    const historyResponse = await electronAPI.chat.getConversationHistory(sessionId);
    const historyMessages =
      historyResponse.success && historyResponse.data?.messages
        ? historyResponse.data.messages.map(chatDisplayToConversationMessage)
        : [];

    const sessionData = sessionResponse.data as SessionDetailFromAPI;
    return buildSessionRecord({
      ...sessionData,
      messages: historyMessages,
      metadata: sessionData.metadata,
      createdAt: sessionData.createdAt ? new Date(sessionData.createdAt) : new Date(),
      updatedAt: sessionData.updatedAt ? new Date(sessionData.updatedAt) : new Date(),
    });
  };

  return create<ChatState>()(
    subscribeWithSelector((set, get) => {
      const setSessionMessages = (session: Session, preserveMessages = false) => ({
        currentSessionId: session.id,
        currentSession: session,
        messages: preserveMessages
          ? get().messages
          : normalizeConversationMessages(session.messages),
        error: null,
      });

      const setCurrentSessionAction = async (sessionOrId: Partial<Session> | string) => {
        const provisionalSession =
          typeof sessionOrId === 'string'
            ? buildSessionRecord({ id: sessionOrId })
            : buildSessionRecord(sessionOrId);

        set({
          currentSessionId: provisionalSession.id,
          currentSession: provisionalSession,
          messages: [],
        });

        try {
          let session: Session | null = provisionalSession;

          if (typeof sessionOrId === 'string') {
            const loaded = await loadSessionById(sessionOrId);
            if (loaded) {
              session = loaded;
            }
          } else {
            session = provisionalSession;
          }

          if (!session) {
            throw new Error('Unable to load session');
          }

          const preserveMessages = get().messages.length > 0;
          set(setSessionMessages(session, preserveMessages));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load session';
          set({ error: message });
          throw error;
        }
      };

      const updateSessionTitle = async (title: string) => {
        const { currentSessionId, currentSession } = get();
        if (!currentSessionId || !currentSession) {
          throw new Error('No active session to update');
        }

        const response = await electronAPI.sessions.update(currentSessionId, { title });
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to update session title');
        }

        set({
          currentSession: {
            ...currentSession,
            title,
            metadata: {
              ...currentSession.metadata,
              title,
            },
          },
        });
      };

      return {
        ...initialState,

        setCurrentSession: setCurrentSessionAction,

        addMessage: (message) => {
          const normalized = {
            ...message,
            showThinking: message.showThinking ?? false,
          };

          const previousMessages = get().messages;
          const hasAssistantBefore = previousMessages.some((msg) => msg.role === 'assistant');
          const lastUserMessage = [...previousMessages]
            .reverse()
            .find((msg) => msg.role === 'user');

          set((state) => ({
            messages: [...state.messages, normalized],
          }));

          if (message.role === 'assistant' && !hasAssistantBefore && lastUserMessage?.content) {
            const provider = get().selectedProvider ?? DEFAULT_PROVIDER_NAME;
            const model = get().selectedModel ?? DEFAULT_MODEL_NAME;

            sessionService
              .generateAITitle(lastUserMessage.content, provider, model)
              .catch((error) => {
                console.error('Failed to generate AI title', error);
              });
          }
        },

        updateMessage: (messageId, updates) =>
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg,
            ),
          })),

        removeMessage: (messageId) =>
          set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== messageId),
          })),

        clearMessages: () => set({ messages: [] }),

        setTyping: (isTyping) => set({ isTyping }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        setCurrentAgent: (agent) => set({ currentAgent: agent }),

        setAutoScroll: (autoScroll) => set({ autoScroll }),
        setFontSize: (fontSize) => set({ fontSize }),
        setShowThinking: (showThinking) => set({ showThinking }),
        setThinkingContent: (thinkingContent) => set({ thinkingContent }),
        setSelectedProvider: (provider) => set({ selectedProvider: provider }),
        setSelectedModel: (model) => set({ selectedModel: model }),

        startStreamingMessage: (messageId) =>
          set({
            streamingMessageId: messageId,
            streamingContent: '',
            isTyping: true,
          }),

        appendStreamingContent: (content) =>
          set((state) => ({
            streamingContent: state.streamingContent + content,
          })),

        finishStreamingMessage: (finalContent) => {
          const { streamingMessageId, streamingContent } = get();

          if (streamingMessageId) {
            const messageContent = finalContent || streamingContent;

            set({
              messages: get().messages.map((msg) =>
                msg.id === streamingMessageId
                  ? { ...msg, content: messageContent, status: 'delivered' }
                  : msg,
              ),
              streamingMessageId: null,
              streamingContent: '',
              isTyping: false,
            });
          }
        },

        resetChatState: () => set(initialState),

        createNewSession: async () => {
          try {
            const response = await electronAPI.sessions.create({
              title: 'Untitled Session',
            });

            const newSessionId = response.data?.sessionId;
            if (response.success && newSessionId) {
              await setCurrentSessionAction(newSessionId);
              return newSessionId;
            }

            throw new Error(response.error?.message || 'Failed to create session');
          } catch (error) {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substr(2, 9);
            const sessionId = `session_${timestamp}_${randomStr}`;
            await setCurrentSessionAction({
              id: sessionId,
              title: 'Untitled Session',
            });
            return sessionId;
          }
        },

        saveCurrentSession: async () => {
          const { currentSessionId, currentSession, messages } = get();
          if (!currentSessionId || !currentSession) {
            return { success: false };
          }

          try {
            const conversation = messages.map(convertToConversationMessage);
            const memorySession: MemorySession = {
              ...currentSession,
              id: currentSessionId,
            };

            await sessionService.saveSessionWithMessages(memorySession, conversation);
            return { success: true };
          } catch (error) {
            console.error('Failed to save session:', error);
            return { success: false };
          }
        },

        sendMessage: async (content) => {
          const { currentSessionId } = get();

          try {
            set({ isLoading: true, error: null });

            const userMessage: UIMessageDisplay = {
              id: `msg_${Date.now()}`,
              role: 'user',
              content,
              timestamp: new Date().toISOString(),
              status: 'delivered',
              showThinking: false,
            };

            set((state) => ({
              messages: [...state.messages, userMessage],
            }));

            let sessionId = currentSessionId;
            if (!sessionId) {
              const createResp = await electronAPI.sessions.create({ title: 'Untitled Session' });
              if (createResp.success && createResp.data?.sessionId) {
                sessionId = createResp.data.sessionId;
                await setCurrentSessionAction(sessionId);
              } else {
                throw new Error(createResp.error?.message || 'Failed to create session');
              }
            }

            const response = await electronAPI.chat.sendMessage({
              conversationId: sessionId,
              message: content,
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to send message');
            }

            const payload = response.data as SendMessageResponse;
            const assistantData =
              'assistantMessage' in payload && payload.assistantMessage
                ? payload.assistantMessage
                : (payload as ChatAPIMessageDisplay);

            const normalized: UIMessageDisplay = {
              id: assistantData?.id ?? `msg_${Date.now()}_assistant`,
              role: (assistantData?.role as UIMessageDisplay['role']) ?? 'assistant',
              content: assistantData?.content ?? 'Response from AI',
              timestamp: assistantData?.timestamp ?? new Date().toISOString(),
              status: (assistantData?.status as UIMessageDisplay['status']) ?? 'delivered',
              showThinking: false,
            };

            set((state) => ({
              messages: [...state.messages, normalized],
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            set({ error: errorMessage });
            throw new Error(errorMessage);
          } finally {
            set({ isLoading: false });
          }
        },

        updateCurrentSessionTitle: updateSessionTitle,
      };
    }),
  );
}
