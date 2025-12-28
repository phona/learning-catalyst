import { describe, expect, it } from 'vitest';
import { createAnalyticsService } from '../analytics-service';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { createMockElectronAPI, ok, fail } from '@/test/utils/electron-api-fixture';

const makeApi = (overrides: Partial<ElectronAPI['analytics']> = {}): ElectronAPI =>
  ({
    analytics: {
      getDashboard: async () => ({ success: true, data: { achievements: [] } }),
      getProgressChart: async () =>
        ({
          success: true,
          data: {
            chartType: 'scatter',
            data: [{ date: '2024-01-01', minutes: 10 }],
          },
        }) as any,
      ...overrides,
    },
  }) as ElectronAPI;

describe('analytics-service', () => {
  it('gets dashboard data or throws on error', async () => {
    const okSvc = createAnalyticsService(makeApi());
    const dashboard = await okSvc.getDashboard();
    expect(dashboard).toEqual({ achievements: [] });

    const badSvc = createAnalyticsService(
      makeApi({ getDashboard: async () => ({ success: false, error: { message: 'fail' } }) as any }),
    );
    await expect(badSvc.getDashboard()).rejects.toThrow('fail');
  });

  it('converts progress chart period and maps values', async () => {
    const svc = createAnalyticsService(makeApi());

    const chart = await svc.getProgressChart({ period: 'quarter', metric: 'time', conceptIds: [] });

    expect(chart.type).toBe('line'); // scatter is normalized to line
    expect(chart.unit).toBe('minutes');
    expect(chart.data[0]).toMatchObject({ value: 10 });
  });

  it('maps achievements and handles missing concept', async () => {
    const api = createMockElectronAPI({
      analytics: {
        getAchievements: async () =>
          ok([
            {
              id: 'a1',
              name: 'Achiever',
              description: 'Did it',
              category: 'time',
              progress: { percentage: 42 },
              icon: 'star',
            },
          ]) as any,
        getConceptProgress: async () => fail('CONCEPT_NOT_FOUND') as any,
      } as any,
    });
    const svc = createAnalyticsService(api as ElectronAPI);
    const achievements = await svc.getAchievements();
    expect(achievements[0].title).toBe('Achiever');
    await expect(svc.getConceptProgress('missing')).rejects.toThrow();
  });

  it('computes study metrics and propagates errors', async () => {
    const api = createMockElectronAPI();
    const svc = createAnalyticsService(api as ElectronAPI);
    const metrics = await svc.getStudyMetrics();
    expect(metrics.totalStudyTime).toBeDefined();

    const bad = createAnalyticsService(
      createMockElectronAPI({
        analytics: { getTimeStats: async () => fail('nope') } as any,
      }) as ElectronAPI,
    );
    await expect(bad.getStudyMetrics()).rejects.toThrow(/nope/);
  });

  it('gets trends, streak, time stats, export/import and trackSession', async () => {
    const api = createMockElectronAPI();
    const svc = createAnalyticsService(api as ElectronAPI);
    const trends = await svc.getLearningTrends(7);
    expect(trends.dailyStudyTime).toBeDefined();
    const streak = await svc.getStudyStreak();
    expect(streak.currentStreak).toBeDefined();
    const time = await svc.getTimeStats();
    expect(time.totalStudyTime).toBeDefined();
    const exported = await svc.exportData('json');
    expect(exported).toBeTypeOf('string');
    await svc.importData('{}', 'json');
    const tracking = await svc.trackSession({ topic: 't', goals: [], difficulty: 'easy' } as any);
    expect(tracking).toBeDefined();
  });

  it('throws when trackSession fails', async () => {
    const svc = createAnalyticsService(
      createMockElectronAPI({
        analytics: { trackSession: async () => fail('track-fail') } as any,
      }) as ElectronAPI,
    );
    await expect(svc.trackSession({} as any)).rejects.toThrow(/track-fail/);
  });
});
