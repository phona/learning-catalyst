/**
 * ThreadListSidebar Component
 *
 * A ChatGPT-style sidebar using Assistant UI's ThreadList primitives.
 * Combines knowledge navigation triggers with conversation thread management.
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  AssistantIf,
  useAssistantApi,
} from '@assistant-ui/react';
import {
  MapIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  CogIcon,
  ArchiveBoxIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Button, Separator } from '@/renderer/shared/ui';
import { useAppStore } from '@/renderer/stores/useAppStore';

/**
 * Knowledge navigation configuration
 */
interface KnowledgeNavigationItem {
  readonly id: 'knowledge-map' | 'progress' | 'discovery' | 'settings';
  readonly label: string;
  readonly path: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly description: string;
}

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
    label: 'Dashboard',
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
 * Thread list item component - matches official example pattern
 */
const ThreadListItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const api = useAssistantApi();

  const handleClick = useCallback(() => {
    const threadState = api.threadListItem().getState();
    const threadId = threadState.id;

    // Navigate to chat page if not already there
    if (!location.pathname.startsWith('/chat')) {
      navigate('/chat');
    }

    // Switch to the clicked thread
    api.threads().switchToThread(threadId);
  }, [navigate, location.pathname, api]);

  return (
    <ThreadListItemPrimitive.Root className="group flex h-9 items-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-700 focus-visible:outline-none data-[active]:bg-gray-200 dark:data-[active]:bg-gray-600">
      <button
        onClick={handleClick}
        className="flex h-full flex-1 items-center truncate px-3 text-start text-sm text-gray-700 dark:text-gray-200"
      >
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </button>
      <ThreadListItemPrimitive.Archive asChild>
        <button
          className="mr-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Archive thread"
        >
          <ArchiveBoxIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </ThreadListItemPrimitive.Archive>
    </ThreadListItemPrimitive.Root>
  );
};

/**
 * Loading skeleton for thread list
 */
const ThreadListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-1 px-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-9 flex items-center px-3">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
};

/**
 * Main ThreadListSidebar Component
 */
export const ThreadListSidebar: React.FC<{ readonly open: boolean }> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentView } = useAppStore();

  const handleKnowledgeNavigation = useCallback(
    (item: KnowledgeNavigationItem): void => {
      setCurrentView(item.id as 'knowledge-map' | 'progress' | 'discovery' | 'settings');
      navigate(item.path);
    },
    [navigate, setCurrentView],
  );

  const handleNewChat = useCallback(() => {
    // Navigate to chat page if not already there
    if (!location.pathname.startsWith('/chat')) {
      navigate('/chat');
    }
    // The ThreadListPrimitive.New will handle creating/switching to new thread
  }, [navigate, location.pathname]);

  const knowledgeNavigationElements = useMemo(() => {
    return KNOWLEDGE_NAVIGATION_ITEMS.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname.startsWith(item.path);
      return (
        <Button
          key={item.id}
          variant="ghost"
          className={`w-full justify-start font-normal ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          title={item.description}
          onClick={() => handleKnowledgeNavigation(item)}
        >
          <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
          {item.label}
        </Button>
      );
    });
  }, [handleKnowledgeNavigation, location.pathname]);

  if (!open) {
    return null;
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <ThreadListPrimitive.Root className="flex h-full flex-col gap-2 p-2 overflow-hidden">
        {/* Knowledge Section */}
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Knowledge
          </div>
          {knowledgeNavigationElements}
        </div>

        <Separator />

        {/* Conversations Section */}
        <div className="flex items-center justify-between px-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Conversations
          </div>
          <ThreadListPrimitive.New asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleNewChat}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </ThreadListPrimitive.New>
        </div>

        {/* Loading State */}
        <AssistantIf condition={({ threads }) => threads.isLoading}>
          <ThreadListSkeleton />
        </AssistantIf>

        {/* Thread Items */}
        <AssistantIf condition={({ threads }) => !threads.isLoading}>
          <div className="flex-1 overflow-y-auto">
            <ThreadListPrimitive.Items
              components={{
                ThreadListItem: ThreadListItem,
              }}
            />

            <AssistantIf
              condition={({ threads }) => (threads.archivedThreadIds?.length ?? 0) > 0}
            >
              <div className="mt-3 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                History
              </div>
              <ThreadListPrimitive.Items
                archived={true}
                components={{
                  ThreadListItem: ThreadListItem,
                }}
              />
            </AssistantIf>
          </div>
        </AssistantIf>
      </ThreadListPrimitive.Root>
    </aside>
  );
};

export default ThreadListSidebar;
