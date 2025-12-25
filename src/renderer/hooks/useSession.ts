/**
 * useSession Hook - Proper service integration with store
 *
 * This hook combines the sessionStore (for state management) with
 * service calls (for API operations), following the proper separation
 * of concerns: store for state, services for API calls.
 */

import { useCallback } from 'react';
import { useSessionStore } from '@/renderer/stores/sessions/sessionStore';
import { useSessionService } from '@/renderer/services/services-context';
import type { SessionDisplay, SessionSearchFilters, SessionCreateRequest } from '@/renderer/types';
import type { SessionDisplay as ElectronSessionDisplay } from '@/shared/types/electron-api/sessions-api';

const mapDifficulty = (difficulty?: string): SessionDisplay['difficulty'] => {
  switch (difficulty) {
  case 'beginner':
  case 'easy':
    return 'easy';
  case 'intermediate':
  case 'medium':
    return 'medium';
  case 'advanced':
  case 'hard':
    return 'hard';
  default:
    return 'medium';
  }
};

const normalizeSessionDisplay = (session: ElectronSessionDisplay): SessionDisplay => {
  const src = session as Partial<SessionDisplay> &
    Partial<ElectronSessionDisplay> & {
      messages?: unknown[];
      statistics?: { sessionDuration?: number };
      updatedAt?: Date | string;
      difficulty?: string;
      agent?: { type?: string };
    };

  const stats = src.statistics;
  const updatedAt = src.updatedAt;
  return {
    id: session.id,
    title: session.title ?? 'Session',
    preview: src.preview ?? '',
    messageCount: src.messageCount ?? (Array.isArray(src.messages) ? src.messages.length : 0),
    lastActivity: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
    duration: stats?.sessionDuration ? `${Math.round(stats.sessionDuration / 60)} min` : '0 min',
    difficulty: mapDifficulty(src.difficulty),
    tags: src.tags ?? [],
    isActive: src.isActive ?? false,
    hasUnreadMessages: src.hasUnreadMessages ?? false,
    agentType: src.agentType ?? src.agent?.type,
    color: src.color,
  };
};

export const useSession = () => {
  // Access store state and actions
  const sessionStore = useSessionStore();

  // Access service for API calls
  const sessionService = useSessionService();

  // Properly integrated actions that use services
  const loadSessions = useCallback(
    async (filters?: SessionSearchFilters) => {
      try {
        useSessionStore.getState().setLoading(true);
        useSessionStore.getState().setError(null);

        // Use service to load sessions
        const result = await sessionService.searchSessions(filters?.query || '', {
          agentType: filters?.agentType,
          difficulty: filters?.difficulty,
          limit: useSessionStore.getState().pageSize,
          ...filters,
        });

        // Update store with results
        useSessionStore.setState({
          sessions: (result.sessions || []).map(normalizeSessionDisplay),
          totalSessions: result.total || 0,
          hasMore: result.hasMore || false,
          loading: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
        console.error('Failed to load sessions:', error);
        useSessionStore.getState().setError(errorMessage);
        useSessionStore.getState().setLoading(false);
      }
    },
    [sessionService],
  );

  const createSession = useCallback(
    async (request: SessionCreateRequest): Promise<SessionDisplay> => {
      try {
        useSessionStore.getState().setCreating(true);
        useSessionStore.getState().setError(null);

        // Use service to create session
        const session = normalizeSessionDisplay(
          await sessionService.createSession({
            title: request.title || 'New Learning Session',
            tags: request.tags || [],
            difficulty: request.difficulty || 'medium',
            agentType: request.agentType || 'learning',
            description: request.description,
          }),
        );

        // Update store with new session
        useSessionStore.getState().addSession(session);
        useSessionStore.getState().setCreating(false);

        return session;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
        console.error('Failed to create session:', error);
        useSessionStore.getState().setError(errorMessage);
        useSessionStore.getState().setCreating(false);
        throw error;
      }
    },
    [sessionService],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        useSessionStore.getState().setDeleting(true);
        useSessionStore.getState().setError(null);

        // Use service to delete session
        await sessionService.deleteSession(sessionId);

        // Update store
        useSessionStore.getState().removeSession(sessionId);
        useSessionStore.getState().setDeleting(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete session';
        console.error('Failed to delete session:', error);
        useSessionStore.getState().setError(errorMessage);
        useSessionStore.getState().setDeleting(false);
        throw error;
      }
    },
    [sessionService],
  );

  const updateSessionData = useCallback(
    async (sessionId: string, updates: Partial<SessionDisplay>) => {
      try {
        useSessionStore.getState().setUpdating(true);
        useSessionStore.getState().setError(null);

        // Update store
        useSessionStore.getState().updateSession(sessionId, updates);
        useSessionStore.getState().setUpdating(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
        console.error('Failed to update session:', error);
        useSessionStore.getState().setError(errorMessage);
        useSessionStore.getState().setUpdating(false);
        throw error;
      }
    },
    [],
  );

  const getCurrentSession = useCallback(
    async (sessionId: string): Promise<SessionDisplay | null> => {
      try {
        // Use service to get session
        const session = await sessionService.getSession(sessionId);
        return session ? normalizeSessionDisplay(session) : null;
      } catch (error) {
        console.error('Failed to get session:', error);
        return null;
      }
    },
    [sessionService],
  );

  const createNewSession = useCallback(
    async (request?: SessionCreateRequest): Promise<SessionDisplay> => {
      const defaultRequest: SessionCreateRequest = {
        title: 'New Learning Session',
        agentType: 'learning',
        difficulty: 'medium',
        tags: [],
        ...request,
      };

      return await createSession(defaultRequest);
    },
    [createSession],
  );

  return {
    // Store state
    ...sessionStore,

    // Properly integrated actions
    loadSessions,
    createSession,
    deleteSession,
    updateSessionData,
    getCurrentSession,
    createNewSession,
  };
};
