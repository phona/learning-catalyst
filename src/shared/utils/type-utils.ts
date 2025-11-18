/**
 * Enhanced Type Utilities
 *
 * Advanced TypeScript utility types for better type safety and inference.
 * Provides patterns for service interfaces, error handling, and generic operations.
 */

// ============================================================================
// Advanced Generic Types
// ============================================================================

/**
 * Extract promise type from async functions
 */
export type ExtractPromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract array element type
 */
export type ExtractArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Extract service method type
 */
export type ServiceMethod<T> = T extends (...args: any[]) => any ? T : never;

/**
 * Extract service return type
 */
export type ServiceReturn<T> = ReturnType<ServiceMethod<T>>;

/**
 * Extract service parameters
 */
export type ServiceParams<T> = Parameters<ServiceMethod<T>>;

/**
 * Deep partial type - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartialArray<U>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type DeepPartialArray<T> = Array<DeepPartial<T>>;

/**
 * Deep required type - makes all nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[]
    ? DeepRequiredArray<U>
    : T[P] extends object
    ? DeepRequired<T[P]>
    : T[P];
};

export type DeepRequiredArray<T> = Array<DeepRequired<T>>;

/**
 * Conditional utility types
 */
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Maybe<T> = T | null | undefined;

/**
 * Service method extraction utilities
 */
export type ExtractServiceMethods<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type ExtractServiceInterfaces<T> = {
  [K in keyof T]: T[K] extends {
    [method: string]: Function;
  } ? K : never;
}[keyof T];

// ============================================================================
// Type-Safe Service Factory
// ============================================================================

/**
 * Enhanced service factory with better type inference
 */
export function createServiceClient<T extends Record<string, (...args: any[]) => any>>(
  api: T,
  options?: {
    timeout?: number;
    retryCount?: number;
    onError?: (error: Error, method: keyof T) => void;
  }
): {
  [K in keyof T]: (...args: Parameters<T[K]>) => Promise<ExtractPromiseType<ReturnType<T[K]>>>;
} {
  const client = {} as any;
  const { timeout = 30000, retryCount = 3, onError } = options || {};

  for (const [key, method] of Object.entries(api)) {
    client[key] = async (...args: any[]) => {
      let lastError: Error;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          // Add timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const result = await Promise.race([
            method(...args),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Service call timeout')), timeout)
            )
          ]);

          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          lastError = error as Error;

          if (attempt === retryCount) {
            onError?.(lastError, key as keyof T);
            throw new ServiceMethodError(
              `Service call ${String(key)} failed after ${retryCount + 1} attempts`,
              key as string,
              lastError
            );
          }

          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }

      throw lastError!;
    };
  }

  return client;
}

/**
 * Enhanced service method error
 */
export class ServiceMethodError extends Error {
  constructor(
    message: string,
    public method: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'ServiceMethodError';
  }
}

// ============================================================================
// Type Guard Utilities
// ============================================================================

/**
 * Create a type guard from a validator function
 */
export function createTypeGuard<T>(
  validator: (value: unknown) => value is T
): (value: unknown) => value is T {
  return validator;
}

/**
 * Create a union type guard
 */
export function createUnionGuard<T, U>(
  guardA: (value: unknown) => value is T,
  guardB: (value: unknown) => value is U
): (value: unknown) => value is T | U {
  return (value: unknown): value is T | U => guardA(value) || guardB(value);
}

/**
 * Create an intersection type guard
 */
export function createIntersectionGuard<T, U>(
  guardA: (value: unknown) => value is T,
  guardB: (value: unknown) => value is U
): (value: unknown) => value is T & U {
  return (value: unknown): value is T & U => guardA(value) && guardB(value);
}

// ============================================================================
// Brand Types for Safety
// ============================================================================

/**
 * Create a branded type for additional type safety
 */
export type Branded<T, Brand> = T & { __brand: Brand };

/**
 * Brand a value with a type
 */
export function brand<T, Brand>(value: T, _brand: Brand): Branded<T, Brand> {
  return value as Branded<T, Brand>;
}

/**
 * Check if a value is branded
 */
export function isBranded<T, Brand>(
  value: unknown,
  _brand: Brand
): value is Branded<T, Brand> {
  return typeof value === typeof {}; // Simplified check
}

// Common branded types
export type ID = Branded<string, 'ID'>;
export type Email = Branded<string, 'Email'>;
export type URL = Branded<string, 'URL'>;
export type Timestamp = Branded<number, 'Timestamp'>;
export type Percentage = Branded<number, 'Percentage'>;

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Create a timeout promise
 */
export function createTimeoutPromise<T>(
  timeoutMs: number,
  error = new Error('Operation timed out')
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), timeoutMs);
  });
}

/**
 * Add timeout to any promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  error = new Error('Operation timed out')
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise<T>(timeoutMs, error)]);
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// Type-safe Event Emitter
// ============================================================================

/**
 * Type-safe event emitter interface
 */
export interface TypedEventEmitter<TEvents extends Record<string, any>> {
  on<TKey extends keyof TEvents>(
    event: TKey,
    listener: (data: TEvents[TKey]) => void
  ): void;

