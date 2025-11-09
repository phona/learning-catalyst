/**
 * Enhanced Async State Hook
 *
 * Provides a comprehensive hook for managing asynchronous operations with
 * loading states, error handling, and comprehensive type safety.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AsyncState } from '../types/react-utils';

/**
 * Options for useAsyncState hook
 */
export interface UseAsyncStateOptions<TData, TError = Error> {
  /** Initial data */
  initialData?: TDatA;
  /** Whether to automatically reset error on new calls */
  resetErrorOnCall?: boolean;
  /** Whether to reset loading state on error */
  resetLoadingOnError?: boolean;
  /** Error handler */
  onError?: (error: TError) => void;
  /** Success handler */
  onSuccess?: (data: TDatA) => void;
  /** Retry configuration */
  retry?: {
    count: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Return value for useAsyncState hook
 */
export interface UseAsyncStateReturn<TData, TError = Error> extends AsyncState<TData, TError> {
  /** Execute the async operation */
  execute: (asyncFn: () => Promise<TData>) => Promise<TData>;
  /** Reset the state */
  reset: () => void;
  /** Set data manually */
  setData: (data: TDatA | ((prev: TDatA | null) => TDatA)) => void;
  /** Set error manually */
  setError: (error: TError | null) => void;
  /** Set loading manually */
  setLoading: (loading: boolean) => void;
  /** Retry the last operation */
  retry: () => Promise<TData | undefined>;
  /** Abort current operation */
  abort: () => void;
  /** Current attempt number */
  attempt: number;
}

/**
 * Hook for managing async operations with comprehensive state handling
 */
export function useAsyncState<TData, TError = Error>(
  options: UseAsyncStateOptions<TData, TError> = {}
): UseAsyncStateReturn<TData, TError> {
  const {
    initialData,
    resetErrorOnCall = true,
    resetLoadingOnError = true,
    onError,
    onSuccess,
    retry,
    timeout
  } = options;

  const [state, setState] = useState<AsyncState<TData, TError>>({
    data: initialData || null,
    loading: false,
    error: null,
    success: false
  });

  const [attempt, setAttempt] = useState(0);
  const lastAsyncFnRef = useRef<(() => Promise<TData>) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<TData>): Promise<TData> => {
    // Store the function for retry functionality
    lastAsyncFnRef.current = asyncFn;

    // Reset state if configured
    if (resetErrorOnCall) {
      setState(prev => ({ ...prev, error: null, success: false }));
    }

    setState(prev => ({ ...prev, loading: true }));
    setAttempt(prev => prev + 1);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Apply timeout if configured
      let resultPromise = asyncFn();
      if (timeout) {
        resultPromise = Promise.race([
          resultPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              const error = new Error(`Operation timed out after ${timeout}ms`);
              reject(error);
            }, timeout);
          })
        ]);
      }

      const result = await resultPromise;

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation was aborted');
      }

      setState({
        data: result,
        loading: false,
        error: null,
        success: true
      });

      onSuccess?.(result);
      return result;
    } catch (error) {
      const errorObj = error as TError;

      if (resetLoadingOnError) {
        setState(prev => ({ ...prev, loading: false }));
      }

      setState(prev => ({
        ...prev,
        error: errorObj,
        success: false
      }));

      onError?.(errorObj);
      throw errorObj;
    }
  }, [resetErrorOnCall, resetLoadingOnError, onError, onSuccess, timeout]);

  const reset = useCallback(() => {
    setState({
      data: initialData || null,
      loading: false,
      error: null,
      success: false
    });
    setAttempt(0);
    lastAsyncFnRef.current = null;
    abortControllerRef.current?.abort();
  }, [initialData]);

  const setData = useCallback((data: TDatA | ((prev: TDatA | null) => TDatA)) => {
    setState(prev => ({
      ...prev,
      data: typeof data === 'function' ? data(prev.data) : data,
      success: true,
      error: null
    }));
  }, []);

  const setError = useCallback((error: TError | null) => {
    setState(prev => ({
      ...prev,
      error,
      success: false,
      loading: false
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading
    }));
  }, []);

  const retryOperation = useCallback(async (): Promise<TData | undefined> => {
    if (!lastAsyncFnRef.current || !retry) {
      return undefined;
    }

    if (attempt >= retry.count) {
      return undefined;
    }

    // Calculate delay with backoff
    const delay = retry.backoff === 'exponential'
      ? retry.delay * Math.pow(2, attempt)
      : retry.delay * (attempt + 1);

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await execute(lastAsyncFnRef.current);
    } catch (error) {
      // Retry will be handled by the execute function
      return undefined;
    }
  }, [attempt, execute, retry]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      loading: false,
      error: new Error('Operation aborted'),
      success: false
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    setLoading,
    retry: retryOperation,
    abort,
    attempt
  };
}

