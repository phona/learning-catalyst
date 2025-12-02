import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineView } from '@/renderer/components/Timeline/TimelineView';
import { useTimeline } from '@/renderer/hooks/useTimeline';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

// Mock the useTimeline hook
vi.mock('@/renderer/hooks/useTimeline', () => ({
  useTimeline: vi.fn(),
}));

// Mock the timeline store with a Zustand-like hook shape
const mockUseTimelineStore: any = vi.hoisted(() => {
  const fn: any = vi.fn();
  fn.mockImplementation((selector: any) => selector(fn.getState()));
  fn.getState = vi.fn();
  fn.setState = vi.fn();
  fn.subscribe = vi.fn((selector: any, callback: any) => {
    callback(selector(fn.getState()));
    return vi.fn();
  });
  return fn;
});

vi.mock('@/renderer/stores/chat/timelineStore', () => ({
  useTimelineStore: mockUseTimelineStore,
}));

describe('TimelineView', () => {
  const mockUseTimeline = vi.mocked(useTimeline);
  const mockStore = useTimelineStore as unknown as typeof mockUseTimelineStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getState.mockReturnValue({
      eventsByConversation: {},
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });
  });

  it('should call useTimeline with conversationId', () => {
    render(<TimelineView conversationId="test-conv-123" />);

    expect(mockUseTimeline).toHaveBeenCalledWith('test-conv-123');
  });

  it('should not render when there are no events', () => {
    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': [] },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.queryByText('Agent Processing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-container')).not.toBeInTheDocument();
  });

  it('should render when there are events', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'TestAgent',
        timestamp: Date.now(),
        text: 'Thinking about the question',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
  });

  it('should display active state when present', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'TestAgent',
        timestamp: Date.now(),
        text: 'Thinking',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: { 'test-conv': 'Executing: ReadFile' },
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.getByText('Executing: ReadFile')).toBeInTheDocument();
    expect(screen.getByText('●')).toBeInTheDocument(); // Pulse dot
  });

  it('should not display active state when not present', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'TestAgent',
        timestamp: Date.now(),
        text: 'Thinking',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.queryByText('●')).not.toBeInTheDocument();
  });

  it('should render thought bubble for thought events', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'LearningAgent',
        timestamp: Date.now(),
        text: 'I need to analyze the user question',
        expandable: true,
        detail: 'Detailed thought process here...',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.getByText('LearningAgent')).toBeInTheDocument();
    expect(screen.getByText('I need to analyze the user question')).toBeInTheDocument();
  });

  it('should render tool call for tool events', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'tool',
        agent: 'LearningAgent',
        timestamp: Date.now(),
        tool: 'ReadFile',
        phase: 'start',
        expandable: true,
        detail: 'Reading file content...',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.getByText('ReadFile')).toBeInTheDocument();
    expect(screen.getByText('START')).toBeInTheDocument();
  });

  it('should render multiple events in correct order', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'Agent',
        timestamp: Date.now(),
        text: 'First thought',
      },
      {
        id: 'event-2',
        type: 'tool',
        agent: 'Agent',
        timestamp: Date.now() + 100,
        tool: 'Tool1',
        phase: 'start',
      },
      {
        id: 'event-3',
        type: 'tool',
        agent: 'Agent',
        timestamp: Date.now() + 200,
        tool: 'Tool1',
        phase: 'end',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    const thoughtElements = screen.getAllByText(/First thought|Tool1|end/i);
    expect(thoughtElements.length).toBeGreaterThan(0);
  });

  it('should render with correct styling classes', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'Agent',
        timestamp: Date.now(),
        text: 'Test',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    const { container } = render(<TimelineView conversationId="test-conv" />);

    expect(container.firstChild).toHaveClass('timeline-container');
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).toHaveClass('border-gray-200');
  });

  it('should filter out unknown event types', () => {
    const events: TimelineEventPayload[] = [
      {
        id: 'event-1',
        type: 'thought',
        agent: 'Agent',
        timestamp: Date.now(),
        text: 'Thought',
      },
      {
        id: 'event-2',
        type: 'unknown' as any, // Invalid type
        agent: 'Agent',
        timestamp: Date.now(),
        text: 'Unknown',
      },
    ];

    mockStore.getState.mockReturnValue({
      eventsByConversation: { 'test-conv': events },
      activeStatesByConversation: {},
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<TimelineView conversationId="test-conv" />);

    expect(screen.getByText('Thought')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });
});
