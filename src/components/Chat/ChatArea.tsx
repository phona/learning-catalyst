import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';

export const ChatArea: React.FC = () => {
  const {
    messages,
    isStreaming,
    showThinking,
    thinkingContent,
    streamingContent,
    autoScroll,
    toggleThinking,
    selectedProvider,
  } = useChatStore();

  const { theme } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, autoScroll]);

  // Handle scroll events to enable/disable auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Could update autoScroll state here if needed
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Get the last assistant message
  const lastAssistantMessage = messages
    .filter(msg => msg.role === 'assistant')
    .pop();

  // Create a temporary streaming message
  const streamingMessage = isStreaming ? {
    id: 'streaming',
    role: 'assistant' as const,
    content: streamingContent,
    timestamp: new Date(),
    thinking_content: showThinking ? thinkingContent : undefined,
  } : null;

  return (
    <div className="flex-1 overflow-auto custom-scrollbar" ref={containerRef}>
      <div className="h-full">
        {messages.length === 0 && !isStreaming ? (
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
                  Start a conversation with your AI learning companion. Ask questions, explore concepts, and enhance your understanding.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    💡 Ask Questions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "Explain quantum computing in simple terms"
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    📚 Learn Concepts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "Teach me about React hooks with examples"
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    🛠️ Get Help
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "Debug this Python code for me"
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    🎯 Set Goals
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "Create a learning plan for machine learning"
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showThinking={showThinking && message === lastAssistantMessage}
                  onToggleThinking={toggleThinking}
                  canToggleThinking={message.role === 'assistant' && !!message.thinking_content && selectedProvider === 'chatglm'}
                />
              ))}

              {/* Streaming message */}
              {streamingMessage && (
                <MessageBubble
                  message={streamingMessage}
                  showThinking={showThinking}
                  isStreaming={true}
                  onToggleThinking={toggleThinking}
                  canToggleThinking={selectedProvider === 'chatglm'}
                />
              )}
            </div>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {messages.length > 0 && (
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