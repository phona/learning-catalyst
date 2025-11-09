/**
 * Performance Test Utilities
 *
 * Utility functions for performance testing including memory profiling,
 * resource tracking, leak detection, and performance monitoring.
 */

import { vi } from 'vitest';

// Performance monitoring interfaces
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface ResourceMetrics {
  memoryUsage: MemorySnapshot;
  activeHandles: number;
  activeRequests: number;
  openFiles: number;
  cpuUsage: NodeJS.CpuUsage;
}

export interface PerformanceReport {
  testName: string;
  duration: number;
  memoryDelta: MemorySnapshot;
  resourceUsage: ResourceMetrics[];
  leaks: LeakInfo[];
  recommendations: string[];
}

export interface LeakInfo {
  type: 'memory' | 'handle' | 'listener' | 'timer';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  resource?: any;
}

// Memory Profiler
export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private isProfiling = false;

  startProfiling(): void {
    this.snapshots = [];
    this.isProfiling = true;
    this.takeSnapshot();
  }

  stopProfiling(): MemorySnapshot[] {
    this.isProfiling = false;
    this.takeSnapshot();
    return this.snapshots;
  }

  takeSnapshot(): MemorySnapshot {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      };

      if (this.isProfiling) {
        this.snapshots.push(snapshot);
      }

      return snapshot;
    }

    // Fallback for browser environments
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };

    if (this.isProfiling) {
      this.snapshots.push(snapshot);
    }

    return snapshot;
  }

  getMemoryDelta(start: MemorySnapshot, end: MemorySnapshot): MemorySnapshot {
    return {
      timestamp: end.timestamp - start.timestamp,
      heapUsed: end.heapUsed - start.heapUsed,
      heapTotal: end.heapTotal - start.heapTotal,
      external: end.external - start.external,
      rss: end.rss - start.rss
    };
  }

  getMemoryTrend(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots = [];
    this.isProfiling = false;
  }
}

// Resource Tracker
export class ResourceTracker {
  private resources: Map<string, any> = new Map();
  private metrics: ResourceMetrics[] = [];

  trackResource(id: string, resource: any, type: string): void {
    this.resources.set(id, { resource, type, createdAt: Date.now() });
  }

  untrackResource(id: string): void {
    this.resources.delete(id);
  }

  getResourceCount(): number {
    return this.resources.size;
  }

  getTrackedResources(): Array<{ id: string; type: string; createdAt: number }> {
    return Array.from(this.resources.entries()).map(([id, info]) => ({
      id,
      type: info.type,
      createdAt: info.createdAt
    }));
  }

  async takeMetrics(): Promise<ResourceMetrics> {
    const metrics: ResourceMetrics = {
      memoryUsage: this.takeMemorySnapshot(),
      activeHandles: this.getHandleCount(),
      activeRequests: this.getRequestCount(),
      openFiles: this.getFileCount(),
      cpuUsage: this.getCpuUsage()
    };

    this.metrics.push(metrics);
    return metrics;
  }

  getMetrics(): ResourceMetrics[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  clear(): void {
    this.resources.clear();
    this.metrics = [];
  }

  private takeMemorySnapshot(): MemorySnapshot {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      };
    }

    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };
  }

  private getHandleCount(): number {
    // Mock implementation - in real environments this would track actual handles
    return Math.floor(Math.random() * 10) + 5;
  }

  private getRequestCount(): number {
    // Mock implementation - in real environments this would track active requests
    return Math.floor(Math.random() * 5) + 2;
  }

  private getFileCount(): number {
    // Mock implementation - in real environments this would track open file descriptors
    return Math.floor(Math.random() * 3) + 1;
  }

  private getCpuUsage(): NodeJS.CpuUsage {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      return process.cpuUsage();
    }

    return { user: 0, system: 0 };
  }
}

// Leak Detector
export class LeakDetector {
  private memoryProfiler = new MemoryProfiler();
  private resourceTracker = new ResourceTracker();
  private detectedLeaks: LeakInfo[] = [];

  startDetection(): void {
    this.memoryProfiler.startProfiling();
    this.detectedLeaks = [];
  }

  stopDetection(): LeakInfo[] {
    this.memoryProfiler.stopProfiling();
    this.analyzeForLeaks();
    return this.detectedLeaks;
  }

  trackResource(id: string, resource: any, type: string): void {
    this.resourceTracker.trackResource(id, resource, type);
  }

