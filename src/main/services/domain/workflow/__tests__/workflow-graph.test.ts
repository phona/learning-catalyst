import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createWorkflowGraph, isInterruptEvent, extractInterrupt } from '../index';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const makeCheckpointer = () => new MemorySaver();

const makeDeps = () => {
  // Create a proper agent manager mock that matches the real interface
  const createMockAgent = (content: string) => ({
    invoke: vi.fn().mockResolvedValue({
      messages: [{ role: 'assistant', content }],
    }),
    providerSettings: { providerName: 'mock', model: 'mock-model' },
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
      model: agent.providerSettings.model,
      provider: agent.providerSettings.providerName,
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
      providerSettings: { providerName: 'mock', model: 'mock' },
    };
    const mockLearning = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Teach content' }],
      }),
      providerSettings: { providerName: 'mock', model: 'mock' },
    };
    const mockTutoring = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Practice prompt' }],
      }),
      providerSettings: { providerName: 'mock', model: 'mock' },
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
        expect(payload?.prompt).toContain('Practice Summary');
        break;
      }
    }
    expect(gotInterrupt).toBe(true);
  });

  it('emits await interrupt on fast-track quiz path with checkpoint id', async () => {
    const deps = makeDeps();

    // Configure specific responses for this test
    const mockAssessment = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Diagnostic quiz prompt' }],
      }),
      providerSettings: { providerName: 'mock', model: 'mock' },
    };
    const mockLearning = {
      invoke: vi.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Score: 95%' }],
      }),
      providerSettings: { providerName: 'mock', model: 'mock' },
    };

    deps.agentManager.getAgent.mockImplementation((type) => {
      if (type === 'assessment') return mockAssessment;
      if (type === 'learning') return mockLearning;
      return mockLearning;
    });

    deps.providerFactory.getModel
      .mockResolvedValueOnce({
        model: {
          invoke: vi.fn().mockResolvedValue({
            content: JSON.stringify({
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
            }),
          }),
        },
      })
      .mockResolvedValueOnce({ model: { invoke: vi.fn().mockResolvedValue({ content: 'Diagnostic quiz prompt' }) } })
      .mockResolvedValueOnce({ model: { invoke: vi.fn().mockResolvedValue({ content: 'Score: 95%' }) } });

    deps.learningService.getPracticeHistory.mockResolvedValue([
      { result: 'pass' },
      { result: 'pass' },
      { result: 'pass' },
      { result: 'pass' },
    ]);

    const graph = createWorkflowGraph(deps);
    const stream = await graph.stream(
      { messages: [new HumanMessage('Start')], topic: 'Math' },
      { configurable: { thread_id: 's2' }, streamMode: 'updates' as const },
    );

    let interruptPayload: any;
    let checkpointId: string | undefined;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        interruptPayload = extractInterrupt(evt);
        checkpointId = (evt as any)?.__interrupt__?.[0]?.checkpoint_id;
        break;
      }
    }
    expect(interruptPayload).toBeDefined();
    expect(interruptPayload.prompt).toContain('Diagnostic quiz prompt');

    const resumeStream = await graph.stream(
      new Command({ resume: { answer: '42' } }),
      { configurable: { thread_id: 's2', checkpoint_id: checkpointId }, streamMode: 'updates' as const },
    );
    for await (const _ of resumeStream) {}
  });
});
