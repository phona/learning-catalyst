import { ipcMain } from 'electron';
import type { ILogger } from '../services/types';
import type { AnalyticsService } from '@/main/services/domain/analytics/analytics-service';

export const setupCompleteAnalyticsHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: {
    analyticsService: AnalyticsService;
    loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  }
) => {
  const handlerLogger = services.loggerService.child({ handler: 'analytics-complete' });

  ipcMainInstance.handle('analytics:get-dashboard', async () => {
    handlerLogger.info('Handling get dashboard request');
    try {
      const dashboard = await services.analyticsService.getDashboard();
      handlerLogger.info('Dashboard retrieved successfully');
      return { success: true, dashboard };
    } catch (error) {
      handlerLogger.error('Failed to get dashboard', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-progress-chart', async (_event, params) => {
    handlerLogger.info('Handling get progress chart request', params);
    try {
      const progressChart = await services.analyticsService.getProgressChart({
        period: params.period ?? 'week',
        metric: params.metric ?? 'sessions',
        conceptIds: params.conceptIds
      });
      handlerLogger.info('Progress chart retrieved successfully');
      return { success: true, progressChart };
    } catch (error) {
      handlerLogger.error('Failed to get progress chart', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-achievements', async () => {
    handlerLogger.info('Handling get achievements request');
    try {
      const achievements = await services.analyticsService.getAchievements();
      handlerLogger.info('Achievements retrieved successfully', { count: achievements.length });
      return { success: true, achievements };
    } catch (error) {
      handlerLogger.error('Failed to get achievements', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:unlock-achievement', async (_, achievementId) => {
    handlerLogger.info('Handling unlock achievement request', { achievementId });
    try {
      const result = await services.analyticsService.unlockAchievement(achievementId);
      handlerLogger.info('Achievement unlocked', result);
      return result;
    } catch (error) {
      handlerLogger.error('Failed to unlock achievement', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-usage-stats', async (_event, params) => {
    handlerLogger.info('Handling get usage stats request', params);
    try {
      const stats = await services.analyticsService.getUsageStats(
        params.timeRange ?? '30days',
        params.includePatterns,
        params.includeEngagement
      );
      handlerLogger.info('Usage stats retrieved successfully');
      return { success: true, stats };
    } catch (error) {
      handlerLogger.error('Failed to get usage stats', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-token-usage', async (_event, params) => {
    handlerLogger.info('Handling get token usage request', params);
    try {
      const tokenUsage = await services.analyticsService.getTokenUsage(
        params.timeRange ?? '30days',
        params.includeByProvider,
        params.includeByFeature,
        params.includeProjections
      );
      handlerLogger.info('Token usage retrieved successfully');
      return { success: true, tokenUsage };
    } catch (error) {
      handlerLogger.error('Failed to get token usage', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:track-event', async (_event, event) => {
    handlerLogger.info('Handling analytics track event', event);
    try {
      await services.analyticsService.trackEvent(event);
      handlerLogger.info('Event tracked successfully');
      return { success: true };
    } catch (error) {
      handlerLogger.error('Failed to track event', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-concept-progress', async (_event, conceptId) => {
    handlerLogger.info('Handling get concept progress request', { conceptId });
    try {
      const progress = await services.analyticsService.getConceptProgress(conceptId);
      handlerLogger.info('Concept progress retrieved', { conceptId });
      return { success: true, progress };
    } catch (error) {
      handlerLogger.error('Failed to get concept progress', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-session-history', async (_event, params) => {
    handlerLogger.info('Handling get session history request', params);
    try {
      const history = await services.analyticsService.getSessionHistory(params?.limit ?? 50);
      handlerLogger.info('Session history retrieved', { count: history.length });
      return { success: true, history };
    } catch (error) {
      handlerLogger.error('Failed to get session history', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:check-achievements', async (_event, sessionId) => {
    handlerLogger.info('Handling check achievements request', { sessionId });
    try {
      const achievements = await services.analyticsService.checkAchievements(sessionId);
      handlerLogger.info('Achievements check completed', { sessionId, count: achievements.length });
      return { success: true, achievements };
    } catch (error) {
      handlerLogger.error('Failed to check achievements', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-learning-trends', async (_event, params) => {
    handlerLogger.info('Handling get learning trends request', params);
    try {
      const trends = await services.analyticsService.getLearningTrends(params?.period ?? 'weekly');
      handlerLogger.info('Learning trends retrieved', { period: trends.period });
      return { success: true, trends };
    } catch (error) {
      handlerLogger.error('Failed to get learning trends', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-study-streak', async () => {
    handlerLogger.info('Handling get study streak request');
    try {
      const streak = await services.analyticsService.getStudyStreak();
      handlerLogger.info('Study streak retrieved', { currentStreak: streak.currentStreak });
      return { success: true, streak };
    } catch (error) {
      handlerLogger.error('Failed to get study streak', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:get-time-stats', async (_event, params) => {
    handlerLogger.info('Handling get time stats request', params);
    try {
      const stats = await services.analyticsService.getTimeStats();
      handlerLogger.info('Time stats retrieved', { totalSessions: stats.totalSessions });
      return { success: true, stats };
    } catch (error) {
      handlerLogger.error('Failed to get time stats', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:export-data', async (_event, params) => {
    handlerLogger.info('Handling export data request', params);
    try {
      const exported = await services.analyticsService.exportData(params.format ?? 'json');
      handlerLogger.info('Data exported successfully');
      return { success: true, data: exported };
    } catch (error) {
      handlerLogger.error('Failed to export data', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:import-data', async (_event, params) => {
    handlerLogger.info('Handling import data request', params);
    try {
      await services.analyticsService.importData(params.payload, params.format);
      handlerLogger.info('Data imported successfully');
      return { success: true };
    } catch (error) {
      handlerLogger.error('Failed to import data', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:track-session', async (_event, session) => {
    handlerLogger.info('Handling track session request', { sessionId: session.id });
    try {
      const trackedSessionId = await services.analyticsService.trackSession(session);
      handlerLogger.info('Session tracked successfully', { sessionId: trackedSessionId });
      return { success: true, sessionId: trackedSessionId };
    } catch (error) {
      handlerLogger.error('Failed to track session', error);
      throw error;
    }
  });

  ipcMainInstance.handle('analytics:update-concept-progress', async (_event, conceptId, update) => {
    handlerLogger.info('Handling update concept progress request', { conceptId });
    try {
      await services.analyticsService.updateConceptProgress(conceptId, update);
      handlerLogger.info('Concept progress updated', { conceptId });
      return { success: true };
    } catch (error) {
      handlerLogger.error('Failed to update concept progress', error);
      throw error;
    }
  });

  handlerLogger.info('✅ Analytics handlers registered successfully');
};
