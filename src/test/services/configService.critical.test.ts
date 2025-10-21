/**
 * Critical Tests for Model Type Configuration
 * Focuses on the essential functionality that must work correctly
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

describe('ConfigService - Critical Functionality', () => {
  let configService: ConfigService;

  beforeEach(() => {
    // Reset the singleton instance to ensure clean test state
    (ConfigService as any).instance = null;
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
        context_window_size: 10,
        providers: {
          openai: {
            name: 'OpenAI',
            api_key: 'test-key',
            enabled: true
          }
        },
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            available_providers: ['openai'],
            settings: {
              temperature: 0.7,
              max_tokens: 4096
            },
            capabilities: {
              streaming: true,
              thinking: true,
              function_calling: true
            }
          },
          embedding: {
            default_provider: 'openai',
            default_model: 'text-embedding-3-small',
            available_providers: ['openai'],
            settings: {
              max_tokens: 8192
            },
            capabilities: {
              streaming: false,
              thinking: false
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
              thinking: false
            }
          }
        }
      }
    });
  });

  describe('Core Model Type Configuration', () => {
    it('should retrieve chat model type configuration', async () => {
      const chatConfig = await configService.getModelTypeConfig('chat');

      expect(chatConfig).toBeDefined();
      expect(chatConfig.default_provider).toBe('openai');
      expect(chatConfig.default_model).toBe('gpt-3.5-turbo');
      expect(chatConfig.available_providers).toContain('openai');
      expect(chatConfig.capabilities.streaming).toBe(true);
    });

    it('should retrieve embedding model type configuration', async () => {
      const embeddingConfig = await configService.getModelTypeConfig('embedding');

      expect(embeddingConfig).toBeDefined();
      expect(embeddingConfig.default_provider).toBe('openai');
      expect(embeddingConfig.default_model).toBe('text-embedding-3-small');
      expect(embeddingConfig.available_providers).toContain('openai');
      expect(embeddingConfig.capabilities.streaming).toBe(false);
    });

    it('should retrieve rerank model type configuration', async () => {
      const rerankConfig = await configService.getModelTypeConfig('rerank');

      expect(rerankConfig).toBeDefined();
      expect(rerankConfig.default_provider).toBe('siliconflow');
      expect(rerankConfig.default_model).toBe('BAAI/bge-reranker-v2-m3');
      expect(rerankConfig.available_providers).toEqual(['siliconflow']);
    });
  });

  describe('Provider Model Mapping', () => {
    it('should return correct provider model mapping structure', () => {
      const mapping = configService.getProviderModelMapping();

      expect(mapping).toBeDefined();
      expect(mapping.openai).toBeDefined();
      expect(mapping.chatglm).toBeDefined();
      expect(mapping.deepseek).toBeDefined();
      expect(mapping.siliconflow).toBeDefined();

      // Check that each provider has the expected structure
      expect(mapping.openai).toHaveProperty('chat');
      expect(mapping.openai).toHaveProperty('embedding');
      expect(mapping.openai).toHaveProperty('rerank');

      // Check that chat models are arrays
      expect(Array.isArray(mapping.openai.chat)).toBe(true);
      expect(Array.isArray(mapping.openai.embedding)).toBe(true);
      expect(Array.isArray(mapping.openai.rerank)).toBe(true);
    });

    it('should contain expected models for OpenAI', () => {
      const mapping = configService.getProviderModelMapping();
      const openaiModels = mapping.openai;

      expect(openaiModels.chat).toContain('gpt-4');
      expect(openaiModels.chat).toContain('gpt-3.5-turbo');
      expect(openaiModels.embedding).toContain('text-embedding-3-small');
      expect(openaiModels.embedding).toContain('text-embedding-ada-002');
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

  describe('Model Configuration Updates', () => {
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
      expect(result.response_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.test_timestamp).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(result.capabilities_tested).toContain('streaming');
      expect(result.capabilities_tested).toContain('thinking');
      expect(result.capabilities_tested).toContain('function_calling');
    });

    it('should save test results to configuration', async () => {
      await configService.testModel('openai', 'gpt-3.5-turbo', 'chat');

      expect(mockElectronAPI.setConfig).toHaveBeenCalledTimes(1);
      const savedConfig = mockElectronAPI.setConfig.mock.calls[0][0];

      expect(savedConfig.ai.metadata).toBeDefined();
      expect(savedConfig.ai.metadata.model_tests).toBeDefined();
      expect(Array.isArray(savedConfig.ai.metadata.model_tests)).toBe(true);

      const testResult = savedConfig.ai.metadata.model_tests.find((test: any) =>
        test.model_id === 'gpt-3.5-turbo' && test.provider === 'openai'
      );

      expect(testResult).toBeDefined();
      expect(testResult.status).toBe('success');
    });
  });

  describe('Optimal Model Selection', () => {
    it('should return optimal model for chat task', async () => {
      const result = await configService.getOptimalModel('chat');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
      expect(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']).toContain(result!.model);
    });

    it('should return optimal model for embedding task', async () => {
      const result = await configService.getOptimalModel('embedding');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
      expect(['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large']).toContain(result!.model);
    });

    it('should return optimal model for rerank task', async () => {
      const result = await configService.getOptimalModel('rerank');

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('siliconflow');
      expect(result!.model).toBe('BAAI/bge-reranker-v2-m3');
    });

    it('should handle cases with no available models gracefully', async () => {
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

  describe('Configuration Structure Validation', () => {
    it('should handle missing configuration gracefully', async () => {
      mockElectronAPI.getConfig.mockResolvedValueOnce(null);

      const config = await configService.getConfig();
      expect(config.ai.model_types.chat).toBeDefined();
      expect(config.ai.model_types.embedding).toBeDefined();
      expect(config.ai.model_types.rerank).toBeDefined();
    });

    it('should merge partial configuration with defaults', async () => {
      mockElectronAPI.getConfig.mockResolvedValueOnce({
        ai: {
          default_provider: 'chatglm',
          model_types: {
            chat: {
              default_provider: 'chatglm',
              default_model: 'glm-4'
            }
          }
        }
      });

      const config = await configService.getConfig();
      expect(config.ai.default_provider).toBe('chatglm');
      expect(config.ai.model_types.chat.default_provider).toBe('chatglm');
      expect(config.ai.model_types.chat.default_model).toBe('glm-4');
      // Other model types should be filled from defaults
      expect(config.ai.model_types.embedding).toBeDefined();
      expect(config.ai.model_types.rerank).toBeDefined();
    });
  });
});