  untrackResource(id: string): void {
    this.resourceTracker.untrackResource(id);
  }

  private analyzeForLeaks(): void {
    const snapshots = this.memoryProfiler.getMemoryTrend();
    if (snapshots.length < 2) return;

    const start = snapshots[0];
    const end = snapshots[snapshots.length - 1];
    const memoryDelta = this.memoryProfiler.getMemoryDelta(start, end);

    // Check for memory leaks
    if (memoryDelta.heapUsed > 10 * 1024 * 1024) { // 10MB threshold
      this.detectedLeaks.push({
        type: 'memory',
        severity: 'high',
        description: `Memory increased by ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB during test`
      });
    }

    // Check for resource leaks
    const activeResources = this.resourceTracker.getResourceCount();
    if (activeResources > 10) {
      this.detectedLeaks.push({
        type: 'handle',
        severity: 'medium',
        description: `${activeResources} resources still active after test completion`
      });
    }

    // Check for timer leaks (mock implementation)
    const activeTimers = this.getActiveTimerCount();
    if (activeTimers > 5) {
      this.detectedLeaks.push({
        type: 'timer',
        severity: 'medium',
        description: `${activeTimers} timers still active after test completion`
      });
    }
  }

  private getActiveTimerCount(): number {
    // Mock implementation - in real environments this would track active timers
    return Math.floor(Math.random() * 3);
  }

  getDetectedLeaks(): LeakInfo[] {
    return [...this.detectedLeaks];
  }

  clear(): void {
    this.memoryProfiler.clear();
    this.resourceTracker.clear();
    this.detectedLeaks = [];
  }
}

// Performance Monitor
export class PerformanceMonitor {
  private testResults: PerformanceReport[] = [];

  async runPerformanceTest(
    testName: string,
    testFn: () => Promise<void> | void,
    options: {
      memoryThreshold?: number;
      maxDuration?: number;
      leakDetection?: boolean;
    } = {}
  ): Promise<PerformanceReport> {
    const {
      memoryThreshold = 50 * 1024 * 1024, // 50MB
      maxDuration = 10000, // 10 seconds
      leakDetection = true
    } = options;

    const memoryProfiler = new MemoryProfiler();
    const resourceTracker = new ResourceTracker();
    const leakDetector = leakDetection ? new LeakDetector() : null;

    const startTime = Date.now();
    const startSnapshot = memoryProfiler.takeSnapshot();

    if (leakDetector) {
      leakDetector.startDetection();
    }

    await resourceTracker.takeMetrics();

    try {
      // Run the test
      await testFn();
    } catch (error) {
      throw new Error(`Performance test "${testName}" failed: ${error}`);
    }

    const endTime = Date.now();
    const endSnapshot = memoryProfiler.takeSnapshot();

    await resourceTracker.takeMetrics();

    let leaks: LeakInfo[] = [];
    if (leakDetector) {
      leaks = leakDetector.stopDetection();
    }

    const duration = endTime - startTime;
    const memoryDelta = memoryProfiler.getMemoryDelta(startSnapshot, endSnapshot);
    const metrics = resourceTracker.getMetrics();

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      testName,
      duration,
      memoryDelta,
      metrics,
      leaks
    });

    const report: PerformanceReport = {
      testName,
      duration,
      memoryDelta,
      resourceUsage: metrics,
      leaks,
      recommendations
    };

    this.testResults.push(report);
    return report;
  }

  getTestResults(): PerformanceReport[] {
    return [...this.testResults];
  }

  clearResults(): void {
    this.testResults = [];
  }

  private generateRecommendations(context: {
    testName: string;
    duration: number;
    memoryDelta: MemorySnapshot;
    metrics: ResourceMetrics[];
    leaks: LeakInfo[];
  }): string[] {
    const recommendations: string[] = [];

    // Duration recommendations
    if (context.duration > 5000) {
      recommendations.push('Test duration exceeded 5 seconds - consider optimizing performance');
    }

    // Memory recommendations
    if (context.memoryDelta.heapUsed > 10 * 1024 * 1024) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }

    // Leak recommendations
    const criticalLeaks = context.leaks.filter(leak => leak.severity === 'critical');
    if (criticalLeaks.length > 0) {
      recommendations.push('Critical leaks detected - immediate attention required');
    }

    const highLeaks = context.leaks.filter(leak => leak.severity === 'high');
    if (highLeaks.length > 0) {
      recommendations.push('High severity leaks detected - prioritize fixes');
    }

    // Resource recommendations
    if (context.metrics.length > 0) {
      const lastMetric = context.metrics[context.metrics.length - 1];
      if (lastMetric.activeHandles > 20) {
        recommendations.push('High handle count - ensure proper cleanup');
      }

      if (lastMetric.openFiles > 10) {
        recommendations.push('Many open file descriptors - check file handling');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good - no issues detected');
    }

    return recommendations;
  }
}

