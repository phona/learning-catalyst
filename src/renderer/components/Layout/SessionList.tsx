/**
 * SessionList Component
 *
 * Handles the display and management of session items in the sidebar, including
 * infinite scroll, loading states, and empty/error states.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SessionItem } from './SessionItem';
import type { SessionListProps } from './Sidebar.types';
import { formatRelativeTime as sharedFormatRelativeTime } from '@/renderer/utils/timeUtils';

// Default empty state component
const DefaultEmptyState: React.FC = () => (
  <div className="text-center py-6">
    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
      <DocumentTextIcon className="w-6 h-6 text-gray-400" />
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">No sessions yet</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start your first conversation!</p>
  </div>
);

DefaultEmptyState.displayName = 'DefaultEmptyState';

// Default error state component
const DefaultErrorState: React.FC<{ readonly error: string }> = ({ error }) => (
  <div className="flex flex-col items-center space-y-2 py-4 text-center">
    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
    </div>
    <span className="text-sm text-red-600 dark:text-red-400">Failed to load</span>
    <span className="text-xs text-gray-500 dark:text-gray-400">{error}</span>
  </div>
);

DefaultErrorState.displayName = 'DefaultErrorState';

// Default loading state component
const DefaultLoadingState: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
        aria-hidden="true"
      >
        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-full" />
      </div>
    ))}
  </div>
);

DefaultLoadingState.displayName = 'DefaultLoadingState';

// Main SessionList Component
export const SessionList = memo<SessionListProps>(
  ({
    sessions,
    newSessionIds,
    activeSessionId,
    onOpenSession,
    onRefresh,
    loading,
    error,
    hasMore,
    scrollRef,
    onNearBottom,
    emptyState: EmptyState = DefaultEmptyState,
    errorComponent: ErrorState = DefaultErrorState,
    loadingComponent: LoadingState = DefaultLoadingState,
  }) => {
    // Memoize formatted session data to prevent unnecessary recalculations
    const formattedSessions = useMemo(() => {
      return sessions.map((session) => ({
        session,
        messageCount: session.messages?.length || 0,
        lastUpdated: session.updatedAt || session.createdAt || new Date(),
        timeAgo: sharedFormatRelativeTime(new Date(session.updatedAt || session.createdAt || new Date())),
        isActive: activeSessionId === session.id,
        isNew: newSessionIds.has(session.id),
      }));
    }, [sessions, activeSessionId, newSessionIds]);

    // Handle refresh button click
    const handleRefresh = useCallback(() => {
      try {
        onRefresh();
      } catch (refreshError) {
        console.warn('[SessionList] Failed to refresh sessions:', refreshError);
      }
    }, [onRefresh]);

    // Handle session item click
    const handleSessionClick = useCallback(
      (session: any) => {
        onOpenSession(session);
      },
      [onOpenSession],
    );

    // Set up infinite scroll when hasMore sessions
    React.useEffect(() => {
      if (hasMore && !loading && sessions.length > 0) {
        console.log(
          '[SessionList] Setting up infinite scroll callback, hasMore:',
          hasMore,
          'loading:',
          loading,
          'sessionCount:',
          sessions.length,
        );
        onNearBottom(async () => {
          console.log('[SessionList] Scroll near bottom detected, triggering loadMore');
          // The actual loadMore logic should be handled by the parent component
        });
      } else {
        console.log('[SessionList] Not setting up infinite scroll:', {
          hasMore,
          loading,
          sessionCount: sessions.length,
        });
      }
    }, [hasMore, loading, onNearBottom, sessions.length]);

    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full" aria-hidden="true" />
              <span>Recent Sessions</span>
            </h3>
            {/* Session statistics could be added here */}
            {sessions.length > 0 && (
              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors duration-200"
            title="Refresh sessions"
            aria-label="Refresh recent sessions"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loading && sessions.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div
              ref={scrollRef}
              className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0"
              role="listbox"
              aria-label="Recent sessions"
              aria-live="polite"
            >
              {formattedSessions.map(({ session, isActive, isNew, timeAgo, messageCount }) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={isActive}
                  isNew={isNew}
                  onClick={() => handleSessionClick(session)}
                  timeAgo={timeAgo}
                  messageCount={messageCount}
                />
              ))}
            </div>

            {/* Loading Indicator for Infinite Scroll */}
            {loading && hasMore && (
              <div
                className="mt-3 flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                role="status"
                aria-live="polite"
              >
                <div
                  className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-500"
                  aria-hidden="true"
                />
                <span>Loading more sessions...</span>
              </div>
            )}

            {/* End of Sessions Indicator */}
            {!hasMore && sessions.length > 0 && (
              <div className="mt-3 flex items-center justify-center space-x-2 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                <div
                  className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"
                  aria-hidden="true"
                />
                <span>All sessions loaded</span>
                <div
                  className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"
                  aria-hidden="true"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

SessionList.displayName = 'SessionList';

// Export with custom comparison for optimal re-rendering
export const SessionListWithComparison = memo(SessionList, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.sessions === nextProps.sessions &&
    prevProps.newSessionIds === nextProps.newSessionIds &&
    prevProps.activeSessionId === nextProps.activeSessionId &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.hasMore === nextProps.hasMore &&
    prevProps.onOpenSession === nextProps.onOpenSession &&
    prevProps.onRefresh === nextProps.onRefresh &&
    prevProps.onNearBottom === nextProps.onNearBottom &&
    prevProps.scrollRef === nextProps.scrollRef &&
    prevProps.emptyState === nextProps.emptyState &&
    prevProps.errorComponent === nextProps.errorComponent &&
    prevProps.loadingComponent === nextProps.loadingComponent
  );
});

SessionListWithComparison.displayName = 'SessionListWithComparison';
