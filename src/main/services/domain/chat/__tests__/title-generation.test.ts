import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import { generateAITitle } from '../title-generation';

describe('generateAITitle', () => {
  const createDeps = (llmOutput: unknown) => {
    const llm = new RunnableLambda({
      func: async () => llmOutput,
    });

    const providerFactory = {
      getModel: vi.fn(async () => llm),
    } as unknown as ProviderFactory;

    const loggerService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => loggerService),
    } as unknown as LoggerService;

    return { providerFactory, loggerService };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns raw string when model output is a string', async () => {
    const deps = createDeps('My Title');
    const title = await generateAITitle('  hello world  ', deps);
    expect(title).toBe('My Title');
  });

  it('joins array content strings and text parts', async () => {
    const deps = createDeps({
      content: ['A', { text: 'B' }, { other: 'ignored' }],
    });

    const title = await generateAITitle('topic', deps);
    expect(title).toBe('AB');
  });

  it('returns stringified content when content is a string', async () => {
    const deps = createDeps({ content: 'Understanding Closures' });
    const title = await generateAITitle('topic', deps);
    expect(title).toBe('Understanding Closures');
  });

  it('falls back to empty string for nullish content', async () => {
    const deps1 = createDeps({ content: null });
    const deps2 = createDeps({ content: undefined });

    await expect(generateAITitle('topic', deps1)).resolves.toBe('');
    await expect(generateAITitle('topic', deps2)).resolves.toBe('');
  });
});

