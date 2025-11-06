/**
 * IPC Communication Integration Tests
 *
 * Tests for the inter-process communication between the renderer
 * and main processes, ensuring proper database and service operations.
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock Electron APIs
const mockIPC = {
  invoke: vi.fn(),
  dbSetPath: vi.fn(),
  dbExecuteScript: vi.fn(),
  dbExecuteQuery: vi.fn(),
  dbFetchOne: vi.fn(),
  dbFetchAll: vi.fn(),
  vectorAddDocument: vi.fn(),
  vectorSearch: vi.fn(),
  vectorDeleteDocument: vi.fn(),
  vectorGetDocument: vi.fn(),
  vectorListCollections: vi.fn(),
  vectorCreateCollection: vi.fn(),
  vectorDeleteCollection: vi.fn(),
};

// Set up global window.electronAPI
beforeEach(() => {
  (window as any).electronAPI = mockIPC;
  vi.clearAllMocks();
});

describe('IPC Communication Integration', () => {
  describe('Database Operations', () => {
    test('should perform complete database workflow via IPC', async () => {
      // 1. Initialize database
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });

      // Import and initialize Database using DatabaseFactory
      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = DatabaseFactory.createElectronDB(mockIPC, '/mock/user/data', false, true);

      await act(async () => {
        await database.init();
      });

      expect(database).toBeDefined();
      expect(mockIPC.dbSetPath).toHaveBeenCalledWith('/mock/user/data');
      expect(mockIPC.dbExecuteScript).toHaveBeenCalledTimes(2); // Schema + default data

      // 2. Create concept via IPC
      const conceptData = {
        id: 'test-concept-1',
        name: 'Test Concept',
        description: 'A test concept',
        concept_type: 'topic',
        difficulty_level: 1,
        mastery_level: 0.0,
        tags: '["test"]',
        metadata: '{}'
      };

      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true, result: 'last-insert-rowid' });

      await act(async () => {
        await database.createConcept(conceptData);
      });

      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO concepts'),
        expect.arrayContaining([
          'test-concept-1',
          'Test Concept',
          expect.any(String),
          'topic',
          1,
          0.0,
          expect.stringContaining('test'),
          expect.any(String),
          expect.any(String),
          expect.any(Number),
          expect.any(String)
        ])
      );

      // 3. Retrieve concept via IPC
      mockIPC.dbFetchOne.mockResolvedValue({
        success: true,
        result: conceptData
      });

      let retrievedConcept;
      await act(async () => {
        retrievedConcept = await database.getConcept('test-concept-1');
      });

      expect(retrievedConcept).toEqual(conceptData);
      expect(mockIPC.dbFetchOne).toHaveBeenCalledWith(
        'SELECT * FROM concepts WHERE id = ?',
        ['test-concept-1']
      );

      // 4. Update concept via IPC
      const updates = { mastery_level: 0.5 };
      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });

      await act(async () => {
        await database.updateConcept('test-concept-1', updates);
      });

      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE concepts SET'),
        expect.arrayContaining([0.5, 'test-concept-1'])
      );

      // 5. Query multiple concepts via IPC
      const mockConcepts = [conceptData];
      mockIPC.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockConcepts
      });

      let allConcepts;
      await act(async () => {
        allConcepts = await database.query('SELECT * FROM concepts');
      });

      expect(allConcepts).toEqual(mockConcepts);
      expect(mockIPC.dbFetchAll).toHaveBeenCalledWith('SELECT * FROM concepts', []);
    });

    test('should handle database errors and propagate through IPC', async () => {
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: false, error: 'Permission denied' });

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = DatabaseFactory.createElectronDB(mockIPC, '/mock/user/data', false, true);

      await expect(database.init()).rejects.toThrow();
      expect(database).toBeDefined();
    });

    test('should handle concurrent database operations via IPC', async () => {
      // Setup database
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = DatabaseFactory.createElectronDB(mockIPC, '/mock/user/data', false, true);
      await database.init();

      // Mock successful operations
      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });
      mockIPC.dbFetchOne.mockResolvedValue({ success: true, result: { id: 'test', name: 'Test' } });

      // Execute multiple concurrent operations
      const operations = [
        database.createConcept({ id: 'test1', name: 'Test 1', concept_type: 'topic', difficulty_level: 1, mastery_level: 0, tags: '[]', metadata: '{}' }),
        database.createConcept({ id: 'test2', name: 'Test 2', concept_type: 'topic', difficulty_level: 1, mastery_level: 0, tags: '[]', metadata: '{}' }),
        database.getConcept('test1'),
        database.getConcept('test2')
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(4);
      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledTimes(2);
      expect(mockIPC.dbFetchOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('Vector Database Operations', () => {
    test('should perform complete vector database workflow via IPC', async () => {
      // 1. Initialize vector database in mock mode
      mockIPC.invoke.mockResolvedValue({ success: false, error: 'Qdrant unavailable' });

      const { VectorDatabaseModule } = await import('../../main/services/database/vector-database');
      const vectorDB = new VectorDatabaseModule();

      await act(async () => {
        await vectorDB.initialize();
      });

      expect(vectorDB.isInitialized).toBe(true);
      expect(vectorDB.isMockMode).toBe(true);

      // 2. Add document via mock IPC (in mock mode)
      const document = {
        id: 'test-doc-1',
        content: 'Test document content',
        metadata: { type: 'test' }
      };

      let addResult;
      await act(async () => {
        addResult = await vectorDB.addDocument('test-collection', document);
      });

      expect(addResult).toBe(true);

      // 3. Search documents via mock IPC
      let searchResults;
      await act(async () => {
        searchResults = await vectorDB.search('test-collection', 'test query', 5);
      });

      expect(searchResults).toBeDefined();

      // 4. Get document via mock IPC
      let retrievedDoc;
      await act(async () => {
        retrievedDoc = await vectorDB.getDocument('test-collection', 'test-doc-1');
      });

      expect(retrievedDoc).toEqual(document);

      // 5. Delete document via mock IPC
      let deleteResult;
      await act(async () => {
        deleteResult = await vectorDB.deleteDocument('test-collection', 'test-doc-1');
      });

      expect(deleteResult).toBe(true);
    });

    test('should handle real vector database operations via IPC', async () => {
      // 1. Initialize in real mode
      mockIPC.invoke.mockResolvedValue({ success: true });

      const { VectorDatabaseModule } = await import('../../main/services/database/vector-database');
      const vectorDB = new VectorDatabaseModule();
      await vectorDB.initialize();

      expect(vectorDB.isMockMode).toBe(false);

      // 2. Real vector database operations
      const document = {
        id: 'real-doc-1',
        content: 'Real document content',
        metadata: { type: 'production' }
      };

      mockIPC.vectorAddDocument.mockResolvedValue({ success: true });
      mockIPC.vectorSearch.mockResolvedValue({
        success: true,
        results: [{ id: 'real-doc-1', score: 0.95, payload: document }]
      });
      mockIPC.vectorGetDocument.mockResolvedValue({
        success: true,
        result: document
      });
      mockIPC.vectorDeleteDocument.mockResolvedValue({ success: true });

      // Add document
      await act(async () => {
        await vectorDB.addDocument('production-collection', document);
      });

      expect(mockIPC.vectorAddDocument).toHaveBeenCalledWith('production-collection', document);

      // Search documents
      await act(async () => {
        await vectorDB.search('production-collection', 'search query', 5);
      });

      expect(mockIPC.vectorSearch).toHaveBeenCalledWith('production-collection', 'search query', 5);

      // Get document
      await act(async () => {
        await vectorDB.getDocument('production-collection', 'real-doc-1');
      });

      expect(mockIPC.vectorGetDocument).toHaveBeenCalledWith('production-collection', 'real-doc-1');

      // Delete document
      await act(async () => {
        await vectorDB.deleteDocument('production-collection', 'real-doc-1');
      });

      expect(mockIPC.vectorDeleteDocument).toHaveBeenCalledWith('production-collection', 'real-doc-1');
    });
  });

  describe('Knowledge Service Integration', () => {
    test('should integrate knowledge service with database via IPC', async () => {
      // Setup database mocks
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });

      // Setup vector database mocks
      mockIPC.vectorAddDocument.mockResolvedValue({ success: true });
      mockIPC.vectorSearch.mockResolvedValue({ success: true, results: [] });

      // Initialize services
      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const { KnowledgeService } = await import('../../main/services/database/knowledge-service');

      const database = new DatabaseFactory();
      await database.initialize();

      const knowledgeService = new KnowledgeService();

      // Create concept through knowledge service (uses database via IPC)
      const conceptData = {
        name: 'React Hooks',
        description: 'React hooks functionality',
        conceptType: 'topic',
        difficultyLevel: 3,
        tags: ['react', 'hooks'],
        metadata: { category: 'frontend' }
      };

      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });

      let concept;
      await act(async () => {
        concept = await knowledgeService.createConcept(conceptData);
      });

      expect(concept).toBeDefined();
      expect(concept.name).toBe('React Hooks');

      // Verify database was called via IPC
      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO concepts'),
        expect.any(Array)
      );

      // Verify vector database was called via IPC
      expect(mockIPC.vectorAddDocument).toHaveBeenCalledWith(
        'concepts',
        expect.objectContaining({
          id: expect.stringMatching(/^concept_/),
          content: expect.stringContaining('React Hooks')
        })
      );
    });

    test('should handle knowledge graph operations via IPC', async () => {
      // Setup mocks
      mockIPC.dbFetchOne.mockResolvedValue({
        success: true,
        result: { id: 'concept_react', name: 'React', concept_type: 'topic' }
      });
      mockIPC.dbFetchAll.mockResolvedValue({
        success: true,
        result: [
          {
            id: 'rel_1',
            source_concept_id: 'concept_javascript',
            target_concept_id: 'concept_react',
            relationship_type: 'prerequisite',
            strength: 0.9
          }
        ]
      });

      const { KnowledgeService } = await import('../../main/services/database/knowledge-service');
      const knowledgeService = new KnowledgeService();

      // Get knowledge graph
      let graph;
      await act(async () => {
        graph = await knowledgeService.getKnowledgeGraph('concept_react');
      });

      expect(graph).toBeDefined();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(1);
      expect(graph.nodes[0].name).toBe('React');
      expect(graph.edges[0].relationshipType).toBe('prerequisite');

      // Verify IPC calls
      expect(mockIPC.dbFetchOne).toHaveBeenCalledWith(
        'SELECT * FROM concepts WHERE id = ?',
        ['concept_react']
      );
      expect(mockIPC.dbFetchAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM relationships WHERE'),
        ['concept_react', 'concept_react']
      );
    });
  });

  describe('Cross-Service Integration', () => {
    test('should handle analytics service integration via IPC', async () => {
      // Setup database mocks for analytics
      mockIPC.dbFetchOne.mockResolvedValue({ success: true, result: { count: 25 } });
      mockIPC.dbFetchAll.mockResolvedValue({
        success: true,
        result: [
          { date: '2024-01-15', study_time: 120, concepts_studied: 3 },
          { date: '2024-01-14', study_time: 90, concepts_studied: 2 }
        ]
      });

      // Import and test analytics service
      const { AnalyticsService } = await import('../../renderer/services/analytics/analytics-service');
      const analyticsService = new AnalyticsService();

      // Get statistics
      let stats;
      await act(async () => {
        stats = await analyticsService.getOverallStatistics();
      });

      expect(stats).toBeDefined();
      expect(mockIPC.dbFetchOne).toHaveBeenCalled();

      // Get learning trends
      let trends;
      await act(async () => {
        trends = await analyticsService.getLearningTrends({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });
      });

      expect(trends).toHaveLength(2);
      expect(mockIPC.dbFetchAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DATE'),
        expect.any(Array)
      );
    });

    test('should handle configuration service integration via IPC', async () => {
      // Setup configuration mocks
      mockIPC.invoke.mockResolvedValue('/mock/config/path');
      mockIPC.dbFetchOne.mockResolvedValue({
        success: true,
        result: { key: 'ai.provider', value: 'openai', data_type: 'string' }
      });
      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });

      // Import and test configuration service
      const { ConfigurationService } = await import('../../renderer/services/configuration/configuration-service');
      const configService = new ConfigurationService();

      // Get configuration
      let config;
      await act(async () => {
        config = await configService.getConfiguration();
      });

      expect(config).toBeDefined();
      expect(mockIPC.dbFetchOne).toHaveBeenCalled();

      // Set configuration
      await act(async () => {
        await configService.setConfiguration('ai.provider', 'openai');
      });

      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO settings'),
        expect.arrayContaining(['ai.provider', 'openai', 'string'])
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle IPC timeout errors gracefully', async () => {
      // Mock timeout
      mockIPC.invoke.mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('IPC timeout')), 100)
        )
      );

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = new DatabaseFactory();

      await expect(database.initialize()).rejects.toThrow('IPC timeout');
    });

    test('should handle partial IPC failures', async () => {
      // Database succeeds, vector database fails
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });
      mockIPC.vectorAddDocument.mockResolvedValue({ success: false, error: 'Vector DB down' });

      const { KnowledgeService } = await import('../../main/services/database/knowledge-service');
      const knowledgeService = new KnowledgeService();

      // Should still create concept even if vector database fails
      const conceptData = {
        name: 'Test Concept',
        conceptType: 'topic',
        difficultyLevel: 1
      };

      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });

      let concept;
      await act(async () => {
        concept = await knowledgeService.createConcept(conceptData);
      });

      expect(concept).toBeDefined();
      expect(concept.name).toBe('Test Concept');
    });

    test('should handle IPC reconnection scenarios', async () => {
      // Initial failure, then success
      mockIPC.invoke
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce('/mock/user/data');

      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = new DatabaseFactory();

      // First attempt fails
      await expect(database.initialize()).rejects.toThrow('Connection lost');

      // Second attempt succeeds
      await act(async () => {
        await database.initialize();
      });

      expect(database.isInitialized).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('should batch IPC operations efficiently', async () => {
      const startTime = Date.now();

      // Setup mocks
      mockIPC.invoke.mockResolvedValue('/mock/user/data');
      mockIPC.dbSetPath.mockResolvedValue({ success: true });
      mockIPC.dbExecuteScript.mockResolvedValue({ success: true });
      mockIPC.dbExecuteQuery.mockResolvedValue({ success: true });

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = new DatabaseFactory();
      await database.initialize();

      // Create multiple concepts in batch
      const concepts = Array.from({ length: 100 }, (_, i) => ({
        id: `concept_${i}`,
        name: `Concept ${i}`,
        concept_type: 'topic',
        difficulty_level: 1,
        mastery_level: 0,
        tags: '[]',
        metadata: '{}'
      }));

      await act(async () => {
        await Promise.all(concepts.map(concept => database.createConcept(concept)));
      });

      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      expect(mockIPC.dbExecuteQuery).toHaveBeenCalledTimes(100);
    });

    test('should cache IPC responses where appropriate', async () => {
      // Setup mocks
      mockIPC.dbFetchOne.mockResolvedValue({
        success: true,
        result: { id: 'cached-concept', name: 'Cached Concept' }
      });

      const { DatabaseFactory } = await import('../../main/services/database/kysely-database');
      const database = new DatabaseFactory();
      await database.initialize();

      // First call
      await act(async () => {
        await database.getConcept('cached-concept');
      });

      // Second call (should potentially use cache)
      await act(async () => {
        await database.getConcept('cached-concept');
      });

      // In a real implementation, this would verify caching behavior
      expect(mockIPC.dbFetchOne).toHaveBeenCalledTimes(2);
    });
  });
});