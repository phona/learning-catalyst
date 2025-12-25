import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';
import { useRecentSessions } from '../useRecentSessions';
import type { SessionService } from '@/renderer/services/session/session-service';

const mockGetRecentSessions = vi.fn();

vi.mock('@/renderer/services/services-context', () => ({
  useSessionService: (): SessionService => ({
    getRecentSessions: mockGetRecentSessions,
    getGlobalStatistics: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
    generateAITitle: vi.fn(),
    generateSessionId: vi.fn().mockReturnValue('test-session-id'),
    updateSessionTitle: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    searchSessions: vi.fn(),
  }),
}));

const makeSession = (id: string): SessionDisplay => ({
  id,
  title: `Session ${id}`,
  topic: `Topic for session ${id}`,
  difficulty: 'intermediate',
  status: 'active',
  progress: 50,
  agent: {
    type: 'learning',
    name: 'Learning Agent',
  },
  lastActivity: new Date().toISOString(),
  duration: '30 minutes',
});

describe('useRecentSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads sessions on mount and sets hasMore when hitting the limit', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => makeSession(`${i + 1}`));
    mockGetRecentSessions.mockResolvedValueOnce(sessions);

    const { result } = renderHook(() => useRecentSessions(10));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGetRecentSessions).toHaveBeenCalledWith(10);
  });

  it('surfaces friendly message when service throws', async () => {
    mockGetRecentSessions.mockRejectedValueOnce(new Error('Session service not available'));

    const { result } = renderHook(() => useRecentSessions(5));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/Session service is initializing/i);
  });

  it('skips loadMore when hasMore is false', async () => {
    // Returning fewer than limit => hasMore should be false
    mockGetRecentSessions.mockResolvedValueOnce([makeSession('1')]);
    const { result } = renderHook(() => useRecentSessions(5));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    // Should only be called once from initial load
    expect(mockGetRecentSessions).toHaveBeenCalledTimes(1);
  });
});
