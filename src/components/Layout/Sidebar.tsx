import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
  PlusIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/hooks/useChatStore';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { useScrollDetection } from '@/hooks/useScrollDetection';
import { useGlobalMessageCount } from '@/hooks/useGlobalStatistics';
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
    return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentView } = useAppStore();
  const chatStore = useChatStore();
  const { createNewSession, setCurrentSession, clearMessages, currentSession, saveCurrentSession } = chatStore();
  const { sessions, loading, error, refresh, hasMore, loadMore } = useRecentSessions(10);
  const { scrollRef, onNearBottom } = useScrollDetection({
    threshold: 0.8,
    debounceMs: 100,
  });
  const { count: globalMessageCount, loading: globalCountLoading } = useGlobalMessageCount();

  // Track newly created sessions to show special indicators
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());

  // Set up infinite scroll when hasMore sessions
  useEffect(() => {
    if (hasMore && !loading) {
      console.log('[Sidebar] Setting up infinite scroll callback, hasMore:', hasMore, 'loading:', loading);
      onNearBottom(async () => {
        console.log('[Sidebar] Scroll near bottom detected, calling loadMore');
        try {
          await loadMore();
          console.log('[Sidebar] loadMore completed successfully');
        } catch (error) {
          console.warn('[Sidebar] Failed to load more sessions:', error);
        }
      });
    }
  }, [hasMore, loading, loadMore]); // Removed onNearBottom from dependencies

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
      id: 'knowledge',
      label: 'Knowledge',
      icon: AcademicCapIcon,
      path: '/progress',
      description: 'Progress, concepts, and discovery',
    },
    {
      id: 'discovery',
      label: 'Discovery',
      icon: FolderIcon,
      path: '/discovery',
      description: 'Parse concepts from local markdown files',
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

    // Handle consolidated Knowledge navigation
    if (itemId === 'knowledge') {
      // Navigate to progress by default, but we could add sub-navigation here
      navigate('/progress');
    } else if (itemId === 'discovery') {
      // Navigate to discovery page for local files
      navigate('/discovery');
    } else {
      navigate(path);
    }
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

      // If this is the current session, don't do anything
      if (currentSession?.id === session.id) {
        console.log(`[Sidebar] Session ${session.id} is already active`);
        return;
      }

      // Save current session messages before switching if there are unsaved messages
      if (currentSession && currentSession.id && currentSession.messages && currentSession.messages.length > 0) {
        console.log(`[Sidebar] Saving current session before switching: ${currentSession.id}`);
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
          saveCurrentSession().catch(error => {
            console.warn('[Sidebar] Failed to save current session before switching:', error);
          });
        }, 100);
      }

      // Load the new session
      console.log(`[Sidebar] Calling setCurrentSession...`);
      setCurrentSession(session);

      console.log(`[Sidebar] Opened session: ${session.id}`);
      // Visual feedback is sufficient - no toast needed for session loading
    } catch (error) {
      console.error('[Sidebar] Failed to open session:', error);
      sessionToasts.loadError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (!open) {
    return null;
  }

  return (
    <aside className="sidebar w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Quick Actions with enhanced styling */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200 font-medium shadow"
          >
            <PlusIcon className="w-5 h-5 text-white" />
            <span className="text-white">New Chat</span>
          </button>
        </div>

        {/* Navigation with enhanced interactions */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id, item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                    active
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={item.description}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Recent Sessions with enhanced styling */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-1 flex flex-col min-h-0">
          <div className="mb-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span>Recent Sessions</span>
              </h3>
              {/* Session statistics */}
              {sessions.length > 0 && (
                <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
				</div>
              )}
            </div>
            <button
              onClick={() => {
                try {
                  refresh();
                  // Visual feedback is sufficient - no toast needed for refresh
                } catch (error) {
                  utilityToasts.error('Failed to refresh sessions');
                }
              }}
              className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Refresh sessions"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center space-y-2 py-4 text-center">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm text-red-600 dark:text-red-400">Failed to load</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <DocumentTextIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No sessions yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start your first conversation!</p>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0"
              >
                {sessions.map((session) => {
                  const messageCount = session.messages?.length || 0;
                  const lastUpdated = session.updated_at || session.created_at || new Date();
                  const timeAgo = formatRelativeTime(new Date(lastUpdated));

                  return (
                  <button
                    key={`session_${session.id}`}
                    onClick={() => handleOpenSession(session)}
                    className={`group relative w-full text-left px-3 py-3 text-sm rounded-lg transition-colors duration-200 ${
                      currentSession?.id === session.id
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                        : newSessionIds.has(session.id)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title={`${session.title} - ${messageCount} messages • ${timeAgo}${currentSession?.id === session.id ? ' (Currently Active)' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Session status icon */}
                      <div className="flex-shrink-0 mt-0.5 relative">
                        {/* Active session indicator */}
                        {currentSession?.id === session.id && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></div>
                        )}
                      </div>

                      {/* Session content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-medium truncate pr-2 ${
                            currentSession?.id === session.id
                              ? 'text-primary-700 dark:text-primary-300 font-bold'
                              : newSessionIds.has(session.id)
                              ? 'text-primary-700 dark:text-primary-300'
                              : ''
                          }`}>
                            {session.title}
                          </span>
                          {/* Current session badge */}
                          {currentSession?.id === session.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-300 dark:border-primary-700">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Session metadata */}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{timeAgo}</span>
                          </span>
                          {messageCount > 0 && (
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                          )}
                          {messageCount > 0 && (
                            <span className="text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                              <ChatBubbleLeftRightIcon className="w-3 h-3" />
                              <span>{messageCount}</span>
                            </span>
                          )}
                          {/* Active status indicator */}
                          {currentSession?.id === session.id && messageCount > 0 && (
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                          )}
                          {currentSession?.id === session.id && (
                            <span className="text-primary-600 dark:text-primary-400 flex items-center space-x-1 font-medium">
                              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                              <span>Current</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover navigation indicator */}
                    {currentSession?.id !== session.id && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}

                    {/* New session indicator */}
                    {newSessionIds.has(session.id) && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading Indicator for Infinite Scroll */}
            {loading && hasMore && (
              <div className="mt-3 flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-500"></div>
                <span>Loading more sessions...</span>
              </div>
            )}

            {/* End of Sessions Indicator */}
            {!hasMore && sessions.length > 0 && (
              <div className="mt-3 flex items-center justify-center space-x-2 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <span>All sessions loaded</span>
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};