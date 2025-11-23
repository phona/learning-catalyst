/**
 * Enhanced State Management Patterns - Phase 2 Architecture Refactoring
 *
 * Provides standardized patterns for Zustand stores with:
 * - Type-safe store creation
 * - Middleware for validation and debugging
 * - Consistent store action typing
 * - State persistence patterns
 */

import { StateCreator, StoreApi, create as zustandCreate } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Base interface for all store states
 */
export interface BaseStoreState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Base actions for all stores
 */
export interface BaseStoreActions<TState extends BaseStoreState> {
  initialize(): Promise<void> | void;
  reset(): void;
  clearError(): void;
  setLoading(isLoading: boolean): void;
  setError(error: string | null): void;
}

/**
 * Type-safe store creator
 */
export type TypedStoreCreator<
  TState extends BaseStoreState,
  TActions extends BaseStoreActions<TState>,
> = StateCreator<TState & TActions, any, [], TState & TActions>;

/**
 * Middleware configuration for persistence
 */
export interface PersistenceOptions<T> {
  name: string;
  storage?: ReturnType<typeof createJSONStorage>;
  version?: number;
  partialize?: (state: T) => Partial<T>;
  migrate?: (persistedState: any, version: number) => any;
}

/**
 * Store validation middleware
 */
export function createValidationMiddleware<T extends BaseStoreState>(
  validator: (state: T) => { isValid: boolean; errors: string[] },
) {
  return (config: any) => (set: any, get: any, api: StoreApi<T>) => {
    const originalConfig = config();

    return {
      ...originalConfig,
      set: (newState: any) => {
        const validatedState = validator(newState);
        if (!validatedState.isValid) {
          console.warn('State validation failed:', validatedState.errors);
          return;
        }
        set(newState);
      },
    };
  };
}

/**
 * Debug logging middleware
 */
export function createDebugMiddleware<T extends BaseStoreState>(storeName: string) {
  return (config: any) => (set: any, get: any, api: StoreApi<T>) => {
    const originalConfig = config();

    return {
      ...originalConfig,
      set: (newState: any) => {
        const oldState = get();
        console.debug(`[${storeName}] State update:`, { old: oldState, new: newState });
        set(newState);
      },
    };
  };
}

/**
 * Performance monitoring middleware
 */
export function createPerformanceMiddleware<T extends BaseStoreState>(storeName: string) {
  return (config: any) => (set: any, get: any, api: StoreApi<T>) => {
    const originalConfig = config();
    let operationCount = 0;
    let lastOperation = Date.now();

    return {
      ...originalConfig,
      set: (newState: any) => {
        const start = performance.now();
        set(newState);
        const duration = performance.now() - start;

        operationCount++;
        lastOperation = Date.now();

        if (duration > 16) {
          // Log slow operations (> 16ms)
          console.warn(`[${storeName}] Slow state update: ${duration.toFixed(2)}ms`);
        }
      },
      getPerformanceStats: () => ({
        operationCount,
        lastOperation,
        averageDuration: 0, // Placeholder for calculation
      }),
    };
  };
}

/**
 * Base store configuration with common middleware
 */
export function createBaseStore<
  TState extends BaseStoreState,
  TActions extends BaseStoreActions<TState>,
>(
  storeName: string,
  creator: TypedStoreCreator<TState, TActions>,
  options: {
    persistence?: PersistenceOptions<TState & TActions>;
    validation?: (state: TState & TActions) => { isValid: boolean; errors: string[] };
    enableDebug?: boolean;
    enablePerformanceMonitoring?: boolean;
  } = {},
) {
  let config = creator;

  // Add validation middleware if provided
  if (options.validation) {
    config = createValidationMiddleware(options.validation)(config as any) as any;
  }

  // Add debug middleware if enabled
  if (options.enableDebug) {
    config = createDebugMiddleware<TState & TActions>(storeName)(config as any) as any;
  }

  // Add performance monitoring if enabled
  if (options.enablePerformanceMonitoring) {
    config = createPerformanceMiddleware<TState & TActions>(storeName)(config as any) as any;
  }

  // Wrap with subscribeWithSelector middleware
  config = subscribeWithSelector(config as any) as any;

  // Add persistence middleware if provided
  if (options.persistence) {
    config = persist(config as any, options.persistence) as any;
  }

  return zustandCreate<TState & TActions>()(config as any);
}

