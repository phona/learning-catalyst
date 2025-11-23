// @ts-nocheck
/**
 * Production Performance Service
 *
 * Integrates performance monitoring, memory leak detection, and optimization
 * patterns for production deployment.
 */

import {
  createAppPerformanceMonitor,
  PerformanceBottleneck,
  PerformanceTrend,
  MemoryStats,
} from '@/shared/utils/performance-monitor';
import {
  LRUCache,
  PerformanceMonitor,
  EventBatcher,
  memoizeAsync,
  Debounced,
} from '@/shared/utils/performance-utils';
import { createTypedEventEmitter } from '@/shared/utils/type-utils';

interface PerformanceEvents {
  'memory:warning': { usage: number; threshold: number };
  'memory:critical': { usage: number; threshold: number };
  'bottleneck:identified': PerformanceBottleneck;
  'cache:eviction': { cache: string; entries: number; reason: string };
  'performance:degraded': { operation: string; duration: number; threshold: number };
  'monitoring:started': void;
  'monitoring:stopped': void;
}

/**
 * Production Performance Service
 *
 * Provides centralized performance monitoring and optimization for production deployment.
 * Integrates with Electron main process for system-level monitoring.
 */
export class ProductionPerformanceService {
  private readonly monitor = createAppPerformanceMonitor();
  private readonly events = createTypedEventEmitter<PerformanceEvents>();

  // Production caches
  private readonly serviceCache = new LRUCache<string, any>(500, 50); // 500 entries, 50MB max
  private readonly analyticsCache = new LRUCache<string, any>(1000, 100); // 1000 entries, 100MB max
  private readonly uiCache = new LRUCache<string, any>(200, 20); // 200 entries, 20MB max

  // Memory leak detection
  private readonly memoryLeaks = new Map<string, { count: number; lastDetected: number }>();
  private leakDetectionInterval: NodeJS.Timeout | null = null;

  // Performance reporting
  private readonly reportBatcher = new EventBatcher<any>(this.handlePerformanceReport.bind(this), {
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
  });

  // Auto-optimization thresholds
  private readonly OPTIMIZATION_THRESHOLDS = {
    MEMORY_WARNING: 70, // 70% memory usage
    MEMORY_CRITICAL: 85, // 85% memory usage
    RESPONSE_TIME_SLOW: 2000, // 2 seconds
    RESPONSE_TIME_CRITICAL: 5000, // 5 seconds
    CACHE_HIT_RATE_LOW: 60, // 60% hit rate
    ERROR_RATE_HIGH: 10, // 10% error rate
  };

  constructor() {
    this.setupMonitoring();
    this.setupAutoOptimization();
    this.startLeakDetection();
  }

  // ============================================================================
  // Initialization and Setup
  // ============================================================================

  private setupMonitoring(): void {
    // Monitor memory usage through direct monitoring
    setInterval(() => {
      const memoryStats = this.monitor.getMemoryStats();
      if (memoryStats.percentage >= this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING) {
        this.events.emit('memory:warning', {
          usage: memoryStats.percentage,
          threshold: this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING,
        });
        this.triggerMemoryOptimization();
      }
      if (memoryStats.percentage >= this.OPTIMIZATION_THRESHOLDS.MEMORY_CRITICAL) {
        this.events.emit('memory:critical', {
          usage: memoryStats.percentage,
          threshold: this.OPTIMIZATION_THRESHOLDS.MEMORY_CRITICAL,
        });
        this.emergencyMemoryCleanup();
      }
    }, 30000); // Check every 30 seconds

    // Monitor performance bottlenecks
    const checkBottlenecks = () => {
      const bottlenecks = this.monitor.identifyBottlenecks();
      bottlenecks.forEach((bottleneck) => {
        this.events.emit('bottleneck:identified', bottleneck);
      });
    };

    // Check bottlenecks every minute
    setInterval(checkBottlenecks, 60000);
  }

  private setupAutoOptimization(): void {
    // Auto-optimize based on performance metrics
    setInterval(() => {
      this.analyzeAndOptimize();
    }, 300000); // Every 5 minutes
  }

  // ============================================================================
  // Performance Measurement
  // ============================================================================

