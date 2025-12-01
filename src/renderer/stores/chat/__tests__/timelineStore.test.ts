import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

describe('useTimelineStore', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      eventsByConversation: {},
      activeStatesByConversation: {},
    });
  });

  describe('initial state', () => {
    it('should have empty events and states by default', () => {
      const { result } = renderHook(() => useTimelineStore());
      expect(result.current.eventsByConversation).toEqual({});
      expect(result.current.activeStatesByConversation).toEqual({});
    });
  });

  describe('addEvent', () => {
    it('should add event to a conversation', () => {
      const { result } = renderHook(() => useTimelineStore());

      const event: TimelineEventPayload = {
        id: 'event-1',
        type: 'thought',
        agent: 'TestAgent',
        timestamp: Date.now(),
        text: 'Testing',
      };

      act(() => {
        result.current.addEvent('conv-1', event);
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(1);
      expect(result.current.eventsByConversation['conv-1'][0]).toEqual(event);
    });

    it('should append events to existing conversation', () => {
      const { result } = renderHook(() => useTimelineStore());

      const event1: TimelineEventPayload = {
        id: 'event-1',
        type: 'thought',
        agent: 'TestAgent',
        timestamp: Date.now(),
        text: 'First thought',
      };

      const event2: TimelineEventPayload = {
        id: 'event-2',
        type: 'tool',
        agent: 'TestAgent',
        timestamp: Date.now(),
        tool: 'ReadFile',
        phase: 'start',
      };

      act(() => {
        result.current.addEvent('conv-1', event1);
        result.current.addEvent('conv-1', event2);
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(2);
      expect(result.current.eventsByConversation['conv-1'][0]).toEqual(event1);
      expect(result.current.eventsByConversation['conv-1'][1]).toEqual(event2);
    });

    it('should handle multiple conversations independently', () => {
      const { result } = renderHook(() => useTimelineStore());

      const event1 = {
        id: 'event-1',
        type: 'thought' as const,
        agent: 'Agent1',
        timestamp: Date.now(),
        text: 'Thought 1',
      };

      const event2 = {
        id: 'event-2',
        type: 'thought' as const,
        agent: 'Agent2',
        timestamp: Date.now(),
        text: 'Thought 2',
      };

      act(() => {
        result.current.addEvent('conv-1', event1);
        result.current.addEvent('conv-2', event2);
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(1);
      expect(result.current.eventsByConversation['conv-2']).toHaveLength(1);
      expect(result.current.eventsByConversation['conv-1'][0]).toEqual(event1);
      expect(result.current.eventsByConversation['conv-2'][0]).toEqual(event2);
    });

    it('should preserve events from other conversations when adding new ones', () => {
      const { result } = renderHook(() => useTimelineStore());

      const event1 = {
        id: 'event-1',
        type: 'thought' as const,
        agent: 'Agent1',
        timestamp: Date.now(),
        text: 'Conv1 Event',
      };

      const event2 = {
        id: 'event-2',
        type: 'thought' as const,
        agent: 'Agent2',
        timestamp: Date.now(),
        text: 'Conv2 Event',
      };

      act(() => {
        result.current.addEvent('conv-1', event1);
        result.current.addEvent('conv-2', event2);
        result.current.addEvent('conv-1', {
          id: 'event-3',
          type: 'tool' as const,
          agent: 'Agent1',
          timestamp: Date.now(),
          tool: 'TestTool',
          phase: 'start',
        });
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(2);
      expect(result.current.eventsByConversation['conv-2']).toHaveLength(1);
    });
  });

  describe('setState', () => {
    it('should set active state for a conversation', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.setState('conv-1', 'Executing');
      });

      expect(result.current.activeStatesByConversation['conv-1']).toBe('Executing');
    });

    it('should update existing state', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.setState('conv-1', 'Executing');
      });
      act(() => {
        result.current.setState('conv-1', 'Complete');
      });

      expect(result.current.activeStatesByConversation['conv-1']).toBe('Complete');
    });

    it('should handle multiple conversations with different states', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.setState('conv-1', 'State 1');
        result.current.setState('conv-2', 'State 2');
      });

      expect(result.current.activeStatesByConversation['conv-1']).toBe('State 1');
      expect(result.current.activeStatesByConversation['conv-2']).toBe('State 2');
    });
  });

  describe('clearTimeline', () => {
    it('should clear events and state for a specific conversation', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.addEvent('conv-1', {
          id: 'event-1',
          type: 'thought',
          agent: 'Agent1',
          timestamp: Date.now(),
          text: 'Test',
        });
        result.current.addEvent('conv-2', {
          id: 'event-2',
          type: 'thought',
          agent: 'Agent2',
          timestamp: Date.now(),
          text: 'Test2',
        });
        result.current.setState('conv-1', 'Active');
        result.current.setState('conv-2', 'Active');
      });

      act(() => {
        result.current.clearTimeline('conv-1');
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(0);
      expect(result.current.activeStatesByConversation['conv-1']).toBe('');
      expect(result.current.eventsByConversation['conv-2']).toHaveLength(1);
      expect(result.current.activeStatesByConversation['conv-2']).toBe('Active');
    });

    it('should preserve events from other conversations', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.addEvent('conv-1', {
          id: 'event-1',
          type: 'thought',
          agent: 'Agent1',
          timestamp: Date.now(),
          text: 'Event 1',
        });
        result.current.addEvent('conv-1', {
          id: 'event-2',
          type: 'tool',
          agent: 'Agent1',
          timestamp: Date.now(),
          tool: 'Tool1',
          phase: 'start',
        });
        result.current.addEvent('conv-2', {
          id: 'event-3',
          type: 'thought',
          agent: 'Agent2',
          timestamp: Date.now(),
          text: 'Event 3',
        });
      });

      act(() => {
        result.current.clearTimeline('conv-1');
      });

      expect(result.current.eventsByConversation['conv-1']).toHaveLength(0);
      expect(result.current.eventsByConversation['conv-2']).toHaveLength(1);
      expect(result.current.eventsByConversation['conv-2'][0].text).toBe('Event 3');
    });
  });

  describe('clearAll', () => {
    it('should clear all events and states', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.addEvent('conv-1', {
          id: 'event-1',
          type: 'thought',
          agent: 'Agent1',
          timestamp: Date.now(),
          text: 'Test',
        });
        result.current.addEvent('conv-2', {
          id: 'event-2',
          type: 'thought',
          agent: 'Agent2',
          timestamp: Date.now(),
          text: 'Test2',
        });
        result.current.setState('conv-1', 'Active');
        result.current.setState('conv-2', 'Inactive');
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.eventsByConversation).toEqual({});
      expect(result.current.activeStatesByConversation).toEqual({});
    });
  });
});
