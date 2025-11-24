import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createConceptParsingService } from '@/renderer/services/concept-parsing/concept-parsing-service';

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
  metadata: { processingTime: 10, processedAt: new Date().toISOString(), inputFiles: 1 },
};

const buildApi = () => {
  const knowledge = {
    parseConcepts: vi.fn().mockResolvedValue({ success: true, data: parsedConceptResult }),
  };
  const api = {
    knowledge,
    existsFile: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(
      '# Title\n\n## Subtitle\n\n- item one\n- item two\n\n```js\nconst x = 1;\n```\n\nA long paragraph explaining the concept to ensure length is sufficient.',
    ),
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
    api.readDirectory.mockResolvedValue([
      { path: '/root/docs', isDirectory: true, isFile: false, isMarkdown: false },
      { path: '/root/docs/guide.md', isDirectory: false, isFile: true, isMarkdown: true },
    ]);
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
          setTimeout(() => resolve({ success: true, data: parsedConceptResult }), 5);
        }),
    );

    const job = await service.parseFiles(['/root/readme.md']);
    const cancelled = service.cancelJob(job.id);

    expect(cancelled).toBe(true);
    expect(service.getJobStatus(job.id)?.status).toBe<'failed'>('failed');
  });
});
