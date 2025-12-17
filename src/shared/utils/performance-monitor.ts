// @ts-nocheck
/**
 * Performance Monitor Integration
 *
 * Centralized performance monitoring for the Learning Catalyst application.
 * Integrates with existing performance utilities and provides application-specific metrics.
 */

import { PerformanceMonitor, LRUCache, EventBatcher } from './performance-utils';
import { createTypedEventEmitter } from './type-utils';
import { totalmem } from 'os';

interface PerformanceMetrics {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

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

export const createAppPerformanceMonitor = () => {
  const monitor = new PerformanceMonitor();
  const events = createTypedEventEmitter<PerformanceEvents>();
  const cache = new LRUCache<string, PerformanceMetrics>(1000);
  const alertThresholds = new Map<string, number>();
  let batchProcessor = new EventBatcher<PerformanceMetrics>(() => {}, {
    batchSize: 50,
    flushInterval: 5000,
  });
  let memoryMonitor: MemoryMonitor;

  const setupDefaultThresholds = (): void => {
    alertThresholds.set('database_query', 1000);
    alertThresholds.set('ai_response', 5000);
    alertThresholds.set('ui_render', 100);
    alertThresholds.set('ipc_call', 50);
    alertThresholds.set('cache_operation', 10);
  };

  const processBatchedMetrics = (metrics: PerformanceMetrics[]): void => {
    metrics.forEach((metric) => {
      events.emit('metric:recorded', metric);
    });
  };

  const setupBatchProcessor = (): void => {
    batchProcessor = new EventBatcher(processBatchedMetrics, {
      batchSize: 50,
      flushInterval: 5000,
    });
  };

  const setupMemoryMonitoring = (): void => {
    memoryMonitor = new MemoryMonitor({
      warningThreshold: 80,
      criticalThreshold: 90,
      checkInterval: 30000,
    });
    memoryMonitor.on('warning', (usage) => {
      events.emit('memory:warning', usage);
    });
  };

  const checkPerformanceAlerts = (metric: PerformanceMetrics): void => {
    const threshold = alertThresholds.get((metric as unknown).operation);
    if (threshold && (metric as unknown).duration > threshold) {
      events.emit('operation:slow', {
        operation: (metric as unknown).operation,
        duration: (metric as unknown).duration,
        threshold,
      });
    }
  };

  const getMetricsInTimeRange = (
    operation: string,
    start: number,
    end: number,
  ): PerformanceMetrics[] => {
    const metrics: PerformanceMetrics[] = [];
    const allMetrics = (cache.getStats() as unknown).entries || {};
    for (const [key, value] of Object.entries(allMetrics)) {
      const parts = key.split('_');
      const ts = parseInt(parts[1]);
      if (key.startsWith(operation) && ts >= start && ts <= end) {
        metrics.push(value as PerformanceMetrics);
      }
    }
    return metrics;
  };

  const calculateSeverity = (duration: number, threshold: number): number => {
    const ratio = duration / threshold;
    if (ratio > 5) return 10;
    if (ratio > 3) return 7;
    if (ratio > 2) return 5;
    if (ratio > 1.5) return 3;
    return 1;
  };

  const getRecommendation = (operation: string, stats: unknown): string => {
    const recommendations: Record<string, string> = {
      database_query: 'Consider adding indexes or optimizing query structure',
      ai_response: 'Check model performance or consider caching responses',
      ui_render: 'Optimize component rendering, use React.memo or useMemo',
      ipc_call: 'Reduce payload size or optimize handler logic',
      cache_operation: 'Review cache key generation or consider different cache strategy',
    };
    return (
      recommendations[operation] ||
      'Investigate operation implementation and consider optimization strategies'
    );
  };

  const recordMetric = (name: string, duration: number, metadata?: unknown): void => {
    monitor.recordMetric(name, duration, metadata);
    const metric: unknown = {
      operation: name,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata,
    };
    checkPerformanceAlerts(metric);
    batchProcessor.add(metric);
    cache.set(`${name}_${Date.now()}`, metric as PerformanceMetrics);
  };

  const measureOperation = async <T>(
    operation: string,
    fn: () => Promise<T>,
    _metadata?: unknown,
  ): Promise<T> => {
    return monitor.measureAsync(operation, fn);
  };

  const getOperationStats = (operation: string) => {
    return monitor.getStats(operation);
  };

  const getPerformanceTrends = (operation: string, timeWindow = 3600000): PerformanceTrend[] => {
    const now = Date.now();
    const cutoff = now - timeWindow;
    const trends: PerformanceTrend[] = [];
    const bucketSize = Math.floor(timeWindow / 20);
    for (let i = 0; i < 20; i++) {
      const bucketStart = cutoff + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const bucketMetrics = getMetricsInTimeRange(operation, bucketStart, bucketEnd);
      if (bucketMetrics.length > 0) {
        const avgDuration =
          bucketMetrics.reduce((sum, m: unknown) => sum + m.duration, 0) / bucketMetrics.length;
        const errorRate =
          bucketMetrics.filter((m: unknown) => !m.success).length / bucketMetrics.length;
        trends.push({
          timestamp: bucketStart,
          averageDuration: avgDuration,
          errorRate,
          sampleCount: bucketMetrics.length,
        });
      }
    }
    return trends;
  };

  const identifyBottlenecks = (): PerformanceBottleneck[] => {
    const bottlenecks: PerformanceBottleneck[] = [];
    const operations = monitor.getAvailableMetrics();
    for (const operation of operations) {
      const stats = monitor.getStats(operation);
      if (!stats) continue;
      const threshold = alertThresholds.get(operation) || 1000;
      if ((stats as unknown).averageDuration > threshold) {
        bottlenecks.push({
          operation,
          severity: calculateSeverity((stats as unknown).averageDuration, threshold),
          averageDuration: (stats as unknown).averageDuration,
          maxDuration: (stats as unknown).maxDuration,
          errorRate: (stats as unknown).errorRate,
          threshold,
          recommendation: getRecommendation(operation, stats),
        });
      }
    }
    return bottlenecks.sort((a, b) => b.severity - a.severity);
  };

  const getMemoryStats = (): MemoryStats => {
    return memoryMonitor.getCurrentStats();
  };

  const triggerGarbageCollection = (): boolean => {
    if ((global as unknown).gc) {
      (global as unknown).gc();
      return true;
    }
    return false;
  };

  const on = <TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void,
  ): void => {
    events.on(event, listener);
  };

