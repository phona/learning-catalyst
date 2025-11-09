/**
 * Enhanced Renderer Analytics Service Client
 *
 * Client-side service that communicates with the main process analytics service
 * through IPC. Implements proper error handling and type safety following the new architecture.
 */

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
  AnalyticsError,
  SessionNotFoundError,
  ConceptNotFoundError,
  DataValidationError
} from '@/shared/interfaces/analytics.interface';
import {
  AnalyticsAPI,
  ProgressChartRequest,
  SessionHistoryRequest,
  LearningTrendsRequest,
  TimeStatsRequest,
  ExportDataRequest,
  ImportDataRequest
} from '@/shared/types/electron-api/analytics-api';

/**
 * Service error for client-side operations
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Renderer-side implementation of AnalyticsService
 * Communicates with main process via IPC
 */
export class AnalyticsService implements IAnalyticsService {
  constructor(
    private electronAPI: AnalyticsAPI,
    private errorReporter: (error: Error, context: string) => void = console.error
  ) {}

  // Dashboard and overview
  async getDashboard(): Promise<DashboardDisplay> {
    try {
      const response = await this.electronAPI.getDashboard();

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get dashboard',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No dashboard data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getDashboard');
      throw this.convertError(error);
    }
  }

  // Progress tracking
  async getProgressChart(params: ProgressChartParams): Promise<ProgressChartDisplay> {
    try {
      const request: ProgressChartRequest = {
        timeRange: this.convertTimeRange(params.period),
        metric: params.metric,
        conceptIds: params.conceptIds,
        includeGoal: true
      };

      const response = await this.electronAPI.getProgressChart(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get progress chart',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No progress chart data received', 'NO_DATA');
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
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getProgressChart');
      throw this.convertError(error);
    }
  }

  async getConceptProgress(conceptId: string): Promise<ConceptProgressDisplay> {
    try {
      const response = await this.electronAPI.getConceptProgress(conceptId);

      if (!response.success) {
        if (response.error?.code === 'CONCEPT_NOT_FOUND') {
          throw new ConceptNotFoundError(conceptId);
        }
        throw new ServiceError(
          response.error?.message || 'Failed to get concept progress',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No concept progress data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getConceptProgress');
      throw this.convertError(error);
    }
  }

  async updateConceptProgress(conceptId: string, update: ConceptProgressUpdate): Promise<void> {
    try {
      const response = await this.electronAPI.updateConceptProgress(conceptId, update);

      if (!response.success) {
        if (response.error?.code === 'CONCEPT_NOT_FOUND') {
          throw new ConceptNotFoundError(conceptId);
        }
        throw new ServiceError(
          response.error?.message || 'Failed to update concept progress',
          response.error?.code,
          response.error?.details
        );
      }
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.updateConceptProgress');
      throw this.convertError(error);
    }
  }

  // Session management
  async trackSession(session: CreateLearningSessionRequest): Promise<string> {
    try {
      const response = await this.electronAPI.trackSession(session);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to track session',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No session ID received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.trackSession');
      throw this.convertError(error);
    }
  }

  async updateSession(sessionId: string, updates: Partial<LearningSession>): Promise<void> {
    try {
      // Note: The API doesn't have a specific updateSession method,
      // so we'll need to implement this through the main process
      // For now, this is a placeholder that would need the corresponding IPC handler
      throw new ServiceError('Session update not yet implemented', 'NOT_IMPLEMENTED');
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.updateSession');
      throw this.convertError(error);
    }
  }

  async getSessionHistory(limit?: number): Promise<SessionDisplay[]> {
    try {
      const request: SessionHistoryRequest = {
        limit: limit || 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const response = await this.electronAPI.getSessionHistory(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get session history',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No session history data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getSessionHistory');
      throw this.convertError(error);
    }
  }

  // Achievements
  async getAchievements(): Promise<AchievementDisplay[]> {
    try {
      const response = await this.electronAPI.getAchievements();

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get achievements',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No achievements data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getAchievements');
      throw this.convertError(error);
    }
  }

  async checkAchievements(sessionId?: string): Promise<AchievementDisplay[]> {
    try {
      const response = await this.electronAPI.checkAchievements(sessionId);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to check achievements',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No achievements data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.checkAchievements');
      throw this.convertError(error);
    }
  }

  // Analytics data
  async getLearningTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> {
    try {
      const request: LearningTrendsRequest = {
        period,
        metric: 'mastery'
      };

      const response = await this.electronAPI.getLearningTrends(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get learning trends',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No learning trends data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getLearningTrends');
      throw this.convertError(error);
    }
  }

  async getStudyStreak(): Promise<StudyStreakDisplay> {
    try {
      const response = await this.electronAPI.getStudyStreak();

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get study streak',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No study streak data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getStudyStreak');
      throw this.convertError(error);
    }
  }

  async getTimeStats(): Promise<TimeStatsDisplay> {
    try {
      const request: TimeStatsRequest = {
        includeBreakdown: true,
        includeComparisons: true
      };

      const response = await this.electronAPI.getTimeStats(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to get time stats',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No time stats data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.getTimeStats');
      throw this.convertError(error);
    }
  }

  // Export/import
  async exportData(format: 'json' | 'csv'): Promise<string> {
    try {
      const request: ExportDataRequest = {
        format,
        includeSensitive: false,
        compress: false
      };

      const response = await this.electronAPI.exportData(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to export data',
          response.error?.code,
          response.error?.details
        );
      }

      if (!response.data) {
        throw new ServiceError('No export data received', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.exportData');
      throw this.convertError(error);
    }
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    try {
      const request: ImportDataRequest = {
        data,
        format,
        overwrite: false,
        validateOnly: false
      };

      const response = await this.electronAPI.importData(request);

      if (!response.success) {
        throw new ServiceError(
          response.error?.message || 'Failed to import data',
          response.error?.code,
          response.error?.details
        );
      }
    } catch (error) {
      this.errorReporter(error as Error, 'AnalyticsService.importData');
      throw this.convertError(error);
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
   * Get date range for a given period
   */
  private getDateRangeForPeriod(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];

    let start: Date;
    switch (period) {
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      start: start.toISOString().split('T')[0],
      end
    };
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

  /**
   * Convert various error types to ServiceError
   */
  private convertError(error: any): Error {
    if (error instanceof ServiceError ||
        error instanceof ConceptNotFoundError ||
        error instanceof SessionNotFoundError ||
        error instanceof DataValidationError) {
      return error;
    }

    if (error?.code === 'CONCEPT_NOT_FOUND') {
      return new ConceptNotFoundError(error.details?.conceptId || 'unknown');
    }

    if (error?.code === 'SESSION_NOT_FOUND') {
      return new SessionNotFoundError(error.details?.sessionId || 'unknown');
    }

    if (error?.code === 'DATA_VALIDATION_ERROR') {
      return new DataValidationError(
        error.details?.field || 'unknown',
        error.details?.value || null,
        error.details?.expectedType || 'unknown'
      );
    }

    return new ServiceError(
      error?.message || 'Unknown error occurred',
      error?.code,
      error?.details
    );
  }
}

/**
 * Factory function to create an AnalyticsService instance
 */
export function createAnalyticsService(
  electronAPI: AnalyticsAPI,
  errorReporter?: (error: Error, context: string) => void
): AnalyticsService {
  return new AnalyticsService(electronAPI, errorReporter);
}