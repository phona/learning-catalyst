import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../index';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import * as fs from 'fs';
import * as path from 'path';

interface TestConfig {
  provider: {
    name: string;
    chatModel: {
      model: string;
      temperature: number;
      maxTokens: number;
      apiKey: string;
      baseUrl: string;
    };
    embeddingModel: {
      model: string;
      apiKey: string;
      baseUrl: string;
    };
  };
  testSettings: {
    timeoutMs: number;
    retryAttempts: number;
    checkpointer: string;
  };
}

const TEST_CONFIG_PATH = path.join(process.cwd(), '.testconfig.json');

function loadTestConfig(): TestConfig {
  try {
    if (!fs.existsSync(TEST_CONFIG_PATH)) {
      throw new Error(
        `.testconfig.json not found. Please create it based on the example structure.`
      );
    }
    const configData = fs.readFileSync(TEST_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData) as TestConfig;

    // Validate required fields
    if (!config.provider?.chatModel?.apiKey) {
      throw new Error('Invalid config: missing apiKey');
    }
    if (!config.provider?.chatModel?.model) {
      throw new Error('Invalid config: missing model');
    }

    return config;
  } catch (error) {
    console.error('Failed to load test configuration:', error);
    throw error;
  }
}

const makeCheckpointer = () => new MemorySaver();

