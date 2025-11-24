import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Session } from '@/shared/types/session';
import { SessionManager } from '../SessionManager';
import { useRecentSessions } from '@/renderer/hooks/useRecentSessions';

const mockNavigate = vi.fn();
const mockSetCurrentSession = vi.fn();
const mockClearMessages = vi.fn();
const mockSetCurrentView = vi.fn();
const mockRefresh = vi.fn();
const mockClearError = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/renderer/hooks/useRecentSessions', () => ({
  useRecentSessions: vi.fn(),
}));

vi.mock('@/renderer/hooks/useChatStore', () => ({
  useChatStore: () => ({
    setCurrentSession: mockSetCurrentSession,
    clearMessages: mockClearMessages,
  }),
}));

vi.mock('@/renderer/stores/useAppStore', () => ({
  useAppStore: () => ({
    setCurrentView: mockSetCurrentView,
  }),
}));

vi.mock('@/renderer/utils/toast', () => ({
  sessionToasts: { loadError: vi.fn() },
  utilityToasts: { error: vi.fn() },
}));

const baseState = {
  sessions: [] as Session[],
  loading: false,
  error: null as string | null,
  refreshing: false,
  hasMore: false,
  loadMore: vi.fn(),
  retry: vi.fn(),
};
const mockedUseRecentSessions = useRecentSessions as unknown as vi.Mock;

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading view when loading', () => {
    mockedUseRecentSessions.mockReturnValue({
      ...baseState,
      loading: true,
    });

    render(<SessionManager />);

    expect(screen.getByText(/Loading Sessions/i)).toBeInTheDocument();
  });

  it('shows error view and wires retry/dismiss buttons', async () => {
    mockedUseRecentSessions.mockReturnValue({
      ...baseState,
      error: 'boom',
      refresh: mockRefresh,
      clearError: mockClearError,
    });

    render(<SessionManager />);

    expect(screen.getByText(/Error Loading Sessions/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  it('shows empty state when no sessions', () => {
    mockedUseRecentSessions.mockReturnValue({
      ...baseState,
      sessions: [],
      refresh: mockRefresh,
      clearError: mockClearError,
    });

    render(<SessionManager />);

    expect(screen.getByText(/No Sessions Found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start New Chat/i })).toBeInTheDocument();
  });

  it('opens a session card and routes to chat', async () => {
    const session: Session = {
      id: 'session-1',
      title: 'Physics 101',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      metadata: {
        title: 'Physics 101',
        tags: ['science'],
        pinned: true,
        description: 'Intro physics',
        category: 'learning',
        difficulty: 'medium',
      } as any,
      context: {},
      checkpoints: [],
      statistics: {
        totalMessages: 2,
        userMessages: 1,
        assistantMessages: 1,
        totalTokensUsed: 0,
        totalThinkingTokens: 0,
        sessionDuration: 0,
        averageResponseTime: 0,
        conceptsLearned: 0,
        checkpointsCreated: 0,
        productivityScore: 0,
        engagementScore: 0,
      },
    };

    mockedUseRecentSessions.mockReturnValue({
      ...baseState,
      sessions: [session],
      refresh: mockRefresh,
      clearError: mockClearError,
    });

    render(<SessionManager />);

    fireEvent.click(screen.getByText(/Physics 101/i));

    await waitFor(() => {
      expect(mockSetCurrentSession).toHaveBeenCalledWith(session);
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/session-1');
      expect(mockSetCurrentView).toHaveBeenCalledWith('chat');
    });
  });
});
