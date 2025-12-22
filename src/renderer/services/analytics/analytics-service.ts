import {
  DashboardDisplay,
  ProgressChartDisplay,
  ConceptProgressDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay,
  CreateLearningSessionRequest,
  ConceptProgressUpdate,
  ProgressChartParams,
  LearningSession,
  SessionDisplay,
  ConceptNotFoundError,
} from '@/shared/types/analytics';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { AchievementDisplay as APIAchievementDisplay } from '@/shared/types/electron-api/analytics-api';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

/**
 * This service uses the unwrapAPI pattern for consistent IPC error handling.
 *
 * All IPC calls use unwrapAPI() from @/renderer/hooks/useElectronAPI which:
 * - Automatically unwraps APIResponse<T> to T
 * - Shows error toasts on failures
 * - Throws IPCError for programmatic error handling
 *
 * See docs/DEVELOPER-GUIDE/electron-api.md for details.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'time' | 'concepts' | 'streaks' | 'performance' | 'engagement';
  requirement: Record<string, any>;
  progress: number;
  icon: string;
  unlockedAt?: Date;
}

export interface StudyMetrics {
  totalStudyTime: number;
  sessionsCompleted: number;
  conceptsStudied: number;
  accuracyRate: number;
  averageSessionLength: number;
  streakDays: number;
  lastStudyDate: Date;
  focusScore: number;
  questionsAsked: number;
  correctAnswers: number;
}

export interface LearningTrends {
  dailyStudyTime: Array<{ date: string; minutes: number }>;
  masteryProgress: Array<{ date: string; avgMastery: number }>;
  sessionTypes: Record<string, number>;
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;

/**
 * Functional implementation of analytics service using the unified electronAPI client
 */
