/**
 * Chat Store - Frontend state management for chat functionality
 * Shared single store instance exposes session metadata, messages, and helper actions.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MessageDisplay as UIMessageDisplay, AgentDisplay, ToolCallDisplay } from '../../types';
import type { StreamChunk } from '@/shared/types/ai';
import type {
  ConversationMessage,
  Session,
  SessionContext,
  SessionMetadata,
  SessionStatistics,
  MemorySession,
} from '@/shared/types/session';
import type { SessionService } from '../../services/session/session-service';
import type { ChatService } from '@/renderer/services/chat/chat-service';
import type { ChatAPI, SessionsAPI, PromptHistoryItem, PromptSearchRequest } from '@/shared/types/electron-api';
import type { MessageDisplay as ChatAPIMessageDisplay, PromptSearchResponse } from '@/shared/types/electron-api/chat-api';

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
  chatService: ChatService;
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
    console.log('[ChatStore] normalize message', {
      id: message.id,
      role: message.role,
      hasContent: typeof message.content === 'string',
    });
    const tokens =
      typeof message.tokensUsed === 'number'
        ? {
            prompt_tokens: message.tokensUsed,
            completion_tokens: 0,
            total_tokens: message.tokensUsed,
          }
        : undefined;

    const safeContent = typeof message.content === 'string' ? message.content : '';
    const safeTimestamp =
      message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp ?? Date.now());

    return {
      id: message.id,
      role: message.role,
      content: safeContent,
      timestamp: safeTimestamp,
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
  processingTrace: ProcessingTrace | null;
  history: HistoryEntry[];
  promptSearchResults: PromptHistoryItem[];
  addHistoryEntry: (entry: HistoryEntry) => void;
  getHistoryForSession: (sessionId: string | null) => HistoryEntry[];
  clearHistory: (sessionId?: string | null) => void;
  searchPrompts: (params: PromptSearchRequest) => Promise<PromptHistoryItem[]>;
  clearPromptSearchResults: () => void;
  setProcessingTraceCollapsed: (collapsed: boolean) => void;
  setCurrentSession: (
    sessionOrId: Partial<Session> | string,
    options?: { preserveMessages?: boolean },
  ) => Promise<void>;
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
  stopStreaming: () => void;
  resetChatState: () => void;
  createNewSession: () => Promise<string>;
  saveCurrentSession: () => Promise<{ success: boolean }>;
  sendMessage: (content: string) => Promise<void>;
  sendMessageStream: (content: string) => Promise<void>;
  updateCurrentSessionTitle: (title: string) => Promise<void>;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
}

type ProcessingEventKind = 'thought' | 'tool' | 'error' | 'status';

interface ProcessingEvent {
  id: string;
  kind: ProcessingEventKind;
  label: string;
  detail?: string;
  tool?: string;
  phase?: 'start' | 'end' | 'error';
  at: number;
  durationMs?: number;
}

interface ProcessingTrace {
  messageId: string;
  startedAt: number;
  completedAt?: number;
  events: ProcessingEvent[];
  toolCount: number;
  warningCount: number;
  errorCount: number;
  collapsed: boolean;
  activeToolStarts: Record<string, number>;
}

export interface HistoryEntry {
  id: string;
  text: string;
  sessionId: string | null;
  createdAt: number;
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
  processingTrace: null,
  history: [] as HistoryEntry[],
  promptSearchResults: [] as PromptHistoryItem[],
};

export function createChatStore(dependencies: ChatStoreDependencies) {
  const { sessionService, electronAPI } = dependencies;
  const devLog = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') console.debug(...args);
  };

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

      const setCurrentSessionAction = async (
        sessionOrId: Partial<Session> | string,
        options: { preserveMessages?: boolean } = {},
      ) => {
        const preserveMessages = options.preserveMessages ?? false;
        console.log('[ChatStore] setCurrentSessionAction start', {
          sessionOrId: typeof sessionOrId === 'string' ? sessionOrId : sessionOrId.id,
          preserveMessages,
        });
        const provisionalSession =
          typeof sessionOrId === 'string'
            ? buildSessionRecord({ id: sessionOrId })
            : buildSessionRecord(sessionOrId);

        set({
          currentSessionId: provisionalSession.id,
          currentSession: provisionalSession,
          messages: preserveMessages ? get().messages : [],
        });
        console.log('[ChatStore] provisional session set', { id: provisionalSession.id });

        try {
          let session: Session | null = provisionalSession;

          if (typeof sessionOrId === 'string') {
            const loaded = await loadSessionById(sessionOrId);
            if (loaded) {
              session = loaded;
            }
          } else {
            const loaded = await loadSessionById(provisionalSession.id);
            session = loaded ?? provisionalSession;
          }

          if (!session) {
            throw new Error('Unable to load session');
          }

          const hasMessagesAlready = get().messages.length > 0;
          set(setSessionMessages(session, preserveMessages || hasMessagesAlready));
          console.log('[ChatStore] setCurrentSessionAction success', {
            id: session.id,
            messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
            preserved: preserveMessages || hasMessagesAlready,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load session';
          set({ error: message });
          console.error('[ChatStore] setCurrentSessionAction error', message);
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
      setProcessingTraceCollapsed: (collapsed) =>
        set((state) =>
          state.processingTrace
            ? { processingTrace: { ...state.processingTrace, collapsed } }
            : state,
        ),
        setThinkingContent: (thinkingContent) => set({ thinkingContent }),
        addHistoryEntry: (entry) =>
          set((state) => {
            // keep last 200 per session
            const perSession = state.history.filter((h) => h.sessionId === entry.sessionId);
            const trimmed =
              perSession.length >= 200 ? perSession.slice(perSession.length - 199) : perSession;
            const merged = state.history.filter((h) => h.sessionId !== entry.sessionId);
            return { history: [...merged, ...trimmed, entry] };
          }),
        getHistoryForSession: (sessionId) =>
          get().history
            .filter((h) => h.sessionId === sessionId || (!sessionId && h.sessionId === null))
            .sort((a, b) => b.createdAt - a.createdAt),
        clearHistory: (sessionId) =>
          set((state) => ({
            history: sessionId ? state.history.filter((h) => h.sessionId !== sessionId) : [],
          })),
        searchPrompts: async (params: PromptSearchRequest) => {
          try {
            const res = await electronAPI.chat.searchPrompts(params);
            if (res?.success && res.data) {
              const payload = res.data as PromptSearchResponse;
              set({ promptSearchResults: payload.prompts ?? [] });
              return payload.prompts ?? [];
            }
            return [];
          } catch (err) {
            console.error('[ChatStore] searchPrompts failed', err);
            return [];
          }
        },
        clearPromptSearchResults: () => set({ promptSearchResults: [] }),
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
              isStreaming: false,
            });
          }
        },

        stopStreaming: async () => {
          const { streamingMessageId, currentSessionId, currentSession } = get();
          const sessionId = currentSessionId ?? currentSession?.id ?? null;
          try {
            if (sessionId && typeof dependencies.chatService.cancelStream === 'function') {
              console.log('[ChatStore] stopStreaming: cancel remote stream', { sessionId });
              await dependencies.chatService.cancelStream(sessionId);
            }
          } catch (err) {
            console.warn('[ChatStore] stopStreaming: remote cancel failed', err);
          }

          if (!streamingMessageId) {
            set({ isStreaming: false });
            return;
          }
          set({ isStreaming: false });
          const finalContent = get().streamingContent;
          get().finishStreamingMessage(finalContent);
        },

        resetChatState: () => set(initialState),

        createNewSession: async () => {
          try {
            const response = await electronAPI.sessions.create({
              title: 'Untitled Session',
            });

            const newSessionId = response.data?.sessionId;
            if (response.success && newSessionId) {
              console.log('[ChatStore] createNewSession API success', { sessionId: newSessionId });
              await setCurrentSessionAction(newSessionId);
              try {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('sessionCreated', {
                      detail: { sessionId: newSessionId, isNew: true },
                    }),
                  );
                }
              } catch {}
              return newSessionId;
            }

            throw new Error(response.error?.message || 'Failed to create session');
          } catch (error) {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substr(2, 9);
            const sessionId = `session_${timestamp}_${randomStr}`;
            console.warn('[ChatStore] createNewSession fallback', { sessionId });
            await setCurrentSessionAction({
              id: sessionId,
              title: 'Untitled Session',
            });
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('sessionCreated', {
                    detail: { sessionId, isNew: true },
                  }),
                );
              }
            } catch {}
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
                await setCurrentSessionAction(sessionId, { preserveMessages: true });
                try {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('sessionCreated', {
                        detail: { sessionId, isNew: true, hasFirstMessage: true },
                      }),
                    );
                  }
                } catch {}
              } else {
                throw new Error(createResp.error?.message || 'Failed to create session');
              }
            }
            console.log('[ChatStore] sendMessage using session', { sessionId });
            get().addHistoryEntry({
              id: `hist_${Date.now()}`,
              text: content,
              sessionId,
              createdAt: Date.now(),
            });

            const response = await electronAPI.chat.sendMessage({
              conversationId: sessionId,
              message: content,
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to send message');
            }
            console.log('[ChatStore] sendMessage response received');

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

        sendMessageStream: async (content) => {
          const { currentSessionId } = get();

          try {
            set({ isLoading: true, isStreaming: true, error: null });

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
                await setCurrentSessionAction(sessionId, { preserveMessages: true });
                try {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('sessionCreated', {
                        detail: { sessionId, isNew: true, hasFirstMessage: true },
                      }),
                    );
                  }
                } catch {}
              } else {
                throw new Error(createResp.error?.message || 'Failed to create session');
              }
            }
            get().addHistoryEntry({
              id: `hist_${Date.now()}`,
              text: content,
              sessionId,
              createdAt: Date.now(),
            });

            const assistantId = `msg_${Date.now()}_assistant`;
            const assistantPlaceholder: UIMessageDisplay = {
              id: assistantId,
              role: 'assistant',
              content: '',
              timestamp: new Date().toISOString(),
              status: 'typing',
              showThinking: true,
            };

            set((state) => ({ messages: [...state.messages, assistantPlaceholder] }));
            get().startStreamingMessage(assistantId);
            devLog('[chatStore] streaming start', { assistantId, sessionId });

            const traceStartedAt = Date.now();
            set({
              processingTrace: {
                messageId: assistantId,
                startedAt: traceStartedAt,
                events: [],
                toolCount: 0,
                warningCount: 0,
                errorCount: 0,
                collapsed: false,
                activeToolStarts: {},
              },
            });

            const { chatService } = dependencies;

            const addProcessingEvent = (
              evt: Omit<ProcessingEvent, 'id' | 'at'> & { at?: number },
            ) => {
              set((state) => {
                const trace = state.processingTrace;
                if (!trace || trace.messageId !== assistantId) return state;
                const at = evt.at ?? Date.now();
                const event: ProcessingEvent = {
                  id: `evt_${at}_${Math.random().toString(36).slice(2, 6)}`,
                  kind: evt.kind,
                  label: evt.label,
                  detail: evt.detail,
                  tool: evt.tool,
                  phase: evt.phase,
                  at,
                  durationMs: evt.durationMs,
                };
                const activeToolStarts = { ...trace.activeToolStarts };
                let toolCount = trace.toolCount;
                let warningCount = trace.warningCount;
                let errorCount = trace.errorCount;
                if (evt.kind === 'tool' && evt.phase === 'start' && evt.tool) {
                  activeToolStarts[evt.tool] = at;
                  toolCount += 1;
                }
                if (
                  evt.kind === 'tool' &&
                  evt.tool &&
                  (evt.phase === 'end' || evt.phase === 'error')
                ) {
                  const started = activeToolStarts[evt.tool];
                  if (started) {
                    event.durationMs = at - started;
                    delete activeToolStarts[evt.tool];
                  }
                }
                if (evt.kind === 'error') {
                  warningCount += 1;
                  errorCount += 1;
                }
                return {
                  processingTrace: {
                    ...trace,
                    events: [...trace.events, event],
                    toolCount,
                    warningCount,
                    errorCount,
                    activeToolStarts,
                  },
                };
              });
            };

            const completeProcessingTrace = (status: 'ok' | 'error' = 'ok') => {
              set((state) => {
                const trace = state.processingTrace;
                if (!trace || trace.messageId !== assistantId) return state;
                const finishedAt = Date.now();
                const warningCount = status === 'error' ? trace.warningCount + 1 : trace.warningCount;
                const errorCount = status === 'error' ? trace.errorCount + 1 : trace.errorCount;
                return {
                  processingTrace: {
                    ...trace,
                    completedAt: finishedAt,
                    warningCount,
                    errorCount,
                    collapsed: true, // auto-collapse once done
                  },
                };
              });
            };

            const statusMessageId = `${assistantId}_status`;
            const upsertStatusMessage = (text: string) => {
              set((state) => {
                const idx = state.messages.findIndex((m) => m.id === statusMessageId);
                const statusMsg: UIMessageDisplay = {
                  id: statusMessageId,
                  role: 'system',
                  content: text,
                  timestamp: new Date().toISOString(),
                  status: 'delivered',
                  showThinking: false,
                };
                if (idx >= 0) {
                  const copy = [...state.messages];
                  copy[idx] = statusMsg;
                  return { messages: copy };
                }
                return { messages: [...state.messages, statusMsg] };
              });
              devLog('[chatStore] status upsert', { statusMessageId, text });
            };

            const statusToText = (status: any): string => {
              if (!status || typeof status !== 'object') return '';
              switch (status.type) {
              case 'retry':
                return `Retry ${status.attempt}/${status.max}: ${status.reason ?? ''}`.trim();
              case 'fail':
                return `Failed (${status.category ?? 'error'})${
                  status.suggestion ? `: ${status.suggestion}` : ''
                }`;
              case 'thought':
                return status.text ?? '';
              case 'tip':
                return status.text ?? '';
              case 'tool':
                return `Tool ${status.tool ?? ''} ${status.phase ?? ''}${
                  status.detail ? `: ${status.detail}` : ''
                }`.trim();
              default:
                return '';
              }
            };

            const handleStatusEvent = (status: any) => {
              if (!status || typeof status !== 'object') return;
              const now = Date.now();
              const pushTool = (tool?: string, phase?: 'start' | 'end' | 'error', detail?: string) =>
                addProcessingEvent({
                  kind: 'tool',
                  label: `tool ${tool ?? 'unknown'} ${phase ?? ''}`.trim(),
                  tool,
                  phase,
                  detail,
                  at: now,
                });

              switch (status.type) {
              case 'thought':
                addProcessingEvent({
                  kind: 'thought',
                  label: status.text ?? 'Thought',
                  detail: status.text,
              at: now,
            });
            break;
          case 'tool':
            pushTool(status.tool, status.phase, status.detail);
            if (status.tool) {
              const toolId = toolCallNameToId.get(status.tool) ?? status.tool;
              upsertToolCalls(
                [
                  {
                    id: toolId,
                    type: 'function',
                    function: { name: status.tool, arguments: status.detail ?? '' },
                  },
                ],
                status.phase === 'end'
                  ? 'completed'
                  : status.phase === 'error'
                    ? 'error'
                    : 'running',
                status.phase === 'error' ? status.detail : undefined,
              );
            }
            break;
          case 'timeline_event':
            if (status.event?.type === 'thought') {
              addProcessingEvent({
                kind: 'thought',
                label: status.event.text ?? 'Thought',
                detail: status.event.text,
                at: now,
              });
            } else if (status.event?.type === 'tool') {
              pushTool(status.event.tool, status.event.phase, status.event.detail);
              if (status.event.tool) {
                const toolId = toolCallNameToId.get(status.event.tool) ?? status.event.tool;
                upsertToolCalls(
                  [
                    {
                      id: toolId,
                      type: 'function',
                      function: { name: status.event.tool, arguments: status.event.detail ?? '' },
                    },
                  ],
                  status.event.phase === 'end'
                    ? 'completed'
                    : status.event.phase === 'error'
                      ? 'error'
                      : 'running',
                  status.event.phase === 'error' ? status.event.detail : undefined,
                );
              }
            } else if (status.event?.type === 'error') {
              addProcessingEvent({
                kind: 'error',
                label: status.event.text ?? 'Error',
                detail: status.event.text,
                    at: now,
                  });
                }
                break;
              case 'timeline_state':
                addProcessingEvent({
                  kind: 'status',
                  label: status.state ?? 'Status',
                  detail: status.state,
                  at: now,
                });
                break;
              case 'fail':
                addProcessingEvent({
                  kind: 'error',
                  label: `Failed (${status.category ?? 'error'})`,
                  detail: status.suggestion,
                  at: now,
                });
                break;
            default:
              break;
            }
          };

            const mergeToolCalls = (
              existing: ToolCallDisplay[] | undefined,
              incoming: ToolCallDisplay[],
              statusOverride?: ToolCallDisplay['status'],
              error?: string,
            ): ToolCallDisplay[] => {
              const map = new Map<string, ToolCallDisplay>();
              (existing ?? []).forEach((tc) => map.set(tc.id, tc));
              incoming.forEach((tc) => {
                const current = map.get(tc.id);
                map.set(tc.id, {
                  ...current,
                  ...tc,
                  status: statusOverride ?? tc.status ?? current?.status,
                  error: error ?? tc.error ?? current?.error,
                });
              });
              return Array.from(map.values());
            };

            const upsertToolCalls = (
              calls: ToolCallDisplay[],
              statusOverride?: ToolCallDisplay['status'],
              error?: string,
            ) => {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        tool_calls: mergeToolCalls(m.tool_calls, calls, statusOverride, error),
                      }
                    : m,
                ),
              }));
            };

            const toolCallNameToId = new Map<string, string>();

            let aggregated = '';
            const result = await chatService.sendMessageStream(
              content,
              (chunk) => {
                devLog('[chatStore] onChunk', {
                  type: (chunk as any).type,
                  status: (chunk as any).status,
                  contentPreview:
                    typeof chunk.content === 'string'
                      ? chunk.content.slice(0, 60)
                      : undefined,
                  streamingMessageId: get().streamingMessageId,
                });
                if (!get().isStreaming) {
                  return;
                }
                if (chunk.type === 'status' && (chunk as any).status) {
                  handleStatusEvent((chunk as any).status);
                  const text = statusToText((chunk as any).status);
                  if (text) upsertStatusMessage(text);
                  return;
                }
                if (chunk.type === 'tool_call' && Array.isArray(chunk.tool_calls)) {
                  const displayCalls: ToolCallDisplay[] = chunk.tool_calls.map((call) => ({
                    id: call.id,
                    type: call.type ?? 'function',
                    function: {
                      name: call.function?.name ?? 'unknown',
                      arguments: call.function?.arguments ?? '',
                    },
                    status: 'running',
                  }));
                  displayCalls.forEach((tc) => {
                    const key = tc.function?.name ?? tc.id;
                    if (key) {
                      toolCallNameToId.set(key, tc.id);
                    }
                  });
                  upsertToolCalls(displayCalls, 'running');
                  return;
                }
                const isContentChunk = !chunk.type || chunk.type === 'content';
                const text =
                  isContentChunk && typeof chunk.content === 'string'
                    ? chunk.content
                    : isContentChunk && chunk.content != null
                      ? String(chunk.content)
                      : '';

                if (!text) {
                  return;
                }

                aggregated += text;
                // Keep legacy streamingContent updated for stopStreaming/metrics
                get().appendStreamingContent(text);
                // Live-update the assistant placeholder bubble content
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: aggregated, status: 'typing', showThinking: true }
                      : m,
                  ),
                }));
              },
              { sessionId },
            );

            get().finishStreamingMessage(result.content);
            completeProcessingTrace('ok');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to stream message';
            completeProcessingTrace('error');
            // Surface the failure inline so users see it immediately, even if no status chunk arrived
            set((state) => {
              const messages = [...state.messages];
              const placeholderIdx = messages.findIndex((m) => m.id === state.streamingMessageId);
              if (placeholderIdx >= 0) {
                messages[placeholderIdx] = {
                  ...messages[placeholderIdx],
                  content: errorMessage,
                  status: 'error',
                  showThinking: false,
                };
              } else {
                messages.push({
                  id: `msg_${Date.now()}_error`,
                  role: 'system',
                  content: errorMessage,
                  timestamp: new Date().toISOString(),
                  status: 'error',
                  showThinking: false,
                });
              }
              return {
                messages,
                error: errorMessage,
                isStreaming: false,
                streamingMessageId: null,
                streamingContent: '',
              };
            });
            devLog('[chatStore] stream error', {
              error: errorMessage,
              streamingMessageId: get().streamingMessageId,
            });
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
