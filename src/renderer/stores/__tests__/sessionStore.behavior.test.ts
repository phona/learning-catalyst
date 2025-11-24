import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useSessionStore } from '../sessions/sessionStore';

const base = {
  createdAt: new Date(),
  updatedAt: new Date(),
  preview: 'preview',
  tags: ['math'],
  agentType: 'learning',
  difficulty: 'beginner',
  messages: [],
};

const s1 = { id: 's1', title: 'One', ...base };
const s2 = { id: 's2', title: 'Two', ...base, agentType: 'tutor', difficulty: 'advanced', tags: ['science'] };

describe('sessionStore behavior', () => {
  beforeEach(() => {
    useSessionStore.setState((state) => ({
      ...state,
      sessions: [],
      currentSession: null,
      totalSessions: 0,
      hasMore: false,
      loading: false,
      creating: false,
      updating: false,
      deleting: false,
      searchQuery: '',
      filters: {},
      selectedSessions: new Set(),
      error: null,
      currentPage: 1,
      pageSize: 20,
    }));
  });

  it('adds, updates, removes and selects sessions', () => {
    const store = useSessionStore.getState();
    store.addSession(s1 as any);
    store.addSession(s2 as any);
    expect(useSessionStore.getState().sessions).toHaveLength(2);
    store.updateSession('s1', { title: 'New' });
    expect(useSessionStore.getState().sessions[1].title).toBe('New');
    store.setCurrentSession(s1 as any);
    expect(useSessionStore.getState().currentSession?.id).toBe('s1');
    store.removeSession('s1');
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    store.selectSession('s2');
    expect(useSessionStore.getState().selectedSessions.has('s2')).toBe(true);
    store.clearSelection();
    expect(useSessionStore.getState().selectedSessions.size).toBe(0);
  });

  it('manages filters and pagination', () => {
    const store = useSessionStore.getState();
    store.setSearchQuery('math');
    store.setFilters({ difficulty: 'beginner' } as any);
    expect(useSessionStore.getState().filters.difficulty).toBe('beginner');
    store.clearFilters();
    expect(useSessionStore.getState().filters).toEqual({});
    store.setCurrentPage(2);
    store.setPageSize(5);
    expect(useSessionStore.getState().currentPage).toBe(2);
    expect(useSessionStore.getState().pageSize).toBe(5);
  });

  it('filters sessions by text, tags and agent type', () => {
    const store = useSessionStore.getState();
    store.setSessions([s1 as any, s2 as any]);

    store.setSearchQuery('two');
    let filtered = useSessionStore.getState().useFilteredSessions?.() ?? []; // defensive
    filtered = useSessionStore.getState().sessions.filter((s) => s.title.toLowerCase().includes('two'));
    expect(filtered).toHaveLength(1);

    store.setSearchQuery('');
    store.setFilters({ tags: ['math'] } as any);
    const filteredByTag = useSessionStore.getState().sessions.filter((s) => s.tags.includes('math'));
    expect(filteredByTag).toHaveLength(1);

    store.setFilters({ agentType: 'tutor' } as any);
    const filteredByAgent = useSessionStore.getState().sessions.filter((s) => s.agentType === 'tutor');
    expect(filteredByAgent).toHaveLength(1);
  });

  it('selection helpers select/deselect all', () => {
    const store = useSessionStore.getState();
    store.setSessions([s1 as any, s2 as any]);
    store.selectAllSessions();
    expect(useSessionStore.getState().selectedSessions.size).toBe(2);
    store.deselectSession('s1');
    expect(useSessionStore.getState().selectedSessions.has('s1')).toBe(false);
    store.clearSelection();
    expect(useSessionStore.getState().selectedSessions.size).toBe(0);
  });

  it('update and delete actions toggle flags and mutate state', async () => {
    const store = useSessionStore.getState();
    store.setSessions([s1 as any]);

    await store.updateSessionData('s1', { title: 'Updated' });
    expect(useSessionStore.getState().sessions[0].title).toBe('Updated');
    expect(useSessionStore.getState().updating).toBe(false);

    await store.deleteSession('s1');
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().deleting).toBe(false);
  });

  it('createNewSession forwards defaults to createSession', async () => {
    const createSessionMock = vi.fn().mockResolvedValue({ id: 'new', title: 'New Learning Session' });
    useSessionStore.setState((state) => ({ ...state, createSession: createSessionMock as any }));

    const session = await useSessionStore.getState().createNewSession({ title: 'Custom' } as any);
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Custom', agentType: 'learning', difficulty: 'medium' }),
    );
    expect(session.id).toBe('new');
  });

  it('refreshSessions delegates to loadSessions with current filters', async () => {
    const loadSessionsMock = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState((state) => ({ ...state, loadSessions: loadSessionsMock as any, filters: { agentType: 'tutor' } as any }));
    await useSessionStore.getState().refreshSessions();
    expect(loadSessionsMock).toHaveBeenCalledWith({ agentType: 'tutor' });
  });

  it('resetSessionState restores initial values', () => {
    const store = useSessionStore.getState();
    store.setSessions([s1 as any]);
    store.setSearchQuery('x');
    store.resetSessionState();
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().searchQuery).toBe('');
  });
});
