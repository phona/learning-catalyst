


import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  variant?: 'full' | 'inline' | 'minimal';
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  customActions?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

/**
 * 🚨 Enhanced Error Boundary
 *
 * Comprehensive error boundary with configurable variants and user-friendly recovery options.
 * Provides three display modes for different error scenarios and contexts.
 *
 * 🎯 What It Does:
 * - Catches React component errors and prevents crashes
 * - Displays context-appropriate error UI with recovery options
 * - Generates unique error IDs for debugging
 * - Provides development mode error details
 * - Supports custom fallback components
 *
 * 🔧 Configuration Variants:
 * - **full**: Full-screen error for critical application failures
 * - **inline**: Section-level error for component failures
 * - **minimal**: Small inline errors for non-critical components
 *
 * 💡 Best Practices:
 * - Use `full` variant for application-level boundaries
 * - Use `inline` variant for feature-level boundaries
 * - Use `minimal` variant for individual component boundaries
 * - Provide meaningful error titles and descriptions
 * - Implement onRetry handlers when possible
 *
 * @example
 * ```tsx
 * // Application-level error handling
 * <ErrorBoundary variant="full">
 *   <App />
 * </ErrorBoundary>
 *
 * // Feature-level error handling
 * <ErrorBoundary
 *   variant="inline"
 *   title="Chat Error"
 *   description="The chat encountered an error. Try reloading."
 *   onRetry={handleChatRetry}
 * >
 *   <ChatInterface />
 * </ErrorBoundary>
 *
 * // Component-level error handling
 * <ErrorBoundary
 *   variant="minimal"
 *   title="Settings Failed"
 *   fallback={<CustomErrorUI />}
 * >
 *   <SettingsPanel />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by enhanced boundary:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send errors to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo, this.state.errorId);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { variant = 'full', title, description, showRetry = true, customActions } = this.props;

      // Minimal inline error for non-critical components
      if (variant === 'minimal') {
        return (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {title || 'Component failed to load'}
              </span>
              {showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="ml-auto text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        );
      }

      // Inline error for sections within a page
      if (variant === 'inline') {
        return (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {title || 'Something went wrong'}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {description || 'This section encountered an error. Please try again.'}
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs">
                    <summary className="cursor-pointer font-mono text-red-800 dark:text-red-200">
                      Error Details (ID: {this.state.errorId})
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-red-700 dark:text-red-300 font-mono">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}

                <div className="flex items-center space-x-3 mt-4">
                  {showRetry && (
                    <button
                      onClick={this.handleRetry}
                      className="flex items-center space-x-1 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                  {customActions}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Full screen error for critical failures
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {title || 'Application Error'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {description || 'Learning Catalyst encountered an unexpected error.'}
              </p>
              {this.state.errorId && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Error Details (Development Mode)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-xs overflow-auto max-h-48">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              {showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Restart Application</span>
              </button>

              <button
                onClick={() => window.location.href = '/'}
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

    return this.props.children;
  }
}