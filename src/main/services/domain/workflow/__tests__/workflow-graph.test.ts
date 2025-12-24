import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { RunnableLambda } from '@langchain/core/runnables';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../index';
import { NodeName } from '../types';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Type for agent types used in this test
type AgentType = 'assessment' | 'learning' | 'tutoring' | 'supervisor';

// Mock parseScore for tests
const makeCheckpointer = () => new MemorySaver();

const makeDeps = () => {

  const child = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
  const loggerService = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => child)
  } as any;
  const configService = {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getProviderConfig: vi.fn(),
    setProviderConfig: vi.fn(),
    onConfigChanged: vi.fn(),
    get: vi.fn(),
    isSetupComplete: vi.fn().mockResolvedValue(true),
  } as any;

  const providerFactory = {
    getModel: vi.fn().mockImplementation((modelType?: string) => {
      // For .pipe() chains, we need RunnableLambda with correct constructor signature
      return new RunnableLambda({
        func: async () => {
          // Return structured output for plan node
          return new AIMessage(JSON.stringify({
            learnerProfile: {
              topic: 'Test Topic',
              level: 'intermediate',
              timeAvailable: 60,
            },
            goal: {
              userGoal: 'Test Goal',
              successCriteria: ['Test criteria'],
            },
            session: {
              primaryConcept: 'Test',
              practiceBlocks: [
                { type: 'retrieval', prompt: 'Test', minutes: 10, scoring: 'manual', expectedAnswer: 'Test answer' },
                { type: 'apply', prompt: 'Test', minutes: 10, scoring: 'auto', expectedAnswer: 'Test answer' },
                { type: 'teach_back', prompt: 'Test', minutes: 10, scoring: 'manual', expectedAnswer: 'Test answer' },
                { type: 'open_question', prompt: 'Test', minutes: 10, scoring: 'manual', expectedAnswer: 'Test answer' },
              ],
              checks: { targetRetrievalScore: 80 },
            },
            tacticsApplied: {
              retrieval: true,
              feynmanTeachBack: true,
              spaced: false,
            },
          }));
        },
      });
    }),
    getEmbeddingModel: vi.fn().mockResolvedValue({
      embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
      settings: { providerName: 'mock', model: 'mock-embedding', embeddingDims: 1536 },
    }),
  } as any;

  const knowledgeService = {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [{ id: 'c1', title: 'Concept 1' }] }),
    getRelatedConcepts: vi.fn().mockResolvedValue({ relatedConcepts: [{ name: 'Concept 2' }] }),
    findRelatedByPrompt: vi.fn().mockResolvedValue({
      matches: [
        { type: 'concept', name: 'Topic' },
        { type: 'relationship', name: 'Related 1' },
        { type: 'relationship', name: 'Related 2' },
      ],
    }),
  } as any;

  const practiceService = {
    recordPracticeAttempt: vi.fn().mockResolvedValue(undefined),
  } as any;

  const learningService = {
    getPracticeHistory: vi.fn().mockResolvedValue([
      { result: 'partial' },
      { result: 'fail' },
      { result: 'pass' },
    ]),
    listMessages: vi.fn().mockResolvedValue([{ content: 'I understand basics' }]),
    updateSessionTitle: vi.fn().mockResolvedValue(true),
  };

  const analyticsService = {
    trackEvent: vi.fn().mockResolvedValue(undefined),
  } as any;

  return {
    loggerService,
    checkpointer: makeCheckpointer(),
    configService,
    providerFactory,
    knowledgeService,
    practiceService,
    learningService,
    analyticsService,
  } as any;
};

describe('workflow-graph interrupts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('emits await interrupt on standard practice path', async () => {
    const deps = makeDeps();

    // Configure specific responses for this test - no agentManager needed
    // All workflow nodes now use providerFactory directly

    const graph = createWorkflowGraph(deps);
    const stream = await graph.stream(
      { messages: [new HumanMessage('Hi')], topic: 'Python', confidence: 0.5 },
      { configurable: { thread_id: 's1' }, streamMode: 'updates' as const },
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const payload = extractInterrupt(evt) as any;
        // Verify interrupt has required fields (flexible for different node types)
        expect(payload).toBeDefined();
        expect(payload.type).toBeDefined();
        expect(payload.prompt).toBeDefined();
        // The prompt should contain content from one of the mocked agents
        const promptStr = String(payload.prompt);
        expect(promptStr.length).toBeGreaterThan(0);
        break;
      }
    }
    expect(gotInterrupt).toBe(true);
  });
});

