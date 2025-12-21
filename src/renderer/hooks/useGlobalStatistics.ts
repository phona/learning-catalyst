/**
 * Use Global Statistics Hook
 *
 * React hook for fetching and managing global statistics from the database.
 * Provides efficient, cached access to global message counts and other metrics.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useState, useEffect, useCallback } from 'react';
import { useSessionService } from '@/renderer/services/services-provider';

export interface GlobalStatistics {
  totalMessages: number;
  totalSessions: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  averageMessagesPerSession: number;
  totalTokensUsed: number;
}

export interface GlobalStatisticsState {
  statistics: GlobalStatistics | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  lastUpdated: Date | null;
}

export interface GlobalStatisticsActions {
  refresh: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export function useGlobalStatistics(
  cacheEnabled = true,
  refreshInterval: number | null = null,
): GlobalStatisticsState & GlobalStatisticsActions {
  const [state, setState] = useState<GlobalStatisticsState>({
    statistics: null,
    loading: true,
    error: null,
    refreshing: false,
    lastUpdated: null,
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

  const fetchStatistics = useCallback(
    async (isRefresh = false) => {
      try {
        console.log(
          '[useGlobalStatistics] Fetching statistics, service available:',
          !!sessionService,
        );
        setState((prev) => ({
          ...prev,
          loading: !isRefresh && prev.loading,
          refreshing: isRefresh,
          error: null,
        }));

        // Check if session service is available
        if (!sessionService) {
          console.log('[useGlobalStatistics] Session service not available');
          throw new Error(
            'Session service not available. Please wait for initialization to complete.',
          );
        }

        // Check cache if enabled
        if (cacheEnabled && !isRefresh && state.lastUpdated) {
          const now = new Date();
          const cacheAge = now.getTime() - state.lastUpdated.getTime();
          if (cacheAge < CACHE_DURATION && state.statistics) {
            console.log('[useGlobalStatistics] Using cached statistics, age:', cacheAge, 'ms');
            setState((prev) => ({
              ...prev,
              loading: false,
              refreshing: false,
            }));
            return;
          }
        }

        console.log('[useGlobalStatistics] Calling getGlobalStatistics');
        const statistics = await sessionService.getGlobalStatistics();
        console.log('[useGlobalStatistics] Got statistics:', statistics);

        setState((prev) => ({
          ...prev,
          statistics,
          loading: false,
          refreshing: false,
          error: null,
          lastUpdated: new Date(),
        }));
      } catch (error: unknown) {
        console.error('[useGlobalStatistics] Failed to fetch global statistics:', error);

        // Provide more user-friendly error messages
        let errorMessage = 'Failed to load global statistics';
        if (error instanceof Error) {
          errorMessage = error.message;
          if (errorMessage.includes('Database') && errorMessage.includes('not ready')) {
            errorMessage = 'Database is still initializing. Please wait a moment and try again.';
          } else if (errorMessage.includes('Session service not available')) {
            errorMessage = 'Session service is initializing. Please wait...';
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: errorMessage,
        }));
      }
    },
    [sessionService, cacheEnabled, state.lastUpdated, state.statistics],
  );

  // Initial load and refresh when dependencies change
  useEffect(() => {
    if (sessionService) {
      fetchStatistics();
    }
  }, [fetchStatistics, sessionService]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (!refreshInterval || !sessionService) {
      return;
    }

    console.log('[useGlobalStatistics] Setting up refresh interval:', refreshInterval, 'ms');
    const interval = setInterval(() => {
      console.log('[useGlobalStatistics] Auto-refreshing statistics');
      fetchStatistics(true);
    }, refreshInterval);

    return () => {
      console.log('[useGlobalStatistics] Cleaning up refresh interval');
      clearInterval(interval);
    };
  }, [refreshInterval, sessionService, fetchStatistics]);

  const refresh = useCallback(async () => {
    await fetchStatistics(true);
  }, [fetchStatistics]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const retryWithBackoff = useCallback(
    async (maxRetries = 3, baseDelay = 1000) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          await fetchStatistics(true);
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
    [fetchStatistics],
  );

  return {
    ...state,
    refresh,
    clearError,
    retry: () => retryWithBackoff(),
  };
}

/**
 * Simplified hook for just getting the global message count
 * Use this when you only need the total message count for performance
 */
function useGlobalMessageCount(): {
  count: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  } {
  const { statistics, loading, error, refresh } = useGlobalStatistics();

  return {
    count: statistics?.totalMessages || 0,
    loading,
    error,
    refresh,
  };
}