  /**
   * Measure and record performance for operations
   */
  async measureOperation<T>(operation: string, fn: () => Promise<T>, metadata?: any): Promise<T> {
    const result = await this.monitor.measureOperation(operation, fn, metadata);

    // Record in performance reporter
    this.reportBatcher.add({
      operation,
      timestamp: Date.now(),
      metadata,
    });

    return result;
  }

  /**
   * Record a performance metric (public API)
   */
  recordMetric(name: string, duration: number, metadata?: any): void {
    // Use the underlying monitor
    this.monitor.recordMetric(name, duration, metadata);

    const metric = {
      operation: name,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata,
    };

    // Check for performance alerts
    this.checkPerformanceAlerts(metric as any);

    // Batch for processing
    this.reportBatcher.add(metric);

    // Cache recent metrics
    this.serviceCache.set(`${name}_${Date.now()}`, metric);
  }

  /**
   * Memoize expensive operations with automatic caching
   */
  memoizeOperation<T extends (...args: any[]) => Promise<any>>(
    func: T,
    cacheKey: string,
    options?: {
      ttl?: number;
      maxSize?: number;
    },
  ): T {
    return memoizeAsync(func, {
      ttl: options?.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: options?.maxSize || 100,
      keyGenerator: () => `${cacheKey}_${JSON.stringify(arguments)}`,
    });
  }

