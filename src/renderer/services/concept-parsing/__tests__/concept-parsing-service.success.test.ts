import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createConceptParsingService } from '@/renderer/services/concept-parsing/concept-parsing-service';
import type { APIResponse } from '@/shared/types/electron-api/base';

const parsedConceptResult = {
  success: true,
  concepts: [
    {
      id: 'c1',
      name: 'Test Concept',
      description: 'A concept from parsed content',
      type: 'topic',
      confidence: 0.9,
      difficulty: 2,
      evidence: [{ type: 'text', text: 'evidence', relevance: 0.8 }],
      metadata: {},
    },
  ],
  relationships: [
    {
      sourceId: 'c1',
      targetId: 'c2',
      type: 'related',
      strength: 0.5,
      confidence: 0.7,
      description: 'is related to',
    },
  ],
  statistics: {
    totalConcepts: 1,
    validConcepts: 1,
    totalRelationships: 1,
    confidenceDistribution: { high: 1 },
    difficultyDistribution: { 2: 1 },
    typeDistribution: { topic: 1 },
    processingTime: 10,
    modelUsage: { mock: 1 },
  },
  errors: [],
  metadata: { processingTime: 10, processedAt: new Date().toISOString(), inputFiles: 1, jobId: 'test-job' },
};

// Helper to create a successful API response
const okResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data,
  timestamp: Date.now(),
});

const buildApi = () => {
  const knowledge = {
    parseConcepts: vi.fn().mockResolvedValue(okResponse(parsedConceptResult)),
    ingestConcepts: vi.fn().mockResolvedValue(okResponse({ ingested: 1 })),
    clearParsingJobs: vi.fn().mockResolvedValue(okResponse({ removed: 0 })),
  };
  const fileContent =
    '# Title\n\n## Subtitle\n\n- item one\n- item two\n\n```js\nconst x = 1;\n```\n\nA long paragraph explaining the concept to ensure length is sufficient.';
  const api = {
    knowledge,
    existsFile: vi.fn().mockResolvedValue(okResponse(true)),
    readFile: vi.fn().mockResolvedValue(okResponse(fileContent)),
    readDirectory: vi.fn(),
  };
  return api;
};

describe('concept-parsing-service happy paths', () => {
  it('parses valid content', async () => {
    const api = buildApi();
    const service = createConceptParsingService(api as any);

    const result = await service.parseContent('# Heading\n\nLong enough markdown content that is valid.');

    expect(api.knowledge.parseConcepts).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.any(String),
        options: expect.objectContaining({ confidenceThreshold: expect.any(Number) }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.concepts[0].name).toBe('Test Concept');
  });

  it('completes file parsing job with markdown files', async () => {
    const api = buildApi();
    const service = createConceptParsingService(api as any);

    const job = await service.parseFiles(['/root/readme.md']);

    await waitFor(() =>
      expect(service.getJobStatus(job.id)?.status).toBe<'completed'>('completed'),
    );

    const status = service.getJobStatus(job.id);
    expect(status?.result?.concepts[0].name).toBe('Test Concept');
    expect(api.knowledge.parseConcepts).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.any(Array),
      }),
    );
  });

  it('handles directory parsing by delegating to file parsing', async () => {
    const api = buildApi();
    api.readDirectory.mockResolvedValue(
      okResponse([
        { path: '/root/docs', isDirectory: true, isFile: false, isMarkdown: false },
        { path: '/root/docs/guide.md', isDirectory: false, isFile: true, isMarkdown: true },
      ]),
    );
    const service = createConceptParsingService(api as any);

    const job = await service.parseDirectories(['/root/docs']);

    await waitFor(() =>
      expect(service.getJobStatus(job.id)?.status).toBe<'completed'>('completed'),
    );

    expect(service.getJobStatus(job.id)?.result?.concepts).toHaveLength(1);
    expect(api.readDirectory).toHaveBeenCalledWith('/root/docs', true, 10);
  });

  it('allows cancelling an in-flight job', async () => {
    const api = buildApi();
    const service = createConceptParsingService(api as any);
    api.knowledge.parseConcepts.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(okResponse(parsedConceptResult)), 5);
        }),
    );

    const job = await service.parseFiles(['/root/readme.md']);
    const cancelled = service.cancelJob(job.id);

    expect(cancelled).toBe(true);
    expect(service.getJobStatus(job.id)?.status).toBe<'failed'>('failed');
  });
});
