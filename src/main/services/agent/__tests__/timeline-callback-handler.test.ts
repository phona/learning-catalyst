import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimelineCallbackHandler } from '@/main/services/agent/timeline-callback-handler';
import type { ChatStatus } from '@/shared/types/electron-api/chat-api';

describe('TimelineCallbackHandler', () => {
  let mockOnStatus: ReturnType<typeof vi.fn>;
  let handler: TimelineCallbackHandler;

  beforeEach(() => {
    mockOnStatus = vi.fn();
    handler = new TimelineCallbackHandler(mockOnStatus, 'TestAgent');
  });

  describe('initialization', () => {
    it('should initialize with correct agent name', () => {
      expect(handler).toBeInstanceOf(TimelineCallbackHandler);
    });

    it('should use default agent name when not provided', () => {
      const defaultHandler = new TimelineCallbackHandler(mockOnStatus);
      expect(defaultHandler).toBeInstanceOf(TimelineCallbackHandler);
    });
  });

  describe('onAgentAction', () => {
    it('should emit thought event when agent has a log', async () => {
      const action = {
        log: 'Analyzing user question about blueprints',
        tool: null,
      };

      await handler.onAgentAction(action);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'thought',
          text: 'Analyzing user question about blueprints',
          agent: 'TestAgent',
          expandable: true,
        }),
      });
    });

    it('should emit tool start event when tool is called', async () => {
      const action = {
        tool: 'ReadFile',
        tool_input: { path: '/docs/architecture.md' },
        log: null,
      };

      await handler.onAgentAction(action);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'tool',
          tool: 'ReadFile',
          phase: 'start',
          agent: 'TestAgent',
          expandable: true,
        }),
      });
    });

    it('should emit both thought and tool when both are present', async () => {
      const action = {
        log: 'Need to check the file first',
        tool: 'ReadFile',
        tool_input: { path: '/docs/main.ts' },
      };

      await handler.onAgentAction(action);

      expect(mockOnStatus).toHaveBeenCalledTimes(2);
      expect(mockOnStatus).toHaveBeenNthCalledWith(1, {
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'thought',
          text: 'Need to check the file first',
        }),
      });
      expect(mockOnStatus).toHaveBeenNthCalledWith(2, {
        type: 'timeline_state',
        state: 'Executing: ReadFile',
        agent: 'TestAgent',
      });
    });

    it('should emit state change when tool is called', async () => {
      const action = {
        tool: 'SearchDatabase',
        tool_input: { query: 'architecture' },
      };

      await handler.onAgentAction(action);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_state',
        state: 'Executing: SearchDatabase',
        agent: 'TestAgent',
      });
    });

    it('should not emit anything when action is null or empty', async () => {
      await handler.onAgentAction(null);
      expect(mockOnStatus).not.toHaveBeenCalled();

      mockOnStatus.mockClear();
      await handler.onAgentAction({});
      expect(mockOnStatus).not.toHaveBeenCalled();
    });

    it('should format tool input as JSON with proper indentation', async () => {
      const action = {
        tool: 'ComplexTool',
        tool_input: { param1: 'value1', param2: { nested: true } },
      };

      await handler.onAgentAction(action);

      const call = mockOnStatus.mock.calls.find((call) =>
        call[0].event?.detail?.includes('"param1"')
      );
      expect(call).toBeDefined();
      expect(call[0].event.detail).toContain('"param1": "value1"');
    });
  });

  describe('onToolEnd', () => {
    it('should emit tool end event when tool completes successfully', async () => {
      const output = { content: 'File contents here' };

      await handler.onToolEnd(output);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'tool',
          tool: 'unknown',
          phase: 'end',
          detail: '{"content":"File contents here"}',
        }),
      });
    });

    it('should emit state change to "Complete"', async () => {
      await handler.onToolEnd('Some output');

      const calls = mockOnStatus.mock.calls;
      const stateCall = calls.find((call) => call[0].type === 'timeline_state');
      expect(stateCall).toEqual([
        {
          type: 'timeline_state',
          state: 'Complete',
          agent: 'TestAgent',
        },
      ]);
    });

    it('should handle string output directly', async () => {
      await handler.onToolEnd('Simple text output');

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          detail: 'Simple text output',
        }),
      });
    });

    it('should store and use tool name from previous onAgentAction', async () => {
      await handler.onAgentAction({ tool: 'TestTool' });
      mockOnStatus.mockClear();

      await handler.onToolEnd('Result');

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          tool: 'TestTool',
          phase: 'end',
        }),
      });
    });

    it('should reset tool name after completion', async () => {
      await handler.onAgentAction({ tool: 'Tool1' });
      await handler.onToolEnd('Result1');
      mockOnStatus.mockClear();

      await handler.onToolEnd('Result2');

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          tool: 'unknown',
        }),
      });
    });
  });

  describe('onToolError', () => {
    it('should emit tool error event when tool fails', async () => {
      const error = new Error('File not found');

      await handler.onToolError(error);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'tool',
          phase: 'error',
          detail: 'File not found',
        }),
      });
    });

    it('should emit state change to "Error"', async () => {
      const error = { message: 'Connection timeout' };

      await handler.onToolError(error);

      const stateCall = mockOnStatus.mock.calls.find(
        (call) => call[0].type === 'timeline_state'
      );
      expect(stateCall).toEqual([
        {
          type: 'timeline_state',
          state: 'Error',
          agent: 'TestAgent',
        },
      ]);
    });

    it('should reset tool name after error', async () => {
      await handler.onAgentAction({ tool: 'FailingTool' });
      mockOnStatus.mockClear();

      await handler.onToolError(new Error('Test error'));

      const endCall = mockOnStatus.mock.calls.find(
        (call) => call[0].event?.phase === 'error'
      );
      expect(endCall[0].event.tool).toBe('FailingTool');

      mockOnStatus.mockClear();
      await handler.onToolError(new Error('Another error'));

      const nextCall = mockOnStatus.mock.calls.find(
        (call) => call[0].event?.phase === 'error'
      );
      expect(nextCall[0].event.tool).toBe('unknown');
    });

    it('should handle non-Error objects', async () => {
      await handler.onToolError('String error');

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          detail: 'String error',
        }),
      });
    });
  });

  describe('onChainError', () => {
    it('should emit error event when chain fails', async () => {
      const error = new Error('Chain execution failed');

      await handler.onChainError(error);

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          type: 'error',
          text: 'Chain execution failed',
          expandable: true,
        }),
      });
    });

    it('should handle non-Error objects', async () => {
      await handler.onChainError({ message: 'Custom error' });

      expect(mockOnStatus).toHaveBeenCalledWith({
        type: 'timeline_event',
        event: expect.objectContaining({
          text: 'Custom error',
        }),
      });
    });

    it('should not emit state change on chain error', async () => {
      await handler.onChainError(new Error('Test'));

      const stateCalls = mockOnStatus.mock.calls.filter(
        (call) => call[0].type === 'timeline_state'
      );
      expect(stateCalls).toHaveLength(0);
    });
  });

  describe('event structure', () => {
    it('should generate unique event IDs', async () => {
      const action1 = { tool: 'Tool1' };
      const action2 = { tool: 'Tool2' };

      await handler.onAgentAction(action1);
      await handler.onAgentAction(action2);

      const calls = mockOnStatus.mock.calls.filter(
        (call) => call[0].type === 'timeline_event'
      );
      expect(calls[0][0].event.id).not.toBe(calls[1][0].event.id);
    });

    it('should include timestamp on all events', async () => {
      const beforeTime = Date.now();
      await handler.onAgentAction({ tool: 'TestTool' });
      const afterTime = Date.now();

      const event = mockOnStatus.mock.calls[0][0].event;
      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(event.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include correct agent name on all events', async () => {
      const customAgentHandler = new TimelineCallbackHandler(mockOnStatus, 'CustomAgent');
      await customAgentHandler.onAgentAction({ tool: 'TestTool' });

      const event = mockOnStatus.mock.calls[0][0].event;
      expect(event.agent).toBe('CustomAgent');
    });
  });
});
