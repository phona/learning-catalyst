/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */


/**
 * useSession Hook - Proper service integration with store
 *
 * This hook combines the sessionStore (for state management) with
 * service calls (for API operations), following the proper separation
 * of concerns: store for state, services for API calls.
 */

import { useCallback } from 'react';
import { useSessionStore } from '@/renderer/stores/sessions/sessionStore';
import { useSessionService } from '@/renderer/services/services-provider';
import type { SessionDisplay, SessionSearchFilters, SessionCreateRequest } from '@/renderer/types';

export const useSession = () => {
  // Access store state and actions
  const sessionStore = useSessionStore();

  // Access service for API calls
  const sessionService = useSessionService();

  // Properly integrated actions that use services
  const loadSessions = useCallback(async (filters?: SessionSearchFilters) => {
    try {
      useSessionStore.getState().setLoading(true);
      useSessionStore.getState().setError(null);

      // Use service to load sessions
      const result = await sessionService.searchSessions(
        filters?.query || '',
        {
          agentType: filters?.agentType,
          difficulty: filters?.difficulty,
          limit: useSessionStore.getState().pageSize,
          ...filters
        }
      );

      // Update store with results
      useSessionStore.setState({
        sessions: result.sessions || [],
        totalSessions: result.total || 0,
        hasMore: result.hasMore || false,
        loading: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      console.error('Failed to load sessions:', error);
      useSessionStore.getState().setError(errorMessage);
      useSessionStore.getState().setLoading(false);
    }
  }, [sessionService]);

  const createSession = useCallback(async (request: SessionCreateRequest): Promise<SessionDisplay> => {
    try {
      useSessionStore.getState().setCreating(true);
      useSessionStore.getState().setError(null);

      // Use service to create session
      const session = await sessionService.createSession({
        title: request.title || 'New Learning Session',
        goals: request.tags || [],
        difficulty: request.difficulty || 'medium',
        agentType: request.agentType || 'learning',
        learningStyle: 'mixed'
      });

      // Update store with new session
      useSessionStore.getState().addSession(session);

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      console.error('Failed to create session:', error);
      useSessionStore.getState().setError(errorMessage);
      useSessionStore.getState().setCreating(false);
      throw error;
    }
  }, [sessionService]);

  const deleteSession = useCallback(async (sessionId: string) => {
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
  }, [sessionService]);

  const updateSessionData = useCallback(async (sessionId: string, updates: Partial<SessionDisplay>) => {
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
  }, []);

  const getCurrentSession = useCallback(async (sessionId: string): Promise<SessionDisplay | null> => {
    try {
      // Use service to get session
      const session = await sessionService.getSession(sessionId);
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }, [sessionService]);

  const createNewSession = useCallback(async (request?: SessionCreateRequest): Promise<SessionDisplay> => {
    const defaultRequest: SessionCreateRequest = {
      title: 'New Learning Session',
      agentType: 'learning',
      difficulty: 'medium',
      tags: [],
      ...request
    };

    return await createSession(defaultRequest);
  }, [createSession]);

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
