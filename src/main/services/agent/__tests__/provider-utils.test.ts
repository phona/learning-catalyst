import { describe, expect, it, vi } from 'vitest';
import { resolveProviderSettings } from '../provider-utils';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { IPCErrorPayload } from '@/shared/types/ipc-error';
import { AppConfig } from '@/shared/types';

const createConfigService = (config: Partial<AppConfig>): ConfigService => ({
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
    const service = createConfigService({ ai: { providers: { openai: { providerType: 'openai' } } } });

    const errorPromise = resolveProviderSettings(service);
    await expect(errorPromise).rejects.toMatchObject({
      type: 'CONFIG_ERROR',
      code: IPC_ERROR_CODES.provider.chatMissing,
    });
  });

  it('throws when provider config is missing', async () => {
    const service = createConfigService({
      ai: {
        providers: {},
        modelTypes: {
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
      code: IPC_ERROR_CODES.provider.missingConfig,
    });
  });

  it('throws when providerType is missing', async () => {
    const service = createConfigService({
      ai: {
        providers: {
          openai: {
            apiKey: 'test-key',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        },
      },
    });

    const errorPromise = resolveProviderSettings(service);
    await expect(errorPromise).rejects.toMatchObject({
      code: IPC_ERROR_CODES.provider.missingProviderType,
    });
  });

  it('returns settings when provider has an API key', async () => {
    const service = createConfigService({
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com/v1',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.5,
            maxTokens: 2048,
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

  it('allows empty API key and returns settings', async () => {
    const service = createConfigService({
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: '',
            baseUrl: 'https://api.openai.com/v1',
          },
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4o',
          },
        },
      },
    });

    const settings = await resolveProviderSettings(service);
    expect(settings.apiKey).toBe('');
    expect(settings.providerName).toBe('openai');
  });
});
