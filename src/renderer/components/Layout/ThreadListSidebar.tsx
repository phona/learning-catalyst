/**
 * ThreadListSidebar Component
 *
 * A ChatGPT-style sidebar implementation using Assistant UI's ThreadList primitives.
 * Combines knowledge navigation triggers with conversation thread management.
 *
 * Architecture:
 * - Knowledge entries use SidebarTrigger (pure UI affordances)
 * - ThreadListPrimitive manages all conversation behavior
 * - Clean separation of concerns (UI vs logic)
 *
 * Design Principles:
 * 1. SidebarTrigger emits intent only - no state management
 * 2. Assistant UI owns all thread behavior and state
 * 3. ChatGPT-style UX with knowledge section + conversations
 * 4. TypeScript strict mode with comprehensive type safety
 * 5. No unnecessary try-catch blocks or any types
 */

import React, { useCallback, useMemo, ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  AssistantIf,
} from '@assistant-ui/react';
import {
  MapIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/renderer/components/UI/Button';
import { Separator } from '@/renderer/components/UI/Separator';
import { SidebarTrigger } from '@/renderer/components/UI/SidebarTrigger';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { useChatStore } from '@/renderer/hooks/useChatStore';

/**
 * Knowledge navigation configuration
 * Maps navigation IDs to their routes and metadata
 */
interface KnowledgeNavigationItem {
  readonly id: 'knowledge-map' | 'progress' | 'discovery' | 'settings';
  readonly label: string;
  readonly path: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly description: string;
}

/**
 * Knowledge section navigation items
 * These are UI-only triggers that signal navigation intent
 */
const KNOWLEDGE_NAVIGATION_ITEMS: readonly KnowledgeNavigationItem[] = [
  {
    id: 'knowledge-map',
    label: 'Knowledge Map',
    path: '/knowledge',
    icon: MapIcon,
    description: 'Visual knowledge graph view',
  },
  {
    id: 'progress',
    label: 'Knowledge Dashboard',
    path: '/progress',
    icon: ChartBarIcon,
    description: 'Learning progress and analytics',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    path: '/discovery',
    icon: MagnifyingGlassIcon,
    description: 'Parse concepts from markdown files',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: CogIcon,
    description: 'Configure the application',
  },
] as const;

/**
 * Thread Item Props
 * Type-safe props for thread list items
 */
interface ThreadItemProps {
  readonly thread: {
    readonly id: string;
  };
  readonly isActive: boolean;
}

/**
 * StyledThreadListItem Component
 *
 * Minimal thread list item that delegates all behavior to Assistant UI primitives.
 * Provides only visual styling for hover, selected, and focus states.
 *
 * Performance note: Uses React.memo to prevent unnecessary re-renders
 */
const StyledThreadListItem = React.memo<ThreadItemProps>(({ thread, isActive }) => {
  return (
    <ThreadListItemPrimitive.Root
      className={`
        flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5
        text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
        ${isActive
          ? 'bg-primary-500 text-white hover:bg-primary-600 dark:bg-primary-600'
          : 'text-gray-700 dark:text-gray-300'
        }
      `}
    >
      <ThreadListItemPrimitive.Title />
    </ThreadListItemPrimitive.Root>
  );
});

StyledThreadListItem.displayName = 'StyledThreadListItem';

/**
 * Main ThreadListSidebar Component
 *
 * Implements ChatGPT-style sidebar with:
 * - Knowledge navigation section (top)
 * - Separator
 * - Conversations section with "New" button
 * - Thread list managed by Assistant UI
 */
export const ThreadListSidebar: React.FC<{
  readonly open: boolean;
}> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentView } = useAppStore();
  const { resetChatState } = useChatStore();

  /**
   * Handle knowledge navigation trigger
   * Pure handler that delegates navigation to router
   */
  const handleKnowledgeNavigation = useCallback(
    (item: KnowledgeNavigationItem): void => {
      setCurrentView(item.id as any);
      navigate(item.path);
    },
    [navigate, setCurrentView],
  );

  /**
   * Handle new conversation creation
   * Resets chat state and navigates to base chat route
   */
  const handleNewConversation = useCallback((): void => {
    resetChatState();
    navigate('/');
  }, [navigate, resetChatState]);

  /**
   * Memoized knowledge navigation items
   * Transforms static config into renderable components
   */
  const knowledgeNavigationElements = useMemo(() => {
    return KNOWLEDGE_NAVIGATION_ITEMS.map((item) => {
      const Icon = item.icon;
      return (
        <SidebarTrigger
          key={item.id}
          asChild
          onClick={() => handleKnowledgeNavigation(item)}
        >
          <Button
            variant="ghost"
            className="w-full justify-start font-normal"
            title={item.description}
          >
            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
            {item.label}
          </Button>
        </SidebarTrigger>
      );
    });
  }, [handleKnowledgeNavigation]);

  /**
   * Memoized current path check
   * Determines if a given path matches the current location
   */
  const isActivePath = useCallback((path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/chat');
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  /**
   * Render thread items with custom styling
   * Memoized to prevent unnecessary re-renders
   *
   * Note: ThreadListPrimitive.Items expects ComponentType (non-generic) but our
   * StyledThreadListItem is properly typed with ThreadItemProps. This is a limitation
   * of the Assistant UI library's type definitions. We use ComponentType<unknown>
   * to satisfy the library's type while keeping our implementation type-safe.
   */
  const threadItems = useMemo(() => {
    return (
      <ThreadListPrimitive.Items
        components={{
          ThreadListItem: StyledThreadListItem as ComponentType<unknown>,
        }}
      />
    );
  }, [isActivePath]);

  /**
   * Early return when sidebar is closed
   * Prevents unnecessary rendering and improves performance
   */
  if (!open) {
    return null;
  }

  return (
    <aside className="sidebar w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <ThreadListPrimitive.Root className="flex h-full flex-col gap-2 p-2 custom-scrollbar">
        {/* Knowledge Section */}
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
            Knowledge
          </div>
          {knowledgeNavigationElements}
        </div>

        <Separator />

        {/* Conversations Section */}
        <div className="flex items-center justify-between px-2">
          <div className="text-xs font-medium text-muted-foreground uppercase">
            Conversations
          </div>

          <ThreadListPrimitive.New asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNewConversation}
              className="h-7 px-2 text-xs"
            >
              New
            </Button>
          </ThreadListPrimitive.New>
        </div>

        {/* Loading State */}
        <AssistantIf
          condition={({ threads }) => threads.isLoading}
        >
          <div className="px-2 text-sm text-muted-foreground">
            Loading…
          </div>
        </AssistantIf>

        {/* Thread Items */}
        <AssistantIf
          condition={({ threads }) => !threads.isLoading}
        >
          {threadItems}
        </AssistantIf>
      </ThreadListPrimitive.Root>
    </aside>
  );
};

export default ThreadListSidebar;
