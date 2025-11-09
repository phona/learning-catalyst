/**
 * Comprehensive Optimization Patterns
 *
 * Collection of advanced optimization patterns for the Learning Catalyst application.
 * Includes resource management, data processing optimizations, and performance patterns.
 */

import { LRUCache, Debounced, Throttled, memoizeAsync, EventBatcher } from './performance-utils';
import { createTypedEventEmitter } from './type-utils';

// ============================================================================
// Resource Management Patterns
// ============================================================================

/**
 * Resource pool for managing expensive resources like database connections
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T | Promise<T>;
  private destroyer?: (resource: T) => void;
  private validator?: (resource: T) => boolean;
  private maxSize: number;
  private minSize: number;
  private timeout: number;

  constructor(options: {
    factory: () => T | Promise<T>;
    destroyer?: (resource: T) => void;
    validator?: (resource: T) => boolean;
    maxSize?: number;
    minSize?: number;
    timeout?: number;
  }) {
    this.factory = options.factory;
    this.destroyer = options.destroyer;
    this.validator = options.validator;
    this.maxSize = options.maxSize || 10;
    this.minSize = options.minSize || 2;
    this.timeout = options.timeout || 30000;

    this.initializePool();
  }

  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.minSize; i++) {
      try {
        const resource = await this.factory();
        this.available.push(resource);
      } catch (error) {
        console.warn('Failed to initialize resource pool:', error);
      }
    }
  }

  async acquire(): Promise<T> {
    // Try to get an available resource
    if (this.available.length > 0) {
      const resource = this.available.pop()!;

      // Validate resource if validator provided
      if (this.validator && !this.validator(resource)) {
        return this.acquire(); // Recursively try next resource
      }

      this.inUse.add(resource);
      return resource;
    }

    // Create new resource if under max size
    if (this.inUse.size < this.maxSize) {
      const resource = await Promise.race([
        this.factory(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Resource acquisition timeout')), this.timeout)
        )
      ]);

      this.inUse.add(resource);
      return resource;
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          this.acquire().then(resolve).catch(reject);
        }
      }, 100);

      // Timeout after waiting too long
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Resource pool exhausted'));
      }, this.timeout);
    });
  }

  release(resource: T): void {
    if (!this.inUse.has(resource)) return;

    this.inUse.delete(resource);

    // Validate resource before returning to pool
    if (this.validator && !this.validator(resource)) {
      this.destroyer?.(resource);
      return;
    }

    // Don't exceed max pool size
    if (this.available.length < this.maxSize) {
      this.available.push(resource);
    } else {
      this.destroyer?.(resource);
    }
  }

  async destroy(): Promise<void> {
    // Destroy all resources
    const allResources = [...this.available, ...this.inUse];

    if (this.destroyer) {
      await Promise.all(allResources.map(resource => this.destroyer!(resource)));
    }

    this.available = [];
    this.inUse.clear();
  }

  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

// ============================================================================
// Data Processing Optimizations
// ============================================================================

/**
 * Optimized data processor with batching and streaming
 */
export class DataProcessor<T, R> {
  private batchSize: number;
  private processFn: (batch: T[]) => Promise<R[]>;
  private queue: T[] = [];
  private processing = false;
  private batchProcessor: EventBatcher<T>;

  constructor(options: {
    batchSize?: number;
    processFn: (batch: T[]) => Promise<R[]>;
    flushInterval?: number;
  }) {
    this.batchSize = options.batchSize || 100;
    this.processFn = options.processFn;

    this.batchProcessor = new EventBatcher(
      async (batch: T[]) => {
        await this.processBatch(batch);
      },
      {
        batchSize: this.batchSize,
        flushInterval: options.flushInterval || 1000
      }
    );
  }

  async add(item: T): Promise<void> {
    this.batchProcessor.add(item);
  }

  async addBatch(items: T[]): Promise<void> {
    for (const item of items) {
      await this.add(item);
    }
  }

  async flush(): Promise<void> {
    this.batchProcessor.cancel();
    if (this.queue.length > 0) {
      await this.processBatch(this.queue);
      this.queue = [];
    }
  }