export const createAnalyticsService = (apiClient: ElectronAPI) => {
  // Private helper methods
  const convertTimeRange = (period: string): '7days' | '30days' | '90days' | '1year' => {
    switch (period) {
    case 'week':
      return '7days';
    case 'month':
      return '30days';
    case 'quarter':
      return '90days';
    case 'year':
      return '1year';
    default:
      return '30days';
    }
  };

  const getUnitForMetric = (metric: string): string => {
    switch (metric) {
    case 'mastery':
      return '%';
    case 'sessions':
      return 'sessions';
    case 'time':
      return 'minutes';
    case 'concepts':
      return 'concepts';
    default:
      return '';
    }
  };

  // Public service functions
  const getDashboard = async (): Promise<DashboardDisplay> => {
    return await unwrapAPI(apiClient.analytics.getDashboard());
  };

  const getProgressChart = async (params: ProgressChartParams): Promise<ProgressChartDisplay> => {
    const data = await unwrapAPI(apiClient.analytics.getProgressChart({
      timeRange: convertTimeRange(params.period),
      metric: params.metric,
      conceptIds: params.conceptIds,
      includeGoal: true,
    }));

    // Convert the display data to match interface
    return {
      title: `${params.metric.charAt(0).toUpperCase() + params.metric.slice(1)} Progress`,
      type: data.chartType === 'scatter' ? 'line' : data.chartType,
      data: data.data.map((point) => ({
        date: new Date(point.date),
        value: point.minutes || point.sessions || point.concepts || 0,
        label: point.date,
      })),
      unit: getUnitForMetric(params.metric),
      period: params.period,
    };
  };

  const getConceptProgress = async (conceptId: string): Promise<ConceptProgressDisplay> => {
    try {
      return await unwrapAPI(apiClient.analytics.getConceptProgress(conceptId));
    } catch (error) {
      if (error instanceof Error && error.message.includes('CONCEPT_NOT_FOUND')) {
        throw new ConceptNotFoundError(conceptId);
      }
      throw error;
    }
  };

  const updateConceptProgress = async (
    conceptId: string,
    update: ConceptProgressUpdate,
  ): Promise<void> => {
    try {
      await unwrapAPI(apiClient.analytics.updateConceptProgress(conceptId, update));
    } catch (error) {
      if (error instanceof Error && error.message.includes('CONCEPT_NOT_FOUND')) {
        throw new ConceptNotFoundError(conceptId);
      }
      throw error;
    }
  };

  const trackSession = async (session: CreateLearningSessionRequest): Promise<string> => {
    return await unwrapAPI(apiClient.analytics.trackSession(session));
  };

  const updateSession = async (
    sessionId: string,
    updates: Partial<LearningSession>,
  ): Promise<void> => {
    // Note: The API doesn't have a specific updateSession method,
    // so we'll need to implement this through the main process
    // For now, this is a placeholder that would need the corresponding IPC handler
    throw new Error('Session update not yet implemented');
  };

  const getSessionHistory = async (limit?: number): Promise<SessionDisplay[]> => {
    return await unwrapAPI(apiClient.analytics.getSessionHistory({
      limit: limit || 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }));
  };

  const getAchievements = async (): Promise<Achievement[]> => {
    const apiData = await unwrapAPI(apiClient.analytics.getAchievements());

    // Transform the API response to match the IAnalyticsService Achievement interface
    // The API returns AchievementDisplay from analytics-api.ts which has 'name' property
    return apiData.map((achievement: APIAchievementDisplay) => ({
      id: achievement.id,
      title: achievement.name, // Convert 'name' to 'title'
      description: achievement.description,
      category: achievement.category as
        | 'time'
        | 'concepts'
        | 'streaks'
        | 'performance'
        | 'engagement',
      requirement: {}, // Default empty requirement object
      progress: achievement.progress.percentage, // Extract percentage from nested progress object
      icon: achievement.icon,
      unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined,
    }));
  };

  const checkAchievements = async (sessionId?: string): Promise<Achievement[]> => {
    const apiData = await unwrapAPI(apiClient.analytics.checkAchievements(sessionId));

    // Transform the API response to match the IAnalyticsService Achievement interface
    // The API returns AchievementDisplay from analytics-api.ts which has 'name' property
    return apiData.map((achievement: APIAchievementDisplay) => ({
      id: achievement.id,
      title: achievement.name, // Convert 'name' to 'title'
      description: achievement.description,
      category: achievement.category as
        | 'time'
        | 'concepts'
        | 'streaks'
        | 'performance'
        | 'engagement',
      requirement: {}, // Default empty requirement object
      progress: achievement.progress.percentage, // Extract percentage from nested progress object
      icon: achievement.icon,
      unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined,
    }));
  };

  const getLearningTrends = async (period?: number): Promise<LearningTrends> => {
    // Convert number period to string format expected by API
    const periodMap: Record<number, 'daily' | 'weekly' | 'monthly'> = {
      1: 'daily',
      7: 'weekly',
      30: 'monthly',
    };

    const apiPeriod = period && periodMap[period] ? periodMap[period] : 'weekly';

    const data = await unwrapAPI(apiClient.analytics.getLearningTrends({
      period: apiPeriod,
      metric: 'mastery',
    }));

    // Transform the API response to match the IAnalyticsService LearningTrends interface
    return {
      dailyStudyTime: data.dataPoints.map((point) => ({
        date: point.date.toISOString().split('T')[0],
        minutes: point.value,
      })),
      masteryProgress: data.dataPoints.map((point) => ({
        date: point.date.toISOString().split('T')[0],
        avgMastery: point.value,
      })),
      sessionTypes: {}, // Default empty object
    };
  };

  const getStudyStreak = async (): Promise<StudyStreakDisplay> => {
    return await unwrapAPI(apiClient.analytics.getStudyStreak());
  };

  const getTimeStats = async (): Promise<TimeStatsDisplay> => {
    return await unwrapAPI(apiClient.analytics.getTimeStats({
      includeBreakdown: true,
      includeComparisons: true,
    }));
  };

  const exportData = async (format: 'json' | 'csv'): Promise<string> => {
    return await unwrapAPI(apiClient.analytics.exportData({
      format,
      includeSensitive: false,
      compress: false,
    }));
  };

  const importData = async (data: string, format: 'json' | 'csv'): Promise<void> => {
    await unwrapAPI(apiClient.analytics.importData({
      data,
      format,
      overwrite: false,
      validateOnly: false,
    }));
  };

  // Implement the IAnalyticsService interface methods
  const getStudyMetrics = async (): Promise<StudyMetrics> => {
    const [timeStats, streak, usage] = await Promise.all([
      unwrapAPI(apiClient.analytics.getTimeStats({ includeBreakdown: true, includeComparisons: true })),
      unwrapAPI(apiClient.analytics.getStudyStreak()),
      unwrapAPI(apiClient.analytics.getUsageStats({
        timeRange: '7days',
        includePatterns: true,
        includeEngagement: true,
        detailed: true,
      })),
    ]);

    return {
      totalStudyTime: Number(timeStats.totalStudyTime || 0),
      sessionsCompleted: Number(timeStats.totalSessions || 0),
      conceptsStudied: Number(usage.learning?.conceptsLearned || 0),
      accuracyRate: Number(usage.learning?.accuracy || 0),
      averageSessionLength: Number(timeStats.averageSessionTime || 0),
      streakDays: Number(streak.currentStreak || 0),
      lastStudyDate: streak.lastStudyDate ? new Date(streak.lastStudyDate) : new Date(0),
      focusScore: Number(usage.engagement?.averageSessionRating || 0),
      questionsAsked: Number(usage.learning?.exercisesCompleted || 0),
      correctAnswers: 0,
    };
  };

  const getRecentSessions = async (limit?: number): Promise<SessionDisplay[]> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('getRecentSessions not yet implemented');
  };

  const getSession = async (sessionId: string): Promise<SessionDisplay | null> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('getSession not yet implemented');
  };

  const trackEvent = async (event: {
    type: string;
    data: Record<string, any>;
    timestamp?: Date;
  }): Promise<void> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('trackEvent not yet implemented');
  };

  const updateAchievementProgress = async (
    achievementId: string,
    progress: number,
  ): Promise<void> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('updateAchievementProgress not yet implemented');
  };

  const getLearningInsights = async (): Promise<{
    strengths: string[];
    improvementAreas: string[];
    recommendations: string[];
    nextMilestone?: string;
  }> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('getLearningInsights not yet implemented');
  };

  return {
    getDashboard,
    getProgressChart,
    getConceptProgress,
    updateConceptProgress,
    trackSession,
    getStudyStreak,
    getTimeStats,
    exportData,
    importData,
    updateSession,
    getSessionHistory,
    getAchievements,
    getStudyMetrics,
    getLearningTrends,
    getRecentSessions,
    getSession,
    trackEvent,
    updateAchievementProgress,
    getLearningInsights,
  };
};
