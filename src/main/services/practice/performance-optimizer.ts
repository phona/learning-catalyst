/**
 * Performance Optimizer
 *
 * Optimizes conversation flow performance for sub-1 second response times
 * with intelligent caching, memory management, and resource optimization.
 */

import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { UserLearningContext, VibeType } from '../../../../shared/types/electron-api/chat-api';

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  concurrencyLevel: number;
  errorRate: number;
  throughput: number;
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
  maxConcurrency: number;
  maxErrorRate: number;
  minThroughput: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
  size: number;
}

export interface OptimizationStrategy {
  name: string;
  priority: number;
  condition: (metrics: PerformanceMetrics) => boolean;
  action: () => Promise<void>;
  description: string;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  enablePreloading: boolean;
  enableCompression: boolean;
  enableLazyLoading: boolean;
  maxCacheSize: number;
  cacheCleanupInterval: number;
  performanceMonitoringInterval: number;
  adaptiveThresholds: boolean;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  enablePreloading: true,
  enableCompression: true,
  enableLazyLoading: true,
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  cacheCleanupInterval: 5 * 60 * 1000, // 5 minutes
  performanceMonitoringInterval: 30 * 1000, // 30 seconds
  adaptiveThresholds: true
};

export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  maxResponseTime: 1000, // 1 second
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  minCacheHitRate: 0.7, // 70%
  maxConcurrency: 50,
  maxErrorRate: 0.05, // 5%
  minThroughput: 100 // requests per minute
};

/**
 * Performance Optimizer Service
 */
export class PerformanceOptimizer {
  private readonly logger: any;
  private readonly config: PerformanceConfig;
  private readonly thresholds: PerformanceThresholds;

  // Performance monitoring
  private metrics: PerformanceMetrics;
  private readonly metricsHistory: PerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Caching system
  private readonly caches = new Map<string, Map<string, CacheEntry<any>>>();
  private totalCacheSize = 0;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;

  // Resource management
  private readonly activeRequests = new Set<string>();
  private readonly requestQueue: Array<() => Promise<any>> = [];
  private maxConcurrentRequests = 10;

  // Optimization strategies
  private strategies: OptimizationStrategy[] = [];

  // Preloading system
  private readonly preloadQueue = new Map<string, () => Promise<any>>();
  private readonly preloadTimeout: NodeJS.Timeout | null = null;

