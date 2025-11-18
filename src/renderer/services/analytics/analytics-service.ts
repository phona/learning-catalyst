/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




import {
  AnalyticsService as IAnalyticsService,
  DashboardDisplay,
  ProgressChartDisplay,
  ConceptProgressDisplay,
  AchievementDisplay,
  LearningTrendDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay,
  CreateLearningSessionRequest,
  ConceptProgressUpdate,
  ProgressChartParams,
  LearningSession,
  SessionDisplay,
  ConceptNotFoundError,
} from '@/shared/interfaces/analytics.interface';
import type { ElectronAPIClient } from '../api/electron-api-client';

export type AnalyticsService = IAnalyticsService

/**
 * Functional implementation of analytics service using the unified electronAPI client
 */
export const createAnalyticsService = (apiClient: ElectronAPIClient): AnalyticsService => {
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
      includeGoal: true
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get progress chart');
    }

    // Convert the display data to match interface
    return {
      title: `${params.metric.charAt(0).toUpperCase() + params.metric.slice(1)} Progress`,
      type: response.data.chartType === 'scatter' ? 'line' : response.data.chartType,
      data: response.data.data.map(point => ({
        date: new Date(point.date),
        value: point.minutes || point.sessions || point.concepts || 0,
        label: point.date
      })),
      unit: getUnitForMetric(params.metric),
      period: params.period
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

  const updateConceptProgress = async (conceptId: string, update: ConceptProgressUpdate): Promise<void> => {
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

  const updateSession = async (sessionId: string, updates: Partial<LearningSession>): Promise<void> => {
    // Note: The API doesn't have a specific updateSession method,
    // so we'll need to implement this through the main process
    // For now, this is a placeholder that would need the corresponding IPC handler
    throw new Error('Session update not yet implemented');
  };

  const getSessionHistory = async (limit?: number): Promise<SessionDisplay[]> => {
    const response = await apiClient.analytics.getSessionHistory({
      limit: limit || 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get session history');
    }

    return response.data;
  };

  const getAchievements = async (): Promise<AchievementDisplay[]> => {
    const response = await apiClient.analytics.getAchievements();

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get achievements');
    }

    return response.data;
  };

  const checkAchievements = async (sessionId?: string): Promise<AchievementDisplay[]> => {
    const response = await apiClient.analytics.checkAchievements(sessionId);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to check achievements');
    }

    return response.data;
  };

  const getLearningTrends = async (period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> => {
    const response = await apiClient.analytics.getLearningTrends({
      period,
      metric: 'mastery'
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get learning trends');
    }

    return response.data;
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
      includeComparisons: true
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
      compress: false
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
      validateOnly: false
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to import data');
    }
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
    checkAchievements,
    getLearningTrends,
    getStudyStreak,
    getTimeStats,
    exportData,
    importData,
  };
};

/**
 * Backward-compatible class wrapper for tests
 */
export class DefaultAnalyticsService {
  private readonly service: AnalyticsService;

  constructor(apiClient: ElectronAPIClient) {
    this.service = createAnalyticsService(apiClient);
  }

  // Delegate all methods to the underlying service
  async getDashboard(): Promise<DashboardDisplay> {
    return this.service.getDashboard();
  }

  async getProgressChart(params: ProgressChartParams): Promise<ProgressChartDisplay> {
    return this.service.getProgressChart(params);
  }

  async getConceptProgress(conceptId: string): Promise<ConceptProgressDisplay> {
    return this.service.getConceptProgress(conceptId);
  }

  async updateConceptProgress(conceptId: string, update: ConceptProgressUpdate): Promise<void> {
    return this.service.updateConceptProgress(conceptId, update);
  }

  async trackSession(session: CreateLearningSessionRequest): Promise<string> {
    return this.service.trackSession(session);
  }

  async updateSession(sessionId: string, updates: Partial<LearningSession>): Promise<void> {
    return this.service.updateSession(sessionId, updates);
  }

  async getSessionHistory(limit?: number): Promise<SessionDisplay[]> {
    return this.service.getSessionHistory(limit);
  }

  async getAchievements(): Promise<AchievementDisplay[]> {
    return this.service.getAchievements();
  }

  async checkAchievements(sessionId?: string): Promise<AchievementDisplay[]> {
    return this.service.checkAchievements(sessionId);
  }

  async getLearningTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> {
    return this.service.getLearningTrends(period);
  }

  async getStudyStreak(): Promise<StudyStreakDisplay> {
    return this.service.getStudyStreak();
  }

  async getTimeStats(): Promise<TimeStatsDisplay> {
    return this.service.getTimeStats();
  }

  async exportData(format: 'json' | 'csv'): Promise<string> {
    return this.service.exportData(format);
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    return this.service.importData(data, format);
  }
}

