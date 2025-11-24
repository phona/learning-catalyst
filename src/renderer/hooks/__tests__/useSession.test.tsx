import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from '@/renderer/stores/sessions/sessionStore';
import { useSession } from '../useSession';

// Mock the session service to avoid real IPC calls
const createSessionService = () => ({
  searchSessions: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
});

vi.mock('@/renderer/services/services-provider', () => {
  return {
    useSessionService: () => mockService,
  };
});

let mockService = createSessionService();

const resetStore = () => useSessionStore.getState().resetSessionState();

describe('useSession', () => {
  beforeEach(() => {
    mockService = createSessionService();
    resetStore();
  });

  it('loads sessions and normalizes display fields', async () => {
    mockService.searchSessions.mockResolvedValue({
      sessions: [
        {
          id: 's1',
          title: 'Algebra',
          difficulty: 'advanced',
          messages: [{}, {}],
          updatedAt: '2024-01-01T00:00:00Z',
          statistics: { sessionDuration: 180 },
          agent: { type: 'learning' },
        },
      ],
      total: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.loadSessions({ query: 'alg' });
    });

    const state = useSessionStore.getState();
    expect(mockService.searchSessions).toHaveBeenCalledWith('alg', expect.objectContaining({ limit: 20, query: 'alg' }));
    expect(state.sessions[0]).toMatchObject({
      id: 's1',
      messageCount: 2,
      duration: '3 min',
      difficulty: 'hard',
      agentType: 'learning',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('surfaces errors from loadSessions', async () => {
    mockService.searchSessions.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.loadSessions();
    });

    const state = useSessionStore.getState();
    expect(state.error).toBe('network down');
    expect(state.loading).toBe(false);
  });

  it('creates session and pushes into store', async () => {
    mockService.createSession.mockResolvedValue({
      id: 's2',
      title: 'New Session',
      difficulty: 'beginner',
      tags: ['tag'],
    });

    const { result } = renderHook(() => useSession());

    let created;
    await act(async () => {
      created = await result.current.createSession({ title: 'New Session', tags: ['tag'], difficulty: 'easy' });
    });

    const state = useSessionStore.getState();
    expect(created?.id).toBe('s2');
    expect(state.sessions.find((s) => s.id === 's2')).toBeTruthy();
    expect(state.creating).toBe(false);
  });

  it('deletes session via service and store', async () => {
    // seed store
    useSessionStore.setState({
      ...useSessionStore.getState(),
      sessions: [{ id: 's3', title: 'to delete', messageCount: 0, lastActivity: '', duration: '0', difficulty: 'easy', tags: [], isActive: false, hasUnreadMessages: false }],
      totalSessions: 1,
    });

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await result.current.deleteSession('s3');
    });

    const state = useSessionStore.getState();
    expect(mockService.deleteSession).toHaveBeenCalledWith('s3');
    expect(state.sessions).toHaveLength(0);
    expect(state.deleting).toBe(false);
  });

  it('gets current session through service', async () => {
    mockService.getSession.mockResolvedValue({
      id: 's4',
      title: 'Fetch',
      updatedAt: '2024-01-02T00:00:00Z',
    });

    const { result } = renderHook(() => useSession());

    let session;
    await act(async () => {
      session = await result.current.getCurrentSession('s4');
    });

    expect(mockService.getSession).toHaveBeenCalledWith('s4');
    expect(session?.id).toBe('s4');
  });
});
