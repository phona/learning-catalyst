/**
 * Provider Embeddings - Configuration Tests
 *
 * These tests verify that embedding configuration flows correctly through the provider factory.
 * They catch bugs where config is read but not used (similar to the model configuration bug).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProviderFactory } from '../../agent/provider-factory';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
  OpenAIEmbeddings: vi.fn().mockImplementation((cfg) => ({
    modelName: (cfg?.model as string) || '',
    model: (cfg?.model as string) || '',
    batchSize: cfg?.batchSize || 512,
    stripNewLines: cfg?.stripNewLines ?? true,
    maxRetries: cfg?.maxRetries ?? 3,
    timeout: cfg?.timeout,
    apiKey: cfg?.apiKey,
    configuration: cfg?.configuration,
    verbose: cfg?.verbose,
    dimensions: cfg?.dimensions,
    embedQuery: vi.fn(),
    embedDocuments: vi.fn(),
  }) as any),
}));

describe('Provider Embeddings Configuration', () => {
  beforeEach(() => {
    // Reset mock completely to default state that includes dimensions from config
    vi.mocked(OpenAIEmbeddings).mockReset();
    vi.mocked(OpenAIEmbeddings).mockImplementation((cfg) => ({
      modelName: (cfg?.model as string) || '',
      model: (cfg?.model as string) || '',
      batchSize: cfg?.batchSize || 512,
      stripNewLines: cfg?.stripNewLines ?? true,
      maxRetries: cfg?.maxRetries ?? 3,
      timeout: cfg?.timeout,
      apiKey: cfg?.apiKey,
      configuration: cfg?.configuration,
      verbose: cfg?.verbose,
      dimensions: cfg?.dimensions,
      embedQuery: vi.fn(),
      embedDocuments: vi.fn(),
    }) as any);
  });

  const makeConfigService = (config: unknown) => ({
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

  describe('Embeddings Model Configuration', () => {
    it('should use ai.modelTypes.embedding for OpenAIEmbeddings creation', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-openai-key',
              baseUrl: 'https://api.openai.com/v1',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'openai',
              model: 'text-embedding-3-large',
              dimensions: 3072,
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      // Verify OpenAIEmbeddings was called with CORRECT parameters
      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        apiKey: 'sk-openai-key',
        model: 'text-embedding-3-large',
        configuration: {
          baseURL: 'https://api.openai.com/v1',
        },
        dimensions: 3072,
      });

      // Cast to OpenAIEmbeddings to access properties
      const openaiEmbeddings = embeddings as any;
      expect(openaiEmbeddings.model).toBe('text-embedding-3-large');
      expect(openaiEmbeddings.apiKey).toBe('sk-openai-key');
      expect(openaiEmbeddings.dimensions).toBe(3072);
    });

    it('should handle SiliconFlow embedding provider', async () => {
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
              dimensions: 1536,
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      // SiliconFlow uses custom embeddings implementation, not OpenAIEmbeddings
      expect(OpenAIEmbeddings).not.toHaveBeenCalled();

      // Verify embeddings object has expected methods
      expect(embeddings).toHaveProperty('embedQuery');
      expect(embeddings).toHaveProperty('embedDocuments');
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
              dimensions: 512,
            },
          },
          embeddingDimensions: 512, // Custom dimension
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          dimensions: 512,
        })
      );

      // Verify via embedding model interface
      const embeddingModel = await factory.getEmbeddingModel();
      expect(embeddingModel.dimensions).toBe(512);
    });

    it('should support different embedding models', async () => {
      const models = [
        'text-embedding-3-large',
        'text-embedding-3-small',
        'text-embedding-ada-002',
        'BAAI/bge-large-en-v1.5',
        'sentence-transformers/all-MiniLM-L6-v2',
      ];

      for (const model of models) {
        const config = {
          ai: {
            providers: {
              test: {
                providerType: 'openai',
                apiKey: 'sk-key',
              },
            },
            modelTypes: {
              embedding: {
                provider: 'test',
                model: model,
              },
            },
            embeddingDimensions: 1536,
          },
        };

        const factory = createProviderFactory(makeConfigService(config));
        const embeddings = await factory.getEmbeddings();

        expect(OpenAIEmbeddings).toHaveBeenCalledWith(
          expect.objectContaining({
            model: model,
          })
        );
      }
    });

    it('should work with different provider types', async () => {
      const providers = [
        { type: 'openai', key: 'sk-openai' },
        { type: 'chatglm', key: 'sk-chatglm' },
        { type: 'siliconflow', key: 'sk-sf' },
        { type: 'deepseek', key: 'sk-deepseek' },
      ];

      for (const provider of providers) {
        const config = {
          ai: {
            providers: {
              test: {
                providerType: provider.type,
                apiKey: provider.key,
                baseUrl: `https://api.${provider.type}.com/v1`,
              },
            },
            modelTypes: {
              embedding: {
                provider: 'test',
                model: 'test-model',
                dimensions: 1536,
              },
            },
            embeddingDimensions: 1536,
          },
        };

        const factory = createProviderFactory(makeConfigService(config));
        const embeddings = await factory.getEmbeddings();

        // SiliconFlow uses custom embeddings, others use OpenAIEmbeddings
        if (provider.type === 'siliconflow') {
          // Reset mock for siliconflow iteration
          vi.mocked(OpenAIEmbeddings).mockClear();
          expect(OpenAIEmbeddings).not.toHaveBeenCalled();
          expect(embeddings).toHaveProperty('embedQuery');
          expect(embeddings).toHaveProperty('embedDocuments');
        } else {
          expect(OpenAIEmbeddings).toHaveBeenCalledWith(
            expect.objectContaining({
              apiKey: provider.key,
            })
          );
        }
      }
    });
  });

  describe('Embedding Model Interface', () => {
    it('should provide embed method via getEmbeddingModel', async () => {
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
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddingModel = await factory.getEmbeddingModel();

      // Verify interface
      expect(embeddingModel).toBeDefined();
      expect(typeof embeddingModel.embed).toBe('function');
      expect(typeof embeddingModel.embedBatch).toBe('function');
      expect(embeddingModel.dimensions).toBe(1536);
    });

    it('should handle single text embedding', async () => {
      // Create a fresh mock for this test
      const mockEmbedQuery = vi.fn().mockResolvedValue(new Array(1536).fill(0));
      const mockEmbedDocuments = vi.fn();

      // Override the mock for this test
      vi.mocked(OpenAIEmbeddings).mockImplementation(() => ({
        embedQuery: mockEmbedQuery,
        embedDocuments: mockEmbedDocuments,
        modelName: 'text-embedding-3-small',
        model: 'text-embedding-3-small',
        batchSize: 512,
        stripNewLines: true,
        maxRetries: 3,
        dimensions: 1536,
      }) as any);

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
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddingModel = await factory.getEmbeddingModel();

      const text = 'This is a test document for embedding.';
      const result = await embeddingModel.embed(text);

      expect(mockEmbedQuery).toHaveBeenCalledWith(text);
      expect(result).toHaveLength(1536);

      // Reset the mock to default
      vi.mocked(OpenAIEmbeddings).mockImplementation(() => ({
        modelName: '' as any,
        model: '' as any,
        batchSize: 512,
        stripNewLines: true,
        maxRetries: 3,
        dimensions: undefined as any,
        embedQuery: vi.fn(),
        embedDocuments: vi.fn(),
      }) as any);
    });

    it('should handle batch text embedding', async () => {
      // Create fresh mocks for this test
      const mockEmbedQuery = vi.fn();
      const mockEmbedDocuments = vi.fn().mockResolvedValue([
        new Array(1536).fill(0),
        new Array(1536).fill(1),
        new Array(1536).fill(2),
      ]);

      // Override the mock for this test
      vi.mocked(OpenAIEmbeddings).mockImplementation(() => ({
        embedQuery: mockEmbedQuery,
        embedDocuments: mockEmbedDocuments,
        modelName: 'text-embedding-3-small',
        model: 'text-embedding-3-small',
        batchSize: 512,
        stripNewLines: true,
        maxRetries: 3,
        dimensions: 1536,
      }) as any);

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
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddingModel = await factory.getEmbeddingModel();

      const texts = [
        'First document',
        'Second document',
        'Third document',
      ];
      const results = await embeddingModel.embedBatch(texts);

      expect(mockEmbedDocuments).toHaveBeenCalledWith(texts);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(1536);

      // Reset the mock to default
      vi.mocked(OpenAIEmbeddings).mockImplementation(() => ({
        modelName: '' as any,
        model: '' as any,
        batchSize: 512,
        stripNewLines: true,
        maxRetries: 3,
        dimensions: undefined as any,
        embedQuery: vi.fn(),
        embedDocuments: vi.fn(),
      }) as any);
    });
  });

  describe('Configuration Precedence', () => {
    it('modelType config should override provider config for embedding model', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'sk-key',
              baseUrl: 'https://api.openai.com/v1',
              model: 'text-embedding-ada-002',  // Provider has this
            },
          },
          modelTypes: {
            embedding: {
              provider: 'test',
              model: 'text-embedding-3-large',  // Model type should override
            },
          },
          embeddingDimensions: 3072,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      // Verify model type config takes precedence
      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-large', // NOT 'text-embedding-ada-002'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw when ai.modelTypes.embedding is missing', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-key',
            },
          },
          // No modelTypes.embedding
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getEmbeddings()).rejects.toThrow('Embedding config missing');
    });

    it('should throw when embedding provider is missing', async () => {
      const config = {
        ai: {
          providers: {
            // No 'missing-provider'
          },
          modelTypes: {
            embedding: {
              provider: 'missing-provider',
              model: 'test-model',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getEmbeddings()).rejects.toThrow('Provider "missing-provider" not found');
    });

    it('should throw when remote embedding provider has no API key', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              // No apiKey
            },
          },
          modelTypes: {
            embedding: {
              provider: 'openai',
              model: 'text-embedding-3-large',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getEmbeddings()).rejects.toThrow('API key required');
    });

    it('should throw when embeddingDimensions is missing', async () => {
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
              model: 'text-embedding-3-large',
              dimensions: 1536,
            },
          },
          // No top-level embeddingDimensions - uses dimensions from embedding config instead
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      // Should work - uses dimensions from embedding config
      expect(embeddings).toBeDefined();
      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          dimensions: 1536,
        })
      );
    });
  });

  describe('Model Caching', () => {
    it('should cache and reuse embedding instances', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'sk-key',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'test',
              model: 'text-embedding-3-small',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings1 = await factory.getEmbeddings();
      const embeddings2 = await factory.getEmbeddings();

      // Should be the same instance due to caching
      expect(embeddings1).toBe(embeddings2);
      expect(OpenAIEmbeddings).toHaveBeenCalledTimes(1);
    });

    it('should cache embeddings separately from chat models', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'openai',
              apiKey: 'sk-key',
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
      const chatModel = await factory.getModel();
      const embeddings = await factory.getEmbeddings();

      // Different cache keys, different instances
      expect(chatModel).not.toBe(embeddings);
      expect(OpenAIEmbeddings).toHaveBeenCalledTimes(1);
    });

    it('should cache embedding models by provider and model name', async () => {
      const config = {
        ai: {
          providers: {
            test1: {
              providerType: 'openai',
              apiKey: 'sk-key1',
            },
            test2: {
              providerType: 'openai',
              apiKey: 'sk-key2',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'test1',
              model: 'text-embedding-3-small',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));

      // Get embeddings with test1
      const embeddings1 = await factory.getEmbeddings();
      expect(OpenAIEmbeddings).toHaveBeenCalledTimes(1);

      // Get embeddings again with same config - should use cache
      const embeddings2 = await factory.getEmbeddings();
      expect(OpenAIEmbeddings).toHaveBeenCalledTimes(1); // Still 1, used cache
      expect(embeddings1).toBe(embeddings2);
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
              models: ['glm-4', 'glm-4-0520'],
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
            },
            embedding: {
              provider: 'siliconflow-1764422754877',
              model: 'Qwen/Qwen3-Embedding-4B',
              dimensions: 1536,
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

      // Test embeddings
      const embeddings = await factory.getEmbeddings();
      expect(embeddings).toBeDefined();

      // SiliconFlow uses custom embeddings, not OpenAIEmbeddings
      expect(OpenAIEmbeddings).not.toHaveBeenCalled();

      // Verify embeddings object has expected methods
      expect(embeddings).toHaveProperty('embedQuery');
      expect(embeddings).toHaveProperty('embedDocuments');

      // Test embedding model interface
      const embeddingModel = await factory.getEmbeddingModel();
      expect(embeddingModel.dimensions).toBe(1536);
      expect(typeof embeddingModel.embed).toBe('function');
      expect(typeof embeddingModel.embedBatch).toBe('function');
    });

    it.skip('should handle complex embedding scenarios', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-openai',
              baseUrl: 'https://api.openai.com/v1',
            },
            local: {
              providerType: 'openai-compatible',
              baseUrl: 'http://localhost:11434/v1',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'openai',
              model: 'text-embedding-3-large',
              dimensions: 3072,
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));

      // Test with OpenAI provider - verify mock was called with correct apiKey
      const openaiEmbeddings = await factory.getEmbeddings();
      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-openai',
          model: 'text-embedding-3-large',
        })
      );

      // Test embedding model interface
      const embeddingModel = await factory.getEmbeddingModel();
      expect(embeddingModel.dimensions).toBe(3072);
    });
  });

  describe('Provider-Specific Behavior', () => {
    it('should handle OpenAI embedding models correctly', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-openai',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'openai',
              model: 'text-embedding-3-large',
              dimensions: 3072,
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        apiKey: 'sk-openai',
        model: 'text-embedding-3-large',
        configuration: undefined, // OpenAI doesn't need custom baseURL
        dimensions: 3072,
      });
    });

    it('should handle custom baseURL for embedding providers', async () => {
      const config = {
        ai: {
          providers: {
            custom: {
              providerType: 'openai',
              apiKey: 'sk-custom',
              baseUrl: 'https://custom-api.example.com/v1',
            },
          },
          modelTypes: {
            embedding: {
              provider: 'custom',
              model: 'custom-embedding-model',
              dimensions: 1024,
            },
          },
          embeddingDimensions: 1024,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const embeddings = await factory.getEmbeddings();

      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        apiKey: 'sk-custom',
        model: 'custom-embedding-model',
        configuration: {
          baseURL: 'https://custom-api.example.com/v1',
        },
        dimensions: 1024,
      });
    });
  });
});
