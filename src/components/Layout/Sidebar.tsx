import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  AcademicCapIcon,
  PlusIcon,
  FolderOpenIcon,
  ClockIcon,
  StarIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/hooks/useChatStore';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { sessionToasts, utilityToasts } from '@/utils/toast';

interface SidebarProps {
  open: boolean;
}

// Helper function to format relative time
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

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentView } = useAppStore();
  const chatStore = useChatStore();
  const { createNewSession, setCurrentSession, clearMessages } = chatStore();
  const { sessions, loading, error, refresh } = useRecentSessions(5);

  // Track newly created sessions to show special indicators
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());

  // Listen for session creation and update events to refresh the recent sessions list
  useEffect(() => {
    const handleSessionCreated = (event: any) => {
      console.log('[Sidebar] Session created event received', event.detail);

      // Mark this session as new if the flag is set
      if (event.detail?.isNew && event.detail?.sessionId) {
        setNewSessionIds(prev => new Set(prev).add(event.detail.sessionId));

        // Remove the "new" status after 5 seconds to avoid clutter
        setTimeout(() => {
          setNewSessionIds(prev => {
            const updated = new Set(prev);
            updated.delete(event.detail.sessionId);
            return updated;
          });
        }, 5000);
      }

      // Refresh for any session
      if (event.detail?.sessionId) {
        console.log('[Sidebar] Refreshing recent sessions for session:', event.detail.sessionId);
        refresh();
      }
    };

    const handleSessionSaved = (event: any) => {
      console.log('[Sidebar] Session saved event received, refreshing recent sessions', event.detail);

      // Session was saved to database, refresh the list
      if (event.detail?.sessionId) {
        setNewSessionIds(prev => new Set(prev).add(event.detail.sessionId));
        refresh();
      }
    };

    const handleSessionUpdated = (event: any) => {
      console.log('[Sidebar] Session updated event received, refreshing recent sessions', event.detail);

      // Remove "new" status when first message is added to a session
      if (event.detail?.hasFirstMessage && event.detail?.sessionId) {
        setNewSessionIds(prev => {
          const updated = new Set(prev);
          updated.delete(event.detail.sessionId);
          return updated;
        });

        refresh();
      }
    };

    const handleSessionTitleUpdated = (event: any) => {
      console.log('[Sidebar] Session title updated event received, refreshing recent sessions', event.detail);

      // AI-generated title was updated in database, refresh the list
      if (event.detail?.sessionId) {
        refresh();
      }
    };

    window.addEventListener('sessionCreated', handleSessionCreated);
    window.addEventListener('sessionSaved', handleSessionSaved);
    window.addEventListener('sessionUpdated', handleSessionUpdated);
    window.addEventListener('sessionTitleUpdated', handleSessionTitleUpdated);

    return () => {
      window.removeEventListener('sessionCreated', handleSessionCreated);
      window.removeEventListener('sessionSaved', handleSessionSaved);
      window.removeEventListener('sessionUpdated', handleSessionUpdated);
      window.removeEventListener('sessionTitleUpdated', handleSessionTitleUpdated);
    };
  }, [refresh]);

  const navigationItems = [
    {
      id: 'chat',
      label: 'Chat',
      icon: ChatBubbleLeftRightIcon,
      path: '/',
      description: 'Start a conversation',
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: DocumentTextIcon,
      path: '/sessions',
      description: 'View past conversations',
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: ChartBarIcon,
      path: '/progress',
      description: 'Track your learning',
    },
    {
      id: 'knowledge-map',
      label: 'Knowledge Map',
      icon: AcademicCapIcon,
      path: '/knowledge-map',
      description: 'Explore concepts',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog6ToothIcon,
      path: '/settings',
      description: 'Configure the app',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const handleNavigation = (itemId: string, path: string) => {
    setCurrentView(itemId as any);
    navigate(path);
  };

  const handleNewChat = async () => {
    try {
      // Create a new session
      const sessionId = await createNewSession();
      console.log(`[Sidebar] Created new session: ${sessionId}`);

      // Navigate to chat view
      setCurrentView('chat');
      navigate('/');

      // Clear the current messages to start fresh
      clearMessages();

      console.log('[Sidebar] New chat session created and ready');
      sessionToasts.created();
    } catch (error) {
      console.error('[Sidebar] Failed to create new chat session:', error);
      sessionToasts.createError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleOpenSession = (session: any) => {
    try {
      console.log(`[Sidebar] handleOpenSession called with:`, {
        sessionId: session.id,
        title: session.title,
        messageCount: session.messages?.length || 0,
        sampleMessages: session.messages?.slice(0, 2).map((m: any) => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' })) || []
      });

      // Navigate to chat view FIRST
      setCurrentView('chat');
      navigate('/');

      // Clear current messages BEFORE loading the session
      clearMessages();

      // Load the session LAST (after clearing)
      console.log(`[Sidebar] Calling setCurrentSession...`);
      setCurrentSession(session);

      console.log(`[Sidebar] Opened session: ${session.id}`);
      sessionToasts.loaded();

      // Verify state after setting (call chatStore outside of setTimeout)
      const currentState = chatStore();
      console.log(`[Sidebar] State after session open:`, {
        currentSessionId: currentState.currentSession?.id,
        messagesInStore: currentState.messages.length,
        sampleMessages: currentState.messages.slice(0, 2).map((m: any) => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' }))
      });
    } catch (error) {
      console.error('[Sidebar] Failed to open session:', error);
      sessionToasts.loadError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (!open) {
    return null;
  }

  return (
    <aside className="sidebar w-64">
      <div className="flex flex-col h-full">
        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center space-x-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="font-medium">New Chat</span>
            </button>

            <button
              onClick={() => {
                // Open session manager instead of just logging
                setCurrentView('sessions');
                navigate('/sessions');
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <FolderOpenIcon className="w-4 h-4" />
              <span className="font-medium">Open Session</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.path)}
                  className={`sidebar-item w-full ${active ? 'active' : ''}`}
                  title={item.description}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Recent Sessions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Recent Sessions
            </h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  try {
                    refresh();
                    utilityToasts.success('Recent sessions refreshed');
                  } catch (error) {
                    utilityToasts.error('Failed to refresh sessions');
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Refresh recent sessions"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              {error && (
                <button
                  onClick={() => {
                  try {
                    refresh();
                    utilityToasts.success('Recent sessions refreshed');
                  } catch (error) {
                    utilityToasts.error('Failed to refresh sessions');
                  }
                }}
                  className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  title="Retry loading sessions"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Failed to load sessions</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No recent sessions found
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(new Map(sessions.map(session => [session.id, session])).values())
                .map((session) => (
                <button
                  key={`session_${session.id}`}
                  onClick={() => handleOpenSession(session)}
                  className={`w-full flex items-center space-x-2 px-2 py-2 text-sm rounded-lg transition-all text-left ${
                    newSessionIds.has(session.id)
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={session.metadata.description}
                >
                  {session.metadata.pinned ? (
                    <StarIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </p>
                      {newSessionIds.has(session.id) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.statistics.total_messages} {session.statistics.total_messages === 1 ? 'message' : 'messages'} • {formatRelativeTime(session.updated_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              onClick={() => {
                // TODO: Implement clear recent sessions
                console.log('Clear recent sessions');
              }}
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear Recent</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};