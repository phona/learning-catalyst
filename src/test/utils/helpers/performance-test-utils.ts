/**
 * Performance Test Utilities
 *
 * Comprehensive utilities for performance testing including load testing,
  * stress testing, memory usage monitoring, concurrent operations,
 * and resource leak detection. Enables validation of system performance
 * under various conditions and loads.
 */

import { vi } from 'vitest';

// Performance test configuration types
export interface PerformanceTestConfig {
  name: string;
  duration: number; // Test duration in milliseconds
  concurrency: number; // Number of concurrent operations
  rampUpTime?: number; // Time to ramp up to full concurrency
  thinkTime?: number; // Time between operations
  warmupTime?: number; // Warmup period before measurements
  cooldownTime?: number; // Cooldown period after test
}

export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // Operations per second
  errorRate: number; // Percentage of failed operations
  memoryUsage: MemoryMetrics;
  cpuUsage: CPUMetrics;
}

export interface MemoryMetrics {
  initial: number;
  peak: number;
  final: number;
  average: number;
  leaked: number; // Memory that wasn't cleaned up
  samples: Array<{
    timestamp: number;
    usage: number;
  }>;
}

export interface CPUMetrics {
  average: number;
  peak: number;
  samples: Array<{
    timestamp: number;
    usage: number;
  }>;
}

export interface ResourceMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getMetrics(): MemoryMetrics & CPUMetrics;
  reset(): void;
}

// Mock resource monitor
export class MockResourceMonitor implements ResourceMonitor {
  private monitoring: boolean = false;
  private memorySamples: Array<{ timestamp: number; usage: number }> = [];
  private cpuSamples: Array<{ timestamp: number; usage: number }> = [];
  private monitoringInterval?: NodeJS.Timeout;
  private initialMemory: number = 0;

  startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;
    this.initialMemory = this._getCurrentMemoryUsage();
    this.memorySamples = [];
    this.cpuSamples = [];

    this.monitoringInterval = setInterval(() => {
      this.memorySamples.push({
        timestamp: Date.now(),
        usage: this._getCurrentMemoryUsage()
      });

      this.cpuSamples.push({
        timestamp: Date.now(),
        usage: this._getCurrentCPUUsage()
      });
    }, 100); // Sample every 100ms
  }

  stopMonitoring(): void {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getMetrics(): MemoryMetrics & CPUMetrics {
    const memoryUsages = this.memorySamples.map(s => s.usage);
    const cpuUsages = this.cpuSamples.map(s => s.usage);

    const memoryMetrics: MemoryMetrics = {
      initial: this.initialMemory,
      peak: Math.max(...memoryUsages, this.initialMemory),
      final: memoryUsages[memoryUsages.length - 1] || this.initialMemory,
      average: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : this.initialMemory,
      leaked: 0, // Will be calculated by the performance tester
      samples: this.memorySamples
    };

    const cpuMetrics: CPUMetrics = {
      average: cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0,
      peak: Math.max(...cpuUsages, 0),
      samples: this.cpuSamples
    };

    return { ...memoryMetrics, ...cpuMetrics };
  }

  reset(): void {
    this.stopMonitoring();
    this.memorySamples = [];
    this.cpuSamples = [];
    this.initialMemory = 0;
  }

  private _getCurrentMemoryUsage(): number {
    // Mock memory usage - in real implementation would use process.memoryUsage()
    return 50 * 1024 * 1024 + Math.random() * 10 * 1024 * 1024; // 50-60MB
  }

  private _getCurrentCPUUsage(): number {
    // Mock CPU usage - in real implementation would use actual CPU monitoring
    return Math.random() * 80; // 0-80%
  }
}

// Performance test runner
export class PerformanceTestRunner {
  private readonly resourceMonitor: ResourceMonitor;
  private operationTimes: number[] = [];
  private errors: Error[] = [];

  constructor(resourceMonitor?: ResourceMonitor) {
    this.resourceMonitor = resourceMonitor || new MockResourceMonitor();
  }

