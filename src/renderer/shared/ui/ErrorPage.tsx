import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface SystemError {
  type: string;
  code: string;
  message: string;
  details?: unknown;
  timestamp?: number;
}

export interface ErrorPageProps {
  title?: string;
  description?: string;
  crashError?: SystemError | null;
  error?: Error;
  errorId?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  customActions?: React.ReactNode;
  onRestart?: () => void;
}

export function ErrorPage({
  title,
  description,
  crashError,
  error,
  errorId,
  showRetry = true,
  onRetry,
  customActions,
  onRestart,
}: ErrorPageProps): JSX.Element {
  const handleRestart = () => {
    if (onRestart) {
      onRestart();
      return;
    }

    try {
      if (typeof window.location?.reload === 'function') {
        window.location.reload();
        return;
      }
    } catch {
      // ignore
    }

    // TODO: Implement relaunch functionality when API is available
    // For now, user will need to manually restart the app
    console.warn('App restart requested but relaunch API is not available');
  };

  if (crashError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full border border-red-200 dark:border-red-800">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {title || 'Application Failed to Start'}
            </h1>

            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              {description || 'Learning Catalyst encountered a critical error during initialization.'}
            </p>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Error Details</p>
              <p className="text-sm text-red-700 dark:text-red-300">{crashError.message}</p>
              {crashError.code && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
                  Code: {crashError.code}
                </p>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              The application failed to initialize properly. Your learning progress has been saved. Try restarting the
              application to continue.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
              <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Technical Details (Development Mode)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-xs overflow-auto max-h-64">
                {JSON.stringify(crashError.details, null, 2)}
              </pre>
            </details>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Restart Application</span>
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Go to Home</span>
            </button>

            {customActions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title || 'Application Error'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {description || 'Learning Catalyst encountered an unexpected error.'}
          </p>
          {errorId && <p className="text-xs text-gray-500 dark:text-gray-500">Error ID: {errorId}</p>}
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm">
            <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Error Details (Development Mode)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-xs overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          {showRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          <button
            onClick={handleRestart}
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Restart Application</span>
          </button>

          <button
            onClick={() => (window.location.href = '/')}
            className="w-full flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Go to Home</span>
          </button>

          {customActions}
        </div>
      </div>
    </div>
  );
}