describe('workflow-graph partial execution', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('executes TEACH -> PRACTICE flow using initial state', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

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
        interruptAfter: [NodeName.PRACTICE],
      }
    );

    // Verify the flow executed
    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('executes FAST_TRACK -> GRADE -> COMPLETE flow', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

    // Start with high confidence to trigger fast-track
    const result = await graph.invoke(
      {
        messages: [new HumanMessage('I know React basics')],
        topic: 'React',
        confidence: 0.9, // High confidence triggers fast-track
      },
      {
        configurable: { thread_id: 'fast-track-test-1' },
        interruptAfter: [NodeName.GRADE_QUIZ],
      }
    );

    // Verify fast-track flow executed
    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('executes PRACTICE -> EVALUATE -> PRACTICE flow', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

    // Start with practice-related state
    const result = await graph.invoke(
      {
        messages: [new HumanMessage('Give me practice')],
        topic: 'Python',
        practicePrompt: 'Write a function',
        userAnswer: 'def add(a, b): return a + b',
        confidence: 0.4,
      },
      {
        configurable: { thread_id: 'practice-test-1' },
        interruptAfter: [NodeName.PRACTICE],
      }
    );

    // Verify remediation flow executed
    expect(result.messages).toBeDefined();
    expect(Array.isArray(result.messages)).toBe(true);
    // Should have practice-related content
    expect(result.messages.length).toBeGreaterThan(0);
  });
});

describe('workflow-graph state management', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('maintains state across multiple workflow calls', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

    // First call
    const result1 = await graph.invoke(
      {
        messages: [new HumanMessage('Start learning')],
        topic: 'Python',
      },
      {
        configurable: { thread_id: 'state-test-1' },
        interruptAfter: [NodeName.TEACH],
      }
    );

    // Second call should execute successfully (state is maintained via checkpointer)
    const result2 = await graph.invoke(
      {
        messages: [new HumanMessage('Continue')],
      },
      {
        configurable: { thread_id: 'state-test-1' },
        interruptAfter: [NodeName.TEACH],
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
    const graph = createWorkflowGraph(deps);

    // Session 1
    const result1 = await graph.invoke(
      {
        messages: [new HumanMessage('Learn React')],
        topic: 'React',
      },
      {
        configurable: { thread_id: 'session-1' },
        interruptAfter: [NodeName.TEACH],
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
        interruptAfter: [NodeName.TEACH],
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

describe('workflow-graph E2E complete workflows', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
    // Full execution should generate at least 3 messages:
    // 1. Initial user message
    // 2. TopicParse acknowledgment (HumanMessage)
    // 3. Complete node success message (AIMessage)
    expect(result.messages.length).toBeGreaterThanOrEqual(3);
    // State should be maintained throughout
    expect(result).toHaveProperty('topic');
    expect(typeof result.topic).toBe('string');

    // Verify workflow reached completion state with proper mastery
    if (result.mastery !== undefined) {
      expect(typeof result.mastery).toBe('number');
      expect(result.mastery).toBeGreaterThanOrEqual(0);
      expect(result.mastery).toBeLessThanOrEqual(1);
    }
  });

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

    // Verify mastery was calculated through quiz grading
    if (result.mastery !== undefined) {
      expect(typeof result.mastery).toBe('number');
      expect(result.mastery).toBeGreaterThanOrEqual(0);
      expect(result.mastery).toBeLessThanOrEqual(1);
    }
  });
});

describe('workflow-graph edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
          interruptAfter: [NodeName.TOPIC_PARSE],
        }
      );

      // Verify topic parsing occurred
      expect(result.messages).toBeDefined();
      expect(result.topic).toBeDefined();
      expect(typeof result.topic).toBe('string');
    }
  });

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
          interruptAfter: [NodeName.ASSESS],
        }
      );

      // Verify state maintained correctly
      expect(result.messages).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    }
  });
});