  async runTest(
    config: PerformanceTestConfig,
    operation: () => Promise<any>
  ): Promise<PerformanceMetrics> {
    // Reset state
    this.operationTimes = [];
    this.errors = [];
    this.resourceMonitor.reset();

    const startTime = Date.now();

    // Warmup period
    if (config.warmupTime) {
      await this._warmup(config.warmupTime, operation);
    }

    // Start monitoring
    this.resourceMonitor.startMonitoring();

    // Execute the test
    await this._executeLoadTest(config, operation);

    // Stop monitoring
    this.resourceMonitor.stopMonitoring();

    const endTime = Date.now();
    const resourceMetrics = this.resourceMonitor.getMetrics();

    // Calculate metrics
    const metrics = this._calculateMetrics(config.name, startTime, endTime, resourceMetrics);

    return metrics;
  }

  private async _warmup(warmupTime: number, operation: () => Promise<any>): Promise<void> {
    const warmupStart = Date.now();
    while (Date.now() - warmupStart < warmupTime) {
      try {
        await operation();
      } catch (error) {
        // Ignore errors during warmup
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async _executeLoadTest(
    config: PerformanceTestConfig,
    operation: () => Promise<any>
  ): Promise<void> {
    const { duration, concurrency, rampUpTime = 0, thinkTime = 0 } = config;
    const startTime = Date.now();
    const rampUpDelay = rampUpTime > 0 ? rampUpTime / concurrency : 0;

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, (_, index) =>
      this._createWorker(index, rampUpDelay * index, duration, thinkTime, operation, startTime)
    );

    // Wait for all workers to complete
    await Promise.allSettled(workers);
  }

  private async _createWorker(
    workerId: number,
    rampUpDelay: number,
    duration: number,
    thinkTime: number,
    operation: () => Promise<any>,
    testStartTime: number
  ): Promise<void> {
    // Wait for ramp-up delay
    if (rampUpDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, rampUpDelay));
    }

    const workerStartTime = Date.now();

    while (Date.now() - testStartTime < duration) {
      const operationStart = Date.now();

      try {
        await operation();
        const operationEnd = Date.now();
        this.operationTimes.push(operationEnd - operationStart);
      } catch (error) {
        this.errors.push(error as Error);
      }

      // Think time between operations
      if (thinkTime > 0) {
        await new Promise(resolve => setTimeout(resolve, thinkTime));
      }
    }
  }

  private _calculateMetrics(
    name: string,
    startTime: number,
    endTime: number,
    resourceMetrics: MemoryMetrics & CPUMetrics
  ): PerformanceMetrics {
    const totalOperations = this.operationTimes.length + this.errors.length;
    const successfulOperations = this.operationTimes.length;
    const failedOperations = this.errors.length;
    const duration = endTime - startTime;

    const sortedTimes = [...this.operationTimes].sort((a, b) => a - b);
    const averageResponseTime = this.operationTimes.length > 0 ?
      this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length : 0;

    const metrics: PerformanceMetrics = {
      name,
      startTime,
      endTime,
      duration,
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      minResponseTime: sortedTimes[0] || 0,
      maxResponseTime: sortedTimes[sortedTimes.length - 1] || 0,
      p50ResponseTime: this._getPercentile(sortedTimes, 50),
      p95ResponseTime: this._getPercentile(sortedTimes, 95),
      p99ResponseTime: this._getPercentile(sortedTimes, 99),
      throughput: duration > 0 ? (successfulOperations / duration) * 1000 : 0,
      errorRate: totalOperations > 0 ? (failedOperations / totalOperations) * 100 : 0,
      memoryUsage: {
        initial: resourceMetrics.initial,
        peak: resourceMetrics.peak,
        final: resourceMetrics.final,
        average: resourceMetrics.average,
        leaked: Math.max(0, resourceMetrics.final - resourceMetrics.initial),
        samples: resourceMetrics.samples
      },
      cpuUsage: {
        average: resourceMetrics.average,
        peak: resourceMetrics.peak,
        samples: resourceMetrics.samples
      }
    };

    return metrics;
  }

