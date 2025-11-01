import React from 'react';
import { ErrorBoundaryEnhanced } from './ErrorBoundaryEnhanced';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

/**
 * Specialized error boundary for chat components
 * Provides chat-specific error handling and recovery options
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
    <ErrorBoundaryEnhanced
      variant="inline"
      title="Chat Error"
      description="The chat interface encountered an error. Try reloading the chat."
      fallback={customFallback}
      onRetry={handleRetry}
    >
      {children}
    </ErrorBoundaryEnhanced>
  );
};