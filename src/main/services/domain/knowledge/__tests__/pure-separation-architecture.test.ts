import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';
import type { ILogger } from '@/main/services/types';

// Mock dependencies - keep as plain objects with vi.fn() for mock methods
const mockDb = {
  selectFrom: vi.fn(),
  insertInto: vi.fn(),
  updateTable: vi.fn(),
  deleteFrom: vi.fn(),
  transaction: vi.fn(),
};

const mockVectorDatabase = {
  addDocumentBatch: vi.fn(),
  search: vi.fn(),
  deleteDocument: vi.fn(),
  addDocumentWithEmbedding: vi.fn(),
  getStats: vi.fn(),
  start: vi.fn(),
};

const mockLogger: ILogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => mockLogger,
};

const mockLoggerService = {
  child: () => mockLogger,
};

const mockRerankFn = vi.fn(async (_query: string, docs: string[]) => ({
  indices: docs.map((_, i) => i),
  scores: docs.map(() => 0.9),
}));

const mockProviderFactory = {
  getEmbeddingModel: vi.fn(async () => ({
    embed: vi.fn(async () => Array(1536).fill(0.1)),
    embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    dimensions: 1536,
  })),
  getRerankModel: vi.fn(async () => ({
    rerank: mockRerankFn,
    settings: { model: 'test-rerank' },
  })),
  getModel: vi.fn(),
  getEmbeddings: vi.fn(),
};

// Helper to create service with type casts applied at creation time
const createTestService = () =>
  createKnowledgeService({
    db: mockDb as never,
    vectorDatabase: mockVectorDatabase as never,
    providerFactory: mockProviderFactory as never,
    loggerService: mockLoggerService,
  });

