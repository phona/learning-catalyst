import React from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { createIpcFetch } from '@/renderer/services/chat/ipcFetch';

export const ChatInterface: React.FC = () => {
  // Initialize chat runtime with LangGraph handler
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      fetch: createIpcFetch(),
    }),
    onMessage: (message) => console.log('[ChatInterface] Message received:', message),
    onThreadStart: (thread) => console.log('[ChatInterface] Thread started:', thread),
    onError: (error) => console.error('[ChatInterface] Chat runtime error:', error),
    onFinish: (message) => console.log('[ChatInterface] Message completed:', message),
  });

  return (
    <div className="h-full bg-gray-50">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
};

export default ChatInterface;