// Resource Monitor (simplified version for broader use)
export class ResourceMonitor {
  private monitors = new Map<string, {
    type: string;
    createdAt: number;
    metadata?: any;
  }>();

  monitor(id: string, type: string, metadata?: any): void {
    this.monitors.set(id, {
      type,
      createdAt: Date.now(),
      metadata
    });
  }

  unmonitor(id: string): boolean {
    return this.monitors.delete(id);
  }

  getActiveResources(): Array<{ id: string; type: string; createdAt: number; metadata?: any }> {
    return Array.from(this.monitors.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  getResourceCount(type?: string): number {
    if (!type) {
      return this.monitors.size;
    }

    return Array.from(this.monitors.values())
      .filter(info => info.type === type)
      .length;
  }

  clear(): void {
    this.monitors.clear();
  }

  getReport(): {
    total: number;
    byType: Record<string, number>;
    resources: Array<{ id: string; type: string; createdAt: number; metadata?: any }>;
  } {
    const byType: Record<string, number> = {};

    for (const info of this.monitors.values()) {
      byType[info.type] = (byType[info.type] || 0) + 1;
    }

    return {
      total: this.monitors.size,
      byType,
      resources: this.getActiveResources()
    };
  }
}

// Factory functions for easy usage
export function createMemoryProfiler(): MemoryProfiler {
  return new MemoryProfiler();
}

export function createResourceTracker(): ResourceTracker {
  return new ResourceTracker();
}

export function createLeakDetector(): LeakDetector {
  return new LeakDetector();
}

export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}

export function createResourceMonitor(): ResourceMonitor {
  return new ResourceMonitor();
}

// Utility functions
export async function measurePerformance<T>(
  operation: () => Promise<T> | T,
  name: string = 'operation'
): Promise<{ result: T; duration: number; memoryUsage: MemorySnapshot }> {
  const startTime = Date.now();
  const startMemory = createMemoryProfiler().takeSnapshot();

  try {
    const result = await operation();
    const endTime = Date.now();
    const endMemory = createMemoryProfiler().takeSnapshot();

    return {
      result,
      duration: endTime - startTime,
      memoryUsage: endMemory
    };
  } catch (error) {
    const endTime = Date.now();
    const endMemory = createMemoryProfiler().takeSnapshot();

    throw new Error(`Operation "${name}" failed after ${endTime - startTime}ms: ${error}`);
  }
}

export function assertPerformance(report: PerformanceReport, thresholds: {
  maxDuration?: number;
  maxMemoryIncrease?: number;
  allowLeaks?: boolean;
}): void {
  const {
    maxDuration = 10000,
    maxMemoryIncrease = 50 * 1024 * 1024, // 50MB
    allowLeaks = false
  } = thresholds;

  if (report.duration > maxDuration) {
    throw new Error(`Performance test "${report.testName}" exceeded duration threshold: ${report.duration}ms > ${maxDuration}ms`);
  }

  if (report.memoryDelta.heapUsed > maxMemoryIncrease) {
    throw new Error(`Performance test "${report.testName}" exceeded memory threshold: ${(report.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }

  if (!allowLeaks && report.leaks.length > 0) {
    const criticalLeaks = report.leaks.filter(leak => leak.severity === 'critical' || leak.severity === 'high');
    if (criticalLeaks.length > 0) {
      throw new Error(`Performance test "${report.testName}" detected critical leaks: ${criticalLeaks.length} leaks found`);
    }
  }
}

// Export all utilities
export const PerformanceTestUtils = {
  MemoryProfiler,
  ResourceTracker,
  LeakDetector,
  PerformanceMonitor,
  ResourceMonitor,
  createMemoryProfiler,
  createResourceTracker,
  createLeakDetector,
  createPerformanceMonitor,
  createResourceMonitor,
  measurePerformance,
  assertPerformance
};

export default PerformanceTestUtils;