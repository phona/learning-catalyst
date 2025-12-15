import React from 'react';
import { Thread } from '@assistant-ui/react-ui';
import { ToolFallback } from './ToolFallback';

export const ChatInterface: React.FC = () => {
  return (
    <div className="h-full bg-gray-50">
      <Thread
        assistantMessage={{
          components: {
            ToolFallback: ToolFallback,
          },
        }}
      />
    </div>
  );
};

export default ChatInterface;
