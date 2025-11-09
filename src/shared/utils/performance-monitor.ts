/**
 * Performance Monitor Integration
 *
 * Centralized performance monitoring for the Learning Catalyst application.
 * Integrates with existing performance utilities and provides application-specific metrics.
 */

import { PerformanceMonitor, PerformanceMetrics, LRUCache, EventBatcher } from './performance-utils';
import { createTypedEventEmitter } from './type-utils';

// ============================================================================
// Application-Specific Performance Events
// ============================================================================

interface PerformanceEvents {
  'metric:recorded': PerformanceMetrics;
  'memory:warning': { usage: number; threshold: number };
  'operation:slow': { operation: string; duration: number; threshold: number };
  'cache:eviction': { cache: string; entries: number; reason: string };
  'performance:degradation': { metric: string; degradation: number };
}

// ============================================================================
// Application Performance Monitor
// ============================================================================

export class AppPerformanceMonitor {
  private monitor = new PerformanceMonitor();
  private events = createTypedEventEmitter<PerformanceEvents>();
  private cache = new LRUCache<string, PerformanceMetrics>(1000);
  private alertThresholds = new Map<string, number>();
  private batchProcessor: EventBatcher<PerformanceMetrics>;
  private memoryMonitor: MemoryMonitor;

  constructor() {
    this.setupDefaultThresholds();
    this.setupBatchProcessor();
    this.setupMemoryMonitoring();
    this.monitor.startMonitoring();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  private setupDefaultThresholds(): void {
    this.alertThresholds.set('database_query', 1000); // 1 second
    this.alertThresholds.set('ai_response', 5000);    // 5 seconds
    this.alertThresholds.set('ui_render', 100);       // 100ms
    this.alertThresholds.set('ipc_call', 50);         // 50ms
    this.alertThresholds.set('cache_operation', 10);  // 10ms
  }

  private setupBatchProcessor(): void {
    this.batchProcessor = new EventBatcher(
      (metrics: PerformanceMetrics[]) => {
        this.processBatchedMetrics(metrics);
      },
      {
        batchSize: 50,
        flushInterval: 5000 // 5 seconds
      }
    );
  }

  private setupMemoryMonitoring(): void {
    this.memoryMonitor = new MemoryMonitor({
      warningThreshold: 80,    // 80% of available memory
      criticalThreshold: 90,   // 90% of available memory
      checkInterval: 30000     // 30 seconds
    });

    this.memoryMonitor.on('warning', (usage) => {
      this.events.emit('memory:warning', usage);
    });
  }

  // ============================================================================
  // Metric Recording
  // ============================================================================

  /**
   * Record a custom performance metric
   */
  recordMetric(name: string, duration: number, metadata?: any): void {
    this.monitor.recordMetric(name, duration, metadata);

    const metric: PerformanceMetrics = {
      operation: name,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata
    };

    // Check for performance alerts
    this.checkPerformanceAlerts(metric);

    // Batch for processing
    this.batchProcessor.add(metric);

    // Cache recent metrics
    this.cache.set(`${name}_${Date.now()}`, metric);
  }

  /**
   * Measure an async operation's performance
   */
  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    return this.monitor.measureAsync(operation, fn);
  }

  // ============================================================================
  // Performance Analysis
  // ============================================================================

  /**
   * Get performance statistics for a specific operation
   */
  getOperationStats(operation: string) {
    return this.monitor.getStats(operation);
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(operation: string, timeWindow: number = 3600000): PerformanceTrend[] {
    const now = Date.now();
    const cutoff = now - timeWindow;

    const trends: PerformanceTrend[] = [];
    const bucketSize = Math.floor(timeWindow / 20); // 20 buckets

    for (let i = 0; i < 20; i++) {
      const bucketStart = cutoff + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;

      const bucketMetrics = this.getMetricsInTimeRange(operation, bucketStart, bucketEnd);

      if (bucketMetrics.length > 0) {
        const avgDuration = bucketMetrics.reduce((sum, m) => sum + m.duration, 0) / bucketMetrics.length;
        const errorRate = bucketMetrics.filter(m => !m.success).length / bucketMetrics.length;

        trends.push({
          timestamp: bucketStart,
          averageDuration: avgDuration,
          errorRate,
          sampleCount: bucketMetrics.length
        });
      }
    }

    return trends;
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const operations = this.monitor.getAvailableMetrics();

    for (const operation of operations) {
      const stats = this.monitor.getStats(operation);
      if (!stats) continue;

      const threshold = this.alertThresholds.get(operation) || 1000;

      if (stats.averageDuration > threshold) {
        bottlenecks.push({
          operation,
          severity: this.calculateSeverity(stats.averageDuration, threshold),
          averageDuration: stats.averageDuration,
          maxDuration: stats.maxDuration,
          errorRate: stats.errorRate,
          threshold,
          recommendation: this.getRecommendation(operation, stats)
        });
      }
    }

    return bottlenecks.sort((a, b) => b.severity - a.severity);
  }

  // ============================================================================
  // Memory Management
  // ============================================================================

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    return this.memoryMonitor.getCurrentStats();
  }

