import { describe, it, expect, vi } from 'vitest';
import { createLearningPlannerAgent } from '../learning-planner-agent';
import type { AgentToolDeps } from '../tool-registry';

const createMockDeps = (): AgentToolDeps => ({
  aiService: {} as any,
  conceptParsingService: {} as any,
  learningService: {} as any,
  loggerService: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) } as any,
  configService: {
    get: vi.fn(),
    getConfig: vi.fn().mockResolvedValue({
      ai: {
        modelTypes: {
          chat: { provider: 'openai', model: 'gpt-4o', temperature: 0.4, maxTokens: 2048 },
        },
        providers: {
          openai: { providerType: 'openai', apiKey: 'test-key', baseUrl: '', model: 'gpt-4o' },
        },
      },
      learning: {},
    }),
    getProviderConfig: vi.fn(),
    onConfigChanged: vi.fn(),
  } as any,
  providerFactory: {
    getModel: vi.fn(async () => ({
      model: {} as any,
      settings: { providerName: 'mock', model: 'mock-model' },
    })),
  } as any,
});

describe('learning-planner-agent prompt guard', () => {
  it('should instantiate without throwing', async () => {
    const agent = await createLearningPlannerAgent(createMockDeps());
    expect(agent).toBeDefined();
  });
});
