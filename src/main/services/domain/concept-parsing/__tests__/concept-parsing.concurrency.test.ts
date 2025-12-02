import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

let active = 0;
let maxActive = 0;

vi.mock('../prompts', () => ({
  createSegmentExtractChain: () => ({
    invoke: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active -= 1;
      return {
        summary: '',
        focusAreas: [],
        nodes: [{ name: `Concept-${Date.now()}`, confidence: 0.9 }],
        relationships: [],
        recommendations: [],
      };
    },
  }),
  SEGMENT_EXTRACTION_TEMPLATE: '',
}));

describe('concept parsing concurrency', () => {
  beforeEach(() => {
    active = 0;
    maxActive = 0;
    vi.resetModules();
  });

  const domainAgent: any = { chatModel: {} };
  const aiService: any = {};
  const loggerService: any = {
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };

  it('processes multiple segments in parallel up to the configured concurrency limit', async () => {
    const svc = createConceptParsingService({
      aiService,
      domainAgent,
      vectorDatabase: undefined,
      loggerService,
    });

    const content = ['# A', 'alpha', '# B', 'bravo', '# C', 'charlie', '# D', 'delta'].join('\n');

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
    expect(res.concepts.length).toBeGreaterThanOrEqual(4);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(maxActive).toBeGreaterThan(1); // ensures real parallelism occurred
  });
});
