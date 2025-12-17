/**
 * Test to verify the rerank configuration fix
 *
 * This test demonstrates that the timeout issue was caused by
 * getRerankModel() looking for ai.providers.rerank instead of
 * ai.modelTypes.rerank.provider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProviderFactory } from '@/main/services/agent/provider-factory';
import { createConfigService } from '@/main/services/core/config/config-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderConfig } from '@/shared/types/config';

describe('Rerank Configuration Fix', () => {
  let configService: ConfigService;
  let providerFactory: ReturnType<typeof createProviderFactory>;

  beforeEach(() => {
    configService = createConfigService({
      get: vi.fn().mockImplementation(() => Promise.resolve(undefined)),
      set: vi.fn(),
      getConfig: vi.fn().mockImplementation(() => Promise.resolve({})),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    providerFactory = createProviderFactory(configService);
  });

  it('should properly look up rerank config from ai.modelTypes.rerank', async () => {
    // Arrange: Configure rerank model type properly
    const mockConfig = {
      ai: {
        providers: {
          siliconflow: {
            providerType: 'siliconflow',
            apiKey: 'sk-test-key',
            baseUrl: 'https://api.siliconflow.cn/v1',
            model: 'BAAI/bge-reranker-v2-m3',
          } as ProviderConfig,
        },
        modelTypes: {
          rerank: {
            provider: 'siliconflow',
            model: 'BAAI/bge-reranker-v2-m3',
          },
        },
      },
    };

    configService.getConfig = vi.fn().mockResolvedValue(mockConfig);
    configService.get = vi.fn().mockImplementation((path: string) => {
      if (path === 'ai.providers.siliconflow') {
        return Promise.resolve(mockConfig.ai.providers.siliconflow);
      }
      return Promise.resolve(undefined);
    });

    // Act: Get rerank model
    const rerankModel = await providerFactory.getRerankModel();

    // Assert: Should not throw error and return properly configured model
    expect(rerankModel).toBeDefined();
    expect(typeof rerankModel.rerank).toBe('function');
  });

  it('should throw clear error when rerank config is missing', async () => {
    // Arrange: No rerank configuration
    const mockConfig = {
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: 'sk-test-key',
          } as ProviderConfig,
        },
        modelTypes: {
          chat: {
            provider: 'openai',
            model: 'gpt-4',
          },
        },
      },
    };

    configService.getConfig = vi.fn().mockResolvedValue(mockConfig);

    // Act & Assert: Should throw clear error message
    await expect(providerFactory.getRerankModel()).rejects.toThrow(
      'Rerank config missing. Set ai.modelTypes.rerank'
    );
  });

  it('should throw clear error when rerank provider is not configured', async () => {
    // Arrange: Rerank points to non-existent provider
    const mockConfig = {
      ai: {
        providers: {
          openai: {
            providerType: 'openai',
            apiKey: 'sk-test-key',
          } as ProviderConfig,
        },
        modelTypes: {
          rerank: {
            provider: 'nonexistent',
            model: 'gpt-4',
          },
        },
      },
    };

    configService.getConfig = vi.fn().mockResolvedValue(mockConfig);

    // Act & Assert: Should throw clear error message
    await expect(providerFactory.getRerankModel()).rejects.toThrow(
      'Provider "nonexistent" not found in ai.providers'
    );
  });
});
