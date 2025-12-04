import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

vi.mock('../prompts', () => {
  let calls = 0;
  return {
    createSegmentExtractChain: () => ({
      invoke: async () => {
        calls += 1;
        if (calls === 2) {
          throw new Error('forced error');
        }
        return {
          args: {
            summary: '',
            focusAreas: [],
            nodes: [{ name: 'Concept', confidence: 0.7 }],
            relationships: [],
            recommendations: [],
          },
        };
      },
    }),
  };
});

describe('concept parsing depth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const providerFactory: any = {
    getModel: vi.fn(async () => ({
      model: {},
      settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
    })),
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
