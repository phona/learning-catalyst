/**
 * Performance Optimization Utilities
 *
 * Memory-aware utilities, caching strategies, and performance monitoring
 * for optimal application performance.
 */

// ============================================================================
// Memory-Aware Caching
// ============================================================================

/**
 * LRU Cache implementation with memory management
 */
export class LRUCache<TKey, TValue> {
  private readonly cache = new Map<TKey, { value: TValue; timestamp: number; size?: number }>();
  private readonly maxSize: number;
  private readonly maxMemory?: number; // in bytes
  private cleanupInterval?: NodeJS.Timeout;
  private currentMemory = 0;

  constructor(
    maxSize = 100,
    maxMemoryMB?: number,
    cleanupIntervalMs = 60 * 1000 // 1 minute
  ) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemoryMB ? maxMemoryMB * 1024 * 1024 : undefined;

    if (cleanupIntervalMs > 0) {
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    }
  }

  set(key: TKey, value: TValue, size?: number): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Evict if over capacity
    if (this.cache.size >= this.maxSize || (this.maxMemory && this.currentMemory >= this.maxMemory)) {
      this.evictOldest();
    }

    const entry = { value, timestamp: Date.now(), size };
    this.cache.set(key, entry);

    if (size && this.maxMemory) {
      this.currentMemory += size;
    }
  }

  get(key: TKey): TValue | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry is stale (older than 30 minutes)
    const now = Date.now();
    if (now - entry.timestamp > 30 * 60 * 1000) {
      this.remove(key);
      return undefined;
    }

    // Update timestamp for LRU tracking
    entry.timestamp = now;
    return entry.value;
  }

  has(key: TKey): boolean {
    return this.cache.has(key) && this.get(key) !== undefined;
  }

  remove(key: TKey): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);

    if (entry.size && this.maxMemory) {
      this.currentMemory = Math.max(0, this.currentMemory - entry.size);
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }

  private evictOldest(): void {
    if (this.cache.size === 0) return;

    let oldestKey: TKey | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.remove(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const staleEntries: TKey[] = [];
    let evictedCount = 0;

    // Find stale entries (older than 30 minutes)
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > 30 * 60 * 1000) {
        staleEntries.push(key);
      }
    }

    // Remove stale entries
    staleEntries.forEach(key => {
      if (this.remove(key)) {
        evictedCount++;
      }
    });

    // If still over capacity, evict oldest
    while (this.cache.size > this.maxSize && evictedCount < 10) {
      this.evictOldest();
      evictedCount++;
    }

    if (evictedCount > 0) {
      console.debug(`Cache cleanup: removed ${evictedCount} entries, ${this.cache.size} remain`);
    }
  }

  getStats(): {
    size: number;
    maxSize: number;
    memoryUsageMB?: number;
    memoryLimitMB?: number;
    utilizationPercent: number;
    cleanupIntervalMs?: number;
    } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsageMB: this.maxMemory ? this.currentMemory / (1024 * 1024) : undefined,
      memoryLimitMB: this.maxMemory ? this.maxMemory / (1024 * 1024) : undefined,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
      cleanupIntervalMs: this.cleanupInterval ? undefined : undefined
    };
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}

/**
 * Memory-optimized promise cache with automatic cleanup
 */
export class PromiseCache {
  private readonly cache = new LRUCache<string, Promise<any>>();
  private readonly loadingPromises = new Map<string, Promise<any>>();

