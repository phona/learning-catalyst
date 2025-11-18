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




/**
 * Analytics Service Interface
 *
 * Defines the contract for analytics functionality in the renderer process
 * Follows dependency injection patterns for testability and modularity
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

export interface SessionInfo {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  conceptsStudied: string[];
  questionsAsked: number;
  accuracyRate?: number;
  sessionType: 'learning' | 'practice' | 'review' | 'assessment';
}

/**
 * Analytics service interface for learning data and metrics
 */
export interface IAnalyticsService {
  /**
   * Get all achievements with progress and unlock status
   */
  getAchievements(): Promise<Achievement[]>;

  /**
   * Get current study metrics and statistics
   */
  getStudyMetrics(): Promise<StudyMetrics>;

  /**
   * Get learning trends over a specific period
   */
  getLearningTrends(period?: number): Promise<LearningTrends>;

  /**
   * Get recent learning sessions
   */
  getRecentSessions(limit?: number): Promise<SessionInfo[]>;

  /**
   * Get detailed session information by ID
   */
  getSession(sessionId: string): Promise<SessionInfo | null>;

  /**
   * Track a learning event (e.g., concept studied, question answered)
   */
  trackEvent(event: {
    type: string;
    data: Record<string, any>;
    timestamp?: Date;
  }): Promise<void>;

  /**
   * Update achievement progress
   */
  updateAchievementProgress(achievementId: string, progress: number): Promise<void>;

  /**
   * Get learning insights and recommendations
   */
  getLearningInsights(): Promise<{
    strengths: string[];
    improvementAreas: string[];
    recommendations: string[];
    nextMilestone?: string;
  }>;
}