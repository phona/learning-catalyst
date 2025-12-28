import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useSessionStore } from '../sessions/sessionStore';

const base = {
  createdAt: new Date(),
  updatedAt: new Date(),
  preview: 'preview',
  tags: ['math'],
  agentType: 'learning',
  difficulty: 'beginner' as const,
  messages: [],
  messageCount: 0,
  lastActivity: 'just now',
  duration: '0 min',
  isActive: false,
  hasUnreadMessages: false,
};

const s1 = { id: 's1', title: 'One', ...base };
const s2 = {
  id: 's2',
  title: 'Two',
  ...base,
  agentType: 'tutor',
  difficulty: 'advanced' as const,
  tags: ['science']
};

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
    store.addSession(s1);
    store.addSession(s2);
    expect(useSessionStore.getState().sessions).toHaveLength(2);
    store.updateSession('s1', { title: 'New' });
    expect(useSessionStore.getState().sessions[1].title).toBe('New');
    store.setCurrentSession(s1);
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
    store.setFilters({ difficulty: 'beginner' });
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
    store.setSessions([s1, s2]);

    store.setSearchQuery('two');
    const filteredByTitle = useSessionStore.getState().sessions.filter((s) =>
      s.title.toLowerCase().includes('two')
    );
    expect(filteredByTitle).toHaveLength(1);

    store.setSearchQuery('');
    store.setFilters({ tags: ['math'] });
    const filteredByTag = useSessionStore.getState().sessions.filter((s) => s.tags.includes('math'));
    expect(filteredByTag).toHaveLength(1);

    store.setFilters({ agentType: 'tutor' });
    const filteredByAgent = useSessionStore.getState().sessions.filter((s) => s.agentType === 'tutor');
    expect(filteredByAgent).toHaveLength(1);
  });

  it('selection helpers select/deselect all', () => {
    const store = useSessionStore.getState();
    store.setSessions([s1, s2]);
    store.selectAllSessions();
    expect(useSessionStore.getState().selectedSessions.size).toBe(2);
    store.deselectSession('s1');
    expect(useSessionStore.getState().selectedSessions.has('s1')).toBe(false);
    store.clearSelection();
    expect(useSessionStore.getState().selectedSessions.size).toBe(0);
  });

  it('update and delete actions toggle flags and mutate state', async () => {
    const store = useSessionStore.getState();
    store.setSessions([s1]);

    await store.updateSessionData('s1', { title: 'Updated' });
    expect(useSessionStore.getState().sessions[0].title).toBe('Updated');
    expect(useSessionStore.getState().updating).toBe(false);

    await store.deleteSession('s1');
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().deleting).toBe(false);
  });

  it('createNewSession forwards defaults to createSession', async () => {
    const createSessionMock = vi.fn().mockResolvedValue({ id: 'new', title: 'New Learning Session' });
    useSessionStore.setState((state) => ({ ...state, createSession: createSessionMock }));

    const session = await useSessionStore.getState().createNewSession({ title: 'Custom' });
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Custom', agentType: 'learning', difficulty: 'medium' }),
    );
    expect(session.id).toBe('new');
  });

  it('refreshSessions delegates to loadSessions with current filters', async () => {
    const loadSessionsMock = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState((state) => ({
      ...state,
      loadSessions: loadSessionsMock,
      filters: { agentType: 'tutor' }
    }));
    await useSessionStore.getState().refreshSessions();
    expect(loadSessionsMock).toHaveBeenCalledWith({ agentType: 'tutor' });
  });

  it('resetSessionState restores initial values', () => {
    const store = useSessionStore.getState();
    store.setSessions([s1]);
    store.setSearchQuery('x');
    store.resetSessionState();
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().searchQuery).toBe('');
  });
});