  private async processBatch(batch: T[]): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    try {
      const results = await this.processFn(batch);
      // Emit results or handle them as needed
      this.onResults?.(results);
    } catch (error) {
      this.onError?.(error);
    } finally {
      this.processing = false;
    }
  }

  onResults?: (results: R[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Streaming data processor for large datasets
 */
export class StreamProcessor<T, R> {
  private chunkSize: number;
  private processFn: (chunk: T[]) => Promise<R[]>;
  private concurrency: number;
  private semaphore: number;

  constructor(options: {
    chunkSize?: number;
    processFn: (chunk: T[]) => Promise<R[]>;
    concurrency?: number;
  }) {
    this.chunkSize = options.chunkSize || 1000;
    this.processFn = options.processFn;
    this.concurrency = options.concurrency || 3;
    this.semaphore = this.concurrency;
  }

  async process(data: T[]): Promise<R[]> {
    const chunks = this.chunkArray(data, this.chunkSize);
    const results: R[] = [];

    for (const chunk of chunks) {
      await this.acquireSemaphore();

      this.processChunk(chunk)
        .then(chunkResults => {
          results.push(...chunkResults);
        })
        .catch(error => {
          console.error('Chunk processing error:', error);
        })
        .finally(() => {
          this.releaseSemaphore();
        });
    }

    // Wait for all chunks to complete
    while (this.semaphore < this.concurrency) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async processChunk(chunk: T[]): Promise<R[]> {
    return this.processFn(chunk);
  }

  private async acquireSemaphore(): Promise<void> {
    while (this.semaphore <= 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.semaphore--;
  }

  private releaseSemaphore(): void {
    this.semaphore++;
  }
}

// ============================================================================
// Cache Optimization Patterns
// ============================================================================

/**
 * Multi-level cache with hierarchical storage
 */
export class MultiLevelCache<K, V> {
  private levels: CacheLevel<K, V>[];
  private events = createTypedEventEmitter<{
    miss: { key: K; level: number };
    hit: { key: K; level: number };
    eviction: { key: K; level: number; value: V };
  }>();

  constructor(options: {
    levels: Array<{
      cache: LRUCache<K, V>;
      priority: number;
      ttl?: number;
    }>;
  }) {
    this.levels = options.levels
      .sort((a, b) => a.priority - b.priority)
      .map(level => ({
        cache: level.cache,
        priority: level.priority,
        ttl: level.ttl || 0
      }));
  }

  async get(key: K): Promise<V | undefined> {
    // Check levels in priority order
    for (let i = 0; i < this.levels.length; i++) {
      const level = this.levels[i];
      const value = level.cache.get(key);

      if (value !== undefined) {
        // Promote to higher priority levels
        await this.promoteToHigherLevels(key, value, i);
        this.events.emit('hit', { key, level: i });
        return value;
      }
    }

    this.events.emit('miss', { key, level: this.levels.length - 1 });
    return undefined;
  }

  async set(key: K, value: V): Promise<void> {
    // Set in all levels
    for (const level of this.levels) {
      level.cache.set(key, value);
    }
  }

  private async promoteToHigherLevels(key: K, value: V, currentLevel: number): Promise<void> {
    for (let i = 0; i < currentLevel; i++) {
      this.levels[i].cache.set(key, value);
    }
  }

  on(event: 'hit' | 'miss' | 'eviction', listener: (data: any) => void): void {
    this.events.on(event, listener);
  }

  getStats(): Array<{ level: number; size: number; hits: number; misses: number }> {
    return this.levels.map((level, index) => ({
      level: index,
      size: level.cache.getStats().size,
      hits: 0, // Would need to track hits separately
      misses: 0 // Would need to track misses separately
    }));
  }
}

interface CacheLevel<K, V> {
  cache: LRUCache<K, V>;
  priority: number;
  ttl: number;
}

// ============================================================================
// Request Optimization Patterns
// ============================================================================

/**
 * Request deduplicator to prevent duplicate concurrent requests
 */
export class RequestDeduplicator<K = string, R = any> {
  private pendingRequests = new Map<K, Promise<R>>();

  async deduplicate(key: K, requestFn: () => Promise<R>): Promise<R> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  getPendingKeys(): K[] {
    return Array.from(this.pendingRequests.keys());
  }
}

/**
 * Circuit breaker pattern for resilient request handling
 */
export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private monitoringPeriod: number;
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private events = createTypedEventEmitter<{
    stateChange: { from: string; to: string };
    failure: { error: Error };
    success: { duration: number };
  }>();

  constructor(options: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    monitoringPeriod?: number;
  }) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 300000; // 5 minutes
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.setState('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      this.onSuccess(duration);
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(duration: number): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.setState('CLOSED');
    }

    this.events.emit('success', { duration });
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.setState('OPEN');
    }

    this.events.emit('failure', { error });
  }

  private setState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    const oldState = this.state;
    this.state = newState;
    this.events.emit('stateChange', { from: oldState, to: newState });
  }

  getState(): string {
    return this.state;
  }

  on(event: 'stateChange' | 'failure' | 'success', listener: (data: any) => void): void {
    this.events.on(event, listener);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an optimized retry mechanism with exponential backoff
 */
export function createRetryPolicy(options: {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true
  } = options;

  return {
    async execute<T>(operation: () => Promise<T>): Promise<T> {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;

          if (attempt === maxAttempts) {
            throw lastError;
          }

          const delay = Math.min(
            baseDelay * Math.pow(backoffFactor, attempt - 1),
            maxDelay
          );

          const jitterDelay = jitter
            ? delay + Math.random() * delay * 0.1
            : delay;

          await new Promise(resolve => setTimeout(resolve, jitterDelay));
        }
      }

      throw lastError!;
    }
  };
}

/**
 * Create a memory-efficient queue with automatic cleanup
 */
export class MemoryEfficientQueue<T> {
  private queue: T[] = [];
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;
  private onEvict?: (item: T) => void;

  constructor(options: {
    maxSize?: number;
    cleanupIntervalMs?: number;
    onEvict?: (item: T) => void;
  }) {
    this.maxSize = options.maxSize || 1000;
    this.onEvict = options.onEvict;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, options.cleanupIntervalMs || 60000);
  }

  enqueue(item: T): boolean {
    if (this.queue.length >= this.maxSize) {
      // Evict oldest item
      const evicted = this.queue.shift();
      this.onEvict?.(evicted!);
    }

    this.queue.push(item);
    return true;
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  peek(): T | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }

  private cleanup(): void {
    // Remove any stale items or perform other cleanup logic
    // This is a placeholder for application-specific cleanup
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}