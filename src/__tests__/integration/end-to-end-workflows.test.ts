/**
 * End-to-End Integration Tests
 *
 * Comprehensive integration tests validating complete user journeys
 * from UI to backend, including multi-agent orchestration and cross-process communication.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupIntegrationTest, cleanupIntegrationTest } from '../setup/integration-setup';
import {
  mockCatalystService,
  mockLangChainService,
  mockDatabaseService,
  mockElectronIPC
} from '../utils/mocks/mock-services';
import type { CatalystService, LangChainService } from '../types/services';

describe('End-to-End Integration Tests', () => {
  let catalystService: CatalystService;
  let langChainService: LangChainService;

  beforeEach(async () => {
    const testEnvironment = await setupIntegrationTest();
    catalystService = testEnvironment.catalystService;
    langChainService = testEnvironment.langChainService;
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Complete Learning Journey Workflow', () => {
    it('should handle complete learning session from start to mastery', async () => {
      // 1. User starts new learning session
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'react-hooks',
        userId: 'test-user-123'
      });

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);

      // 2. System selects appropriate agent (Learning Agent)
      const agentSelection = await catalystService.selectAgent({
        sessionId,
        userInput: 'I want to learn about React Hooks',
        context: { conceptId: 'react-hooks', userLevel: 'intermediate' }
      });

      expect(agentSelection.agentType).toBe('learning');
      expect(agentSelection.confidence).toBeGreaterThan(0.8);

      // 3. Agent processes request with LangChain integration
      const agentResponse = await catalystService.processUserInput({
        sessionId,
        message: 'What are React Hooks and how do they work?',
        agentId: agentSelection.agentId
      });

      expect(agentResponse).toBeDefined();
      expect(agentResponse.type).toBe('learning_explanation');
      expect(agentResponse.content).toContain('React Hooks');
      expect(agentResponse.metadata).toHaveProperty('tokensUsed');
      expect(agentResponse.metadata).toHaveProperty('modelUsed');

      // 4. System generates follow-up practice questions
      const practiceQuestions = await catalystService.generatePracticeQuestions({
        sessionId,
        concept: 'React Hooks',
        difficulty: 'intermediate',
        count: 3
      });

      expect(practiceQuestions).toHaveLength(3);
      expect(practiceQuestions[0]).toHaveProperty('question');
      expect(practiceQuestions[0]).toHaveProperty('options');
      expect(practiceQuestions[0]).toHaveProperty('correctAnswer');

      // 5. User answers questions and system evaluates
      const evaluation = await catalystService.evaluateAnswers({
        sessionId,
        answers: [
          { questionId: 'q1', answer: 'useState' },
          { questionId: 'q2', answer: 'useEffect' },
          { questionId: 'q3', answer: 'Both hooks and classes can be used' }
        ]
      });

      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.feedback).toBeDefined();
      expect(evaluation.masteryLevel).toBeGreaterThan(0.3);

      // 6. System updates mastery level and session progress
      const sessionProgress = await catalystService.updateSessionProgress({
        sessionId,
        masteryGained: evaluation.masteryLevel,
        timeSpent: 1200, // 20 minutes
        conceptsCovered: ['react-hooks', 'state-management', 'functional-components']
      });

      expect(sessionProgress.masteryLevel).toBeGreaterThan(0.3);
      expect(sessionProgress.totalTimeSpent).toBe(1200);
      expect(sessionProgress.completedConcepts).toContain('react-hooks');

      // 7. Session completion and analytics update
      const sessionSummary = await catalystService.completeSession({
        sessionId,
        finalMastery: sessionProgress.masteryLevel,
        userFeedback: 'Very helpful explanation!'
      });

      expect(sessionSummary.sessionId).toBe(sessionId);
      expect(sessionSummary.finalMastery).toBeGreaterThan(0.3);
      expect(sessionSummary.analyticsUpdated).toBe(true);
    });

    it('should handle multi-agent handoff during complex learning scenario', async () => {
      // 1. User starts with learning request
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'advanced-react-patterns',
        userId: 'test-user-456'
      });

      // 2. Learning agent handles initial explanation
      let agentResponse = await catalystService.processUserInput({
        sessionId,
        message: 'I need to understand advanced React patterns for performance optimization',
        agentId: 'learning-agent-001'
      });

      expect(agentResponse.type).toBe('learning_explanation');
      expect(agentResponse.content).toContain('React patterns');

      // 3. User asks for practice - triggers handoff to Practice Agent
      const handoffDecision = await catalystService.evaluateAgentHandoff({
        sessionId,
        currentAgentId: 'learning-agent-001',
        userInput: 'Can you give me some coding exercises for these patterns?',
        context: agentResponse.metadata
      });

      expect(handoffDecision.shouldHandoff).toBe(true);
      expect(handoffDecision.targetAgentType).toBe('practice');

      // 4. Practice Agent takes over with context preservation
      const practiceAgentResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Can you give me some coding exercises for these patterns?',
        agentId: handoffDecision.targetAgentId
      });

      expect(practiceAgentResponse.type).toBe('practice_exercise');
      expect(practiceAgentResponse.content).toHaveProperty('exerciseDescription');
      expect(practiceAgentResponse.content).toHaveProperty('starterCode');
      expect(practiceAgentResponse.metadata).toHaveProperty('preservedContext');

      // 5. User struggles with exercise - triggers Tutoring Agent handoff
      const tutoringHandoff = await catalystService.evaluateAgentHandoff({
        sessionId,
        currentAgentId: 'practice-agent-001',
        userInput: 'I\'m stuck on this exercise, can you help me step by step?',
        context: practiceAgentResponse.metadata
      });

      expect(tutoringHandoff.shouldHandoff).toBe(true);
      expect(tutoringHandoff.targetAgentType).toBe('tutoring');

      // 6. Tutoring Agent provides step-by-step guidance
      const tutoringResponse = await catalystService.processUserInput({
        sessionId,
        message: 'I\'m stuck on this exercise, can you help me step by step?',
        agentId: tutoringHandoff.targetAgentId
      });

      expect(tutoringResponse.type).toBe('tutoring_guidance');
      expect(tutoringResponse.content).toHaveProperty('stepByStepInstructions');
      expect(tutoringResponse.content).toHaveProperty('hints');
      expect(tutoringResponse.metadata).toHaveProperty('fullHandoffChain');
    });
  });

  describe('Cross-Process Communication Integration', () => {
    it('should handle seamless renderer-main communication', async () => {
      // Simulate renderer process request
      const rendererRequest = {
        id: 'req-001',
        type: 'catalyst:process-input',
        payload: {
          message: 'Explain useCallback optimization',
          sessionId: 'session-main-001',
          context: { conceptId: 'use-callback', userLevel: 'advanced' }
        }
      };

      // Main process handles request through IPC
      const mainProcessResponse = await mockElectronIPC.invoke('catalyst:process-input', rendererRequest.payload);

      expect(mainProcessResponse).toBeDefined();
      expect(mainProcessResponse.success).toBe(true);
      expect(mainProcessResponse.result.type).toBe('learning_explanation');
      expect(mainProcessResponse.result.content).toContain('useCallback');

      // Verify streaming support for long responses
      const streamingRequest = {
        id: 'req-002',
        type: 'catalyst:stream-response',
        payload: {
          message: 'Give me a comprehensive guide to React performance optimization',
          sessionId: 'session-main-002'
        }
      };

      const streamChunks = [];
      const streamResponse = await mockElectronIPC.invoke('catalyst:stream-response', streamingRequest.payload);

      // Mock streaming response chunks
      for await (const chunk of streamResponse.chunks) {
        streamChunks.push(chunk);
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('chunkIndex');
      }

      expect(streamChunks.length).toBeGreaterThan(5);
      expect(streamChunks[0].content).toContain('React performance');
    });

    it('should handle real-time streaming with MessageChannelMain', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'complex-topic',
        userId: 'test-user-streaming'
      });

      // Start streaming session
      const streamingSession = await catalystService.startStreamingSession({
        sessionId,
        message: 'Provide a detailed explanation of microservices architecture with real-world examples',
        options: {
          chunkSize: 200,
          maxTokens: 1000,
          includeMetadata: true
        }
      });

      expect(streamingSession.streamId).toBeDefined();
      expect(streamingSession.estimatedChunks).toBeGreaterThan(3);

      // Simulate receiving stream chunks
      const receivedChunks = [];
      const streamComplete = new Promise((resolve) => {
        streamingSession.on('chunk', (chunk) => {
          receivedChunks.push(chunk);
        });
        streamingSession.on('end', resolve);
      });

      // Mock chunk reception
      setTimeout(() => {
        streamingSession.emit('chunk', {
          index: 0,
          content: 'Microservices architecture is an approach...',
          metadata: { tokens: 15, model: 'gpt-4' }
        });
      }, 10);

      setTimeout(() => {
        streamingSession.emit('chunk', {
          index: 1,
          content: 'where a single application is composed of...',
          metadata: { tokens: 12, model: 'gpt-4' }
        });
      }, 20);

      setTimeout(() => {
        streamingSession.emit('end', {
          totalChunks: 2,
          totalTokens: 27,
          sessionId: sessionId
        });
      }, 30);

      await streamComplete;

      expect(receivedChunks).toHaveLength(2);
      expect(receivedChunks[0].content).toContain('Microservices architecture');
      expect(receivedChunks[1].content).toContain('composed of');
    });
  });

  describe('Database Integration and Persistence', () => {
    it('should maintain data consistency across agent transitions', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'data-consistency-test',
        userId: 'test-user-consistency'
      });

      // 1. Learning Agent creates initial data
      const learningResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Teach me about database transactions',
        agentId: 'learning-agent-001'
      });

      // 2. Verify data persistence
      const sessionData = await catalystService.getSessionData(sessionId);
      expect(sessionData.agentsInvolved).toContain('learning-agent-001');
      expect(sessionData.conceptsDiscussed).toContain('database-transactions');
      expect(sessionData.totalTokensUsed).toBeGreaterThan(0);

      // 3. Handoff to Assessment Agent
      const assessmentResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Test my knowledge of transactions',
        agentId: 'assessment-agent-001'
      });

      // 4. Verify session continuity and data accumulation
      const updatedSessionData = await catalystService.getSessionData(sessionId);
      expect(updatedSessionData.agentsInvolved).toContain('assessment-agent-001');
      expect(updatedSessionData.totalTokensUsed).toBeGreaterThan(sessionData.totalTokensUsed);
      expect(updatedSessionData.agentHandoffs).toHaveLength(1);
      expect(updatedSessionData.agentHandoffs[0]).toMatchObject({
        fromAgent: 'learning-agent-001',
        toAgent: 'assessment-agent-001',
        reason: expect.stringContaining('assessment'),
        timestamp: expect.any(String)
      });

      // 5. Verify checkpoint creation
      const checkpoints = await catalystService.getSessionCheckpoints(sessionId);
      expect(checkpoints).toHaveLength(2); // One after each agent interaction
      expect(checkpoints[0]).toHaveProperty('agentState');
      expect(checkpoints[0]).toHaveProperty('contextData');
    });

    it('should handle session restoration after restart', async () => {
      // Create a complex session with multiple agent interactions
      const originalSessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'session-restoration-test',
        userId: 'test-user-restoration'
      });

      // Simulate multiple interactions
      await catalystService.processUserInput({
        sessionId: originalSessionId,
        message: 'I want to learn about system design',
        agentId: 'learning-agent-001'
      });

      await catalystService.processUserInput({
        sessionId: originalSessionId,
        message: 'Give me practice problems',
        agentId: 'practice-agent-001'
      });

      // Simulate application restart by creating new service instance
      const restartedCatalystService = mockCatalystService();
      await restartedCatalystService.initialize();

      // Restore session from checkpoint
      const restoredSession = await restartedCatalystService.restoreSession(originalSessionId);

      expect(restoredSession.sessionId).toBe(originalSessionId);
      expect(restoredSession.currentContext).toBeDefined();
      expect(restoredSession.agentHistory).toHaveLength(2);
      expect(restoredSession.lastCheckpoint).toBeDefined();

      // Continue session seamlessly
      const continuedResponse = await restartedCatalystService.processUserInput({
        sessionId: originalSessionId,
        message: 'Continue with the next practice problem',
        agentId: 'practice-agent-001'
      });

      expect(continuedResponse.type).toBe('practice_exercise');
      expect(continuedResponse.metadata).toHaveProperty('sessionRestored', true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle LangChain service failures gracefully', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'error-handling-test',
        userId: 'test-user-errors'
      });

      // Mock LangChain service failure
      langChainService.processMessage = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));

      const response = await catalystService.processUserInput({
        sessionId,
        message: 'Explain quantum computing',
        agentId: 'learning-agent-001'
      });

      expect(response.type).toBe('error');
      expect(response.content).toContain(' temporarily unavailable');
      expect(response.metadata).toHaveProperty('retryAfter');
      expect(response.metadata).toHaveProperty('errorId');

      // Verify fallback behavior
      const fallbackResponse = await catalystService.processUserInput({
        sessionId,
        message: 'Try a simpler explanation',
        agentId: 'learning-agent-001'
      });

      expect(fallbackResponse.type).toBe('cached_response');
      expect(fallbackResponse.content).toBeDefined();
    });

    it('should handle database connection failures', async () => {
      // Mock database failure
      mockDatabaseService.query = vi.fn().mockRejectedValue(new Error('Database connection lost'));

      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'db-error-test',
        userId: 'test-user-db-errors'
      });

      // Should switch to offline mode
      const response = await catalystService.processUserInput({
        sessionId,
        message: 'What is machine learning?',
        agentId: 'learning-agent-001'
      });

      expect(response.type).toBe('learning_explanation');
      expect(response.metadata).toHaveProperty('offlineMode', true);
      expect(response.metadata).toHaveProperty('dataPersisted', false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent sessions efficiently', async () => {
      const sessionPromises = [];
      const concurrentUsers = 50;

      // Create multiple concurrent sessions
      for (let i = 0; i < concurrentUsers; i++) {
        sessionPromises.push(
          catalystService.createSession({
            type: 'learning',
            conceptId: 'concurrent-test',
            userId: `user-${i}`
          }).then(sessionId =>
            catalystService.processUserInput({
              sessionId,
              message: `User ${i} wants to learn about React`,
              agentId: 'learning-agent-001'
            })
          )
        );
      }

      // Measure performance
      const startTime = Date.now();
      const responses = await Promise.all(sessionPromises);
      const endTime = Date.now();

      // Verify all requests completed successfully
      expect(responses).toHaveLength(concurrentUsers);
      responses.forEach(response => {
        expect(response.type).toBe('learning_explanation');
        expect(response.content).toContain('React');
      });

      // Performance assertions
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(totalTime / concurrentUsers).toBeLessThan(100); // Average <100ms per request
    });

    it('should maintain memory efficiency during streaming', async () => {
      const sessionId = await catalystService.createSession({
        type: 'learning',
        conceptId: 'memory-efficiency-test',
        userId: 'test-user-memory'
      });

      // Start a long streaming session
      const streamingSession = await catalystService.startStreamingSession({
        sessionId,
        message: 'Provide an extensive guide covering all major topics in computer science',
        options: {
          chunkSize: 100,
          maxTokens: 2000
        }
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate receiving many chunks
      for (let i = 0; i < 50; i++) {
        streamingSession.emit('chunk', {
          index: i,
          content: `Chunk ${i}: Educational content about computer science...`.repeat(10),
          metadata: { tokens: 20 }
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase excessively (allowing for reasonable usage)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });
});