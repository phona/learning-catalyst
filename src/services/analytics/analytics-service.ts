/**
 * Mock Analytics Service
 *
 * A mock implementation of the AnalyticsService for integration testing.
 * This simulates analytics operations including learning metrics,
 * progress tracking, and statistical analysis.
 */

import { vi } from 'vitest';

export class AnalyticsService {
  constructor() {
    // Initialize mock analytics service
  }

  async getOverallStatistics(): Promise<any> {
    // Get total sessions count
    let totalSessions = 0;
    if (window.electronAPI?.dbFetchOne) {
      const result = await window.electronAPI.dbFetchOne(
        'SELECT COUNT(*) as count FROM sessions',
        []
      );

      if (result.success) {
        totalSessions = result.result.count;
      }
    }

    return {
      totalSessions,
      totalStudyTime: totalSessions * 30, // Mock: 30 min average per session
      conceptsStudied: Math.floor(totalSessions * 1.5), // Mock: 1.5 concepts per session
      averageSessionLength: 30,
      streakDays: Math.floor(Math.random() * 7) + 1,
      lastStudyDate: new Date()
    };
  }

  async getLearningTrends(params: {
    startDate: string;
    endDate: string;
  }): Promise<any[]> {
    // Get learning trends for date range
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        expect.stringContaining('SELECT DATE'),
        expect.any(Array)
      );

