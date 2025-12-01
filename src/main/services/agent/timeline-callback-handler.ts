import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { ChatStatus, TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

export class TimelineCallbackHandler extends BaseCallbackHandler {
  name = 'TimelineCallbackHandler';
  private currentToolName: string | null = null;

  constructor(
    private onStatus: (status: ChatStatus) => void,
    private agentName: string = 'Agent'
  ) {
    super();
  }

  private emitTimelineEvent(payload: Omit<TimelineEventPayload, 'id' | 'timestamp'>) {
    this.onStatus({
      type: 'timeline_event',
      event: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        agent: this.agentName,
        ...payload,
      } as TimelineEventPayload,
    });
  }

  private emitStateChange(currentState: string) {
    this.onStatus({
      type: 'timeline_state',
      state: currentState,
      agent: this.agentName,
    });
  }

  onAgentAction(action: any): void | Promise<void> {
    const thought: string | undefined = action?.log;
    if (thought && thought.length > 0) {
      this.emitTimelineEvent({
        type: 'thought',
        text: thought,
        expandable: true,
      });
    }

    const toolName: string | undefined = action?.tool;
    if (toolName && toolName.length > 0) {
      this.currentToolName = toolName;
      this.emitTimelineEvent({
        type: 'tool',
        tool: toolName,
        phase: 'start',
        detail: action.tool_input
          ? JSON.stringify(action.tool_input, null, 2)
          : undefined,
        expandable: true,
      });
      this.emitStateChange(`Executing: ${toolName}`);
    }
  }

  onToolEnd(output: any): void | Promise<void> {
    this.emitTimelineEvent({
      type: 'tool',
      tool: this.currentToolName || 'unknown',
      phase: 'end',
      detail: typeof output === 'string'
        ? output
        : JSON.stringify(output, null, 2),
      expandable: true,
    });
    this.emitStateChange('Complete');
    this.currentToolName = null;
  }

  onToolError(err: any): void | Promise<void> {
    this.emitTimelineEvent({
      type: 'tool',
      tool: this.currentToolName || 'unknown',
      phase: 'error',
      detail: err?.message ? String(err.message) : String(err),
      expandable: true,
    });
    this.emitStateChange('Error');
    this.currentToolName = null;
  }

  onChainError(err: any): void | Promise<void> {
    this.emitTimelineEvent({
      type: 'error',
      text: err?.message ? String(err.message) : String(err),
      expandable: true,
    });
  }
}