  /**
   * Trigger garbage collection (if available)
   */
  triggerGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  on<TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void
  ): void {
    this.events.on(event, listener);
  }

  off<TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void
  ): void {
    this.events.off(event, listener);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private checkPerformanceAlerts(metric: PerformanceMetrics): void {
    const threshold = this.alertThresholds.get(metric.operation);
    if (threshold && metric.duration > threshold) {
      this.events.emit('operation:slow', {
        operation: metric.operation,
        duration: metric.duration,
        threshold
      });
    }
  }

  private processBatchedMetrics(metrics: PerformanceMetrics[]): void {
    // Process metrics in bulk for analytics
    metrics.forEach(metric => {
      this.events.emit('metric:recorded', metric);
    });
  }

  private getMetricsInTimeRange(operation: string, start: number, end: number): PerformanceMetrics[] {
    const metrics: PerformanceMetrics[] = [];
    const keys = this.cache.keys().filter(key =>
      key.startsWith(operation) &&
      parseInt(key.split('_')[1]) >= start &&
      parseInt(key.split('_')[1]) <= end
    );

    keys.forEach(key => {
      const metric = this.cache.get(key);
      if (metric) metrics.push(metric);
    });

    return metrics;
  }

  private calculateSeverity(duration: number, threshold: number): number {
    const ratio = duration / threshold;
    if (ratio > 5) return 10; // Critical
    if (ratio > 3) return 7;  // High
    if (ratio > 2) return 5;  // Medium
    if (ratio > 1.5) return 3; // Low
    return 1; // Minimal
  }

  private getRecommendation(operation: string, stats: any): string {
    const recommendations: Record<string, string> = {
      'database_query': 'Consider adding indexes or optimizing query structure',
      'ai_response': 'Check model performance or consider caching responses',
      'ui_render': 'Optimize component rendering, use React.memo or useMemo',
      'ipc_call': 'Reduce payload size or optimize handler logic',
      'cache_operation': 'Review cache key generation or consider different cache strategy'
    };

    return recommendations[operation] || 'Investigate operation implementation and consider optimization strategies';
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.monitor.stopMonitoring();
    this.batchProcessor.cancel();
    this.memoryMonitor.dispose();
    this.cache.dispose();
  }
}

// ============================================================================
// Supporting Types and Classes
// ============================================================================

export interface PerformanceTrend {
  timestamp: number;
  averageDuration: number;
  errorRate: number;
  sampleCount: number;
}

export interface PerformanceBottleneck {
  operation: string;
  severity: number;
  averageDuration: number;
  maxDuration: number;
  errorRate: number;
  threshold: number;
  recommendation: string;
}

export interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
}

interface MemoryMonitorOptions {
  warningThreshold: number;
  criticalThreshold: number;
  checkInterval: number;
}

class MemoryMonitor {
  private options: MemoryMonitorOptions;
  private intervalId: NodeJS.Timeout | null = null;
  private events = createTypedEventEmitter<{
    warning: { usage: number; threshold: number };
    critical: { usage: number; threshold: number };
  }>();

  constructor(options: MemoryMonitorOptions) {
    this.options = options;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      const stats = this.getCurrentStats();

      if (stats.percentage >= this.options.criticalThreshold) {
        this.events.emit('critical', {
          usage: stats.percentage,
          threshold: this.options.criticalThreshold
        });
      } else if (stats.percentage >= this.options.warningThreshold) {
        this.events.emit('warning', {
          usage: stats.percentage,
          threshold: this.options.warningThreshold
        });
      }
    }, this.options.checkInterval);
  }

  getCurrentStats(): MemoryStats {
    const usage = process.memoryUsage();

    // Try to get system memory info (Node.js v14.10.0+)
    let totalMemory = 1024 * 1024 * 1024; // 1GB default
    try {
      totalMemory = require('os').totalmem();
    } catch {
      // Fallback if os module not available
    }

    return {
      used: usage.rss,
      total: totalMemory,
      percentage: (usage.rss / totalMemory) * 100,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    };
  }

  on(event: 'warning' | 'critical', listener: (data: any) => void): void {
    this.events.on(event, listener);
  }

  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const appPerformanceMonitor = new AppPerformanceMonitor();