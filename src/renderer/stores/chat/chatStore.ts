/**
 * Chat Store - Frontend state management for chat functionality
 * Clean architecture with display-optimized state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MessageDisplay, AgentDisplay } from '../../types';

interface ChatState {
  // Current session state
  currentSessionId: string | null;
  messages: MessageDisplay[];
  currentAgent: AgentDisplay | null;
  isTyping: boolean;
  isLoading: boolean;
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
  setThinkingContent: (content: string) => void;

  // Streaming actions
  startStreamingMessage: (messageId: string) => void;
  appendStreamingContent: (content: string) => void;
  finishStreamingMessage: (finalContent?: string) => void;

  // Reset actions
  resetChatState: () => void;
}

const initialState = {
  currentSessionId: null,
  messages: [],
  currentAgent: null,
  isTyping: false,
  isLoading: false,
  error: null,
  autoScroll: true,
  fontSize: 'medium' as const,
  showThinking: false,
  thinkingContent: '',
  streamingMessageId: null,
  streamingContent: '',
};

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setCurrentSession: (sessionId) => {
      set({ currentSessionId: sessionId });

      // Load conversation history for this session
      if (typeof window !== 'undefined' && window.electronAPI?.chat) {
        window.electronAPI.chat.getConversationHistory(sessionId)
          .then((history) => {
            set({ messages: history.messages || [], error: null });
          })
          .catch((error) => {
            console.error('Failed to load conversation history:', error);
            set({ error: (error as Error).message });
          });
      }
    },

    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message]
    })),

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

    finishStreamingMessage: (finalContent) => set((state) => {
      const { streamingMessageId, streamingContent } = state;

      if (streamingMessageId) {
        // Update the streaming message with final content
        const messageContent = finalContent || streamingContent;

        set((prevState) => ({
          messages: prevState.messages.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: messageContent, status: 'delivered' }
              : msg
          ),
          streamingMessageId: null,
          streamingContent: '',
          isTyping: false
        }));
      }

      return state;
    }),

    resetChatState: () => set(initialState)
  }))
);

// Selectors for derived state
export const useCurrentMessages = () => useChatStore((state) => state.messages);
export const useCurrentAgent = () => useChatStore((state) => state.currentAgent);
export const useIsTyping = () => useChatStore((state) => state.isTyping);
export const useChatLoading = () => useChatStore((state) => state.isLoading);
export const useChatError = () => useChatStore((state) => state.error);
export const useStreamingState = () => useChatStore((state) => ({
  messageId: state.streamingMessageId,
  content: state.streamingContent,
  isStreaming: !!state.streamingMessageId
}));

// Actions hook
export const useChatActions = () => useChatStore((state) => ({
  setCurrentSession: state.setCurrentSession,
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  removeMessage: state.removeMessage,
  clearMessages: state.clearMessages,
  setTyping: state.setTyping,
  setLoading: state.setLoading,
  setError: state.setError,
  setCurrentAgent: state.setCurrentAgent,
  setAutoScroll: state.setAutoScroll,
  setFontSize: state.setFontSize,
  setShowThinking: state.setShowThinking,
  setThinkingContent: state.setThinkingContent,
  startStreamingMessage: state.startStreamingMessage,
  appendStreamingContent: state.appendStreamingContent,
  finishStreamingMessage: state.finishStreamingMessage,
  resetChatState: state.resetChatState
}));