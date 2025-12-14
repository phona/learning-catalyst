import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../index';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { parseScore } from '../parse-score';

// Mock parseScore for tests
vi.mock('../parse-score', () => ({
  parseScore: vi.fn().mockImplementation((content: string) => {
    const match = content.match(/(\d+)%/);
    if (match) {
      return parseInt(match[1], 10) / 100;
    }
    return undefined;
  }),
}));

const makeCheckpointer = () => new MemorySaver();

const makeDeps = () => {
  // Create a proper agent manager mock that matches the real interface
  const createMockAgent = (content: string) => ({
    invoke: vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content }],
    }),
    providerInfo: { providerName: 'mock', model: 'mock-model' },
  });

  const agentManager = {
    runAgent: vi.fn(),
    getAgent: vi.fn().mockImplementation((type) => {
      if (type === 'learning') return createMockAgent('Learning content');
      if (type === 'tutoring') return createMockAgent('Tutoring content');
      return createMockAgent('Default content');
    }),
  };

  // Configure runAgent to use the actual agent manager logic
  agentManager.runAgent.mockImplementation(async (request: any) => {
    const agent = agentManager.getAgent(request.agentType);
    const result = await agent.invoke({
      messages: request.messages,
    });
    const message = result.messages[0];
    return {
      content: message.content,
      model: agent.providerInfo.model,
      provider: agent.providerInfo.providerName,
      agentType: request.agentType,
    };
  });

  const child = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(() => child) } as any;
  const loggerService = { child: vi.fn(() => child) } as any;
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
    getModel: vi.fn().mockImplementation((modelType: string) => {
      // Always return a valid model that can handle invoke calls
      const invokeMock = vi.fn().mockResolvedValue(
        JSON.stringify({
          summary: 'Practice Summary',
          exercises: [
            {
              id: 'e1',
              title: 'Exercise 1',
              description: 'Do thing',
              difficulty: 'medium',
              type: 'general',
              steps: ['Step 1'],
              hints: ['Hint 1'],
              expectedOutcome: 'Outcome',
            },
          ],
          suggestions: ['Keep going'],
        })
      );

      return {
        model: {
          invoke: invokeMock,
        },
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      };
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
  } as any;

  const analyticsService = {
    trackEvent: vi.fn().mockResolvedValue(undefined),
  } as any;

  return {
    agentManager,
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

    // Configure specific responses for this test
    const mockAssessment = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Confidence: 50%' }],
      }),
      providerInfo: { providerName: 'mock', model: 'mock' },
    };
    const mockLearning = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Teach content' }],
      }),
      providerInfo: { providerName: 'mock', model: 'mock' },
    };
    const mockTutoring = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Practice prompt' }],
      }),
      providerInfo: { providerName: 'mock', model: 'mock' },
    };

    deps.agentManager.getAgent.mockImplementation((type) => {
      if (type === 'assessment') return mockAssessment;
      if (type === 'learning') return mockLearning;
      if (type === 'tutoring') return mockTutoring;
      return mockLearning;
    });

    const graph = createWorkflowGraph(deps);
    const stream = await graph.stream(
      { messages: [new HumanMessage('Hi')], topic: 'Topic' },
      { configurable: { thread_id: 's1' }, streamMode: 'updates' as const },
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const payload = extractInterrupt(evt) as any;
        // With interactive TEACH, first interrupt is from teaching phase
        expect(payload?.prompt).toContain('Teach content');
        expect(payload?.prompt).toContain('questions');
        break;
      }
    }
    expect(gotInterrupt).toBe(true);
  });

});
