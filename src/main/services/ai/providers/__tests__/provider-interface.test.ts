import { describe, it, expect, vi } from 'vitest';

describe('AI Providers - Interface Tests', () => {
  describe('Provider Interface', () => {
    it('should define expected provider interface structure', () => {
      const mockProvider = {
        chatCompletion: vi.fn(),
        getModels: vi.fn(),
        getEmbeddings: vi.fn()
      };

      expect(mockProvider).toHaveProperty('chatCompletion');
      expect(mockProvider).toHaveProperty('getModels');
      expect(mockProvider).toHaveProperty('getEmbeddings');

      expect(typeof mockProvider.chatCompletion).toBe('function');
      expect(typeof mockProvider.getModels).toBe('function');
      expect(typeof mockProvider.getEmbeddings).toBe('function');
    });
  });

  describe('Model Interface', () => {
    it('should define expected model interface structure', () => {
      const mockModel = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test-provider',
        maxTokens: 4096,
        description: 'A test model for unit testing'
      };

      expect(mockModel).toHaveProperty('id');
      expect(mockModel).toHaveProperty('name');
      expect(mockModel).toHaveProperty('provider');
      expect(mockModel).toHaveProperty('maxTokens');
      expect(mockModel).toHaveProperty('description');

      expect(typeof mockModel.id).toBe('string');
      expect(typeof mockModel.name).toBe('string');
      expect(typeof mockModel.provider).toBe('string');
      expect(typeof mockModel.maxTokens).toBe('number');
      expect(typeof mockModel.description).toBe('string');
    });
  });

  describe('Chat Completion Interface', () => {
    it('should handle chat completion parameters', () => {
      const mockProvider = {
        chatCompletion: vi.fn().mockResolvedValue({
          content: 'Test response',
          role: 'assistant'
        })
      };

      const chatRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7,
        maxTokens: 1000
      };

      expect(() => mockProvider.chatCompletion(chatRequest)).not.toThrow();
      expect(mockProvider.chatCompletion).toHaveBeenCalledWith(chatRequest);
    });

    it('should handle chat completion responses', async () => {
      const mockResponse = {
        content: 'Test response',
        role: 'assistant',
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        }
      };

      const mockProvider = {
        chatCompletion: vi.fn().mockResolvedValue(mockResponse)
      };

      const response = await mockProvider.chatCompletion({
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(response).toEqual(mockResponse);
      expect(response.content).toBe('Test response');
      expect(response.role).toBe('assistant');
    });
  });

  describe('Model Listing Interface', () => {
    it('should return model arrays', async () => {
      const mockModels = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          maxTokens: 2048,
          description: 'First test model'
        },
        {
          id: 'model-2',
          name: 'Model 2',
          provider: 'test',
          maxTokens: 4096,
          description: 'Second test model'
        }
      ];

      const mockProvider = {
        getModels: vi.fn().mockResolvedValue(mockModels)
      };

      const models = await mockProvider.getModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models).toHaveLength(2);
      expect(models[0]).toHaveProperty('id', 'model-1');
      expect(models[1]).toHaveProperty('id', 'model-2');
    });
  });

  describe('Embeddings Interface', () => {
    it('should handle embedding requests', async () => {
      const mockEmbedding = {
        embedding: [0.1, 0.2, 0.3],
        usage: { promptTokens: 5 }
      };

      const mockProvider = {
        getEmbeddings: vi.fn().mockResolvedValue(mockEmbedding)
      };

      const embedding = await mockProvider.getEmbeddings({
        input: 'Test text to embed'
      });

      expect(embedding).toEqual(mockEmbedding);
      expect(Array.isArray(embedding.embedding)).toBe(true);
      expect(embedding.embedding).toHaveLength(3);
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      const mockProvider = {
        chatCompletion: vi.fn().mockRejectedValue(new Error('Provider error')),
        getModels: vi.fn().mockRejectedValue(new Error('Models error')),
        getEmbeddings: vi.fn().mockRejectedValue(new Error('Embeddings error'))
      };

      await expect(mockProvider.chatCompletion({ messages: [] })).rejects.toThrow('Provider error');
      await expect(mockProvider.getModels()).rejects.toThrow('Models error');
      await expect(mockProvider.getEmbeddings({ input: '' })).rejects.toThrow('Embeddings error');
    });
  });
});