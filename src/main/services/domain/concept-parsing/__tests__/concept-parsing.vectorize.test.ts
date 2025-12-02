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
    const addDocument = vi.fn().mockResolvedValue(undefined);
    const vectorDatabase = { addDocument };
    const domainAgent: any = { chatModel: {} };
    const aiService: any = {};
    const loggerService: any = {
      child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    const svc = createConceptParsingService({
      aiService,
      domainAgent,
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

    expect(addDocument).toHaveBeenCalled();
  });
});