  /**
   * Get or create a cached promise
   */
  async get<T>(
    key: string,
    factory: () => Promise<T>,
    options?: {
      ttl?: number; // time to live in milliseconds
      maxSize?: number;
    }
  ): Promise<T> {
    const existing = this.cache.get(key);
    if (existing) {
      return existing;
    }

    // Check if promise is already loading
    const loading = this.loadingPromises.get(key);
    if (loading) {
      return loading;
    }

    try {
      const promise = factory();
      this.loadingPromises.set(key, promise);

      const result = await promise;

      // Cache the result
      this.cache.set(key, promise);

      return result;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.remove(key);
    this.loadingPromises.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): any {
    return this.cache.getStats();
  }

  /**
   * Dispose of cache
   */
  dispose(): void {
    this.cache.dispose();
    this.loadingPromises.clear();
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance metrics collector
 */
export class PerformanceMonitor {
  private readonly metrics = new Map<string, PerformanceMetric[]>();
  private readonly observers: Map<string, PerformanceObserver> = new Map();
  private readonly maxEntries = 1000;

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number, metadata?: any): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    let nameMetrics = this.metrics.get(name);
    if (!nameMetrics) {
      nameMetrics = [];
      this.metrics.set(name, nameMetrics);
    }

    nameMetrics.push(metric);

    // Keep only recent entries
    if (nameMetrics.length > this.maxEntries) {
      nameMetrics.splice(0, nameMetrics.length - this.maxEntries);
    }
  }

  /**
   * Measure an async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    let error: Error | undefined;

    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (err) {
      error = err as Error;
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { error: true });
      throw err;
    }
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): PerformanceStats | null {
    const nameMetrics = this.metrics.get(name);
    if (!nameMetrics || nameMetrics.length === 0) {
      return null;
    }

    const durations = nameMetrics
      .filter(m => !m.metadata?.error)
      .map(m => m.duration);

    const errorCount = nameMetrics.filter(m => m.metadata?.error).length;
    const totalCount = nameMetrics.length;

    if (durations.length === 0) {
      return {
        count: totalCount,
        errorRate: (errorCount / totalCount) * 100,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }

    durations.sort((a, b) => a - b);

    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = this.calculateMedian(durations);
    const p95 = this.calculatePercentile(durations, 95);
    const p99 = this.calculatePercentile(durations, 99);

    return {
      count: totalCount,
      errorRate: (errorCount / totalCount) * 100,
      averageDuration: avg,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      medianDuration: median,
      p95Duration: p95,
      p99Duration: p99
    };
  }

  /**
   * Get all available metrics
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Start monitoring performance observers
   */
  startMonitoring(): void {
    if ('PerformanceObserver' in window) {
      // Monitor long tasks
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.recordMetric('longtask', entry.duration, {
                type: entry.name,
                start: entry.startTime
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', observer);
      } catch (err) {
        console.warn('Failed to create longtask observer:', err);
      }

      // Measure performance marks
      try {
        const markObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.recordMetric(entry.name, entry.duration, {
                startTime: entry.startTime
              });
            }
          }
        });
        markObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('measure', markObserver);
      } catch (err) {
        console.warn('Failed to create measure observer:', err);
      }
    }
  }

  /**
   * Stop monitoring and clean up
   */
  stopMonitoring(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (err) {
        console.warn('Error disconnecting observer:', err);
      }
    });
    this.observers.clear();
  }

  /**
   * Create a performance mark
   */
  mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure between marks
   */
  measure(name: string, startMark: string, endMark?: string): void {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
      // The measure will be captured by our observer
    } catch (err) {
      console.warn(`Failed to measure ${name}:`, err);
    }
  }

  /**
   * Clear metrics data
   */
  clear(): void {
    this.metrics.clear();
  }

  private calculateMedian(values: number[]): number {
    const mid = Math.floor(values.length / 2);
    return values.length % 2
      ? values[mid]
      : (values[mid - 1] + values[mid]) / 2;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }
}

/**
 * Performance metric entry
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics
 */
interface PerformanceStats {
  count: number;
  errorRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
}

// ============================================================================
// Memory Management Utilities
// ============================================================================

/**
 * Weak reference wrapper for garbage collection
 */
export class WeakReference<T extends object> {
  private ref: WeakRef<T>;
  private registry: FinalizationRegistry<string>;

  constructor(value: T, id: string, cleanupCallback: (id: string) => void) {
    this.ref = new WeakRef(value);
    this.registry = new FinalizationRegistry(cleanupCallback);
    this.registry.register(value, id);
  }

  get(): T | undefined {
    return this.ref.deref();
  }

  isAlive(): boolean {
    return this.ref.deref() !== undefined;
  }
}

/**
 * Memory pool for reusable objects
 */
export class MemoryPool<T> {
  private pool: T[] = [];
  private readonly maxSize: number;
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    const obj = this.pool.length > 0
      ? this.pool.pop()!
      : this.factory();

    return obj;
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool = [];
  }

  getStats(): { poolSize: number; maxSize: number } {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize
    };
  }
}

// ============================================================================
// Request Optimization
// ============================================================================

/**
 * Debounce utility with cancellation support
 */
export class Debounced<T extends (...args: any[]) => any> {
  private timeout: NodeJS.Timeout | null = null;
  private lastArgs: Parameters<T> | null = null;
  private lastCallTime = 0;
  private pendingPromise: Promise<ReturnType<T>> | null = null;

