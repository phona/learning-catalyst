/**
 * Main Process Analytics Service
 *
 * Implements the AnalyticsService interface for the main process.
 * Handles database operations and provides analytics data to the renderer via IPC.
 */

import { Kysely } from 'kysely';
import { Database } from '../database/kysely-schema';
import {
  AnalyticsService,
  DashboardDisplay,
  ProgressChartDisplay,
  ConceptProgressDisplay,
  AchievementDisplay,
  LearningTrendDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay,
  LearningSession,
  CreateLearningSessionRequest,
  ConceptProgressUpdate,
  ProgressChartParams,
  AnalyticsError,
  SessionNotFoundError,
  ConceptNotFoundError,
  DataValidationError
} from '@/shared/interfaces/analytics.interface';
import { ILogger } from '../registry/ServiceTokens';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main process implementation of AnalyticsService
 */
export class MainAnalyticsService implements AnalyticsService {
  constructor(
    private db: Kysely<Database>,
    private logger: ILogger
  ) {}

  // Dashboard and overview
  async getDashboard(): Promise<DashboardDisplay> {
    this.logger.debug('Getting dashboard data');

    try {
      const [
        recentSessions,
        conceptProgress,
        achievements,
        studyStreak,
        timeStats,
        learningTrends
      ] = await Promise.all([
        this.getRecentSessions(10),
        this.getConceptProgressData(),
        this.getAchievementsData(),
        this.getStudyStreakData(),
        this.getTimeStatsData(),
        this.getLearningTrendsData('daily')
      ]);

      const dashboard: DashboardDisplay = {
        recentSessions,
        conceptProgress,
        achievements,
        learningTrends,
        studyStreak,
        timeStats
      };

      this.logger.debug('Dashboard data retrieved successfully');
      return dashboard;

    } catch (error) {
      this.logger.error('Failed to get dashboard data', error);
      throw new AnalyticsError('Dashboard fetch failed', 'DASHBOARD_ERROR', error);
    }
  }

  // Progress tracking
  async getProgressChart(params: ProgressChartParams): Promise<ProgressChartDisplay> {
    this.logger.debug('Getting progress chart', params);

    try {
      const dataPoints = await this.generateProgressData(params);
      const average = this.calculateAverage(dataPoints);
      const peak = this.calculatePeak(dataPoints);
      const improvement = this.calculateImprovement(dataPoints);

      const chart: ProgressChartDisplay = {
        title: this.getChartTitle(params),
        type: this.getChartType(params.metric),
        data: dataPoints,
        goal: params.conceptIds?.length ? 100 : undefined,
        unit: this.getUnit(params.metric),
        period: params.period
      };

      this.logger.debug('Progress chart generated successfully', {
        dataPoints: dataPoints.length,
        period: params.period
      });

      return chart;

    } catch (error) {
      this.logger.error('Failed to get progress chart', error);
      throw new AnalyticsError('Progress chart generation failed', 'CHART_ERROR', error);
    }
  }

  async getConceptProgress(conceptId: string): Promise<ConceptProgressDisplay> {
    this.logger.debug('Getting concept progress', { conceptId });

    if (!conceptId || typeof conceptId !== 'string') {
      throw new DataValidationError('conceptId', conceptId, 'string');
    }

    try {
      const concept = await this.db
        .selectFrom('concepts')
        .where('id', '=', conceptId)
        .selectAll()
        .executeTakeFirst();

      if (!concept) {
        throw new ConceptNotFoundError(conceptId);
      }

      const progress = await this.db
        .selectFrom('concept_progress')
        .where('concept_id', '=', conceptId)
        .orderBy('updated_at', 'desc')
        .limit(1)
        .selectAll()
        .executeTakeFirst();

      const sessions = await this.db
        .selectFrom('learning_sessions')
        .innerJoin('session_concepts', 'learning_sessions.id', 'session_concepts.session_id')
        .where('session_concepts.concept_id', '=', conceptId)
        .orderBy('learning_sessions.created_at', 'desc')
        .selectAll()
        .execute();

      const trend = this.calculateTrend(sessions);
      const relatedConcepts = await this.getRelatedConcepts(conceptId);
      const prerequisites = await this.getPrerequisites(conceptId);

      const conceptProgress: ConceptProgressDisplay = {
        conceptId,
        conceptName: concept.name,
        masteryLevel: progress?.mastery_level || 0,
        totalSessions: sessions.length,
        lastStudied: sessions[0]?.created_at || new Date(),
        trend,
        relatedConcepts,
        prerequisites,
        nextSteps: this.calculateNextSteps(conceptId, progress?.mastery_level || 0)
      };

      this.logger.debug('Concept progress retrieved', {
        conceptId,
        masteryLevel: conceptProgress.masteryLevel
      });

      return conceptProgress;

    } catch (error) {
      if (error instanceof ConceptNotFoundError || error instanceof DataValidationError) {
        throw error;
      }

      this.logger.error('Failed to get concept progress', error);
      throw new AnalyticsError('Concept progress fetch failed', 'CONCEPT_PROGRESS_ERROR', error);
    }
  }

