/**
 * Handoff Orchestration Test Suite
 *
 * Comprehensive test suite for Handoff orchestration pattern covering
 * agent selection, context transfer, handoff triggers, conversation flow,
 * and seamless multi-agent collaboration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HandoffOrchestrator } from '@/services/orchestration/handoff-orchestrator';
import { AgentType } from '@/services/AgentManager';
import type { Agent, HandoffContext, HandoffDecision } from '@/services/orchestration/types';
import { createMockLogger, createMockDatabase, createMockAsyncLocalStorage } from '@/test/mocks';

// Mock agents for testing
const mockAgents: Agent[] = [
  {
    id: 'learning-agent',
    type: AgentType.LEARNING,
    name: 'Learning Assistant',
    capabilities: ['concept-explanation', 'knowledge-building'],
    specializations: ['educational-content', 'concept-analysis'],
    status: 'active',
    config: {
      handoffTriggers: ['assessment-needed', 'practice-request'],
      maxTurns: 5
    }
  },
  {
    id: 'assessment-agent',
    type: AgentType.ASSESSMENT,
    name: 'Assessment Assistant',
    capabilities: ['quiz-generation', 'evaluation', 'feedback'],
    specializations: ['testing', 'evaluation', 'progress-tracking'],
    status: 'active',
    config: {
      handoffTriggers: ['learning-needed', 'remediation-required'],
      maxTurns: 3
    }
  },
  {
    id: 'tutoring-agent',
    type: AgentType.TUTORING,
    name: 'Tutoring Assistant',
    capabilities: ['personalized-guidance', 'socratic-questioning'],
    specializations: ['one-on-one-help', 'step-by-step-guidance'],
    status: 'active',
    config: {
      handoffTriggers: ['complex-topic', 'research-needed'],
      maxTurns: 10
    }
  },
  {
    id: 'practice-agent',
    type: AgentType.PRACTICE,
    name: 'Practice Assistant',
    capabilities: ['exercise-generation', 'interactive-problems'],
    specializations: ['hands-on-learning', 'skill-practice'],
    status: 'active',
    config: {
      handoffTriggers: ['theory-needed', 'assessment-desired'],
      maxTurns: 8
    }
  }
];

describe('HandoffOrchestrator', () => {
  let orchestrator: HandoffOrchestrator;
  let mockDb: any;
  let mockLogger: any;
  let mockAls: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup comprehensive mocks
    mockDb = createMockDatabase();
    mockLogger = createMockLogger();
    mockAls = createMockAsyncLocalStorage();

    // Create HandoffOrchestrator instance
    orchestrator = new HandoffOrchestrator(
      mockDb,
      mockLogger,
      mockAls
    );

    // Setup default mock behaviors
    mockDb.transaction.mockImplementation(async (fn) => {
      return fn(mockDb);
    });

    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (orchestrator) {
      await orchestrator.dispose();
    }
  });

  describe('Handoff Decision Making', () => {
    it('should recommend handoff based on user intent', async () => {
      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'Can you explain neural networks?' },
          { role: 'assistant', content: 'Neural networks are computing systems inspired by biological neural networks...' },
          { role: 'user', content: 'Great! Now can you give me a quiz to test my understanding?' }
        ],
        userIntent: 'assessment-request',
        sessionContext: {
          sessionId: 'session-123',
          userLevel: 'intermediate',
          topic: 'neural-networks'
        },
        agentCapabilities: ['concept-explanation', 'knowledge-building']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(true);
      expect(decision.targetAgent).toBe('assessment-agent');
      expect(decision.reason).toContain('assessment request');
      expect(decision.confidence).toBeGreaterThan(0.7);

      expect(mockLogger.info).toHaveBeenCalledWith('Handoff decision made', {
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        reason: expect.stringContaining('assessment'),
        confidence: expect.any(Number)
      });
    });

    it('should recommend handoff for topic complexity changes', async () => {
      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'What is machine learning?' },
          { role: 'assistant', content: 'Machine learning is a subset of AI...' },
          { role: 'user', content: 'This is getting complex. Can you break it down step by step?' }
        ],
        userIntent: 'need-simpler-explanation',
        sessionContext: {
          sessionId: 'session-456',
          userLevel: 'beginner',
          complexity: 'high'
        },
        agentCapabilities: ['concept-explanation']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(true);
      expect(decision.targetAgent).toBe('tutoring-agent');
      expect(decision.reason).toContain('complex topic');
      expect(decision.contextTransfer).toBeDefined();
    });

    it('should recommend no handoff for current agent capability', async () => {
      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'Explain supervised learning' },
          { role: 'assistant', content: 'Supervised learning is a type of machine learning...' },
          { role: 'user', content: 'Can you give me another example?' }
        ],
        userIntent: 'continue-explanation',
        sessionContext: {
          sessionId: 'session-789',
          topic: 'supervised-learning'
        },
        agentCapabilities: ['concept-explanation', 'knowledge-building']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(false);
      expect(decision.reason).toContain('within current agent capabilities');
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should handle multiple potential handoff targets', async () => {
      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'I want to learn Python and practice with exercises' },
          { role: 'assistant', content: 'Python is a great programming language for beginners...' },
          { role: 'user', content: 'Can you create some practice problems for me?' }
        ],
        userIntent: 'practice-request',
        sessionContext: {
          sessionId: 'session-101',
          userLevel: 'beginner',
          topic: 'python-programming'
        },
        agentCapabilities: ['concept-explanation']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(true);
      // Both practice-agent and tutoring-agent could be suitable
      expect(['practice-agent', 'tutoring-agent']).toContain(decision.targetAgent!);
      expect(decision.alternativeTargets).toBeDefined();
      expect(decision.alternativeTargets!.length).toBeGreaterThan(0);
    });

    it('should consider conversation history in handoff decisions', async () => {
      const context: HandoffContext = {
        currentAgent: 'assessment-agent',
        conversation: [
          { role: 'user', content: 'I failed the quiz questions about neural networks' },
          { role: 'assistant', content: 'I see you had difficulty with the neural network questions.' },
          { role: 'user', content: 'Can you explain the concepts again before I retry?' },
          { role: 'assistant', content: 'Of course! Let me help you understand better.' },
          { role: 'user', content: 'I think I need more fundamental explanations' }
        ],
        userIntent: 'remediation-required',
        sessionContext: {
          sessionId: 'session-202',
          previousAttempts: 2,
          performance: 'below-average'
        },
        agentCapabilities: ['evaluation', 'feedback']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(true);
      expect(decision.targetAgent).toBe('learning-agent');
      expect(decision.reason).toContain('remediation needed');
      expect(decision.contextTransfer).toHaveProperty('performanceHistory');
    });

    it('should handle ambiguous user intent', async () => {
      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'Help me with this' }
        ],
        userIntent: 'ambiguous',
        sessionContext: {
          sessionId: 'session-303'
        },
        agentCapabilities: ['concept-explanation']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents);

      expect(decision.shouldHandoff).toBe(false);
      expect(decision.reason).toContain('ambiguous intent');
      expect(decision.suggestedActions).toBeDefined();
      expect(decision.suggestedActions).toContain('clarify-user-intent');
    });
  });

  describe('Context Transfer', () => {
    it('should transfer context between agents seamlessly', async () => {
      const handoffContext: HandoffContext = {
        currentAgent: 'learning-agent',
        targetAgent: 'assessment-agent',
        conversation: [
          { role: 'user', content: 'Explain linear regression' },
          { role: 'assistant', content: 'Linear regression is a statistical method...' }
        ],
        sessionContext: {
          sessionId: 'session-404',
          userLevel: 'intermediate',
          topic: 'linear-regression',
          learningObjectives: ['understand-concept', 'apply-formula']
        },
        agentCapabilities: ['concept-explanation']
      };

      const transferredContext = await orchestrator.transferContext(handoffContext);

      expect(transferredContext).toBeDefined();
      expect(transferredContext.fromAgent).toBe('learning-agent');
      expect(transferredContext.toAgent).toBe('assessment-agent');
      expect(transferredContext.conversationSummary).toBeDefined();
      expect(transferredContext.keyConcepts).toContain('linear regression');
      expect(transferredContext.userProgress).toBeDefined();
      expect(transferredContext.handoffReason).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Context transferred successfully', {
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        conceptsTransferred: expect.any(Number)
      });
    });

    it('should preserve conversation flow during handoff', async () => {
      const handoffContext: HandoffContext = {
        currentAgent: 'assessment-agent',
        targetAgent: 'tutoring-agent',
        conversation: [
          { role: 'user', content: 'I got 60% on the quiz' },
          { role: 'assistant', content: 'You got 60% correct. Let me help you improve.' },
          { role: 'user', content: 'I struggled with questions 3 and 5' }
        ],
        sessionContext: {
          sessionId: 'session-505',
          recentPerformance: { score: 60, totalQuestions: 5 },
          weakAreas: ['question-3', 'question-5']
        },
        agentCapabilities: ['evaluation']
      };

      const transferredContext = await orchestrator.transferContext(handoffContext);

      expect(transferredContext.conversationFlow).toBeDefined();
      expect(transferredContext.conversationFlow.turnCount).toBe(3);
      expect(transferredContext.conversationFlow.lastUserNeed).toContain('struggled');
      expect(transferredContext.conversationFlow.contextContinuity).toBe(true);

      expect(mockLogger.debug).toHaveBeenCalledWith('Conversation flow preserved', {
        turnCount: 3,
        contextContinuity: true
      });
    });

    it('should summarize long conversations efficiently', async () => {
      const longConversation = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} about machine learning concepts and practices`
      }));

      const handoffContext: HandoffContext = {
        currentAgent: 'learning-agent',
        targetAgent: 'practice-agent',
        conversation: longConversation,
        sessionContext: {
          sessionId: 'session-606'
        },
        agentCapabilities: ['concept-explanation']
      };

      const transferredContext = await orchestrator.transferContext(handoffContext, {
        summarizeLongConversations: true,
        maxConversationLength: 10
      });

      expect(transferredContext.conversationSummary).toBeDefined();
      expect(transferredContext.conversationSummary.type).toBe('abridged');
      expect(transferredContext.conversationSummary.originalLength).toBe(20);
      expect(transferredContext.conversationSummary.summarizedLength).toBeLessThanOrEqual(10);
      expect(transferredContext.conversationSummary.keyPoints).toBeDefined();
    });

    it('should handle incomplete or corrupted context', async () => {
      const incompleteContext: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: null as any }, // Invalid message
          { role: 'assistant', content: 'Valid response' }
        ],
        sessionContext: {
          sessionId: 'session-707'
        },
        agentCapabilities: ['concept-explanation']
      };

      const transferredContext = await orchestrator.transferContext(incompleteContext);

      expect(transferredContext).toBeDefined();
      expect(transferredContext.warnings).toBeDefined();
      expect(transferredContext.warnings.length).toBeGreaterThan(0);
      expect(transferredContext.warnings[0]).toContain('invalid message');

      expect(mockLogger.warn).toHaveBeenCalledWith('Context transfer warnings detected', {
        warningCount: expect.any(Number)
      });
    });
  });

  describe('Handoff Execution', () => {
    it('should execute smooth handoff between agents', async () => {
      const handoffRequest = {
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        reason: 'user-requested-assessment',
        context: {
          conversation: [
            { role: 'user', content: 'I understand neural networks now' },
            { role: 'assistant', content: 'Great! Would you like to test your understanding?' }
          ],
          sessionContext: {
            sessionId: 'session-808',
            topic: 'neural-networks',
            userLevel: 'intermediate'
          }
        }
      };

      const handoffResult = await orchestrator.executeHandoff(handoffRequest, mockAgents);

      expect(handoffResult.success).toBe(true);
      expect(handoffResult.newAgentId).toBe('assessment-agent');
      expect(handoffResult.handoffId).toBeDefined();
      expect(handoffResult.transitionTime).toBeGreaterThan(0);
      expect(handoffResult.contextIntegrity).toBe(true);
      expect(handoffResult.userNotification).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Handoff executed successfully', {
        handoffId: handoffResult.handoffId,
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        transitionTime: handoffResult.transitionTime
      });
    });

    it('should handle handoff failure gracefully', async () => {
      const handoffRequest = {
        fromAgent: 'learning-agent',
        toAgent: 'non-existent-agent',
        reason: 'test-failure',
        context: {
          conversation: [],
          sessionContext: { sessionId: 'session-909' }
        }
      };

      const handoffResult = await orchestrator.executeHandoff(handoffRequest, mockAgents);

      expect(handoffResult.success).toBe(false);
      expect(handoffResult.error).toContain('Target agent not found');
      expect(handoffResult.rollbackAttempted).toBe(true);

      expect(mockLogger.error).toHaveBeenCalledWith('Handoff execution failed', {
        fromAgent: 'learning-agent',
        toAgent: 'non-existent-agent',
        error: expect.any(String)
      });
    });

    it('should maintain user experience during handoff', async () => {
      const handoffRequest = {
        fromAgent: 'tutoring-agent',
        toAgent: 'practice-agent',
        reason: 'practice-needed',
        context: {
          conversation: [
            { role: 'user', content: 'I understand the theory now' },
            { role: 'assistant', content: 'Perfect! Let\'s move to some practice exercises.' }
          ],
          sessionContext: {
            sessionId: 'session-1010',
            userPreference: 'hands-on-learning'
          }
        }
      };

      const handoffResult = await orchestrator.executeHandoff(handoffRequest, mockAgents, {
        preserveUserExperience: true,
        seamlessTransition: true
      });

      expect(handoffResult.success).toBe(true);
      expect(handoffResult.userExperience).toBeDefined();
      expect(handoffResult.userExperience.transitionType).toBe('seamless');
      expect(handoffResult.userExperience.interruptionLevel).toBe('minimal');
      expect(handoffResult.userExperience.contextPreservation).toBe(true);

      // Verify user notification is appropriate
      expect(handoffResult.userNotification.message).toContain('practice exercises');
      expect(handoffResult.userNotification.type).toBe('handoff-announcement');
    });

    it('should handle concurrent handoffs gracefully', async () => {
      const handoffRequests = [
        {
          fromAgent: 'learning-agent',
          toAgent: 'assessment-agent',
          reason: 'assessment-needed',
          context: { conversation: [], sessionContext: { sessionId: 'session-1111' } }
        },
        {
          fromAgent: 'practice-agent',
          toAgent: 'tutoring-agent',
          reason: 'help-needed',
          context: { conversation: [], sessionContext: { sessionId: 'session-1212' } }
        }
      ];

      const startTime = performance.now();
      const handoffResults = await Promise.all(
        handoffRequests.map(request => orchestrator.executeHandoff(request, mockAgents))
      );
      const duration = performance.now() - startTime;

      expect(handoffResults).toHaveLength(2);
      expect(handoffResults.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify no conflicts occurred
      expect(handoffResults[0].handoffId).not.toBe(handoffResults[1].handoffId);
    });

    it('should support emergency handoffs', async () => {
      const emergencyHandoff = {
        fromAgent: 'learning-agent',
        toAgent: 'tutoring-agent',
        reason: 'user-confusion',
        priority: 'emergency',
        context: {
          conversation: [
            { role: 'user', content: 'I\'m completely lost, this is too confusing' },
            { role: 'assistant', content: 'I understand this can be overwhelming...' }
          ],
          sessionContext: {
            sessionId: 'session-1313',
            userState: 'confused',
            urgency: 'high'
          }
        }
      };

      const handoffResult = await orchestrator.executeHandoff(emergencyHandoff, mockAgents);

      expect(handoffResult.success).toBe(true);
      expect(handoffResult.priority).toBe('emergency');
      expect(handoffResult.transitionTime).toBeLessThan(500); // Should be very fast
      expect(handoffResult.escalationTriggered).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith('Emergency handoff executed', {
        handoffId: handoffResult.handoffId,
        priority: 'emergency',
        transitionTime: handoffResult.transitionTime
      });
    });
  });

  describe('Multi-Agent Conversation Flow', () => {
    it('should manage conversation across multiple agents', async () => {
      const conversationFlow = [
        {
          agent: 'learning-agent',
          message: 'Let me explain machine learning concepts.',
          turn: 1
        },
        {
          userMessage: 'Can you test my understanding?',
          intent: 'assessment-request',
          turn: 2
        },
        {
          agent: 'assessment-agent',
          message: 'I\'ll create a quiz for you.',
          turn: 3
        },
        {
          userMessage: 'I got some questions wrong. Can you help?',
          intent: 'remediation-request',
          turn: 4
        },
        {
          agent: 'tutoring-agent',
          message: 'Let\'s go through the difficult concepts step by step.',
          turn: 5
        }
      ];

      const managedFlow = await orchestrator.manageMultiAgentFlow(conversationFlow, mockAgents, {
        sessionId: 'session-1414'
      });

      expect(managedFlow.success).toBe(true);
      expect(managedFlow.agentTransitions).toHaveLength(2); // learning->assessment, assessment->tutoring
      expect(managedFlow.conversationContinuity).toBe(true);
      expect(managedFlow.contextIntegrity).toBe(true);
      expect(managedFlow.userSatisfaction).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Multi-agent flow completed', {
        sessionId: 'session-1414',
        agentTransitions: 2,
        totalTurns: 5,
        duration: expect.any(Number)
      });
    });

    it('should detect and resolve handoff conflicts', async () => {
      const conflictingFlow = [
        {
          agent: 'learning-agent',
          message: 'Explaining concepts...',
          turn: 1
        },
        {
          userMessage: 'I need both practice and assessment',
          intent: 'combined-request',
          turn: 2
        }
      ];

      const resolvedFlow = await orchestrator.manageMultiAgentFlow(conflictingFlow, mockAgents, {
        conflictResolution: 'prioritize-user-intent',
        sessionId: 'session-1515'
      });

      expect(resolvedFlow.success).toBe(true);
      expect(resolvedFlow.conflicts).toBeDefined();
      expect(resolvedFlow.conflicts.length).toBe(1);
      expect(resolvedFlow.conflictResolution).toBeDefined();
      expect(resolvedFlow.conflictResolution.strategy).toBe('prioritize-user-intent');

      // Should have selected appropriate agent(s)
      expect(['practice-agent', 'assessment-agent']).toContain(resolvedFlow.currentAgent);
    });

    it('should maintain conversation state across handoffs', async () => {
      const sessionState = {
        sessionId: 'session-1616',
        userId: 'user-123',
        topic: 'python-basics',
        progress: {
          conceptsCovered: ['variables', 'data-types'],
          currentLevel: 'beginner',
          timeSpent: 1800000 // 30 minutes
        },
        preferences: {
          learningStyle: 'visual',
          pace: 'moderate'
        }
      };

      const handoffChain = [
        {
          from: 'learning-agent',
          to: 'practice-agent',
          reason: 'practice-needed'
        },
        {
          from: 'practice-agent',
          to: 'assessment-agent',
          reason: 'evaluate-progress'
        }
      ];

      const finalState = await orchestrator.executeHandoffChain(handoffChain, sessionState, mockAgents);

      expect(finalState.success).toBe(true);
      expect(finalState.sessionState).toBeDefined();
      expect(finalState.sessionState.progress).toBeDefined();
      expect(finalState.sessionState.progress.conceptsCovered.length).toBeGreaterThan(2);
      expect(finalState.stateTransitions).toHaveLength(2);
      expect(finalState.stateIntegrity).toBe(true);

      expect(mockLogger.info).toHaveBeenCalledWith('Handoff chain completed', {
        sessionId: 'session-1616',
        handoffCount: 2,
        stateIntegrity: true
      });
    });

    it('should provide intelligent agent recommendations', async () => {
      const currentContext = {
        userMessage: 'I want to understand deep learning and then practice with some coding exercises',
        sessionHistory: [
          { agent: 'learning-agent', topic: 'machine-learning-basics', duration: 1200000 },
          { agent: 'assessment-agent', topic: 'ml-quiz', duration: 600000 }
        ],
        userPreferences: {
          prefersHandsOn: true,
          learnsByDoing: true
        }
      };

      const recommendations = await orchestrator.recommendNextAgents(currentContext, mockAgents);

      expect(recommendations).toBeDefined();
      expect(recommendations.primary).toBeDefined();
      expect(recommendations.alternatives).toBeDefined();
      expect(recommendations.reasoning).toBeDefined();

      // Should recommend learning-agent for deep learning concepts first
      expect(recommendations.primary.agent).toBe('learning-agent');
      expect(recommendations.primary.reason).toContain('deep learning concepts');

      // Should suggest practice-agent as follow-up
      expect(recommendations.alternatives.some(a => a.agent === 'practice-agent')).toBe(true);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should monitor handoff performance metrics', async () => {
      const handoffRequest = {
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        reason: 'assessment-needed',
        context: {
          conversation: [],
          sessionContext: { sessionId: 'session-1717' }
        }
      };

      const startTime = performance.now();
      const handoffResult = await orchestrator.executeHandoff(handoffRequest, mockAgents);
      const duration = performance.now() - startTime;

      expect(handoffResult.success).toBe(true);
      expect(handoffResult.performanceMetrics).toBeDefined();
      expect(handoffResult.performanceMetrics.handoffDuration).toBeGreaterThan(0);
      expect(handoffResult.performanceMetrics.contextTransferTime).toBeGreaterThan(0);
      expect(handoffResult.performanceMetrics.agentSwitchTime).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      expect(mockLogger.info).toHaveBeenCalledWith('Handoff performance metrics recorded', {
        handoffId: handoffResult.handoffId,
        totalDuration: duration,
        contextTransferTime: handoffResult.performanceMetrics.contextTransferTime
      });
    });

    it('should track handoff success rates', async () => {
      const handoffs = Array.from({ length: 10 }, (_, i) => ({
        fromAgent: i % 2 === 0 ? 'learning-agent' : 'practice-agent',
        toAgent: i % 2 === 0 ? 'assessment-agent' : 'tutoring-agent',
        reason: 'test-handoff',
        context: {
          conversation: [],
          sessionContext: { sessionId: `session-${i}` }
        }
      }));

      const results = await Promise.all(
        handoffs.map(handoff => orchestrator.executeHandoff(handoff, mockAgents))
      );

      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / results.length;

      expect(successRate).toBeGreaterThan(0.9); // Should have high success rate

      const metrics = await orchestrator.getHandoffMetrics();

      expect(metrics.totalHandoffs).toBe(10);
      expect(metrics.successRate).toBe(successRate);
      expect(metrics.averageHandoffTime).toBeGreaterThan(0);
      expect(metrics.agentTransitionCounts).toBeDefined();
    });

    it('should optimize handoff decisions based on historical data', async () => {
      // Simulate historical handoff data
      await orchestrator.recordHandoffHistory([
        {
          fromAgent: 'learning-agent',
          toAgent: 'assessment-agent',
          success: true,
          userSatisfaction: 4.5,
          context: { topic: 'machine-learning' }
        },
        {
          fromAgent: 'learning-agent',
          toAgent: 'practice-agent',
          success: true,
          userSatisfaction: 4.8,
          context: { topic: 'python-programming' }
        }
      ]);

      const context: HandoffContext = {
        currentAgent: 'learning-agent',
        conversation: [
          { role: 'user', content: 'I want to practice Python programming' }
        ],
        userIntent: 'practice-request',
        sessionContext: {
          sessionId: 'session-1818',
          topic: 'python-programming'
        },
        agentCapabilities: ['concept-explanation']
      };

      const decision = await orchestrator.evaluateHandoffNeed(context, mockAgents, {
        useHistoricalData: true
      });

      expect(decision.shouldHandoff).toBe(true);
      // Should prefer practice-agent based on historical success
      expect(decision.targetAgent).toBe('practice-agent');
      expect(decision.historicalConfidence).toBeGreaterThan(0.8);
    });

    it('should handle high-volume handoff scenarios', async () => {
      const highVolumeHandoffs = Array.from({ length: 50 }, (_, i) => ({
        fromAgent: 'learning-agent',
        toAgent: 'assessment-agent',
        reason: 'load-test',
        context: {
          conversation: [],
          sessionContext: { sessionId: `load-test-${i}` }
        }
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        highVolumeHandoffs.map(handoff => orchestrator.executeHandoff(handoff, mockAgents))
      );
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const averageTime = duration / 50;
      expect(averageTime).toBeLessThan(100); // Average < 100ms per handoff

      expect(mockLogger.info).toHaveBeenCalledWith('High volume handoff test completed', {
        totalHandoffs: 50,
        totalDuration: duration,
        averageTime: averageTime
      });
    });
  });
});