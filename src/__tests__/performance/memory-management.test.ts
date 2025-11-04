/**
 * Memory Management and Cleanup Validation Tests
 *
 * Tests for memory efficiency, garbage collection, resource cleanup,
 * and leak prevention in the multi-agent architecture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupPerformanceTest, cleanupPerformanceTest } from '../setup/performance-setup';
import {
  createMemoryProfiler,
  createResourceTracker,
  createLeakDetector
} from '../utils/performance-test-utils';
import type { MemoryProfile, ResourceReport, LeakReport } from '../types/performance';

describe('Memory Management and Cleanup Validation Tests', () => {
  let memoryProfiler: any;
  let resourceTracker: any;
  let leakDetector: any;
  let catalystService: any;

  beforeEach(async () => {
    const testEnvironment = await setupPerformanceTest();
    catalystService = testEnvironment.catalystService;
    memoryProfiler = createMemoryProfiler();
    resourceTracker = createResourceTracker();
    leakDetector = createLeakDetector();
  });

  afterEach(async () => {
    await cleanupPerformanceTest();
  });

  describe('Memory Profiling and Analysis', () => {
    it('should maintain stable memory usage during normal operations', async () => {
      const baselineProfile = await memoryProfiler.getProfile();

      // Perform normal operations
      for (let i = 0; i < 50; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'memory-test',
          userId: `user-${i}`
        });

        await catalystService.processUserInput({
          sessionId,
          message: `Test message ${i}`,
          agentId: 'learning-agent-001'
        });

        await catalystService.endSession(sessionId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalProfile = await memoryProfiler.getProfile();
      const memoryIncrease = finalProfile.heapUsed - baselineProfile.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB increase
      expect(finalProfile.heapUsed).toBeLessThan(200 * 1024 * 1024); // <200MB total
      expect(memoryIncrease / 50).toBeLessThan(1024 * 1024); // <1MB per operation
    });

    it('should handle large data structures efficiently', async () => {
      const baselineProfile = await memoryProfiler.getProfile();

      // Create sessions with large data
      const largeDataSessions = [];
      for (let i = 0; i < 10; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'large-data-test',
          userId: `user-${i}`
        });

        const largeContext = {
          history: Array.from({ length: 1000 }, (_, j) => ({
            message: `Large message ${j}: ${'x'.repeat(1000)}`,
            metadata: { data: 'y'.repeat(500) }
          })),
          analytics: {
            metrics: Array.from({ length: 500 }, (_, k) => ({
              id: k,
              value: Math.random(),
              tags: [`tag-${k % 10}`]
            }))
          }
        };

        await catalystService.processUserInput({
          sessionId,
          message: 'Process large data',
          agentId: 'learning-agent-001',
          context: largeContext
        });

        largeDataSessions.push(sessionId);
      }

      const peakProfile = await memoryProfiler.getProfile();
      const peakIncrease = peakProfile.heapUsed - baselineProfile.heapUsed;

      // Clean up sessions
      for (const sessionId of largeDataSessions) {
        await catalystService.endSession(sessionId);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const cleanupProfile = await memoryProfiler.getProfile();
      const memoryAfterCleanup = cleanupProfile.heapUsed - baselineProfile.heapUsed;

      // Memory should be properly cleaned up
      expect(peakIncrease).toBeLessThan(150 * 1024 * 1024); // <150MB peak
      expect(memoryAfterCleanup).toBeLessThan(30 * 1024 * 1024); // <30MB after cleanup
      expect(memoryAfterCleanup / peakIncrease).toBeLessThan(0.3); // <30% of peak remains
    });

    it('should detect memory patterns and anomalies', async () => {
      const profiles = [];

      // Collect memory profiles over time
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create and cleanup sessions
        const sessionIds = [];
        for (let i = 0; i < 20; i++) {
          const sessionId = await catalystService.createSession({
            type: 'learning',
            conceptId: 'pattern-test',
            userId: `user-${cycle}-${i}`
          });
          sessionIds.push(sessionId);
        }

        // Use sessions
        for (const sessionId of sessionIds) {
          await catalystService.processUserInput({
            sessionId,
            message: 'Pattern test message',
            agentId: 'learning-agent-001'
          });
        }

        // Cleanup
        for (const sessionId of sessionIds) {
          await catalystService.endSession(sessionId);
        }

        // Profile memory
        const profile = await memoryProfiler.getProfile();
        profiles.push(profile);

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze memory patterns
      const memoryTrend = memoryProfiler.analyzeTrend(profiles);
      expect(memoryTrend.slope).toBeLessThan(1024 * 1024); // <1MB growth per cycle
      expect(memoryTrend.variance).toBeLessThan(10 * 1024 * 1024); // <10MB variance
      expect(memoryTrend.anomalies).toHaveLength(0); // No anomalies detected
    });
  });

  describe('Resource Tracking and Management', () => {
    it('should properly track and cleanup session resources', async () => {
      const initialReport = await resourceTracker.getReport();

      const sessionIds = [];
      const resources = [];

      // Create sessions and track resources
      for (let i = 0; i < 25; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'resource-test',
          userId: `user-${i}`
        });
        sessionIds.push(sessionId);

        // Track resources created by session
        const sessionResources = resourceTracker.trackSession(sessionId);
        resources.push(sessionResources);

        // Create streaming resources
        const streamSession = await catalystService.startStreamingSession({
          sessionId,
          message: 'Test streaming resource',
          options: { chunkSize: 50, maxTokens: 200 }
        });
        sessionResources.addResource('stream', streamSession);
      }

      const peakReport = await resourceTracker.getReport();
      expect(peakReport.activeSessions).toBe(25);
      expect(peakReport.totalResources).toBeGreaterThan(25);

      // Cleanup all sessions
      for (const sessionId of sessionIds) {
        await catalystService.endSession(sessionId);
        resourceTracker.cleanupSession(sessionId);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalReport = await resourceTracker.getReport();
      expect(finalReport.activeSessions).toBe(0);
      expect(finalReport.totalResources).toBeLessThan(5); // Minimal residual resources
      expect(finalReport.cleanupSuccess).toBe(true);
    });

    it('should handle event emitter cleanup properly', async () => {
      const eventEmitters = [];

      // Create many event emitters
      for (let i = 0; i < 100; i++) {
        const emitter = catalystService.createEventEmitter();
        emitter.on('test', () => {});
        emitter.on('data', () => {});
        emitter.on('end', () => {});
        eventEmitters.push(emitter);
      }

      const peakReport = await resourceTracker.getReport();
      expect(peakReport.eventEmitters).toBe(100);

      // Cleanup all event emitters
      for (const emitter of eventEmitters) {
        emitter.removeAllListeners();
        catalystService.destroyEventEmitter(emitter);
      }

      const cleanupReport = await resourceTracker.getReport();
      expect(cleanupReport.eventEmitters).toBe(0);
    });

    it('should manage database connections efficiently', async () => {
      const connectionIds = [];

      // Create many database operations
      for (let i = 0; i < 50; i++) {
        const connectionId = await catalystService.getDatabaseConnection();
        connectionIds.push(connectionId);

        // Perform operation
        await catalystService.executeDatabaseQuery(connectionId, 'SELECT 1');
      }

      const peakReport = await resourceTracker.getReport();
      expect(peakReport.databaseConnections).toBeGreaterThanOrEqual(1);
      expect(peakReport.databaseConnections).toBeLessThanOrEqual(10); // Connection pooling

      // Return all connections
      for (const connectionId of connectionIds) {
        await catalystService.returnDatabaseConnection(connectionId);
      }

      const finalReport = await resourceTracker.getReport();
      expect(finalReport.databaseConnections).toBeGreaterThanOrEqual(1); // Keep pool alive
      expect(finalReport.connectionLeaks).toBe(0);
    });

    it('should clean up timers and intervals properly', async () => {
      const timerIds = [];

      // Create many timers
      for (let i = 0; i < 50; i++) {
        const timerId = setTimeout(() => {}, 10000); // Long timeout
        timerIds.push(timerId);

        const intervalId = setInterval(() => {}, 5000); // Repeating interval
        timerIds.push(intervalId);
      }

      const peakReport = await resourceTracker.getReport();
      expect(peakReport.activeTimers).toBe(100);

      // Clear all timers
      for (const timerId of timerIds) {
        clearTimeout(timerId);
        clearInterval(timerId);
      }

      const finalReport = await resourceTracker.getReport();
      expect(finalReport.activeTimers).toBe(0);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks in session management', async () => {
      const baselineProfile = await memoryProfiler.getProfile();

      // Create and destroy sessions repeatedly
      for (let cycle = 0; cycle < 5; cycle++) {
        const sessionIds = [];

        // Create many sessions
        for (let i = 0; i < 50; i++) {
          const sessionId = await catalystService.createSession({
            type: 'learning',
            conceptId: 'leak-test',
            userId: `leak-user-${cycle}-${i}`
          });
          sessionIds.push(sessionId);
        }

        // Use sessions briefly
        for (const sessionId of sessionIds) {
          await catalystService.processUserInput({
            sessionId,
            message: 'Leak test message',
            agentId: 'learning-agent-001'
          });
        }

        // Destroy sessions
        for (const sessionId of sessionIds) {
          await catalystService.endSession(sessionId);
        }

        // Force garbage collection
        if (global.gc) {
          global.gc();
        }

        const currentProfile = await memoryProfiler.getProfile();
        const memoryIncrease = currentProfile.heapUsed - baselineProfile.heapUsed;

        // Check for leaks after each cycle
        const leakReport = await leakDetector.checkForLeaks(baselineProfile, currentProfile);
        expect(leakReport.memoryLeakDetected).toBe(false);
        expect(leakReport.leakSize).toBeLessThan(10 * 1024 * 1024); // <10MB acceptable
      }
    });

    it('should detect event listener leaks', async () => {
      const leakReport = await leakDetector.analyzeEventListeners();

      // Create many listeners
      const emitters = [];
      for (let i = 0; i < 20; i++) {
        const emitter = catalystService.createEventEmitter();
        emitter.on('data', () => {});
        emitter.on('error', () => {});
        emitter.on('close', () => {});
        emitters.push(emitter);
      }

      const leakReportWithListeners = await leakDetector.analyzeEventListeners();
      expect(leakReportWithListeners.totalListeners).toBe(60); // 20 emitters * 3 listeners

      // Remove all listeners
      for (const emitter of emitters) {
        emitter.removeAllListeners();
      }

      // Check for listener leaks
      const finalLeakReport = await leakDetector.analyzeEventListeners();
      expect(finalLeakReport.listenerLeaks).toBe(0);
      expect(finalLeakReport.totalListeners).toBe(0);
    });

    it('should detect closure leaks', async () => {
      const closures = [];

      // Create closures that capture large objects
      for (let i = 0; i < 20; i++) {
        const largeObject = {
          data: new Array(1000).fill(`closure-data-${i}`),
          metadata: { id: i, created: Date.now() }
        };

        const closure = () => {
          return largeObject.data.length;
        };

        closures.push({ closure, largeObject });
      }

      const profileWithClosures = await memoryProfiler.getProfile();

      // Remove references to closures
      closures.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        global.gc(); // Call twice to ensure collection
      }

      const profileAfterGC = await memoryProfiler.getProfile();
      const memoryDecrease = profileWithClosures.heapUsed - profileAfterGC.heapUsed;

      // Most of the closure memory should be freed
      expect(memoryDecrease).toBeGreaterThan(0);

      const closureLeakReport = await leakDetector.checkClosureLeaks();
      expect(closureLeakReport.closureLeaks).toBe(0);
    });

    it('should detect stream and buffer leaks', async () => {
      const streams = [];
      const buffers = [];

      // Create many streams
      for (let i = 0; i < 15; i++) {
        const streamSession = await catalystService.startStreamingSession({
          sessionId: `stream-leak-test-${i}`,
          message: 'Stream leak test',
          options: { chunkSize: 100, maxTokens: 300 }
        });
        streams.push(streamSession);

        // Create buffers
        const buffer = Buffer.alloc(1024 * 10, i); // 10KB buffer
        buffers.push(buffer);
      }

      const peakProfile = await memoryProfiler.getProfile();

      // Cleanup streams and buffers
      for (const stream of streams) {
        stream.destroy();
      }
      buffers.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const cleanupProfile = await memoryProfiler.getProfile();
      const memoryFreed = peakProfile.heapUsed - cleanupProfile.heapUsed;

      expect(memoryFreed).toBeGreaterThan(0);

      const streamLeakReport = await leakDetector.checkStreamLeaks();
      expect(streamLeakReport.streamLeaks).toBe(0);
      expect(streamLeakReport.bufferLeaks).toBe(0);
    });
  });

  describe('Resource Pool Management', () => {
    it('should efficiently manage database connection pools', async () => {
      const poolManager = catalystService.getDatabasePoolManager();

      // Test pool expansion
      const connections = [];
      for (let i = 0; i < 15; i++) {
        const connection = await poolManager.getConnection();
        connections.push(connection);
      }

      expect(poolManager.getActiveConnections()).toBe(15);
      expect(poolManager.getTotalConnections()).toBeGreaterThanOrEqual(15);

      // Test pool contraction
      for (const connection of connections) {
        await poolManager.releaseConnection(connection);
      }

      expect(poolManager.getActiveConnections()).toBe(0);
      expect(poolManager.getIdleConnections()).toBeGreaterThan(0);

      // Test pool cleanup
      await poolManager.cleanup();
      expect(poolManager.getTotalConnections()).toBeLessThanOrEqual(5); // Minimum pool size
    });

    it('should manage agent instance pools efficiently', async () => {
      const agentPool = catalystService.getAgentPool();

      // Request many agents
      const agents = [];
      for (let i = 0; i < 20; i++) {
        const agent = await agentPool.getAgent('learning-agent');
        agents.push(agent);
      }

      expect(agentPool.getActiveAgents()).toBe(20);
      expect(agentPool.getTotalAgents()).toBeGreaterThanOrEqual(20);

      // Return agents to pool
      for (const agent of agents) {
        await agentPool.returnAgent(agent);
      }

      expect(agentPool.getActiveAgents()).toBe(0);
      expect(agentPool.getIdleAgents()).toBeGreaterThan(0);

      // Test pool warmup
      await agentPool.warmup('learning-agent', 5);
      expect(agentPool.getIdleAgents()).toBeGreaterThanOrEqual(5);
    });

    it('should handle memory pressure in pools', async () => {
      const poolManager = catalystService.getDatabasePoolManager();

      // Simulate memory pressure
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many connections to trigger pressure
      const connections = [];
      for (let i = 0; i < 30; i++) {
        const connection = await poolManager.getConnection();
        connections.push(connection);
      }

      // Simulate memory pressure response
      await poolManager.handleMemoryPressure();

      // Should reduce pool size under pressure
      expect(poolManager.getTotalConnections()).toBeLessThan(30);

      // Cleanup
      for (const connection of connections) {
        await poolManager.releaseConnection(connection);
      }

      await poolManager.handleMemoryPressure();
      expect(poolManager.getTotalConnections()).toBeLessThanOrEqual(10);
    });
  });

  describe('Long-Running Memory Stability', () => {
    it('should maintain memory stability over extended operation', async () => {
      const duration = 10000; // 10 seconds
      const interval = 100; // 100ms
      const iterations = duration / interval;

      const memorySnapshots = [];

      // Run extended operation
      for (let i = 0; i < iterations; i++) {
        // Create and use sessions
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'stability-test',
          userId: `stability-user-${i}`
        });

        await catalystService.processUserInput({
          sessionId,
          message: `Stability test message ${i}`,
          agentId: 'learning-agent-001'
        });

        await catalystService.endSession(sessionId);

        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          const profile = await memoryProfiler.getProfile();
          memorySnapshots.push({
            iteration: i,
            heapUsed: profile.heapUsed,
            timestamp: Date.now()
          });
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      }

      // Analyze memory stability
      const initialMemory = memorySnapshots[0].heapUsed;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal over extended operation
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // <20MB growth

      // Calculate memory trend
      const trend = memoryProfiler.calculateTrend(memorySnapshots);
      expect(trend.slope).toBeLessThan(1024 * 1024); // <1MB per second growth
      expect(trend.r2).toBeGreaterThan(0.8); // Stable trend (low variance)
    });

    it('should recover from memory spikes', async () => {
      const baselineProfile = await memoryProfiler.getProfile();

      // Create memory spike
      const spikeSessions = [];
      for (let i = 0; i < 100; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'spike-test',
          userId: `spike-user-${i}`
        });

        // Create large context
        const largeContext = {
          data: new Array(1000).fill(`spike-data-${i}`),
          metadata: new Array(500).fill({ id: i, value: Math.random() })
        };

        await catalystService.processUserInput({
          sessionId,
          message: 'Memory spike test',
          agentId: 'learning-agent-001',
          context: largeContext
        });

        spikeSessions.push(sessionId);
      }

      const spikeProfile = await memoryProfiler.getProfile();
      const spikeIncrease = spikeProfile.heapUsed - baselineProfile.heapUsed;

      // Clean up spike
      for (const sessionId of spikeSessions) {
        await catalystService.endSession(sessionId);
      }

      // Force garbage collection multiple times
      for (let i = 0; i < 3; i++) {
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const recoveryProfile = await memoryProfiler.getProfile();
      const recoveryMemory = recoveryProfile.heapUsed - baselineProfile.heapUsed;

      // Should recover from spike
      expect(recoveryMemory).toBeLessThan(spikeIncrease * 0.3); // <30% of spike remains
      expect(recoveryMemory).toBeLessThan(50 * 1024 * 1024); // <50MB absolute
    });
  });
});