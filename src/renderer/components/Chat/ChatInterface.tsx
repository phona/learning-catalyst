import React from 'react';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { TimelineView } from '../Timeline';
import { ChatProcessingOverlay } from './ChatProcessingOverlay';
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
 * - Real-time agent processing timeline
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
const ChatInterfaceComponent: React.FC = () => {
  // Always call hooks at the top level - no conditional hook calls
  const sessionState = useSessionInit();

  const loading = !!sessionState?.loading;

  React.useEffect(() => {
    console.log('[ChatInterface] mounted');
    return () => {
      console.log('[ChatInterface] unmounted');
    };
  }, []);

  React.useEffect(() => {
    const sid = sessionState?.sessionId;
    const count = Array.isArray(sessionState?.session?.messages)
      ? sessionState.session.messages.length
      : 0;
    console.log('[ChatInterface] state', { loading, sessionId: sid, messageCount: count });
  }, [loading, sessionState?.sessionId, sessionState?.session?.messages]);

  // Show loading state while session is loading
  if (loading) {
    console.log('[ChatInterface] showing loading skeleton');
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

  const currentSessionId = sessionState?.sessionId;

  return (
    <div className="h-full flex flex-col">
      {/* Agent Processing Timeline */}
      {currentSessionId && <TimelineView conversationId={currentSessionId} />}

      {/* Processing overlay for heavy ops */}
      <ChatProcessingOverlay />

      {/* Chat area */}
      <ChatArea />

      {/* Chat input */}
      <ChatInput />
    </div>
  );
};

export const ChatInterface = React.memo(ChatInterfaceComponent);

export default ChatInterface;
