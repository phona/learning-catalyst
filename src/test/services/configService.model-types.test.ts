/**
 * Critical Tests for Model Type Configuration
 * Tests the enhanced model type configuration functionality in the ConfigService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '../../services/configService';
import type {
  ModelTypeConfig,
  ModelTestResult,
  ModelValidationResult,
  ProviderModelMapping
} from '../../types/config';

// Mock the electronAPI
const mockElectronAPI = {
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  resetConfig: vi.fn(),
  getUserDataPath: vi.fn(),
  dbSetPath: vi.fn(),
  dbExecuteQuery: vi.fn(),
  dbFetchOne: vi.fn(),
  dbFetchAll: vi.fn()
};

// Setup global window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('ConfigService - Model Type Configuration', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = ConfigService.getInstance();
    vi.clearAllMocks();

    // Mock default config response
    mockElectronAPI.getConfig.mockResolvedValue({
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        streaming: true,
        enable_thinking: true,
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            available_providers: ['openai', 'chatglm', 'deepseek', 'siliconflow'],
            settings: {
              temperature: 0.7,
              max_tokens: 4096,
              top_p: 0.9,
              frequency_penalty: 0,
              presence_penalty: 0
            },
            capabilities: {
              streaming: true,
              thinking: true,
              function_calling: true,
              vision: false,
              max_input_tokens: 16384,
              max_output_tokens: 4096
            }
          },
          embedding: {
            default_provider: 'openai',
            default_model: 'text-embedding-3-small',
            available_providers: ['openai', 'chatglm', 'siliconflow'],
            settings: {
              max_tokens: 8192
            },
            capabilities: {
              streaming: false,
              thinking: false,
              function_calling: false,
              vision: false,
              max_input_tokens: 8192,
              max_output_tokens: 0
            }
          },
          rerank: {
            default_provider: 'siliconflow',
            default_model: 'BAAI/bge-reranker-v2-m3',
            available_providers: ['siliconflow'],
            settings: {
              max_tokens: 512
            },
            capabilities: {
              streaming: false,
              thinking: false,
              function_calling: false,
              vision: false,
              max_input_tokens: 512,
              max_output_tokens: 0
            }
          }
        },
        providers: {
          openai: {
            name: 'OpenAI',
            api_key: 'test-key',
            enabled: true
          },
          chatglm: {
            name: 'ChatGLM',
            api_key: 'test-key',
            enabled: true
          },
          siliconflow: {
            name: 'SiliconFlow',
            api_key: 'test-key',
            enabled: true
          }
        }
      }
    });
  });

  describe('Model Type Configuration Retrieval', () => {
    it('should retrieve chat model type configuration', async () => {
      const chatConfig = await configService.getModelTypeConfig('chat');

      expect(chatConfig).toBeDefined();
      expect(chatConfig.default_provider).toBe('openai');
      expect(chatConfig.default_model).toBe('gpt-3.5-turbo');
      expect(chatConfig.available_providers).toContain('openai');
      expect(chatConfig.available_providers).toContain('chatglm');
      expect(chatConfig.capabilities.streaming).toBe(true);
      expect(chatConfig.capabilities.thinking).toBe(true);
    });

    it('should retrieve embedding model type configuration', async () => {
      const embeddingConfig = await configService.getModelTypeConfig('embedding');

      expect(embeddingConfig).toBeDefined();
      expect(embeddingConfig.default_provider).toBe('openai');
      expect(embeddingConfig.default_model).toBe('text-embedding-3-small');
      expect(embeddingConfig.available_providers).toContain('openai');
      expect(embeddingConfig.capabilities.streaming).toBe(false);
      expect(embeddingConfig.capabilities.thinking).toBe(false);
    });

    it('should retrieve rerank model type configuration', async () => {
      const rerankConfig = await configService.getModelTypeConfig('rerank');

      expect(rerankConfig).toBeDefined();
      expect(rerankConfig.default_provider).toBe('siliconflow');
      expect(rerankConfig.default_model).toBe('BAAI/bge-reranker-v2-m3');
      expect(rerankConfig.available_providers).toEqual(['siliconflow']);
      expect(rerankConfig.capabilities.streaming).toBe(false);
    });

    it('should handle missing configuration gracefully', async () => {
      mockElectronAPI.getConfig.mockResolvedValueOnce(null);

      const config = await configService.getConfig();
      expect(config.ai.model_types.chat).toBeDefined();
      expect(config.ai.model_types.embedding).toBeDefined();
      expect(config.ai.model_types.rerank).toBeDefined();
    });
  });

  describe('Model Type Configuration Updates', () => {
    it('should update chat model type configuration', async () => {
      const newChatConfig: Partial<ModelTypeConfig> = {
        default_provider: 'chatglm',
        default_model: 'glm-4',
        settings: {
          temperature: 0.8,
          max_tokens: 2048
        }
      };

      await configService.setModelTypeConfig('chat', newChatConfig);

      // Verify save was called
      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      expect(savedConfig.ai.model_types.chat.default_provider).toBe('chatglm');
      expect(savedConfig.ai.model_types.chat.default_model).toBe('glm-4');
      expect(savedConfig.ai.model_types.chat.settings.temperature).toBe(0.8);
      expect(savedConfig.ai.model_types.chat.settings.max_tokens).toBe(2048);

      // Ensure other properties are preserved
      expect(savedConfig.ai.model_types.chat.available_providers).toContain('openai');
      expect(savedConfig.ai.model_types.chat.capabilities.streaming).toBe(true);
    });

    it('should update embedding model type configuration', async () => {
      const newEmbeddingConfig: Partial<ModelTypeConfig> = {
        default_provider: 'siliconflow',
        default_model: 'BAAI/bge-large-en-v1.5'
      };

      await configService.setModelTypeConfig('embedding', newEmbeddingConfig);

      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      expect(savedConfig.ai.model_types.embedding.default_provider).toBe('siliconflow');
      expect(savedConfig.ai.model_types.embedding.default_model).toBe('BAAI/bge-large-en-v1.5');
    });

    it('should preserve existing configuration when updating', async () => {
      // First, get the current config
      const originalConfig = await configService.getConfig();
      const originalChatConfig = originalConfig.ai.model_types.chat;

      // Update only one property
      await configService.setModelTypeConfig('chat', {
        default_model: 'gpt-4'
      });

      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      // Check that other properties are preserved
      expect(savedConfig.ai.model_types.chat.default_provider).toBe(originalChatConfig.default_provider);
      expect(savedConfig.ai.model_types.chat.available_providers).toEqual(originalChatConfig.available_providers);
      expect(savedConfig.ai.model_types.chat.capabilities).toEqual(originalChatConfig.capabilities);

      // Check that the updated property is changed
      expect(savedConfig.ai.model_types.chat.default_model).toBe('gpt-4');
    });
  });

  describe('Provider Model Mapping', () => {
    it('should return correct provider model mapping', () => {
      const mapping = configService.getProviderModelMapping();

      expect(mapping).toBeDefined();
      expect(mapping.openai).toBeDefined();
      expect(mapping.chatglm).toBeDefined();
      expect(mapping.deepseek).toBeDefined();
      expect(mapping.siliconflow).toBeDefined();
    });

    it('should contain expected models for OpenAI', () => {
      const mapping = configService.getProviderModelMapping();
      const openaiModels = mapping.openai;

      expect(openaiModels.chat).toContain('gpt-4');
      expect(openaiModels.chat).toContain('gpt-3.5-turbo');
      expect(openaiModels.embedding).toContain('text-embedding-3-small');
      expect(openaiModels.embedding).toContain('text-embedding-3-large');
      expect(openaiModels.rerank).toEqual([]);
    });

    it('should contain expected models for ChatGLM', () => {
      const mapping = configService.getProviderModelMapping();
      const chatglmModels = mapping.chatglm;

      expect(chatglmModels.chat).toContain('glm-4');
      expect(chatglmModels.chat).toContain('glm-3-turbo');
      expect(chatglmModels.embedding).toContain('embedding-2');
      expect(chatglmModels.rerank).toEqual([]);
    });

    it('should contain expected models for SiliconFlow', () => {
      const mapping = configService.getProviderModelMapping();
      const siliconflowModels = mapping.siliconflow;

      expect(siliconflowModels.chat).toContain('deepseek-ai/DeepSeek-V3');
      expect(siliconflowModels.embedding).toContain('BAAI/bge-large-en-v1.5');
      expect(siliconflowModels.rerank).toContain('BAAI/bge-reranker-v2-m3');
    });
  });

  describe('Model Configuration Validation', () => {
    it('should validate correct model configuration', async () => {
      const result = await configService.validateModelConfiguration(
        'openai',
        'gpt-3.5-turbo',
        'chat'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.tested_capabilities).toContain('streaming');
      expect(result.tested_capabilities).toContain('thinking');
      expect(result.tested_capabilities).toContain('function_calling');
    });

    it('should detect missing provider configuration', async () => {
      const result = await configService.validateModelConfiguration(
        'nonexistent',
        'gpt-3.5-turbo',
        'chat'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider nonexistent is not configured');
    });

    it('should detect missing API key', async () => {
      // Mock a provider config without API key
      mockElectronAPI.getConfig.mockResolvedValueOnce({
        ai: {
          providers: {
            openai: {
              name: 'OpenAI',
              api_key: '',
              enabled: true
            }
          },
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-3.5-turbo',
              available_providers: ['openai'],
              settings: {},
              capabilities: {}
            }
          }
        }
      });

      const result = await configService.validateModelConfiguration(
        'openai',
        'gpt-3.5-turbo',
        'chat'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    it('should detect unavailable model', async () => {
      const result = await configService.validateModelConfiguration(
        'openai',
        'nonexistent-model',
        'chat'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model nonexistent-model is not available for provider openai');
    });

    it('should generate warnings for incompatible provider-model combinations', async () => {
      // Test with a provider that's not in the available_providers list for embedding
      const result = await configService.validateModelConfiguration(
        'openai',
        'gpt-3.5-turbo',
        'rerank'
      );

      expect(result.errors).toContain('Model gpt-3.5-turbo is not available for provider openai');
    });
  });

  describe('Model Testing', () => {
    beforeEach(() => {
      // Mock current time
      vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    });

    it('should test model successfully', async () => {
      const result = await configService.testModel('openai', 'gpt-3.5-turbo', 'chat');

      expect(result.status).toBe('success');
      expect(result.model_id).toBe('gpt-3.5-turbo');
      expect(result.provider).toBe('openai');
      expect(result.model_type).toBe('chat');
      expect(result.response_time_ms).toBeGreaterThan(0);
      expect(result.test_timestamp).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(result.capabilities_tested).toContain('streaming');
      expect(result.capabilities_tested).toContain('thinking');
      expect(result.capabilities_tested).toContain('function_calling');
    });

    it('should handle model test failure', async () => {
      // Mock a failed API call
      const originalTestModel = configService.testModel;
      configService.testModel = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await configService.testModel('openai', 'gpt-3.5-turbo', 'chat');

      expect(result.status).toBe('error');
      expect(result.error_message).toBe('Network error');
      expect(result.model_id).toBe('gpt-3.5-turbo');
      expect(result.provider).toBe('openai');
      expect(result.model_type).toBe('chat');

      // Restore original method
      configService.testModel = originalTestModel;
    });

    it('should save test results to configuration', async () => {
      await configService.testModel('openai', 'gpt-3.5-turbo', 'chat');

      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      expect(savedConfig.ai.metadata).toBeDefined();
      expect(savedConfig.ai.metadata.model_tests).toBeDefined();
      expect(savedConfig.ai.metadata.model_tests).toHaveLength(1);

      const testResult = savedConfig.ai.metadata.model_tests[0];
      expect(testResult.model_id).toBe('gpt-3.5-turbo');
      expect(testResult.status).toBe('success');
    });

    it('should retrieve model test results', async () => {
      // Mock existing test results
      mockElectronAPI.getConfig.mockResolvedValueOnce({
        ai: {
          metadata: {
            model_tests: [
              {
                model_id: 'gpt-3.5-turbo',
                provider: 'openai',
                model_type: 'chat',
                status: 'success',
                response_time_ms: 150,
                test_timestamp: new Date('2025-01-01T00:00:00.000Z'),
                capabilities_tested: ['streaming', 'thinking']
              }
            ]
          }
        }
      });

      const results = await configService.getModelTestResults();

      expect(results).toHaveLength(1);
      expect(results[0].model_id).toBe('gpt-3.5-turbo');
      expect(results[0].provider).toBe('openai');
      expect(results[0].status).toBe('success');
    });

    it('should replace existing test results for the same model', async () => {
      // Mock existing test results
      mockElectronAPI.getConfig.mockResolvedValueOnce({
        ai: {
          metadata: {
            model_tests: [
              {
                model_id: 'gpt-3.5-turbo',
                provider: 'openai',
                model_type: 'chat',
                status: 'success',
                response_time_ms: 150,
                test_timestamp: new Date('2025-01-01T00:00:00.000Z')
              }
            ]
          }
        }
      });

      await configService.testModel('openai', 'gpt-3.5-turbo', 'chat');

      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      // Should replace the existing test result, not add a duplicate
      expect(savedConfig.ai.metadata.model_tests).toHaveLength(1);
      expect(savedConfig.ai.metadata.model_tests[0].response_time_ms).not.toBe(150); // Should be new test result
    });
  });

  describe('Optimal Model Selection', () => {
    it('should return optimal model for chat task', async () => {
      const result = await configService.getOptimalModel('chat');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
      expect(result!.model).toBe('gpt-3.5-turbo');
    });

    it('should return optimal model for embedding task', async () => {
      const result = await configService.getOptimalModel('embedding');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
      expect(result!.model).toBe('text-embedding-3-small');
    });

    it('should return optimal model for rerank task', async () => {
      const result = await configService.getOptimalModel('rerank');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('siliconflow');
      expect(result!.model).toBe('BAAI/bge-reranker-v2-m3');
    });

    it('should prefer fast models when speed requirement is specified', async () => {
      const result = await configService.getOptimalModel('chat', {
        speed: 'fast'
      });

      expect(result).not.toBeNull();
      // Should prefer models with 'turbo', 'fast', or 'air' in the name
      expect(['gpt-4-turbo', 'gpt-3.5-turbo-16k']).toContain(result!.model);
    });

    it('should prefer quality models when quality requirement is specified', async () => {
      const result = await configService.getOptimalModel('chat', {
        speed: 'quality'
      });

      expect(result).not.toBeNull();
      // Should prefer higher quality models
      expect(['gpt-4', 'gpt-4-turbo']).toContain(result!.model);
    });

    it('should return null when no models are available', async () => {
      // Mock config with no available models
      mockElectronAPI.getConfig.mockResolvedValueOnce({
        ai: {
          model_types: {
            chat: {
              default_provider: 'nonexistent',
              default_model: 'nonexistent-model',
              available_providers: [],
              settings: {},
              capabilities: {}
            }
          }
        }
      });

      const result = await configService.getOptimalModel('chat');

      expect(result).toBeNull();
    });
  });

  describe('Configuration Validation Errors', () => {
    it('should detect invalid model type configuration', async () => {
      const invalidConfigs = [
        { model_types: null },
        { model_types: 'invalid' },
        { model_types: {} },
        { model_types: { chat: null } },
        { model_types: { chat: 'invalid' } },
        { model_types: { chat: { default_provider: null } } },
        { model_types: { chat: { default_provider: 123 } } },
        { model_types: { chat: { default_provider: 'openai', default_model: null } } },
        { model_types: { chat: { default_provider: 'openai', default_model: 'gpt-3.5-turbo', available_providers: 'invalid' } } },
        { model_types: { chat: { default_provider: 'openai', default_model: 'gpt-3.5-turbo', available_providers: [], settings: 'invalid' } } }
      ];

      for (const invalidConfig of invalidConfigs) {
        mockElectronAPI.getConfig.mockResolvedValueOnce({
          ai: invalidConfig
        });

        const config = await configService.getConfig();
        const validation = configService.validateConfig(config);

        expect(validation.valid).toBe(false);
      }
    });

    it('should validate temperature range', async () => {
      const invalidTemps = [-1, -0.1, 2.1, 10];

      for (const temp of invalidTemps) {
        mockElectronAPI.getConfig.mockResolvedValueOnce({
          ai: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            temperature: temp,
            model_types: {
              chat: {
                default_provider: 'openai',
                default_model: 'gpt-3.5-turbo',
                available_providers: ['openai'],
                settings: {},
                capabilities: {}
              }
            }
          }
        });

        const config = await configService.getConfig();
        const validation = configService.validateConfig(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.field === 'ai.temperature')).toBe(true);
      }
    });

    it('should validate theme values', async () => {
      const invalidThemes = ['invalid', 'light-mode', 'dark_mode'];

      for (const theme of invalidThemes) {
        mockElectronAPI.getConfig.mockResolvedValueOnce({
          ai: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            model_types: {
              chat: {
                default_provider: 'openai',
                default_model: 'gpt-3.5-turbo',
                available_providers: ['openai'],
                settings: {},
                capabilities: {}
              }
            }
          },
          ui: {
            theme: theme
          }
        });

        const config = await config.getConfig();
        const validation = configService.validateConfig(config);

        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.field === 'ui.theme')).toBe(true);
      }
    });
  });
});