  private _getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

// Concurrent session test utilities
export class ConcurrentSessionTester {
  async runConcurrentSessionTest(
    sessionCount: number,
    operationsPerSession: number,
    sessionOperation: (sessionId: number) => Promise<any>
  ): Promise<{
    totalSessions: number;
    successfulSessions: number;
    failedSessions: number;
    averageSessionDuration: number;
    totalOperations: number;
    concurrentOperations: number;
    errors: Array<{ sessionId: number; error: Error; timestamp: number }>;
  }> {
    const startTime = Date.now();
    const errors: Array<{ sessionId: number; error: Error; timestamp: number }> = [];

    // Create concurrent sessions
    const sessionPromises = Array.from({ length: sessionCount }, async (_, sessionId) => {
      try {
        for (let operation = 0; operation < operationsPerSession; operation++) {
          await sessionOperation(sessionId);
        }
        return { sessionId, success: true };
      } catch (error) {
        errors.push({
          sessionId,
          error: error as Error,
          timestamp: Date.now()
        });
        return { sessionId, success: false };
      }
    });

    const results = await Promise.allSettled(sessionPromises);
    const endTime = Date.now();

    const successfulSessions = results.filter(r =>
      r.status === 'fulfilled' && (r.value as any).success
    ).length;

    const failedSessions = results.length - successfulSessions;

    return {
      totalSessions: sessionCount,
      successfulSessions,
      failedSessions,
      averageSessionDuration: (endTime - startTime) / sessionCount,
      totalOperations: sessionCount * operationsPerSession,
      concurrentOperations: sessionCount,
      errors
    };
  }
}

// Load testing utilities
export class LoadTester {
  private readonly performanceRunner: PerformanceTestRunner;

  constructor() {
    this.performanceRunner = new PerformanceTestRunner();
  }

  async runLoadTest(
    targetRPS: number, // Requests per second
    duration: number,
    operation: () => Promise<any>
  ): Promise<PerformanceMetrics> {
    const thinkTime = 1000 / targetRPS; // Calculate think time to achieve target RPS

    const config: PerformanceTestConfig = {
      name: `Load Test - ${targetRPS} RPS`,
      duration,
      concurrency: Math.min(10, targetRPS), // Cap concurrency at 10
      thinkTime: Math.max(0, thinkTime - 50), // Account for processing time
      warmupTime: 5000, // 5 second warmup
      cooldownTime: 2000 // 2 second cooldown
    };

    return this.performanceRunner.runTest(config, operation);
  }

  async runStressTest(
    maxConcurrency: number,
    operation: () => Promise<any>
  ): Promise<{
    breakingPoint: number;
    metricsAtBreakingPoint: PerformanceMetrics;
    degradationPoints: Array<{ concurrency: number; metrics: PerformanceMetrics }>;
  }> {
    const degradationPoints: Array<{ concurrency: number; metrics: PerformanceMetrics }> = [];
    let breakingPoint = maxConcurrency;
    let metricsAtBreakingPoint: PerformanceMetrics | null = null;

    // Test increasing concurrency levels
    for (let concurrency = 1; concurrency <= maxConcurrency; concurrency++) {
      const config: PerformanceTestConfig = {
        name: `Stress Test - Concurrency ${concurrency}`,
        duration: 10000, // 10 seconds per test
        concurrency,
        warmupTime: 2000
      };

      const metrics = await this.performanceRunner.runTest(config, operation);
      degradationPoints.push({ concurrency, metrics });

      // Check if we've found the breaking point
      if (metrics.errorRate > 10 || metrics.averageResponseTime > 5000) {
        breakingPoint = concurrency;
        metricsAtBreakingPoint = metrics;
        break;
      }
    }

    // If no breaking point found, use max concurrency
    if (!metricsAtBreakingPoint) {
      breakingPoint = maxConcurrency;
      metricsAtBreakingPoint = degradationPoints[degradationPoints.length - 1].metrics;
    }

    return {
      breakingPoint,
      metricsAtBreakingPoint,
      degradationPoints
    };
  }
}

// Memory leak detection utilities
export class MemoryLeakDetector {
  private samples: Array<{ timestamp: number; memory: number; operation: string }> = [];

  async detectMemoryLeaks(
    iterations: number,
    operation: () => Promise<any>,
    operationName: string = 'test'
  ): Promise<{
    hasLeak: boolean;
    leakRate: number; // Memory growth per iteration in bytes
    initialMemory: number;
    finalMemory: number;
    peakMemory: number;
    samples: Array<{ timestamp: number; memory: number; operation: string }>;
  }> {
    this.samples = [];

    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryBefore = this._getMemoryUsage();

      try {
        await operation();
      } catch (error) {
        // Continue even if operation fails
      }

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = this._getMemoryUsage();

      this.samples.push({
        timestamp: Date.now(),
        memory: memoryAfter,
        operation: `${operationName}_${i}`
      });
    }

