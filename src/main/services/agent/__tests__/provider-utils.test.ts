import { describe, expect, it, vi } from 'vitest';
import { resolveProviderSettings } from '../provider-utils';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';

const createConfigService = (config: unknown): ConfigService => ({
  getConfig: vi.fn().mockResolvedValue(config),
  setConfig: vi.fn(),
  getProviderConfig: vi.fn(),
  setProviderConfig: vi.fn(),
  onConfigChanged: vi.fn().mockReturnValue(() => undefined),
  get: vi.fn() as any, // Added missing property
  isSetupComplete: vi.fn().mockResolvedValue(true), // Added missing property
});

describe('resolveProviderSettings', () => {
  it('throws a structured error when chat config is missing', async () => {
    const service = createConfigService({ ai: {} });

    const errorPromise = resolveProviderSettings(service);
    await expect(errorPromise).rejects.toMatchObject({
      type: 'CONFIG_ERROR',
      code: 'provider.config.chat_missing',
      needsSetup: true,
    });
  });

  it('throws when provider config and fallback api key are missing', async () => {
    const service = createConfigService({
      ai: {
        providers: {},
        model_types: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        },
      },
    });

    const errorPromise = resolveProviderSettings(service);
    await expect(errorPromise).rejects.toMatchObject({
      type: 'CONFIG_ERROR',
      code: 'provider.config.missing',
      needsSetup: true,
    });
  });

  it('returns settings when provider has an API key', async () => {
    const service = createConfigService({
      ai: {
        providers: {
          openai: {
            provider_type: 'openai',
            api_key: 'test-key',
            base_url: 'https://api.openai.com/v1',
          },
        },
        model_types: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.5,
            max_tokens: 2048,
          },
        },
      },
    });

    const settings = await resolveProviderSettings(service);
    expect(settings.apiKey).toBe('test-key');
    expect(settings.providerName).toBe('openai');
    expect(settings.model).toBe('gpt-4o');
    expect(settings.temperature).toBe(0.5);
    expect(settings.baseUrl).toBe('https://api.openai.com/v1');
  });
});
