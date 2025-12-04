import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

vi.mock('../prompts', () => ({
  createSegmentExtractChain: () => ({
    invoke: async () => ({
      args: {
        summary: '',
        focusAreas: [],
        nodes: [{ name: 'Concept', confidence: 0.7 }],
        relationships: [],
        recommendations: [],
      },
    }),
  }),
  SEGMENT_EXTRACTION_TEMPLATE: '',
}));

describe('concept parsing chunk boundaries', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const providerFactory: any = {
    getModel: vi.fn(async () => ({
      model: {},
      settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024, apiKey: 'key' },
    })),
  };
  const loggerService: any = {
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };

  it('keeps chunking within section boundaries when splitting', async () => {
    const captured: Array<{ title: string; content: string }> = [];
    const vectorDatabase: any = {
      addDocument: vi.fn(async (doc: any) => {
        captured.push({ title: doc.metadata.segmentTitle, content: doc.content });
      }),
    };

    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const alphaBody = new Array(100).fill('ALPHA').join(' ');
    const betaBody = new Array(100).fill('BETA').join(' ');
    const content = ['# Alpha', alphaBody, alphaBody, '## Beta', betaBody, betaBody].join('\n');

    const res = await svc.parseMaterials(
      [
        { id: 'm1', title: 't', content, format: 'markdown' },
      ],
      { maxHeadingDepth: 2, maxSegmentChars: 50, minSegmentChars: 1, vectorize: true },
    );

    expect(res.success).toBe(true);
    expect(captured.length).toBeGreaterThan(1);

    const alphaChunks = captured.filter((d) => d.title.startsWith('Alpha'));
    const betaChunks = captured.filter((d) => d.title.startsWith('Beta'));
    expect(alphaChunks.length).toBeGreaterThan(0);
    expect(betaChunks.length).toBeGreaterThan(0);

    // Ensure no cross-contamination across chunk boundaries
    alphaChunks.forEach((d) => {
      expect(d.content).not.toMatch(/BETA/);
    });
    betaChunks.forEach((d) => {
      expect(d.content).not.toMatch(/ALPHA/);
    });

    // At least one chunk per section should contain its section marker
    expect(alphaChunks.some((d) => /ALPHA/.test(d.content))).toBe(true);
    expect(betaChunks.some((d) => /BETA/.test(d.content))).toBe(true);
  });
});
