import React, { useEffect, useState } from 'react';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

/**
 * Props for the SetupPage component
 */
interface SetupPageProps {
  /** Optional timeout in milliseconds before showing retry option */
  timeoutMs?: number;

  /** Custom loading message */
  message?: string;

  /** Callback when timeout is reached */
  onTimeout?: () => void;

  /** Callback when user requests manual retry */
  onRetry?: () => void;
}

/**
 * Setup page displayed during application initialization.
 *
 * This component:
 * - Shows a loading spinner with branding
 * - Displays initialization progress message
 * - Optionally implements a timeout mechanism
 * - Provides retry option if initialization takes too long
 *
 * State transitions:
 * - loading → ready (when ready event received)
 * - loading → timeout (when timeout reached)
 * - timeout → loading (when retry clicked)
 *
 * @example
 * ```tsx
 * <SetupPage
 *   timeoutMs={30000}
 *   onTimeout={() => setShowRetry(true)}
 *   onRetry={() => window.location.reload()}
 * />
 * ```
 */
export function SetupPage({
  timeoutMs = 30000,
  message = 'Initializing Learning Catalyst...',
  onTimeout,
  onRetry,
}: SetupPageProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    // Start timer to track initialization duration
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 100);
    }, 100);

    // Set timeout to show retry option
    const timeout = setTimeout(() => {
      setShowTimeout(true);
      onTimeout?.();
    }, timeoutMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [timeoutMs, onTimeout]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 max-w-lg w-full border border-blue-100 dark:border-blue-800">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <RocketLaunchIcon className="w-12 h-12 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Learning Catalyst
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Your AI-powered learning companion
          </p>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">
            {message}
          </p>

          {/* Progress Indicator */}
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min((timeElapsed / timeoutMs) * 100, 100)}%`,
              }}
            ></div>
          </div>

          {/* Time Elapsed */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {formatTime(timeElapsed)} elapsed
          </p>

          {/* Timeout State */}
          {showTimeout && (
            <div className="bg-yellow-50 dark:bg-yellow-900/Timeout && (
           20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Initialization is taking longer than expected.
              </p>
              <button
                onClick={onRetry}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Retry Startup
              </button>
            </div>
          )}

          {/* Status Text */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Setting up your personalized learning environment...
          </p>
        </div>
      </div>
    </div>
  );
}
