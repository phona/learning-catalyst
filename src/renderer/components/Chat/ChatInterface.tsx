import React from 'react';
import { useAssistantApi } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useNavigate, useParams } from 'react-router-dom';
import { ToolFallback } from './ToolFallback';
import { MarkdownText } from './MarkdownText';

/**
 * ChatInterface Component
 *
 * Renders the Thread component from assistant-ui.
 *
 * Notes:
 * - History adapters are wired via the RemoteThreadListRuntime adapter's `unstable_Provider`
 *   (not by wrapping <Thread/> manually here).
 * - When the URL is `/chat/:sessionId`, we ensure the runtime switches to that thread.
 */
export const ChatInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const api = useAssistantApi();

  const threadListItem = api.threadListItem.source ? api.threadListItem() : null;
  const threadState = threadListItem?.getState();
  const currentThreadId = threadState?.id;
  const currentRemoteId = threadState?.remoteId;
  const isHydrating = !threadState || !currentRemoteId;

  // Ensure the runtime thread matches the route on refresh / deep-link.
  React.useEffect(() => {
    if (!sessionId) return;

    // If we're already on the right thread (by id or remoteId), no-op.
    if (sessionId === currentThreadId || sessionId === currentRemoteId) return;

    api.threads().switchToThread(sessionId);
  }, [api, sessionId, currentThreadId, currentRemoteId]);

  // Keep the URL in sync when switching threads from the sidebar.
  React.useEffect(() => {
    const dispose = api.on('thread-list-item.switched-to', ({ threadId }) => {
      navigate(`/chat/${threadId}`);
    });
    return dispose;
  }, [api, navigate]);

  return (
    <div className="h-full bg-gray-50">
      <Thread
        key={currentThreadId}
        assistantMessage={{
          components: {
            Text: MarkdownText,
            ToolFallback: ToolFallback,
          },
        }}
      />
    </div>
  );
};

export default ChatInterface;
