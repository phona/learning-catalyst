import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@/services/configService';
import { ModelType } from '@/types/ai';
import type { ConfigAPI } from '@/types/electron-api';
import type { ModelTypeConfig } from '@/types/config';

// Mock the electron API
const mockConfigAPI: ConfigAPI = {
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  resetConfig: vi.fn(),
} as any;

describe('ConfigService Model Reload Callbacks', () => {
  let configService: ConfigService;
  let mockCallback: vi.MockedFunction<(modelType: ModelType, config: ModelTypeConfig) => void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    configService = new ConfigService(mockConfigAPI);
    mockCallback = vi.fn();

    // Mock default config
    (mockConfigAPI.getConfig as any).mockResolvedValue({
      ai: {
        providers: {},
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            available_providers: ['openai', 'chatglm'],
            settings: { temperature: 0.7 },
            capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
          }
        }
      }
    });

    // Pre-load config to avoid null issues
    await configService.getConfig();
  });

  it('should register callback for model changes', () => {
    configService.onCurrentModelChanged(mockCallback);

    // Update model type config should trigger callback
    const testConfig: ModelTypeConfig = {
      default_provider: 'chatglm',
      default_model: 'glm-4',
      available_providers: ['chatglm'],
      settings: { temperature: 0.5 },
      capabilities: { streaming: true, thinking: true, function_calling: false, vision: false }
    };

    return configService.updateModelTypeConfig(ModelType.CHAT, testConfig).then(() => {
      expect(mockCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
      expect(mockConfigAPI.setConfig).toHaveBeenCalled();
    });
  });

  it('should validate model type configuration', async () => {
    configService.onCurrentModelChanged(mockCallback);

    // Test missing default provider
    const invalidConfig1 = {
      default_model: 'test-model',
      available_providers: ['openai'],
      settings: {},
      capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
    } as any;

    await expect(configService.updateModelTypeConfig(ModelType.CHAT, invalidConfig1))
      .rejects.toThrow('Default provider is required');

    // Test missing default model
    const invalidConfig2 = {
      default_provider: 'openai',
      available_providers: ['openai'],
      settings: {},
      capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
    } as any;

    await expect(configService.updateModelTypeConfig(ModelType.CHAT, invalidConfig2))
      .rejects.toThrow('Default model is required');
  });

  it('should handle callback errors gracefully', async () => {
    const errorCallback = vi.fn().mockRejectedValue(new Error('Callback error'));
    configService.onCurrentModelChanged(errorCallback);

    const testConfig: ModelTypeConfig = {
      default_provider: 'openai',
      default_model: 'gpt-4',
      available_providers: ['openai'],
      settings: {},
      capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
    };

    // Should not throw even if callback fails
    await expect(configService.updateModelTypeConfig(ModelType.CHAT, testConfig))
      .resolves.not.toThrow();

    expect(errorCallback).toHaveBeenCalled();
    expect(mockConfigAPI.setConfig).toHaveBeenCalled();
  });

  it('should support multiple callbacks', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const thirdCallback = vi.fn();

    configService.onCurrentModelChanged(firstCallback);
    configService.onCurrentModelChanged(secondCallback);
    configService.onCurrentModelChanged(thirdCallback);

    const testConfig: ModelTypeConfig = {
      default_provider: 'openai',
      default_model: 'gpt-4',
      available_providers: ['openai'],
      settings: {},
      capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
    };

    return configService.updateModelTypeConfig(ModelType.CHAT, testConfig).then(() => {
      expect(firstCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
      expect(secondCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
      expect(thirdCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
    });
  });

  it('should allow removing specific callbacks', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const thirdCallback = vi.fn();

    configService.onCurrentModelChanged(firstCallback);
    configService.onCurrentModelChanged(secondCallback);
    configService.onCurrentModelChanged(thirdCallback);

    // Remove only the second callback
    configService.offCurrentModelChanged(secondCallback);

    const testConfig: ModelTypeConfig = {
      default_provider: 'openai',
      default_model: 'gpt-4',
      available_providers: ['openai'],
      settings: {},
      capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
    };

    return configService.updateModelTypeConfig(ModelType.CHAT, testConfig).then(() => {
      expect(firstCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
      expect(secondCallback).not.toHaveBeenCalled();
      expect(thirdCallback).toHaveBeenCalledWith(ModelType.CHAT, testConfig);
    });
  });
});