import React from 'react';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { useSessionInit } from '../../hooks/useSessionInit';
import { MessageSkeleton } from '../UI';

/**
 * 💬 Chat Interface Component
 *
 * Main chat interface that orchestrates chat display and input.
 * Uses session initialization hook to handle complex loading and setup logic.
 *
 * 🎯 What It Does:
 * - Manages chat session loading and initialization
 * - Displays appropriate loading states with message skeletons
 * - Coordinates between chat display and input components
 * - Handles session-specific logic and state management
 *
 * 🔧 Features:
 * - Skeleton loading that matches chat message structure
 * - Session initialization through useSessionInit hook
 * - Clean separation of concerns with dedicated components
 * - Responsive layout that adapts to content
 *
 * 💡 Architecture:
 * - Delegates session logic to useSessionInit hook
 * - Uses MessageSkeleton for better perceived loading performance
 * - Composes ChatArea and ChatInput for functionality
 * - Maintains simple, focused component responsibility
 *
 * @example
 * ```tsx
 * <ChatInterface />
 * ```
 */
export const ChatInterface: React.FC = () => {
  let sessionState: ReturnType<typeof useSessionInit> | null = null;
  try {
    sessionState = useSessionInit();
  } catch (error) {
    console.error('[ChatInterface] useSessionInit failed:', error);
  }

  const loading = !!sessionState?.loading;

  // Show loading state while session is loading
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="space-y-4 p-4" data-testid="chat-skeleton-list">
            <MessageSkeleton isUser={false} />
            <MessageSkeleton isUser={true} />
            <MessageSkeleton isUser={false} />
          </div>
        </div>
        <div className="border-t p-4">
          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat area */}
      <ChatArea />

      {/* Chat input */}
      <ChatInput />
    </div>
  );
};
