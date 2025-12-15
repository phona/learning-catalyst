import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface MessageErrorBoundaryProps {
  children: ReactNode;
  messageId?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 📝 Message Error Boundary
 *
 * Specific error boundary for individual chat messages to prevent
 * one broken message from crashing the entire chat interface.
 */
export class MessageErrorBoundary extends Component<MessageErrorBoundaryProps, State> {
  constructor(props: MessageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Message rendering error:', {
      error,
      errorInfo,
      messageId: this.props.messageId,
    });
    try {
      console.error('[MessageErrorBoundary] context', {
        href: window.location.href,
        time: new Date().toISOString(),
      });
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex justify-center my-4" role="alert" aria-live="polite">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-md w-full">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Failed to render message
                  {this.props.messageId && ` (ID: ${this.props.messageId.substring(0, 8)}...)`}
                </p>
                <button
                  onClick={this.handleRetry}
                  className="mt-2 flex items-center space-x-1 text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