  async updateConceptProgress(
    conceptId: string,
    update: ConceptProgressUpdate
  ): Promise<void> {
    this.logger.debug('Updating concept progress', { conceptId, update });

    if (!conceptId || typeof conceptId !== 'string') {
      throw new DataValidationError('conceptId', conceptId, 'string');
    }

    if (!update.masteryLevel || update.masteryLevel < 0 || update.masteryLevel > 100) {
      throw new DataValidationError('masteryLevel', update.masteryLevel, 'number between 0 and 100');
    }

    try {
      // Verify concept exists
      const concept = await this.db
        .selectFrom('concepts')
        .where('id', '=', conceptId)
        .select('id')
        .executeTakeFirst();

      if (!concept) {
        throw new ConceptNotFoundError(conceptId);
      }

      // Update or insert progress
      await this.db
        .insertInto('concept_progress')
        .values({
          concept_id: conceptId,
          mastery_level: update.masteryLevel,
          session_time: update.sessionTime || 0,
          exercise_completed: update.exerciseCompleted || false,
          notes: update.notes || '',
          updated_at: new Date(),
          user_id: this.getCurrentUserId()
        })
        .onConflict(oc => oc
          .column('concept_id')
          .doUpdateSet({
            mastery_level: update.masteryLevel,
            session_time: update.sessionTime || 0,
            exercise_completed: update.exerciseCompleted || false,
            notes: update.notes || '',
            updated_at: new Date()
          })
        )
        .execute();

      this.logger.info('Concept progress updated successfully', {
        conceptId,
        masteryLevel: update.masteryLevel
      });

    } catch (error) {
      if (error instanceof ConceptNotFoundError || error instanceof DataValidationError) {
        throw error;
      }

      this.logger.error('Failed to update concept progress', error);
      throw new AnalyticsError('Concept progress update failed', 'CONCEPT_UPDATE_ERROR', error);
    }
  }

  // Session management
  async trackSession(session: CreateLearningSessionRequest): Promise<string> {
    this.logger.debug('Tracking session', { title: session.title });

    if (!session.title || typeof session.title !== 'string') {
      throw new DataValidationError('title', session.title, 'string');
    }

    try {
      const sessionId = uuidv4();
      const now = new Date();

      await this.db
        .insertInto('learning_sessions')
        .values({
          id: sessionId,
          title: session.title,
          created_at: now,
          updated_at: now,
          user_id: this.getCurrentUserId(),
          notes: session.notes || '',
          tags: session.tags ? JSON.stringify(session.tags) : '[]'
        })
        .execute();

      // Link concepts to session
      if (session.concepts && session.concepts.length > 0) {
        await this.linkConceptsToSession(sessionId, session.concepts);
      }

      this.logger.info('Session tracked successfully', { sessionId, title: session.title });
      return sessionId;

    } catch (error) {
      if (error instanceof DataValidationError) {
        throw error;
      }

      this.logger.error('Failed to track session', error);
      throw new AnalyticsError('Session tracking failed', 'SESSION_TRACK_ERROR', error);
    }
  }