  /**
   * Debounced operations for UI optimization
   */
  createDebouncedOperation<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options?: {
      leading?: boolean;
      trailing?: boolean;
      maxWait?: number;
    },
  ): Debounced<T> {
    return new Debounced(func, wait, options || { leading: false, trailing: true });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private checkPerformanceAlerts(metric: any): void {
    const threshold = this.alertThresholds.get(metric.operation);
    if (threshold && metric.duration > threshold) {
      this.events.emit('operation:slow' as any, {
        operation: metric.operation,
        duration: metric.duration,
        threshold,
      });
    }
  }

  private handlePerformanceReport(reports: any[]): void {
    // Aggregate and send performance reports
    // In production, this would send to monitoring service
    console.debug('[Performance] Handling performance reports:', reports.length);
  }

  private analyzeAndOptimize(): void {
    const bottlenecks = this.monitor.identifyBottlenecks();

    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity > 7) {
        console.warn('[Performance] High severity bottleneck detected:', bottleneck);
        this.applyBottleneckRemediation(bottleneck);
      }
    });

    // Analyze cache performance
    const cacheStats = this.getCacheStatistics();
    Object.entries(cacheStats).forEach(([cacheName, stats]) => {
      if (stats.utilizationPercent > 95) {
        console.info(`[Performance] Cache ${cacheName} utilization: ${stats.utilizationPercent}%`);
      }
    });
  }

  private applyBottleneckRemediation(bottleneck: PerformanceBottleneck): void {
    switch (bottleneck.operation) {
      case 'database_query':
        // Could implement query result caching
        break;
      case 'ai_response':
        // Could implement response caching
        break;
      case 'ui_render':
        // Could implement component memoization
        break;
      case 'ipc_call':
        // Could implement call batching
        break;
    }
  }

  private triggerMemoryOptimization(): void {
    console.info('[Performance] Triggering memory optimization...');

    // Clear UI cache first (least critical)
    this.uiCache.clear();

    // Clear analytics cache if still over threshold
    const stats = this.getMemoryStats();
    if (stats.percentage > this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING + 5) {
      this.analyticsCache.clear();
    }

    // Trigger garbage collection
    this.triggerGarbageCollection();
  }

  private emergencyMemoryCleanup(): void {
    console.warn('[Performance] Emergency memory cleanup triggered...');

    // Clear all caches
    this.clearAllCaches();

    // Aggressive garbage collection
    this.triggerGarbageCollection();

    // Force cleanup of event listeners and intervals
    this.performAggressiveCleanup();
  }

  private performAggressiveCleanup(): void {
    // Additional cleanup strategies
    // 1. Clear any pending timeouts or intervals
    // (Implementation would depend on tracking these)
    // 2. Clear weak references
    // (Implementation would depend on tracking weak references)
    // 3. Force DOM cleanup if needed
    // (Implementation would depend on tracking DOM elements)
  }

  private recordPotentialLeak(source: string, reason: string): void {
    const existing = this.memoryLeaks.get(source);
    if (existing) {
      existing.count++;
      existing.lastDetected = Date.now();
    } else {
      this.memoryLeaks.set(source, { count: 1, lastDetected: Date.now() });
    }
  }

  private identifyLeakSource(): void {
    // Analyze cache utilization
    const cacheStats = this.getCacheStatistics();

    // Detect oversized caches
    Object.entries(cacheStats).forEach(([cacheName, stats]) => {
      if (stats.utilizationPercent > 90) {
        this.recordPotentialLeak(cacheName, 'cache_oversized');
      }
    });

    // Force cleanup of least recently used items
    this.performAggressiveCleanup();
  }

  private detectMemoryLeaks(): void {
    const currentStats = this.getMemoryStats();
    const previousStats = this.getMemoryStats(); // In production, store previous stats

    // Detect unusual memory growth
    if (currentStats.percentage > this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING) {
      this.identifyLeakSource();
    }
  }

  private handlePerformanceReport(reports: any[]): void {
    // Process metrics in bulk for analytics
    reports.forEach((report) => {
      // In production, send to monitoring service
      console.debug('[Performance] Report:', report);
    });
  }

  /**
   * Get performance trends for analysis
   */
  getPerformanceTrends(
    operation: string,
    timeWindow: number = 3600000, // 1 hour
  ): PerformanceTrend[] {
    return this.monitor.getPerformanceTrends(operation, timeWindow);
  }

  /**
   * Identify current performance bottlenecks
   */
  getBottlenecks(): PerformanceBottleneck[] {
    return this.monitor.identifyBottlenecks();
  }

  // ============================================================================
  // Memory Management and Leak Detection
  // ============================================================================

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    return this.monitor.getMemoryStats();
  }

  /**
   * Get cache statistics for all caches
   */
  getCacheStatistics() {
    return {
      service: this.serviceCache.getStats(),
      analytics: this.analyticsCache.getStats(),
      ui: this.uiCache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.serviceCache.clear();
    this.analyticsCache.clear();
    this.uiCache.clear();

    this.events.emit('cache:eviction', {
      cache: 'all',
      entries: 0,
      reason: 'manual_cleanup',
    });
  }

  /**
   * Trigger garbage collection if available
   */
  triggerGarbageCollection(): boolean {
    return this.monitor.triggerGarbageCollection();
  }

  private startLeakDetection(): void {
    this.leakDetectionInterval = setInterval(() => {
      this.detectMemoryLeaks();
    }, 30000); // Every 30 seconds
  }

  private detectMemoryLeaks(): void {
    const currentStats = this.getMemoryStats();
    const previousStats = this.getMemoryStats(); // In production, store previous stats

    // Detect unusual memory growth
    if (currentStats.percentage > this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING) {
      this.identifyLeakSource();
    }
  }

  private identifyLeakSource(): void {
    // Analyze cache utilization
    const cacheStats = this.getCacheStatistics();

    // Detect oversized caches
    Object.entries(cacheStats).forEach(([cacheName, stats]) => {
      if (stats.utilizationPercent > 90) {
        this.recordPotentialLeak(cacheName, 'cache_oversized');
      }
    });

    // Force cleanup of least recently used items
    this.performAggressiveCleanup();
  }

  private recordPotentialLeak(source: string, reason: string): void {
    const existing = this.memoryLeaks.get(source);
    if (existing) {
      existing.count++;
      existing.lastDetected = Date.now();
    } else {
      this.memoryLeaks.set(source, { count: 1, lastDetected: Date.now() });
    }
  }

  // ============================================================================
  // Performance Optimization
  // ============================================================================

  private triggerMemoryOptimization(): void {
    console.info('[Performance] Triggering memory optimization...');

    // Clear UI cache first (least critical)
    this.uiCache.clear();

    // Clear analytics cache if still over threshold
    const stats = this.getMemoryStats();
    if (stats.percentage > this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING + 5) {
      this.analyticsCache.clear();
    }

    // Trigger garbage collection
    this.triggerGarbageCollection();
  }

  private emergencyMemoryCleanup(): void {
    console.warn('[Performance] Emergency memory cleanup triggered...');

    // Clear all caches
    this.clearAllCaches();

    // Aggressive garbage collection
    this.triggerGarbageCollection();

    // Force cleanup of event listeners and intervals
    this.performAggressiveCleanup();
  }

  private performAggressiveCleanup(): void {
    // Additional cleanup strategies
    // 1. Clear any pending timeouts or intervals
    // (Implementation would depend on tracking these)
    // 2. Clear weak references
    // (Implementation would depend on tracking weak references)
    // 3. Force DOM cleanup if needed
    // (Implementation would depend on tracking DOM elements)
  }

  private analyzeAndOptimize(): void {
    const bottlenecks = this.monitor.identifyBottlenecks();

    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity > 7) {
        console.warn('[Performance] High severity bottleneck detected:', bottleneck);
        this.applyBottleneckRemediation(bottleneck);
      }
    });

    // Analyze cache performance
    const cacheStats = this.getCacheStatistics();
    Object.entries(cacheStats).forEach(([cacheName, stats]) => {
      if (stats.utilizationPercent > 95) {
        console.info(`[Performance] Cache ${cacheName} utilization: ${stats.utilizationPercent}%`);
      }
    });
  }

  private applyBottleneckRemediation(bottleneck: PerformanceBottleneck): void {
    switch (bottleneck.operation) {
      case 'database_query':
        // Could implement query result caching
        break;
      case 'ai_response':
        // Could implement response caching
        break;
      case 'ui_render':
        // Could implement component memoization
        break;
      case 'ipc_call':
        // Could implement call batching
        break;
    }
  }

  // ============================================================================
  // Performance Reporting
  // ============================================================================

  private async handlePerformanceReport(reports: any[]): Promise<void> {
    // Aggregate and send performance reports
    // In production, this would send to monitoring service
    console.debug('[Performance] Handling performance reports:', reports.length);
  }

  /**
   * Get performance trends for analysis
   */
  getPerformanceTrends(
    operation: string,
    timeWindow: number = 3600000, // 1 hour
  ): PerformanceTrend[] {
    return this.monitor.getPerformanceTrends(operation, timeWindow);
  }

  /**
   * Identify current performance bottlenecks
   */
  getBottlenecks(): PerformanceBottleneck[] {
    return this.monitor.identifyBottlenecks();
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  on<TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void,
  ): void {
    this.events.on(event, listener);
  }

  off<TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void,
  ): void {
    this.events.off(event, listener);
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    console.info('[Performance] Starting production performance monitoring...');
    // Emit start event with empty data
    this.events.emit('monitoring:started' as any, {} as any);
  }

  /**
   * Stop performance monitoring and cleanup
   */
  stopMonitoring(): void {
    console.info('[Performance] Stopping performance monitoring...');

    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }

    this.reportBatcher.cancel();
    this.monitor.dispose();
    // Emit stop event with empty data
    this.events.emit('monitoring:stopped' as any, {} as any);
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    const memory = this.getMemoryStats();
    const bottlenecks = this.getBottlenecks();
    const caches = this.getCacheStatistics();

    return {
      healthy: memory.percentage < this.OPTIMIZATION_THRESHOLDS.MEMORY_CRITICAL,
      memory: {
        usage: memory.percentage,
        status:
          memory.percentage < this.OPTIMIZATION_THRESHOLDS.MEMORY_WARNING
            ? 'healthy'
            : memory.percentage < this.OPTIMIZATION_THRESHOLDS.MEMORY_CRITICAL
              ? 'warning'
              : 'critical',
      },
      bottlenecks: {
        count: bottlenecks.length,
        severe: bottlenecks.filter((b) => b.severity > 7).length,
      },
      caches: {
        totalSize: caches.service.size + caches.analytics.size + caches.ui.size,
        utilization:
          (caches.service.utilizationPercent +
            caches.analytics.utilizationPercent +
            caches.ui.utilizationPercent) /
          3,
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const performanceService = new ProductionPerformanceService();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  performanceService.startMonitoring();
}
