import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  variant?: 'minimal' | 'inline';
  onRetry?: () => void;
  showErrorDetails?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Generic error boundary for individual components
 * Provides lightweight error handling for non-critical components
 */
export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  componentName = 'Component',
  variant = 'minimal',
  onRetry,
  showErrorDetails = false,
  onError
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`${componentName} error:`, error);
    // Call the provided onError callback if it exists
    onError?.(error, errorInfo);
  };

  const customFallback = variant === 'minimal' ? (
    <div className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
      <div className="flex items-center space-x-1">
        <ExclamationTriangleIcon className="w-3 h-3" />
        <span>{componentName} failed to load</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center space-x-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {componentName} Error
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This component failed to load properly.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      variant={variant}
      title={`${componentName} Error`}
      fallback={customFallback}
      onError={onError || handleError}
      onRetry={onRetry}
      showRetry={!!onRetry}
    >
      {children}
    </ErrorBoundary>
  );
};