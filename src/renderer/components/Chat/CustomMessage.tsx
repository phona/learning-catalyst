import React from 'react';
import {
  MessagePrimitive,
  type Message as AssistantMessage,
} from '@assistant-ui/react';

type AgentType = 'learning' | 'assessment' | 'practice' | 'tutoring';

interface CustomMessageProps {
  message: AssistantMessage & {
    agentType?: AgentType;
    workflowNode?: string;
  };
}

const AGENT_STYLES = {
  learning: 'border-l-4 border-l-blue-500 bg-blue-50/30',
  assessment: 'border-l-4 border-l-purple-500 bg-purple-50/30',
  practice: 'border-l-4 border-l-green-500 bg-green-50/30',
  tutoring: 'border-l-4 border-l-orange-500 bg-orange-50/30',
};

const AGENT_BADGES = {
  learning: { label: 'Learning', color: 'bg-blue-100 text-blue-700' },
  assessment: { label: 'Assessment', color: 'bg-purple-100 text-purple-700' },
  practice: { label: 'Practice', color: 'bg-green-100 text-green-700' },
  tutoring: { label: 'Tutoring', color: 'bg-orange-100 text-orange-700' },
};

export const CustomMessage: React.FC<CustomMessageProps> = ({ message }) => {
  const agentType = message.agentType || 'learning';
  const styleClass = AGENT_STYLES[agentType];
  const badge = AGENT_BADGES[agentType];

  return (
    <MessagePrimitive.Root className={`au-message ${styleClass}`}>
      <div className="flex items-start gap-2 px-4 py-2">
        <MessagePrimitive.Icon className="mt-1">
          <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-medium">
            {badge.label[0]}
          </div>
        </MessagePrimitive.Icon>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
              {badge.label}
            </span>
            {message.workflowNode && (
              <span className="text-xs text-gray-500">
                {message.workflowNode}
              </span>
            )}
          </div>

          <MessagePrimitive.Content />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

export default CustomMessage;
