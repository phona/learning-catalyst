import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionDisplay, SessionStatistics } from '@/shared/types/electron-api/sessions-api';
import { useRecentSessions } from '../useRecentSessions';
import type { SessionService } from '@/renderer/services/session/session-service';
import { Providers } from '@/test/utils/renderWithServices';

const mockGetRecentSessions = vi.fn();

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

const createSessionServiceMock = (): SessionService => ({
  getRecentSessions: mockGetRecentSessions,
  getGlobalStatistics: vi.fn(async () => ({} as SessionStatistics)),
  listSessions: vi.fn(async () => ({ sessions: [], total: 0, hasMore: false })),
  getSession: vi.fn(async () => null),
  generateAITitle: vi.fn(async () => 'Test Title'),
  generateSessionId: vi.fn(() => 'test-session-id'),
  updateSessionTitle: vi.fn(async () => {}),
  updateSession: vi.fn(async () => {}),
  createSession: vi.fn(async () => makeSession('created')),
  deleteSession: vi.fn(async () => {}),
  searchSessions: vi.fn(async () => ({ sessions: [], total: 0, hasMore: false })),
});

const createWrapper =
  (sessionService: SessionService) =>
    ({ children }: { children: React.ReactNode }) => (
      <Providers withAssistantProvider={false} serviceOverrides={{ sessionService }}>
        {children}
      </Providers>
    );

describe('useRecentSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads sessions on mount and sets hasMore when hitting the limit', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => makeSession(`${i + 1}`));
    mockGetRecentSessions.mockResolvedValueOnce(sessions);

    const wrapper = createWrapper(createSessionServiceMock());
    const { result } = renderHook(() => useRecentSessions(10), { wrapper });

    // The hook uses an "isRefresh" fetch path for initial load, which can flip `loading`
    // to false before sessions are populated. Wait on sessions to avoid flakiness.
    await waitFor(() => expect(result.current.sessions).toHaveLength(10));
    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toHaveLength(10);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockGetRecentSessions).toHaveBeenCalledWith(10);
  });

  it('surfaces friendly message when service throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetRecentSessions.mockRejectedValueOnce(new Error('Session service not available'));

    const wrapper = createWrapper(createSessionServiceMock());
    const { result } = renderHook(() => useRecentSessions(5), { wrapper });

    await waitFor(() => expect(result.current.error).toMatch(/Session service is initializing/i));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch(/Session service is initializing/i);
    expect(mockGetRecentSessions).toHaveBeenCalledWith(5);
  });

  it('skips loadMore when hasMore is false', async () => {
    // Returning fewer than limit => hasMore should be false
    mockGetRecentSessions.mockResolvedValueOnce([makeSession('1')]);
    const wrapper = createWrapper(createSessionServiceMock());
    const { result } = renderHook(() => useRecentSessions(5), { wrapper });
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    // Should only be called once from initial load
    expect(mockGetRecentSessions).toHaveBeenCalledTimes(1);
  });
});
