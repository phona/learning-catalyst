import React from 'react';

export type AgentType = 'learning' | 'assessment' | 'practice' | 'tutoring';

interface AgentHeaderProps {
  agentType?: AgentType;
  workflowNode?: string;
}

const AGENT_CONFIG = {
  learning: {
    name: 'Learning Guide',
    icon: '📚',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  assessment: {
    name: 'Assessment Coach',
    icon: '📊',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  practice: {
    name: 'Practice Master',
    icon: '🎯',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  tutoring: {
    name: 'Tutoring Mentor',
    icon: '🤝',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
};

export const AgentHeader: React.FC<AgentHeaderProps> = ({ agentType, workflowNode }) => {
  const config = agentType ? AGENT_CONFIG[agentType] : AGENT_CONFIG.learning;

  return (
    <div className="px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center text-lg`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${config.color}`}>
            {config.name}
          </div>
          {workflowNode && (
            <div className="text-xs text-gray-500">
              Stage: {workflowNode}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentHeader;
