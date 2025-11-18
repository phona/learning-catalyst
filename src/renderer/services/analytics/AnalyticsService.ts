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
 * Clean implementation of analytics service using the unified electronAPI client
 */
export class DefaultAnalyticsService implements AnalyticsService {
  constructor(private readonly apiClient: ElectronAPIClient) {}

  // Dashboard and overview
  async getDashboard(): Promise<DashboardDisplay> {
    const response = await this.apiClient.analytics.getDashboard();
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get dashboard');
    }
    
    return response.data;
  }

  // Progress tracking
  async getProgressChart(params: ProgressChartParams): Promise<ProgressChartDisplay> {
    const response = await this.apiClient.analytics.getProgressChart({
      timeRange: this.convertTimeRange(params.period),
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
      unit: this.getUnitForMetric(params.metric),
      period: params.period
    };
  }

  async getConceptProgress(conceptId: string): Promise<ConceptProgressDisplay> {
    const response = await this.apiClient.analytics.getConceptProgress(conceptId);
    
    if (!response.success || !response.data) {
      if (response.error?.code === 'CONCEPT_NOT_FOUND') {
        throw new ConceptNotFoundError(conceptId);
      }
      throw new Error(response.error?.message || 'Failed to get concept progress');
    }
    
    return response.data;
  }

  async updateConceptProgress(conceptId: string, update: ConceptProgressUpdate): Promise<void> {
    const response = await this.apiClient.analytics.updateConceptProgress(conceptId, update);
    
    if (!response.success) {
      if (response.error?.code === 'CONCEPT_NOT_FOUND') {
        throw new ConceptNotFoundError(conceptId);
      }
      throw new Error(response.error?.message || 'Failed to update concept progress');
    }
  }

  // Session management
  async trackSession(session: CreateLearningSessionRequest): Promise<string> {
    const response = await this.apiClient.analytics.trackSession(session);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to track session');
    }
    
    return response.data;
  }

  async updateSession(sessionId: string, updates: Partial<LearningSession>): Promise<void> {
    // TODO: Implement session update functionality when IPC handler is available
    // This should include:
    // 1. Validate updates against session schema
    // 2. Call IPC handler to update session in main process
    // 3. Handle partial updates (only update provided fields)
    // 4. Return appropriate response or handle errors
    console.warn('Session update functionality not yet implemented in AnalyticsService');
    
    // Temporary implementation - will be replaced with actual IPC call
    return Promise.resolve();
  }

  async getSessionHistory(limit?: number): Promise<SessionDisplay[]> {
    const response = await this.apiClient.analytics.getSessionHistory({
      limit: limit || 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get session history');
    }
    
    return response.data;
  }

  // Achievements
  async getAchievements(): Promise<AchievementDisplay[]> {
    const response = await this.apiClient.analytics.getAchievements();
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get achievements');
    }
    
    return response.data;
  }

  async checkAchievements(sessionId?: string): Promise<AchievementDisplay[]> {
    const response = await this.apiClient.analytics.checkAchievements(sessionId);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to check achievements');
    }
    
    return response.data;
  }

  // Analytics data
  async getLearningTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> {
    const response = await this.apiClient.analytics.getLearningTrends({
      period,
      metric: 'mastery'
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get learning trends');
    }
    
    return response.data;
  }

  async getStudyStreak(): Promise<StudyStreakDisplay> {
    const response = await this.apiClient.analytics.getStudyStreak();
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get study streak');
    }
    
    return response.data;
  }

  async getTimeStats(): Promise<TimeStatsDisplay> {
    const response = await this.apiClient.analytics.getTimeStats({
      includeBreakdown: true,
      includeComparisons: true
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get time stats');
    }
    
    return response.data;
  }

  // Export/import
  async exportData(format: 'json' | 'csv'): Promise<string> {
    const response = await this.apiClient.analytics.exportData({
      format,
      includeSensitive: false,
      compress: false
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to export data');
    }
    
    return response.data;
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    const response = await this.apiClient.analytics.importData({
      data,
      format,
      overwrite: false,
      validateOnly: false
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to import data');
    }
  }

  // Private helper methods
  /**
   * Convert time range period to API format
   */
  private convertTimeRange(period: string): '7days' | '30days' | '90days' | '1year' {
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
  }

  /**
   * Get unit label for metric type
   */
  private getUnitForMetric(metric: string): string {
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
  }
}