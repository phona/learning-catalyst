/**
 * Performance Test Setup
 *
 * Global setup for performance tests including resource monitoring,
 * baseline measurements, and performance test infrastructure.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MockResourceMonitor } from '../utils/helpers/performance-test-utils';

// Global performance monitor
let globalPerformanceMonitor: MockResourceMonitor;

/**
 * Setup performance test environment
 */
beforeAll(async () => {
  // Set up performance-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.PERFORMANCE_TEST = 'true';

  // Initialize global performance monitor
  globalPerformanceMonitor = new MockResourceMonitor();

  // Enable garbage collection for memory testing
  if (global.gc) {
    console.log('🗑️  Garbage collection available for memory testing');
  } else {
    console.warn('⚠️  Garbage collection not available - memory tests may be inaccurate');
  }

  // Mock performance-critical APIs
  vi.mock('electron', () => ({
    app: {
      getPath: vi.fn().mockReturnValue('./test-data/performance'),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
    },
  }));

  console.log('🚀 Performance test environment initialized');
});

/**
 * Cleanup after all performance tests
 */
afterAll(async () => {
  // Stop global monitoring
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.stopMonitoring();
  }

  // Force garbage collection
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Performance test environment cleaned up');
});

/**
 * Setup before each performance test
 */
beforeEach(async () => {
  // Reset performance monitor
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.reset();
  }

  // Clear mocks
  vi.clearAllMocks();

  // Force garbage collection before each test
  if (global.gc) {
    global.gc();
  }
});

/**
 * Cleanup after each performance test
 */
afterEach(() => {
  // Stop any ongoing monitoring
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.stopMonitoring();
  }

  // Force garbage collection after each test
  if (global.gc) {
    global.gc();
  }
});

/**
 * Performance test utilities
 */
export const PerformanceTestUtils = {
  /**
   * Get global performance monitor
   */
  getPerformanceMonitor(): MockResourceMonitor {
    return globalPerformanceMonitor;
  },

  /**
   * Measure function execution time
   */
  async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    iterations = 1,
  ): Promise<{
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: T[];
  }> {
    const results: T[] = [];
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();

      results.push(result);
      times.push(end - start);

      // Small delay between iterations
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      totalTime,
      averageTime,
      minTime,
      maxTime,
      results,
    };
  },

  /**
   * Create performance benchmark data
   */
  createBenchmarkData(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `Description for item ${i + 1}`,
      data: new Array(100).fill(0).map((_, j) => `data-${i}-${j}`),
      timestamp: Date.now(),
      metadata: {
        category: `category-${i % 10}`,
        priority: i % 3,
        tags: [`tag-${i % 5}`, `tag-${i % 7}`],
      },
    }));
  },

  /**
   * Simulate CPU load
   */
  async simulateCPULoad(durationMs: number, intensity = 0.5): Promise<void> {
    const endTime = Date.now() + durationMs;
    const operationsPerSecond = Math.floor(1000000 * intensity); // Adjust based on intensity

    while (Date.now() < endTime) {
      // CPU-intensive operation
      let result = 0;
      for (let i = 0; i < operationsPerSecond / 100; i++) {
        result += Math.sqrt(i) * Math.random();
      }

      // Small sleep to prevent complete CPU hogging
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  },

  /**
   * Simulate memory allocation
   */
  simulateMemoryAllocation(sizeMB: number): any[] {
    const sizeBytes = sizeMB * 1024 * 1024;
    const chunkSize = 1024; // 1KB chunks
    const chunks = sizeBytes / chunkSize;

    const arrays: any[] = [];
    for (let i = 0; i < chunks; i++) {
      arrays.push(new Array(chunkSize).fill(Math.random()));
    }

    return arrays;
  },

  /**
   * Get current memory usage
   */
  getMemoryUsage(): {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }

    // Mock memory usage for browser environments
    return {
      rss: 50 * 1024 * 1024 + Math.random() * 10 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024,
      heapTotal: 40 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024,
      external: 5 * 1024 * 1024 + Math.random() * 2 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024 + Math.random() * 1 * 1024 * 1024,
    };
  },

  /**
   * Assert performance constraints
   */
  assertPerformanceConstraints(
    metrics: any,
    constraints: {
      maxExecutionTime?: number;
      maxMemoryUsage?: number;
      minThroughput?: number;
      maxErrorRate?: number;
    },
  ): void {
    const { maxExecutionTime, maxMemoryUsage, minThroughput, maxErrorRate } = constraints;

    if (maxExecutionTime && metrics.averageResponseTime > maxExecutionTime) {
      throw new Error(
        `Average response time ${metrics.averageResponseTime}ms exceeds maximum ${maxExecutionTime}ms`,
      );
    }

    if (maxMemoryUsage && metrics.memoryUsage.peak > maxMemoryUsage) {
      throw new Error(
        `Peak memory usage ${metrics.memoryUsage.peak} bytes exceeds maximum ${maxMemoryUsage} bytes`,
      );
    }

    if (minThroughput && metrics.throughput < minThroughput) {
      throw new Error(
        `Throughput ${metrics.throughput} ops/sec below minimum ${minThroughput} ops/sec`,
      );
    }

    if (maxErrorRate && metrics.errorRate > maxErrorRate) {
      throw new Error(`Error rate ${metrics.errorRate}% exceeds maximum ${maxErrorRate}%`);
    }
  },
};
