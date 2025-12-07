import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createKnowledgeService } from '../knowledge-service';
import { createKyselyTestDb } from '@/test/utils/kysely-test-db';

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
  };

  return { providerFactory, rerankModel };
};

describe('findRelatedByPrompt', () => {
  let testDb: Awaited<ReturnType<typeof createKyselyTestDb>>;
  let vectorDatabase: ReturnType<typeof createMockVectorDatabase>;
  let service: ReturnType<typeof createKnowledgeService>;
  let rerankModel: any;

  beforeEach(async () => {
    testDb = await createKyselyTestDb();
    vectorDatabase = createMockVectorDatabase();

    const { providerFactory, rerankModel: model } = createMockProviderFactory();
    rerankModel = model;

    service = createKnowledgeService({
      db: testDb.db,
      vectorDatabase,
      providerFactory,
      loggerService: createLoggerService(),
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('should search vector database with prompt and return formatted results', async () => {
    const mockResults = [
      {
        document: {
          id: 'doc1',
          content: 'Photosynthesis is the process by which plants convert light',
          metadata: {
            type: 'concept',
            conceptId: 'concept-photo',
            segmentTitle: 'Introduction to Photosynthesis',
            source: 'concept-parsing',
          },
        },
        score: 0.92,
        metadata: {
          type: 'concept',
          conceptId: 'concept-photo',
          segmentTitle: 'Introduction to Photosynthesis',
          source: 'concept-parsing',
        },
      },
      {
        document: {
          id: 'doc2',
          content: 'Chlorophyll absorbs light energy for photosynthesis',
          metadata: {
            type: 'relationship',
            relationshipType: 'related',
            sourceId: 'concept-chlorophyll',
            targetId: 'concept-photosynthesis',
            sourceName: 'Chlorophyll',
            targetName: 'Photosynthesis',
            strength: 0.85,
          },
        },
        score: 0.88,
        metadata: {
          type: 'relationship',
          relationshipType: 'related',
          sourceId: 'concept-chlorophyll',
          targetId: 'concept-photosynthesis',
          sourceName: 'Chlorophyll',
          targetName: 'Photosynthesis',
          strength: 0.85,
        },
      },
    ];

    vectorDatabase.search.mockResolvedValue(mockResults);

    const result = await service.findRelatedByPrompt('photosynthesis', {
      limit: 10,
      threshold: 0.6,
    });

    expect(vectorDatabase.search).toHaveBeenCalledWith('photosynthesis', {
      limit: 20,
      threshold: 0.6,
    });

    expect(rerankModel.rerank).toHaveBeenCalledWith(
      'photosynthesis',
      expect.arrayContaining([
        expect.stringContaining('Photosynthesis'),
        expect.stringContaining('Chlorophyll'),
      ]),
    );

    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]).toEqual({
      id: 'concept-photo',
      name: 'Introduction to Photosynthesis',
      score: 1.0,
      type: 'concept',
      relationshipType: undefined,
      metadata: {
        type: 'concept',
        conceptId: 'concept-photo',
        segmentTitle: 'Introduction to Photosynthesis',
        source: 'concept-parsing',
      },
    });

    expect(result.matches[1]).toEqual({
      id: 'concept-chlorophyll',
      name: 'Chlorophyll',
      score: 0.9,
      type: 'relationship',
      relationshipType: 'related',
      metadata: {
        type: 'relationship',
        relationshipType: 'related',
        sourceId: 'concept-chlorophyll',
        targetId: 'concept-photosynthesis',
        sourceName: 'Chlorophyll',
        targetName: 'Photosynthesis',
        strength: 0.85,
      },
    });

    expect(result.query).toBe('photosynthesis');
    expect(result.timestamp).toBeDefined();
    expect(result.stats.vectorCount).toBe(2);
    expect(result.stats.rerankModel).toBe('mock-rerank');
  });

  it('should use default limit and threshold when not provided', async () => {
    vectorDatabase.search.mockResolvedValue([]);

    await service.findRelatedByPrompt('machine learning');

    expect(vectorDatabase.search).toHaveBeenCalledWith('machine learning', {
      limit: 20,
      threshold: 0.6,
    });
  });

  it('should handle missing metadata gracefully', async () => {
    const mockResults = [
      {
        document: {
          id: 'doc1',
          content: 'Some content without metadata',
          metadata: null,
        },
        score: 0.75,
        metadata: null,
      },
    ];

    vectorDatabase.search.mockResolvedValue(mockResults);

    const result = await service.findRelatedByPrompt('query', { limit: 5 });

    expect(result.matches[0]).toEqual({
      id: 'doc1',
      name: 'doc1',
      score: 1.0,
      type: undefined,
      relationshipType: undefined,
      metadata: null,
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

    const result = await service.findRelatedByPrompt('test');

    expect(result.matches[0].metadata).toEqual({
      type: 'concept',
      conceptId: 'test-id',
      segmentTitle: 'Test Title',
      source: 'concept-parsing',
      customField: 'custom-value',
    });
  });
});
