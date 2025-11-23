/**
 * Use Recent Sessions Hook
 *
 * React hook for fetching and managing recent sessions from the database.
 * Provides loading, error, and refresh functionality.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@/shared/types/session';
import type { SessionDisplay as ElectronSessionDisplay } from '@/shared/types/electron-api/learning-api';
import { useSessionService } from '@/renderer/services/services-provider';

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

export function useRecentSessions(limit = 10): RecentSessionsState & RecentSessionsActions {
  const [state, setState] = useState<RecentSessionsState>({
    sessions: [],
    loading: true,
    error: null,
    refreshing: false,
    hasMore: false,
  });

  // Get session service through dependency injection
  const sessionService = useSessionService();

  // Update loading state based on service availability
  useEffect(() => {
    if (!sessionService) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Session service is initializing...',
      }));
    }
  }, [sessionService]);

  // Add a safeguard to prevent excessive limit growth
  const [currentLimit, setCurrentLimit] = useState(limit);
  const maxLimit = 1000; // Maximum limit to prevent excessive growth

  // Use a ref to track the latest state to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Add a ref to track if loadMore is currently in progress to prevent multiple concurrent calls
  const isLoadingMoreRef = useRef(false);

  // Add a ref to track if initial load has been triggered to prevent duplicate initial loads
  const initialLoadTriggeredRef = useRef(false);

  const toSession = (display: ElectronSessionDisplay): Session => ({
    id: display.id,
    title: display.title ?? 'Session',
    createdAt: new Date((display as any).createdAt ?? Date.now()),
    updatedAt: new Date((display as any).updatedAt ?? Date.now()),
    messages: [],
    metadata: (display as any).metadata ?? {
      title: display.title ?? '',
      tags: (display as any).tags ?? [],
    },
    context: (display as any).context ?? {},
    checkpoints: [],
    statistics: {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      totalTokensUsed: 0,
      totalThinkingTokens: 0,
      sessionDuration: 0,
      averageResponseTime: 0,
      conceptsLearned: 0,
      checkpointsCreated: 0,
      productivityScore: 0,
      engagementScore: 0,
    },
  });

  const fetchSessions = useCallback(
    async (sessionLimit: number, isRefresh = false) => {
      try {
        console.log('[useRecentSessions] Fetching sessions, service available:', !!sessionService);
        setState((prev) => ({
          ...prev,
          loading: !isRefresh && prev.loading,
          refreshing: isRefresh,
          error: null,
        }));

        // Check if session service is available
        if (!sessionService) {
          console.log('[useRecentSessions] Session service not available');
          throw new Error(
            'Session service not available. Please wait for initialization to complete.',
          );
        }

        console.log('[useRecentSessions] Calling getRecentSessions with limit:', sessionLimit);
        const result = await sessionService.getRecentSessions(sessionLimit);
        console.log('[useRecentSessions] Got sessions:', result.length);

        setState((prev) => {
          // Always deduplicate sessions by ID to prevent duplicates
          const mapped = result.map(toSession);
          const allSessions = isRefresh ? mapped : [...prev.sessions, ...mapped];
          const uniqueSessions = Array.from(
            new Map(allSessions.map((session) => [session.id, session])).values(),
          );

          // Properly calculate hasMore:
          // 1. If we got fewer results than the limit, we've reached the end
          // 2. If we got the full limit but the total unique sessions didn't increase beyond what we expected, we've reached the end
          // 3. Otherwise, there might be more
          const gotFewerThanRequested = result.length < limit;
          const expectedNewSessions = Math.min(limit, sessionLimit - prev.sessions.length);
          const actualNewSessions = uniqueSessions.length - prev.sessions.length;
          const totalDidNotIncrease =
            !isRefresh && actualNewSessions < expectedNewSessions && !gotFewerThanRequested;
          const hasMore =
            !gotFewerThanRequested && !totalDidNotIncrease && uniqueSessions.length < maxLimit;

          console.log('[useRecentSessions] Session update:', {
            sessionLimit,
            resultCount: result.length,
            previousCount: prev.sessions.length,
            newTotalCount: uniqueSessions.length,
            expectedNewSessions,
            actualNewSessions,
            gotFewerThanRequested,
            totalDidNotIncrease,
            hasMore,
            isRefresh,
          });

          return {
            ...prev,
            sessions: uniqueSessions,
            loading: false,
            refreshing: false,
            error: null,
            hasMore,
          };
        });
      } catch (error: any) {
        console.error('[useRecentSessions] Failed to fetch recent sessions:', error);

        // Provide more user-friendly error messages
        let errorMessage = error.message || 'Failed to load sessions';
        if (errorMessage.includes('Database') && errorMessage.includes('not ready')) {
          errorMessage = 'Database is still initializing. Please wait a moment and try again.';
        } else if (
          errorMessage.includes('Session service not available') ||
          errorMessage.includes('Sessions API is not available')
        ) {
          errorMessage = 'Session service is initializing. Please wait...';
        } else if (errorMessage.includes('Session service is not initialized')) {
          errorMessage =
            'Session service is still initializing. The application may still be starting up. Please wait a moment.';
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: errorMessage,
        }));
      }
    },
    [sessionService, limit, maxLimit],
  );

  // Initial load only - don't refetch when currentLimit changes
  useEffect(() => {
    if (sessionService && !initialLoadTriggeredRef.current) {
      initialLoadTriggeredRef.current = true;
      fetchSessions(currentLimit, true);
    }
  }, [sessionService]); // Only run once when sessionService becomes available

  const refresh = useCallback(async () => {
    await fetchSessions(currentLimit, true);
  }, [fetchSessions, currentLimit]);

  const loadMore = useCallback(async () => {
    // Prevent multiple concurrent loadMore calls
    if (isLoadingMoreRef.current) {
      console.log('[useRecentSessions] loadMore skipped - already loading more');
      return;
    }

    // Use ref to get current state and avoid stale closures
    const currentState = stateRef.current;
    console.log(
      '[useRecentSessions] loadMore called, loading:',
      currentState.loading,
      'refreshing:',
      currentState.refreshing,
      'hasMore:',
      currentState.hasMore,
      'currentLimit:',
      currentLimit,
      'limit:',
      limit,
    );

    // Enhanced conditions to prevent unnecessary calls
    if (
      !currentState.loading &&
      !currentState.refreshing &&
      currentState.hasMore &&
      currentLimit < maxLimit &&
      currentState.sessions.length > 0
    ) {
      // Only load more if we have sessions

      isLoadingMoreRef.current = true;
      const newLimit = Math.min(currentLimit + limit, maxLimit);
      console.log('[useRecentSessions] Increasing limit from', currentLimit, 'to', newLimit);
      setCurrentLimit(newLimit);

      try {
        // Fetch sessions with the new limit, but don't treat it as a refresh
        await fetchSessions(newLimit, false);
        // The main fetchSessions function already handles hasMore calculation correctly
        // No need for additional checks here
      } finally {
        isLoadingMoreRef.current = false;
      }
    } else {
      if (currentLimit >= maxLimit) {
        console.log('[useRecentSessions] loadMore skipped - maximum limit reached');
        setState((prev) => ({ ...prev, hasMore: false }));
      } else if (!currentState.hasMore) {
        console.log('[useRecentSessions] loadMore skipped - no more sessions available');
      } else if (currentState.sessions.length === 0) {
        console.log('[useRecentSessions] loadMore skipped - no sessions to paginate from');
      } else {
        console.log('[useRecentSessions] loadMore skipped - conditions not met', {
          loading: currentState.loading,
          refreshing: currentState.refreshing,
          hasMore: currentState.hasMore,
          currentLimit,
          maxLimit,
          sessionCount: currentState.sessions.length,
        });
      }
    }
  }, [currentLimit, limit, fetchSessions, maxLimit]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const retryWithBackoff = useCallback(
    async (maxRetries = 3, baseDelay = 1000) => {
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
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    },
    [currentLimit, fetchSessions],
  );

  return {
    ...state,
    refresh,
    loadMore,
    clearError,
    retry: () => retryWithBackoff(),
  };
}
