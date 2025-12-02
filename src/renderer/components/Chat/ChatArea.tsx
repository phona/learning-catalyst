/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions */
import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { usePracticeSuggestions } from '@/renderer/hooks/usePracticeSuggestions';
import { MessageErrorBoundary } from '@/renderer/components/UI/MessageErrorBoundary';
import type { MessageDisplay } from '@/renderer/types';
import type { ChatState } from '@/renderer/stores/chat/chatStore';

// Extended interface for messages with thinking toggle support
interface MessageDisplayWithThinking extends MessageDisplay {
  showThinking?: boolean;
  thinking_content?: string;
}

// Interface for current session
interface CurrentSession {
  id: string;
  title: string;
  createdAt: string;
}

const ChatAreaComponent: React.FC = () => {
  const fallbackState: ChatState = {
    currentSessionId: null,
    currentSession: null,
    messages: [],
    currentAgent: null,
    selectedProvider: undefined,
    selectedModel: undefined,
    isTyping: false,
    isLoading: false,
    isStreaming: false,
    error: null,
    autoScroll: true,
    fontSize: 'medium',
    showThinking: false,
    thinkingContent: '',
    streamingMessageId: null,
    streamingContent: '',
    processingTrace: null,
    setCurrentSession: async () => undefined,
    addMessage: () => undefined,
    updateMessage: () => undefined,
    removeMessage: () => undefined,
    clearMessages: () => undefined,
    setTyping: () => undefined,
    setLoading: () => undefined,
    setError: () => undefined,
    setCurrentAgent: () => undefined,
    setAutoScroll: () => undefined,
    setFontSize: () => undefined,
    setShowThinking: () => undefined,
    setThinkingContent: () => undefined,
    setProcessingTraceCollapsed: () => undefined,
    startStreamingMessage: () => undefined,
    appendStreamingContent: () => undefined,
    finishStreamingMessage: () => undefined,
    resetChatState: () => undefined,
    createNewSession: async () => '',
    saveCurrentSession: async () => ({ success: false }),
    sendMessage: async () => undefined,
    updateCurrentSessionTitle: async () => undefined,
    setSelectedProvider: () => undefined,
    setSelectedModel: () => undefined,
  };

  const chatState: ChatState = useChatStore() ?? fallbackState;
  const [practiceState, practiceActions] = usePracticeSuggestions();

  const {
    messages = [],
    isStreaming = false,
    thinkingContent = '',
    streamingContent = '',
    autoScroll = true,
    updateMessage = (): void => {},
    currentSession,
    streamingMessageId = null,
  } = chatState;

  const chatMessages = Array.isArray(messages) ? messages : [];
  console.log('[ChatArea] state', {
    sessionId: chatState.currentSession?.id ?? chatState.currentSessionId,
    messageCount: chatMessages.length,
    isStreaming,
    streamingMessageId,
  });
  // Monitor messages to check for practice opportunities
  const lastCheckedUserMessageIdRef = useRef<string | null>(null);
  useEffect((): void => {
    if (chatMessages.length === 0) return;
    const lastMessage = chatMessages[chatMessages.length - 1] as MessageDisplay;
    if (
      lastMessage?.role === 'user' &&
      currentSession?.id != null &&
      lastMessage?.content != null
    ) {
      const lastId = lastMessage.id;
      if (practiceState.isLoading) return;
      if (lastCheckedUserMessageIdRef.current === lastId) return;
      lastCheckedUserMessageIdRef.current = lastId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      practiceActions.checkForPracticeOpportunity(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        currentSession.id,
        lastMessage.content,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        currentSession.id,
      );
    }
  }, [chatMessages, currentSession?.id, practiceActions, practiceState.isLoading]);

  // Simple toggle function for individual message thinking visibility
  const handleToggleThinking = (messageId: string): void => {
    const message = chatMessages.find((msg: MessageDisplayWithThinking) => msg.id === messageId);
    if (message != null) {
      updateMessage(messageId, { showThinking: !message.showThinking });
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((): void => {
    if (autoScroll && messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, streamingContent, autoScroll, scrollToBottom]);

  // Handle scroll events to enable/disable auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const {
        scrollTop: _scrollTop,
        scrollHeight: _scrollHeight,
        clientHeight: _clientHeight,
      } = container;
      // TODO: Implement autoScroll logic when user scrolls up
      // Currently unused but kept for future functionality
    };

    container.addEventListener('scroll', handleScroll);
    return (): void => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Get the last assistant message - kept for future functionality
  // Currently unused but may be needed for enhanced scrolling features
  // const _lastAssistantMessage = messages
  //   .filter(msg => msg.role === 'assistant')
  //   .pop();

  // Ephemeral streaming bubble removed; streaming state is now shown on the placeholder message

  return (
    <div
      className="flex-1 overflow-auto custom-scrollbar"
      ref={containerRef}
      data-testid="chat-area"
    >
      <div className="h-full">
        {chatMessages.length === 0 && !isStreaming ? (
          console.log('[ChatArea] empty'),
          /* Empty state */
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Welcome to Learning Catalyst
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start a conversation with your AI learning companion. Ask questions, explore
                  concepts, and enhance your understanding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="text-2xl mr-3">💡</span>
                    Ask Questions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {`"Explain quantum computing in simple terms"`}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="text-2xl mr-3">📚</span>
                    Learn Concepts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {`"Teach me about React hooks with examples"`}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="text-2xl mr-3">🛠️</span>
                    Get Help
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {`"Debug this Python code for me"`}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <span className="text-2xl mr-3">🎯</span>
                    Set Goals
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {`"Create a learning plan for machine learning"`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {console.log('[ChatArea] rendering messages', { count: chatMessages.length })}
              {chatMessages.map((message: MessageDisplayWithThinking) => (
                <MessageErrorBoundary key={message.id} messageId={message.id}>
                  <MessageBubble
                    message={message}
                    onToggleThinking={handleToggleThinking}
                    isStreaming={isStreaming && message.id === streamingMessageId}
                  />
                </MessageErrorBoundary>
              ))}
            </div>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {chatMessages.length > 0 && (
          <div className="sticky bottom-4 flex justify-end pr-6">
            <button
              onClick={scrollToBottom}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Scroll to bottom"
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatArea = React.memo(ChatAreaComponent);

export default ChatArea;
