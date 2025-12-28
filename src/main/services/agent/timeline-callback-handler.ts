import type { ChatStatus } from '@/shared/types/electron-api/chat-api';

export interface TimelineCallbackHandlerDeps {
  onStatus: (status: ChatStatus) => void;
  agentName?: string;
}

interface ActionLog {
  log?: string | null;
  tool?: string | null;
  tool_input?: unknown;
}

export interface TimelineCallbackHandler {
  onAgentAction: (action: ActionLog | null) => Promise<void>;
  onToolEnd: (output: unknown) => Promise<void>;
  onToolError: (error: unknown) => Promise<void>;
  onChainError: (error: unknown) => Promise<void>;
}

export function createTimelineCallbackHandler(
  deps: TimelineCallbackHandlerDeps
): TimelineCallbackHandler {
  const { onStatus, agentName = 'UnknownAgent' } = deps;
  let currentTool: string | null = null;

  const generateId = () => Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const getTimestamp = () => Date.now();

  const emitTimelineEvent = (event: {
    type: 'thought' | 'tool' | 'state' | 'error';
    text?: string;
    tool?: string;
    phase?: 'start' | 'end' | 'error';
    detail?: string;
    expandable?: boolean;
  }) => {
    onStatus({
      type: 'timeline_event',
      event: {
        id: generateId(),
        type: event.type,
        agent: agentName,
        timestamp: getTimestamp(),
        text: event.text,
        tool: event.tool,
        phase: event.phase,
        detail: event.detail,
        expandable: event.expandable,
      },
    });
  };

  const emitTimelineState = (state: string) => {
    onStatus({
      type: 'timeline_state',
      state,
      agent: agentName,
    });
  };

  return {
    onAgentAction: async (action: ActionLog | null) => {
      if (!action) return;

      const { log, tool, tool_input } = action;

      // Emit thought if log is present
      if (log) {
        emitTimelineEvent({
          type: 'thought',
          text: log,
          expandable: true,
        });
      }

      // Emit tool start if tool is present
      if (tool) {
        currentTool = tool;
        emitTimelineEvent({
          type: 'tool',
          tool,
          phase: 'start',
          expandable: true,
          detail: tool_input ? JSON.stringify(tool_input, null, 2) : undefined,
        });

        emitTimelineState('Executing: ' + tool);
      }
    },

    onToolEnd: async (output: unknown) => {
      const tool = currentTool || 'unknown';

      emitTimelineEvent({
        type: 'tool',
        tool,
        phase: 'end',
        detail: typeof output === 'string' ? output : JSON.stringify(output, null, 2),
      });

      emitTimelineState('Complete');
      currentTool = null;
    },

    onToolError: async (error: unknown) => {
      const tool = currentTool || 'unknown';

      emitTimelineEvent({
        type: 'tool',
        tool,
        phase: 'error',
        detail: error instanceof Error ? error.message : String(error),
      });

      emitTimelineState('Error');
      currentTool = null;
    },

    onChainError: async (error: unknown) => {
      let errorText: string;
      if (error instanceof Error) {
        errorText = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorText = String((error as { message: unknown }).message);
      } else {
        errorText = String(error);
      }

      emitTimelineEvent({
        type: 'error',
        text: errorText,
        expandable: true,
      });
    },
  };
}
