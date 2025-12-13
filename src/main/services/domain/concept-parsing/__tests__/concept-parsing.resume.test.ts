import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const workflowSpy = vi.fn();

// Mock the extraction workflow to track invocations
vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow: workflowSpy.mockImplementation(async () => ({
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

describe('concept parsing resume support', () => {
  // Use temporary directory for tests to avoid affecting workspace .catalyst
  const jobDir = path.join(os.tmpdir(), 'concept-parse-resume-tests');

  beforeEach(() => {
    // Override job directory for testing
    process.env.CONCEPT_PARSE_JOB_DIR = jobDir;
    fs.rmSync(jobDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('skips already processed segments when resume is true', async () => {
    const { createConceptParsingService } = await import('../concept-parsing-service');

    const providerFactory: any = {
      getModel: vi.fn(async () => ({})),
    };
    const loggerService: any = {
      child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    const vectorDatabase: any = { addDocument: vi.fn() };
    const service = createConceptParsingService({
      providerFactory,
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
    expect(workflowSpy).toHaveBeenCalledTimes(1);

    const resumed = await service.parseMaterials([material], { jobId, resume: true });

    expect(workflowSpy).toHaveBeenCalledTimes(1); // no additional LLM calls
    expect(resumed.concepts.length).toBeGreaterThan(0);
    expect(resumed.metadata.jobId).toBe(jobId);
    expect(resumed.metadata.resumed).toBe(true);
  });
});
