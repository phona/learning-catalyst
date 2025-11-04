/**
 * Error Scenario and Recovery Integration Tests
 *
 * Comprehensive tests for error handling, recovery mechanisms, and system resilience
 * across all components of the multi-agent architecture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupIntegrationTest, cleanupIntegrationTest } from '../setup/integration-setup';
import {
  mockCatalystService,
  mockLangChainService,
  mockDatabaseService,
  mockAgentRegistry
} from '../utils/mocks/mock-services';
import type { ErrorRecoveryManager, SystemHealthMonitor } from '../types/error-handling';

describe('Error Scenario and Recovery Integration Tests', () => {
  let catalystService: any;
  let langChainService: any;
  let databaseService: any;
  let errorRecoveryManager: ErrorRecoveryManager;
  let healthMonitor: SystemHealthMonitor;

  beforeEach(async () => {
    const testEnvironment = await setupIntegrationTest();
    catalystService = testEnvironment.catalystService;
    langChainService = testEnvironment.langChainService;
    databaseService = testEnvironment.databaseService;
    errorRecoveryManager = testEnvironment.errorRecoveryManager;
    healthMonitor = testEnvironment.healthMonitor;
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Service Availability Failures', () => {
    it('should handle LangChain service unavailability gracefully', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'test-concept',
        userId: 'test-user-001'
      });

      // Simulate LangChain service failure
      langChainService.processMessage = vi.fn().mockRejectedValue(
        new Error('LangChain service unavailable - API rate limit exceeded')
      );

      const response = await catalystService.processUserInput({
        sessionId,
        message: 'Explain quantum computing',
        agentId: 'learning-agent-001'
      });

      // Verify error handling
      expect(response.type).toBe('error');
      expect(response.content).toContain('temporarily unavailable');
      expect(response.metadata.errorCode).toBe('LANGCHAIN_UNAVAILABLE');
      expect(response.metadata.retryAfter).toBeGreaterThan(0);

      // Verify fallback mechanism
      const fallbackResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Try a simpler explanation',
        agentId: 'learning-agent-001'
      });

      expect(fallbackResponse.type).toBe('cached_response');
      expect(fallbackResponse.metadata.fallbackUsed).toBe(true);
      expect(fallbackResponse.metadata.originalError).toContain('LANGCHAIN_UNAVAILABLE');
    });

    it('should recover from temporary database connection issues', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'database-test',
        userId: 'test-user-db'
      });

      // Simulate database connection failure
      let attemptCount = 0;
      databaseService.query = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Database connection timeout');
        }
        return { success: true, data: { sessionData: 'recovered' } };
      });

      const response = await catalystService.processUserInput({
        sessionId,
        message: 'Save my progress',
        agentId: 'learning-agent-001'
      });

      // Verify recovery after retries
      expect(response.type).toBe('success');
      expect(response.metadata.databaseRetries).toBe(2);
      expect(response.metadata.connectionRecovered).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should handle agent service crashes and restarts', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'agent-crash-test',
        userId: 'test-user-crash'
      });

      // Mock agent crash
      let agentHealthy = true;
      const mockAgent = {
        processMessage: vi.fn().mockImplementation(async () => {
          if (!agentHealthy) {
            throw new Error('Agent process crashed');
          }
          return { type: 'learning_explanation', content: 'Agent response' };
        })
      };

      catalystService.registerAgent('crash-prone-agent', mockAgent);

      // Initial successful request
      const initialResponse = await catalystService.processUserInput({
        sessionId,
        message: 'First request',
        agentId: 'crash-prone-agent'
      });

      expect(initialResponse.type).toBe('learning_explanation');

      // Simulate agent crash
      agentHealthy = false;

      const crashResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Request during crash',
        agentId: 'crash-prone-agent'
      });

      expect(crashResponse.type).toBe('error');
      expect(crashResponse.metadata.agentRestarted).toBe(true);

      // Simulate agent recovery
      agentHealthy = true;
      mockAgent.processMessage.mockClear();

      const recoveryResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Request after recovery',
        agentId: 'crash-prone-agent'
      });

      expect(recoveryResponse.type).toBe('learning_explanation');
      expect(recoveryResponse.metadata.agentRecovered).toBe(true);
    });
  });

  describe('Network and Communication Failures', () => {
    it('should handle network timeout during streaming responses', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'streaming-test',
        userId: 'test-user-stream'
      });

      // Mock streaming with network interruption
      const mockStream = {
        on: vi.fn(),
        emit: vi.fn(),
        listeners: new Map()
      };

      let streamInterrupted = false;
      mockStream.on.mockImplementation((event, callback) => {
        mockStream.listeners.set(event, callback);
      });

      catalystService.startStreamingSession = vi.fn().mockResolvedValue(mockStream);

      // Start streaming
      const streamSession = await catalystService.startStreamingSession({
        sessionId,
        message: 'Provide long explanation',
        options: { chunkSize: 100, maxTokens: 1000 }
      });

      // Simulate network interruption
      setTimeout(() => {
        streamInterrupted = true;
        const errorCallback = mockStream.listeners.get('error');
        if (errorCallback) {
          errorCallback(new Error('Network connection lost'));
        }
      }, 100);

      // Wait for error handling
      const errorHandled = new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(streamInterrupted).toBe(true);
          resolve();
        }, 200);
      });

      await errorHandled;

      // Verify automatic reconnection attempt
      expect(catalystService.attemptStreamReconnection).toHaveBeenCalledWith(sessionId);
    });

    it('should handle IPC communication failures', async () => {
      // Mock IPC failure
      const mockIPC = {
        invoke: vi.fn()
      };

      let callCount = 0;
      mockIPC.invoke.mockImplementation(async (channel, data) => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('IPC channel disconnected');
        }
        return { success: true, result: `Processed: ${data.message}` };
      });

      // Test IPC with retry logic
      const result = await catalystService.invokeWithRetry('catalyst:process-input', {
        message: 'Test message'
      }, { maxRetries: 3, retryDelay: 100 });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Initial call + 2 retries
    });

    it('should handle MessageChannelMain connection failures', async () => {
      // Mock MessageChannelMain failure
      const mockMessageChannel = {
        port1: { on: vi.fn(), postMessage: vi.fn(), close: vi.fn() },
        port2: { on: vi.fn(), postMessage: vi.fn(), close: vi.fn() }
      };

      // Simulate port disconnection
      mockMessageChannel.port1.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(callback, 50); // Simulate immediate disconnection
        }
      });

      const streamManager = catalystService.getStreamManager();

      // Start stream with failing port
      const streamPromise = streamManager.createStream('session-001', mockMessageChannel);

      // Should handle port failure gracefully
      const result = await streamPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel disconnected');
      expect(result.fallbackInitiated).toBe(true);
    });
  });

  describe('Data Integrity and Corruption', () => {
    it('should detect and handle corrupted session data', async () => {
      // Create session with corrupted data
      const corruptedSessionId = 'corrupted-session-001';

      // Mock corrupted session data
      databaseService.getSession = vi.fn().mockResolvedValue({
        id: corruptedSessionId,
        data: null, // Corrupted data
        metadata: { corrupted: true, lastValidBackup: 'backup-001' }
      });

      const recovery = await errorRecoveryManager.attemptSessionRecovery(corruptedSessionId);

      expect(recovery.corruptionDetected).toBe(true);
      expect(recovery.backupRestored).toBe(true);
      expect(recovery.restoredFromBackup).toBe('backup-001');
      expect(recovery.sessionFunctional).toBe(true);
    });

    it('should handle database constraint violations gracefully', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'constraint-test',
        userId: 'test-user-constraints'
      });

      // Mock constraint violation
      databaseService.insert = vi.fn().mockRejectedValue(
        new Error('UNIQUE constraint failed: sessions.id')
      );

      const response = await catalystService.saveSessionProgress({
        sessionId,
        progress: { mastery: 0.5, timeSpent: 300 }
      });

      expect(response.success).toBe(false);
      expect(response.errorType).toBe('CONSTRAINT_VIOLATION');
      expect(response.recoveryAttempted).toBe(true);

      // Should attempt alternative save strategy
      expect(databaseService.insert).toHaveBeenCalledWith(
        'session_progress_alternative',
        expect.any(Object)
      );
    });

    it('should validate and sanitize malformed input data', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'validation-test',
        userId: 'test-user-validation'
      });

      // Test various malformed inputs
      const malformedInputs = [
        { message: undefined },
        { message: null },
        { message: 12345 },
        { message: { nested: 'object' } },
        { message: 'x'.repeat(100000) } // Extremely long message
      ];

      for (const input of malformedInputs) {
        const response = await catalystService.processUserInput({
          sessionId,
          message: input.message,
          agentId: 'learning-agent-001'
        });

        expect(response.type).toBe('error');
        expect(response.metadata.validationError).toBe(true);
        expect(response.metadata.inputSanitized).toBeDefined();
      }
    });
  });

  describe('Resource Exhaustion and Performance Degradation', () => {
    it('should handle memory pressure gracefully', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 900MB - near limit
        heapTotal: 1024 * 1024 * 1024, // 1GB total
        external: 50 * 1024 * 1024, // 50MB external
        rss: 950 * 1024 * 1024 // 950MB RSS
      });

      const healthStatus = await healthMonitor.checkSystemHealth();

      expect(healthStatus.memoryPressure).toBe('high');
      expect(healthStatus.actionsTaken).toContain('garbage_collection_triggered');
      expect(healthStatus.actionsTaken).toContain('non_essential_processes_paused');

      // Verify system responds with reduced functionality
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'memory-test',
        userId: 'test-user-memory'
      });

      const response = await catalystService.processUserInput({
        sessionId,
        message: 'Explain complex topic with detailed examples',
        agentId: 'learning-agent-001'
      });

      expect(response.type).toBe('learning_explanation');
      expect(response.metadata.reducedFunctionality).toBe(true);
      expect(response.content.length).toBeLessThan(2000); // Reduced response size

      // Restore original memory usage
      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle CPU overload situations', async () => {
      // Mock high CPU usage
      healthMonitor.getCPUUsage = vi.fn().mockReturnValue(95); // 95% CPU usage

      const overloadResponse = await catalystService.processUserInput({
        sessionId: 'cpu-test-session',
        message: 'Process complex request',
        agentId: 'learning-agent-001'
      });

      expect(overloadResponse.metadata.cpuThrottled).toBe(true);
      expect(overloadResponse.metadata.requestQueued).toBe(true);
      expect(overloadResponse.metadata.processingPriority).toBe('low');
    });

    it('should manage concurrent request limits', async () => {
      // Set low concurrency limit for testing
      catalystService.setMaxConcurrentRequests(3);

      const sessionPromises = Array.from({ length: 10}, async (_, i) => {
        const sessionId = await catalystService.createSession({
          type: 'learning',
          conceptId: `concurrent-test-${i}`,
          userId: `user-${i}`
        });

        return catalystService.processUserInput({
          sessionId,
          message: `Request ${i}`,
          agentId: 'learning-agent-001'
        });
      });

      const responses = await Promise.allSettled(sessionPromises);
      const successfulResponses = responses.filter(r => r.status === 'fulfilled');
      const rateLimitedResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.metadata.rateLimited
      );

      expect(successfulResponses).toHaveLength(10); // All should complete eventually
      expect(rateLimitedResponses.length).toBeGreaterThan(0); // Some should be rate limited
      expect(rateLimitedResponses.every(r =>
        r.status === 'fulfilled' && r.value.metadata.retryAfter
      )).toBe(true);
    });
  });

  describe('Cascading Failure Prevention', () => {
    it('should prevent cascade failures from service dependencies', async () => {
      // Simulate multiple service failures
      langChainService.processMessage = vi.fn().mockRejectedValue(new Error('LangChain down'));
      databaseService.query = vi.fn().mockRejectedValue(new Error('Database down'));

      const agentRegistry = mockAgentRegistry();
      agentRegistry.getAgent = vi.fn().mockRejectedValue(new Error('Agent registry down'));

      catalystService.setDependencies({
        langChainService,
        databaseService,
        agentRegistry
      });

      const response = await catalystService.processUserInput({
        sessionId: 'cascade-test-session',
        message: 'Test request during multiple failures',
        agentId: 'learning-agent-001'
      });

      // Should prevent complete failure
      expect(response.type).toBe('degraded_response');
      expect(response.metadata.multipleFailures).toBe(true);
      expect(response.metadata.emergencyMode).toBe(true);
      expect(response.content).toContain('limited functionality');
    });

    it('should implement circuit breaker pattern correctly', async () => {
      const circuitBreaker = catalystService.getCircuitBreaker('langchain-service');

      // Mock repeated failures
      langChainService.processMessage = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await catalystService.processUserInput({
          sessionId: `circuit-test-${i}`,
          message: `Request ${i}`,
          agentId: 'learning-agent-001'
        });
      }

      // Circuit should be open
      expect(circuitBreaker.getState()).toBe('open');

      // Requests should fail fast without hitting the service
      const fastFailResponse = await catalystService.processUserInput({
        sessionId: 'fast-fail-test',
        message: 'Request when circuit is open',
        agentId: 'learning-agent-001'
      });

      expect(fastFailResponse.type).toBe('error');
      expect(fastFailResponse.metadata.circuitBreakerOpen).toBe(true);
      expect(fastFailResponse.metadata.serviceNotCalled).toBe(true);
      expect(fastFailResponse.metadata.responseTime).toBeLessThan(50); // Fast failure
    });

    it('should maintain core functionality during partial system degradation', async () => {
      // Disable non-essential services
      catalystService.setServiceAvailability('analytics-service', false);
      catalystService.setServiceAvailability('recommendation-service', false);

      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'core-functionality-test',
        userId: 'test-user-core'
      });

      const response = await catalystService.processUserInput({
        sessionId,
        message: 'Explain React components',
        agentId: 'learning-agent-001'
      });

      // Core learning functionality should work
      expect(response.type).toBe('learning_explanation');
      expect(response.content).toContain('React components');

      // But enhanced features should be disabled
      expect(response.metadata.analyticsDisabled).toBe(true);
      expect(response.metadata.recommendationsDisabled).toBe(true);
      expect(response.metadata.coreFeaturesActive).toBe(true);
    });
  });

  describe('Recovery and Healing Mechanisms', () => {
    it('should automatically attempt service recovery', async () => {
      const serviceHealth = {
        langchain: false,
        database: true,
        agents: false
      };

      // Mock health check
      healthMonitor.checkServiceHealth = vi.fn().mockResolvedValue(serviceHealth);

      // Trigger recovery process
      const recoveryResult = await errorRecoveryManager.attemptSystemRecovery();

      expect(recoveryResult.attempted).toBe(true);
      expect(recoveryResult.servicesRecoveryAttempted).toContain('langchain');
      expect(recoveryResult.servicesRecoveryAttempted).toContain('agents');
      expect(recoveryResult.recoveryStrategies).toContain('service_restart');
      expect(recoveryResult.recoveryStrategies).toContain('cache_warmup');
    });

    it('should preserve user state during service restarts', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'state-preservation-test',
        userId: 'test-user-state'
      });

      // Create some session state
      await catalystService.processUserInput({
        sessionId,
        message: 'First message',
        agentId: 'learning-agent-001'
      });

      // Simulate service restart
      await catalystService.restartService('learning-agent-001');

      // Verify state preservation
      const sessionState = await catalystService.getSessionState(sessionId);

      expect(sessionState.messageHistory).toHaveLength(1);
      expect(sessionState.messageHistory[0].content).toBe('First message');
      expect(sessionState.preservedDuringRestart).toBe(true);
      expect(sessionState.agentState).toBeDefined();
    });

    it('should provide user-friendly error messages and recovery options', async () => {
      // Simulate various error scenarios
      const errorScenarios = [
        {
          error: new Error('Network timeout'),
          expectedMessage: 'connection issue',
          expectedRecovery: 'retry'
        },
        {
          error: new Error('Service temporarily unavailable'),
          expectedMessage: 'temporarily unavailable',
          expectedRecovery: 'try_later'
        },
        {
          error: new Error('Rate limit exceeded'),
          expectedMessage: 'too many requests',
          expectedRecovery: 'wait_and_retry'
        }
      ];

      for (const scenario of errorScenarios) {
        const userFacingError = errorRecoveryManager.formatErrorForUser(scenario.error);

        expect(userFacingError.message).toContain(scenario.expectedMessage);
        expect(userFacingError.recoveryOptions).toContain(scenario.expectedRecovery);
        expect(userFacingError.estimatedRecoveryTime).toBeGreaterThan(0);
        expect(userFacingError.canRetry).toBe(true);
      }
    });
  });
});