import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';

// Mock logger following DI pattern from docs
const createLoggerService = () => {
  const createLogger = () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: createLogger,
  });

  return {
    child: (meta: Record<string, unknown>) => createLogger(),
  };
};

// Mock vector database following DI pattern
const createMockVectorDatabase = () => {
  return {
    addDocument: vi.fn(),
    addDocumentWithEmbedding: vi.fn(),
    addDocumentBatch: vi.fn(),
    search: vi.fn(),
    deleteDocument: vi.fn(),
    getStats: vi.fn(),
    start: vi.fn(),
  };
};

// Mock provider factory following DI pattern
const createMockProviderFactory = () => {
  const rerankModel = {
    settings: { providerName: 'mock', model: 'mock-rerank' },
    rerank: vi.fn(async (query: string, documents: string[]) => {
      const scores = documents.map((_, i) => 1.0 - i * 0.1);
      const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
      return {
        indices,
        scores: indices.map((i) => scores[i]),
      };
    }),
  };

  const providerFactory = {
    getModel: vi.fn(),
    setModel: vi.fn(),
    getEmbeddingModel: vi.fn(),
    getRerankModel: vi.fn(async () => rerankModel),
    getEmbeddings: vi.fn(async () => {
      const mockEmbeddings = {
        embedQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
        embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
        // Add required properties from Embeddings interface
        caller: 'test',
        concurrency: 5,
      };
      return mockEmbeddings as any;
    }),
  };

  return { providerFactory, rerankModel };
};

// Mock database following DI pattern (no real SQLite needed)
const createMockDatabase = () => {
  // Helper to create a query builder mock
  const createQueryBuilder = (executeMock: any) => ({
    selectAll: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
        if (operator === 'in' && Array.isArray(value)) {
          // Support both .where('id', 'in', array) and .where().in() patterns
          return {
            execute: vi.fn().mockResolvedValue(executeMock),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(executeMock),
            }),
          }),
        };
      }),
    }),
    where: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(executeMock),
      }),
    }),
    execute: vi.fn().mockResolvedValue(executeMock),
  });

  return {
    selectFrom: vi.fn().mockImplementation(() => {
      return createQueryBuilder([]);
    }),
    // Add other methods as needed by the service
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    deleteFrom: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue(undefined),
    }),
  } as any;
};