  const off = <TKey extends keyof PerformanceEvents>(
    event: TKey,
    listener: (data: PerformanceEvents[TKey]) => void,
  ): void => {
    events.off(event, listener);
  };

  const dispose = (): void => {
    monitor.stopMonitoring();
    batchProcessor.cancel();
    memoryMonitor.dispose();
    cache.dispose();
  };

  setupDefaultThresholds();
  setupBatchProcessor();
  setupMemoryMonitoring();
  monitor.startMonitoring();

  return {
    recordMetric,
    measureOperation,
    getOperationStats,
    getPerformanceTrends,
    identifyBottlenecks,
    getMemoryStats,
    triggerGarbageCollection,
    on,
    off,
    dispose,
  };
};

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
  private readonly options: MemoryMonitorOptions;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly events = createTypedEventEmitter<{
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
          threshold: this.options.criticalThreshold,
        });
      } else if (stats.percentage >= this.options.warningThreshold) {
        this.events.emit('warning', {
          usage: stats.percentage,
          threshold: this.options.warningThreshold,
        });
      }
    }, this.options.checkInterval);
  }

  getCurrentStats(): MemoryStats {
    const usage = process.memoryUsage();

    // Try to get system memory info (Node.js v14.10.0+)
    let totalMemory = 1024 * 1024 * 1024; // 1GB default
    try {
      totalMemory = totalmem();
    } catch {
      // Fallback if os module not available
    }

    return {
      used: usage.rss,
      total: totalMemory,
      percentage: (usage.rss / totalMemory) * 100,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    };
  }

  on(event: 'warning' | 'critical', listener: (data: unknown) => void): void {
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

export const appPerformanceMonitor = createAppPerformanceMonitor();
