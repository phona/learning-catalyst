/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * SessionItem Component
 *
 * A memoized component that renders an individual session item in the sidebar.
 * Handles all accessibility, keyboard navigation, and visual feedback for session items.
 */

import React, { memo, useCallback } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Session } from '@/shared/types/session';
import type { SessionItemProps } from './Sidebar.types';

// Memoized Session Item Component with enhanced typing
export const SessionItem = memo<SessionItemProps>(({
  session,
  isActive,
  isNew,
  onClick,
  timeAgo,
  messageCount,
  'aria-label': ariaLabel,
  className = '',
}) => {
  // Enhanced keyboard event handler with proper typing
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(session);
    }
  }, [onClick, session]);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick(session);
  }, [onClick, session]);

  // Generate accessible label
  const accessibleLabel = ariaLabel ||
    `${session.title} - ${messageCount} messages • ${timeAgo}${isActive ? ' (Currently Active)' : ''}`;

  return (
    <button
      key={session.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative w-full text-left px-3 py-3 text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${className}`}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      aria-selected={isActive}
      role="option"
      tabIndex={0}
    >
      <div className="flex items-start space-x-3">
        {/* Session status icon */}
        <div className="flex-shrink-0 mt-0.5 relative">
          {/* Active session indicator */}
          {isActive && (
            <div
              className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Session content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span
              className={`font-medium truncate pr-2 ${
                isActive
                  ? 'text-primary-700 dark:text-primary-300 font-bold'
                  : isNew
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {session.title}
            </span>
            {/* Current session badge */}
            {isActive && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-300 dark:border-primary-700"
                aria-label="Current active session"
              >
                Active
              </span>
            )}
          </div>

          {/* Session metadata */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" aria-hidden="true" />
              <span>{timeAgo}</span>
            </span>
            {messageCount > 0 && (
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
            )}
            {messageCount > 0 && (
              <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                <ChatBubbleLeftRightIcon className="w-3 h-3" aria-hidden="true" />
                <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
              </span>
            )}
            {/* Active status indicator */}
            {isActive && messageCount > 0 && (
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
            )}
            {isActive && (
              <span className="text-primary-600 dark:text-primary-400 flex items-center space-x-1 font-medium">
                <div className="w-2 h-2 bg-primary-500 rounded-full" aria-hidden="true" />
                <span>Current</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover navigation indicator */}
      {!isActive && (
        <div
          className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Open session"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* New session indicator */}
      {isNew && (
        <div
          className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"
          aria-label="New session"
        />
      )}
    </button>
  );
});

SessionItem.displayName = 'SessionItem';

// Export component with custom comparison function for optimal re-rendering
export const SessionItemWithComparison = memo(SessionItem, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.session.id === nextProps.session.id &&
    prevProps.session.title === nextProps.session.title &&
    prevProps.session.updated_at === nextProps.session.updated_at &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isNew === nextProps.isNew &&
    prevProps.timeAgo === nextProps.timeAgo &&
    prevProps.messageCount === nextProps.messageCount &&
    prevProps.className === nextProps.className &&
    prevProps['aria-label'] === nextProps['aria-label']
  );
});

SessionItemWithComparison.displayName = 'SessionItemWithComparison';