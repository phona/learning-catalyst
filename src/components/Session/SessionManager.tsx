import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';

export const SessionManager: React.FC = () => {
  const { sessions, loading, error, refresh, clearError } = useRecentSessions(20);
  const navigate = useNavigate();
  const { setCurrentSession, clearMessages } = useChatStore();
  const { setCurrentView } = useAppStore();

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Retrieving your learning sessions...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Sessions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Retry
            </button>
            <button
              onClick={clearError}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Session Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your learning sessions and conversation history
              </p>
            </div>
            <button
              onClick={refresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Sessions Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't created any learning sessions yet. Start a new chat to begin your learning journey.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Sessions ({sessions.length})
              </h2>
            </div>

            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  try {
                    // Load the session into the chat store
                    setCurrentSession(session);

                    // Navigate to chat view with session ID in URL
                    navigate(`/sessions/${session.id}`);

                    // Switch to chat view
                    setCurrentView('chat');

                    console.log(`[SessionManager] Opened session: ${session.id}`);
                  } catch (error) {
                    console.error('[SessionManager] Failed to open session:', error);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {session.metadata.pinned && (
                        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </h3>
                    </div>

                    {session.metadata.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {session.metadata.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{session.statistics.total_messages} messages</span>
                      <span>•</span>
                      <span>{formatRelativeTime(session.updated_at)}</span>
                      {session.metadata.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-1">
                            {session.metadata.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {session.metadata.tags.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                +{session.metadata.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    {session.metadata.category && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {session.metadata.category}
                      </span>
                    )}
                    {session.metadata.difficulty && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                        {session.metadata.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};