/**
 * Standard action creators factory
 */
export function createActionCreators<
  TState extends BaseStoreState,
  TActions extends BaseStoreActions<TState>,
>(actions: TActions): TActions {
  return actions;
}

/**
 * Type-safe selector helpers
 */
export function createSelectors<
  TStore extends { getState: () => any; subscribe?: (listener: () => void) => () => void },
>(store: TStore) {
  return {
    get: store.getState,
    subscribe: store.subscribe,
    getIsInitialized: () => store.getState().isInitialized,
    getIsLoading: () => store.getState().isLoading,
    getError: () => store.getState().error,
    getLastUpdated: () => store.getState().lastUpdated,
  };
}

/**
 * Store lifecycle management
 */
export class StoreLifecycleManager {
  private readonly stores = new Map<string, { store: any; lifecycle: BaseStoreActions<any> }>();

  registerStore(name: string, store: any, lifecycle: BaseStoreActions<any>): void {
    this.stores.set(name, { store, lifecycle });
  }

  async initializeAllStores(): Promise<void> {
    const initializationPromises = Array.from(this.stores.entries()).map(
      async ([name, { lifecycle }]) => {
        try {
          await lifecycle.initialize();
          console.debug(`Store '${name}' initialized successfully`);
        } catch (error) {
          console.error(`Failed to initialize store '${name}':`, error);
          lifecycle.setError(
            `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );

    await Promise.allSettled(initializationPromises);
  }

  async resetAllStores(): Promise<void> {
    const resetPromises = Array.from(this.stores.values()).map(({ lifecycle }) => {
      lifecycle.reset();
      lifecycle.clearError();
    });

    await Promise.allSettled(resetPromises);
  }

  getStoreStats() {
    const stats = new Map<string, any>();

    for (const [name, { store }] of this.stores.entries()) {
      const state = store.getState();
      stats.set(name, {
        isInitialized: state.isInitialized,
        isLoading: state.isLoading,
        hasError: !!state.error,
        lastUpdated: state.lastUpdated,
        ...(store.getPerformanceStats?.() || {}),
      });
    }

    return Object.fromEntries(stats);
  }
}

/**
 * Reactive store utilities
 */
export class ReactiveStoreUtils {
  /**
   * Create a derived store from existing stores
   */
  static createDerivedStore<TState>(
    dependencies: { [K in keyof TState]: any },
    derive: (dependencies: TState) => any,
  ) {
    return {
      subscribe: (callback: (state: any) => void) => {
        const unsubscribers = Object.values(dependencies).map((store: any) =>
          store.subscribe(() => callback(derive(dependencies as TState))),
        );

        return () => unsubscribers.forEach((unsub) => unsub());
      },
    };
  }

  /**
   * Create a store that updates based on time intervals
   */
  static createTimedStore<TState>(
    updateFn: (prevState: TState, elapsed: number) => TState,
    intervalMs: number = 1000,
  ) {
    let intervalId: NodeJS.Timeout | null = null;
    let lastUpdate = Date.now();

    return {
      start: (store: any) => {
        intervalId = setInterval(() => {
          const now = Date.now();
          const elapsed = now - lastUpdate;
          lastUpdate = now;

          store.setState((prevState: TState) => updateFn(prevState, elapsed));
        }, intervalMs);
      },
      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
    };
  }
}

/**
 * Default export
 */
export default {
  createBaseStore,
  createActionCreators,
  createSelectors,
  StoreLifecycleManager,
  ReactiveStoreUtils,
  createValidationMiddleware,
  createDebugMiddleware,
  createPerformanceMiddleware,
};