      if (result.success) {
        return result.result.map((row: any) => ({
          date: row.date,
          studyTime: row.study_time || 0,
          conceptsStudied: row.concepts_studied || 0,
          sessionsCount: row.sessions_count || 0
        }));
      }
    }

    // Return mock data if no database access
    return [
      {
        date: '2024-01-15',
        studyTime: 120,
        conceptsStudied: 3,
        sessionsCount: 2
      },
      {
        date: '2024-01-14',
        studyTime: 90,
        conceptsStudied: 2,
        sessionsCount: 1
      }
    ];
  }

  async getSessionAnalytics(sessionId: string): Promise<any> {
    // Get analytics for specific session
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        'SELECT * FROM analytics WHERE session_id = ?',
        [sessionId]
      );

      if (result.success) {
        const analytics = result.result;
        return {
          sessionId,
          totalTokensUsed: analytics.reduce((sum: number, a: any) => sum + a.tokens_used, 0),
          averageResponseTime: analytics.reduce((sum: number, a: any) => sum + a.response_time, 0) / analytics.length,
          modelUsage: this.calculateModelUsage(analytics),
          messageCount: analytics.length,
          timeSpan: analytics.length > 0 ? {
            start: Math.min(...analytics.map((a: any) => a.timestamp)),
            end: Math.max(...analytics.map((a: any) => a.timestamp))
          } : null
        };
      }
    }

    // Return mock analytics
    return {
      sessionId,
      totalTokensUsed: 350,
      averageResponseTime: 2800,
      modelUsage: {
        'gpt-3.5-turbo': 200,
        'gpt-4': 150
      },
      messageCount: 8,
      timeSpan: {
        start: Date.now() - 3600000,
        end: Date.now()
      }
    };
  }

  async recordSessionAnalytics(sessionId: string, analytics: {
    tokensUsed: number;
    responseTime: number;
    modelUsed: string;
    messageId?: string;
  }): Promise<void> {
    // Record analytics data for a session
    if (window.electronAPI?.dbExecuteQuery) {
      await window.electronAPI.dbExecuteQuery(
        'INSERT INTO analytics (session_id, tokens_used, response_time, model_used, message_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          sessionId,
          analytics.tokensUsed,
          analytics.responseTime,
          analytics.modelUsed,
          analytics.messageId || null,
          Date.now()
        ]
      );
    }
  }

  async getConceptMastery(conceptId: string): Promise<any> {
    // Get mastery data for a specific concept
    if (window.electronAPI?.dbFetchOne) {
      const result = await window.electronAPI.dbFetchOne(
        'SELECT * FROM concept_progress WHERE concept_id = ?',
        [conceptId]
      );

      if (result.success && result.result) {
        const progress = result.result;
        return {
          conceptId,
          masteryLevel: progress.mastery_level,
          timeSpent: progress.time_spent,
          sessionsStudied: progress.sessions_studied,
          averagePerformance: progress.average_performance,
          improvementRate: progress.improvement_rate,
          confidenceLevel: progress.confidence_level,
          lastStudied: new Date(progress.last_studied)
        };
      }
    }

    // Return mock mastery data
    return {
      conceptId,
      masteryLevel: 0.7,
      timeSpent: 120, // minutes
      sessionsStudied: 5,
      averagePerformance: 0.85,
      improvementRate: 0.05,
      confidenceLevel: 4,
      lastStudied: new Date(Date.now() - 86400000) // yesterday
    };
  }

  async updateConceptMastery(conceptId: string, updateData: {
    sessionTime: number;
    performance: number;
    newMasteryLevel?: number;
  }): Promise<void> {
    // Update concept mastery data
    const currentMastery = await this.getConceptMastery(conceptId);

    const newSessionsStudied = currentMastery.sessionsStudied + 1;
    const newTimeSpent = currentMastery.timeSpent + updateData.sessionTime;
    const newAveragePerformance = (
      (currentMastery.averagePerformance * currentMastery.sessionsStudied + updateData.performance) /
      newSessionsStudied
    );
    const newMasteryLevel = updateData.newMasteryLevel || currentMastery.masteryLevel;
    const improvementRate = (newMasteryLevel - currentMastery.masteryLevel) / newSessionsStudied;

    if (window.electronAPI?.dbExecuteQuery) {
      await window.electronAPI.dbExecuteQuery(
        'UPDATE concept_progress SET mastery_level = ?, time_spent = ?, sessions_studied = ?, average_performance = ?, improvement_rate = ?, last_studied = ? WHERE concept_id = ?',
        [
          newMasteryLevel,
          newTimeSpent,
          newSessionsStudied,
          newAveragePerformance,
          improvementRate,
          new Date().toISOString(),
          conceptId
        ]
      );
    }
  }

  async getTopConcepts(limit: number = 10): Promise<any[]> {
    // Get most studied concepts
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        'SELECT c.*, cp.time_spent, cp.sessions_studied FROM concepts c LEFT JOIN concept_progress cp ON c.id = cp.concept_id ORDER BY cp.time_spent DESC LIMIT ?',
        [limit]
      );

      if (result.success) {
        return result.result.map((concept: any) => ({
          id: concept.id,
          name: concept.name,
          description: concept.description,
          timeSpent: concept.time_spent || 0,
          sessionsStudied: concept.sessions_studied || 0,
          masteryLevel: concept.mastery_level || 0,
          metadata: JSON.parse(concept.metadata || '{}')
        }));
      }
    }

    // Return mock data
    return [
      {
        id: 'concept_1',
        name: 'React Hooks',
        description: 'React hooks functionality',
        timeSpent: 180,
        sessionsStudied: 8,
        masteryLevel: 0.8,
        metadata: { category: 'frontend' }
      },
      {
        id: 'concept_2',
        name: 'TypeScript',
        description: 'TypeScript programming language',
        timeSpent: 150,
        sessionsStudied: 6,
        masteryLevel: 0.7,
        metadata: { category: 'language' }
      }
    ];
  }

  async getStudyStreak(): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakHistory: any[];
  }> {
    // Calculate study streaks
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        'SELECT DISTINCT DATE(created_at) as study_date FROM sessions ORDER BY study_date DESC',
        []
      );

      if (result.success) {
        const dates = result.result.map((row: any) => new Date(row.study_date));
        return this.calculateStreaks(dates);
      }
    }

    // Return mock streak data
    return {
      currentStreak: 5,
      longestStreak: 12,
      streakHistory: [
        { date: '2024-01-15', studied: true },
        { date: '2024-01-14', studied: true },
        { date: '2024-01-13', studied: true },
        { date: '2024-01-12', studied: true },
        { date: '2024-01-11', studied: true }
      ]
    };
  }

  // Private helper methods
  private calculateModelUsage(analytics: any[]): Record<string, number> {
    return analytics.reduce((usage: Record<string, number>, entry: any) => {
      usage[entry.model_used] = (usage[entry.model_used] || 0) + entry.tokens_used;
      return usage;
    }, {});
  }

  private calculateStreaks(dates: Date[]): {
    currentStreak: number;
    longestStreak: number;
    streakHistory: any[];
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const streakHistory = dates.map(date => {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === currentStreak) {
        currentStreak++;
      }

      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      return {
        date: dateOnly.toISOString().split('T')[0],
        studied: true
      };
    });

    return {
      currentStreak,
      longestStreak,
      streakHistory
    };
  }

  // Test helper methods
  _resetAnalytics(): void {
    // Reset any internal state for testing
  }
}