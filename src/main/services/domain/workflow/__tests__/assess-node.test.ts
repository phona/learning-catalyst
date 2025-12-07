import { describe, it, expect, vi } from 'vitest';
import { assessNode } from '../nodes/assess';
import { WorkflowStateAnnotation } from '../state';

const makeDeps = () => {
  const knowledgeService = {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [{ id: 'c1' }, { id: 'c2' }] }),
  } as any;
  const learningService = {
    getPracticeHistory: vi.fn(),
    listMessages: vi.fn(),
  } as any;
  const deps = {
    knowledgeService,
    learningService,
  } as any;
  return { deps, knowledgeService, learningService };
};

describe('assess node', () => {
  it('computes high confidence with recent passes and positive messages', async () => {
    const { deps, learningService } = makeDeps();
    const now = new Date().toISOString();
    learningService.getPracticeHistory.mockResolvedValue([
      { result: 'pass', rubricScores: { retrieval: 90, application: 85, teachBack: 80 }, timestamp: now, errorTags: ['edge-cases'] },
      { result: 'pass', rubricScores: { retrieval: 88, application: 82, teachBack: 78 }, timestamp: now },
      { result: 'partial', rubricScores: { retrieval: 75, application: 70, teachBack: 68 }, timestamp: now },
    ]);
    learningService.listMessages.mockResolvedValue([
      { content: 'I understand the concept', timestamp: now },
      { content: 'This makes sense', timestamp: now },
    ]);

    const state = { topic: 'Algebra' } as typeof WorkflowStateAnnotation.State;
    const result = await assessNode(deps)(state);
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.gaps?.includes('edge-cases')).toBe(true);
    expect(String((result.messages?.[0] as any)?.content)).toMatch(/Confidence:\s*\d+%/);
  });

  it('computes lower confidence with older fails and negative messages', async () => {
    const { deps, learningService } = makeDeps();
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();
    learningService.getPracticeHistory.mockResolvedValue([
      { result: 'fail', timestamp: old },
      { result: 'fail', timestamp: old },
      { result: 'partial', timestamp: old },
    ]);
    learningService.listMessages.mockResolvedValue([
      { content: "I'm confused", timestamp: old },
    ]);

    const state = { topic: 'Geometry' } as typeof WorkflowStateAnnotation.State;
    const result = await assessNode(deps)(state);
    expect(result.confidence).toBeLessThan(0.6);
    expect(String((result.messages?.[0] as any)?.content)).toMatch(/Confidence:\s*\d+%/);
  });
});

