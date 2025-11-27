import { describe, it, expect, vi } from 'vitest';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((cfg) => ({ __cfg: cfg })),
  OpenAIEmbeddings: vi.fn().mockImplementation((cfg) => ({ __cfg: cfg })),
}));

import { createProviderFactory } from '../provider-factory';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { AppConfig } from '@/shared/types';

const makeConfigService = (config: Partial<AppConfig>): ConfigService => ({
  getConfig: vi.fn().mockResolvedValue(config as AppConfig),
  setConfig: vi.fn(),
  getProviderConfig: vi.fn(),
  setProviderConfig: vi.fn(),
  onConfigChanged: vi.fn().mockReturnValue(() => undefined),
  get: vi.fn(async (path: string) => {
    const segments = path.split('.');
    return segments.reduce<any>((acc, key) => (acc ? acc[key] : undefined), config);
  }),
  isSetupComplete: vi.fn().mockResolvedValue(true),
});

describe('provider-factory runtime auth guard', () => {
  it('throws provider.auth.required for remote provider without apiKey', async () => {
    const config: Partial<AppConfig> = {
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: undefined,
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        },
      },
    };
    const factory = createProviderFactory(makeConfigService(config));
    await expect(factory.getModel()).rejects.toMatchObject({
      code: 'provider.auth.required',
    });
  });

  it('allows local provider without apiKey', async () => {
    const config: Partial<AppConfig> = {
      ai: {
        providers: {
          local: {
            providerType: 'local',
            apiKey: undefined,
          },
        },
        modelTypes: {
          chat: {
            provider: 'local',
            model: 'llama-3.1-70b',
          },
        },
      },
    };
    const factory = createProviderFactory(makeConfigService(config));
    const { settings } = await factory.getModel();
    expect(settings.providerType).toBe('local');
    expect(settings.apiKey).toBeUndefined();
  });
});