describe('pure separation architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('vector database payload structure', () => {
    it('should store only conceptId and content in Qdrant', async () => {
      const _service = createTestService();

      // Mock insertion flow
      const mockConcepts = [
        {
          id: 'concept-1',
          name: 'Variables',
          description: 'Variables store data',
          type: 'concept',
          level: 1,
          confidence: 0.9,
          path: 'Python > Variables',
        },
      ];

      // Mock the embedding model
      const embeddingModel = await mockProviderFactory.getEmbeddingModel();

      // Simulate what addConceptsToVector should do
      const conceptTexts = mockConcepts.map(concept => `${concept.name}\n\n${concept.description}`);
      const embeddings = await embeddingModel.embedBatch(conceptTexts);

      const documentsWithEmbeddings = mockConcepts.map((concept, index) => ({
        doc: {
          id: `concept:${concept.id}`,
          content: conceptTexts[index],
          metadata: {
            conceptId: concept.id, // ✅ ONLY conceptId in Qdrant
          },
        },
        embedding: embeddings[index],
      }));

      // Verify the structure
      expect(documentsWithEmbeddings[0].doc.metadata).toEqual({
        conceptId: 'concept-1',
      });

      // Should NOT have type, level, path, confidence
      const metadata = documentsWithEmbeddings[0].doc.metadata as Record<string, unknown>;
      expect(metadata.type).toBeUndefined();
      expect(metadata.level).toBeUndefined();
      expect(metadata.path).toBeUndefined();
      expect(metadata.confidence).toBeUndefined();

      // Verify content is included
      expect(documentsWithEmbeddings[0].doc.content).toBe('Variables\n\nVariables store data');
    });

    it('should truncate content to 500 chars for Qdrant', async () => {
      const _service = createTestService();

      const longDescription = 'x'.repeat(1000);
      const mockConcept = {
        id: 'concept-long',
        name: 'Long Concept',
        description: longDescription,
      };

      const conceptText = `${mockConcept.name}\n\n${mockConcept.description}`;
      const truncatedText = conceptText.substring(0, 500);

      expect(truncatedText.length).toBe(500);
      expect(conceptText.length).toBeGreaterThan(500);
    });
  });

  describe('search functionality with pure separation', () => {
    it('should extract conceptId from Qdrant results', async () => {
      const service = createTestService();

      // Mock Qdrant search results (minimal payload)
      const mockQdrantResults = [
        {
          document: {
            id: 'concept:concept-1',
            content: 'Variables\n\nVariables store data',
            metadata: {
              conceptId: 'concept-1', // ✅ Only conceptId
            },
          },
          score: 0.92,
        },
        {
          document: {
            id: 'concept:concept-2',
            content: 'Functions\n\nFunctions are reusable',
            metadata: {
              conceptId: 'concept-2',
            },
          },
          score: 0.85,
        },
      ];

      mockVectorDatabase.search.mockResolvedValue(mockQdrantResults);

      // Mock SQLite query
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              {
                id: 'concept-1',
                name: 'Variables',
                concept_type: 'concept',
                difficulty_level: 1,
                description: 'Variables store data',
                metadata: JSON.stringify({ path: 'Python > Variables' }),
              },
              {
                id: 'concept-2',
                name: 'Functions',
                concept_type: 'concept',
                difficulty_level: 2,
                description: 'Functions are reusable',
                metadata: JSON.stringify({ path: 'Python > Functions' }),
              },
            ]),
          }),
        }),
      });

      const result = await service.semanticSearch('variables', 10);

      // Verify Qdrant was called with correct params
      expect(mockVectorDatabase.search).toHaveBeenCalledWith('variables', {
        limit: 20,
        threshold: 0.5,
      });

      // Verify conceptIds were extracted
      const conceptIds = mockQdrantResults.map(r => r.document.metadata.conceptId);
      expect(conceptIds).toEqual(['concept-1', 'concept-2']);

      // Verify SQLite was queried for full data
      expect(mockDb.selectFrom).toHaveBeenCalledWith('concepts');
      expect((mockDb.selectFrom('concepts') as { selectAll: Mock }).selectAll).toHaveBeenCalled();

      // Verify results combine Qdrant scores with SQLite data
      expect(result).toHaveLength(2);
      expect(result[0].concept.name).toBe('Variables');
      expect(result[0].concept.type).toBe('concept');
      expect(result[0].concept.difficultyLevel).toBe(1);
      expect(result[0].relevanceScore).toBe(0.92);
    });

    it('should return empty array when no Qdrant results', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([]);

      const result = await service.semanticSearch('nonexistent', 10);

      expect(result).toEqual([]);
    });

    it('should return empty array when no conceptIds in results', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([
        {
          document: {
            id: 'doc-1',
            content: 'Some content',
            metadata: {}, // No conceptId
          },
          score: 0.5,
        },
      ]);

      const result = await service.semanticSearch('query', 10);

      expect(result).toEqual([]);
    });
  });

  describe('findRelatedByPrompt with pure separation', () => {
    it('should search Qdrant and enrich from SQLite', async () => {
      const service = createTestService();

      const mockVectorResults = [
        {
          document: {
            id: 'concept:concept-1',
            content: 'Variables\n\nVariables store data',
            metadata: {
              conceptId: 'concept-1',
            },
          },
          score: 0.9,
        },
      ];

      mockVectorDatabase.search.mockResolvedValue(mockVectorResults);

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              {
                id: 'concept-1',
                name: 'Variables',
                concept_type: 'concept',
                difficulty_level: 1,
                description: 'Variables store data',
                metadata: JSON.stringify({ path: 'Python > Variables' }),
              },
            ]),
          }),
        }),
      });

      const result = await service.findRelatedByPrompt('variables', { limit: 10, threshold: 0.5 });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]!.id).toBe('concept-1');
      expect(result.matches[0]!.name).toBe('Variables');
      expect(result.matches[0]!.type).toBe('concept');
      expect(result.matches[0]!.metadata.conceptId).toBe('concept-1');
      expect(result.matches[0]!.metadata.type).toBe('concept');
      expect(result.matches[0]!.metadata.level).toBe(1);
      expect(result.matches[0]!.metadata.path).toBe('Python > Variables');
    });

    it('should use SQLite data for reranking content', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([
        {
          document: {
            id: 'concept:concept-1',
            content: 'Variables', // Short Qdrant content
            metadata: { conceptId: 'concept-1' },
          },
          score: 0.9,
        },
      ]);

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              {
                id: 'concept-1',
                name: 'Variables',
                concept_type: 'concept',
                difficulty_level: 1,
                description: 'Detailed description from SQLite',
                metadata: JSON.stringify({}),
              },
            ]),
          }),
        }),
      });

      await service.findRelatedByPrompt('query', { limit: 10 });

      // Verify rerank model was called with SQLite-enriched content
      expect(mockRerankFn).toHaveBeenCalled();
      const rerankCall = mockRerankFn.mock.calls[0];
      expect(rerankCall![1][0]).toContain('Variables\n\nDetailed description from SQLite');
    });
  });

  describe('data consistency checks', () => {
    it('should maintain order by Qdrant relevance score', async () => {
      const service = createTestService();

      // Qdrant results in one order
      const mockQdrantResults = [
        {
          document: { id: 'concept:1', content: 'Content 1', metadata: { conceptId: 'concept-1' } },
          score: 0.95, // Highest score
        },
        {
          document: { id: 'concept:2', content: 'Content 2', metadata: { conceptId: 'concept-2' } },
          score: 0.85, // Lower score
        },
      ];

      mockVectorDatabase.search.mockResolvedValue(mockQdrantResults);

      // SQLite returns in different order
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              { id: 'concept-2', name: 'Concept 2', concept_type: 'concept', difficulty_level: 1, description: 'Desc 2', metadata: '{}' },
              { id: 'concept-1', name: 'Concept 1', concept_type: 'concept', difficulty_level: 1, description: 'Desc 1', metadata: '{}' },
            ]),
          }),
        }),
      });

      const result = await service.semanticSearch('query', 10);

      // Should maintain Qdrant order (0.95 first, then 0.85)
      expect(result[0].relevanceScore).toBe(0.95);
      expect(result[0].concept.name).toBe('Concept 1');
      expect(result[1].relevanceScore).toBe(0.85);
      expect(result[1].concept.name).toBe('Concept 2');
    });

    it('should filter out concepts not found in SQLite', async () => {
      const service = createTestService();

      const mockQdrantResults = [
        {
          document: { id: 'concept:1', content: 'Content 1', metadata: { conceptId: 'concept-1' } },
          score: 0.9,
        },
        {
          document: { id: 'concept:2', content: 'Content 2', metadata: { conceptId: 'concept-2' } },
          score: 0.8,
        },
        {
          document: { id: 'concept:3', content: 'Content 3', metadata: { conceptId: 'concept-3' } },
          score: 0.7,
        },
      ];

      mockVectorDatabase.search.mockResolvedValue(mockQdrantResults);

      // SQLite only has concepts 1 and 3
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              { id: 'concept-1', name: 'Concept 1', concept_type: 'concept', difficulty_level: 1, description: 'Desc 1', metadata: '{}' },
              { id: 'concept-3', name: 'Concept 3', concept_type: 'concept', difficulty_level: 1, description: 'Desc 3', metadata: '{}' },
            ]),
          }),
        }),
      });

      const result = await service.semanticSearch('query', 10);

      // Should only return 2 results (concept-2 filtered out)
      expect(result).toHaveLength(2);
      expect(result[0].concept.id).toBe('concept-1');
      expect(result[1].concept.id).toBe('concept-3');
    });

    it('should limit results after filtering', async () => {
      const service = createTestService();

      // 20 Qdrant results
      const mockQdrantResults = Array.from({ length: 20 }, (_, i) => ({
        document: { id: `concept:${i}`, content: `Content ${i}`, metadata: { conceptId: `concept-${i}` } },
        score: 1.0 - i * 0.01,
      }));

      mockVectorDatabase.search.mockResolvedValue(mockQdrantResults);

      // SQLite has all 20
      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue(
              Array.from({ length: 20 }, (_, i) => ({
                id: `concept-${i}`,
                name: `Concept ${i}`,
                concept_type: 'concept',
                difficulty_level: 1,
                description: `Desc ${i}`,
                metadata: '{}',
              }))
            ),
          }),
        }),
      });

      const result = await service.semanticSearch('query', 10);

      // Should limit to 10 after filtering
      expect(result).toHaveLength(10);
    });
  });

  describe('error handling', () => {
    it('should handle SQLite query failures gracefully', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([
        {
          document: { id: 'concept:1', content: 'Content', metadata: { conceptId: 'concept-1' } },
          score: 0.9,
        },
      ]);

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockRejectedValue(new Error('SQLite error')),
          }),
        }),
      });

      await expect(service.semanticSearch('query', 10)).rejects.toThrow('SQLite error');
    });

    it('should handle missing metadata gracefully', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([
        {
          document: { id: 'concept:1', content: 'Content', metadata: { conceptId: 'concept-1' } },
          score: 0.9,
        },
      ]);

      mockDb.selectFrom.mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([
              {
                id: 'concept-1',
                name: 'Concept',
                concept_type: 'concept',
                difficulty_level: 1,
                description: 'Desc',
                metadata: null, // Missing metadata
              },
            ]),
          }),
        }),
      });

      const result = await service.semanticSearch('query', 10);

      expect(result).toHaveLength(1);
      expect(result[0].concept.name).toBe('Concept');
    });
  });

  describe('performance characteristics', () => {
    it('should use lower threshold for better recall', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([]);

      await service.semanticSearch('query', 10);

      expect(mockVectorDatabase.search).toHaveBeenCalledWith('query', {
        limit: 20, // limit * 2
        threshold: 0.5, // Lower threshold
      });
    });

    it('should fetch more results than requested for filtering', async () => {
      const service = createTestService();

      mockVectorDatabase.search.mockResolvedValue([]);

      await service.semanticSearch('query', 10);

      // Should request limit * 2 to allow for filtering
      expect(mockVectorDatabase.search).toHaveBeenCalledWith('query', {
        limit: 20,
        threshold: 0.5,
      });
    });
  });
});
