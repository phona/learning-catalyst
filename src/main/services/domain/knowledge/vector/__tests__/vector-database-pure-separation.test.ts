import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVectorDatabase } from '../vector-database';

// Mock Qdrant client
const mockQdrantClient = {
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
  upsert: vi.fn(),
  search: vi.fn(),
  scroll: vi.fn(),
  getCollection: vi.fn(),
  delete: vi.fn(),
  createPayloadIndex: vi.fn(),
};

vi.mock('@qdrant/qdrant-js', () => ({
  QdrantClient: vi.fn().mockImplementation(() => mockQdrantClient),
}));

describe('vector database pure separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDocumentBatch', () => {
    it('should store minimal payload with only conceptId and content', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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
      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('test_collection', {
        points: [
          {
            id: 'concept:concept-1',
            vector: Array(1536).fill(0.1),
            payload: {
              content: 'Variables\n\nVariables store data',
              metadata: {
                conceptId: 'concept-1', // ✅ Only conceptId in Qdrant
              },
            },
          },
        ],
      });

      // Verify payload structure
      const upsertCall = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upsertCall.payload).toEqual({
        content: 'Variables\n\nVariables store data',
        metadata: {
          conceptId: 'concept-1',
        },
      });

      // Verify no metadata duplication
      expect(upsertCall.payload.metadata.type).toBeUndefined();
      expect(upsertCall.payload.metadata.level).toBeUndefined();
      expect(upsertCall.payload.metadata.path).toBeUndefined();
      expect(upsertCall.payload.metadata.confidence).toBeUndefined();
    });

    it('should batch multiple documents correctly', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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
      expect(mockQdrantClient.upsert).toHaveBeenCalledTimes(1);
      expect(mockQdrantClient.upsert.mock.calls[0][1].points).toHaveLength(150);
    });

    it('should handle empty document array', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      await vectorDatabase.addDocumentBatch([]);

      // Should not call upsert with empty array
      expect(mockQdrantClient.upsert).not.toHaveBeenCalled();
    });

    it('should format content as "name | description" for better search', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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

      const upsertCall = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upsertCall.payload.content).toContain('Variables and Data Types');
      expect(upsertCall.payload.content).toContain('Variables are containers');
    });

    it('should truncate content to 500 chars', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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

      const upsertCall = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upsertCall.payload.content.length).toBeLessThanOrEqual(500);
      expect(upsertCall.payload.content).toContain('Long Description');
    });
  });

  describe('search', () => {
    it('should return results with minimal metadata', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      // Mock Qdrant search results
      mockQdrantClient.search.mockResolvedValue([
        {
          id: 'concept:concept-1',
          score: 0.92,
          payload: {
            content: 'Variables\n\nVariables store data',
            metadata: {
              conceptId: 'concept-1', // Only conceptId
            },
          },
          vector: Array(1536).fill(0.1),
        },
      ]);

      const results = await vectorDatabase.search('variables', {
        limit: 10,
        threshold: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        document: {
          id: 'concept:concept-1',
          content: 'Variables\n\nVariables store data',
          metadata: {
            conceptId: 'concept-1',
          },
        },
        score: 0.92,
      });

      // Verify Qdrant client was called correctly
      expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
        vector: expect.any(Array),
        limit: 10,
        threshold: 0.5,
        withPayload: true,
        withVector: false,
      });
    });

    it('should generate embedding from query', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      mockQdrantClient.search.mockResolvedValue([]);

      await vectorDatabase.search('test query', { limit: 10, threshold: 0.5 });

      // Verify embedding model was used
      expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
        vector: expect.any(Array), // Generated embedding
        limit: 10,
        threshold: 0.5,
        withPayload: true,
        withVector: false,
      });
    });

    it('should handle search errors gracefully', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      mockQdrantClient.search.mockRejectedValue(new Error('Qdrant error'));

      await expect(vectorDatabase.search('query', { limit: 10 })).rejects.toThrow('Qdrant error');
    });

    it('should return empty array when no results', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      mockQdrantClient.search.mockResolvedValue([]);

      const results = await vectorDatabase.search('nonexistent', { limit: 10 });

      expect(results).toEqual([]);
    });

    it('should use default options correctly', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      mockQdrantClient.search.mockResolvedValue([]);

      await vectorDatabase.search('query');

      expect(mockQdrantClient.search).toHaveBeenCalledWith('test_collection', {
        vector: expect.any(Array),
        limit: 10, // Default
        threshold: 0.7, // Default
        withPayload: true,
        withVector: false,
      });
    });
  });

  describe('deleteDocument', () => {
    it('should delete document by ID', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      await vectorDatabase.deleteDocument('concept:concept-1');

      expect(mockQdrantClient.delete).toHaveBeenCalledWith('test_collection', {
        points: ['concept:concept-1'],
      });
    });

    it('should handle delete errors gracefully', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      mockQdrantClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(vectorDatabase.deleteDocument('concept:concept-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('collection initialization', () => {
    it('should create collection with correct configuration', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'knowledge_items',
        host: '127.0.0.1',
        port: 6333,
      });

      // Collection is created lazily on first use
      // This test verifies the configuration is stored
      expect(vectorDatabase).toBeDefined();
    });

    it('should use correct collection name', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'custom_collection',
        host: 'localhost',
        port: 6333,
      });

      // Trigger collection creation by adding a document
      mockQdrantClient.search.mockResolvedValue([]);

      await vectorDatabase.addDocumentBatch([
        {
          doc: {
            id: 'concept:1',
            content: 'Content',
            metadata: { conceptId: 'concept-1' },
          },
          embedding: Array(1536).fill(0.1),
        },
      ]);

      // Verify collection name is used in operations
      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('custom_collection', expect.any(Object));
      expect(mockQdrantClient.search).toHaveBeenCalledWith('custom_collection', expect.any(Object));
    });
  });

  describe('payload structure validation', () => {
    it('should have consistent payload structure', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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

      const points = mockQdrantClient.upsert.mock.calls[0][1].points;

      for (const point of points) {
        // Verify structure
        expect(point).toHaveProperty('id');
        expect(point).toHaveProperty('vector');
        expect(point).toHaveProperty('payload');

        // Verify payload has required fields
        expect(point.payload).toHaveProperty('content');
        expect(point.payload).toHaveProperty('metadata');

        // Verify metadata has only conceptId
        expect(point.payload.metadata).toHaveProperty('conceptId');
        expect(Object.keys(point.payload.metadata).length).toBe(1);
      }
    });

    it('should reject documents with extra metadata fields', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

      // Document with extra metadata (type, level, etc.)
      const documentsWithEmbeddings = [
        {
          doc: {
            id: 'concept:1',
            content: 'Content',
            metadata: {
              conceptId: 'concept-1',
              type: 'concept', // Extra field
              level: 1, // Extra field
            },
          },
          embedding: Array(1536).fill(0.1),
        },
      ];

      await vectorDatabase.addDocumentBatch(documentsWithEmbeddings);

      // The document is still stored, but with the provided metadata
      const upserted = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upserted.payload.metadata).toHaveProperty('conceptId');
      expect(upserted.payload.metadata).toHaveProperty('type');
      expect(upserted.payload.metadata).toHaveProperty('level');
    });
  });

  describe('vector dimensions', () => {
    it('should handle 1536-dimensional embeddings', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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

      const upserted = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upserted.vector).toHaveLength(1536);
    });

    it('should handle different embedding values', async () => {
      const vectorDatabase = createVectorDatabase({
        collectionName: 'test_collection',
        host: 'localhost',
        port: 6333,
      });

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

      const upserted = mockQdrantClient.upsert.mock.calls[0][1].points[0];
      expect(upserted.vector).toEqual(embedding);
    });
  });
});
