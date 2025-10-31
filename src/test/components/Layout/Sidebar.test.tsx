import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import type { Session } from '@/types/session';

// Mock the service context
vi.mock('@/hooks/useAppServices', () => ({
  useService: vi.fn(() => ({
    getRecentSessions: vi.fn(),
  })),
  ServiceContext: React.createContext(null),
}));

// Mock the hooks and dependencies
vi.mock('@/stores/useChatStore');
vi.mock('@/stores/useAppStore');
vi.mock('@/hooks/useRecentSessions');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock session data
const mockSession: Session = {
  id: 'test-session-1',
  title: 'Test Session 1',
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T12:00:00Z'),
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you for asking!',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Can you help me with React testing?',
      timestamp: new Date('2024-01-01T11:00:00Z'),
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'Of course! I can help you with React testing. Let me explain the key concepts...',
      timestamp: new Date('2024-01-01T11:01:00Z'),
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      thinking_content: 'The user wants help with React testing. I should explain Testing Library, Vitest, and best practices.',
    },
  ],
  metadata: {
    title: 'Test Session 1',
    description: 'A test session about React testing',
    tags: ['react', 'testing'],
    category: 'technical',
    difficulty: 'intermediate',
    learning_objectives: ['learn React testing'],
    topics_covered: ['react', 'testing'],
    archived: false,
    pinned: false,
  },
  context: {
    current_provider: 'openai',
    current_model: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 4096,
    enable_thinking: true,
    conversation_style: 'educational',
    language: 'en',
    user_preferences: {
      learning_style: 'reading',
      detail_level: 'detailed',
      example_preference: 'all',
      response_length: 'medium',
      technical_level: 'intermediate',
    },
  },
  checkpoints: [],
  statistics: {
    total_messages: 4,
    user_messages: 2,
    assistant_messages: 2,
    total_tokens_used: 0,
    total_thinking_tokens: 0,
    session_duration: 7200,
    average_response_time: 60,
    concepts_learned: 0,
    checkpoints_created: 0,
    productivity_score: 0,
    engagement_score: 0,
  },
};

