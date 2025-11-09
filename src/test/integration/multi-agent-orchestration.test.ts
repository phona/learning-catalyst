/**
 * Multi-Agent Orchestration Integration Tests
 *
 * Tests for complex multi-agent interactions, handoffs, and orchestration patterns
 * including Tool Calling, Handoff, and Hybrid agents.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupIntegrationTest, cleanupIntegrationTest } from '../setup/integration-setup';
import {
  mockToolCallingAgent,
  mockHandoffAgent,
  mockHybridAgent,
  mockLearningAgent,
  mockPracticeAgent,
  mockAssessmentAgent,
  mockTutoringAgent
} from '../utils/mocks/mock-agents';
import type { AgentOrchestrator, AgentSession } from '../types/agents';

describe('Multi-Agent Orchestration Integration Tests', () => {
  let orchestrator: AgentOrchestrator;
  let session: AgentSession;

  beforeEach(async () => {
    const testEnvironment = await setupIntegrationTest();
    orchestrator = testEnvironment.agentOrchestrator;
    session = await orchestrator.createSession({
      userId: 'test-user-multi-agent',
      initialContext: {
        expertiseLevel: 'intermediate',
        learningGoals: ['react-mastery', 'performance-optimization']
      }
    });
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Tool Calling Agent Integration', () => {
    it('should execute multi-tool workflows with dependency resolution', async () => {
      const toolCallingAgent = mockToolCallingAgent();
      await orchestrator.registerAgent(toolCallingAgent);

      // Complex request requiring multiple tools
      const userRequest = {
        sessionId: session.id,
        message: 'Create a comprehensive learning path for React performance optimization, including existing concepts and generating new practice exercises',
        context: {
          currentKnowledge: ['react-basics', 'javascript'],
          goalLevel: 'advanced'
        }
      };

      const response = await orchestrator.processRequest(userRequest);

      // Verify tool selection and execution
      expect(response.metadata.toolsUsed).toHaveLength(4);
      expect(response.metadata.toolsUsed).toContain('searchConcepts');
      expect(response.metadata.toolsUsed).toContain('generateLearningPath');
      expect(response.metadata.toolsUsed).toContain('createExercise');
      expect(response.metadata.toolsUsed).toContain('updateUserProfile');

      // Verify tool execution results integration
      expect(response.content).toContain('learning path');
      expect(response.content).toContain('performance optimization');
      expect(response.attachments).toHaveProperty('learningPath');
      expect(response.attachments).toHaveProperty('practiceExercises');

      // Verify dependency resolution
      expect(response.metadata.toolExecutionOrder).toEqual([
        'searchConcepts',      // First: Find existing concepts
        'generateLearningPath', // Second: Use concepts to create path
        'createExercise',      // Third: Generate exercises for path
        'updateUserProfile'    // Fourth: Update with new progress
      ]);
    });

    it('should handle parallel tool execution when dependencies allow', async () => {
      const toolCallingAgent = mockToolCallingAgent();
      await orchestrator.registerAgent(toolCallingAgent);

      // Request with parallelizable tools
      const parallelRequest = {
        sessionId: session.id,
        message: 'Get my learning analytics and update my achievement badges',
        context: {
          userId: 'test-user-analytics'
        }
      };

      const response = await orchestrator.processRequest(parallelRequest);

      // Verify parallel execution
      expect(response.metadata.toolsUsed).toHaveLength(2);
      expect(response.metadata.executionStrategy).toBe('parallel');
      expect(response.metadata.parallelExecutionTime).toBeLessThan(
        response.metadata.sequentialExecutionTime * 0.8
      );

      // Verify both tools executed successfully
      expect(response.attachments).toHaveProperty('analytics');
      expect(response.attachments).toHaveProperty('achievements');
    });

    it('should handle tool failure and graceful fallback', async () => {
      const toolCallingAgent = mockToolCallingAgent();
      // Mock tool failure
      toolCallingAgent.executeTool = vi.fn().mockImplementation((toolName) => {
        if (toolName === 'externalAPI') {
          throw new Error('External API unavailable');
        }
        return { success: true, data: {} };
      });
      await orchestrator.registerAgent(toolCallingAgent);

      const requestWithExternalDependency = {
        sessionId: session.id,
        message: 'Get latest industry trends and create learning content',
        context: {}
      };

      const response = await orchestrator.processRequest(requestWithExternalDependency);

      // Verify graceful fallback
      expect(response.metadata.toolsAttempted).toContain('externalAPI');
      expect(response.metadata.toolsFailed).toContain('externalAPI');
      expect(response.metadata.fallbackStrategy).toBe('use_cached_data');
      expect(response.type).toBe('partial_success');
      expect(response.content).toContain('using cached data');
    });
  });

  describe('Handoff Agent Integration', () => {
    it('should execute smooth agent handoffs with context preservation', async () => {
      const handoffAgent = mockHandoffAgent();
      const learningAgent = mockLearningAgent();
      const practiceAgent = mockPracticeAgent();

      await orchestrator.registerAgent(handoffAgent);
      await orchestrator.registerAgent(learningAgent);
      await orchestrator.registerAgent(practiceAgent);

      // Start with Learning Agent
      let currentSession = await orchestrator.processRequest({
        sessionId: session.id,
        message: 'I want to learn about React Hooks',
        agentId: 'learning-agent-001'
      });

      expect(currentSession.currentAgent).toBe('learning-agent-001');
      expect(currentSession.context.conceptsCovered).toContain('react-hooks');

      // User requests practice - trigger handoff
      const handoffDecision = await orchestrator.evaluateHandoff({
        sessionId: session.id,
        currentAgent: 'learning-agent-001',
        userInput: 'Can you give me exercises to practice React Hooks?',
        context: currentSession.context
      });

      expect(handoffDecision.shouldHandoff).toBe(true);
      expect(handoffDecision.targetAgent).toBe('practice-agent-001');
      expect(handoffDecision.reason).toContain('practice requested');
      expect(handoffDecision.preservedContext).toHaveProperty('conceptsCovered');

      // Execute handoff
      currentSession = await orchestrator.executeHandoff({
        sessionId: session.id,
        fromAgent: 'learning-agent-001',
        toAgent: 'practice-agent-001',
        context: handoffDecision.preservedContext
      });

      expect(currentSession.currentAgent).toBe('practice-agent-001');
      expect(currentSession.context.previousAgent).toBe('learning-agent-001');
      expect(currentSession.context.handoffHistory).toHaveLength(1);

      // Continue with Practice Agent
      const practiceResponse = await orchestrator.processRequest({
        sessionId: session.id,
        message: 'Can you give me exercises to practice React Hooks?',
        agentId: 'practice-agent-001'
      });

      expect(practiceResponse.type).toBe('practice_exercise');
      expect(practiceResponse.metadata.preservedContext.conceptsCovered).toContain('react-hooks');
      expect(practiceResponse.content.exerciseDescription).toContain('React Hooks');
    });

    it('should handle multi-step handoff chains', async () => {
      const agents = [
        mockHandoffAgent(),
        mockLearningAgent(),
        mockPracticeAgent(),
        mockAssessmentAgent(),
        mockTutoringAgent()
      ];

      agents.forEach(agent => orchestrator.registerAgent(agent));

      // Simulate complex learning journey
      const journey = [
        {
          message: 'Teach me about React state management',
          expectedAgent: 'learning-agent-001',
          handoffTrigger: 'I need practice with this'
        },
        {
          message: 'Give me practice problems for state management',
          expectedAgent: 'practice-agent-001',
          handoffTrigger: 'Test my knowledge now'
        },
        {
          message: 'Assess my understanding of React state',
          expectedAgent: 'assessment-agent-001',
          handoffTrigger: 'I need help with specific concepts'
        },
        {
          message: 'I\'m struggling with useReducer, can you help?',
          expectedAgent: 'tutoring-agent-001'
        }
      ];

      let currentSession = session;

      for (let i = 0; i < journey.length; i++) {
        const step = journey[i];

        if (i === 0) {
          currentSession = await orchestrator.processRequest({
            sessionId: currentSession.id,
            message: step.message,
            agentId: step.expectedAgent
          });
        } else {
          // Evaluate and execute handoff
          const handoff = await orchestrator.evaluateHandoff({
            sessionId: currentSession.id,
            currentAgent: currentSession.currentAgent,
            userInput: step.message,
            context: currentSession.context
          });

          currentSession = await orchestrator.executeHandoff({
            sessionId: currentSession.id,
            fromAgent: handoff.fromAgent,
            toAgent: handoff.targetAgent,
            context: handoff.preservedContext
          });

          currentSession = await orchestrator.processRequest({
            sessionId: currentSession.id,
            message: step.message,
            agentId: step.expectedAgent
          });
        }

        expect(currentSession.currentAgent).toBe(step.expectedAgent);
        expect(currentSession.context.handoffHistory).toHaveLength(i);
      }

      // Verify complete handoff chain preserved
      const finalContext = currentSession.context;
      expect(finalContext.handoffHistory).toHaveLength(3);
      expect(finalContext.completeAgentChain).toEqual([
        'learning-agent-001',
        'practice-agent-001',
        'assessment-agent-001',
        'tutoring-agent-001'
      ]);
    });

    it('should handle handoff failure and recovery', async () => {
      const handoffAgent = mockHandoffAgent();
      const learningAgent = mockLearningAgent();
      const unavailableAgent = mockPracticeAgent();

      // Mock agent unavailability
      unavailableAgent.isAvailable = vi.fn().mockReturnValue(false);

      await orchestrator.registerAgent(handoffAgent);
      await orchestrator.registerAgent(learningAgent);
      await orchestrator.registerAgent(unavailableAgent);

      // Start session
      let currentSession = await orchestrator.processRequest({
        sessionId: session.id,
        message: 'Explain React context',
        agentId: 'learning-agent-001'
      });

      // Attempt handoff to unavailable agent
      const handoffDecision = await orchestrator.evaluateHandoff({
        sessionId: session.id,
        currentAgent: 'learning-agent-001',
        userInput: 'I want to practice this',
        context: currentSession.context
      });

      expect(handoffDecision.shouldHandoff).toBe(true);
      expect(handoffDecision.targetAgent).toBe('practice-agent-001');

      // Handoff should fail with recovery
      const handoffResult = await orchestrator.executeHandoff({
        sessionId: session.id,
        fromAgent: 'learning-agent-001',
        toAgent: 'practice-agent-001',
        context: handoffDecision.preservedContext
      });

      expect(handoffResult.success).toBe(false);
      expect(handoffResult.error).toContain('unavailable');
      expect(handoffResult.fallbackAgent).toBe('learning-agent-001');
      expect(handoffResult.recoveryStrategy).toBe('continue_with_current_agent');

      // Should continue with original agent
      const recoveryResponse = await orchestrator.processRequest({
        sessionId: session.id,
        message: 'I want to practice this',
        agentId: 'learning-agent-001'
      });

      expect(recoveryResponse.metadata.handoverAttempted).toBe(true);
      expect(recoveryResponse.metadata.recoverySuccessful).toBe(true);
      expect(recoveryResponse.content).toContain('practice exercises');
    });
  });

  describe('Hybrid Agent Integration', () => {
    it('should combine tool calling and handoff capabilities', async () => {
      const hybridAgent = mockHybridAgent();
      const learningAgent = mockLearningAgent();
      const assessmentAgent = mockAssessmentAgent();

      await orchestrator.registerAgent(hybridAgent);
      await orchestrator.registerAgent(learningAgent);
      await orchestrator.registerAgent(assessmentAgent);

      // Complex request requiring both tools and handoffs
      const complexRequest = {
        sessionId: session.id,
        message: 'Create a personalized learning plan for web development and then assess my current level',
        context: {
          currentSkills: ['html', 'css'],
          goals: ['full-stack-development']
        }
      };

      const response = await orchestrator.processRequest(complexRequest);

      // Verify hybrid agent used tools initially
      expect(response.metadata.toolsUsed).toContain('analyzeUserSkills');
      expect(response.metadata.toolsUsed).toContain('generateLearningPlan');

      // Verify handoff to assessment agent
      expect(response.metadata.agentHandoffs).toHaveLength(1);
      expect(response.metadata.agentHandoffs[0].toAgent).toBe('assessment-agent-001');

      // Verify combined result
      expect(response.attachments).toHaveProperty('learningPlan');
      expect(response.attachments).toHaveProperty('skillAssessment');
      expect(response.content).toContain('learning plan');
      expect(response.content).toContain('skill assessment');
    });

    it('should handle adaptive workflow orchestration', async () => {
      const hybridAgent = mockHybridAgent();
      await orchestrator.registerAgent(hybridAgent);

      // Request that requires adaptive workflow
      const adaptiveRequest = {
        sessionId: session.id,
        message: 'Help me master React development, but adjust the approach based on my progress',
        context: {
          learningStyle: 'visual',
          pace: 'self-paced',
          currentLevel: 'beginner'
        }
      };

      const response = await orchestrator.processRequest(adaptiveRequest);

      // Verify adaptive workflow planning
      expect(response.metadata.adaptiveWorkflow).toBeDefined();
      expect(response.metadata.workflowStages).toHaveLength(4);
      expect(response.metadata.workflowStages[0].type).toBe('assessment');
      expect(response.metadata.workflowStages[1].type).toBe('learning');
      expect(response.metadata.workflowStages[2].type).toBe('practice');
      expect(response.metadata.workflowStages[3].type).toBe('evaluation');

      // Verify dynamic adjustment based on progress
      expect(response.metadata.adaptations).toContain('visual_learning_materials');
      expect(response.metadata.adaptations).toContain('self_paced_progression');
    });

    it('should handle complex multi-step workflows with dependencies', async () => {
      const hybridAgent = mockHybridAgent();
      await orchestrator.registerAgent(hybridAgent);

      const multiStepRequest = {
        sessionId: session.id,
        message: 'Create a complete project-based learning path for building a React e-commerce application',
        context: {
          projectScope: 'full-stack',
          duration: '8-weeks',
          teamSize: 'individual'
        }
      };

      const response = await orchestrator.processRequest(multiStepRequest);

      // Verify complex workflow execution
      expect(response.metadata.workflowComplexity).toBe('high');
      expect(response.metadata.parallelTasks).toHaveLength(3);
      expect(response.metadata.sequentialTasks).toHaveLength(5);

      // Verify dependency resolution
      expect(response.metadata.dependencyGraph).toBeDefined();
      expect(response.metadata.executionPlan).toHaveLength(8);

      // Verify comprehensive result
      expect(response.attachments).toHaveProperty('projectPlan');
      expect(response.attachments).toHaveProperty('learningModules');
      expect(response.attachments).toHaveProperty('milestoneAssessments');
      expect(response.attachments).toHaveProperty('resourceList');
    });
  });

  describe('Agent Collaboration and Coordination', () => {
    it('should coordinate multiple agents working on the same session', async () => {
      const agents = [
        mockLearningAgent(),
        mockPracticeAgent(),
        mockAssessmentAgent()
      ];

      agents.forEach(agent => orchestrator.registerAgent(agent));

      // Start collaborative session
      const collaborativeSession = await orchestrator.createCollaborativeSession({
        sessionId: session.id,
        participants: [
          { agentId: 'learning-agent-001', role: 'primary_instructor' },
          { agentId: 'practice-agent-001', role: 'exercise_generator' },
          { agentId: 'assessment-agent-001', role: 'progress_evaluator' }
        ],
        coordinationStrategy: 'sequential_handoff_with_context_sharing'
      });

      expect(collaborativeSession.participants).toHaveLength(3);
      expect(collaborativeSession.coordinationStrategy).toBeDefined();

      // Execute collaborative workflow
      const collaborativeResponse = await orchestrator.executeCollaborativeWorkflow({
        sessionId: collaborativeSession.id,
        workflow: [
          {
            step: 1,
            agent: 'learning-agent-001',
            task: 'teach-react-concepts',
            outputs: ['concepts_taught', 'understanding_level']
          },
          {
            step: 2,
            agent: 'practice-agent-001',
            task: 'generate-exercises',
            inputs: ['concepts_taught', 'understanding_level'],
            outputs: ['practice_exercises']
          },
          {
            step: 3,
            agent: 'assessment-agent-001',
            task: 'evaluate-progress',
            inputs: ['practice_exercises', 'understanding_level'],
            outputs: ['assessment_results']
          }
        ]
      });

      expect(collaborativeResponse.workflowCompleted).toBe(true);
      expect(collaborativeResponse.agentContributions).toHaveLength(3);
      expect(collaborativeResponse.sharedContext).toHaveProperty('concepts_taught');
      expect(collaborativeResponse.sharedContext).toHaveProperty('practice_exercises');
      expect(collaborativeResponse.sharedContext).toHaveProperty('assessment_results');
    });

    it('should handle agent conflict resolution', async () => {
      const learningAgent1 = mockLearningAgent();
      const learningAgent2 = mockLearningAgent();

      // Configure conflicting recommendations
      learningAgent1.generateRecommendation = vi.fn().mockReturnValue({
        topic: 'react-hooks',
        difficulty: 'beginner',
        approach: 'theory-first'
      });

      learningAgent2.generateRecommendation = vi.fn().mockReturnValue({
        topic: 'react-hooks',
        difficulty: 'intermediate',
        approach: 'practice-first'
      });

      await orchestrator.registerAgent(learningAgent1);
      await orchestrator.registerAgent(learningAgent2);

      // Create conflicting scenario
      const conflictScenario = {
        sessionId: session.id,
        message: 'What\'s the best way to learn React Hooks?',
        conflictResolution: 'merge_recommendations'
      };

      const resolution = await orchestrator.resolveAgentConflict(conflictScenario);

      expect(resolution.conflictDetected).toBe(true);
      expect(resolution.conflictingAgents).toHaveLength(2);
      expect(resolution.resolutionStrategy).toBe('merged_approach');
      expect(resolution.mergedRecommendation).toBeDefined();
      expect(resolution.mergedRecommendation.approach).toBe('blended_theory_and_practice');
      expect(resolution.conflictResolutionScore).toBeGreaterThan(0.8);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume agent orchestration', async () => {
      const agents = Array.from({ length: 10 }, (_, i) => mockLearningAgent());
      agents.forEach((agent, i) => {
        agent.id = `learning-agent-${String(i + 1).padStart(3, '0')}`;
        orchestrator.registerAgent(agent);
      });

      // Create many concurrent sessions
      const sessionPromises = Array.from({ length: 25 }, async (_, i) => {
        const userSession = await orchestrator.createSession({
          userId: `user-${i}`,
          initialContext: { requestType: 'learning' }
        });

        return orchestrator.processRequest({
          sessionId: userSession.id,
          message: `User ${i} wants to learn about React`,
          agentId: `learning-agent-${String((i % 10) + 1).padStart(3, '0')}`
        });
      });

      const startTime = Date.now();
      const responses = await Promise.all(sessionPromises);
      const endTime = Date.now();

      // Verify performance
      expect(responses).toHaveLength(25);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify load distribution
      const agentUsage = {};
      responses.forEach(response => {
        const agentId = response.metadata.agentId;
        agentUsage[agentId] = (agentUsage[agentId] || 0) + 1;
      });

      expect(Object.keys(agentUsage)).toHaveLength(10);
      Object.values(agentUsage).forEach(usage => {
        expect(usage).toBeGreaterThanOrEqual(2); // Rough load balancing
      });
    });
  });
});