/**
 * Hook for managing async operations with automatic retry
 */
export function useAsyncStateWithRetry<TData, TError = Error>(
  asyncFn: () => Promise<TData>,
  options: UseAsyncStateOptions<TData, TError> & {
    retryCount?: number;
    retryDelay?: number;
    autoExecute?: boolean;
  } = {}
) {
  const { retryCount = 3, retryDelay = 1000, autoExecute = true, ...asyncOptions } = options;

  const {
    execute,
    reset,
    ...state
  } = useAsyncState<TData, TError>({
    ...asyncOptions,
    retry: {
      count: retryCount,
      delay: retryDelay,
      backoff: 'exponential'
    }
  });

  // Auto-execute on mount if configured
  useEffect(() => {
    if (autoExecute) {
      execute(asyncFn);
    }
  }, [autoExecute, execute, asyncFn]);

  return {
    execute,
    reset,
    ...state
  };
}

/**
 * Hook for managing paginated async operations
 */
export function usePaginatedAsyncState<TData, TError = Error>(
  asyncFn: (page: number, pageSize: number) => Promise<{
    data: TDatA[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
  }>,
  options: UseAsyncStateOptions<{
    data: TDatA[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }, TError> & {
    initialPageSize?: number;
  } = {}
) {
  const { initialPageSize = 10, ...asyncOptions } = options;

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    execute,
    reset,
    data,
    ...asyncState
  } = useAsyncState<{
    data: TDatA[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }, TError>(asyncOptions);

  const loadPage = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    const result = await execute(() => asyncFn(page, size));
    setCurrentPage(page);
    setPageSize(size);
    return result;
  }, [execute, asyncFn, currentPage, pageSize]);

  const nextPage = useCallback(() => {
    if (data?.currentPage && data.currentPage < data.totalPages) {
      loadPage(data.currentPage + 1, pageSize);
    }
  }, [data, loadPage, pageSize]);

  const previousPage = useCallback(() => {
    if (data?.currentPage && data.currentPage > 1) {
      loadPage(data.currentPage - 1, pageSize);
    }
  }, [data, loadPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    if (data && page >= 1 && page <= data.totalPages) {
      loadPage(page, pageSize);
    }
  }, [data, loadPage, pageSize]);

  const refresh = useCallback(() => {
    if (data) {
      loadPage(data.currentPage, data.pageSize);
    }
  }, [data, loadPage]);

  return {
    ...asyncState,
    data: data?.data || [],
    page: data?.currentPage || 1,
    pageSize: data?.pageSize || pageSize,
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    hasNextPage: data ? data.currentPage < data.totalPages : false,
    hasPreviousPage: data ? data.currentPage > 1 : false,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    refresh,
    loadPage
  };
}

/**
 * Hook for managing search with debouncing
 */
export function useSearchAsyncState<TData, TError = Error>(
  searchFn: (query: string, options?: any) => Promise<TData[]>,
  options: UseAsyncStateOptions<TData[], TError> & {
    debounceMs?: number;
    minQueryLength?: number;
    initialQuery?: string;
  } = {}
) {
  const { debounceMs = 300, minQueryLength = 2, initialQuery = '', ...asyncOptions } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const {
    execute,
    reset,
    data,
    loading: isLoading,
    error,
    ...asyncState
  } = useAsyncState<TData[], TError>(asyncOptions);

  // Debounce query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= minQueryLength) {
      execute(() => searchFn(debouncedQuery));
      setSearchTerm(debouncedQuery);
    } else {
      reset();
      setSearchTerm(debouncedQuery);
    }
  }, [debouncedQuery, minQueryLength, execute, searchFn, reset]);

  return {
    ...asyncState,
    query,
    setQuery,
    searchTerm,
    setSearchTerm,
    searchResults: data || [],
    isSearching: isLoading
  };
}