import { describe, expect, it } from 'vitest';
import { createDiscoveryService } from '../discovery-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

const makeApi = (overrides: Partial<ElectronAPI['knowledge']> = {}, learning?: any): ElectronAPI =>
  ({
    knowledge: {
      parseConcepts: async () => ({ success: true, data: { concepts: [] } }),
      searchKnowledge: async () => ({ success: true, data: { results: [] } }),
      exploreConcept: async () =>
        ({
          success: true,
          data: { keyPoints: [], relatedConcepts: [], estimatedLearningTime: '60min' },
        }) as any,
      ...overrides,
    },
    learning: {
      getLearningPath: async () =>
        ({ success: true, data: learning ?? { sessionId: 's1', path: [], currentPosition: 0 } }) as
        any,
    },
  }) as ElectronAPI;

describe('discovery-service', () => {
  it('parses concepts and propagates errors', async () => {
    const api = makeApi({
      parseConcepts: async () => ({ success: false, error: { message: 'nope' } } as any),
    });
    const svc = createDiscoveryService(api);

    await expect(svc.parseConcepts('hello')).rejects.toThrow('Failed to parse concepts');
  });

  it('generates learning path using learning API and maps modules', async () => {
    const api = makeApi(
      {},
      {
        sessionId: 'session-123',
        path: [
          { id: 1, title: 'Topic A', duration: '20min', difficulty: 'easy' },
          { id: 2, title: 'Topic B', duration: '40min', difficulty: 'medium' },
        ],
        currentPosition: 1,
        progress: { percentage: 50 },
      },
    );
    const svc = createDiscoveryService(api);

    const path = await svc.generateLearningPath(['Topic A', 'Topic B'], 'session-123');

    expect(path.id).toBe('session-123');
    expect(path.modules).toHaveLength(2);
    expect(path.modules[0].difficulty).toBe(1); // easy
    expect(path.estimated_duration).toBe(60);
    expect(path.progress.currentModule).toBe('2');
  });

  it('createPracticeExercises filters exercises by difficulty', async () => {
    const api = makeApi({
      searchKnowledge: async () =>
        ({
          success: true,
          data: {
            results: [
              { id: '1', type: 'exercise', difficulty: 'basic', title: 'A', preview: '' },
              { id: '2', type: 'exercise', difficulty: 'advanced', title: 'B', preview: '' },
            ],
          },
        }) as any,
    });
    const svc = createDiscoveryService(api);

    const easy = await svc.createPracticeExercises('math', 'easy');
    expect(easy.map((e) => e.id)).toEqual(['1']);

    const hard = await svc.createPracticeExercises('math', 'hard');
    expect(hard.map((e) => e.id)).toEqual(['2']);
  });

  it('assessKnowledge builds strengths and gaps', async () => {
    const api = makeApi(
      {
        exploreConcept: async () =>
          ({
            success: true,
            data: {
              keyPoints: ['alpha', 'beta'],
              relatedConcepts: [{ name: 'gamma', strength: 0.8 }],
              estimatedLearningTime: '45min',
            },
          }) as any,
        searchKnowledge: async () =>
          ({
            success: true,
            data: {
              results: [
                { type: 'concept', title: 'alpha', relevanceScore: 0.9 },
                { type: 'concept', title: 'delta', relevanceScore: 0.3 },
              ],
            },
          }) as any,
      },
      {
        sessionId: 's1',
        path: [{ id: 1, title: 'alpha', duration: '20min', difficulty: 'easy' }],
        currentPosition: 0,
        progress: { percentage: 80 },
      },
    );

    const svc = createDiscoveryService(api);

    const result = await svc.assessKnowledge('math', 'alpha and something');

    expect(result.understandingLevel).toBeGreaterThan(0);
    expect(result.strengths).toContain('alpha');
    expect(result.gaps).toContain('beta');
    expect(result.nextSteps).toContain('Learn about gamma');
    expect(result.estimatedTimeToMastery).toBe(45);
  });
});
