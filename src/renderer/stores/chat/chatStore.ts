
/**
 * Chat Store - Frontend state management for chat functionality
 * Clean architecture with display-optimized state
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unsafe-return */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MessageDisplay, AgentDisplay } from '../../types';
import type { SessionService } from '../../services/session/session-service';
import type { ChatAPI, SessionsAPI } from '@/shared/types/electron-api';

// Factory dependencies interface
export interface ChatStoreDependencies {
  sessionService: SessionService;
  electronAPI: {
    chat: ChatAPI;
    sessions: SessionsAPI;
  };
}

// Chat store state interface
export interface ChatState {
  // Current session state
  currentSessionId: string | null;
  currentSession: {
    id: string;
    title: string;
    createdAt: string;
  } | null;
  messages: MessageDisplay[];
  currentAgent: AgentDisplay | null;
  isTyping: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // UI state
  autoScroll: boolean;
  fontSize: 'small' | 'medium' | 'large';
  showThinking: boolean;
  thinkingContent: string;

  // Streaming state
  streamingMessageId: string | null;
  streamingContent: string;

  // Actions
  setCurrentSession: (sessionId: string) => void;
  addMessage: (message: MessageDisplay) => void;
  updateMessage: (messageId: string, updates: Partial<MessageDisplay>) => void;
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
}

// Initial state for the chat store
const initialState = {
  // Current session state
  currentSessionId: null,
  currentSession: null,
  messages: [],
  currentAgent: null,
  isTyping: false,
  isLoading: false,
  isStreaming: false,
  error: null,

  // UI state
  autoScroll: true,
  fontSize: 'medium' as const,
  showThinking: false,
  thinkingContent: '',

  // Streaming state
  streamingMessageId: null,
  streamingContent: '',
};

// Clean factory function for creating chat store instances
export function createChatStore(dependencies: ChatStoreDependencies) {
  const { sessionService, electronAPI } = dependencies;

  return create<ChatState>()(
    subscribeWithSelector((set, get) => {
      return {
        ...initialState,

        setCurrentSession: (sessionId) => {
          set({ currentSessionId: sessionId });

          // Load conversation history using injected electronAPI
          electronAPI.sessions.get(sessionId)
            .then((response) => {
              if (response.success && response.data?.messages) {
                set({
                  messages: (response.data.messages as MessageDisplay[]) || [],
                  error: null
                });
              }
            })
            .catch((error) => {
              console.error('Failed to load conversation history:', error);
              set({ error: (error as Error).message });
            });
        },

        addMessage: (message) => {
          const messageWithThinking = {
            ...message,
            showThinking: message.showThinking ?? false
          };

          set((state) => {
            const newMessages = [...state.messages, messageWithThinking];

            // Check if this is the first assistant message and trigger AI title generation
            const assistantMessages = newMessages.filter(msg => msg.role === 'assistant');
            if (assistantMessages.length === 1 && message.role === 'assistant') {
              const userMessages = newMessages.filter(msg => msg.role === 'user');
              if (userMessages.length > 0) {
                // Use the first user message as the basis for title generation
                setTimeout(() => {
                  sessionService.generateAITitle(
                    userMessages[0].content,
                    'default-provider',
                    'default-model'
                  ).catch(error => {
                    console.warn('Failed to generate AI title:', error);
                  });
                }, 500);
              }
            }

            return { messages: newMessages };
          });
        },

        updateMessage: (messageId, updates) => set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        })),

        removeMessage: (messageId) => set((state) => ({
          messages: state.messages.filter(msg => msg.id !== messageId)
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

        startStreamingMessage: (messageId) => set({
          streamingMessageId: messageId,
          streamingContent: '',
          isTyping: true
        }),

        appendStreamingContent: (content) => set((state) => ({
          streamingContent: state.streamingContent + content
        })),

        finishStreamingMessage: (finalContent) => {
          const { streamingMessageId, streamingContent } = get();

          if (streamingMessageId) {
            const messageContent = finalContent || streamingContent;

            set({
              messages: get().messages.map(msg =>
                msg.id === streamingMessageId
                  ? { ...msg, content: messageContent, status: 'delivered' }
                  : msg
              ),
              streamingMessageId: null,
              streamingContent: '',
              isTyping: false
            });
          }
        },

        resetChatState: () => set(initialState),

        createNewSession: async () => {
          try {
            const response = await electronAPI.sessions.create({
              title: 'Untitled Session'
            });

            const newSessionId = response.data?.sessionId;

            if (response.success && newSessionId) {
              set({
                currentSessionId: newSessionId,
                currentSession: {
                  id: newSessionId,
                  title: 'Untitled Session',
                  createdAt: new Date().toISOString()
                },
                messages: [],
                error: null
              });
              return newSessionId;
            } else {
              throw new Error(response.error?.message || 'Failed to create session');
            }
          } catch (error) {
            // Fallback to local generation
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substr(2, 9);
            const sessionId = `session_${timestamp}_${randomStr}`;

            set({
              currentSessionId: sessionId,
              currentSession: {
                id: sessionId,
                title: 'Untitled Session',
                createdAt: new Date().toISOString()
              },
              messages: [],
              error: null
            });
            return sessionId;
          }
        },

        saveCurrentSession: async () => {
          const { currentSessionId, messages } = get();
          if (!currentSessionId) {
            return { success: false };
          }

          try {
            await sessionService.saveSessionWithMessages(currentSessionId, messages);
            return { success: true };
          } catch (error) {
            console.error('Failed to save session:', error);
            return { success: false };
          }
        },

        sendMessage: async (content: string) => {
          const { currentSessionId } = get();

          try {
            set({ isLoading: true, error: null });

            const userMessage: MessageDisplay = {
              id: `msg_${Date.now()}`,
              role: 'user',
              content,
              timestamp: new Date().toISOString(),
              status: 'delivered',
              showThinking: false
            };

            set((state) => ({
              messages: [...state.messages, userMessage]
            }));

            const response = await electronAPI.chat.sendMessage({
              conversationId: currentSessionId || '',
              message: content
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to send message');
            }

            const assistantMessage: MessageDisplay = {
              id: `msg_${Date.now()}_assistant`,
              role: 'assistant',
              content: response.data.assistantMessage?.content || 'Response from AI',
              timestamp: new Date().toISOString(),
              status: 'delivered',
              showThinking: false
            };

            set((state) => ({
              messages: [...state.messages, assistantMessage]
            }));

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            set({ error: errorMessage });
            throw new Error(errorMessage);
          } finally {
            set({ isLoading: false });
          }
        }
      };
    })
  );
}
