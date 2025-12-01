import React from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useRecentSessions } from '@/renderer/hooks/useRecentSessions';
import { useScrollDetection } from '@/renderer/hooks/useScrollDetection';
import { sessionToasts, utilityToasts } from '@/renderer/utils/toast';

// Import refactored components
import { SidebarNavigation } from './SidebarNavigation';
import { SessionList } from './SessionList';

// Import custom hooks
import { useSessionEvents } from './hooks/useSessionEvents';
import { useSidebarNavigation } from './hooks/useSidebarNavigation';

// Import types
import type { SidebarProps } from './Sidebar.types';
import { DEFAULT_SIDEBAR_CONFIG } from './Sidebar.types';

// Sidebar configuration
const sidebarConfig = {
  maxInitialSessions: DEFAULT_SIDEBAR_CONFIG.maxInitialSessions,
  showSessionStats: DEFAULT_SIDEBAR_CONFIG.showSessionStats,
  enableInfiniteScroll: DEFAULT_SIDEBAR_CONFIG.enableInfiniteScroll,
  scrollThreshold: DEFAULT_SIDEBAR_CONFIG.scrollThreshold,
  scrollDebounceMs: DEFAULT_SIDEBAR_CONFIG.scrollDebounceMs,
} as const;

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const {
    clearMessages,
    resetChatState,
    setCurrentSession,
    currentSession,
    saveCurrentSession,
  } = useChatStore();
  const { sessions, loading, error, refresh, hasMore, loadMore } = useRecentSessions(
    sidebarConfig.maxInitialSessions,
  );
  const { scrollRef, onNearBottom } = useScrollDetection({
    threshold: sidebarConfig.scrollThreshold,
    debounceMs: sidebarConfig.scrollDebounceMs,
  });

  // Use custom hooks for session events and navigation
  const { newSessionIds } = useSessionEvents({
    eventHandlers: {
      onSessionCreated: () => {
        void refresh();
      },
    },
    enableCleanup: true,
  });

  const { navigationItems, handleNavigation, navigateTo, currentView, isActive, activePath } =
    useSidebarNavigation();

  // Handle new chat start without creating a session until first message
  const handleNewChat = async (): Promise<void> => {
    try {
      // Reset chat state so the next sent message auto-creates a session
      resetChatState();

      // Clear any existing messages to start fresh
      clearMessages();

      // Navigate to the base chat route (no sessionId)
      navigateTo(`/`);

      console.log('[Sidebar] New chat initialized (session will be created on first message)');
    } catch (error) {
      console.error('[Sidebar] Failed to initialize new chat:', error);
      sessionToasts.createError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Handle session opening with proper state management
  const handleOpenSession = async (session: any): Promise<void> => {
    try {
      console.log(`[Sidebar] handleOpenSession called with:`, {
        sessionId: session.id,
        title: session.title,
        messageCount: session.messages?.length || 0,
      });

      // If this is the current session, just ensure we navigate to its route
      if (currentSession?.id === session.id) {
        console.log(`[Sidebar] Session ${session.id} is already active`);
        navigateTo(`/chat/${session.id}`);
        return;
      }

      // Save current session messages before switching if there are unsaved messages
      if (currentSession?.id && currentSession.messages && currentSession.messages.length > 0) {
        console.log(`[Sidebar] Saving current session before switching: ${currentSession.id}`);
        setTimeout(() => {
          saveCurrentSession().catch((error) => {
            console.warn('[Sidebar] Failed to save current session before switching:', error);
          });
        }, 100);
      }

      // Load the new session first to avoid race with navigation
      console.log(`[Sidebar] Calling setCurrentSession...`);
      await setCurrentSession(session.id);

      // Navigate after store is updated so the chat view has the correct session
      navigateTo(`/chat/${session.id}`);

      console.log(`[Sidebar] Opened session: ${session.id}`);
    } catch (error) {
      console.error('[Sidebar] Failed to open session:', error);
      sessionToasts.loadError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Handle session refresh
  const handleRefresh = async (): Promise<void> => {
    try {
      await refresh();
    } catch (error) {
      console.warn('[Sidebar] Failed to refresh sessions:', error);
    }
  };

  // Handle infinite scroll
  const handleInfiniteScroll = async (): Promise<void> => {
    try {
      if (hasMore && !loading) {
        await loadMore();
      }
    } catch (error) {
      console.warn('[Sidebar] Failed to load more sessions:', error);
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

        {/* Navigation Component */}
        <SidebarNavigation
          items={navigationItems}
          activePath={activePath}
          onItemClick={handleNavigation}
        />

        {/* Session List Component */}
        <SessionList
          sessions={sessions}
          newSessionIds={newSessionIds}
          activeSessionId={currentSession?.id}
          onOpenSession={handleOpenSession}
          onRefresh={handleRefresh}
          loading={loading}
          error={error}
          hasMore={hasMore}
          scrollRef={scrollRef}
          onNearBottom={handleInfiniteScroll}
        />
      </div>
    </aside>
  );
};