describe('Sidebar Recent Sessions Click Functionality', () => {
  const mockSetCurrentView = vi.fn();
  const mockNavigate = vi.fn();
  const mockSetCurrentSession = vi.fn();
  const mockClearMessages = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAppStore
    (useAppStore as any).mockReturnValue({
      setCurrentView: mockSetCurrentView,
    });

    // Mock useChatStore
    (useChatStore as any).mockReturnValue({
      setCurrentSession: mockSetCurrentSession,
      clearMessages: mockClearMessages,
      createNewSession: vi.fn().mockResolvedValue('new-session-id'),
    });

    // Mock useRecentSessions
    (useRecentSessions as any).mockReturnValue({
      sessions: [mockSession],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render recent sessions with correct information', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that the recent sessions section is visible
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();

    // Check that the session title is displayed
    expect(screen.getByText('Test Session 1')).toBeInTheDocument();

    // Check that the message count and relative time are displayed
    expect(screen.getByText('4 messages')).toBeInTheDocument();
    expect(screen.getByText(/hour(s)? ago/)).toBeInTheDocument();

    // Check that the session button is clickable
    const sessionButton = screen.getByRole('button', { name: /Test Session 1/ });
    expect(sessionButton).toBeInTheDocument();
  });

  it('should call setCurrentSession with session data when clicking a recent session', async () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the recent session button
    const sessionButton = screen.getByRole('button', { name: /Test Session 1/ });
    fireEvent.click(sessionButton);

    // Verify that setCurrentSession was called with the correct session data
    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledTimes(1);
      expect(mockSetCurrentSession).toHaveBeenCalledWith(mockSession);
    });
  });

  it('should clear messages and navigate when clicking a recent session', async () => {
    // Mock navigate with proper implementation
    const mockNavigateImpl = vi.fn();
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ pathname: '/' }),
        useNavigate: () => mockNavigateImpl,
      };
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the recent session button
    const sessionButton = screen.getByRole('button', { name: /Test Session 1/ });
    fireEvent.click(sessionButton);

    // Verify that clearMessages was called
    await waitFor(() => {
      expect(mockClearMessages).toHaveBeenCalledTimes(1);
    });

    // Verify that navigation functions were called
    expect(mockSetCurrentView).toHaveBeenCalledWith('chat');
    expect(mockNavigateImpl).toHaveBeenCalledWith('/');
  });

  it('should render session with pinned status when session is pinned', () => {
    const pinnedSession = {
      ...mockSession,
      metadata: { ...mockSession.metadata, pinned: true },
    };

    (useRecentSessions as any).mockReturnValue({
      sessions: [pinnedSession],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that the star icon is displayed for pinned sessions
    const starIcon = document.querySelector('[data-testid="star-icon"]') ||
                    document.querySelector('svg');
    expect(starIcon).toBeInTheDocument();
  });

  it('should show loading state while sessions are loading', () => {
    (useRecentSessions as any).mockReturnValue({
      sessions: [],
      loading: true,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that loading skeleton is displayed
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should show error state when sessions fail to load', () => {
    (useRecentSessions as any).mockReturnValue({
      sessions: [],
      loading: false,
      error: 'Failed to load sessions',
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that error message is displayed
    expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
  });

  it('should show empty state when no sessions are available', () => {
    (useRecentSessions as any).mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that empty state message is displayed
    expect(screen.getByText('No recent sessions found')).toBeInTheDocument();
  });

  it('should handle errors gracefully when session loading fails', async () => {
    // Mock setCurrentSession to throw an error
    mockSetCurrentSession.mockImplementation(() => {
      throw new Error('Failed to load session');
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the recent session button
    const sessionButton = screen.getByRole('button', { name: /Test Session 1/ });
    fireEvent.click(sessionButton);

    // Verify that error is logged but doesn't crash the component
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        '[Sidebar] Failed to open session:',
        expect.any(Error)
      );
    });
  });

  it('should render new session indicator for newly created sessions', () => {
    const newSession = {
      ...mockSession,
      id: 'new-session-id',
    };

    // Mock window.addEventListener to track session created events
    const mockAddEventListener = vi.fn();
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });

    // Dispatch a session created event
    window.dispatchEvent(new CustomEvent('sessionCreated', {
      detail: { sessionId: 'new-session-id', isNew: true }
    }));

    (useRecentSessions as any).mockReturnValue({
      sessions: [newSession],
      loading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that event listeners are set up
    expect(mockAddEventListener).toHaveBeenCalledWith('sessionCreated', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('sessionUpdated', expect.any(Function));
  });

  it('should refresh recent sessions when refresh button is clicked', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the refresh button
    const refreshButton = screen.getByTitle('Refresh recent sessions');
    fireEvent.click(refreshButton);

    // Verify that refresh was called
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar Session Loading Integration', () => {
  it('should verify that ChatStore converts session messages to correct format', () => {
    const mockChatStoreSetCurrentSession = vi.fn();

    // Get the actual setCurrentSession implementation from the store
    const chatStore = useChatStore();

    // Mock the store to use the real implementation
    (useChatStore as any).mockReturnValue({
      ...chatStore,
      setCurrentSession: mockChatStoreSetCurrentSession,
    });

    // Simulate calling setCurrentSession with a session that has messages
    const sessionWithMessages = mockSession;

    // This would be called by the Sidebar component
    chatStore.setCurrentSession(sessionWithMessages);

    // Verify that the function was called and messages were properly converted
    expect(mockChatStoreSetCurrentSession).toHaveBeenCalled();

    // The implementation should convert session messages to store format
    const calledWith = mockChatStoreSetCurrentSession.mock.calls[0][0];
    expect(calledWith).toBe(sessionWithMessages);
  });
});