import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const invokeSpy = vi.fn();

vi.mock('../prompts', () => ({
  createSegmentExtractChain: () => ({
    invoke: invokeSpy,
  }),
}));

describe('concept parsing resume support', () => {
  const jobDir = path.join(os.tmpdir(), 'concept-parse-resume-tests');

  beforeEach(() => {
    process.env.CONCEPT_PARSE_JOB_DIR = jobDir;
    fs.rmSync(jobDir, { recursive: true, force: true });
    vi.clearAllMocks();
    invokeSpy.mockImplementation(async () => ({
      summary: '',
      focusAreas: [],
      nodes: [{ name: 'Alpha', confidence: 0.9 }],
      relationships: [],
      recommendations: [],
    }));
  });

  it('skips already processed segments when resume is true', async () => {
    const { createConceptParsingService } = await import('../concept-parsing-service');

    const domainAgent: any = { chatModel: {} };
    const loggerService: any = {
      child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    const vectorDatabase: any = { addDocument: vi.fn() };
    const service = createConceptParsingService({
      aiService: {},
      domainAgent,
      vectorDatabase,
      loggerService,
    });

    const material = {
      id: 'm1',
      title: 'Doc',
      content: '# H1\n\n' + 'content line '.repeat(15),
      format: 'markdown' as const,
    };

    const jobId = 'resume-job-1';

    await service.parseMaterials([material], { jobId });
    expect(invokeSpy).toHaveBeenCalledTimes(1);

    const resumed = await service.parseMaterials([material], { jobId, resume: true });

    expect(invokeSpy).toHaveBeenCalledTimes(1); // no additional LLM calls
    expect(resumed.concepts.length).toBeGreaterThan(0);
    expect(resumed.metadata.jobId).toBe(jobId);
    expect(resumed.metadata.resumed).toBe(true);
  });
});
