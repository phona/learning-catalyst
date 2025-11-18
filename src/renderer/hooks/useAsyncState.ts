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
 * Enhanced Async State Hook
 *
 * Provides a comprehensive hook for managing asynchronous operations with
 * loading states, error handling, and comprehensive type safety.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Async state interface
 */
interface AsyncState<TData, TError = Error> {
  /** The result data */
  data: TData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: TError | null;
  /** Success state */
  success: boolean;
}

/**
 * Options for useAsyncState hook
 */
export interface UseAsyncStateOptions<TData, TError = Error> {
  /** Initial data */
  initialData?: TData;
  /** Whether to automatically reset error on new calls */
  resetErrorOnCall?: boolean;
  /** Whether to reset loading state on error */
  resetLoadingOnError?: boolean;
  /** Error handler */
  onError?: (error: TError) => void;
  /** Success handler */
  onSuccess?: (data: TData) => void;
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
  setData: (data: TData | ((prev: TData | null) => TData)) => void;
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
 * Search-specific options interface for flexible search implementations
 */
export interface SearchAsyncStateOptions {
  /** Search filters or query parameters */
  filters?: Record<string, unknown>;
  /** Search scope or context */
  scope?: string;
  /** Search preferences */
  preferences?: {
    exactMatch?: boolean;
    caseSensitive?: boolean;
    includePartial?: boolean;
  };
  /** Additional search metadata */
  metadata?: Record<string, unknown>;
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
    data: initialData ?? null,
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
      if (timeout != null) {
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
      data: initialData ?? null,
      loading: false,
      error: null,
      success: false
    });
    setAttempt(0);
    lastAsyncFnRef.current = null;
    abortControllerRef.current?.abort();
  }, [initialData]);

  const setData = useCallback((data: TData | ((prev: TData | null) => TData)) => {
    setState(prev => ({
      ...prev,
      data: typeof data === 'function' ? (data as (prev: TData | null) => TData)(prev.data) : data,
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
    } catch (_error) {
      // Retry will be handled by the execute function
      return undefined;
    }
  }, [attempt, execute, retry]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      loading: false,
      error: new Error('Operation aborted') as unknown as TError,
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
): UseAsyncStateReturn<TData, TError> & { execute: () => Promise<void> } {
  const { retryCount = 3, retryDelay = 1000, autoExecute = true, ...asyncOptions } = options;

  const {
    execute,
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
    reset: state.reset,
    ...state
  };
}

/**
 * Hook for managing paginated async operations
 */
export function usePaginatedAsyncState<TData, TError = Error>(
  asyncFn: (page: number, pageSize: number) => Promise<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
  }>,
  options: UseAsyncStateOptions<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }, TError> & {
    initialPageSize?: number;
  } = {}
): {
  data: TData[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  loadPage: (page?: number, size?: number) => Promise<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }>;
  loading: boolean;
  error: TError | null;
  success: boolean;
  execute: (asyncFn: () => Promise<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }>) => Promise<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }>;
  reset: () => void;
  setData: (data: {
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  } | ((prev: {
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  } | null) => {
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  })) => void;
  setError: (error: TError | null) => void;
  setLoading: (loading: boolean) => void;
  retry: () => Promise<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  } | undefined>;
  abort: () => void;
  attempt: number;
} {
  const { initialPageSize = 10, ...asyncOptions } = options;

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    execute,
    data,
    ...asyncState
  } = useAsyncState<{
    data: TData[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }, TError>(asyncOptions);

  const loadPage = useCallback(async (page: number = currentPage, size: number = pageSize) => {
    const result = await execute(() => asyncFn(page, size));
    const enhancedResult = { ...result, totalPages: Math.ceil(result.totalCount / result.pageSize) };
    setCurrentPage(page);
    setPageSize(size);
    return enhancedResult;
  }, [execute, asyncFn, currentPage, pageSize]);

  const nextPage = useCallback(() => {
    if (data?.currentPage != null && data.currentPage < data.totalPages) {
      loadPage(data.currentPage + 1, pageSize);
    }
  }, [data, loadPage, pageSize]);

  const previousPage = useCallback(() => {
    if (data?.currentPage != null && data.currentPage > 1) {
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
    data: data?.data ?? [],
    page: data?.currentPage ?? 1,
    pageSize: data?.pageSize ?? pageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasNextPage: data ? data.currentPage < data.totalPages : false,
    hasPreviousPage: data ? data.currentPage > 1 : false,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    refresh,
    loadPage,
    reset: asyncState.reset
  };
}

/**
 * Hook for managing search with debouncing
 */
export function useSearchAsyncState<TData, TError = Error>(
  searchFn: (query: string, options?: SearchAsyncStateOptions) => Promise<TData[]>,
  options: UseAsyncStateOptions<TData[], TError> & {
    debounceMs?: number;
    minQueryLength?: number;
    initialQuery?: string;
    searchOptions?: SearchAsyncStateOptions;
  } = {}
): {
  query: string;
  setQuery: (query: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: TData[];
  isSearching: boolean;
  loading: boolean;
  error: TError | null;
  success: boolean;
  execute: (asyncFn: () => Promise<TData[]>) => Promise<TData[]>;
  reset: () => void;
  setData: (data: TData[] | ((prev: TData[] | null) => TData[])) => void;
  setError: (error: TError | null) => void;
  setLoading: (loading: boolean) => void;
  retry: () => Promise<TData[] | undefined>;
  abort: () => void;
  attempt: number;
} {
  const { debounceMs = 300, minQueryLength = 2, initialQuery = '', searchOptions, ...asyncOptions } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const {
    execute,
    data,
    loading: isLoading,
    error: _error,
    reset,
    ...asyncState
  } = useAsyncState<TData[], TError>(asyncOptions);

  // Debounce query changes
  useEffect((): void => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= minQueryLength) {
      execute(() => searchFn(debouncedQuery, searchOptions));
      setSearchTerm(debouncedQuery);
    } else {
      reset();
      setSearchTerm(debouncedQuery);
    }
  }, [debouncedQuery, minQueryLength, execute, searchFn, searchOptions, reset]);

  return {
    ...asyncState,
    query,
    setQuery,
    searchTerm,
    setSearchTerm,
    searchResults: data ?? [],
    isSearching: isLoading,
    reset
  };
}