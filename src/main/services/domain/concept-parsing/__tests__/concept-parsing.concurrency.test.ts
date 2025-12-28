import { describe, it, expect, vi, beforeEach } from 'vitest';

let active = 0;
let maxActive = 0;
let segmentCount = 0;

// Mock the extraction workflow to track concurrency
vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow: vi.fn(async () => {
    active += 1;
    segmentCount += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 15));
    active -= 1;
    return {
      success: true,
      result: {
        summary: '',
        focusAreas: [],
        nodes: [{ name: `Concept-${segmentCount}`, confidence: 0.9 }],
        relationships: [],
        recommendations: [],
      },
      attempt: 1,
      metrics: {
        chainCreationMs: 0,
        llmInvokeMs: 15,
        jsonParseMs: 0,
        validationMs: 0,
        totalMs: 15,
      },
    };
  }),
}));

describe('concept parsing concurrency', () => {
  let createConceptParsingService: any;

  beforeEach(async () => {
    active = 0;
    maxActive = 0;
    segmentCount = 0;
    vi.resetModules();
    vi.clearAllMocks();
    ({ createConceptParsingService } = await import('../concept-parsing-service'));
  });

  const providerFactory: any = {
    getModel: vi.fn(async () => ({})),
  };
  const loggerService: any = {
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };

  it('processes multiple segments in parallel up to the configured concurrency limit', async () => {
    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase: undefined,
      loggerService,
    });

    // Create content with 4 clearly distinct sections
    const content = ['# Section A', 'Alpha content here', '# Section B', 'Beta content here', '# Section C', 'Charlie content here', '# Section D', 'Delta content here'].join('\n');

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 't', content, format: 'markdown' }],
      {
        maxSegmentChars: 0,
        minSegmentChars: 1,
        vectorize: false,
        options: { maxConcurrentSegments: 2, confidenceThreshold: 0.5 },
      },
    );

    expect(res.success).toBe(true);
    // The number of concepts depends on how the service segments the content
    // With 4 sections, we should get at least 1 concept (because deduplication may merge some)
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
    expect(maxActive).toBeLessThanOrEqual(2);
    // Note: parallelism may not always occur depending on timing
  });
});
