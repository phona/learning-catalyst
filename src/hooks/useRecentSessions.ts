/**
 * Use Recent Sessions Hook
 *
 * React hook for fetching and managing recent sessions from the database.
 * Provides loading, error, and refresh functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/types/session';
import { useService } from './useAppServices';
import type { AppServices } from './useAppServices';

export interface RecentSessionsState {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  hasMore: boolean;
}

export interface RecentSessionsActions {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

export function useRecentSessions(limit: number = 10): RecentSessionsState & RecentSessionsActions {
  const [state, setState] = useState<RecentSessionsState>({
    sessions: [],
    loading: true,
    error: null,
    refreshing: false,
    hasMore: false,
  });

  // Get session service through dependency injection
  const sessionService = useService('sessionService');

  // Update loading state based on service availability
  useEffect(() => {
    if (!sessionService) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Session service is initializing...'
      }));
    }
  }, [sessionService]);

  const [currentLimit, setCurrentLimit] = useState(limit);

  const fetchSessions = useCallback(async (sessionLimit: number, isRefresh = false) => {
    try {
      console.log('[useRecentSessions] Fetching sessions, service available:', !!sessionService);
      setState(prev => ({
        ...prev,
        loading: !isRefresh && prev.loading,
        refreshing: isRefresh,
        error: null,
      }));

      // Check if session service is available
      if (!sessionService) {
        console.log('[useRecentSessions] Session service not available');
        throw new Error('Session service not available. Please wait for initialization to complete.');
      }

      console.log('[useRecentSessions] Calling getRecentSessions with limit:', sessionLimit);
      const result = await sessionService.getRecentSessions(sessionLimit);
      console.log('[useRecentSessions] Got sessions:', result.length);

      setState(prev => {
        // Always deduplicate sessions by ID to prevent duplicates
        const allSessions = isRefresh ? result : [...prev.sessions, ...result];
        const uniqueSessions = Array.from(new Map(allSessions.map(session => [session.id, session])).values());

        return {
          ...prev,
          sessions: uniqueSessions,
          loading: false,
          refreshing: false,
          error: null,
          hasMore: result.length >= sessionLimit,
        };
      });
    } catch (error: any) {
      console.error('[useRecentSessions] Failed to fetch recent sessions:', error);

      // Provide more user-friendly error messages
      let errorMessage = error.message || 'Failed to load sessions';
      if (errorMessage.includes('Database') && errorMessage.includes('not ready')) {
        errorMessage = 'Database is still initializing. Please wait a moment and try again.';
      } else if (errorMessage.includes('Session service not available')) {
        errorMessage = 'Session service is initializing. Please wait...';
      }

      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errorMessage,
      }));
    }
  }, [sessionService]);

  // Initial load and refresh when dependencies change
  useEffect(() => {
    if (sessionService) {
      fetchSessions(currentLimit);
    }
  }, [fetchSessions, currentLimit, sessionService]);

  const refresh = useCallback(async () => {
    await fetchSessions(currentLimit, true);
  }, [fetchSessions, currentLimit]);

  const loadMore = useCallback(async () => {
    if (!state.loading && !state.refreshing && state.hasMore) {
      const newLimit = currentLimit + limit;
      setCurrentLimit(newLimit);
      await fetchSessions(newLimit);
    }
  }, [state.loading, state.refreshing, state.hasMore, currentLimit, limit, fetchSessions]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retryWithBackoff = useCallback(async (maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fetchSessions(currentLimit, true);
        return; // Success, exit the retry loop
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error; // Last retry failed, throw the error
        }

        // Wait with exponential backoff before retrying
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [currentLimit, fetchSessions]);

  return {
    ...state,
    refresh,
    loadMore,
    clearError,
    retry: () => retryWithBackoff(),
  };
}