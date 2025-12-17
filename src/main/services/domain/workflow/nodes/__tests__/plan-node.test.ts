import { describe, it, expect, vi } from 'vitest';
import { planNode, SessionBlueprintSchema } from '../plan';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

// Mock config writer for chunk emitter (DI pattern - only mock writer, use real chunk-emitter)
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(), // Mock writer function only
} as any);

describe('plan node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates session blueprint based on assessment confidence', async () => {
    // Create a valid session blueprint
    const mockBlueprint = {
      learnerProfile: {
        topic: 'JavaScript Basics',
        level: 'intermediate' as const,
        strengths: ['Problem solving'],
        gaps: ['Array methods'],
        timeAvailable: 60,
        constraints: [],
      },
      goal: {
        userGoal: 'Master array methods',
        successCriteria: ['Can use map/filter/reduce', 'Understand closures'],
      },
      session: {
        primaryConcept: 'Array Methods',
        adjacentConcepts: ['Functions', 'Variables'],
        practiceBlocks: [
          {
            type: 'retrieval' as const,
            prompt: 'List all array methods you know',
            minutes: 10,
            scoring: 'manual' as const,
          },
          {
            type: 'apply' as const,
            prompt: 'Use map to transform an array of numbers',
            minutes: 15,
            expectedAnswer: '[1,2,3].map(x => x * 2)',
            scoring: 'auto' as const,
          },
          {
            type: 'teach_back' as const,
            prompt: 'Explain how reduce works with a simple example',
            minutes: 15,
            scoring: 'manual' as const,
          },
          {
            type: 'open_question' as const,
            prompt: 'When would you choose map over forEach?',
            minutes: 10,
            scoring: 'manual' as const,
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
    };

    // Use RunnableLambda with correct constructor signature
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify(mockBlueprint));
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'JavaScript Basics',
      confidence: 0.6,
      gaps: ['Array methods'],
      messages: [],
      sessionMetadata: {},
    } as any;

    const config = createMockConfig();

    const result = await node(state, config);

    expect(result.sessionBlueprint).toBeDefined();
    expect(result.sessionBlueprint.learnerProfile.level).toBe('intermediate');
    expect(result.sessionBlueprint.session.practiceBlocks).toHaveLength(4);
    expect(result.topic).toBe('JavaScript Basics');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(mockDeps.providerFactory.getModel).toHaveBeenCalled();
  });

  it('determines novice level for low confidence', async () => {
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify({
          learnerProfile: {
            topic: 'Test Topic',
            level: 'novice',
            timeAvailable: 60,
          },
          goal: {
            userGoal: 'Learn basics',
            successCriteria: ['Understand concept'],
          },
          session: {
            primaryConcept: 'Test Concept',
            practiceBlocks: [
              {
                type: 'retrieval',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'apply',
                prompt: 'Test',
                minutes: 10,
                scoring: 'auto',
              },
              {
                type: 'teach_back',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'open_question',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
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

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'Test Topic',
      confidence: 0.3, // Low confidence
      gaps: [],
      messages: [],
      sessionMetadata: {},
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.sessionBlueprint.learnerProfile.level).toBe('novice');
  });

  it('determines advanced level for high confidence', async () => {
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify({
          learnerProfile: {
            topic: 'Test Topic',
            level: 'advanced',
            timeAvailable: 60,
          },
          goal: {
            userGoal: 'Advanced concepts',
            successCriteria: ['Master topic'],
          },
          session: {
            primaryConcept: 'Advanced Concept',
            practiceBlocks: [
              {
                type: 'retrieval',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'apply',
                prompt: 'Test',
                minutes: 10,
                scoring: 'auto',
              },
              {
                type: 'teach_back',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'open_question',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
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

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'Test Topic',
      confidence: 0.9, // High confidence
      gaps: [],
      messages: [],
      sessionMetadata: {},
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.sessionBlueprint.learnerProfile.level).toBe('advanced');
  });

  it('uses default confidence when not provided', async () => {
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify({
          learnerProfile: {
            topic: 'Test Topic',
            level: 'intermediate',
            timeAvailable: 60,
          },
          goal: {
            userGoal: 'Learn topic',
            successCriteria: ['Understand basics'],
          },
          session: {
            primaryConcept: 'Test Concept',
            practiceBlocks: [
              {
                type: 'retrieval',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'apply',
                prompt: 'Test',
                minutes: 10,
                scoring: 'auto',
              },
              {
                type: 'teach_back',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'open_question',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
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

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'Test Topic',
      confidence: undefined, // No confidence
      gaps: [],
      messages: [],
      sessionMetadata: {},
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.sessionBlueprint.learnerProfile.level).toBe('intermediate');
  });

  it('includes gaps from assessment in the plan', async () => {
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify({
          learnerProfile: {
            topic: 'JavaScript',
            level: 'intermediate',
            gaps: ['Closures', 'Promises'],
            timeAvailable: 60,
          },
          goal: {
            userGoal: 'Master JavaScript',
            successCriteria: ['Understand concepts'],
          },
          session: {
            primaryConcept: 'JavaScript',
            practiceBlocks: [
              {
                type: 'retrieval',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'apply',
                prompt: 'Test',
                minutes: 10,
                scoring: 'auto',
              },
              {
                type: 'teach_back',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'open_question',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
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

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'JavaScript',
      confidence: 0.6,
      gaps: ['Closures', 'Promises'],
      messages: [],
      sessionMetadata: {},
    } as any;

    const result = await node(state, createMockConfig());

    expect(result.sessionBlueprint.learnerProfile.gaps).toContain('Closures');
    expect(result.sessionBlueprint.learnerProfile.gaps).toContain('Promises');
  });

  it('validates session blueprint schema', async () => {
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify({
          learnerProfile: {
            topic: 'Test',
            level: 'intermediate',
            timeAvailable: 60,
          },
          goal: {
            userGoal: 'Test',
            successCriteria: ['Test'],
          },
          session: {
            primaryConcept: 'Test',
            practiceBlocks: [
              {
                type: 'retrieval',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'apply',
                prompt: 'Test',
                minutes: 10,
                scoring: 'auto',
              },
              {
                type: 'teach_back',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
              {
                type: 'open_question',
                prompt: 'Test',
                minutes: 10,
                scoring: 'manual',
              },
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

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'Test',
      confidence: 0.6,
      gaps: [],
      messages: [],
      sessionMetadata: {},
    } as any;

    const result = await node(state, createMockConfig());

    // Should validate successfully
    const validation = SessionBlueprintSchema.safeParse(result.sessionBlueprint);
    expect(validation.success).toBe(true);
  });

  it('handles errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Use RunnableLambda that throws an error
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        throw new Error('Test error');
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'Test',
      confidence: 0.6,
      gaps: [],
      messages: [],
      sessionMetadata: {},
    } as any;

    await expect(node(state, createMockConfig())).rejects.toThrow('Test error');
    consoleSpy.mockRestore();
  });
});
