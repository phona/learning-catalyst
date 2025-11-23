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
} from '@/shared/interfaces/analytics.interface';
import type { ElectronAPI } from '@/shared/types/electron-api';
import type { AchievementDisplay as APIAchievementDisplay } from '@/shared/types/electron-api/analytics-api';

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
    const response = await apiClient.analytics.getDashboard();

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get dashboard');
    }

    return response.data;
  };

  const getProgressChart = async (params: ProgressChartParams): Promise<ProgressChartDisplay> => {
    const response = await apiClient.analytics.getProgressChart({
      timeRange: convertTimeRange(params.period),
      metric: params.metric,
      conceptIds: params.conceptIds,
      includeGoal: true,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get progress chart');
    }

    // Convert the display data to match interface
    return {
      title: `${params.metric.charAt(0).toUpperCase() + params.metric.slice(1)} Progress`,
      type: response.data.chartType === 'scatter' ? 'line' : response.data.chartType,
      data: response.data.data.map((point) => ({
        date: new Date(point.date),
        value: point.minutes || point.sessions || point.concepts || 0,
        label: point.date,
      })),
      unit: getUnitForMetric(params.metric),
      period: params.period,
    };
  };

  const getConceptProgress = async (conceptId: string): Promise<ConceptProgressDisplay> => {
    const response = await apiClient.analytics.getConceptProgress(conceptId);

    if (!response.success || !response.data) {
      if (response.error?.code === 'CONCEPT_NOT_FOUND') {
        throw new ConceptNotFoundError(conceptId);
      }
      throw new Error(response.error?.message || 'Failed to get concept progress');
    }

    return response.data;
  };

  const updateConceptProgress = async (
    conceptId: string,
    update: ConceptProgressUpdate,
  ): Promise<void> => {
    const response = await apiClient.analytics.updateConceptProgress(conceptId, update);

    if (!response.success) {
      if (response.error?.code === 'CONCEPT_NOT_FOUND') {
        throw new ConceptNotFoundError(conceptId);
      }
      throw new Error(response.error?.message || 'Failed to update concept progress');
    }
  };

  const trackSession = async (session: CreateLearningSessionRequest): Promise<string> => {
    const response = await apiClient.analytics.trackSession(session);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to track session');
    }

    return response.data;
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
    const response = await apiClient.analytics.getSessionHistory({
      limit: limit || 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get session history');
    }

    return response.data;
  };

  const getAchievements = async (): Promise<Achievement[]> => {
    const response = await apiClient.analytics.getAchievements();

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get achievements');
    }

    // Transform the API response to match the IAnalyticsService Achievement interface
    // The API returns AchievementDisplay from analytics-api.ts which has 'name' property
    const apiData = response.data;
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
    const response = await apiClient.analytics.checkAchievements(sessionId);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to check achievements');
    }

    // Transform the API response to match the IAnalyticsService Achievement interface
    // The API returns AchievementDisplay from analytics-api.ts which has 'name' property
    const apiData = response.data as unknown as APIAchievementDisplay[];
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

    const response = await apiClient.analytics.getLearningTrends({
      period: apiPeriod,
      metric: 'mastery',
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get learning trends');
    }

    // Transform the API response to match the IAnalyticsService LearningTrends interface
    return {
      dailyStudyTime: response.data.dataPoints.map((point) => ({
        date: point.date.toISOString().split('T')[0],
        minutes: point.value,
      })),
      masteryProgress: response.data.dataPoints.map((point) => ({
        date: point.date.toISOString().split('T')[0],
        avgMastery: point.value,
      })),
      sessionTypes: {}, // Default empty object
    };
  };

  const getStudyStreak = async (): Promise<StudyStreakDisplay> => {
    const response = await apiClient.analytics.getStudyStreak();

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get study streak');
    }

    return response.data;
  };

  const getTimeStats = async (): Promise<TimeStatsDisplay> => {
    const response = await apiClient.analytics.getTimeStats({
      includeBreakdown: true,
      includeComparisons: true,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get time stats');
    }

    return response.data;
  };

  const exportData = async (format: 'json' | 'csv'): Promise<string> => {
    const response = await apiClient.analytics.exportData({
      format,
      includeSensitive: false,
      compress: false,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to export data');
    }

    return response.data;
  };

  const importData = async (data: string, format: 'json' | 'csv'): Promise<void> => {
    const response = await apiClient.analytics.importData({
      data,
      format,
      overwrite: false,
      validateOnly: false,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to import data');
    }
  };

  // Implement the IAnalyticsService interface methods
  const getStudyMetrics = async (): Promise<StudyMetrics> => {
    // This would need to be implemented based on the available API methods
    // For now, return a placeholder implementation
    throw new Error('getStudyMetrics not yet implemented');
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
