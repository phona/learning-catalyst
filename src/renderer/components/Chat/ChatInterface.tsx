import React, { useEffect, useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { createIpcFetch } from '@/renderer/services/chat/ipcFetch';
import { AgentHeader, type AgentType } from './AgentHeader';
import CustomMessage from './CustomMessage';

export const ChatInterface: React.FC = () => {
  const [currentAgent, setCurrentAgent] = useState<AgentType>('learning');
  const [currentWorkflowNode, setCurrentWorkflowNode] = useState<string>();

  // Initialize chat runtime with LangGraph handler
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      fetch: createIpcFetch(),
    }),
    onMessage: (message) => {
      console.log('[ChatInterface] Message received:', message);
      // Update current agent and workflow node from message metadata
      if (message.agentType) {
        setCurrentAgent(message.agentType as AgentType);
      }
      if (message.workflowNode) {
        setCurrentWorkflowNode(message.workflowNode);
      }
    },
    onThreadStart: (thread) => console.log('[ChatInterface] Thread started:', thread),
    onError: (error) => console.error('[ChatInterface] Chat runtime error:', error),
    onFinish: (message) => console.log('[ChatInterface] Message completed:', message),
  });

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <AgentHeader agentType={currentAgent} workflowNode={currentWorkflowNode} />
      <div className="flex-1 overflow-hidden">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            components={{
              Message: CustomMessage,
            }}
          />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};

export default ChatInterface;