  constructor(
    private readonly func: T,
    private readonly wait: number,
    private readonly options: {
      leading?: boolean;
      trailing?: boolean;
      maxWait?: number;
    } = { leading: false, trailing: true }
  ) {}

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.lastArgs = null;
    this.pendingPromise = null;
  }

  execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    const now = Date.now();

    // Handle leading execution
    if (this.options.leading && !this.timeout) {
      this.lastCallTime = now;
      return this.func(...args);
    }

    this.lastArgs = args;
    this.lastCallTime = now;

    if (!this.pendingPromise) {
      this.pendingPromise = new Promise<ReturnType<T>>((resolve, reject) => {
        const execute = () => {
          this.timeout = null;
          this.pendingPromise = null;

          if (this.lastArgs && (this.options.trailing || !this.options.leading)) {
            try {
              resolve(this.func(...this.lastArgs));
            } catch (err) {
              reject(err);
            }
          }
        };

        // Calculate delay
        const delay = this.wait;
        const maxWait = this.options.maxWait;
        const timeSinceLastCall = now - this.lastCallTime;

        if (maxWait && timeSinceLastCall >= maxWait) {
          execute();
        } else {
          this.timeout = setTimeout(execute, delay);
        }
      });
    }

    return this.pendingPromise;
  }

  flush(): void {
    if (this.timeout && this.lastArgs) {
      clearTimeout(this.timeout);
      this.func(...this.lastArgs);
      this.lastArgs = null;
      this.timeout = null;
    }
  }
}

/**
 * Throttle utility
 */
export class Throttled<T extends (...args: any[]) => any> {
  private lastCall = 0;
  private lastArgs: Parameters<T> | null = null;
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly func: T,
    private readonly limit: number
  ) {}

  execute(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall >= this.limit) {
      this.lastCall = now;
      this.func(...args);
    } else {
      this.lastArgs = args;

      if (!this.timeout) {
        this.timeout = setTimeout(() => {
          this.lastCall = Date.now();
          if (this.lastArgs) {
            this.func(...this.lastArgs);
            this.lastArgs = null;
          }
          this.timeout = null;
        }, this.limit - timeSinceLastCall);
      }
    }
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.lastArgs = null;
  }
}

/**
 * Create a memoized async function with caching
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  options?: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  }
): T {
  const cache = new PromiseCache();
  const { keyGenerator, ttl = 5 * 60 * 1000 } = options || {};

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    return await cache.get(key, () => func(...args), {
      ttl,
      maxSize: options?.maxSize
    });
  }) as T;
}

// ============================================================================
// Performance-Optimized Event Handlers
// ============================================================================

/**
 * Batch event processor for performance optimization
 */
export class EventBatcher<T> {
  private buffer: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private readonly handler: (items: T[]) => void;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  constructor(
    handler: (items: T[]) => void,
    options: {
      batchSize?: number;
      flushInterval?: number;
    } = {}
  ) {
    this.handler = handler;
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 100;
  }

  add(item: T): void {
    this.buffer.push(item);

    // Auto-flush if batch size reached
    if (this.buffer.length >= this.batchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const items = this.buffer.splice(0, this.buffer.length);
    this.handler(items);

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.buffer = [];
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * Performance-optimized scroll handler
 */
export class OptimizedScrollHandler {
  private readonly lastScrollTime = 0;
  private readonly throttleDelay: number = 100; // ms
  private readonly handler: (event: Event) => void;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(
    handler: (event: Event) => void,
    options?: {
      throttleMs?: number;
      passive?: boolean;
    }
  ) {
    this.handler = handler;
    this.throttleDelay = options?.throttleMs || this.throttleDelay;
  }

  attach(element: HTMLElement): void {
    const throttledHandler = this.throttle(this.handler);

    const options = { passive: true };
    element.addEventListener('scroll', throttledHandler, options as AddEventListenerOptions);

    this.cleanupCallbacks.push(() => {
      element.removeEventListener('scroll', throttledHandler, options as AddEventListenerOptions);
    });
  }

  private throttle(fn: (event: Event) => void): (event: Event) => void {
    let lastCall = 0;
    return (event: Event) => {
      const now = Date.now();
      if (now - lastCall >= this.throttleDelay) {
        lastCall = now;
        fn(event);
      }
    };
  }

  detach(): void {
    this.cleanupCallbacks.forEach(cleanup => cleanup());
    this.cleanupCallbacks = [];
  }
}