import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService, type ConceptParsingMaterial } from '../concept-parsing-service';

// Mock the extraction workflow to return concepts with relationships
vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow: vi.fn(async () => ({
    success: true,
    result: {
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
    },
    attempt: 1,
    metrics: {
      chainCreationMs: 0,
      llmInvokeMs: 100,
      jsonParseMs: 0,
      validationMs: 0,
      totalMs: 100,
    },
  })),
}));

describe('concept parsing relationship storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse and return relationships without storing them in vector database', async () => {
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
      getModel: vi.fn(async () => ({})),
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

    const materials: ConceptParsingMaterial[] = [
      {
        id: 'material-1',
        title: 'Plant Biology',
        content: '# Photosynthesis\n\nChlorophyll absorbs light.\n\nThis is used for photosynthesis.',
        format: 'markdown',
      },
    ];

    const result = await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    // Verify parsing was successful
    expect(result.success).toBe(true);
    expect(result.concepts.length).toBe(2);
    expect(result.relationships.length).toBe(1);

    // Verify relationship structure
    const relationship = result.relationships[0];
    expect(relationship.sourceId).toBeDefined();
    expect(relationship.targetId).toBeDefined();
    expect(relationship.type).toBe('prerequisite');
    expect(relationship.strength).toBe(0.9);
    expect(relationship.confidence).toBe(0.85);

    // Verify vector database was called for concepts only (not relationships)
    expect(addDocumentBatchMock).toHaveBeenCalled();

    const callArgs = addDocumentBatchMock.mock.calls.map((call) => call[0]);
    const allDocs = callArgs.flatMap((batch: any) => batch);

    // Should only have concept documents, not relationship documents
    const relationshipCalls = allDocs.filter((doc: any) => doc.doc.id.startsWith('rel:'));
    expect(relationshipCalls.length).toBe(0);

    // Should have concept documents only
    const conceptCalls = allDocs.filter((doc: any) => doc.doc.id.startsWith('concept:'));
    expect(conceptCalls.length).toBe(2);

    // Verify concepts have minimal metadata (only conceptId for pure separation)
    const conceptDoc = conceptCalls[0];
    expect(conceptDoc.doc.metadata.conceptId).toBeDefined();
    // Pure separation: Qdrant only stores conceptId, all other metadata in SQLite
    expect(conceptDoc.doc.metadata.type).toBeUndefined();
    expect(conceptDoc.doc.metadata.segmentTitle).toBeUndefined();
    expect(conceptDoc.doc.metadata.topic).toBeUndefined();

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
      getModel: vi.fn(async () => ({})),
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

    const materials: ConceptParsingMaterial[] = [
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
      getModel: vi.fn(async () => ({})),
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

    const materials: ConceptParsingMaterial[] = [
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

  it('should parse relationships without creating vector embeddings for them', async () => {
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
      getModel: vi.fn(async () => ({})),
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

    const materials: ConceptParsingMaterial[] = [
      {
        id: 'material-1',
        title: 'Test',
        content: '# Test\nContent.',
        format: 'markdown',
      },
    ];

    const result = await svc.parseMaterials(materials, {
      minSegmentChars: 1,
      maxSegmentChars: 200,
    });

    // Verify relationships are parsed and returned
    expect(result.success).toBe(true);
    expect(result.relationships.length).toBeGreaterThan(0);

    // Verify NO relationship documents were sent to vector database
    const callArgs = addDocumentBatchMock.mock.calls.map((call) => call[0]);
    const allDocs = callArgs.flatMap((batch: any) => batch);
    const relationshipCalls = allDocs.filter((doc: any) => doc.doc.id.startsWith('rel:'));

    // Relationships should NOT be in vector database
    expect(relationshipCalls.length).toBe(0);

    // Only concepts should be in vector database
    const conceptCalls = allDocs.filter((doc: any) => doc.doc.id.startsWith('concept:'));
    expect(conceptCalls.length).toBeGreaterThan(0);

    // Verify the relationship in result has proper structure
    const relationship = result.relationships[0];
    expect(relationship).toHaveProperty('sourceId');
    expect(relationship).toHaveProperty('targetId');
    expect(relationship).toHaveProperty('type');
    expect(relationship).toHaveProperty('strength');
    expect(relationship).toHaveProperty('confidence');
  });
});
