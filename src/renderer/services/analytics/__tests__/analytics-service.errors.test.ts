import { describe, it, expect, vi } from 'vitest';
import { createAnalyticsService } from '../analytics-service';

const analytics = {
  getDashboard: vi.fn(),
  getProgressChart: vi.fn(),
  getConceptProgress: vi.fn(),
  updateConceptProgress: vi.fn(),
  trackSession: vi.fn(),
  getStudyStreak: vi.fn(),
  getTimeStats: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
  getStudyMetrics: undefined, // handled within service via getUsageStats etc.
  getUsageStats: vi.fn(),
};

const buildService = () => createAnalyticsService({ analytics } as any);

describe('analytics-service error handling', () => {
  it('throws when dashboard call fails', async () => {
    analytics.getDashboard.mockResolvedValue({ success: false, error: { message: 'boom' } });
    const svc = buildService();
    await expect(svc.getDashboard()).rejects.toThrow(/boom/);
  });

  it('throws when progress chart call fails', async () => {
    analytics.getProgressChart.mockResolvedValue({ success: false, error: { message: 'fail' } });
    const svc = buildService();
    await expect(
      svc.getProgressChart({ period: 'week', metric: 'sessions', conceptIds: [] }),
    ).rejects.toThrow(/fail/);
  });

  it('throws when concept progress call fails', async () => {
    analytics.getConceptProgress.mockResolvedValue({ success: false, error: { message: 'nope' } });
    const svc = buildService();
    await expect(svc.getConceptProgress('c1')).rejects.toThrow(/nope/);
  });

  it('throws when concept progress update fails', async () => {
    analytics.updateConceptProgress.mockResolvedValue({ success: false, error: { message: 'bad' } });
    const svc = buildService();
    await expect(
      svc.updateConceptProgress('c1', { masteryLevel: 0.5 } as any),
    ).rejects.toThrow(/bad/);
  });

  it('throws when trackSession fails', async () => {
    analytics.trackSession.mockResolvedValue({ success: false, error: { message: 'track' } });
    const svc = buildService();
    await expect(svc.trackSession({} as any)).rejects.toThrow(/track/);
  });

  it('throws when study streak fails', async () => {
    analytics.getStudyStreak.mockResolvedValue({ success: false, error: { message: 'streak' } });
    const svc = buildService();
    await expect(svc.getStudyStreak()).rejects.toThrow(/streak/);
  });

  it('throws when time stats fail', async () => {
    analytics.getTimeStats.mockResolvedValue({ success: false, error: { message: 'time' } });
    const svc = buildService();
    await expect(svc.getTimeStats()).rejects.toThrow(/time/);
  });

  it('throws when export fails', async () => {
    analytics.exportData.mockResolvedValue({ success: false, error: { message: 'export' } });
    const svc = buildService();
    await expect(svc.exportData('json')).rejects.toThrow(/export/);
  });

  it('throws when import fails', async () => {
    analytics.importData.mockResolvedValue({ success: false, error: { message: 'import' } });
    const svc = buildService();
    await expect(svc.importData('{}', 'json')).rejects.toThrow(/import/);
  });

  it('throws when study metrics prerequisites fail', async () => {
    analytics.getTimeStats.mockResolvedValue({ success: false, error: { message: 't' } });
    analytics.getStudyStreak.mockResolvedValue({ success: true, data: {} });
    analytics.getUsageStats.mockResolvedValue({ success: true, data: {} });
    const svc = buildService();
    await expect(svc.getStudyMetrics()).rejects.toThrow(/t/);
  });
});
