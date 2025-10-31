import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';
import type { Session } from '@/types/session';

// Mock the dependencies
vi.mock('@/hooks/useRecentSessions', () => ({
  useRecentSessions: vi.fn(),
}));

vi.mock('@/hooks/useAppServices', () => ({
  useService: vi.fn(() => ({
    getRecentSessions: vi.fn(),
  })),
  ServiceContext: React.createContext(null),
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock session data
const createMockSession = (id: string, title: string, messageCount: number = 2): Session => ({
  id,
  title,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T12:00:00Z'),
  messages: Array.from({ length: messageCount }, (_, index) => ({
    id: `msg-${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
    content: `Message ${index + 1}: ${index % 2 === 0 ? 'User question' : 'Assistant response'}`,
    timestamp: new Date(`2024-01-01T10:${index.toString().padStart(2, '0')}:00Z`),
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    ...(index % 2 === 1 && {
      thinking_content: `Thinking process for response ${index + 1}`,
    }),
  })),
  metadata: {
    title,
    description: `Description for ${title}`,
    tags: ['test'],
    category: 'general',
    difficulty: 'intermediate',
    learning_objectives: [],
    topics_covered: [],
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
    total_messages: messageCount,
    user_messages: Math.ceil(messageCount / 2),
    assistant_messages: Math.floor(messageCount / 2),
    total_tokens_used: 0,
    total_thinking_tokens: 0,
    session_duration: 7200,
    average_response_time: 60,
    concepts_learned: 0,
    checkpoints_created: 0,
    productivity_score: 0,
    engagement_score: 0,
  },
});

describe('Sidebar Recent Session Integration', () => {
  let mockSetCurrentView: ReturnType<typeof vi.fn>;
  let mockSetCurrentSession: ReturnType<typeof vi.fn>;
  let mockClearMessages: ReturnType<typeof vi.fn>;
  let mockCreateNewSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Setup store mocks
    mockSetCurrentView = vi.fn();
    mockSetCurrentSession = vi.fn();
    mockClearMessages = vi.fn();
    mockCreateNewSession = vi.fn().mockResolvedValue('new-session-id');

    (useAppStore as any).mockReturnValue({
      setCurrentView: mockSetCurrentView,
    });

    (useChatStore as any).mockReturnValue({
      setCurrentSession: mockSetCurrentSession,
      clearMessages: mockClearMessages,
      createNewSession: mockCreateNewSession,
    });

    // Mock useRecentSessions
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    useRecentSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render sidebar with recent sessions section', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that the sidebar is rendered
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    expect(screen.getByText('No recent sessions found')).toBeInTheDocument();
  });

  it('should display recent sessions when available', () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    const mockSessions = [
      createMockSession('session-1', 'React Testing Tutorial', 4),
      createMockSession('session-2', 'TypeScript Basics', 2),
    ];

    useRecentSessions.mockReturnValue({
      sessions: mockSessions,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that sessions are displayed
    expect(screen.getByText('React Testing Tutorial')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Basics')).toBeInTheDocument();
    expect(screen.getByText('4 messages')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('should handle session click correctly', async () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    const mockSession = createMockSession('session-1', 'Test Session', 3);

    useRecentSessions.mockReturnValue({
      sessions: [mockSession],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the session button
    const sessionButton = screen.getByRole('button', { name: /Test Session/ });
    fireEvent.click(sessionButton);

    // Verify that all expected functions were called
    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledWith(mockSession);
      expect(mockClearMessages).toHaveBeenCalled();
      expect(mockSetCurrentView).toHaveBeenCalledWith('chat');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show loading state while fetching sessions', () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    useRecentSessions.mockReturnValue({
      sessions: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
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

  it('should show error state when session loading fails', () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    useRecentSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: 'Failed to connect to database',
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Check that error message is displayed
    expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
  });

  it('should handle new chat button click', async () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Find and click the new chat button
    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);

    // Verify that new session was created and navigation occurred
    await waitFor(() => {
      expect(mockCreateNewSession).toHaveBeenCalled();
      expect(mockSetCurrentView).toHaveBeenCalledWith('chat');
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(mockClearMessages).toHaveBeenCalled();
    });
  });

  it('should verify session data integrity after clicking', async () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    const originalSession = createMockSession('integrity-session', 'Integrity Test', 3);

    // Add some specific data to verify integrity
    originalSession.messages[1].thinking_content = 'Complex reasoning process';
    originalSession.messages[2].tool_calls = [{ name: 'search', arguments: '{"query": "test"}' }];

    useRecentSessions.mockReturnValue({
      sessions: [originalSession],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Click the session
    const sessionButton = screen.getByRole('button', { name: /Integrity Test/ });
    fireEvent.click(sessionButton);

    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledWith(originalSession);
    });

    // Verify the session data passed to setCurrentSession is intact
    const calledSession = mockSetCurrentSession.mock.calls[0][0] as Session;
    expect(calledSession.id).toBe('integrity-session');
    expect(calledSession.messages).toHaveLength(3);
    expect(calledSession.messages[1].thinking_content).toBe('Complex reasoning process');
    expect(calledSession.messages[2].tool_calls).toEqual([{ name: 'search', arguments: '{"query": "test"}' }]);
  });

  it('should handle multiple session clicks in sequence', async () => {
    const { useRecentSessions } = require('@/hooks/useRecentSessions');
    const session1 = createMockSession('session-1', 'First Session', 2);
    const session2 = createMockSession('session-2', 'Second Session', 4);

    useRecentSessions.mockReturnValue({
      sessions: [session1, session2],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );

    // Click first session
    const firstSessionButton = screen.getByRole('button', { name: /First Session/ });
    fireEvent.click(firstSessionButton);

    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledWith(session1);
    });

    // Click second session
    const secondSessionButton = screen.getByRole('button', { name: /Second Session/ });
    fireEvent.click(secondSessionButton);

    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledWith(session2);
    });

    // Verify both sessions were called in order
    expect(mockSetCurrentSession).toHaveBeenCalledTimes(2);
    expect(mockSetCurrentSession).toHaveBeenNthCalledWith(1, session1);
    expect(mockSetCurrentSession).toHaveBeenNthCalledWith(2, session2);
  });
});