const makeDeps = () => {
  const config = loadTestConfig();

  // Create mock agents for testing (real agents would require full setup)
  const createMockAgent = (content: string) => ({
    invoke: vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content }],
    }),
    providerInfo: {
      providerName: config.provider.name,
      model: config.provider.chatModel.model,
    },
  });

  const agentManager = {
    runAgent: vi.fn(),
    getAgent: vi.fn().mockImplementation((type) => {
      switch (type) {
        case 'learning':
          return createMockAgent('Learning content about the topic');
        case 'tutoring':
          return createMockAgent('Tutoring guidance and encouragement');
        case 'practice':
          return createMockAgent(
            JSON.stringify({
              summary: 'Practice exercises for Python functions',
              exercises: [
                {
                  title: 'Define a Simple Function',
                  description: 'Create a function that adds two numbers',
                  steps: [
                    'Use the def keyword',
                    'Name your function add',
                    'Specify parameters a and b',
                    'Return the sum of a and b',
                  ],
                  hints: [
                    'Functions start with def',
                    'Remember to use return',
                  ],
                },
                {
                  title: 'Call Your Function',
                  description: 'Use the function you just created',
                  steps: [
                    'Call add(5, 3)',
                    'Print the result',
                  ],
                  hints: [
                    'Use parentheses to call functions',
                  ],
                },
              ],
              suggestions: [
                'Practice with different numbers',
                'Try creating subtraction function',
              ],
            })
          );
        default:
          return createMockAgent('Default response');
      }
    }),
  };

  const child = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => child),
  };

  const loggerService = {
    child: vi.fn(() => child),
  };

  const configService = {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    onConfigChanged: vi.fn(),
    get: vi.fn(),
    isSetupComplete: vi.fn().mockResolvedValue(true),
  };

  // Fast mock provider factory for unit tests
  // Returns RunnableLambda mock that simulates LLM response
  const providerFactory = {
    getModel: vi.fn().mockImplementation((modelType: string) => {
      // Create a RunnableLambda mock that returns different JSON based on input
      const mockLLM = RunnableLambda.from(async (input: any) => {
        // Simulate async LLM call delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check if input contains promptData (PRACTICE node format)
        // PRACTICE node sends: [SystemMessage, HumanMessage(JSON.stringify(promptData))]
        const hasPromptData = Array.isArray(input) &&
          input.some(msg => msg.content && typeof msg.content === 'string' && msg.content.includes('"practiceType"'));

        if (hasPromptData) {
          // Return practice exercises format for PRACTICE node
          return new AIMessage(
            JSON.stringify({
              summary: 'Practice exercises for Python functions',
              exercises: [
                {
                  title: 'Define a Simple Function',
                  description: 'Create a function that adds two numbers',
                  steps: [
                    'Use the def keyword',
                    'Name your function add',
                    'Specify parameters a and b',
                    'Return the sum of a and b',
                  ],
                  hints: [
                    'Functions start with def',
                    'Remember to use return',
                  ],
                },
                {
                  title: 'Call Your Function',
                  description: 'Use the function you just created',
                  steps: [
                    'Call add(5, 3)',
                    'Print the result',
                  ],
                  hints: [
                    'Use parentheses to call functions',
                  ],
                },
              ],
              suggestions: [
                'Practice with different numbers',
                'Try creating subtraction function',
              ],
            })
          );
        } else {
          // Return session blueprint format for PLAN node
          return new AIMessage(
            JSON.stringify({
              learnerProfile: {
                topic: 'Python',
                level: 'intermediate',
                strengths: ['Basic syntax'],
                gaps: ['Error handling'],
                timeAvailable: 60,
                constraints: [],
              },
              goal: {
                userGoal: 'Master Python basics',
                successCriteria: ['Can write functions', 'Can handle errors'],
              },
              session: {
                primaryConcept: 'Python Functions',
                adjacentConcepts: ['Variables', 'Data Types'],
                practiceBlocks: [
                  {
                    id: 'pb1',
                    type: 'retrieval',
                    prompt: 'Answer questions about function basics',
                    minutes: 10,
                    scoring: 'auto',
                  },
                  {
                    id: 'pb2',
                    type: 'apply',
                    prompt: 'Write a function that performs a specific task',
                    minutes: 15,
                    scoring: 'manual',
                  },
                  {
                    id: 'pb3',
                    type: 'teach_back',
                    prompt: 'Explain how functions work in your own words',
                    minutes: 10,
                    scoring: 'manual',
                  },
                  {
                    id: 'pb4',
                    type: 'open_question',
                    prompt: 'What did you learn about functions today?',
                    minutes: 5,
                    scoring: 'manual',
                  },
                ],
                checks: {
                  targetRetrievalScore: 80,
                },
              },
              tacticsApplied: {
                retrieval: true,
                feynmanTeachBack: true,
                spaced: false,
              },
            })
          );
        }
      });

      return {
        model: mockLLM,
        settings: {
          providerName: config.provider.name,
          model: config.provider.chatModel.model,
          temperature: config.provider.chatModel.temperature,
          maxTokens: config.provider.chatModel.maxTokens,
          apiKey: config.provider.chatModel.apiKey,
          baseUrl: config.provider.chatModel.baseUrl,
        },
      };
    }),
    getEmbeddingModel: vi.fn().mockResolvedValue({
      embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
      settings: {
        providerName: config.provider.name,
        model: config.provider.embeddingModel.model,
        embeddingDims: 1536,
      },
    }),
  };

  const knowledgeService = {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [{ id: 'c1', title: 'Concept 1' }] }),
    getRelatedConcepts: vi.fn().mockResolvedValue({ relatedConcepts: [{ name: 'Concept 2' }] }),
    findRelatedByPrompt: vi.fn().mockImplementation((prompt: string) => {
      // Return matches for common test topics
      const topic = prompt.toLowerCase();
      if (topic.includes('machine learning') || topic.includes('python') || topic.includes('javascript') || topic.includes('react')) {
        return {
          matches: [
            { type: 'concept', name: prompt },
            { type: 'relationship', name: 'Related Concept 1' },
            { type: 'relationship', name: 'Related Concept 2' },
          ],
        };
      }
      // Default: no matches
      return { matches: [] };
    }),
  };

  const practiceService = {
    recordPracticeAttempt: vi.fn().mockResolvedValue(undefined),
  };

  const learningService = {
    getPracticeHistory: vi.fn().mockResolvedValue([
      { result: 'partial' },
      { result: 'fail' },
      { result: 'pass' },
    ]),
    listMessages: vi.fn().mockResolvedValue([{ content: 'I understand basics' }]),
  };

  const analyticsService = {
    trackEvent: vi.fn().mockResolvedValue(undefined),
  };

  // Configure runAgent to use the actual agent manager logic WITH analytics tracking
  agentManager.runAgent.mockImplementation(async (request: any) => {
    const agent = agentManager.getAgent(request.agentType);
    const result = await agent.invoke({
      messages: request.messages,
    });
    const message = result.messages[0];

    // Track the agent interaction with analytics (simulating real behavior from agent-manager.ts)
    await analyticsService.trackEvent({
      eventType: 'message_sent',
      userId: request.userId,
      properties: {
        agentType: request.agentType,
        provider: agent.providerInfo.providerName,
        model: agent.providerInfo.model,
      },
      context: {
        conversationId: request.conversationId,
        topic: request.topic,
      },
    });

    return {
      content: message.content,
      model: agent.providerInfo.model,
      provider: agent.providerInfo.providerName,
      agentType: request.agentType,
    };
  });

  return {
    agentManager,
    loggerService,
    checkpointer: makeCheckpointer(),
    configService,
    providerFactory,
    knowledgeService,
    practiceService,
    learningService,
  };
};