    const initialMemory = this.samples[0]?.memory || 0;
    const finalMemory = this.samples[this.samples.length - 1]?.memory || 0;
    const peakMemory = Math.max(...this.samples.map(s => s.memory));

    // Calculate leak rate using linear regression
    const leakRate = this._calculateLeakRate(this.samples);
    const hasLeak = leakRate > 1024; // More than 1KB growth per iteration

    return {
      hasLeak,
      leakRate,
      initialMemory,
      finalMemory,
      peakMemory,
      samples: [...this.samples]
    };
  }

  private _getMemoryUsage(): number {
    // Mock memory usage - in real implementation would use process.memoryUsage()
    return 50 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024;
  }

  private _calculateLeakRate(samples: Array<{ timestamp: number; memory: number }>): number {
    if (samples.length < 2) return 0;

    // Simple linear regression to find trend
    const n = samples.length;
    const sumX = samples.reduce((sum, _, i) => sum + i, 0);
    const sumY = samples.reduce((sum, s) => sum + s.memory, 0);
    const sumXY = samples.reduce((sum, s, i) => sum + i * s.memory, 0);
    const sumXX = samples.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}

// Performance assertion utilities
export class PerformanceAssertions {
  static assertResponseTime(
    metrics: PerformanceMetrics,
    maxAverageResponseTime: number,
    maxP95ResponseTime?: number
  ): void {
    expect(metrics.averageResponseTime).toBeLessThan(maxAverageResponseTime);

    if (maxP95ResponseTime) {
      expect(metrics.p95ResponseTime).toBeLessThan(maxP95ResponseTime);
    }
  }

  static assertThroughput(
    metrics: PerformanceMetrics,
    minThroughput: number
  ): void {
    expect(metrics.throughput).toBeGreaterThan(minThroughput);
  }

  static assertErrorRate(
    metrics: PerformanceMetrics,
    maxErrorRate: number
  ): void {
    expect(metrics.errorRate).toBeLessThan(maxErrorRate);
  }

  static assertMemoryUsage(
    metrics: PerformanceMetrics,
    maxMemoryUsage: number,
    maxMemoryLeak?: number
  ): void {
    expect(metrics.memoryUsage.peak).toBeLessThan(maxMemoryUsage);

    if (maxMemoryLeak !== undefined) {
      expect(metrics.memoryUsage.leaked).toBeLessThan(maxMemoryLeak);
    }
  }

  static assertConcurrency(
    testResult: any,
    minSuccessfulSessions: number,
    maxFailureRate: number
  ): void {
    expect(testResult.successfulSessions).toBeGreaterThanOrEqual(minSuccessfulSessions);

    const failureRate = (testResult.failedSessions / testResult.totalSessions) * 100;
    expect(failureRate).toBeLessThan(maxFailureRate);
  }
}

// Predefined performance test scenarios
export const PerformanceTestScenarios = {
  // AI response time test
  async aiResponseTime(): Promise<PerformanceTestConfig> {
    return {
      name: 'AI Response Time Test',
      duration: 30000, // 30 seconds
      concurrency: 5,
      rampUpTime: 5000, // 5 second ramp-up
      warmupTime: 10000 // 10 second warmup
    };
  },

  // Database performance test
  async databasePerformance(): Promise<PerformanceTestConfig> {
    return {
      name: 'Database Performance Test',
      duration: 60000, // 1 minute
      concurrency: 10,
      rampUpTime: 10000,
      warmupTime: 5000
    };
  },

  // Streaming performance test
  async streamingPerformance(): Promise<PerformanceTestConfig> {
    return {
      name: 'Streaming Performance Test',
      duration: 45000, // 45 seconds
      concurrency: 3,
      thinkTime: 1000, // 1 second between streams
      warmupTime: 5000
    };
  },

  // Agent orchestration performance test
  async agentOrchestration(): Promise<PerformanceTestConfig> {
    return {
      name: 'Agent Orchestration Performance Test',
      duration: 90000, // 1.5 minutes
      concurrency: 8,
      rampUpTime: 15000,
      warmupTime: 10000
    };
  }
};

// All utilities are already exported as named exports above

export default {
  PerformanceTestRunner,
  ConcurrentSessionTester,
  LoadTester,
  MemoryLeakDetector,
  PerformanceAssertions,
  PerformanceTestScenarios
};