import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

vi.mock('../prompts', () => ({
  createSegmentExtractChain: () => ({
    invoke: vi.fn(async () => ({
      summary: '',
      focusAreas: [],
      nodes: [{ name: 'Alpha', confidence: 0.9 }],
      relationships: [],
      recommendations: [],
    })),
  }),
}));

describe('concept parsing vectorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always vectorizes when a vector DB is provided, even if vectorize flag is false', async () => {
    const addDocumentWithEmbedding = vi.fn().mockResolvedValue(undefined);
    const vectorDatabase = {
      addDocument: vi.fn(),
      addDocumentWithEmbedding: addDocumentWithEmbedding,
      addDocumentBatch: vi.fn(),
      search: vi.fn(),
      deleteDocument: vi.fn(),
      getStats: vi.fn(),
      start: vi.fn(),
    };
    const providerFactory: any = {
      getModel: vi.fn(async () => ({
        model: {},
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
      })),
      getEmbeddingModel: vi.fn(async () => ({
        embed: vi.fn(async () => Array(1536).fill(0.1)),
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

    expect(addDocumentWithEmbedding).toHaveBeenCalled();
  });
});
