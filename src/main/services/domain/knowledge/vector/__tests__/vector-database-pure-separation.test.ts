import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVectorDatabase } from '../vector-database';

describe('vector database pure separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDocumentBatch', () => {
    it('should store minimal payload with only conceptId and content', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const documentsWithEmbeddings = [
        {
          doc: {
            id: 'concept:concept-1',
            content: 'Variables\n\nVariables store data',
            metadata: {
              conceptId: 'concept-1', // Only conceptId
            },
          },
          embedding: Array(1536).fill(0.1),
        },
      ];

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      // Verify upsert was called
      expect(mockVectorStore.upsert).toHaveBeenCalledWith('knowledge_items', [
        {
          id: 'concept:concept-1',
          vector: Array(1536).fill(0.1),
          payload: {
            content: 'Variables\n\nVariables store data',
            metadata: {
              conceptId: 'concept-1',
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
          },
        },
      ]);

      // Verify payload structure
      const upsertCall = mockVectorStore.upsert.mock.calls[0][1][0];
      expect(upsertCall.payload).toEqual({
        content: 'Variables\n\nVariables store data',
        metadata: {
          conceptId: 'concept-1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should batch multiple documents correctly', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const documentsWithEmbeddings = Array.from({ length: 150 }, (_, i) => ({
        doc: {
          id: `concept:concept-${i}`,
          content: `Content ${i}`,
          metadata: { conceptId: `concept-${i}` },
        },
        embedding: Array(1536).fill(0.1),
      }));

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      // Should be called once with all points
      expect(mockVectorStore.upsert).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.upsert.mock.calls[0][1]).toHaveLength(150);
    });

    it('should handle empty document array', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await vectorDatabase.addDocumentBatch([]);

      // Should call upsert with empty array (no early return in production code)
      expect(mockVectorStore.upsert).toHaveBeenCalledWith('knowledge_items', []);
    });

    it('should format content as "name | description" for better search', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const documentsWithEmbeddings = [
        {
          doc: {
            id: 'concept:concept-1',
            content: 'Variables and Data Types\n\nVariables are containers for storing data in Python. They have different types like int, float, string, etc.',
            metadata: { conceptId: 'concept-1' },
          },
          embedding: Array(1536).fill(0.1),
        },
      ];

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      const upsertCall = mockVectorStore.upsert.mock.calls[0][1][0];
      expect(upsertCall.payload.content).toContain('Variables and Data Types');
      expect(upsertCall.payload.content).toContain('Variables are containers');
    });

    it('should store content without truncation', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const longContent = 'x'.repeat(1000);
      const documentsWithEmbeddings = [
        {
          doc: {
            id: 'concept:concept-1',
            content: `Long Description\n\n${longContent}`,
            metadata: { conceptId: 'concept-1' },
          },
          embedding: Array(1536).fill(0.1),
        },
      ];

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      const upsertCall = mockVectorStore.upsert.mock.calls[0][1][0];
      expect(upsertCall.payload.content.length).toBeGreaterThan(1000);
      expect(upsertCall.payload.content).toContain('Long Description');
      expect(upsertCall.payload.content).toContain('x'.repeat(1000));
    });
  });

  describe('search', () => {
    it('should return results with minimal metadata', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([
          {
            id: 'concept:concept-1',
            score: 0.92,
            payload: {
              content: 'Variables\n\nVariables store data',
              metadata: {
                conceptId: 'concept-1',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        ]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const results = await vectorDatabase.search('variables', {
        limit: 10,
        threshold: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].document).toEqual({
        id: 'concept:concept-1',
        content: 'Variables\n\nVariables store data',
        metadata: {
          conceptId: 'concept-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(results[0].score).toBe(0.92);

      // Verify vector store was called correctly
      expect(mockVectorStore.search).toHaveBeenCalledWith(
        'knowledge_items',
        Array(1536).fill(0.1),
        {
          limit: 10,
          scoreThreshold: 0.5,
        }
      );
    });

    it('should generate embedding from query', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockEmbeddingModel = {
        embed: vi.fn().mockResolvedValue(Array(1536).fill(0.5)),
        embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.5)]),
        dimensions: 1536,
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue(mockEmbeddingModel),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await vectorDatabase.search('test query', { limit: 10, threshold: 0.5 });

      // Verify embedding model was used
      expect(mockEmbeddingModel.embed).toHaveBeenCalledWith('test query');
      expect(mockVectorStore.search).toHaveBeenCalledWith(
        'knowledge_items',
        Array(1536).fill(0.5),
        {
          limit: 10,
          scoreThreshold: 0.5,
        }
      );
    });

    it('should handle search errors gracefully', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockRejectedValue(new Error('Qdrant error')),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await expect(vectorDatabase.search('query', { limit: 10 })).rejects.toThrow('Qdrant error');
    });

    it('should return empty array when no results', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const results = await vectorDatabase.search('nonexistent', { limit: 10 });

      expect(results).toEqual([]);
    });

    it('should use default options correctly', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await vectorDatabase.search('query');

      expect(mockVectorStore.search).toHaveBeenCalledWith(
        'knowledge_items',
        Array(1536).fill(0.1),
        {
          limit: 10,
          scoreThreshold: 0.5,
        }
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete document by ID', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await vectorDatabase.deleteDocument('concept:concept-1');

      expect(mockVectorStore.delete).toHaveBeenCalledWith('knowledge_items', ['concept:concept-1']);
    });

    it('should handle delete errors gracefully', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockRejectedValue(new Error('Delete failed')),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      await expect(vectorDatabase.deleteDocument('concept:concept-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('getStats', () => {
    it('should return total document count', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([
          {
            name: 'knowledge_items',
            vectors_count: 100,
            points_count: 100,
            status: 'green',
            optimizer_status: 'ok',
          },
        ]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const stats = await vectorDatabase.getStats();

      expect(stats).toEqual({ totalDocuments: 100 });
    });
  });

  describe('payload structure validation', () => {
    it('should have consistent payload structure', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const documentsWithEmbeddings = [
        {
          doc: {
            id: 'concept:1',
            content: 'Content 1',
            metadata: { conceptId: 'concept-1' },
          },
          embedding: Array(1536).fill(0.1),
        },
        {
          doc: {
            id: 'concept:2',
            content: 'Content 2',
            metadata: { conceptId: 'concept-2' },
          },
          embedding: Array(1536).fill(0.1),
        },
      ];

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      const points = mockVectorStore.upsert.mock.calls[0][1];

      for (const point of points) {
        // Verify structure
        expect(point).toHaveProperty('id');
        expect(point).toHaveProperty('vector');
        expect(point).toHaveProperty('payload');

        // Verify payload has required fields
        expect(point.payload).toHaveProperty('content');
        expect(point.payload).toHaveProperty('metadata');

        // Verify metadata has conceptId and timestamps
        expect(point.payload.metadata).toHaveProperty('conceptId');
        expect(point.payload.metadata).toHaveProperty('createdAt');
        expect(point.payload.metadata).toHaveProperty('updatedAt');
      }
    });
  });

  describe('vector dimensions', () => {
    it('should handle 1536-dimensional embeddings', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const embedding = Array(1536).fill(0.1);

      await vectorDatabase.addDocumentBatch([
        {
          doc: {
            id: 'concept:1',
            content: 'Content',
            metadata: { conceptId: 'concept-1' },
          },
          embedding,
        },
      ]);

      const upserted = mockVectorStore.upsert.mock.calls[0][1][0];
      expect(upserted.vector).toHaveLength(1536);
    });

    it('should handle different embedding values', async () => {
      const mockVectorStore = {
        createCollection: vi.fn(),
        deleteCollection: vi.fn(),
        listCollections: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        search: vi.fn().mockResolvedValue([]),
        getVectors: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        clearCollection: vi.fn(),
        scroll: vi.fn().mockResolvedValue({ points: [] }),
      };

      const mockProviderFactory = {
        getModel: vi.fn(),
        getEmbeddings: vi.fn().mockResolvedValue({
          embedQuery: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocument: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedDocuments: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
        }),
        getEmbeddingModel: vi.fn().mockResolvedValue({
          embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
          embedBatch: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
          dimensions: 1536,
        }),
        getRerankModel: vi.fn(),
      };

      const vectorDatabase = createVectorDatabase(mockVectorStore, mockProviderFactory);

      const embedding = Array.from({ length: 1536 }, (_, i) => Math.random());

      await vectorDatabase.addDocumentBatch([
        {
          doc: {
            id: 'concept:1',
            content: 'Content',
            metadata: { conceptId: 'concept-1' },
          },
          embedding,
        },
      ]);

      const upserted = mockVectorStore.upsert.mock.calls[0][1][0];
      expect(upserted.vector).toEqual(embedding);
    });
  });
});
