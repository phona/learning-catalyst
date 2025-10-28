/**
 * Use Recent Sessions Hook
 *
 * React hook for fetching and managing recent sessions from the database.
 * Provides loading, error, and refresh functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/types/session';
import { sessionService } from '@/services/sessionService';

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

  const [currentLimit, setCurrentLimit] = useState(limit);

  const fetchSessions = useCallback(async (sessionLimit: number, isRefresh = false) => {
    try {
      setState(prev => ({
        ...prev,
        loading: !isRefresh && prev.loading,
        refreshing: isRefresh,
        error: null,
      }));

      // Check if session service is available
      if (!sessionService) {
        throw new Error('Session service not available. Please wait for initialization to complete.');
      }

      const result = await sessionService.getRecentSessions(sessionLimit);

      setState(prev => ({
        ...prev,
        sessions: isRefresh ? result : [...prev.sessions, ...result],
        loading: false,
        refreshing: false,
        error: null,
        hasMore: result.length >= sessionLimit,
      }));
    } catch (error: any) {
      console.error('Failed to fetch recent sessions:', error);

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
  }, []);

  // Initial load
  useEffect(() => {
    fetchSessions(currentLimit);
  }, [fetchSessions, currentLimit]);

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