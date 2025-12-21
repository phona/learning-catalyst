import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the extraction workflow
vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow: vi.fn(async () => ({
    success: true,
    result: {
      summary: '',
      focusAreas: [],
      nodes: [{ name: 'Alpha', confidence: 0.9 }],
      relationships: [],
      recommendations: [],
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

describe('concept parsing vectorization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('always vectorizes when a vector DB is provided, even if vectorize flag is false', async () => {
    const { createConceptParsingService } = await import('../concept-parsing-service');
    const addDocumentBatch = vi.fn().mockResolvedValue(undefined);
    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: vi.fn(),
      addDocumentBatch: addDocumentBatch,
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };
    const providerFactory: any = {
      getModel: vi.fn(async () => ({})),
      getEmbeddingModel: vi.fn(async () => ({
        embed: vi.fn(async () => Array(1536).fill(0.1)),
        embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
      })),
    };
    const loggerService: any = {
      child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    await svc.parseMaterials(
      [
        {
          id: 'm1',
          title: 't',
          content: '# Title\nSome short content for testing.',
          format: 'markdown',
        },
      ],
      { vectorize: false, minSegmentChars: 1, maxSegmentChars: 0 },
    );

    expect(addDocumentBatch).toHaveBeenCalled();
  });
});