  async updateSession(sessionId: string, updates: Partial<LearningSession>): Promise<void> {
    this.logger.debug('Updating session', { sessionId, updates });

    if (!sessionId || typeof sessionId !== 'string') {
      throw new DataValidationError('sessionId', sessionId, 'string');
    }

    try {
      const existingSession = await this.db
        .selectFrom('learning_sessions')
        .where('id', '=', sessionId)
        .selectAll()
        .executeTakeFirst();

      if (!existingSession) {
        throw new SessionNotFoundError(sessionId);
      }

      const updateData: any = {
        updated_at: new Date()
      };

      if (updates.title !== undefined) {
        updateData.title = updates.title;
      }

      if (updates.endTime !== undefined) {
        const duration = updates.endTime.getTime() - existingSession.created_at.getTime();
        updateData.duration = Math.floor(duration / (1000 * 60)); // minutes
        updateData.ended_at = updates.endTime;
      }

      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }

      if (updates.tags !== undefined) {
        updateData.tags = JSON.stringify(updates.tags);
      }

      await this.db
        .updateTable('learning_sessions')
        .set(updateData)
        .where('id', '=', sessionId)
        .execute();

      this.logger.info('Session updated successfully', { sessionId });

    } catch (error) {
      if (error instanceof SessionNotFoundError || error instanceof DataValidationError) {
        throw error;
      }

      this.logger.error('Failed to update session', error);
      throw new AnalyticsError('Session update failed', 'SESSION_UPDATE_ERROR', error);
    }
  }

  async getSessionHistory(limit = 50): Promise<any[]> {
    this.logger.debug('Getting session history', { limit });

    try {
      const sessions = await this.db
        .selectFrom('learning_sessions')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();

      return sessions;

    } catch (error) {
      this.logger.error('Failed to get session history', error);
      throw new AnalyticsError('Session history fetch failed', 'SESSION_HISTORY_ERROR', error);
    }
  }

  // Achievements
  async getAchievements(): Promise<AchievementDisplay[]> {
    this.logger.debug('Getting achievements');

    try {
      const achievements = await this.db
        .selectFrom('achievements')
        .selectAll()
        .orderBy('unlocked_at', 'desc')
        .execute();

      return achievements.map(achievement => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        unlockedAt: achievement.unlocked_at,
        category: achievement.category,
        rarity: achievement.rarity,
        progress: achievement.progress
      }));

    } catch (error) {
      this.logger.error('Failed to get achievements', error);
      throw new AnalyticsError('Achievements fetch failed', 'ACHIEVEMENTS_ERROR', error);
    }
  }

  async checkAchievements(sessionId: string): Promise<AchievementDisplay[]> {
    this.logger.debug('Checking achievements', { sessionId });

    try {
      // Achievement checking logic would go here
      // For now, return empty array
      return [];

    } catch (error) {
      this.logger.error('Failed to check achievements', error);
      throw new AnalyticsError('Achievement check failed', 'ACHIEVEMENT_CHECK_ERROR', error);
    }
  }

  // Analytics data
  async getLearningTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> {
    this.logger.debug('Getting learning trends', { period });

    try {
      const dataPoints = await this.generateTrendData(period);
      const average = this.calculateAverage(dataPoints);
      const peak = this.calculatePeak(dataPoints);
      const improvement = this.calculateImprovement(dataPoints);

      return {
        period,
        dataPoints,
        average,
        peak,
        improvement
      };

    } catch (error) {
      this.logger.error('Failed to get learning trends', error);
      throw new AnalyticsError('Learning trends fetch failed', 'TRENDS_ERROR', error);
    }
  }

  async getStudyStreak(): Promise<StudyStreakDisplay> {
    this.logger.debug('Getting study streak');

    try {
      const sessions = await this.db
        .selectFrom('learning_sessions')
        .select('created_at')
        .orderBy('created_at', 'desc')
        .execute();

      const streakData = this.calculateStudyStreak(sessions);
      return streakData;

    } catch (error) {
      this.logger.error('Failed to get study streak', error);
      throw new AnalyticsError('Study streak fetch failed', 'STREAK_ERROR', error);
    }
  }

  async getTimeStats(): Promise<TimeStatsDisplay> {
    this.logger.debug('Getting time stats');

    try {
      const sessions = await this.db
        .selectFrom('learning_sessions')
        .selectAll()
        .execute();

      const stats = this.calculateTimeStats(sessions);
      return stats;

    } catch (error) {
      this.logger.error('Failed to get time stats', error);
      throw new AnalyticsError('Time stats fetch failed', 'TIME_STATS_ERROR', error);
    }
  }

  // Export/import
  async exportData(format: 'json' | 'csv'): Promise<string> {
    this.logger.debug('Exporting data', { format });

    try {
      const data = await this.getAllUserData();

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(data);
      } else {
        throw new DataValidationError('format', format, 'json or csv');
      }

    } catch (error) {
      this.logger.error('Failed to export data', error);
      throw new AnalyticsError('Data export failed', 'EXPORT_ERROR', error);
    }
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    this.logger.debug('Importing data', { format });

    try {
      if (format === 'json') {
        const parsedData = JSON.parse(data);
        await this.importJSONData(parsedData);
      } else if (format === 'csv') {
        await this.importCSVData(data);
      } else {
        throw new DataValidationError('format', format, 'json or csv');
      }

      this.logger.info('Data imported successfully');

    } catch (error) {
      if (error instanceof DataValidationError) {
        throw error;
      }

      this.logger.error('Failed to import data', error);
      throw new AnalyticsError('Data import failed', 'IMPORT_ERROR', error);
    }
  }

  // Private helper methods
  private getCurrentUserId(): string {
    // In a real implementation, this would get the current user ID
    return 'default-user';
  }

  private async getRecentSessions(limit: number): Promise<any[]> {
    return await this.db
      .selectFrom('learning_sessions')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  private async getConceptProgressData(): Promise<any[]> {
    return await this.db
      .selectFrom('concept_progress')
      .innerJoin('concepts', 'concept_progress.concept_id', 'concepts.id')
      .selectAll()
      .orderBy('concept_progress.updated_at', 'desc')
      .limit(20)
      .execute();
  }

  private async getAchievementsData(): Promise<any[]> {
    return await this.db
      .selectFrom('achievements')
      .selectAll()
      .orderBy('unlocked_at', 'desc')
      .limit(10)
      .execute();
  }

  private async getStudyStreakData(): Promise<StudyStreakDisplay> {
    const sessions = await this.db
      .selectFrom('learning_sessions')
      .select('created_at')
      .orderBy('created_at', 'desc')
      .execute();

    return this.calculateStudyStreak(sessions);
  }

  private async getTimeStatsData(): Promise<TimeStatsDisplay> {
    const sessions = await this.db
      .selectFrom('learning_sessions')
      .selectAll()
      .execute();

    return this.calculateTimeStats(sessions);
  }

  private async getLearningTrendsData(period: 'daily' | 'weekly' | 'monthly'): Promise<LearningTrendDisplay> {
    const dataPoints = await this.generateTrendData(period);
    const average = this.calculateAverage(dataPoints);
    const peak = this.calculatePeak(dataPoints);
    const improvement = this.calculateImprovement(dataPoints);

    return {
      period,
      dataPoints,
      average,
      peak,
      improvement
    };
  }

  private async generateProgressData(params: ProgressChartParams): Promise<any[]> {
    // Implementation would generate actual progress data points
    // For now, return mock data
    return [];
  }

  private async generateTrendData(period: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    // Implementation would generate actual trend data
    // For now, return mock data
    return [];
  }

  private calculateAverage(dataPoints: any[]): number {
    if (dataPoints.length === 0) return 0;
    const sum = dataPoints.reduce((acc, point) => acc + point.value, 0);
    return sum / dataPoints.length;
  }

  private calculatePeak(dataPoints: any[]): number {
    if (dataPoints.length === 0) return 0;
    return Math.max(...dataPoints.map(point => point.value));
  }

  private calculateImprovement(dataPoints: any[]): number {
    if (dataPoints.length < 2) return 0;
    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    return ((last - first) / first) * 100;
  }

  private getChartTitle(params: ProgressChartParams): string {
    return `${params.metric.charAt(0).toUpperCase() + params.metric.slice(1)} Progress`;
  }

  private getChartType(metric: string): 'line' | 'bar' | 'area' {
    switch (metric) {
      case 'mastery':
        return 'area';
      case 'sessions':
        return 'bar';
      case 'time':
        return 'line';
      default:
        return 'line';
    }
  }

  private getUnit(metric: string): string {
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

  private calculateTrend(sessions: any[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 2) return 'stable';

    const recent = sessions.slice(0, Math.min(5, sessions.length));
    const older = sessions.slice(5, Math.min(10, sessions.length));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.length / recent.length;
    const olderAvg = older.length / older.length;

    if (recentAvg > olderAvg * 1.1) return 'improving';
    if (recentAvg < olderAvg * 0.9) return 'declining';
    return 'stable';
  }

  private async getRelatedConcepts(conceptId: string): Promise<string[]> {
    // Implementation would fetch related concepts
    return [];
  }

  private async getPrerequisites(conceptId: string): Promise<string[]> {
    // Implementation would fetch prerequisites
    return [];
  }

  private calculateNextSteps(conceptId: string, masteryLevel: number): string[] {
    // Implementation would calculate next learning steps
    return [];
  }

  private async linkConceptsToSession(sessionId: string, concepts: string[]): Promise<void> {
    for (const conceptId of concepts) {
      await this.db
        .insertInto('session_concepts')
        .values({
          session_id: sessionId,
          concept_id: conceptId
        })
        .onConflict(oc => oc.doNothing())
        .execute();
    }
  }

  private calculateStudyStreak(sessions: any[]): StudyStreakDisplay {
    // Implementation would calculate actual study streak
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: new Date(),
      streakHistory: []
    };
  }

  private calculateTimeStats(sessions: any[]): TimeStatsDisplay {
    // Implementation would calculate actual time statistics
    return {
      totalStudyTime: 0,
      averageSessionTime: 0,
      totalSessions: sessions.length,
      mostProductiveHour: 14,
      studyDaysThisMonth: 0,
      studyDaysThisWeek: 0
    };
  }

  private async getAllUserData(): Promise<any> {
    // Implementation would fetch all user data for export
    return {};
  }

  private convertToCSV(data: any): string {
    // Implementation would convert data to CSV format
    return '';
  }

  private async importJSONData(data: any): Promise<void> {
    // Implementation would import JSON data
  }

  private async importCSVData(data: string): Promise<void> {
    // Implementation would import CSV data
  }

  async dispose(): Promise<void> {
    this.logger.info('Disposing analytics service');
    // Cleanup any resources
  }
}