  constructor(dependencies: ServiceDependencies, config: Partial<PerformanceConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.thresholds = { ...DEFAULT_PERFORMANCE_THRESHOLDS };

    this.initializeMetrics();
    this.initializeOptimizationStrategies();
    this.startPerformanceMonitoring();
    this.startCacheCleanup();

    this.logger.info('PerformanceOptimizer service initialized', {
      config: this.config,
      thresholds: this.thresholds
    });
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      responseTime: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cacheHitRate: 0,
      concurrencyLevel: 0,
      errorRate: 0,
      throughput: 0
    };
  }

  /**
   * Initialize optimization strategies
   */
  private initializeOptimizationStrategies(): void {
    this.strategies = [
      {
        name: 'Cache Cleanup',
        priority: 1,
        condition: (metrics) => metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8,
        action: () => this.performCacheCleanup(),
        description: 'Clean up cache when memory usage is high'
      },
      {
        name: 'Increase Cache Size',
        priority: 2,
        condition: (metrics) => metrics.cacheHitRate < this.thresholds.minCacheHitRate,
        action: () => this.increaseCacheSize(),
        description: 'Increase cache size when hit rate is low'
      },
      {
        name: 'Reduce Concurrency',
        priority: 3,
        condition: (metrics) => metrics.concurrencyLevel > this.thresholds.maxConcurrency * 0.8,
        action: () => this.reduceConcurrency(),
        description: 'Reduce concurrency when too many requests'
      },
      {
        name: 'Preload Common Data',
        priority: 4,
        condition: (metrics) => metrics.responseTime > this.thresholds.maxResponseTime * 0.5,
        action: () => this.preloadCommonData(),
        description: 'Preload common data when response time is slow'
      }
    ];
  }

  /**
   * Optimized conversation flow execution
   */
  async executeWithOptimization<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    context?: {
      userId?: string;
      conversationId?: string;
      topic?: string;
    }
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Check concurrency limits
      await this.waitForSlot(requestId);

      // Check cache first
      if (cacheKey && this.config.enableCaching) {
        const cached = await this.getFromCache<T>(cacheKey);
        if (cached !== null) {
          this.recordMetrics(startTime, true, false);
          return cached;
        }
      }

      // Execute operation with performance tracking
      const result = await this.executeWithTracking(operation, requestId);

      // Cache result if appropriate
      if (cacheKey && this.config.enableCaching && result !== null) {
        await this.setCache(cacheKey, result);
      }

      this.recordMetrics(startTime, false, false);
      return result;

    } catch (error) {
      this.recordMetrics(startTime, false, true);
      this.logger.error('Operation failed', error as Error, { requestId });
      throw error;
    } finally {
      this.releaseSlot(requestId);
    }
  }

  /**
   * Wait for available execution slot
   */
  private async waitForSlot(requestId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeRequests.size < this.maxConcurrentRequests) {
          this.activeRequests.add(requestId);
          this.metrics.concurrencyLevel = this.activeRequests.size;
          resolve();
        } else {
          // Add to queue with timeout
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });
  }

  /**
   * Release execution slot
   */
  private releaseSlot(requestId: string): void {
    this.activeRequests.delete(requestId);
    this.metrics.concurrencyLevel = this.activeRequests.size;
    this.processQueue();
  }

  /**
   * Process pending queue
   */
  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const operation = this.requestQueue.shift();
      if (operation) {
        operation().catch(error => {
          this.logger.error('Queued operation failed', error);
        });
      }
    }
  }

  /**
   * Execute operation with performance tracking
   */
  private async executeWithTracking<T>(operation: () => Promise<T>, requestId: string): Promise<T> {
    const memoryBefore = process.memoryUsage().heapUsed;

    try {
      const result = await operation();

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = memoryAfter - memoryBefore;

      // Update memory usage
      this.metrics.memoryUsage = memoryAfter;

      return result;
    } catch (error) {
      this.logger.error('Operation execution failed', error as Error, { requestId });
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    const [namespace, cacheKey] = this.parseCacheKey(key);
    const namespaceCache = this.caches.get(namespace);

    if (!namespaceCache) {
      return null;
    }

    const entry = namespaceCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      namespaceCache.delete(cacheKey);
      this.totalCacheSize -= entry.size;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private async setCache(key: string, data: any): Promise<void> {
    const [namespace, cacheKey] = this.parseCacheKey(key);

    if (!this.caches.has(namespace)) {
      this.caches.set(namespace, new Map());
    }

    const namespaceCache = this.caches.get(namespace)!;
    const size = this.calculateSize(data);
    const ttl = this.calculateTTL(namespace, data);

    // Check if we need to make space
    if (this.totalCacheSize + size > this.config.maxCacheSize) {
      await this.evictLRU(size);
    }

    const entry: CacheEntry<any> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl,
      size
    };

    namespaceCache.set(cacheKey, entry);
    this.totalCacheSize += size;
  }

  /**
   * Parse cache key into namespace and key
   */
  private parseCacheKey(key: string): [string, string] {
    const parts = key.split(':', 2);
    return [parts[0] || 'default', parts[1] || key];
  }

  /**
   * Calculate size of cached data
   */
  private calculateSize(data: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return 1024; // Default size for unserializable data
    }
  }

  /**
   * Calculate TTL for cache entry
   */
  private calculateTTL(namespace: string, data: any): number {
    const ttlMap: Record<string, number> = {
      'user_context': 10 * 60 * 1000, // 10 minutes
      'project_analysis': 30 * 60 * 1000, // 30 minutes
      'conversation_flow': 5 * 60 * 1000, // 5 minutes
      'vibe_detection': 2 * 60 * 1000, // 2 minutes
      'exercise_generation': 15 * 60 * 1000, // 15 minutes
      'natural_prompt': 20 * 60 * 1000 // 20 minutes
    };

    return ttlMap[namespace] || 10 * 60 * 1000; // Default 10 minutes
  }

  /**
   * Evict LRU entries to make space
   */
  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries: Array<{ namespace: string; key: string; entry: CacheEntry<any> }> = [];

    // Collect all entries with their access information
    for (const [namespace, cache] of this.caches.entries()) {
      for (const [key, entry] of cache.entries()) {
        entries.push({ namespace, key, entry });
      }
    }

    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    // Evict until we have enough space
    let freedSpace = 0;
    for (const { namespace, key, entry } of entries) {
      const namespaceCache = this.caches.get(namespace);
      if (namespaceCache) {
        namespaceCache.delete(key);
        this.totalCacheSize -= entry.size;
        freedSpace += entry.size;

        if (freedSpace >= requiredSpace) {
          break;
        }
      }
    }

    // Clean up empty namespaces
    for (const [namespace, cache] of this.caches.entries()) {
      if (cache.size === 0) {
        this.caches.delete(namespace);
      }
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(startTime: number, cacheHit: boolean, error: boolean): void {
    const responseTime = Date.now() - startTime;

    this.metrics.responseTime = this.calculateMovingAverage(
      this.metrics.responseTime,
      responseTime,
      0.1 // 10% weight for moving average
    );

    if (cacheHit) {
      this.metrics.cacheHitRate = Math.min(1, this.metrics.cacheHitRate + 0.01);
    } else {
      this.metrics.cacheHitRate = Math.max(0, this.metrics.cacheHitRate - 0.005);
    }

    if (error) {
      this.metrics.errorRate = Math.min(1, this.metrics.errorRate + 0.01);
    } else {
      this.metrics.errorRate = Math.max(0, this.metrics.errorRate - 0.005);
    }

    // Update metrics history
    this.metricsHistory.push({ ...this.metrics });
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }

    // Check for optimization opportunities
    this.checkOptimizationStrategies();
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(current: number, newValue: number, weight: number): number {
    return current * (1 - weight) + newValue * weight;
  }

  /**
   * Check and apply optimization strategies
   */
  private async checkOptimizationStrategies(): Promise<void> {
    for (const strategy of this.strategies.sort((a, b) => b.priority - a.priority)) {
      if (strategy.condition(this.metrics)) {
        try {
          await strategy.action();
          this.logger.info('Applied optimization strategy', {
            strategy: strategy.name,
            metrics: this.metrics
          });
        } catch (error) {
          this.logger.error('Failed to apply optimization strategy', error as Error, {
            strategy: strategy.name
          });
        }
        break; // Apply only one strategy at a time
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.logPerformanceStatus();
    }, this.config.performanceMonitoringInterval);
  }

  /**
   * Update current metrics
   */
  private updateMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed;

    // Calculate throughput (requests per minute)
    const recentMetrics = this.metricsHistory.slice(-60); // Last minute
    this.metrics.throughput = recentMetrics.length;
  }

  /**
   * Log performance status
   */
  private logPerformanceStatus(): void {
    const status = this.getPerformanceStatus();

    if (status.level !== 'optimal') {
      this.logger.warn('Performance issues detected', status);
    }

    // Adaptive threshold adjustment
    if (this.config.adaptiveThresholds) {
      this.adjustThresholds();
    }
  }

  /**
   * Get performance status
   */
  private getPerformanceStatus(): {
    level: 'optimal' | 'warning' | 'critical';
    issues: string[];
    metrics: PerformanceMetrics;
    } {
    const issues: string[] = [];

    if (this.metrics.responseTime > this.thresholds.maxResponseTime) {
      issues.push(`Response time ${this.metrics.responseTime}ms exceeds threshold ${this.thresholds.maxResponseTime}ms`);
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push(`Memory usage ${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB exceeds threshold ${Math.round(this.thresholds.maxMemoryUsage / 1024 / 1024)}MB`);
    }

    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate) {
      issues.push(`Cache hit rate ${(this.metrics.cacheHitRate * 100).toFixed(1)}% below threshold ${(this.thresholds.minCacheHitRate * 100).toFixed(1)}%`);
    }

    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      issues.push(`Error rate ${(this.metrics.errorRate * 100).toFixed(1)}% exceeds threshold ${(this.thresholds.maxErrorRate * 100).toFixed(1)}%`);
    }

    let level: 'optimal' | 'warning' | 'critical' = 'optimal';
    if (issues.length >= 3) {
      level = 'critical';
    } else if (issues.length > 0) {
      level = 'warning';
    }

    return {
      level,
      issues,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Adaptive threshold adjustment
   */
  private adjustThresholds(): void {
    const recentMetrics = this.metricsHistory.slice(-100); // Last 100 measurements

    if (recentMetrics.length < 50) return; // Need enough data

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;

    // Adjust thresholds based on recent performance
    this.thresholds.maxResponseTime = Math.max(500, avgResponseTime * 1.2);
    this.thresholds.maxMemoryUsage = Math.max(256 * 1024 * 1024, avgMemoryUsage * 1.2);
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    this.cacheCleanupInterval = setInterval(() => {
      this.performCacheCleanup();
    }, this.config.cacheCleanupInterval);
  }

  /**
   * Perform cache cleanup
   */
  private async performCacheCleanup(): Promise<void> {
    const now = Date.now();
    let cleanedEntries = 0;
    let freedSpace = 0;

    for (const [namespace, cache] of this.caches.entries()) {
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl || now - entry.lastAccessed > entry.ttl * 2) {
          cache.delete(key);
          cleanedEntries++;
          freedSpace += entry.size;
        }
      }

      // Remove empty namespaces
      if (cache.size === 0) {
        this.caches.delete(namespace);
      }
    }

    this.totalCacheSize -= freedSpace;

    if (cleanedEntries > 0) {
      this.logger.debug('Cache cleanup completed', {
        cleanedEntries,
        freedSpace: Math.round(freedSpace / 1024) + 'KB',
        totalCacheSize: Math.round(this.totalCacheSize / 1024 / 1024) + 'MB'
      });
    }
  }

  /**
   * Increase cache size
   */
  private async increaseCacheSize(): Promise<void> {
    this.config.maxCacheSize = Math.min(512 * 1024 * 1024, this.config.maxCacheSize * 1.2);
    this.logger.info('Increased cache size', {
      newSize: Math.round(this.config.maxCacheSize / 1024 / 1024) + 'MB'
    });
  }

  /**
   * Reduce concurrency
   */
  private async reduceConcurrency(): Promise<void> {
    this.maxConcurrentRequests = Math.max(5, this.maxConcurrentRequests - 2);
    this.logger.info('Reduced concurrency', {
      newMaxConcurrent: this.maxConcurrentRequests
    });
  }

  /**
   * Preload common data
   */
  private async preloadCommonData(): Promise<void> {
    for (const [key, loader] of this.preloadQueue.entries()) {
      try {
        await loader();
        this.preloadQueue.delete(key);
      } catch (error) {
        this.logger.warn('Failed to preload data', error as Error, { key });
      }
    }
  }

  /**
   * Register preloader
   */
  registerPreloader(key: string, loader: () => Promise<any>): void {
    this.preloadQueue.set(key, loader);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSize: number;
    totalEntries: number;
    namespaces: Array<{ name: string; entries: number; size: number }>;
    hitRate: number;
    } {
    const namespaces: Array<{ name: string; entries: number; size: number }> = [];

    for (const [name, cache] of this.caches.entries()) {
      let size = 0;
      for (const entry of cache.values()) {
        size += entry.size;
      }
      namespaces.push({
        name,
        entries: cache.size,
        size
      });
    }

    return {
      totalSize: this.totalCacheSize,
      totalEntries: namespaces.reduce((sum, ns) => sum + ns.entries, 0),
      namespaces,
      hitRate: this.metrics.cacheHitRate
    };
  }

  /**
   * Get optimization strategies
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    return [...this.strategies];
  }

  /**
   * Add custom optimization strategy
   */
  addOptimizationStrategy(strategy: OptimizationStrategy): void {
    this.strategies.push(strategy);
    this.logger.info('Added optimization strategy', {
      name: strategy.name,
      priority: strategy.priority
    });
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }

    this.caches.clear();
    this.preloadQueue.clear();
    this.requestQueue.length = 0;
    this.activeRequests.clear();

    this.logger.info('PerformanceOptimizer service disposed');
  }
}

/**
 * Global performance optimizer instance
 */
export const performanceOptimizer = new PerformanceOptimizer({
  logger: LoggerFactory.getLogger('PerformanceOptimizer')
});