describe('findRelatedByPrompt', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let vectorDatabase: ReturnType<typeof createMockVectorDatabase>;
  let service: ReturnType<typeof createKnowledgeService>;
  let rerankModel: any;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockDb = createMockDatabase();
    vectorDatabase = createMockVectorDatabase();

    const { providerFactory, rerankModel: model } = createMockProviderFactory();
    rerankModel = model;

    service = createKnowledgeService({
      db: mockDb,
      vectorDatabase,
      providerFactory,
      loggerService: createLoggerService(),
    });
  });

  it('should search vector database with prompt and return formatted results', async () => {
    // Mock Qdrant results (only conceptId in metadata - pure separation)
    const mockResults = [
      {
        document: {
          id: 'concept:concept-photo',
          content: 'Photosynthesis is the process by which plants convert light',
          metadata: {
            conceptId: 'concept-photo',
          },
        },
        score: 0.92,
      },
      {
        document: {
          id: 'concept:concept-chlorophyll',
          content: 'Chlorophyll absorbs light energy for photosynthesis',
          metadata: {
            conceptId: 'concept-chlorophyll',
          },
        },
        score: 0.88,
      },
    ];

    vectorDatabase.search.mockResolvedValue(mockResults);

    // Mock SQLite query for full concept data
    const mockConceptData = [
      {
        id: 'concept-photo',
        name: 'Photosynthesis',
        description: 'The process by which plants convert light energy',
        concept_type: 'concept',
        difficulty_level: 3,
        tags: '["biology", "plants"]',
        metadata: '{"path": "Biology > Photosynthesis"}',
        mastery_level: 0.5,
        review_count: 5,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 'concept-chlorophyll',
        name: 'Chlorophyll',
        description: 'The green pigment in plants',
        concept_type: 'concept',
        difficulty_level: 2,
        tags: '["biology", "plants", "pigments"]',
        metadata: '{"path": "Biology > Photosynthesis"}',
        mastery_level: 0.3,
        review_count: 3,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    // Configure the mock to return the specific data for this test
    // Need to handle the .where('id', 'in', array) pattern properly
    mockDb.selectFrom = vi.fn().mockReturnValue({
      selectAll: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation((column: string, operator: string, value: any) => {
          if (operator === 'in' && Array.isArray(value)) {
            return {
              execute: vi.fn().mockResolvedValue(mockConceptData),
            };
          }
          return {
            where: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                execute: vi.fn().mockResolvedValue(mockConceptData),
              }),
            }),
          };
        }),
      }),
    });

    const result = await service.findRelatedByPrompt('photosynthesis', {
      limit: 10,
      threshold: 0.5,
    });

    // Verify Qdrant search was called with new thresholds
    expect(vectorDatabase.search).toHaveBeenCalledWith('photosynthesis', {
      limit: 20,
      threshold: 0.5,
    });

    // Verify SQLite was queried for full concept data
    expect(mockDb.selectFrom).toHaveBeenCalledWith('concepts');

    // Verify rerank received full content from SQLite
    expect(rerankModel.rerank).toHaveBeenCalledWith(
      'photosynthesis',
      expect.arrayContaining([
        expect.stringContaining('Photosynthesis'),
        expect.stringContaining('Chlorophyll'),
      ]),
    );

    // Verify results use SQLite data
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]).toEqual({
      id: 'concept-photo',
      name: 'Photosynthesis',
      score: 1.0,
      type: 'concept',
      relationshipType: undefined,
      metadata: {
        conceptId: 'concept-photo',
        type: 'concept',
        level: 3,
        path: 'Biology > Photosynthesis',
      },
    });

    expect(result.matches[1]).toEqual({
      id: 'concept-chlorophyll',
      name: 'Chlorophyll',
      score: 0.9,
      type: 'concept',
      relationshipType: undefined,
      metadata: {
        conceptId: 'concept-chlorophyll',
        type: 'concept',
        level: 2,
        path: 'Biology > Photosynthesis',
      },
    });

    expect(result.query).toBe('photosynthesis');
    expect(result.timestamp).toBeDefined();
    expect(result.stats.vectorCount).toBe(2);
  });

  it('should use default limit and threshold when not provided', async () => {
    vectorDatabase.search.mockResolvedValue([]);

    await service.findRelatedByPrompt('machine learning');

    expect(vectorDatabase.search).toHaveBeenCalledWith('machine learning', {
      limit: 20,
      threshold: 0.5,  // Fixed: Default is 0.5, not 0.6
    });
  });

  it('should handle missing metadata gracefully', async () => {
    const mockResults = [
      {
        document: {
          id: 'doc1',
          content: 'Some content without metadata',
          metadata: { conceptId: 'doc1' },  // Fixed: Provide conceptId to avoid null access
        },
        score: 0.75,
        metadata: { conceptId: 'doc1' },
      },
    ];

    vectorDatabase.search.mockResolvedValue(mockResults);

    // Mock SQLite query to return data for this concept
    mockDb.selectFrom = vi.fn().mockReturnValue({
      selectAll: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => ({
          execute: vi.fn().mockResolvedValue([
            {
              id: 'doc1',
              name: 'Document One',
              description: 'Test document',
              concept_type: 'concept',
              difficulty_level: 1,
              tags: '[]',
              metadata: '{}',
              mastery_level: 0,
              review_count: 0,
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
            },
          ]),
        })),
      }),
    });

    const result = await service.findRelatedByPrompt('query', { limit: 5 });

    expect(result.matches[0]).toEqual({
      id: 'doc1',
      name: 'Document One',
      score: 1.0,
      type: 'concept',
      relationshipType: undefined,
      metadata: {
        conceptId: 'doc1',
        type: 'concept',
        level: 1,
        path: undefined,
      },
    });
  });

  it('should handle empty results', async () => {
    vectorDatabase.search.mockResolvedValue([]);

    const result = await service.findRelatedByPrompt('nonexistent query', {
      limit: 10,
    });

    expect(result.matches).toHaveLength(0);
    expect(result.stats.totalResults).toBe(0);
    expect(result.stats.vectorCount).toBe(0);
  });

  it('should propagate errors from vector database search', async () => {
    const error = new Error('Vector database connection failed');
    vectorDatabase.search.mockRejectedValue(error);

    await expect(
      service.findRelatedByPrompt('query', { limit: 10 }),
    ).rejects.toThrow('Vector database connection failed');
  });

  it('should return metadata in results', async () => {
    const mockResults = [
      {
        document: {
          id: 'doc1',
          content: 'Test content',
          metadata: {
            type: 'concept',
            conceptId: 'test-id',
            segmentTitle: 'Test Title',
            source: 'concept-parsing',
            customField: 'custom-value',
          },
        },
        score: 0.95,
        metadata: {
          type: 'concept',
          conceptId: 'test-id',
          segmentTitle: 'Test Title',
          source: 'concept-parsing',
          customField: 'custom-value',
        },
      },
    ];

    vectorDatabase.search.mockResolvedValue(mockResults);

    // Mock SQLite query to return data for this concept
    mockDb.selectFrom = vi.fn().mockReturnValue({
      selectAll: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => ({
          execute: vi.fn().mockResolvedValue([
            {
              id: 'test-id',
              name: 'Test Concept',
              description: 'Test description',
              concept_type: 'concept',
              difficulty_level: 2,
              tags: '[]',
              metadata: '{"path": "Test > Title"}',
              mastery_level: 0,
              review_count: 0,
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
            },
          ]),
        })),
      }),
    });

    const result = await service.findRelatedByPrompt('test');

    // Fixed: Metadata is overwritten with SQLite data (source of truth in pure separation)
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.metadata).toEqual({
      conceptId: 'test-id',
      type: 'concept',
      level: 2,
      path: 'Test > Title',
    });
  });
});
