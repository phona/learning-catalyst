/**
 * Real Vector Database Module Tests
 *
 * Tests for the real vector database functionality using
 * Qdrant and Transformers.js for embedding generation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorDatabaseModule, VectorDocument } from '../../modules/vector-database/vector-database';

// Mock QdrantService
vi.mock('../../services/qdrant/qdrant-service', () => ({
  getQdrantService: vi.fn(() => ({
    isServiceReady: vi.fn().mockReturnValue(false),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    listCollections: vi.fn().mockResolvedValue([]),
    createCollection: vi.fn().mockResolvedValue(undefined),
    getCollectionInfo: vi.fn().mockResolvedValue({
      name: 'knowledge_base',
      points_count: 0,
      vectors_count: 0,
      status: 'green'
    }),
    upsertVectors: vi.fn().mockResolvedValue(undefined),
    searchVectors: vi.fn().mockResolvedValue([]),
    deleteVectors: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Transformers pipeline
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue({
    // Mock pipeline function that returns embedding data
    __call__: vi.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3, 0.4]) // Mock embedding
    })
  })
}));

describe('Real Vector Database Module', () => {
  let vectorDB: VectorDatabaseModule;

  beforeEach(() => {
    vectorDB = new VectorDatabaseModule();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await vectorDB.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await vectorDB.initialize();

      expect(vectorDB.isInitialized).toBe(true);
    });

    test('should start Qdrant service if not ready', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      await vectorDB.initialize();

      expect(mockQdrantService.isServiceReady).toHaveBeenCalled();
      expect(mockQdrantService.start).toHaveBeenCalled();
    });

    test('should create default collection if not exists', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      // Mock empty collections list
      mockQdrantService.listCollections.mockResolvedValue([]);

      await vectorDB.initialize();

      expect(mockQdrantService.createCollection).toHaveBeenCalledWith(
        'knowledge_base',
        384,
        'Cosine'
      );
    });

    test('should handle initialization errors gracefully', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      mockQdrantService.start.mockRejectedValue(new Error('Failed to start Qdrant'));

      await vectorDB.initialize();

      expect(vectorDB.isInitialized).toBe(false);
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    test('should add document successfully', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test', category: 'sample' }
      };

      await vectorDB.addDocument(document);

      expect(mockQdrantService.upsertVectors).toHaveBeenCalledWith(
        'knowledge_base',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'test-doc-1',
            vector: expect.any(Array),
            payload: expect.objectContaining({
              content: 'Test document content',
              metadata: { type: 'test', category: 'sample' }
            })
          })
        ])
      );
    });

    test('should delete document successfully', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      await vectorDB.deleteDocument('test-doc-1');

      expect(mockQdrantService.deleteVectors).toHaveBeenCalledWith(
        'knowledge_base',
        ['test-doc-1']
      );
    });

    test('should handle add document when not initialized', async () => {
      // Create new uninitialized instance
      const uninitializedDB = new VectorDatabaseModule();

      const document = {
        id: 'test-doc-1',
        content: 'Test content',
        metadata: {}
      };

      // Should not throw error, just log warning
      await expect(uninitializedDB.addDocument(document)).resolves.not.toThrow();
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    test('should search documents successfully', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      const mockQdrantResults = [
        {
          id: 'doc-1',
          score: 0.95,
          payload: {
            content: 'React hooks tutorial',
            metadata: { topic: 'react' },
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          }
        },
        {
          id: 'doc-2',
          score: 0.85,
          payload: {
            content: 'Vue composition guide',
            metadata: { topic: 'vue' },
            createdAt: '2023-01-02T00:00:00.000Z',
            updatedAt: '2023-01-02T00:00:00.000Z'
          }
        }
      ];

      mockQdrantService.searchVectors.mockResolvedValue(mockQdrantResults);

      const results = await vectorDB.search('React hooks', { limit: 5 });

      expect(results).toHaveLength(2);
      expect(results[0].document.id).toBe('doc-1');
      expect(results[0].document.content).toBe('React hooks tutorial');
      expect(results[0].score).toBe(0.95);
      expect(results[1].document.id).toBe('doc-2');
      expect(results[1].score).toBe(0.85);

      expect(mockQdrantService.searchVectors).toHaveBeenCalledWith(
        'knowledge_base',
        expect.any(Array), // embedding
        5,
        0.7, // default threshold
        undefined // filter
      );
    });

    test('should search with custom options', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      mockQdrantService.searchVectors.mockResolvedValue([]);

      const searchOptions = {
        limit: 3,
        threshold: 0.8,
        filter: { topic: 'react' }
      };

      await vectorDB.search('React hooks', searchOptions);

      expect(mockQdrantService.searchVectors).toHaveBeenCalledWith(
        'knowledge_base',
        expect.any(Array),
        3,
        0.8,
        { topic: 'react' }
      );
    });

    test('should return empty results when search fails', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      mockQdrantService.searchVectors.mockRejectedValue(new Error('Search failed'));

      const results = await vectorDB.search('test query');

      expect(results).toEqual([]);
    });

    test('should handle search when not initialized', async () => {
      const uninitializedDB = new VectorDatabaseModule();

      const results = await uninitializedDB.search('test query');

      expect(results).toEqual([]);
    });
  });

  describe('Statistics', () => {
    test('should get stats for initialized database', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      mockQdrantService.getCollectionInfo.mockResolvedValue({
        name: 'knowledge_base',
        points_count: 42,
        vectors_count: 42,
        status: 'green'
      });

      await vectorDB.initialize();
      const stats = await vectorDB.getStats();

      expect(stats.totalDocuments).toBe(42);
      expect(stats.collectionExists).toBe(true);
    });

    test('should return zero stats for uninitialized database', async () => {
      const uninitializedDB = new VectorDatabaseModule();

      const stats = await uninitializedDB.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.collectionExists).toBe(false);
    });

    test('should handle stats errors gracefully', async () => {
      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      mockQdrantService.getCollectionInfo.mockRejectedValue(new Error('Stats error'));

      await vectorDB.initialize();
      const stats = await vectorDB.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.collectionExists).toBe(false);
    });
  });

  describe('Lifecycle Management', () => {
    test('should start successfully', async () => {
      await vectorDB.start();

      expect(vectorDB.isInitialized).toBe(true);
    });

    test('should stop successfully', async () => {
      await vectorDB.initialize();

      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      await vectorDB.stop();

      expect(mockQdrantService.stop).toHaveBeenCalled();
    });

    test('should cleanup successfully', async () => {
      await vectorDB.initialize();

      await vectorDB.cleanup();

      expect(vectorDB.isInitialized).toBe(false);
    });
  });

  describe('Embedding Generation', () => {
    test('should generate embeddings for text', async () => {
      await vectorDB.initialize();

      const document = {
        id: 'test-doc',
        content: 'This is a test document for embedding generation',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);

      const { getQdrantService } = await import('../../services/qdrant/qdrant-service');
      const mockQdrantService = getQdrantService();

      expect(mockQdrantService.upsertVectors).toHaveBeenCalledWith(
        'knowledge_base',
        expect.arrayContaining([
          expect.objectContaining({
            vector: expect.arrayContaining([0.1, 0.2, 0.3, 0.4])
          })
        ])
      );
    });

    test('should handle embedding generation errors', async () => {
      const { pipeline } = await import('@xenova/transformers');
      (pipeline as any).mockResolvedValue({
        __call__: vi.fn().mockRejectedValue(new Error('Embedding failed'))
      });

      await vectorDB.initialize();

      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: {}
      };

      // Should not throw error, just log the error
      await expect(vectorDB.addDocument(document)).resolves.not.toThrow();
    });
  });
});