import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

/**
 * 💬 Chat Error Boundary
 *
 * Specialized error boundary for chat components with context-aware error messages
 * and chat-specific recovery options. Preserves user experience during chat failures.
 *
 * 🎯 What It Does:
 * - Catches chat component errors without crashing the entire app
 * - Displays user-friendly chat error messages
 * - Provides chat-specific recovery options (reload chat)
 * - Warns users about potential message loss
 * - Maintains context-specific error styling
 *
 * 🔧 Features:
 * - Inline error display to maintain chat context
 * - Chat-specific error messaging about message state
 * - Reload chat functionality to recover from errors
 * - Warning about unsent messages to manage expectations
 *
 * 💡 Best Practices:
 * - Wrap chat interfaces with this boundary
 * - Provide onRetry handlers that clear chat state if needed
 * - Use appropriate error messages for chat context
 * - Consider message persistence when implementing recovery
 *
 * @example
 * ```tsx
 * <ChatErrorBoundary onRetry={() => clearChatState()}>
 *   <ChatInterface />
 *   <ChatArea />
 *   <ChatInput />
 * </ChatErrorBoundary>
 * ```
 */
export const ChatErrorBoundary: React.FC<ChatErrorBoundaryProps> = ({
  children,
  onRetry
}) => {
  const handleRetry = () => {
    // Clear any chat-related state if needed
    onRetry?.();
  };

  const customFallback = (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg m-4">
      <div className="flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Chat Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            The chat interface encountered an error. Your conversation may not have been saved.
          </p>
          <div className="flex items-center space-x-3 mt-3">
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
            >
              <ArrowPathIcon className="w-3 h-3" />
              <span>Reload Chat</span>
            </button>
            <span className="text-xs text-red-600 dark:text-red-400">
              Your last message may not have been sent
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      variant="inline"
      title="Chat Error"
      description="The chat interface encountered an error. Try reloading the chat."
      fallback={customFallback}
      onRetry={handleRetry}
    >
      {children}
    </ErrorBoundary>
  );
};