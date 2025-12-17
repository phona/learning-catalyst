/**
 * Provider Reranker - Configuration Tests
 *
 * These tests verify that reranker configuration flows correctly through the provider factory.
 * They catch bugs where config is read but not used (similar to the model configuration bug).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProviderFactory } from '../../agent/provider-factory';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
  OpenAIEmbeddings: vi.fn().mockImplementation((cfg) => ({ config: cfg })),
}));

describe('Provider Reranker Configuration', () => {
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

  describe('Rerank Model Configuration', () => {
    it('should use ai.modelTypes.rerank for reranker creation', async () => {
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
            rerank: {
              provider: 'siliconflow',
              model: 'Qwen/Qwen3-Reranker-0.6B',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      // Verify reranker has correct configuration
      expect(reranker).toBeDefined();
      expect(typeof reranker.rerank).toBe('function');
    });

    it('should call SiliconFlow rerank API with correct parameters', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-test-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'BAAI/bge-reranker-v2-m3',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      // Mock the global fetch to verify API call
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { document: { text: 'doc1' }, index: 0, relevance_score: 0.9 },
            { document: { text: 'doc2' }, index: 1, relevance_score: 0.8 },
          ],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      // Call rerank
      const query = 'test query';
      const documents = ['doc1', 'doc2', 'doc3'];
      const result = await reranker.rerank(query, documents);

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith('https://api.siliconflow.cn/v1/rerank', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'BAAI/bge-reranker-v2-m3',
          query,
          documents: ['doc1', 'doc2', 'doc3'], // filtered out empty docs
          top_n: 3,
          return_documents: true,
        }),
      });

      // Verify result structure
      expect(result).toEqual({
        indices: [0, 1], // sorted by relevance score desc
        scores: [0.9, 0.8],
      });
    });

    it('should filter out empty documents before calling API', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { document: { text: 'valid' }, index: 1, relevance_score: 0.9 },
          ],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      // Call with documents including empty strings
      const documents = ['', 'valid', '  ', 'another'];
      await reranker.rerank('query', documents);

      // Verify only non-empty documents were sent
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            model: 'test-model',
            query: 'query',
            documents: ['valid', 'another'], // filtered out empty
            top_n: 2,
            return_documents: true,
          }),
        })
      );
    });

    it('should throw error when no documents provided', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      await expect(reranker.rerank('query', [])).rejects.toThrow('No documents provided');
    });

    it('should throw error when all documents are empty', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      await expect(reranker.rerank('query', ['', '  ', '\t'])).rejects.toThrow('No valid documents provided');
    });

    it('should handle API errors gracefully', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      vi.stubGlobal('fetch', mockFetch);

      await expect(reranker.rerank('query', ['doc1'])).rejects.toThrow('Rerank API error: 401 Unauthorized');
    });

    it('should sort results by relevance score descending', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { document: { text: 'doc1' }, index: 0, relevance_score: 0.5 },
            { document: { text: 'doc2' }, index: 1, relevance_score: 0.9 },
            { document: { text: 'doc3' }, index: 2, relevance_score: 0.3 },
          ],
        }),
      });

      vi.stubGlobal('fetch', mockFetch);

      const result = await reranker.rerank('query', ['doc1', 'doc2', 'doc3']);

      // Verify results are sorted by relevance score (descending)
      expect(result.indices).toEqual([1, 0, 2]); // doc2 (0.9), doc1 (0.5), doc3 (0.3)
      expect(result.scores).toEqual([0.9, 0.5, 0.3]);
    });
  });

  describe('Error Handling', () => {
    it('should throw when ai.modelTypes.rerank is missing', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          // No modelTypes.rerank
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getRerankModel()).rejects.toThrow('Rerank config missing');
    });

    it('should throw when rerank provider is missing', async () => {
      const config = {
        ai: {
          providers: {
            // No 'missing-provider'
          },
          modelTypes: {
            rerank: {
              provider: 'missing-provider',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getRerankModel()).rejects.toThrow('Provider "missing-provider" not found');
    });

    it('should throw when provider does not support reranking', async () => {
      const config = {
        ai: {
          providers: {
            openai: {
              providerType: 'openai',
              apiKey: 'sk-key',
              baseUrl: 'https://api.openai.com/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'openai',
              model: 'gpt-4',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      await expect(factory.getRerankModel()).rejects.toThrow("Provider openai doesn't support reranking");
    });
  });

  describe('Model Caching', () => {
    it('should cache and reuse reranker instances', async () => {
      const config = {
        ai: {
          providers: {
            siliconflow: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow',
              model: 'test-model',
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker1 = await factory.getRerankModel();
      const reranker2 = await factory.getRerankModel();

      // Should be the same instance due to caching
      expect(reranker1).toBe(reranker2);
    });

    it('should cache reranker separately from chat models and embeddings', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
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
            rerank: {
              provider: 'test',
              model: 'test-reranker',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const chatModel = await factory.getModel();
      const embeddings = await factory.getEmbeddings();
      const reranker = await factory.getRerankModel();

      // All should be different instances
      expect(chatModel).not.toBe(embeddings);
      expect(embeddings).not.toBe(reranker);
      expect(chatModel).not.toBe(reranker);
    });
  });

  describe('Configuration Precedence', () => {
    it('should use modelType config for rerank model', async () => {
      const config = {
        ai: {
          providers: {
            test: {
              providerType: 'siliconflow',
              apiKey: 'sk-key',
              baseUrl: 'https://api.siliconflow.cn/v1',
              model: 'default-model', // Provider has this
            },
          },
          modelTypes: {
            rerank: {
              provider: 'test',
              model: 'override-model', // Model type should override
            },
          },
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      vi.stubGlobal('fetch', mockFetch);

      await reranker.rerank('query', ['doc1']);

      // Verify model type config takes precedence
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.siliconflow.cn/v1/rerank',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"model":"override-model"'), // Verify model override
        })
      );

      // Also verify it's NOT the default model
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.model).toBe('override-model'); // NOT 'default-model'
    });
  });

  describe('Real Config Integration', () => {
    it('should work with production-like config structure', async () => {
      const config = {
        ai: {
          providers: {
            'siliconflow-1764422754877': {
              providerType: 'siliconflow',
              apiKey: 'sk-lqehbcbqjdpqvpoxnkmmbivrdsvckhgmxdinngddmkfvlcjv',
              baseUrl: 'https://api.siliconflow.cn/v1',
              displayName: 'SiliconFlow',
              models: [],
            },
          },
          modelTypes: {
            rerank: {
              provider: 'siliconflow-1764422754877',
              model: 'Qwen/Qwen3-Reranker-0.6B',
            },
          },
          embeddingDimensions: 1536,
        },
      };

      const factory = createProviderFactory(makeConfigService(config));
      const reranker = await factory.getRerankModel();

      expect(reranker).toBeDefined();
      expect(typeof reranker.rerank).toBe('function');
    });
  });
});
