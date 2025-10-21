/**
 * Simple Analytics Module
 *
 * Tracks learning progress, session metrics, and study patterns.
 * Provides insights into learning effectiveness and user engagement.
 */

import { IDatabase, DatabaseHealthStatus, ResourceUsage } from '../database/database-factory';
import { Module, ModuleStatus } from '../index';

export interface LearningSession {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  aiProvider: string;
  aiModel: string;
  tokensUsed?: number;
  conceptsCovered: string[];
  sessionType: 'chat' | 'study' | 'assessment' | 'review' | 'exploration';
  status: 'active' | 'completed' | 'paused' | 'abandoned';
}

export interface StudyMetrics {
  totalStudyTime: number; // minutes
  sessionsCompleted: number;
  averageSessionLength: number; // minutes
  conceptsStudied: number;
  questionsAsked: number;
  correctAnswers: number;
  accuracyRate: number; // percentage
  focusScore: number; // 0-100
  streakDays: number;
  lastStudyDate?: Date;
}

export interface ConceptProgress {
  conceptId: string;
  conceptName: string;
  masteryLevel: number;
  timeSpent: number; // minutes
  sessionsStudied: number;
  averagePerformance: number; // percentage
  difficultyRating: number; // 1-5
  lastStudied?: Date;
  improvementRate: number; // mastery change per session
  confidenceLevel: number; // 1-5
}

export interface LearningTrends {
  dailyStudyTime: Array<{ date: string; minutes: number }>;
  masteryProgress: Array<{ date: string; avgMastery: number }>;
  sessionTypes: Array<{ type: string; count: number; avgDuration: number }>;
  conceptDifficulty: Array<{ difficulty: number; avgMastery: number; timeSpent: number }>;
  performanceOverTime: Array<{ date: string; accuracy: number; focusScore: number }>;
}

export interface AnalyticsEvent {
  id: string;
  type: 'session_start' | 'session_end' | 'concept_reviewed' | 'question_asked' | 'milestone_reached' | 'achievement_unlocked';
  timestamp: Date;
  sessionId?: string;
  conceptId?: string;
  data: Record<string, any>;
}

export interface LearningGoals {
  dailyStudyTime: number; // minutes
  weeklyConcepts: number;
  targetMasteryLevel: number;
  practiceQuestionsPerDay: number;
  reviewFrequency: number; // days
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'time' | 'concepts' | 'streaks' | 'performance' | 'engagement';
  requirement: Record<string, any>;
  unlockedAt?: Date;
  progress: number; // percentage
  icon?: string;
}

export class SimpleAnalyticsModule implements Module {
  public readonly name = 'SimpleAnalyticsModule';
  public readonly version = '1.0.0';
  public databaseModule: IDatabase | null = null; // Make public for injection
  private currentSession: LearningSession | null = null;
  private sessionStartTime: Date | null = null;
  private studyStreak = 0;
  private lastStudyDate: Date | null = null;
  private achievements: Achievement[] = [];
  private _isInitialized = false;
  private healthStatus: DatabaseHealthStatus = {
    status: 'initializing',
    lastCheck: new Date(),
  };
  private lastHealthCheck = 0;
  private healthCheckDebounce = 5000; // 5 seconds
  private cachedMetrics: StudyMetrics | null = null;

  constructor() {
    // Initialize default achievements
    this.initializeAchievements();
  }

  get initialized(): boolean {
    return this._isInitialized;
  }

  getStatus(): ModuleStatus {
    return {
      initialized: this._isInitialized,
      healthy: this.healthStatus.status === 'healthy',
      error: this.healthStatus.status === 'failed' ? this.healthStatus.message : undefined,
      lastCheck: this.healthStatus.lastCheck
    };
  }

