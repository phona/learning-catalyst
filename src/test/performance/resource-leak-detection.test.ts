/**
 * Resource Leak Detection and Prevention Tests
 *
 * Comprehensive tests for detecting and preventing resource leaks including
 * memory, connections, event listeners, file handles, and other system resources.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupPerformanceTest, cleanupPerformanceTest } from '../setup/performance-setup';
import {
  createLeakDetector,
  createResourceMonitor,
  createPreventionSystem
} from '../utils/performance-test-utils';
import type { LeakDetectionReport, ResourceMonitorReport, PreventionReport } from '../types/performance';

describe('Resource Leak Detection and Prevention Tests', () => {
  let leakDetector: any;
  let resourceMonitor: any;
  let preventionSystem: any;
  let catalystService: any;

  beforeEach(async () => {
    const testEnvironment = await setupPerformanceTest();
    catalystService = testEnvironment.catalystService;
    leakDetector = createLeakDetector();
    resourceMonitor = createResourceMonitor();
    preventionSystem = createPreventionSystem();
  });

  afterEach(async () => {
    await cleanupPerformanceTest();
  });

  describe('Memory Leak Detection', () => {
    it('should detect memory leaks from unclosed sessions', async () => {
      const baselineReport = await leakDetector.getMemoryBaseline();

      // Create sessions without proper cleanup
      const leakedSessions = [];
      for (let i = 0; i < 20; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'leak-test',
          userId: `leak-user-${i}`
        });

        // Simulate session data accumulation
        await catalystService.processUserInput({
          sessionId,
          message: `Leak test message ${i}`,
          agentId: 'learning-agent-001'
        });

        leakedSessions.push(sessionId);
      }

      // Don't clean up sessions to simulate leak
      const leakReport = await leakDetector.detectMemoryLeaks(baselineReport);

      expect(leakReport.leakDetected).toBe(true);
      expect(leakReport.leakSources).toContain('unclosed_sessions');
      expect(leakReport.estimatedLeakSize).toBeGreaterThan(0);
      expect(leakReport.affectedSessions).toHaveLength(20);

      // Now cleanup and verify leak resolution
      for (const sessionId of leakedSessions) {
        await catalystService.endSession(sessionId);
      }

      const cleanupReport = await leakDetector.detectMemoryLeaks(baselineReport);
      expect(cleanupReport.leakDetected).toBe(false);
    });

    it('should detect memory leaks from circular references', async () => {
      const baselineReport = await leakDetector.getMemoryBaseline();

      // Create circular references
      const objects = [];
      for (let i = 0; i < 10; i++) {
        const obj1 = { id: i, data: new Array(100).fill(`data-${i}`) };
        const obj2 = { parent: obj1, children: [] };
        obj1.child = obj2;
        obj2.children.push(obj1); // Create circular reference

        objects.push(obj1, obj2);
      }

      const leakReport = await leakDetector.detectCircularReferences();

      expect(leakReport.circularReferencesDetected).toBe(true);
      expect(leakReport.circularReferences).toHaveLength(10);
      expect(leakReport.totalObjectsInCycles).toBe(20);

      // Break circular references
      objects.forEach(obj => {
        if (obj.child) {
          delete obj.child.parent;
        }
        if (obj.parent) {
          delete obj.parent.child;
        }
      });

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const resolutionReport = await leakDetector.detectCircularReferences();
      expect(resolutionReport.circularReferencesDetected).toBe(false);
    });

    it('should detect memory leaks from event listeners', async () => {
      const baselineReport = await leakDetector.getMemoryBaseline();

      // Create event emitters with listeners
      const emitters = [];
      for (let i = 0; i < 15; i++) {
        const emitter = catalystService.createEventEmitter();

        // Add listeners that capture large closures
        const largeData = new Array(1000).fill(`listener-data-${i}`);
        emitter.on('data', (data) => {
          console.log(largeData.length, data); // Closure captures largeData
        });

        emitter.on('error', (err) => {
          console.log(largeData.length, err); // Another closure
        });

        emitters.push(emitter);
      }

      // Don't remove listeners to simulate leak
      const leakReport = await leakDetector.detectListenerLeaks();

      expect(leakReport.listenerLeaksDetected).toBe(true);
      expect(leakReport.totalLeakedListeners).toBe(30); // 15 emitters * 2 listeners
      expect(leakReport.memoryImpact).toBeGreaterThan(0);

      // Cleanup listeners
      emitters.forEach(emitter => {
        emitter.removeAllListeners();
      });

      const cleanupReport = await leakDetector.detectListenerLeaks();
      expect(cleanupReport.listenerLeaksDetected).toBe(false);
    });

    it('should detect memory leaks from unclosed streams', async () => {
      const baselineReport = await leakDetector.getMemoryBaseline();

      // Create streams without proper cleanup
      const streams = [];
      for (let i = 0; i < 10; i++) {
        const streamSession = await catalystService.startStreamingSession({
          sessionId: `stream-leak-${i}`,
          message: 'Stream leak test',
          options: { chunkSize: 100, maxTokens: 500 }
        });

        // Simulate stream data accumulation
        streamSession.on('data', (chunk) => {
          // Capture chunks without releasing them
          if (!streamSession.capturedChunks) {
            streamSession.capturedChunks = [];
          }
          streamSession.capturedChunks.push(chunk);
        });

        streams.push(streamSession);
      }

      // Don't close streams to simulate leak
      const leakReport = await leakDetector.detectStreamLeaks();

      expect(leakReport.streamLeaksDetected).toBe(true);
      expect(leakReport.leakedStreams).toHaveLength(10);
      expect(leakReport.bufferLeaks).toBe(true);
      expect(leakReport.estimatedMemoryLeak).toBeGreaterThan(0);

      // Cleanup streams
      streams.forEach(stream => {
        stream.removeAllListeners();
        stream.destroy();
      });

      const cleanupReport = await leakDetector.detectStreamLeaks();
      expect(cleanupReport.streamLeaksDetected).toBe(false);
    });
  });

  describe('Database Connection Leak Detection', () => {
    it('should detect database connection leaks', async () => {
      const connectionLeakDetector = leakDetector.getDatabaseLeakDetector();

      // Get connections without returning them
      const connections = [];
      for (let i = 0; i < 12; i++) {
        const connection = await catalystService.getDatabaseConnection();
        connections.push(connection);
      }

      const leakReport = await connectionLeakDetector.detectLeaks();

      expect(leakReport.connectionLeaksDetected).toBe(true);
      expect(leakReport.leakedConnections).toBe(12);
      expect(leakReport.poolExhaustionRisk).toBe(true);

      // Return connections
      for (const connection of connections) {
        await catalystService.returnDatabaseConnection(connection);
      }

      const cleanupReport = await connectionLeakDetector.detectLeaks();
      expect(cleanupReport.connectionLeaksDetected).toBe(false);
    });

    it('should detect transaction leaks', async () => {
      const transactionLeakDetector = leakDetector.getTransactionLeakDetector();

      // Start transactions without committing/rolling back
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        const transaction = await catalystService.startTransaction();
        transactions.push(transaction);

        // Execute some operations
        await transaction.execute('INSERT INTO test VALUES (?)', [i]);
        // Don't commit or rollback
      }

      const leakReport = await transactionLeakDetector.detectLeaks();

      expect(leakReport.transactionLeaksDetected).toBe(true);
      expect(leakReport.leakedTransactions).toBe(5);
      expect(leakReport.lockHolders).toHaveLength(5);

      // Cleanup transactions
      for (const transaction of transactions) {
        await transaction.rollback();
      }

      const cleanupReport = await transactionLeakDetector.detectLeaks();
      expect(cleanupReport.transactionLeaksDetected).toBe(false);
    });
  });

  describe('File Handle Leak Detection', () => {
    it('should detect file handle leaks', async () => {
      const fileLeakDetector = leakDetector.getFileLeakDetector();

      // Open files without closing them
      const fileHandles = [];
      for (let i = 0; i < 8; i++) {
        const fileHandle = await catalystService.openFile(`test-file-${i}.txt`, 'w');
        fileHandles.push(fileHandle);
      }

      const leakReport = await fileLeakDetector.detectLeaks();

      expect(leakReport.fileHandleLeaksDetected).toBe(true);
      expect(leakReport.leakedHandles).toBe(8);
      expect(leakReport.systemFileDescriptors).toBeGreaterThan(8);

      // Cleanup file handles
      for (const handle of fileHandles) {
        await handle.close();
      }

      const cleanupReport = await fileLeakDetector.detectLeaks();
      expect(cleanupReport.fileHandleLeaksDetected).toBe(false);
    });

    it('should detect temporary file leaks', async () => {
      const tempFileLeakDetector = leakDetector.getTempFileLeakDetector();

      // Create temporary files without cleanup
      const tempFiles = [];
      for (let i = 0; i < 6; i++) {
        const tempFile = await catalystService.createTempFile('test-', '.txt');
        await catalystService.writeToFile(tempFile.path, `Temp data ${i}`);
        tempFiles.push(tempFile);
      }

      const leakReport = await tempFileLeakDetector.detectLeaks();

      expect(leakReport.tempFileLeaksDetected).toBe(true);
      expect(leakReport.leakedTempFiles).toBe(6);
      expect(leakReport.diskSpaceUsed).toBeGreaterThan(0);

      // Cleanup temp files
      for (const tempFile of tempFiles) {
        await catalystService.deleteTempFile(tempFile.path);
      }

      const cleanupReport = await tempFileLeakDetector.detectLeaks();
      expect(cleanupReport.tempFileLeaksDetected).toBe(false);
    });
  });

  describe('Resource Leak Prevention', () => {
    it('should prevent session leaks with automatic cleanup', async () => {
      preventionSystem.enableSessionLeakPrevention({
        maxSessionAge: 5000, // 5 seconds
        cleanupInterval: 1000 // Check every second
      });

      // Create sessions that would normally leak
      const sessionIds = [];
      for (let i = 0; i < 10; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'prevention-test',
          userId: `prevention-user-${i}`
        });
        sessionIds.push(sessionId);
      }

      // Wait for automatic cleanup
      await new Promise(resolve => setTimeout(resolve, 6000));

      const preventionReport = await preventionSystem.getPreventionReport();

      expect(preventionReport.sessionLeakPreventionActive).toBe(true);
      expect(preventionReport.sessionsCleanedUp).toBeGreaterThan(0);
      expect(preventionReport.memoryReclaimed).toBeGreaterThan(0);
    });

    it('should prevent connection pool exhaustion', async () => {
      preventionSystem.enableConnectionPoolPrevention({
        maxConnections: 10,
        connectionTimeout: 2000,
        recoveryInterval: 1000
      });

      // Try to exhaust connection pool
      const connections = [];
      for (let i = 0; i < 15; i++) {
        try {
          const connection = await catalystService.getDatabaseConnection();
          connections.push(connection);
        } catch (error) {
          // Expected to fail after pool is exhausted
        }
      }

      const preventionReport = await preventionSystem.getPreventionReport();

      expect(preventionReport.connectionPoolProtectionActive).toBe(true);
      expect(preventionReport.connectionRejections).toBeGreaterThan(0);
      expect(preventionReport.poolRecoveryAttempts).toBeGreaterThan(0);
    });

    it('should prevent event listener accumulation', async () => {
      preventionSystem.enableListenerLeakPrevention({
        maxListenersPerEmitter: 5,
        listenerCleanupInterval: 2000
      });

      // Try to create many listeners
      const emitters = [];
      for (let i = 0; i < 5; i++) {
        const emitter = catalystService.createEventEmitter();

        // Add more listeners than allowed
        for (let j = 0; j < 10; j++) {
          emitter.on('event', () => {});
        }

        emitters.push(emitter);
      }

      // Wait for automatic cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));

      const preventionReport = await preventionSystem.getPreventionReport();

      expect(preventionReport.listenerLeakPreventionActive).toBe(true);
      expect(preventionReport.listenersCleanedUp).toBeGreaterThan(0);
      expect(preventionReport.listenerLimitEnforcements).toBeGreaterThan(0);
    });
  });

  describe('Resource Monitoring and Alerting', () => {
    it('should monitor resource usage in real-time', async () => {
      resourceMonitor.startMonitoring({
        interval: 100, // 100ms
        metrics: ['memory', 'connections', 'listeners', 'handles'],
        thresholds: {
          memory: 100 * 1024 * 1024, // 100MB
          connections: 20,
          listeners: 50,
          handles: 30
        }
      });

      // Create resource load
      const sessions = [];
      for (let i = 0; i < 15; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'monitoring-test',
          userId: `monitoring-user-${i}`
        });
        sessions.push(sessionId);
      }

      // Wait for monitoring to collect data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const monitoringReport = await resourceMonitor.getMonitoringReport();

      expect(monitoringReport.monitoringActive).toBe(true);
      expect(monitoringReport.dataPoints).toBeGreaterThan(5);
      expect(monitoringReport.currentMetrics).toBeDefined();
      expect(monitoringReport.thresholdViolations).toBeDefined();

      // Cleanup
      for (const sessionId of sessions) {
        await catalystService.endSession(sessionId);
      }

      resourceMonitor.stopMonitoring();
    });

    it('should generate alerts for resource anomalies', async () => {
      resourceMonitor.startMonitoring({
        interval: 50,
        alertThresholds: {
          memoryGrowthRate: 10 * 1024 * 1024, // 10MB/sec
          connectionGrowthRate: 5, // 5 connections/sec
          listenerGrowthRate: 10 // 10 listeners/sec
        }
      });

      // Create rapid resource growth
      for (let i = 0; i < 10; i++) {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'alert-test',
          userId: `alert-user-${i}`
        });

        // Create many listeners quickly
        const emitter = catalystService.createEventEmitter();
        for (let j = 0; j < 5; j++) {
          emitter.on('rapid-event', () => {});
        }

        await new Promise(resolve => setTimeout(resolve, 20));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const alertReport = await resourceMonitor.getAlertReport();

      expect(alertReport.alertsGenerated).toBeGreaterThan(0);
      expect(alertReport.alerts.some(alert =>
        alert.type === 'memory_growth' ||
        alert.type === 'connection_growth' ||
        alert.type === 'listener_growth'
      )).toBe(true);

      resourceMonitor.stopMonitoring();
    });
  });

  describe('Comprehensive Leak Detection Integration', () => {
    it('should perform comprehensive resource leak analysis', async () => {
      const comprehensiveReport = await leakDetector.performComprehensiveAnalysis();

      expect(comprehensiveReport.analysisPerformed).toBe(true);
      expect(comprehensiveReport.memoryAnalysis).toBeDefined();
      expect(comprehensiveReport.connectionAnalysis).toBeDefined();
      expect(comprehensiveReport.listenerAnalysis).toBeDefined();
      expect(comprehensiveReport.fileHandleAnalysis).toBeDefined();
      expect(comprehensiveReport.streamAnalysis).toBeDefined();

      // Create mixed resource leaks
      const sessions = [];
      const connections = [];
      const emitters = [];

      for (let i = 0; i < 5; i++) {
        // Session leak
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: 'comprehensive-test',
          userId: `comprehensive-user-${i}`
        });
        sessions.push(sessionId);

        // Connection leak
        const connection = await catalystService.getDatabaseConnection();
        connections.push(connection);

        // Listener leak
        const emitter = catalystService.createEventEmitter();
        emitter.on('leak-event', () => {});
        emitters.push(emitter);
      }

      const leakReport = await leakDetector.performComprehensiveAnalysis();

      expect(leakReport.totalLeaksDetected).toBeGreaterThan(0);
      expect(leakReport.leakCategories).toContain('memory');
      expect(leakReport.leakCategories).toContain('connections');
      expect(leakReport.leakCategories).toContain('listeners');
      expect(leakReport.estimatedTotalImpact).toBeGreaterThan(0);

      // Cleanup all resources
      for (const sessionId of sessions) {
        await catalystService.endSession(sessionId);
      }
      for (const connection of connections) {
        await catalystService.returnDatabaseConnection(connection);
      }
      for (const emitter of emitters) {
        emitter.removeAllListeners();
      }

      const cleanupReport = await leakDetector.performComprehensiveAnalysis();
      expect(cleanupReport.totalLeaksDetected).toBe(0);
    });

    it('should provide actionable leak prevention recommendations', async () => {
      // Simulate various leak scenarios
      await catalystService.createSession({
        type: 'learning',
        conceptId: 'recommendation-test',
        userId: 'recommendation-user'
      }); // Intentional session leak

      const recommendations = await leakDetector.getLeakPreventionRecommendations();

      expect(recommendations.recommendationsGenerated).toBe(true);
      expect(recommendations.priorityIssues).toHaveLength(1);
      expect(recommendations.priorityIssues[0].type).toBe('session_leak');
      expect(recommendations.priorityIssues[0].severity).toBe('high');
      expect(recommendations.priorityIssues[0].recommendation).toContain('endSession');

      expect(recommendations.preventionStrategies).toBeDefined();
      expect(recommendations.monitoringSuggestions).toBeDefined();
      expect(recommendations.automatedRemediation).toBeDefined();
    });
  });
});