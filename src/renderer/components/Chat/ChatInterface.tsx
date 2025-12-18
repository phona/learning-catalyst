import React from 'react';
import { useThreadListItemRuntime } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { ToolFallback } from './ToolFallback';
import { useThreadAdapter } from '@/renderer/contexts/ThreadAdapterContext';

/**
 * ChatInterface Component
 *
 * Renders the Thread component from assistant-ui.
 * Must be wrapped with unstable_Provider to enable history loading when switching threads.
 * Uses remoteId as key to force re-mount when thread changes.
 */
export const ChatInterface: React.FC = () => {
  const { unstable_Provider } = useThreadAdapter();
  const ThreadHistoryProvider = unstable_Provider;

  // Get current thread's remoteId to use as key for re-mounting
  const threadRuntime = useThreadListItemRuntime({ optional: true });
  const threadState = threadRuntime?.getState();
  const threadKey = threadState?.remoteId || threadState?.id || 'default';

  return (
    <div className="h-full bg-gray-50">
      <ThreadHistoryProvider key={threadKey}>
        <Thread
          assistantMessage={{
            components: {
              ToolFallback: ToolFallback,
            },
          }}
        />
      </ThreadHistoryProvider>
    </div>
  );
};

export default ChatInterface;
