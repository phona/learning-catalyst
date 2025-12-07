import React, { useMemo } from 'react';
import { MessagePrimitive, useAssistantState } from '@assistant-ui/react';
import { AssistantActionBar, BranchPicker, MessagePart, useThreadConfig } from '@assistant-ui/react-ui';
import type { ThreadMessage } from '@assistant-ui/react';
import { useAgents, useAgentStatus } from '@/renderer/stores/agents/agentStore';

type AgentRenderInfo = {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  color?: string;
  status?: 'online' | 'processing' | 'error';
};

const defaultAgent: AgentRenderInfo = {
  id: 'assistant',
  name: 'Assistant',
  role: 'Assistant',
  color: '#0ea5e9',
  status: 'online',
};

const SubAgentMessage: React.FC = () => {
  const message = useAssistantState((s) => s.message);
  const thread = useAssistantState((s) => s.thread);
  const agents = useAgents();

  const currentAgent = useMemo(() => resolveAgent(message, agents), [message, agents]);
  const previousAgent = useMemo(
    () => findPreviousAssistantAgent(message.index, thread.messages, agents),
    [message.index, thread.messages, agents],
  );

  const isFirstOfRun = !previousAgent || previousAgent.id !== currentAgent.id;
  const status = useAgentStatus(currentAgent.id);
  const derivedStatus: AgentRenderInfo['status'] =
    currentAgent.status ??
    (status
      ? status.isProcessing
        ? 'processing'
        : status.isOnline
          ? 'online'
          : 'error'
      : message.status?.type === 'running'
        ? 'processing'
        : message.status?.type === 'incomplete'
          ? 'error'
          : 'online');

  const { tools, assistantMessage: { components = {} } = {} } = useThreadConfig();

  const toolComponents = useMemo(
    () =>
      tools
        ? {
            by_name: Object.fromEntries(
              tools.map((t) => [t.unstable_tool.toolName, t.unstable_tool.render]),
            ),
            Fallback: components.ToolFallback,
          }
        : { Fallback: components.ToolFallback },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tools, components.ToolFallback],
  );

  const contentText = components.Text ?? MessagePart.Text;
  const contentEmpty = components.Empty;

  return (
    <MessagePrimitive.Root className="aui-assistant-message-root">
      <div className="aui-assistant-message-content">
        {isFirstOfRun && (
          <div className="flex items-center gap-2 mb-2" aria-label={chipAria(currentAgent, derivedStatus)}>
            {currentAgent.avatar ? (
              <img
                src={currentAgent.avatar}
                alt={`${currentAgent.name} avatar`}
                className="h-9 w-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div
                className="flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: currentAgent.color ?? defaultAgent.color }}
              >
                {initials(currentAgent.name)}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentAgent.name}
              </span>
              {currentAgent.role && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{currentAgent.role}</span>
              )}
            </div>
            <StatusDot status={derivedStatus} />
          </div>
        )}

        {!isFirstOfRun && previousAgent && previousAgent.id !== currentAgent.id && (
          <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Handoff from {previousAgent.name} to {currentAgent.name}
          </div>
        )}

        <MessagePrimitive.Content
          components={{
            Text: contentText,
            Empty: contentEmpty,
            tools: toolComponents,
          }}
        />
      </div>

      <BranchPicker />
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
};

const StatusDot: React.FC<{ status?: AgentRenderInfo['status'] }> = ({ status = 'online' }) => {
  const colors: Record<NonNullable<AgentRenderInfo['status']>, string> = {
    online: 'bg-emerald-500',
    processing: 'bg-amber-500 animate-pulse',
    error: 'bg-red-500',
  };
  const label: Record<NonNullable<AgentRenderInfo['status']>, string> = {
    online: 'online',
    processing: 'processing',
    error: 'error',
  };

  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <span className={`h-2.5 w-2.5 rounded-full ${colors[status]}`} aria-hidden />
      <span className="sr-only">Agent status: {label[status]}</span>
    </span>
  );
};

const initials = (name?: string) => (name ? name.trim().slice(0, 2).toUpperCase() : 'AI');

const chipAria = (agent: AgentRenderInfo, status?: AgentRenderInfo['status']) =>
  `Agent ${agent.name}${agent.role ? `, role ${agent.role}` : ''}${status ? `, status ${status}` : ''}`;

const resolveAgent = (message: ThreadMessage, agents: ReturnType<typeof useAgents>): AgentRenderInfo => {
  const meta = (message.metadata as any)?.custom ?? {};
  const fromMeta: AgentRenderInfo = {
    id: meta.agent?.id ?? meta.agentId ?? defaultAgent.id,
    name: meta.agent?.name ?? meta.agentName ?? defaultAgent.name,
    role: meta.agent?.role ?? meta.agentRole ?? defaultAgent.role,
    avatar: meta.agent?.avatar ?? meta.avatar,
    color: meta.agent?.color ?? meta.color,
    status: meta.agent?.status ?? meta.status,
  };

  const matched = agents.find((a) => a.id === fromMeta.id);
  return {
    ...defaultAgent,
    ...fromMeta,
    ...(matched
      ? {
          id: matched.id,
          name: matched.name,
          role: matched.type ?? matched.category ?? fromMeta.role,
          avatar: matched.avatar,
          color: matched.color,
        }
      : {}),
  };
};

const findPreviousAssistantAgent = (
  currentIndex: number,
  messages: ThreadMessage[],
  agents: ReturnType<typeof useAgents>,
): AgentRenderInfo | null => {
  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (candidate.role === 'assistant') {
      return resolveAgent(candidate, agents);
    }
  }
  return null;
};

export default SubAgentMessage;
