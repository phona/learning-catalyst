import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/renderer/components/Chat/ChatInterface';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';
import { useSessionInit } from '@/renderer/hooks/useSessionInit';

// Mock Electron API
vi.mock('@/renderer/services/api/electron-api-client', () => ({
  createElectronAPIClient: vi.fn(() => ({
    chat: {
      startConversation: vi.fn(),
      sendMessage: vi.fn(),
      sendMessageStream: vi.fn(),
      getTypingIndicator: vi.fn(),
    },
    learning: {
      getSessions: vi.fn(),
    },
  })),
}));

// Mock service provider hooks to avoid requiring the provider tree
vi.mock('@/renderer/services/services-provider', () => ({
  useChatService: vi.fn(() => ({
    checkPracticeOpportunity: vi.fn().mockResolvedValue({ hasOpportunity: false }),
  })),
  useFileService: vi.fn(() => ({
    showOpenDialog: vi.fn().mockResolvedValue({ success: false }),
  })),
  useSessionService: vi.fn(() => ({})),
  useElectronAPIClient: vi.fn(() => ({
    chat: {},
    sessions: {},
    learning: {},
  })),
}));

// Mock chat store hook to avoid provider dependency
vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: vi.fn(() => ({
    isLoading: false,
    isStreaming: false,
    sendMessage: vi.fn(),
    sendMessageStream: vi.fn(),
    stopStreaming: vi.fn(),
    error: null,
    setError: vi.fn(),
  })),
}));

// Mock hooks
vi.mock('@/renderer/hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(() => ({
    loading: false,
    sessionId: 'test-session-123',
    session: {
      id: 'test-session-123',
      title: 'Test Session',
      messages: [],
      createdAt: new Date().toISOString(),
    },
  })),
}));

// Mock timeline store
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

describe('Timeline Integration', () => {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      sessionId: 'test-session-123',
      session: {
        id: 'test-session-123',
        title: 'Test Session',
        messages: [],
        createdAt: new Date().toISOString(),
      },
    });

    useTimelineStore.getState.mockReturnValue({
      eventsByConversation: {
        'test-session-123': [
          {
            id: 'event-1',
            type: 'thought',
            agent: 'LearningAgent',
            timestamp: Date.now(),
            text: 'Analyzing user question',
          },
          {
            id: 'event-2',
            type: 'tool',
            agent: 'LearningAgent',
            timestamp: Date.now() + 100,
            tool: 'ReadFile',
            phase: 'start',
            expandable: true,
          },
          {
            id: 'event-3',
            type: 'tool',
            agent: 'LearningAgent',
            timestamp: Date.now() + 200,
            tool: 'ReadFile',
            phase: 'end',
            detail: 'File contents loaded',
            expandable: true,
          },
        ],
      },
      activeStatesByConversation: {
        'test-session-123': 'Complete',
      },
      addEvent: vi.fn(),
      setState: vi.fn(),
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

  it('should render timeline when session is loaded', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });
  });

  it('should render all timeline events', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });

    // Check for thought
    expect(screen.getByText('Analyzing user question')).toBeInTheDocument();

    // Check for tool events
    expect(screen.getAllByText('ReadFile')).toHaveLength(2);
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('END')).toBeInTheDocument();
  });

  it('should render active state', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('should not render timeline when sessionId is null', async () => {
    const { useSessionInit } = await import('@/renderer/hooks/useSessionInit');
    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      sessionId: null,
      session: null,
    });

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.queryByText('Agent Processing')).not.toBeInTheDocument();
    });
  });

  it('should render tool detail when expanded', async () => {
    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });

    const showButton = screen.getByRole('button', { name: /show i\/o/i });
    expect(showButton).toBeInTheDocument();

    // Click to expand
    showButton.click();

    await waitFor(() => {
      expect(screen.getByText('▼ Hide I/O')).toBeInTheDocument();
      expect(screen.getByText('File contents loaded')).toBeInTheDocument();
    });
  });

  it('should handle real-time timeline updates', async () => {
    let eventCallback: ((data: any) => void) | undefined;

    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        eventCallback = handler;
      }
    });

    render(<ChatInterface />);

    // Simulate receiving a new timeline event via IPC
    act(() => {
      eventCallback?.({
        data: {
          type: 'chat:status',
          status: {
            type: 'timeline_event',
            event: {
              id: 'event-4',
              type: 'thought',
              agent: 'LearningAgent',
              timestamp: Date.now(),
              text: 'New thought from streaming',
            },
          },
        },
      });
    });

    await waitFor(() => {
      expect(useTimelineStore.getState().addEvent).toHaveBeenCalledWith(
        'test-session-123',
        expect.objectContaining({
          text: 'New thought from streaming',
        })
      );
    });
  });

  it('should handle multiple conversation IDs independently', async () => {
    const { useSessionInit } = await import('@/renderer/hooks/useSessionInit');
    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      sessionId: 'session-1',
      session: {
        id: 'session-1',
        title: 'Session 1',
        messages: [],
        createdAt: new Date().toISOString(),
      },
    });

    useTimelineStore.getState.mockReturnValue({
      eventsByConversation: {
        'session-1': [
          {
            id: 'event-1',
            type: 'thought',
            agent: 'Agent1',
            timestamp: Date.now(),
            text: 'Session 1 thought',
          },
        ],
      },
      activeStatesByConversation: {
        'session-1': 'Active',
      },
      addEvent: vi.fn(),
      setState: vi.fn(),
      clearTimeline: vi.fn(),
      clearAll: vi.fn(),
    });

    render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });

    // Verify only session-1 events are shown
    expect(screen.getByText('Session 1 thought')).toBeInTheDocument();
  });

  it('should update timeline when conversation changes', async () => {
    const { rerender } = render(<ChatInterface />);

    await waitFor(() => {
      expect(screen.getByText('Agent Processing')).toBeInTheDocument();
    });

    const { useSessionInit } = await import('@/renderer/hooks/useSessionInit');
    vi.mocked(useSessionInit).mockReturnValue({
      loading: false,
      sessionId: 'session-2',
      session: {
        id: 'session-2',
        title: 'Session 2',
        messages: [],
        createdAt: new Date().toISOString(),
      },
    });

    rerender(<ChatInterface />);

    await waitFor(() => {
      // Timeline should re-render with new session
      expect(screen.queryByText('Session 1 thought')).not.toBeInTheDocument();
    });
  });
});

// Helper to enable act() in async contexts
function act(fn: () => void) {
  fn();
}
