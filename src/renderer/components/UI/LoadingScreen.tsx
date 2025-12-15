import React from 'react';
import {
  CogIcon,
  SparklesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface LoadingScreenProps {
  message?: string;
  state?: 'config' | 'services' | 'database' | 'ai-provider' | 'ready';
  error?: string | null;
  onRetry?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  state = 'config',
  error,
  onRetry,
}) => {
  const getStateContent = () => {
    switch (state) {
    case 'config':
      return {
        defaultMessage: 'Loading configuration...',
        icon: <CogIcon className="w-8 h-8 text-blue-500" />,
      };
    case 'services':
      return {
        defaultMessage: 'Initializing services...',
        icon: <SparklesIcon className="w-8 h-8 text-purple-500" />,
      };
    case 'database':
      return {
        defaultMessage: 'Preparing database...',
        icon: <DocumentTextIcon className="w-8 h-8 text-green-500" />,
      };
    case 'ai-provider':
      return {
        defaultMessage: 'Configuring AI provider...',
        icon: <SparklesIcon className="w-8 h-8 text-indigo-500" />,
      };
    case 'ready':
      return {
        defaultMessage: 'Ready to go!',
        icon: (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ),
      };
    default:
      return {
        defaultMessage: 'Initializing...',
        icon: <CogIcon className="w-8 h-8 text-gray-500" />,
      };
    }
  };

  const stateContent = getStateContent();
  const displayMessage = message || stateContent.defaultMessage;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Initialization Failed
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>

            <button
              onClick={onRetry || (() => window.location.reload())}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* Icon and Spinner */}
        <div className="mb-6 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                {stateContent.icon}
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Learning Catalyst
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-4">{displayMessage}</p>

        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
      </div>
    </div>
  );
};