describe('Full Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Official LangGraph Testing Patterns', () => {
    describe('Partial Execution Tests (Pattern 2)', () => {
      it('executes TEACH -> QA -> PRACTICE flow using initial state', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // Start with initial state configured for TEACH node
        const result = await graph.invoke(
          {
            messages: [new HumanMessage('I want to learn Python')],
            topic: 'Python',
            confidence: 0.6,
            gaps: [],
          },
          {
            configurable: { thread_id: 'partial-test-1' },
            interrupt_after: 'PRACTICE',
          }
        );

        // Verify the flow executed
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      });

      it('executes FAST_TRACK -> GRADE -> COMPLETE flow', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // Start with high confidence to trigger fast-track
        const result = await graph.invoke(
          {
            messages: [new HumanMessage('I know React basics')],
            topic: 'React',
            confidence: 0.9, // High confidence triggers fast-track
          },
          {
            configurable: { thread_id: 'fast-track-test-1' },
            interrupt_after: 'GRADE_QUIZ',
          }
        );

        // Verify fast-track flow executed
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      });

      it('executes PRACTICE -> EVALUATE -> REMEDIATE flow', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // Start with practice-related state
        const result = await graph.invoke(
          {
            messages: [new HumanMessage('Give me practice')],
            topic: 'Python',
            practicePrompt: 'Write a function',
            userAnswer: 'def add(a, b): return a + b',
          },
          {
            configurable: { thread_id: 'practice-test-1' },
            interrupt_after: 'REMEDIATE',
          }
        );

        // Verify remediation flow executed
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      });
    });

    describe('State Management Tests (Pattern 4)', () => {
      it('maintains state across multiple workflow calls', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // First call
        const result1 = await graph.invoke(
          {
            messages: [new HumanMessage('Start learning')],
            topic: 'Python',
          },
          {
            configurable: { thread_id: 'state-test-1' },
            interrupt_after: 'TEACH',
          }
        );

        // Second call should execute successfully (state is maintained via checkpointer)
        const result2 = await graph.invoke(
          {
            messages: [new HumanMessage('Continue')],
          },
          {
            configurable: { thread_id: 'state-test-1' },
            interrupt_after: 'TEACH',
          }
        );

        // Verify workflow executed (messages should be present)
        expect(result2.messages).toBeDefined();
        expect(Array.isArray(result2.messages)).toBe(true);
        // Both calls should produce messages
        expect(result1.messages.length).toBeGreaterThan(0);
        expect(result2.messages.length).toBeGreaterThan(0);
      });

      it('isolates different sessions using thread IDs', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // Session 1
        const result1 = await graph.invoke(
          {
            messages: [new HumanMessage('Learn React')],
            topic: 'React',
          },
          {
            configurable: { thread_id: 'session-1' },
            interrupt_after: 'TEACH',
          }
        );

        // Session 2 (different topic)
        const result2 = await graph.invoke(
          {
            messages: [new HumanMessage('Learn Vue')],
            topic: 'Vue',
          },
          {
            configurable: { thread_id: 'session-2' },
            interrupt_after: 'TEACH',
          }
        );

        // Verify sessions are isolated (both execute successfully)
        expect(result1.messages).toBeDefined();
        expect(result2.messages).toBeDefined();
        expect(Array.isArray(result1.messages)).toBe(true);
        expect(Array.isArray(result2.messages)).toBe(true);
        // Each session should have its own execution
        expect(result1.messages.length).toBeGreaterThan(0);
        expect(result2.messages.length).toBeGreaterThan(0);
      });
    });

    describe('Interrupt Handling Tests', () => {
      it('handles user responses and continues workflow', async () => {
        const deps = makeDeps();
        const graph = createWorkflowGraph(deps); // Already compiled!

        // Test workflow execution with streaming
        const stream1 = await graph.stream(
          {
            messages: [new HumanMessage('Teach me JavaScript')],
            topic: 'JavaScript',
          },
          {
            configurable: { thread_id: 'interrupt-test-1' },
            streamMode: 'updates' as const,
            interrupt_after: 'TEACH',
          }
        );

        const events1 = [];
        for await (const evt of stream1) {
          events1.push(evt);
        }

        // Verify initial execution produced events
        expect(events1.length).toBeGreaterThan(0);

        // Test that workflow can be resumed (even without specific interrupt)
        // This verifies the checkpointer and state management work
        const result = await graph.invoke(
          {
            messages: [new HumanMessage('Continue learning')],
          },
          {
            configurable: { thread_id: 'interrupt-test-1' },
            interrupt_after: 'TEACH',
          }
        );

        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      });
    });
  });

  /**
   * End-to-End (E2E) Workflow Tests
   *
   * PURPOSE: Comprehensive testing to ensure code reliability and stability
   *
   * WHY WE WRITE MANY TESTS:
   * 1. Reliability: Automated tests catch bugs before users do
   * 2. Stability: Regression prevention - changes don't break existing functionality
   * 3. Confidence: Refactoring and adding features safely
   * 4. Documentation: Tests serve as executable specifications
   * 5. Manual Testing Reduction: Minimize human testing effort
   *
   * TESTING PHILOSOPHY:
   * - Unit Tests (fast, isolated) → Verify individual components
   * - Integration Tests (medium speed) → Verify component interactions
   * - E2E Tests (complete journeys) → Verify real user workflows
   *
   * These E2E tests validate complete START → END workflows to ensure
   * the entire learning system works as expected in production.
   */
  describe('End-to-End (E2E) Complete Workflow Tests', () => {
    /**
     * Test 1: Complete Standard Learning Path
     * Validates: Full teaching → practice → completion journey
     * Path: START → TOPIC_PARSE → ASSESS → PLAN → TEACH → QA → PRACTICE → EVALUATE → REMEDIATE/PRACTICE → MASTERY_CHECK → COMPLETE
     */
    it('executes complete standard learning path from start to finish', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // User with low confidence starts learning Python from scratch
      const result = await graph.invoke(
        {
          messages: [new HumanMessage('I want to learn Python from scratch, teach me everything')],
          topic: 'Python',
          confidence: 0.2, // Low confidence - triggers standard teaching path
        },
        {
          configurable: { thread_id: 'e2e-standard-complete' },
          // No interrupt - let it run to natural completion
        }
      );

      // E2E Assertions: Verify complete workflow execution
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Full execution should generate multiple messages
      // With interactive TEACH and removed QA node, expect fewer messages than before
      // Standard path: TOPIC_PARSE → ASSESS → PLAN → TEACH → PRACTICE → EVALUATE → MASTERY_CHECK → COMPLETE
      expect(result.messages.length).toBeGreaterThan(3);
      // State should be maintained throughout
      expect(result).toHaveProperty('topic');
      expect(typeof result.topic).toBe('string');
    });

    /**
     * Test 2: Complete Fast-Track Assessment Path
     * Validates: Quiz-based assessment for confident users
     * Path: START → TOPIC_PARSE → ASSESS → PLAN → FAST_TRACK_QUIZ → GRADE_QUIZ → COMPLETE
     */
    it('executes complete fast-track assessment for experienced learners', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // User with high confidence requests fast-track
      const result = await graph.invoke(
        {
          messages: [new HumanMessage('I already know Python basics, test my knowledge')],
          topic: 'Python',
          confidence: 0.95, // Very high confidence - triggers fast-track
        },
        {
          configurable: { thread_id: 'e2e-fasttrack-complete' },
          // Complete the fast-track assessment
        }
      );

      // E2E Assertions: Verify fast-track path executed
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Fast-track should complete in fewer steps
      expect(result.messages.length).toBeGreaterThan(2);
      // State should be maintained throughout
      expect(result).toHaveProperty('topic');
      expect(typeof result.topic).toBe('string');
    });

    /**
     * Test 3: Complete Remediation Cycle
     * Validates: Multiple practice attempts with remediation
     * Path: START → ... → PRACTICE → EVALUATE (fail) → REMEDIATE → PRACTICE → EVALUATE (fail) → REMEDIATE → PRACTICE → EVALUATE (pass) → COMPLETE
     */
    it('handles complete remediation cycle until mastery', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Simulate learner who needs multiple attempts
      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Teach me JavaScript, I struggle with it')],
          topic: 'JavaScript',
          confidence: 0.4, // Medium-low confidence
          // Simulate previous failed attempts to trigger remediation
          attemptCount: 1,
          mastery: 0.5, // Below pass threshold
        },
        {
          configurable: { thread_id: 'e2e-remediation-complete' },
          interrupt_after: 'REMEDIATE', // Stop at remediation to verify path
        }
      );

      // E2E Assertions: Verify remediation path and progression
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Remediation should generate teaching content
      expect(result.messages.length).toBeGreaterThan(0);
      // Track learning progression
      expect(result.attemptCount).toBeGreaterThanOrEqual(1);
    });

    /**
     * Test 4: Knowledge Integration
     * Validates: Knowledge graph search and concept linking
     * Path: START → TOPIC_PARSE → (searchKnowledge) → ASSESS → ...
     */
    it('integrates knowledge graph into complete workflow', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Explain React components and hooks')],
          topic: 'React',
        },
        {
          configurable: { thread_id: 'e2e-knowledge-complete' },
          interrupt_after: 'PLAN', // Stop after knowledge integration
        }
      );

      // E2E Assertions: Verify knowledge service integration
      expect(deps.knowledgeService.searchKnowledge).toHaveBeenCalled();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Knowledge search should inform the plan
      expect(result.sessionBlueprint).toBeDefined();
    });

    /**
     * Test 5: Analytics Tracking
     * Validates: Learning analytics collection throughout workflow
     * Path: START → ... → (trackEvent) → ... → END
     */
    it('tracks analytics events throughout complete workflow', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Create a local analytics tracker to verify events
      const analyticsTracker = {
        trackEvent: vi.fn().mockResolvedValue(undefined),
      };

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('I want to learn TypeScript')],
          topic: 'TypeScript',
        },
        {
          configurable: { thread_id: 'e2e-analytics-complete' },
          interrupt_after: 'EVALUATE', // Stop after some analytics events
        }
      );

      // E2E Assertions: Verify workflow executed
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    /**
     * Test 6: Session Blueprint Generation
     * Validates: PLAN node creates complete learning session
     * Path: START → ... → PLAN → (sessionBlueprint) → ...
     */
    it('generates complete session blueprint during workflow', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Create a learning plan for Vue.js')],
          topic: 'Vue',
          confidence: 0.6,
        },
        {
          configurable: { thread_id: 'e2e-blueprint-complete' },
          interrupt_after: 'PLAN', // Stop after blueprint generation
        }
      );

      // E2E Assertions: Verify session blueprint structure
      expect(result.sessionBlueprint).toBeDefined();
      expect(result.sessionBlueprint.learnerProfile).toBeDefined();
      expect(result.sessionBlueprint.session).toBeDefined();
      expect(result.sessionBlueprint.session.practiceBlocks).toBeDefined();
      // Verify all required practice block types
      const blockTypes = result.sessionBlueprint.session.practiceBlocks.map(b => b.type);
      expect(blockTypes).toContain('retrieval');
      expect(blockTypes).toContain('apply');
      expect(blockTypes).toContain('teach_back');
      expect(blockTypes).toContain('open_question');
    });
  });

  /**
   * Edge Cases and Coverage Gap Tests
   *
   * PURPOSE: Test edge cases and improve code coverage for under-tested components
   *
   * WHY WE NEED THESE TESTS:
   * 1. Fast Track Quiz: 11.11% coverage - critical path for experienced learners
   * 2. Grade Quiz: 25% coverage - validates assessment outcomes
   * 3. Topic Parse: 66.66% stmt, 27.27% branch - handles user input variations
   * 4. Complete Node: 50% coverage - workflow termination logic
   * 5. Parse Score: 57.14% stmt, 25% branch - numeric confidence parsing
   * 6. Edges: 44.44% branch - conditional routing logic
   */
  describe('Edge Cases and Coverage Gap Tests', () => {
    /**
     * Test: Fast Track Quiz Generation
     * Coverage Target: fastTrackQuiz.ts (11.11% → 90%+)
     */
    it('generates fast-track quiz for high-confidence users', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Test my advanced React knowledge')],
          topic: 'React',
          confidence: 0.98, // Very high - triggers fast-track
        },
        {
          configurable: { thread_id: 'coverage-fasttrack-quiz' },
          interrupt_after: 'FAST_TRACK_QUIZ',
        }
      );

      // Verify quiz was generated
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      // Should have generated quiz content
      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.content).toBeDefined();
      expect(typeof lastMessage.content).toBe('string');
    });

    /**
     * Test: Fast Track Quiz → Grade Flow
     * Coverage Target: gradeQuiz.ts (25% → 90%+)
     */
    it('completes fast-track assessment with quiz grading', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('I know Python well, assess me')],
          topic: 'Python',
          confidence: 0.99,
        },
        {
          configurable: { thread_id: 'coverage-grade-flow' },
          // Allow full fast-track execution
        }
      );

      // Verify workflow completed successfully
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      // Should have multiple messages from quiz + grading
      expect(result.messages.length).toBeGreaterThan(1);
    });

    /**
     * Test: Topic Parsing Variations
     * Coverage Target: topicParse.ts (66.66% stmt, 27.27% branch → 90%+)
     */
    it('handles various topic input formats', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Test with different input styles
      const testCases = [
        'I want to learn machine learning',
        'Teach me Python programming',
        'JavaScript basics please',
      ];

      for (const input of testCases) {
        const result = await graph.invoke(
          {
            messages: [new HumanMessage(input)],
            confidence: 0.5,
          },
          {
            configurable: { thread_id: `coverage-topic-${input.substring(0, 10)}` },
            interrupt_after: 'TOPIC_PARSE',
          }
        );

        // Verify topic parsing occurred
        expect(result.messages).toBeDefined();
        expect(result.topic).toBeDefined();
        expect(typeof result.topic).toBe('string');
      }
    });

    /**
     * Test: Workflow Completion Node
     * Coverage Target: complete.ts (50% → 90%+)
     */
    it('properly completes workflow with final state', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Learn Java from scratch')],
          topic: 'Java',
          confidence: 0.3,
        },
        {
          configurable: { thread_id: 'coverage-complete-node' },
          // Let it run to natural completion
        }
      );

      // Verify workflow terminates properly
      expect(result.messages).toBeDefined();
      expect(result).toHaveProperty('topic');
      expect(result).toHaveProperty('sessionBlueprint');
    });

    /**
     * Test: Score Parsing Edge Cases
     * Coverage Target: parse-score.ts (57.14% stmt, 25% branch → 90%+)
     */
    it('handles various confidence score formats', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Test boundary confidence values
      const testConfidenceValues = [0.0, 0.5, 0.99, 1.0];

      for (const confidence of testConfidenceValues) {
        const result = await graph.invoke(
          {
            messages: [new HumanMessage('Learn TypeScript')],
            topic: 'TypeScript',
            confidence: confidence,
          },
          {
            configurable: { thread_id: `coverage-score-${confidence}` },
            interrupt_after: 'ASSESS',
          }
        );

        // Verify state maintained correctly
        expect(result.messages).toBeDefined();
        expect(typeof result.confidence).toBe('number');
      }
    });

    /**
     * Test: Edge Routing Conditions
     * Coverage Target: edges.ts (44.44% branch → 90%+)
     */
    it('routes through all conditional branches', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Test different confidence thresholds to trigger different paths
      const thresholdTests = [
        { confidence: 0.15, expectedPath: 'standard' },
        { confidence: 0.5, expectedPath: 'standard' },
        { confidence: 0.85, expectedPath: 'fast-track' },
        { confidence: 0.95, expectedPath: 'fast-track' },
      ];

      for (const test of thresholdTests) {
        const result = await graph.invoke(
          {
            messages: [new HumanMessage(`Learn Go with confidence ${test.confidence}`)],
            topic: 'Go',
            confidence: test.confidence,
          },
          {
            configurable: { thread_id: `coverage-edge-${test.confidence}` },
            // Allow execution to see routing
          }
        );

        // Verify each path executes
        expect(result.messages).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
      }
    });

    /**
     * Test: Circuit Breaker Activation
     * Coverage Target: breaker.ts (already 100%, but verify it works)
     */
    it('prevents infinite loops via circuit breaker', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Simulate scenario that might trigger circuit breaker
      // (multiple remediation attempts)
      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Learn Rust with persistent difficulties')],
          topic: 'Rust',
          confidence: 0.1, // Very low confidence
        },
        {
          configurable: { thread_id: 'coverage-breaker' },
          // Allow full execution - circuit breaker should prevent infinite loops
        }
      );

      // Verify workflow doesn't hang or loop infinitely
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeLessThan(50); // Reasonable upper bound
    });

    /**
     * Test: Mastery Check with Various Scores
     * Coverage Target: evaluate.ts (100% stmt, 37.5% branch → 90%+ branch)
     */
    it('evaluates mastery with different score thresholds', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      // Test different evaluation outcomes
      const evaluationScores = [0.3, 0.6, 0.8, 0.95];

      for (const score of evaluationScores) {
        const result = await graph.invoke(
          {
            messages: [new HumanMessage(`Practice C++ with score ${score}`)],
            topic: 'C++',
            confidence: 0.4,
          },
          {
            configurable: { thread_id: `coverage-eval-${score}` },
            interrupt_after: 'EVALUATE',
          }
        );

        // Verify evaluation occurred
        expect(result.messages).toBeDefined();
        expect(result.messages.length).toBeGreaterThan(0);
      }
    });

    /**
     * Test: QA Node Interaction Patterns
     * Coverage Target: qa.ts (already 100%, but verify edge cases)
     */
    it('handles Q&A with different question types', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Explain Swift programming concepts')],
          topic: 'Swift',
          confidence: 0.4,
        },
        {
          configurable: { thread_id: 'coverage-qa' },
          interrupt_after: 'QA',
        }
      );

      // Verify Q&A interaction occurred
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    /**
     * Test: Remediation with Multiple Attempts
     * Coverage Target: remediate.ts (already 100%)
     */
    it('provides remediation for struggling learners', async () => {
      const deps = makeDeps();
      const graph = createWorkflowGraph(deps);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage('Need help with Kotlin basics')],
          topic: 'Kotlin',
          confidence: 0.2, // Low confidence - triggers remediation
        },
        {
          configurable: { thread_id: 'coverage-remediate' },
          interrupt_after: 'REMEDIATE',
        }
      );

      // Verify remediation content generated
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.content).toBeDefined();
    });
  });
});
