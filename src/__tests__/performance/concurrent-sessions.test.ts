/**
 * Concurrent Session Performance Tests
 *
 * Tests for system performance under high load with multiple concurrent sessions,
 * validating that the system can handle 100+ concurrent users efficiently.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupPerformanceTest, cleanupPerformanceTest } from '../setup/performance-setup';
import {
  createMockCatalystService,
  createMockLangChainService,
  createMockDatabaseService
} from '../utils/mocks/mock-services';
import type { PerformanceMetrics, LoadTestResult } from '../types/performance';

describe('Concurrent Session Performance Tests', () => {
  let catalystService: any;
  let langChainService: any;
  let databaseService: any;
  let performanceMonitor: any;

  beforeEach(async () => {
    const testEnvironment = await setupPerformanceTest();
    catalystService = testEnvironment.catalystService;
    langChainService = testEnvironment.langChainService;
    databaseService = testEnvironment.databaseService;
    performanceMonitor = testEnvironment.performanceMonitor;
  });

  afterEach(async () => {
    await cleanupPerformanceTest();
  });

  describe('Basic Concurrent Session Handling', () => {
    it('should handle 25 concurrent sessions efficiently', async () => {
      const concurrentUsers = 25;
      const sessionPromises = [];

      // Start performance monitoring
      performanceMonitor.startMonitoring();

      // Create concurrent sessions
      for (let i = 0; i < concurrentUsers; i++) {
        sessionPromises.push(createUserSession(i));
      }

      const startTime = Date.now();
      const results = await Promise.all(sessionPromises);
      const endTime = Date.now();

      const metrics = performanceMonitor.getMetrics();

      // Performance assertions
      expect(results).toHaveLength(concurrentUsers);
      expect(endTime - startTime).toBeLessThan(5000); // Complete within 5 seconds
      expect(metrics.averageResponseTime).toBeLessThan(200); // <200ms average
      expect(metrics.maxResponseTime).toBeLessThan(1000); // <1s max
      expect(metrics.errorRate).toBeLessThan(0.05); // <5% error rate

      // Verify all sessions completed successfully
      results.forEach((result, index) => {
        expect(result.sessionId).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.response.content).toContain('React');
        expect(result.metadata.userId).toBe(`user-${index}`);
      });
    });

    it('should handle 50 concurrent sessions with moderate complexity', async () => {
      const concurrentUsers = 50;
      const sessionPromises = [];

      performanceMonitor.startMonitoring();

      // Create more complex sessions
      for (let i = 0; i < concurrentUsers; i++) {
        sessionPromises.push(createComplexUserSession(i));
      }

      const startTime = Date.now();
      const results = await Promise.all(sessionPromises);
      const endTime = Date.now();

      const metrics = performanceMonitor.getMetrics();

      expect(results).toHaveLength(concurrentUsers);
      expect(endTime - startTime).toBeLessThan(8000); // Complete within 8 seconds
      expect(metrics.averageResponseTime).toBeLessThan(300); // <300ms average
      expect(metrics.memoryUsage.peak).toBeLessThan(200 * 1024 * 1024); // <200MB peak
    });

    it('should handle 100 concurrent sessions meeting performance targets', async () => {
      const concurrentUsers = 100;
      const sessionPromises = [];

      performanceMonitor.startMonitoring();

      // Create high-volume concurrent sessions
      for (let i = 0; i < concurrentUsers; i++) {
        sessionPromises.push(createHighVolumeUserSession(i));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(sessionPromises);
      const endTime = Date.now();

      const metrics = performanceMonitor.getMetrics();

      // Analyze results
      const successfulSessions = results.filter(r => r.status === 'fulfilled');
      const failedSessions = results.filter(r => r.status === 'rejected');

      expect(successfulSessions.length).toBeGreaterThan(95); // At least 95% success
      expect(failedSessions.length).toBeLessThan(5); // Less than 5 failures
      expect(endTime - startTime).toBeLessThan(15000); // Complete within 15 seconds

      // Performance targets for 100 concurrent users
      expect(metrics.averageResponseTime).toBeLessThan(500); // <500ms average
      expect(metrics.p95ResponseTime).toBeLessThan(1000); // <1s 95th percentile
      expect(metrics.throughput).toBeGreaterThan(6); // >6 requests/second
    });
  });

  describe('Streaming Performance Under Load', () => {
    it('should handle 25 concurrent streaming sessions', async () => {
      const concurrentStreams = 25;
      const streamPromises = [];

      performanceMonitor.startMonitoring();

      // Create concurrent streaming sessions
      for (let i = 0; i < concurrentStreams; i++) {
        streamPromises.push(createStreamingSession(i));
      }

      const startTime = Date.now();
      const results = await Promise.all(streamPromises);
      const endTime = Date.now();

      const metrics = performanceMonitor.getMetrics();

      expect(results).toHaveLength(concurrentStreams);
      expect(endTime - startTime).toBeLessThan(10000); // Complete within 10 seconds

      // Streaming-specific performance metrics
      results.forEach(result => {
        expect(result.chunksReceived).toBeGreaterThan(5);
        expect(result.averageChunkLatency).toBeLessThan(100); // <100ms chunk latency
        expect(result.totalStreamTime).toBeLessThan(3000); // <3s total stream time
      });

      expect(metrics.averageChunkLatency).toBeLessThan(50); // <50ms average
      expect(metrics.streamThroughput).toBeGreaterThan(10); // >10 chunks/second
    });

    it('should maintain streaming quality under high load', async () => {
      const concurrentStreams = 50;
      const streamPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentStreams; i++) {
        streamPromises.push(createHighVolumeStreamingSession(i));
      }

      const results = await Promise.allSettled(streamPromises);
      const successfulStreams = results.filter(r => r.status === 'fulfilled');

      expect(successfulStreams.length).toBeGreaterThan(45); // At least 90% success

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.packetLoss).toBeLessThan(0.02); // <2% packet loss
      expect(metrics.streamJitter).toBeLessThan(50); // <50ms jitter
    });
  });

  describe('Multi-Agent Orchestration Under Load', () => {
    it('should handle complex multi-agent workflows with 50 concurrent users', async () => {
      const concurrentUsers = 50;
      const workflowPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentUsers; i++) {
        workflowPromises.push(createMultiAgentWorkflow(i));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(workflowPromises);
      const endTime = Date.now();

      const successfulWorkflows = results.filter(r => r.status === 'fulfilled');

      expect(successfulWorkflows.length).toBeGreaterThan(45); // At least 90% success
      expect(endTime - startTime).toBeLessThan(20000); // Complete within 20 seconds

      // Verify multi-agent coordination under load
      successfulWorkflows.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.agentsInvolved).toBeGreaterThan(1);
          expect(result.value.handoffsCompleted).toBeGreaterThan(0);
          expect(result.value.workflowTime).toBeLessThan(5000); // <5s workflow time
        }
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.agentCoordinationLatency).toBeLessThan(200); // <200ms coordination
      expect(metrics.workflowSuccessRate).toBeGreaterThan(0.9); // >90% success
    });

    it('should handle agent handoffs efficiently under load', async () => {
      const handoffScenarios = 30;
      const handoffPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < handoffScenarios; i++) {
        handoffPromises.push(createAgentHandoffScenario(i));
      }

      const results = await Promise.allSettled(handoffPromises);
      const successfulHandoffs = results.filter(r => r.status === 'fulfilled');

      expect(successfulHandoffs.length).toBeGreaterThan(28); // At least 93% success

      // Verify handoff performance
      successfulHandoffs.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.handoffTime).toBeLessThan(500); // <500ms handoff time
          expect(result.value.contextPreserved).toBe(true);
          expect(result.value.seamlessTransition).toBe(true);
        }
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.averageHandoffTime).toBeLessThan(200); // <200ms average
      expect(metrics.contextPreservationRate).toBeGreaterThan(0.95); // >95% preservation
    });
  });

  describe('Database Performance Under Load', () => {
    it('should handle high-volume database operations efficiently', async () => {
      const concurrentOperations = 100;
      const dbPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentOperations; i++) {
        dbPromises.push(createDatabaseOperation(i));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(dbPromises);
      const endTime = Date.now();

      const successfulOps = results.filter(r => r.status === 'fulfilled');

      expect(successfulOps.length).toBeGreaterThan(95); // At least 95% success
      expect(endTime - startTime).toBeLessThan(5000); // Complete within 5 seconds

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.averageQueryTime).toBeLessThan(50); // <50ms average query
      expect(metrics.databaseThroughput).toBeGreaterThan(20); // >20 queries/second
      expect(metrics.connectionPoolEfficiency).toBeGreaterThan(0.8); // >80% efficiency
    });

    it('should maintain transaction integrity under high load', async () => {
      const concurrentTransactions = 50;
      const transactionPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentTransactions; i++) {
        transactionPromises.push(createComplexTransaction(i));
      }

      const results = await Promise.allSettled(transactionPromises);
      const successfulTransactions = results.filter(r => r.status === 'fulfilled');

      expect(successfulTransactions.length).toBeGreaterThan(48); // At least 96% success

      // Verify transaction integrity
      successfulTransactions.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.transactionCommitted).toBe(true);
          expect(result.value.dataIntegrity).toBe(true);
          expect(result.value.rollbacksOnFailure).toBe(0);
        }
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.transactionSuccessRate).toBeGreaterThan(0.95); // >95% success
      expect(metrics.dataCorruptionRate).toBe(0); // Zero corruption
    });
  });

  describe('Memory and Resource Management', () => {
    it('should manage memory efficiently during high load', async () => {
      const initialMemory = process.memoryUsage();
      const concurrentSessions = 100;
      const sessionPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentSessions; i++) {
        sessionPromises.push(createMemoryIntensiveSession(i));
      }

      await Promise.all(sessionPromises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should be managed efficiently
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB increase
      expect(memoryIncrease / concurrentSessions).toBeLessThan(1024 * 1024); // <1MB per session

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryEfficiency).toBeGreaterThan(0.8); // >80% efficiency
      expect(metrics.memoryLeakDetected).toBe(false);
    });

    it('should handle resource cleanup properly under load', async () => {
      const concurrentCycles = 50;
      const cyclePromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < concurrentCycles; i++) {
        cyclePromises.push(createResourceCycle(i));
      }

      await Promise.all(cyclePromises);

      // Verify resource cleanup
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.activeHandles).toBeLessThan(10); // Minimal active handles
      expect(metrics.activeRequests).toBe(0); // All requests cleaned up
      expect(metrics.resourceCleanupSuccess).toBe(true);
    });
  });

  describe('Stress Testing Beyond Normal Limits', () => {
    it('should gracefully handle overload scenarios', async () => {
      const extremeLoad = 200; // Beyond normal capacity
      const sessionPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < extremeLoad; i++) {
        sessionPromises.push(createUserSession(i));
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(sessionPromises);
      const endTime = Date.now();

      const successfulSessions = results.filter(r => r.status === 'fulfilled');
      const rejectedSessions = results.filter(r => r.status === 'rejected');

      // System should degrade gracefully
      expect(successfulSessions.length).toBeGreaterThan(150); // At least 75% success
      expect(endTime - startTime).toBeLessThan(30000); // Complete within 30 seconds

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.overloadHandled).toBe(true);
      expect(metrics.degradationMode).toBe(true);
      expect(metrics.coreServicesMaintained).toBe(true);
    });

    it('should recover from extreme load conditions', async () => {
      // First, create extreme load
      const extremeLoad = 150;
      const overloadPromises = [];

      for (let i = 0; i < extremeLoad; i++) {
        overloadPromises.push(createUserSession(i));
      }

      await Promise.allSettled(overloadPromises);

      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test recovery with normal load
      const normalLoad = 25;
      const recoveryPromises = [];

      performanceMonitor.startMonitoring();

      for (let i = 0; i < normalLoad; i++) {
        recoveryPromises.push(createUserSession(i));
      }

      const recoveryResults = await Promise.allSettled(recoveryPromises);
      const successfulRecovery = recoveryResults.filter(r => r.status === 'fulfilled');

      expect(successfulRecovery.length).toBeGreaterThan(23); // At least 92% recovery

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.systemRecovered).toBe(true);
      expect(metrics.performanceRestored).toBe(true);
      expect(metrics.responseTimeBackToNormal).toBe(true);
    });
  });

  // Helper functions for creating different types of sessions
  async function createUserSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'react-basics',
      userId: `user-${userId}`
    });

    return catalystService.processUserInput({
      sessionId,
      message: 'Explain React components',
      agentId: 'learning-agent-001'
    });
  }

  async function createComplexUserSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'advanced-react',
      userId: `user-${userId}`
    });

    const response1 = await catalystService.processUserInput({
      sessionId,
      message: 'Explain React patterns and best practices',
      agentId: 'learning-agent-001'
    });

    const response2 = await catalystService.processUserInput({
      sessionId,
      message: 'Give me practice exercises',
      agentId: 'practice-agent-001'
    });

    return {
      sessionId,
      responses: [response1, response2],
      userId: `user-${userId}`
    };
  }

  async function createHighVolumeUserSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'comprehensive-topic',
      userId: `user-${userId}`
    });

    const requests = [
      'Provide comprehensive overview',
      'Give me detailed examples',
      'Create practice problems',
      'Assess my understanding',
      'Provide feedback and recommendations'
    ];

    const responses = await Promise.all(
      requests.map(message =>
        catalystService.processUserInput({
          sessionId,
          message,
          agentId: message.includes('practice') ? 'practice-agent-001' :
                 message.includes('Assess') ? 'assessment-agent-001' :
                 'learning-agent-001'
        })
      )
    );

    return {
      sessionId,
      responses,
      userId: `user-${userId}`,
      requestCount: requests.length
    };
  }

  async function createStreamingSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'streaming-topic',
      userId: `user-${userId}`
    });

    const streamSession = await catalystService.startStreamingSession({
      sessionId,
      message: 'Provide detailed explanation with examples',
      options: { chunkSize: 100, maxTokens: 500 }
    });

    const chunks = [];
    const startTime = Date.now();

    return new Promise((resolve) => {
      streamSession.on('chunk', (chunk: any) => {
        chunks.push(chunk);
      });

      streamSession.on('end', () => {
        resolve({
          sessionId,
          chunksReceived: chunks.length,
          averageChunkLatency: (Date.now() - startTime) / chunks.length,
          totalStreamTime: Date.now() - startTime,
          userId: `user-${userId}`
        });
      });
    });
  }

  async function createHighVolumeStreamingSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'high-volume-streaming',
      userId: `user-${userId}`
    });

    const streamSession = await catalystService.startStreamingSession({
      sessionId,
      message: 'Provide extensive learning material',
      options: { chunkSize: 50, maxTokens: 1000 }
    });

    const chunks = [];
    let packetLoss = 0;

    return new Promise((resolve) => {
      streamSession.on('chunk', (chunk: any) => {
        // Simulate occasional packet loss
        if (Math.random() < 0.02) {
          packetLoss++;
          return;
        }
        chunks.push(chunk);
      });

      streamSession.on('end', () => {
        resolve({
          sessionId,
          chunksReceived: chunks.length,
          packetLoss,
          totalChunks: chunks.length + packetLoss,
          userId: `user-${userId}`
        });
      });
    });
  }

  async function createMultiAgentWorkflow(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'multi-agent-workflow',
      userId: `user-${userId}`
    });

    const startTime = Date.now();

    // Learning phase
    await catalystService.processUserInput({
      sessionId,
      message: 'Teach me about system architecture',
      agentId: 'learning-agent-001'
    });

    // Practice phase
    await catalystService.processUserInput({
      sessionId,
      message: 'Give me architecture design problems',
      agentId: 'practice-agent-001'
    });

    // Assessment phase
    await catalystService.processUserInput({
      sessionId,
      message: 'Evaluate my architecture knowledge',
      agentId: 'assessment-agent-001'
    });

    // Tutoring phase
    await catalystService.processUserInput({
      sessionId,
      message: 'Help me improve my designs',
      agentId: 'tutoring-agent-001'
    });

    return {
      sessionId,
      agentsInvolved: 4,
      handoffsCompleted: 3,
      workflowTime: Date.now() - startTime,
      userId: `user-${userId}`
    };
  }

  async function createAgentHandoffScenario(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'handoff-scenario',
      userId: `user-${userId}`
    });

    const startTime = Date.now();

    const response1 = await catalystService.processUserInput({
      sessionId,
      message: 'Explain microservices',
      agentId: 'learning-agent-001'
    });

    const handoff = await catalystService.evaluateAgentHandoff({
      sessionId,
      currentAgent: 'learning-agent-001',
      userInput: 'I want to practice designing microservices',
      context: response1.metadata
    });

    const response2 = await catalystService.executeHandoff({
      sessionId,
      fromAgent: 'learning-agent-001',
      toAgent: 'practice-agent-001',
      context: handoff.preservedContext
    });

    return {
      sessionId,
      handoffTime: Date.now() - startTime,
      contextPreserved: handoff.preservedContext !== null,
      seamlessTransition: response2.success,
      userId: `user-${userId}`
    };
  }

  async function createDatabaseOperation(userId: number) {
    const sessionId = `db-session-${userId}`;

    await databaseService.insert('sessions', {
      id: sessionId,
      user_id: `user-${userId}`,
      created_at: new Date(),
      metadata: JSON.stringify({ test: true })
    });

    const result = await databaseService.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);

    await databaseService.update('sessions',
      { last_activity: new Date() },
      { id: sessionId }
    );

    return {
      sessionId,
      operationTime: Date.now(),
      success: result.rows.length > 0,
      userId: `user-${userId}`
    };
  }

  async function createComplexTransaction(userId: number) {
    return databaseService.transaction(async (trx) => {
      const sessionId = `tx-session-${userId}`;

      await trx.insert('sessions', {
        id: sessionId,
        user_id: `user-${userId}`,
        created_at: new Date()
      });

      await trx.insert('session_progress', {
        session_id: sessionId,
        mastery_level: 0.5,
        time_spent: 300
      });

      await trx.insert('session_analytics', {
        session_id: sessionId,
        events: JSON.stringify(['start', 'progress', 'complete'])
      });

      const result = await trx.query(
        'SELECT COUNT(*) as count FROM sessions WHERE user_id = ?',
        [`user-${userId}`]
      );

      return {
        sessionId,
        transactionCommitted: true,
        dataIntegrity: result.rows[0].count > 0,
        rollbacksOnFailure: 0,
        userId: `user-${userId}`
      };
    });
  }

  async function createMemoryIntensiveSession(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'memory-intensive',
      userId: `user-${userId}`
    });

    // Create large context
    const largeContext = {
      history: Array.from({ length: 100 }, (_, i) => ({
        message: `Message ${i}: ${'x'.repeat(100)}`,
        timestamp: Date.now()
      })),
      metadata: {
        largeData: 'x'.repeat(10000),
        arrays: Array.from({ length: 1000 }, (_, i) => `item-${i}`)
      }
    };

    const response = await catalystService.processUserInput({
      sessionId,
      message: 'Process large context data',
      agentId: 'learning-agent-001',
      context: largeContext
    });

    return {
      sessionId,
      contextSize: JSON.stringify(largeContext).length,
      responseSize: JSON.stringify(response).length,
      userId: `user-${userId}`
    };
  }

  async function createResourceCycle(userId: number) {
    const sessionId = await catalystService.createSession({
      type: 'learning',
      conceptId: 'resource-cycle',
      userId: `user-${userId}`
    });

    // Create and use multiple resources
    const streamSession = await catalystService.startStreamingSession({
      sessionId,
      message: 'Test resource usage',
      options: { chunkSize: 50, maxTokens: 200 }
    });

    // Simulate resource usage
    const resources = [];
    for (let i = 0; i < 10; i++) {
      const resource = catalystService.createResource(`resource-${userId}-${i}`);
      resources.push(resource);
    }

    // Clean up resources
    resources.forEach(resource => resource.cleanup());
    await catalystService.endSession(sessionId);

    return {
      sessionId,
      resourcesCreated: resources.length,
      resourcesCleaned: resources.length,
      userId: `user-${userId}`
    };
  }
});