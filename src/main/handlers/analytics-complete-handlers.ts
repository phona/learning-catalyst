/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions */
import { ipcMain } from 'electron';
import type { ILogger } from '../services/types';
import type { AnalyticsService } from '@/main/services/domain/analytics/analytics-service';
import type { APIResponse } from '@/shared/types/electron-api';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

export const setupCompleteAnalyticsHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: {
    analyticsService: AnalyticsService;
    loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  },
) => {
  const handlerLogger = services.loggerService.child({ handler: 'analytics-complete' });

  ipcMainInstance.handle('analytics:get-dashboard', async () => {
    handlerLogger.info('Handling get dashboard request');
    const dashboard = await services.analyticsService.getDashboard();
    handlerLogger.info('Dashboard retrieved successfully');
    return dashboard;
  });

  ipcMainInstance.handle('analytics:get-progress-chart', async (_event, params) => {
    handlerLogger.info('Handling get progress chart request', params);
    const progressChart = await services.analyticsService.getProgressChart({
      period: params.period ?? 'week',
      metric: params.metric ?? 'sessions',
      conceptIds: params.conceptIds,
    });
    handlerLogger.info('Progress chart retrieved successfully');
    return progressChart;
  });

  ipcMainInstance.handle('analytics:get-achievements', async () => {
    handlerLogger.info('Handling get achievements request');
    const achievements = await services.analyticsService.getAchievements();
    handlerLogger.info('Achievements retrieved successfully', { count: achievements.length });
    return achievements;
  });

  ipcMainInstance.handle('analytics:unlock-achievement', async (_, achievementId) => {
    handlerLogger.info('Handling unlock achievement request', { achievementId });
    const result = await services.analyticsService.unlockAchievement(achievementId);
    handlerLogger.info('Achievement unlocked', result);
    return result;
  });

  ipcMainInstance.handle('analytics:get-usage-stats', async (_event, params) => {
    handlerLogger.info('Handling get usage stats request', params);
    const stats = await services.analyticsService.getUsageStats(
      params.timeRange ?? '30days',
      params.includePatterns,
      params.includeEngagement,
    );
    handlerLogger.info('Usage stats retrieved successfully');
    return stats;
  });

  ipcMainInstance.handle('analytics:get-token-usage', async (_event, params) => {
    handlerLogger.info('Handling get token usage request', params);
    const tokenUsage = await services.analyticsService.getTokenUsage(
      params.timeRange ?? '30days',
      params.includeByProvider,
      params.includeByFeature,
      params.includeProjections,
    );
    handlerLogger.info('Token usage retrieved successfully');
    return tokenUsage;
  });

  ipcMainInstance.handle('analytics:track-event', async (_event, event) => {
    handlerLogger.info('Handling analytics track event', event);
    await services.analyticsService.trackEvent(event);
    handlerLogger.info('Event tracked successfully');
    return undefined;
  });

  ipcMainInstance.handle('analytics:get-concept-progress', async (_event, conceptId) => {
    handlerLogger.info('Handling get concept progress request', { conceptId });
    const progress = await services.analyticsService.getConceptProgress(conceptId);
    handlerLogger.info('Concept progress retrieved', { conceptId });
    return progress;
  });

  ipcMainInstance.handle('analytics:get-session-history', async (_event, params) => {
    handlerLogger.info('Handling get session history request', params);
    const history = await services.analyticsService.getSessionHistory(params?.limit ?? 50);
    handlerLogger.info('Session history retrieved', { count: history.length });
    return history;
  });

  ipcMainInstance.handle('analytics:check-achievements', async (_event, sessionId) => {
    handlerLogger.info('Handling check achievements request', { sessionId });
    const achievements = await services.analyticsService.checkAchievements(sessionId);
    handlerLogger.info('Achievements check completed', { sessionId, count: achievements.length });
    return achievements;
  });

  ipcMainInstance.handle('analytics:get-learning-trends', async (_event, params) => {
    handlerLogger.info('Handling get learning trends request', params);
    const trends = await services.analyticsService.getLearningTrends(params?.period ?? 'weekly');
    handlerLogger.info('Learning trends retrieved', { period: trends.period });
    return trends;
  });

  ipcMainInstance.handle('analytics:get-study-streak', async () => {
    handlerLogger.info('Handling get study streak request');
    const streak = await services.analyticsService.getStudyStreak();
    handlerLogger.info('Study streak retrieved', { currentStreak: streak.currentStreak });
    return streak;
  });

  ipcMainInstance.handle('analytics:get-time-stats', async (_event, params) => {
    handlerLogger.info('Handling get time stats request', params);
    const stats = await services.analyticsService.getTimeStats();
    handlerLogger.info('Time stats retrieved', { totalSessions: stats.totalSessions });
    return stats;
  });

  ipcMainInstance.handle('analytics:export-data', async (_event, params) => {
    handlerLogger.info('Handling export data request', params);
    const exported = await services.analyticsService.exportData(params.format ?? 'json');
    handlerLogger.info('Data exported successfully');
    return exported;
  });

  ipcMainInstance.handle('analytics:import-data', async (_event, params) => {
    handlerLogger.info('Handling import data request', params);
    await services.analyticsService.importData(params.payload, params.format);
    handlerLogger.info('Data imported successfully');
    return undefined;
  });

  ipcMainInstance.handle('analytics:track-session', async (_event, session) => {
    handlerLogger.info('Handling track session request', { sessionId: session.id });
    const trackedSessionId = await services.analyticsService.trackSession(session);
    handlerLogger.info('Session tracked successfully', { sessionId: trackedSessionId });
    return { sessionId: trackedSessionId };
  });

  ipcMainInstance.handle('analytics:update-concept-progress', async (_event, conceptId, update) => {
    handlerLogger.info('Handling update concept progress request', { conceptId });
    await services.analyticsService.updateConceptProgress(conceptId, update);
    handlerLogger.info('Concept progress updated', { conceptId });
    return undefined;
  });

  handlerLogger.info('✅ Analytics handlers registered successfully');
};