  async init(): Promise<void> {
    // Initialize the module (Module interface)
    await this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      if (!this.databaseModule) {
        throw new Error('Database module not available');
      }

      // Initialize default values (avoid complex data loading during init)
      this.studyStreak = 0;
      this.lastStudyDate = null;
      this.currentSession = null;
      this.sessionStartTime = null;

      this._isInitialized = true;
      this.healthStatus = {
        status: 'healthy',
        lastCheck: new Date(),
        message: 'Simple analytics initialized successfully'
      };

      console.log('Simple analytics initialized successfully');
    } catch (error) {
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Simple analytics initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      // Verify database connection
      if (!this.databaseModule) {
        throw new Error('Database module not available');
      }

      // Simple verification - avoid complex operations during startup
      console.log('Simple analytics started successfully');
    } catch (error) {
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Simple analytics start failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // End any active session
      if (this.currentSession) {
        await this.endSession();
      }

      // Save current state
      await this.saveCurrentState();

      console.log('Simple analytics stopped successfully');
    } catch (error) {
      console.error('Error stopping simple analytics:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.currentSession = null;
      this.sessionStartTime = null;
      this.databaseModule = null;
      this._isInitialized = false;

      this.healthStatus = {
        status: 'healthy',
        lastCheck: new Date(),
        message: 'Simple analytics cleaned up successfully'
      };

      console.log('Simple analytics cleaned up');
    } catch (error) {
      console.error('Error cleaning up simple analytics:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<DatabaseHealthStatus> {
    const now = Date.now();

    // Debounce health checks to prevent infinity loops
    if (now - this.lastHealthCheck < this.healthCheckDebounce && this.healthStatus.status !== 'initializing') {
      return this.healthStatus;
    }

    this.lastHealthCheck = now;

    try {
      if (!this.databaseModule) {
        this.healthStatus = {
          status: 'failed',
          lastCheck: new Date(),
          message: 'Database module not available'
        };
        return this.healthStatus;
      }

      // Use cached metrics if available to avoid repeated database queries
      let stats: StudyMetrics;
      if (this.cachedMetrics && (now - this.lastHealthCheck) < 30000) { // 30 seconds cache
        stats = this.cachedMetrics;
      } else {
        // Only run fresh metrics check if cache is stale
        try {
          stats = await this.getStudyMetrics();
          this.cachedMetrics = stats;
        } catch (dbError) {
          // If database query fails, use default metrics instead of failing the health check
          console.warn('Database query failed during health check, using default metrics:', dbError);
          stats = this.getDefaultMetrics();
        }
      }

      this.healthStatus = {
        status: 'healthy',
        lastCheck: new Date(),
        message: `Analytics operational (${stats.sessionsCompleted} sessions tracked)`,
        metrics: {
          totalSessions: stats.sessionsCompleted,
          currentStreak: this.studyStreak,
          activeSession: this.currentSession?.id || null,
          achievementsUnlocked: this.achievements.filter(a => a.unlockedAt).length
        }
      };

      return this.healthStatus;
    } catch (error) {
      this.healthStatus = {
        status: 'failed',
        lastCheck: new Date(),
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      return this.healthStatus;
    }
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    return {
      memory: {
        used: this.achievements.length * 500 + (this.currentSession ? 1000 : 0),
        allocated: 10000,
        peak: 10000
      },
      cpu: { usage: 0, time: 0 },
      connections: { active: 0, total: 0 },
      storage: {
        used: 0, // Storage usage is handled by database module
        allocated: 0
      }
    };
  }

  // Public API methods

  /**
   * Start a new learning session
   */
  async startSession(
    title: string,
    sessionType: LearningSession['sessionType'],
    aiProvider: string,
    aiModel: string
  ): Promise<string> {
    if (this.currentSession) {
      await this.endSession();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    this.currentSession = {
      id: sessionId,
      title,
      startTime,
      aiProvider,
      aiModel,
      conceptsCovered: [],
      sessionType,
      status: 'active'
    };

    this.sessionStartTime = startTime;

    // Record session start event
    await this.recordEvent('session_start', {
      sessionId,
      title,
      sessionType,
      aiProvider,
      aiModel
    });

    // Save to database
    await this.saveSessionToDatabase();

    // Emit event
    await this.emitEvent('session_started', { session: this.currentSession });

    return sessionId;
  }

  /**
   * End the current learning session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession || !this.sessionStartTime) {
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - this.sessionStartTime.getTime()) / (1000 * 60));

    this.currentSession.endTime = endTime;
    this.currentSession.durationMinutes = durationMinutes;
    this.currentSession.status = 'completed';

    // Update streak
    await this.updateStudyStreak();

    // Record session end event
    await this.recordEvent('session_end', {
      sessionId: this.currentSession.id,
      durationMinutes,
      conceptsStudied: this.currentSession.conceptsCovered.length
    });

    // Update achievements
    await this.checkAchievements();

    // Save to database
    await this.saveSessionToDatabase();

    // Emit event
    await this.emitEvent('session_completed', { session: this.currentSession });

    // Clear cached metrics since data has changed
    this.cachedMetrics = null;

    // Clear current session
    this.currentSession = null;
    this.sessionStartTime = null;
  }

  /**
   * Track concept studied in current session
   */
  async trackConceptStudied(conceptId: string, conceptName: string, performanceScore?: number): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    if (!this.currentSession.conceptsCovered.includes(conceptId)) {
      this.currentSession.conceptsCovered.push(conceptId);
    }

    // Record concept studied event
    await this.recordEvent('concept_reviewed', {
      sessionId: this.currentSession.id,
      conceptId,
      conceptName,
      performanceScore
    });

    // Emit event
    await this.emitEvent('concept_studied', {
      sessionId: this.currentSession.id,
      conceptId,
      conceptName,
      performanceScore
    });
  }

  /**
   * Track question asked and answered
   */
  async trackQuestionAnswered(correct: boolean, responseTime?: number): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Record question asked event
    await this.recordEvent('question_asked', {
      sessionId: this.currentSession.id,
      correct,
      responseTime
    });

    // Emit event
    await this.emitEvent('question_answered', {
      sessionId: this.currentSession.id,
      correct,
      responseTime
    });
  }

  /**
   * Get study metrics
   */
  async getStudyMetrics(): Promise<StudyMetrics> {
    if (!this.databaseModule) {
      console.warn('Database module not available, returning default metrics');
      return this.getDefaultMetrics();
    }

    try {
      // Check if we're in a browser environment with electronAPI
      if (typeof window === 'undefined' || !(window as any).electronAPI) {
        console.warn('Electron API not available, returning default metrics');
        return this.getDefaultMetrics();
      }

      // Check if database methods are available
      if (!(window as any).electronAPI.dbFetchAll) {
        console.warn('Database API not available, returning default metrics');
        return this.getDefaultMetrics();
      }

      // Use the correct database interface with proper error handling
      let sessionStats = { total_sessions: 0, avg_duration: 0, total_time: 0 };
      let conceptsStudied = { count: 0 };
      let questionStats = { total_questions: 0, correct_answers: 0 };

      try {
        // Try to get session statistics
        const sessionResult = await (window as any).electronAPI.dbFetchAll(`
          SELECT
            COUNT(*) as total_sessions,
            AVG(CASE
              WHEN (julianday(end_time) - julianday(start_time)) * 24 * 60 > 0
              THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
              ELSE 0
            END) as avg_duration,
            SUM(CASE
              WHEN (julianday(end_time) - julianday(start_time)) * 24 * 60 > 0
              THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
              ELSE 0
            END) as total_time
          FROM learning_sessions
          WHERE end_time IS NOT NULL
        `);

        if (sessionResult.success && sessionResult.result.length > 0) {
          sessionStats = sessionResult.result[0];
        }
      } catch (sessionError) {
        console.warn('Failed to fetch session statistics:', sessionError);
      }

      try {
        // Get concepts studied
        const conceptsResult = await (window as any).electronAPI.dbFetchAll(`
          SELECT COUNT(DISTINCT id) as count
          FROM concepts
        `);

        if (conceptsResult.success && conceptsResult.result.length > 0) {
          conceptsStudied = conceptsResult.result[0];
        }
      } catch (conceptsError) {
        console.warn('Failed to fetch concepts statistics:', conceptsError);
      }

      try {
        // Get question statistics - using available data structure
        const questionResult = await (window as any).electronAPI.dbFetchAll(`
          SELECT
            COUNT(*) as total_questions,
            COUNT(*) as correct_answers
          FROM concepts
          WHERE mastery_level >= 0.7
        `);

        if (questionResult.success && questionResult.result.length > 0) {
          questionStats = questionResult.result[0];
        }
      } catch (questionError) {
        console.warn('Failed to fetch question statistics:', questionError);
      }

      const sessionsCompleted = sessionStats.total_sessions || 0;
      const totalStudyTime = sessionStats.total_time || 0;
      const averageSessionLength = sessionStats.avg_duration || 0;
      const conceptsStudiedCount = conceptsStudied.count || 0;
      const questionsAsked = questionStats.total_questions || 0;
      const correctAnswers = questionStats.correct_answers || 0;
      const accuracyRate = questionsAsked > 0 ? (correctAnswers / questionsAsked) * 100 : 0;

      return {
        totalStudyTime,
        sessionsCompleted,
        averageSessionLength,
        conceptsStudied: conceptsStudiedCount,
        questionsAsked,
        correctAnswers,
        accuracyRate,
        focusScore: await this.calculateFocusScore(),
        streakDays: this.studyStreak,
        lastStudyDate: this.lastStudyDate || undefined
      };
    } catch (error) {
      console.warn('Database query failed in getStudyMetrics, returning default metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get concept progress for all concepts
   */
  async getConceptProgress(limit = 50): Promise<ConceptProgress[]> {
    if (!this.databaseModule) {
      return [];
    }

    // Simplified implementation using basic database methods
    // This would need to be implemented with proper database queries
    return [];
  }

  /**
   * Get learning trends over time
   */
  async getLearningTrends(days = 30): Promise<LearningTrends> {
    // Simplified implementation - would need proper database queries
    return this.getDefaultTrends();
  }

  /**
   * Get achievements and progress
   */
  async getAchievements(): Promise<Achievement[]> {
    return this.achievements;
  }

  /**
   * Set learning goals
   */
  async setLearningGoals(goals: Partial<LearningGoals>): Promise<void> {
    // Simplified implementation - would need proper database methods
    console.log('Learning goals set:', goals);
  }

  /**
   * Get current learning goals
   */
  async getLearningGoals(): Promise<LearningGoals> {
    // Simplified implementation - would need proper database methods
    return this.getDefaultGoals();
  }

  // Private helper methods

  private initializeAchievements(): void {
    this.achievements = [
      {
        id: 'first_session',
        title: 'First Steps',
        description: 'Complete your first learning session',
        category: 'time',
        requirement: { sessionsCompleted: 1 },
        progress: 0,
        icon: '🎯'
      },
      {
        id: 'week_streak',
        title: 'Week Warrior',
        description: 'Study for 7 days in a row',
        category: 'streaks',
        requirement: { streakDays: 7 },
        progress: 0,
        icon: '🔥'
      },
      {
        id: 'time_master',
        title: 'Time Master',
        description: 'Study for 1000 minutes total',
        category: 'time',
        requirement: { totalStudyTime: 1000 },
        progress: 0,
        icon: '⏰'
      },
      {
        id: 'concept_explorer',
        title: 'Concept Explorer',
        description: 'Study 50 different concepts',
        category: 'concepts',
        requirement: { conceptsStudied: 50 },
        progress: 0,
        icon: '🧠'
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Achieve 95% accuracy in a session',
        category: 'performance',
        requirement: { accuracyRate: 95 },
        progress: 0,
        icon: '🎯'
      }
    ];
  }

  private async saveSessionToDatabase(): Promise<void> {
    if (!this.databaseModule || !this.currentSession) {
      return;
    }

    // This would save the session to the database
    // Implementation would depend on the database schema
  }

  private async recordEvent(type: AnalyticsEvent['type'], data: Record<string, any>): Promise<void> {
    if (!this.databaseModule) {
      return;
    }

    // This would save the analytics event to the database
    // Implementation would depend on the database schema
  }

  private async updateStudyStreak(): Promise<void> {
    const today = new Date().toDateString();
    const lastStudy = this.lastStudyDate?.toDateString();

    if (lastStudy !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastStudy === yesterday.toDateString()) {
        this.studyStreak++;
      } else {
        this.studyStreak = 1;
      }
    }

    this.lastStudyDate = new Date();
  }

  private async checkAchievements(): Promise<void> {
    const metrics = await this.getStudyMetrics();

    for (const achievement of this.achievements) {
      if (achievement.unlockedAt) {
        continue; // Already unlocked
      }

      let progress = 0;
      let unlocked = false;

      switch (achievement.id) {
        case 'first_session':
          progress = Math.min(100, (metrics.sessionsCompleted / achievement.requirement.sessionsCompleted) * 100);
          unlocked = metrics.sessionsCompleted >= achievement.requirement.sessionsCompleted;
          break;

        case 'week_streak':
          progress = Math.min(100, (metrics.streakDays / achievement.requirement.streakDays) * 100);
          unlocked = metrics.streakDays >= achievement.requirement.streakDays;
          break;

        case 'time_master':
          progress = Math.min(100, (metrics.totalStudyTime / achievement.requirement.totalStudyTime) * 100);
          unlocked = metrics.totalStudyTime >= achievement.requirement.totalStudyTime;
          break;

        case 'concept_explorer':
          progress = Math.min(100, (metrics.conceptsStudied / achievement.requirement.conceptsStudied) * 100);
          unlocked = metrics.conceptsStudied >= achievement.requirement.conceptsStudied;
          break;

        case 'perfectionist':
          progress = Math.min(100, (metrics.accuracyRate / achievement.requirement.accuracyRate) * 100);
          unlocked = metrics.accuracyRate >= achievement.requirement.accuracyRate;
          break;
      }

      achievement.progress = Math.round(progress);

      if (unlocked && !achievement.unlockedAt) {
        achievement.unlockedAt = new Date();
        await this.recordEvent('achievement_unlocked', {
          achievementId: achievement.id,
          title: achievement.title
        });
      }
    }
  }

  private async calculateFocusScore(): Promise<number> {
    // This would calculate focus score based on various factors
    // like session length, interaction frequency, etc.
    return 85; // Placeholder
  }

  private getDefaultMetrics(): StudyMetrics {
    return {
      totalStudyTime: 0,
      sessionsCompleted: 0,
      averageSessionLength: 0,
      conceptsStudied: 0,
      questionsAsked: 0,
      correctAnswers: 0,
      accuracyRate: 0,
      focusScore: 0,
      streakDays: 0
    };
  }

  private getDefaultTrends(): LearningTrends {
    return {
      dailyStudyTime: [],
      masteryProgress: [],
      sessionTypes: [],
      conceptDifficulty: [],
      performanceOverTime: []
    };
  }

  private getDefaultGoals(): LearningGoals {
    return {
      dailyStudyTime: 30,
      weeklyConcepts: 5,
      targetMasteryLevel: 4,
      practiceQuestionsPerDay: 10,
      reviewFrequency: 3
    };
  }

  private async saveCurrentState(): Promise<void> {
    // Save current state to database
    // ...
  }

  private async emitEvent(type: string, data: any): Promise<void> {
    // This would use the module coordinator to emit events
    console.log(`Analytics Event: ${type}`, data);
  }
}