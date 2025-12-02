import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDomainAgent } from '../domain-agent';

const chatCtor = vi.fn();

vi.mock('langchain', () => ({
  createAgent: vi.fn(() => ({})),
}));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: class {
    constructor(opts: any) {
      chatCtor(opts);
    }
  },
}));

vi.mock('../provider-utils', () => ({
  resolveProviderSettings: vi.fn(async () => ({
    providerName: 'chatglm',
    providerType: 'chatglm',
    model: 'glm-4',
    apiKey: 'key',
    baseUrl: 'http://api',
    temperature: 0.5,
    maxTokens: 2048,
  })),
}));

describe('domain-agent timeout configuration', () => {
  beforeEach(() => {
    chatCtor.mockClear();
  });

  it('uses parsing.chatTimeoutSeconds when provided', async () => {
    const configService: any = {
      get: vi.fn(async (key: string) => {
        if (key === 'parsing') return { chatTimeoutSeconds: 90 };
        if (key === 'performance') return { requestTimeout: 45 };
        return undefined;
      }),
    };

    await createDomainAgent({ configService });

    expect(chatCtor).toHaveBeenCalledWith(expect.objectContaining({ timeout: 90_000 }));
  });

  it('falls back to performance.requestTimeout when parsing timeout is absent', async () => {
    const configService: any = {
      get: vi.fn(async (key: string) => {
        if (key === 'parsing') return undefined;
        if (key === 'performance') return { requestTimeout: 25 };
        return undefined;
      }),
    };

    await createDomainAgent({ configService });

    expect(chatCtor).toHaveBeenCalledWith(expect.objectContaining({ timeout: 25_000 }));
  });
});
