import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

vi.mock('../prompts', () => ({
  createSegmentExtractChain: () => ({
    invoke: vi.fn(async (input: any) => {
      const previewPayload = input.preview_payload || '';
      return {
        summary: 'Test summary',
        focusAreas: ['area1'],
        nodes: [
          {
            name: 'Photosynthesis',
            description: 'Process of converting light to energy',
            type: 'topic',
            difficulty: 'intermediate',
            confidence: 0.9,
            tags: ['biology', 'plants'],
          },
          {
            name: 'Chlorophyll',
            description: 'Green pigment in plants',
            type: 'fact',
            difficulty: 'beginner',
            confidence: 0.85,
            tags: ['biology'],
          },
        ],
        relationships: [
          {
            from: 'Chlorophyll',
            to: 'Photosynthesis',
            type: 'prerequisite',
            strength: 0.9,
            confidence: 0.85,
            description: 'Chlorophyll is required for photosynthesis',
          },
        ],
        recommendations: ['Learn about light spectrum'],
      };
    }),
  }),
}));

describe('concept parsing relationship vectorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store extracted relationships in vector database', async () => {
    const addDocumentBatchMock = vi.fn().mockResolvedValue(undefined);
    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: addDocumentBatchMock,
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const embeddingModel = {
      settings: { providerName: 'mock', model: 'mock-embedding', embeddingDims: 1536 },
      embed: vi.fn(async (text: string) => {
        return Array(1536).fill(0.1);
      }),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    };

    const providerFactory: any = {
      getModel: vi.fn(async () => ({
        model: {},
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      })),
      getEmbeddingModel: vi.fn(async () => embeddingModel),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const materials = [
      {
        id: 'material-1',
        title: 'Plant Biology',
        content: '# Photosynthesis\n\nChlorophyll absorbs light.\n\nThis is used for photosynthesis.',
        format: 'markdown',
      },
    ];

    await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    // Called once with batch: concepts + relationships
    expect(addDocumentBatchMock).toHaveBeenCalled();

    const callArgs = addDocumentBatchMock.mock.calls.map((call) => call[0]);
    const allDocs = callArgs.flatMap((batch: any) => batch);

    const relationshipCall = allDocs.find((doc: any) => doc.doc.id.startsWith('rel:'));
    expect(relationshipCall).toBeDefined();
    expect(relationshipCall?.doc.metadata?.type).toBe('relationship');
    expect(relationshipCall?.doc.metadata?.sourceConceptId).toBeDefined();
    expect(relationshipCall?.doc.metadata?.targetConceptId).toBeDefined();
    expect(relationshipCall?.doc.metadata?.relationshipId).toBeDefined();
    // Content should contain the relationship type
    expect(relationshipCall?.doc.content).toContain('prerequisite');

    expect(embeddingModel.embedBatch).toHaveBeenCalled();
  });

  it('should handle relationship storage errors gracefully', async () => {
    const addDocumentBatchMock = vi.fn().mockRejectedValue(new Error('Vector DB error'));
    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: addDocumentBatchMock,
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const embeddingModel = {
      settings: { providerName: 'mock', model: 'mock-embedding', embeddingDims: 1536 },
      embed: vi.fn(async (text: string) => Array(1536).fill(0.1)),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    };

    const providerFactory: any = {
      getModel: vi.fn(async () => ({
        model: {},
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      })),
      getEmbeddingModel: vi.fn(async () => embeddingModel),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const materials = [
      {
        id: 'material-1',
        title: 'Test',
        content: '# Test\nSome content.',
        format: 'markdown',
      },
    ];

    // Vector storage errors are caught and logged, but don't fail the entire parsing operation
    // This is because vector storage is optional - concepts are still stored in SQLite
    const result = await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    expect(result.success).toBe(true);
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it('should not store relationships when vector database is not provided', async () => {
    const embeddingModel = {
      settings: { providerName: 'mock', model: 'mock-embedding', embeddingDims: 1536 },
      embed: vi.fn(async (text: string) => Array(1536).fill(0.1)),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    };

    const providerFactory: any = {
      getModel: vi.fn(async () => ({
        model: {},
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      })),
      getEmbeddingModel: vi.fn(async () => embeddingModel),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase: undefined,
      loggerService,
    });

    const materials = [
      {
        id: 'material-1',
        title: 'Test',
        content: '# Test\nSome content.',
        format: 'markdown',
      },
    ];

    const result = await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    expect(result.success).toBe(true);
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it('should create proper relationship text content', async () => {
    const addDocumentBatchMock = vi.fn().mockResolvedValue(undefined);
    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: addDocumentBatchMock,
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };

    const embeddingModel = {
      settings: { providerName: 'mock', model: 'mock-embedding', embeddingDims: 1536 },
      embed: vi.fn(async (text: string) => Array(1536).fill(0.1)),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    };

    const providerFactory: any = {
      getModel: vi.fn(async () => ({
        model: {},
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      })),
      getEmbeddingModel: vi.fn(async () => embeddingModel),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const materials = [
      {
        id: 'material-1',
        title: 'Test',
        content: '# Test\nContent.',
        format: 'markdown',
      },
    ];

    await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    const callArgs = addDocumentBatchMock.mock.calls.map((call) => call[0]);
    const allDocs = callArgs.flatMap((batch: any) => batch);
    const relationshipCalls = allDocs.filter((doc: any) => doc.doc.id.startsWith('rel:'));

    expect(relationshipCalls[0]?.doc.content).toContain('Relationship:');
    expect(relationshipCalls[0]?.doc.content).toContain('From concept');
    expect(relationshipCalls[0]?.doc.content).toContain('To concept');
  });
});
