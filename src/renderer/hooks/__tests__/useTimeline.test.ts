import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeline } from '@/renderer/hooks/useTimeline';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';

// Mock the timeline store with a callable Zustand-style hook (hoisted)
const mockUseTimelineStore: any = vi.hoisted(() => {
  const fn: any = vi.fn();
  fn.mockImplementation((selector: any) => selector(fn.getState()));
  fn.getState = vi.fn();
  fn.subscribe = vi.fn((selector: any, callback: any) => {
    callback(selector(fn.getState()));
    return vi.fn();
  });
  fn.setState = vi.fn();
  return fn;
});

vi.mock('@/renderer/stores/chat/timelineStore', () => ({
  useTimelineStore: mockUseTimelineStore,
}));

describe('useTimeline', () => {
  const mockAddEvent = vi.fn();
  const mockSetState = vi.fn();
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    vi.clearAllMocks();
    useTimelineStore.getState.mockReturnValue({
      eventsByConversation: {},
      activeStatesByConversation: {},
      addEvent: mockAddEvent,
      setState: mockSetState,
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it('should not call addEventListener when conversationId is null', () => {
    renderHook(() => useTimeline(null));

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('should not call addEventListener when conversationId is undefined', () => {
    renderHook(() => useTimeline(undefined));

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('should add event listener when conversationId is provided', () => {
    renderHook(() => useTimeline('test-conv'));

    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useTimeline('test-conv'));

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );
  });

  it('should add event to store when timeline_event message is received', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-1',
            type: 'thought',
            agent: 'TestAgent',
            timestamp: Date.now(),
            text: 'Testing thought',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('test-conv', {
      id: 'event-1',
      type: 'thought',
      agent: 'TestAgent',
      timestamp: expect.any(Number),
      text: 'Testing thought',
    });
  });

  it('should set state when timeline_state message is received', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_state',
          state: 'Executing: ReadFile',
          agent: 'TestAgent',
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockSetState).toHaveBeenCalledWith('test-conv', 'Executing: ReadFile');
  });

  it('should handle thought event correctly', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-1',
            type: 'thought',
            agent: 'LearningAgent',
            timestamp: Date.now(),
            text: 'Analyzing question',
            expandable: true,
            detail: 'Detailed analysis...',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('test-conv', expect.objectContaining({
      type: 'thought',
      text: 'Analyzing question',
    }));
  });

  it('should handle tool start event', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-2',
            type: 'tool',
            agent: 'LearningAgent',
            timestamp: Date.now(),
            tool: 'ReadFile',
            phase: 'start',
            detail: '{ "path": "/file.md" }',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('test-conv', expect.objectContaining({
      type: 'tool',
      tool: 'ReadFile',
      phase: 'start',
    }));
  });

  it('should handle tool end event', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-3',
            type: 'tool',
            agent: 'LearningAgent',
            timestamp: Date.now(),
            tool: 'ReadFile',
            phase: 'end',
            detail: 'File contents',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('test-conv', expect.objectContaining({
      type: 'tool',
      tool: 'ReadFile',
      phase: 'end',
    }));
  });

  it('should handle tool error event', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-4',
            type: 'tool',
            agent: 'LearningAgent',
            timestamp: Date.now(),
            tool: 'ReadFile',
            phase: 'error',
            detail: 'File not found',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('test-conv', expect.objectContaining({
      type: 'tool',
      tool: 'ReadFile',
      phase: 'error',
    }));
  });

  it('should ignore messages without chat:status type', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'other-type',
        status: {},
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should ignore messages with missing status', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: {
        type: 'chat:status',
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should ignore non-object data', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('test-conv'));

    const event = {
      data: 'string',
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should ignore messages when conversationId changes', () => {
    const { rerender } = renderHook(
      (conversationId: string | null) => useTimeline(conversationId),
      { initialProps: 'conv-1' }
    );

    expect(window.addEventListener).toHaveBeenCalledTimes(1);

    const oldListener = window.addEventListener.mock.calls[0][1];

    rerender('conv-2');

    expect(window.removeEventListener).toHaveBeenCalledWith('message', oldListener);
    expect(window.addEventListener).toHaveBeenCalledTimes(2);
  });

  it('should use conversationId from props in handler', () => {
    let messageHandler: any;
    window.addEventListener = vi.fn((event, handler) => {
      messageHandler = handler;
    });

    renderHook(() => useTimeline('specific-conv-id'));

    const event = {
      data: {
        type: 'chat:status',
        status: {
          type: 'timeline_event',
          event: {
            id: 'event-1',
            type: 'thought',
            agent: 'Agent',
            timestamp: Date.now(),
            text: 'Test',
          },
        },
      },
    };

    act(() => {
      messageHandler(event);
    });

    expect(mockAddEvent).toHaveBeenCalledWith('specific-conv-id', expect.any(Object));
  });
});
