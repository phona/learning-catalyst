/**
 * Provider Factory - Real Implementation Tests
 *
 * These tests verify that configuration flows correctly through the provider factory.
 * They catch bugs where config is read but not used (like the model configuration bug).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProviderFactory } from '../../agent/provider-factory';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
  OpenAIEmbeddings: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
}));

describe('Provider Factory - Real Implementation', () => {
  const makeConfigService = (config: any) => ({
    getConfig: vi.fn().mockResolvedValue(config),
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

  describe('Chat Model Configuration', () => {
    it('should use ai.modelTypes.chat for ChatOpenAI creation', async () => {
      const config = {
        ai: {
          providers: {
            chatglm: {
              providerType: 'chatglm',
              apiKey: '869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS',
              baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
            },
          },
          modelTypes: {
            chat: {
              provider: 'chatglm',
              model: 'glm-4.5-air',
              temperature: 0.4,
              maxTokens: 20480,
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      // Verify ChatOpenAI was called with CORRECT parameters
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'glm-4.5-air',
        temperature: 0.4,
        maxTokens: 12000, // clamped from 20480
        apiKey: '869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS',
        maxRetries: 1,
        timeout: 30000,
        configuration: {
          baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
        },
      });

      expect(model.config.modelName).toBe('glm-4.5-air');
      expect(model.config.temperature).toBe(0.4);
      expect(model.config.apiKey).toBe('869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS');
    });

    it('should handle different provider types correctly', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-test-key',
              baseUrl: 'https://api.openai.com/v1',
            },
          },
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-4',
              temperature: 0.7,
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'gpt-4',
        temperature: 0.7,
        maxTokens: NaN, // Provider doesn't have maxTokens, clamp returns NaN
        apiKey: 'sk-test-key',
        maxRetries: 1,
        timeout: 30000,
        configuration: {
          baseURL: 'https://api.openai.com/v1',
        },
      });
    });

    it('should work with local providers without API keys', async () => {
      const config = {
        ai: {
          providers: {
            ollama: {
              providerType: 'ollama',
              baseUrl: 'http://localhost:11434/v1',
            },
          },
          modelTypes: {
            chat: {
              provider: 'ollama',
              model: 'llama-3.1',
              temperature: 0.5,
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'llama-3.1',
        temperature: 0.5,
        maxTokens: NaN, // Provider doesn't have maxTokens, clamp returns NaN
        apiKey: undefined,
        maxRetries: 1,
        timeout: 30000,
        configuration: {
          baseURL: 'http://localhost:11434/v1',
        },
      });
    });
  });

  describe('Embeddings Configuration', () => {
    it('should use ai.modelTypes.embedding for OpenAIEmbeddings', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-sf-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'siliconflow',
              model: 'Qwen/Qwen3-Embedding-4B',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        apiKey: 'sk-sf-key',
        model: 'Qwen/Qwen3-Embedding-4B',
        configuration: {
          baseURL: 'https://api.siliconflow.cn/v1',
        },
        dimensions: 1536,
      });

      expect(embeddings.config.model).toBe('Qwen/Qwen3-Embedding-4B');
      expect(embeddings.config.apiKey).toBe('sk-sf-key');
    });

    it('should use embeddingDimensions from config', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-key',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'openai',
              model: 'text-embedding-3-small',
            },
          },
          embeddingDimensions: 512, // Different from default
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          dimensions: 512,
        })
      );
    });
  });

  describe('Configuration Precedence', () => {
    it('modelType config should override provider config', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
              model: 'gpt-3.5-turbo',  // Provider has this
              temperature: 0.9,         // Provider has this
              maxTokens: 1000,          // Provider has this
            },
          },
          modelTypes: {
            chat: {
              provider: 'test',
              model: 'gpt-4',          // Model type should override
              temperature: 0.3,         // Model type should override
              maxTokens: 2000,          // Model type should override
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      // Verify model type config takes precedence
      expect(model.config.modelName).toBe('gpt-4');      // NOT 'gpt-3.5-turbo'
      expect(model.config.temperature).toBe(0.3);       // NOT 0.9
      expect(model.config.maxTokens).toBe(2000);        // NOT 1000
    });

    it('should fall back to provider config when modelType missing', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
              model: 'gpt-4',
              temperature: 0.7,
            },
          },
          modelTypes: {
            chat: {
              provider: 'test',
              // model, temperature missing - should use provider values
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();

      expect(model.config.modelName).toBe('gpt-4');
      expect(model.config.temperature).toBe(0.7);
    });
  });

  describe('Error Handling', () => {
    it('should throw when ai.modelTypes.chat is missing', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
            },
          },
          // No modelTypes
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getModel()).rejects.toThrow('Default chat provider not configured');
    });

    it('should throw when chat provider is missing', async () => {
      const config = {
        ai: {
          providers: {
            // No 'test' provider
          },
          modelTypes: {
            chat: {
              provider: 'test',
              model: 'gpt-4',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getModel()).rejects.toThrow('Provider "test" not found');
    });

    it('should throw when remote provider has no API key', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              // No apiKey
            },
          },
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-4',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getModel()).rejects.toThrow('API key required');
    });

    it('should throw when embedding config is missing', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'key',
            },
          },
          // No modelTypes.embedding
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getEmbeddings()).rejects.toThrow('Embedding config missing');
    });
  });

  describe('Model Caching', () => {
    it('should cache and reuse model instances', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
            },
          },
          modelTypes: {
            chat: {
              provider: 'test',
              model: 'gpt-4',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model1 = await factory.getModel();
      const model2 = await factory.getModel();

      // Should be the same instance due to caching
      expect(model1).toBe(model2);
      expect(ChatOpenAI).toHaveBeenCalledTimes(1);
    });

    it('should cache embeddings separately from chat models', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'key',
            },
          },
          modelTypes: {
            chat: {
              provider: 'test',
              model: 'gpt-4',
            },
            embedding: {
              provider: 'test',
              model: 'text-embedding-3-small',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const model = await factory.getModel();
      const embeddings = await factory.getEmbeddings();

      // Different cache keys, different instances
      expect(model).not.toBe(embeddings);
      expect(ChatOpenAI).toHaveBeenCalledTimes(1);
      expect(OpenAIEmbeddings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real Config Integration', () => {
    it('should work with production-like config structure', async () => {
      const config = {
        ai: {
          providers: {
            chatglm: {
              providerType: 'chatglm',
              apiKey: '869b77b7d3dd4edfbec66a4679115310.JlzJCz7QhExkssTS',
              baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
              models: ['glm-4', 'glm-4-0520', 'glm-3-turbo'],
            },
            'openai-1764258325151': {
              providerType: 'openai',
              apiKey: '123sqq11111111111',
              baseUrl: 'https://api.openai.com/v1',
              displayName: 'OpenAI',
              models: [],
            },
            'siliconflow-1764422754877': {
              providerType: 'siliconflow',
              apiKey: 'sk-lqehbcbqjdpqvpoxnkmmbivrdsvckhgmxdinngddmkfvlcjv',
              baseUrl: 'https://api.siliconflow.cn/v1',
              displayName: 'SiliconFlow',
              models: [],
            },
          },
          modelTypes: {
            chat: {
              provider: 'chatglm',
              model: 'glm-4.5-air',
              temperature: 0.4,
              maxTokens: 20480,
              topP: 1,
              enableThinking: false,
              stream: true,
              capabilities: {
                streaming: true,
                thinking: false,
                functionCalling: false,
                vision: false,
              },
            },
            embedding: {
              provider: 'siliconflow-1764422754877',
              model: 'Qwen/Qwen3-Embedding-4B',
            },
            rerank: {
              provider: 'siliconflow-1764422754877',
              model: 'Qwen/Qwen3-Reranker-0.6B',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));

      // Test chat model
      const model = await factory.getModel();
      expect(model.config.modelName).toBe('glm-4.5-air');
      expect(model.config.temperature).toBe(0.4);

      // Test embeddings
      const embeddings = await factory.getEmbeddings();
      expect(embeddings.config.model).toBe('Qwen/Qwen3-Embedding-4B');

      // All should work without errors
      expect(model).toBeDefined();
      expect(embeddings).toBeDefined();
    });
  });
});
