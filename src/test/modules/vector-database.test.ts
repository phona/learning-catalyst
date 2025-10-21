/**
 * Vector Database Module Tests
 *
 * Tests for the vector database functionality including
 * mock mode operations and semantic search.
 */

import { VectorDatabaseModule } from '../../modules/vector-database/vector-database';
import { vi } from 'vitest';

// Mock Electron APIs for vector database operations
const mockElectronAPI = {
  invoke: vi.fn(),
  vectorSearch: vi.fn(),
  vectorAddDocument: vi.fn(),
  vectorDeleteDocument: vi.fn(),
  vectorGetDocument: vi.fn(),
  vectorListCollections: vi.fn(),
  vectorCreateCollection: vi.fn(),
  vectorDeleteCollection: vi.fn(),
};

// Set up global window.electronAPI
beforeEach(() => {
  (window as any).electronAPI = mockElectronAPI;
  vi.clearAllMocks();
});

describe('Vector Database Module', () => {
  let vectorDB: VectorDatabaseModule;

  beforeEach(() => {
    vectorDB = new VectorDatabaseModule();
  });

  describe('Initialization', () => {
    test('should initialize in mock mode when real Qdrant unavailable', async () => {
      // Mock Qdrant service unavailable
      mockElectronAPI.invoke.mockResolvedValue({
        success: false,
        error: 'Qdrant service not available'
      });

      await vectorDB.initialize();

      expect(vectorDB.isInitialized).toBe(true);
      expect(vectorDB.isMockMode).toBe(true);
    });

    test('should initialize with real Qdrant when available', async () => {
      // Mock successful Qdrant connection
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        result: { version: '1.7.0' }
      });

      await vectorDB.initialize();

      expect(vectorDB.isInitialized).toBe(true);
      expect(vectorDB.isMockMode).toBe(false);
    });

    test('should handle initialization errors gracefully', async () => {
      mockElectronAPI.invoke.mockRejectedValue(new Error('Network error'));

      await expect(vectorDB.initialize()).rejects.toThrow('Network error');
      expect(vectorDB.isInitialized).toBe(false);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      // Initialize for health check tests
      mockElectronAPI.invoke.mockResolvedValue({ success: true });
      await vectorDB.initialize();
    });

    test('should return healthy status in mock mode', async () => {
      const health = await vectorDB.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toContain('mock mode');
      expect(health.metrics).toBeDefined();
      expect(health.metrics.mockMode).toBe(true);
    });

    test('should return healthy status with real Qdrant', async () => {
      // Re-initialize in real mode
      vectorDB = new VectorDatabaseModule();
      mockElectronAPI.invoke.mockResolvedValue({ success: true });
      await vectorDB.initialize();

      const health = await vectorDB.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.metrics.mockMode).toBe(false);
    });
  });

  describe('Mock Mode Operations', () => {
    beforeEach(async () => {
      // Force mock mode initialization
      mockElectronAPI.invoke.mockResolvedValue({
        success: false,
        error: 'Qdrant unavailable'
      });
      await vectorDB.initialize();
    });

    test('should add documents in mock mode', async () => {
      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test', category: 'sample' }
      };

      const result = await vectorDB.addDocument('test-collection', document);

      expect(result).toBe(true);
      expect(vectorDB.getDocumentCount('test-collection')).toBe(1);
    });

    test('should retrieve documents in mock mode', async () => {
      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test' }
      };

      // Add document first
      await vectorDB.addDocument('test-collection', document);

      // Retrieve document
      const retrieved = await vectorDB.getDocument('test-collection', 'test-doc-1');

      expect(retrieved).toEqual(document);
    });

    test('should perform semantic search in mock mode', async () => {
      const documents = [
        { id: 'doc1', content: 'React hooks tutorial', metadata: { topic: 'react' } },
        { id: 'doc2', content: 'Vue composition guide', metadata: { topic: 'vue' } },
        { id: 'doc3', content: 'React state management', metadata: { topic: 'react' } }
      ];

      // Add documents
      for (const doc of documents) {
        await vectorDB.addDocument('test-collection', doc);
      }

      // Search for React-related content
      const results = await vectorDB.search('test-collection', 'React hooks', 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('doc1'); // Should match most closely
      expect(results[0].score).toBeGreaterThan(0);
    });

    test('should handle search with no results gracefully', async () => {
      const results = await vectorDB.search('empty-collection', 'nonexistent query', 5);

      expect(results).toEqual([]);
    });

    test('should delete documents in mock mode', async () => {
      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test' }
      };

      // Add document
      await vectorDB.addDocument('test-collection', document);
      expect(vectorDB.getDocumentCount('test-collection')).toBe(1);

      // Delete document
      const deleted = await vectorDB.deleteDocument('test-collection', 'test-doc-1');

      expect(deleted).toBe(true);
      expect(vectorDB.getDocumentCount('test-collection')).toBe(0);
    });

    test('should manage collections in mock mode', async () => {
      // Create collection
      const created = await vectorDB.createCollection('new-collection');
      expect(created).toBe(true);

      // List collections
      const collections = await vectorDB.listCollections();
      expect(collections).toContain('new-collection');

      // Delete collection
      const deleted = await vectorDB.deleteCollection('new-collection');
      expect(deleted).toBe(true);

      // Verify deletion
      const collectionsAfterDelete = await vectorDB.listCollections();
      expect(collectionsAfterDelete).not.toContain('new-collection');
    });
  });

  describe('Real Qdrant Operations', () => {
    beforeEach(async () => {
      // Initialize in real mode
      mockElectronAPI.invoke.mockResolvedValue({ success: true });
      await vectorDB.initialize();
      expect(vectorDB.isMockMode).toBe(false);
    });

    test('should delegate document operations to Qdrant service', async () => {
      const document = {
        id: 'real-doc-1',
        content: 'Real document content',
        metadata: { type: 'production' }
      };

      // Mock successful Qdrant operations
      mockElectronAPI.vectorAddDocument.mockResolvedValue({ success: true });

      const result = await vectorDB.addDocument('production-collection', document);

      expect(result).toBe(true);
      expect(mockElectronAPI.vectorAddDocument).toHaveBeenCalledWith(
        'production-collection',
        document
      );
    });

    test('should delegate search operations to Qdrant service', async () => {
      const mockResults = [
        { id: 'result1', score: 0.95, payload: { content: 'Matching content' } }
      ];

      mockElectronAPI.vectorSearch.mockResolvedValue({
        success: true,
        results: mockResults
      });

      const results = await vectorDB.search('production-collection', 'search query', 5);

      expect(results).toEqual(mockResults);
      expect(mockElectronAPI.vectorSearch).toHaveBeenCalledWith(
        'production-collection',
        'search query',
        5
      );
    });

    test('should handle Qdrant service errors gracefully', async () => {
      mockElectronAPI.vectorSearch.mockResolvedValue({
        success: false,
        error: 'Qdrant connection timeout'
      });

      await expect(vectorDB.search('test-collection', 'query', 5))
        .rejects.toThrow('Qdrant connection timeout');
    });
  });

  describe('Performance and Resource Usage', () => {
    beforeEach(async () => {
      // Initialize in mock mode for performance testing
      mockElectronAPI.invoke.mockResolvedValue({
        success: false,
        error: 'Mock mode'
      });
      await vectorDB.initialize();
    });

    test('should handle large numbers of documents efficiently', async () => {
      const startTime = Date.now();

      // Add 1000 documents
      for (let i = 0; i < 1000; i++) {
        await vectorDB.addDocument('perf-test', {
          id: `doc-${i}`,
          content: `Document content ${i} with some text`,
          metadata: { index: i }
        });
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Search should also be fast
      const searchStart = Date.now();
      const results = await vectorDB.search('perf-test', 'document content', 10);
      const searchTime = Date.now() - searchStart;

      expect(results.length).toBe(10);
      expect(searchTime).toBeLessThan(1000); // Search within 1 second
    });

    test('should track resource usage', async () => {
      // Add some documents
      await vectorDB.addDocument('resource-test', {
        id: 'test-doc',
        content: 'Test content for resource tracking',
        metadata: { type: 'test' }
      });

      const resourceUsage = vectorDB.getResourceUsage();

      expect(resourceUsage).toBeDefined();
      expect(resourceUsage.documents).toBe(1);
      expect(resourceUsage.collections).toBe(1);
      expect(resourceUsage.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockElectronAPI.invoke.mockResolvedValue({ success: true });
      await vectorDB.initialize();
    });

    test('should handle invalid document structure', async () => {
      const invalidDocument = { id: null }; // Missing required fields

      await expect(vectorDB.addDocument('test-collection', invalidDocument))
        .rejects.toThrow();
    });

    test('should handle empty search queries', async () => {
      await expect(vectorDB.search('test-collection', '', 5))
        .rejects.toThrow('Search query cannot be empty');
    });

    test('should handle invalid collection names', async () => {
      await expect(vectorDB.createCollection(''))
        .rejects.toThrow('Collection name cannot be empty');
    });

    test('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      mockElectronAPI.vectorSearch.mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(vectorDB.search('test-collection', 'query', 5))
        .rejects.toThrow('Network timeout');
    });
  });

  describe('Configuration and Settings', () => {
    test('should allow configuration of embedding model', async () => {
      const config = {
        embeddingModel: 'text-embedding-ada-002',
        dimensions: 1536
      };

      const configuredDB = new VectorDatabaseModule(config);

      mockElectronAPI.invoke.mockResolvedValue({ success: true });
      await configuredDB.initialize();

      expect(configuredDB.getConfig().embeddingModel).toBe('text-embedding-ada-002');
    });

    test('should handle configuration updates', async () => {
      await vectorDB.initialize();

      const newConfig = {
        maxDocuments: 5000,
        searchTimeout: 30000
      };

      vectorDB.updateConfig(newConfig);
      expect(vectorDB.getConfig().maxDocuments).toBe(5000);
      expect(vectorDB.getConfig().searchTimeout).toBe(30000);
    });
  });
});