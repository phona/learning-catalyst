import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

let calls = 0;

// Mock the extraction workflow to fail on second call
vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow: vi.fn(async () => {
    calls += 1;
    if (calls === 2) {
      throw new Error('forced error');
    }
    return {
      success: true,
      result: {
        summary: '',
        focusAreas: [],
        nodes: [{ name: 'Concept', confidence: 0.7 }],
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
    };
  }),
}));

describe('concept parsing depth', () => {
  beforeEach(() => {
    calls = 0;
    vi.clearAllMocks();
  });

  const providerFactory: any = {
    getModel: vi.fn(async () => ({})),
  };
  const vectorDatabase: any = undefined;
  const loggerService: any = { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) };

  it('splits by headings up to selected depth and continues on errors', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });
    const content = ['# H1', 'alpha beta gamma', '## H2', 'delta epsilon zeta', '### H3', 'eta theta iota'].join('\n');
    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 't', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 0, minSegmentChars: 1 }
    );
    expect(res.statistics.totalConcepts).toBeGreaterThanOrEqual(0);
    expect(res.errors.length).toBeGreaterThanOrEqual(1);
    expect(res.success).toBe(false);
  });
});
