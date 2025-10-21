/**
 * Vector Database Module Tests (Corrected)
 *
 * Tests for the actual vector database functionality including
 * mock mode operations and semantic search.
 */

import { VectorDatabaseModule } from '../../modules/vector-database/vector-database';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Vector Database Module (Corrected)', () => {
  let vectorDB: VectorDatabaseModule;

  beforeEach(() => {
    vectorDB = new VectorDatabaseModule();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize in mock mode', async () => {
      await vectorDB.initialize();

      expect(vectorDB.isInitialized).toBe(true);
    });

    it('should start and initialize automatically', async () => {
      await vectorDB.start();

      expect(vectorDB.isInitialized).toBe(true);
    });

    it('should handle cleanup properly', async () => {
      await vectorDB.initialize();
      expect(vectorDB.isInitialized).toBe(true);

      await vectorDB.cleanup();
      expect(vectorDB.isInitialized).toBe(false);
    });

    it('should handle stop operation', async () => {
      await vectorDB.initialize();
      await vectorDB.stop();

      // Should not throw and should remain initialized
      expect(vectorDB.isInitialized).toBe(true);
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    it('should add documents in mock mode', async () => {
      const document = {
        id: 'test-doc-1',
        content: 'Test document content about React hooks',
        metadata: { type: 'test', category: 'react' }
      };

      await vectorDB.addDocument(document);

      // Should not throw and document should be added
      expect(vectorDB.isInitialized).toBe(true);
    });

    it('should search for documents by content', async () => {
      const documents = [
        {
          id: 'doc1',
          content: 'React hooks tutorial for beginners',
          metadata: { topic: 'react' }
        },
        {
          id: 'doc2',
          content: 'Vue composition guide',
          metadata: { topic: 'vue' }
        },
        {
          id: 'doc3',
          content: 'Advanced React patterns and hooks',
          metadata: { topic: 'react' }
        }
      ];

      // Add documents
      for (const doc of documents) {
        await vectorDB.addDocument(doc);
      }

      // Search for React-related content
      const results = await vectorDB.search('react hooks', { limit: 5 });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.content).toContain('React');
      expect(results[0].score).toBeGreaterThan(0.8);
      expect(results[0].score).toBeLessThanOrEqual(1.0);
    });

    it('should return empty results for non-matching queries', async () => {
      const document = {
        id: 'doc1',
        content: 'React hooks tutorial',
        metadata: { topic: 'react' }
      };

      await vectorDB.addDocument(document);

      const results = await vectorDB.search('nonexistent topic', { limit: 5 });

      expect(results).toEqual([]);
    });

    it('should handle case-insensitive search', async () => {
      const document = {
        id: 'doc1',
        content: 'React Hooks Tutorial',
        metadata: { topic: 'react' }
      };

      await vectorDB.addDocument(document);

      const results1 = await vectorDB.search('react hooks');
      const results2 = await vectorDB.search('REACT HOOKS');

      expect(results1.length).toBe(1);
      expect(results2.length).toBe(1);
    });

    it('should respect search limit parameter', async () => {
      const documents = Array.from({ length: 15 }, (_, i) => ({
        id: `doc${i}`,
        content: `React hooks content ${i}`,
        metadata: { index: i }
      }));

      for (const doc of documents) {
        await vectorDB.addDocument(doc);
      }

      const results = await vectorDB.search('react hooks', { limit: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should delete documents', async () => {
      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);

      // Verify document was added by searching
      let results = await vectorDB.search('test document');
      expect(results.length).toBe(1);

      // Delete document
      await vectorDB.deleteDocument('test-doc-1');

      // Verify document was deleted
      results = await vectorDB.search('test document');
      expect(results.length).toBe(0);
    });

    it('should handle deletion of non-existent documents gracefully', async () => {
      // Should not throw when trying to delete non-existent document
      await vectorDB.deleteDocument('non-existent-id');
    });
  });

  describe('Statistics and Health', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    it('should return correct statistics for empty database', async () => {
      const stats = await vectorDB.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.collectionExists).toBe(true);
    });

    it('should return correct statistics after adding documents', async () => {
      const documents = Array.from({ length: 5 }, (_, i) => ({
        id: `doc${i}`,
        content: `Test content ${i}`,
        metadata: { index: i }
      }));

      for (const doc of documents) {
        await vectorDB.addDocument(doc);
      }

      const stats = await vectorDB.getStats();

      expect(stats.totalDocuments).toBe(5);
      expect(stats.collectionExists).toBe(true);
    });

    it('should update statistics after document deletion', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);

      let stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(1);

      await vectorDB.deleteDocument('test-doc');

      stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations when not initialized', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: { type: 'test' }
      };

      // Should not throw when database not initialized
      await vectorDB.addDocument(document);

      const results = await vectorDB.search('test');
      expect(results).toEqual([]);

      await vectorDB.deleteDocument('test-doc');

      const stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.collectionExists).toBe(false);
    });

    it('should handle cleanup and re-initialization', async () => {
      await vectorDB.initialize();

      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);
      let stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(1);

      await vectorDB.cleanup();
      stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.collectionExists).toBe(false);

      // Should be able to re-initialize
      await vectorDB.initialize();
      expect(vectorDB.isInitialized).toBe(true);
    });

    it('should handle multiple start operations', async () => {
      await vectorDB.start();
      await vectorDB.start();
      await vectorDB.start();

      expect(vectorDB.isInitialized).toBe(true);
    });

    it('should handle start after cleanup', async () => {
      await vectorDB.initialize();
      await vectorDB.cleanup();
      expect(vectorDB.isInitialized).toBe(false);

      await vectorDB.start();
      expect(vectorDB.isInitialized).toBe(true);
    });
  });

  describe('Mock Implementation Behavior', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    it('should generate mock embeddings', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);

      const results = await vectorDB.search('test');
      expect(results[0].document.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should generate mock scores in expected range', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content for scoring',
        metadata: { type: 'test' }
      };

      await vectorDB.addDocument(document);

      const results = await vectorDB.search('test');
      expect(results[0].score).toBeGreaterThanOrEqual(0.8);
      expect(results[0].score).toBeLessThanOrEqual(1.0);
    });

    it('should preserve document metadata', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: {
          type: 'test',
          category: 'testing',
          tags: ['unit', 'integration'],
          priority: 1
        }
      };

      await vectorDB.addDocument(document);

      const results = await vectorDB.search('test');
      expect(results[0].document.metadata).toEqual(document.metadata);
      expect(results[0].metadata).toEqual(document.metadata);
    });

    it('should track creation and update times', async () => {
      const document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: { type: 'test' }
      };

      const beforeAdd = new Date();
      await vectorDB.addDocument(document);
      const afterAdd = new Date();

      const results = await vectorDB.search('test');
      const doc = results[0].document;

      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
      expect(doc.createdAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      expect(doc.createdAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
      expect(doc.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      expect(doc.updatedAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
    });
  });

  describe('Performance Characteristics', () => {
    beforeEach(async () => {
      await vectorDB.initialize();
    });

    it('should handle multiple document additions efficiently', async () => {
      const startTime = Date.now();

      const documents = Array.from({ length: 100 }, (_, i) => ({
        id: `doc${i}`,
        content: `Test content for document ${i}`,
        metadata: { index: i }
      }));

      for (const doc of documents) {
        await vectorDB.addDocument(doc);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const stats = await vectorDB.getStats();
      expect(stats.totalDocuments).toBe(100);
    });

    it('should handle search operations efficiently', async () => {
      // Add 50 documents
      const documents = Array.from({ length: 50 }, (_, i) => ({
        id: `doc${i}`,
        content: `React hooks tutorial ${i} with advanced concepts`,
        metadata: { topic: 'react', level: i % 5 }
      }));

      for (const doc of documents) {
        await vectorDB.addDocument(doc);
      }

      const startTime = Date.now();
      const results = await vectorDB.search('react hooks', { limit: 10 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Search should complete within 1 second
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});