  off<TKey extends keyof TEvents>(
    event: TKey,
    listener: (data: TEvents[TKey]) => void
  ): void;

  emit<TKey extends keyof TEvents>(event: TKey, data: TEvents[TKey]): void;

  once<TKey extends keyof TEvents>(
    event: TKey,
    listener: (data: TEvents[TKey]) => void
  ): void;
}

/**
 * Create a typed event emitter
 */
export function createTypedEventEmitter<TEvents extends Record<string, any>>(): TypedEventEmitter<TEvents> {
  const listeners = new Map<keyof TEvents, Set<(data: any) => void>>();

  return {
    on(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(listener);
    },

    off(event, listener) {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          listeners.delete(event);
        }
      }
    },

    emit(event, data) {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`Error in event listener for ${String(event)}:`, error);
          }
        });
      }
    },

    once(event, listener) {
      const onceListener = (data: any) => {
        this.off(event, onceListener);
        listener(data);
      };
      this.on(event, onceListener);
    }
  };
}

// ============================================================================
// Cache Types and Utilities
// ============================================================================

/**
 * Generic cache entry with expiration
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Type-safe cache interface
 */
export interface TypeSafeCache<TKey, TValue> {
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: T, ttlMs?: number): void;
  has(key: TKey): boolean;
  delete(key: TKey): boolean;
  clear(): void;
  size(): number;
  keys(): TKey[];
  values(): TValue[];
  entries(): Array<[TKey, TValue]>;
}

/**
 * Create a type-safe in-memory cache
 */
export function createTypeSafeCache<TKey, TValue>(
  options?: {
    maxSize?: number;
    defaultTtl?: number;
    cleanupInterval?: number;
  }
): TypeSafeCache<TKey, TValue> {
  const {
    maxSize = 100,
    defaultTtl = 5 * 60 * 1000, // 5 minutes
    cleanupInterval = 60 * 1000 // 1 minute
  } = options || {};

  const cache = new Map<TKey, CacheEntry<TValue>>();
  let cleanupTimer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        cache.delete(key);
      }
    }

    // LRU eviction if over size limit
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      const toDelete = entries.slice(0, cache.size - maxSize);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  };

  if (cleanupInterval > 0) {
    cleanupTimer = setInterval(cleanup, cleanupInterval);
  }

  return {
    get(key: TKey): TValue | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;

      const now = Date.now();
      if (entry.expiresAt && now > entry.expiresAt) {
        cache.delete(key);
        return undefined;
      }

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = now;
      return entry.value;
    },

    set(key: TKey, value: TValue, ttlMs = defaultTtl): void {
      const now = Date.now();
      cache.set(key, {
        value,
        timestamp: now,
        expiresAt: ttlMs > 0 ? now + ttlMs : undefined,
        accessCount: 0,
        lastAccessed: now
      });

      // Trigger cleanup if over limit
      if (cache.size > maxSize) {
        cleanup();
      }
    },

    has(key: TKey): boolean {
      return this.get(key) !== undefined;
    },

    delete(key: TKey): boolean {
      return cache.delete(key);
    },

    clear(): void {
      cache.clear();
    },

    size(): number {
      return cache.size;
    },

    keys(): TKey[] {
      return Array.from(cache.keys());
    },

    values(): TValue[] {
      return Array.from(cache.values()).map(entry => entry.value);
    },

    entries(): Array<[TKey, TValue]> {
      return Array.from(cache.entries()).map(([key, entry]) => [key, entry.value]);
    },

    dispose(): void {
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
      }
      cache.clear();
    }
  };
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a performance monitor
 */
export function createPerformanceMonitor() {
  const metrics: PerformanceMetrics[] = [];
  const maxEntries = 1000;

  return {
    /**
     * Record a performance metric
     */
    record(metric: PerformanceMetrics): void {
      metrics.push(metric);

      // Keep only recent entries
      if (metrics.length > maxEntries) {
        metrics.splice(0, metrics.length - maxEntries);
      }
    },

    /**
     * Measure an operation's performance
     */
    async measure<T>(
      operation: string,
      fn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> {
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await fn();
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const endTime = Date.now();
        this.record({
          operation,
          startTime,
          endTime,
          duration: endTime - startTime,
          success,
          error,
          metadata
        });
      }
    },

    /**
     * Get statistics for an operation
     */
    getStats(operation: string): {
      count: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      successRate: number;
    } | null {
      const operationMetrics = metrics.filter(m => m.operation === operation);
      if (operationMetrics.length === 0) return null;

      const successCount = operationMetrics.filter(m => m.success).length;
      const durations = operationMetrics.map(m => m.duration);

      return {
        count: operationMetrics.length,
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successRate: successCount / operationMetrics.length
      };
    },

    /**
     * Get all metrics
     */
    getAllMetrics(): PerformanceMetrics[] {
      return [...metrics];
    },

    /**
     * Clear all metrics
     */
    clear(): void {
      metrics.length = 0;
    }
  };
}