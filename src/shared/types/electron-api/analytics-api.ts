/**
 * Analytics & Progress API
 *
 * Enhanced API with comprehensive error handling and type safety.
 * Provides learning analytics and progress tracking with proper IPC communication.
 */

import type { APIResponse } from './index';
import type {
  DashboardDisplay as DashboardDisplayResp,
  SessionDisplay,
  ConceptProgressDisplay,
  AchievementDisplay as AchievementDisplayResp,
  LearningTrendDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay,
  CreateLearningSessionRequest,
  ConceptProgressUpdate
} from '@/shared/interfaces/analytics.interface';

export interface AnalyticsAPI {
  /**
   * Gets comprehensive learning dashboard data
   * Returns all key metrics needed for dashboard display
   * @returns Promise<APIResponse<DashboardDisplay>> - Complete dashboard data with error handling
   */
  getDashboard: () => Promise<APIResponse<DashboardDisplayResp>>;

  /**
   * Gets progress chart data for visualization
   * Returns structured data for various chart types
   * @param params - Chart parameters with enhanced type safety
   * @returns Promise<APIResponse<ProgressChartDisplay>> - Chart-ready progress data
   */
  getProgressChart: (params: ProgressChartRequest) => Promise<APIResponse<ProgressChartDisplay>>;

  /**
   * Gets all user achievements and milestones
   * Returns achievements with completion status and metadata
   * @returns Promise<APIResponse<AchievementDisplay[]>> - Array of achievements
   */
  getAchievements: () => Promise<APIResponse<AchievementDisplay[]>>;

  /**
   * Unlocks an achievement and handles rewards
   * Called when user meets achievement criteria
   * @param achievementId - ID of the achievement to unlock
   * @returns Promise<APIResponse<AchievementReward>> - Achievement unlock result
   */
  unlockAchievement: (achievementId: string) => Promise<APIResponse<AchievementReward>>;

  /**
   * Gets detailed usage statistics
   * Provides insights into learning patterns and habits
   * @param params - Statistics request parameters
   * @returns Promise<APIResponse<UsageStatsDisplay>> - Detailed usage analytics
   */
  getUsageStats: (params: UsageStatsRequest) => Promise<APIResponse<UsageStatsDisplay>>;

  /**
   * Gets token usage and cost information
   * Important for monitoring API usage and costs
   * @param params - Token usage request parameters
   * @returns Promise<APIResponse<TokenUsageDisplay>> - Token usage breakdown
   */
  getTokenUsage: (params: TokenUsageRequest) => Promise<APIResponse<TokenUsageDisplay>>;

  /**
   * Tracks a learning session
   * Creates or updates a learning session record
   * @param session - Session data to track
   * @returns Promise<APIResponse<string>> - Session ID
   */
  trackSession: (session: CreateLearningSessionRequest) => Promise<APIResponse<string>>;

  /**
   * Updates concept progress
   * Records progress updates for specific concepts
   * @param conceptId - ID of the concept
   * @param update - Progress update data
   * @returns Promise<APIResponse<void>> - Update confirmation
   */
  updateConceptProgress: (
    conceptId: string,
    update: ConceptProgressUpdate
  ) => Promise<APIResponse<void>>;

  /**
   * Gets concept progress details
   * Returns detailed progress information for a specific concept
   * @param conceptId - ID of the concept
   * @returns Promise<APIResponse<ConceptProgressDisplay>> - Concept progress data
   */
  getConceptProgress: (conceptId: string) => Promise<APIResponse<ConceptProgressDisplay>>;

  /**
   * Gets session history
   * Returns paginated list of learning sessions
   * @param params - Session history request parameters
   * @returns Promise<APIResponse<SessionDisplay[]>> - Session list
   */
  getSessionHistory: (params?: SessionHistoryRequest) => Promise<APIResponse<SessionDisplay[]>>;

  /**
   * Checks for new achievements
   * Evaluates and returns any newly unlocked achievements
   * @param sessionId - Optional session ID to check achievements for
   * @returns Promise<APIResponse<AchievementDisplay[]>> - New achievements
   */
  checkAchievements: (sessionId?: string) => Promise<APIResponse<AchievementDisplayResp[]>>;

  /**
   * Gets learning trends data
   * Returns learning trend analysis for specified periods
   * @param params - Trends request parameters
   * @returns Promise<APIResponse<LearningTrendDisplay>> - Trends data
   */
  getLearningTrends: (params: LearningTrendsRequest) => Promise<APIResponse<LearningTrendDisplay>>;

  /**
   * Gets study streak information
   * Returns current and historical study streak data
   * @returns Promise<APIResponse<StudyStreakDisplay>> - Streak information
   */
  getStudyStreak: () => Promise<APIResponse<StudyStreakDisplay>>;

  /**
   * Gets time statistics
   * Returns detailed time-based learning statistics
   * @param params - Time stats request parameters
   * @returns Promise<APIResponse<TimeStatsDisplay>> - Time statistics
   */
  getTimeStats: (params?: TimeStatsRequest) => Promise<APIResponse<TimeStatsDisplay>>;

  /**
   * Exports analytics data
   * Exports user analytics data in specified format
   * @param params - Export request parameters
   * @returns Promise<APIResponse<string>> - Exported data
   */
  exportData: (params: ExportDataRequest) => Promise<APIResponse<string>>;

  /**
   * Imports analytics data
   * Imports analytics data from specified format
   * @param params - Import request parameters
   * @returns Promise<APIResponse<ImportResult>> - Import result
   */
  importData: (params: ImportDataRequest) => Promise<APIResponse<ImportResult>>;
}

// ============================================================================
// Enhanced Request/Response Types
// ============================================================================

export interface ProgressChartRequest {
  timeRange: '7days' | '30days' | '90days' | '1year';
  topic?: string | null;
  metric: 'mastery' | 'sessions' | 'time' | 'concepts';
  conceptIds?: string[];
  includeGoal?: boolean;
}

export interface UsageStatsRequest {
  timeRange: '7days' | '30days' | '90days' | '1year';
  includePatterns?: boolean;
  includeEngagement?: boolean;
  detailed?: boolean;
}

export interface TokenUsageRequest {
  timeRange: '7days' | '30days' | '90days' | '1year';
  includeByProvider?: boolean;
  includeByFeature?: boolean;
  includeProjections?: boolean;
}

export interface SessionHistoryRequest {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'duration' | 'masteryLevel';
  sortOrder?: 'asc' | 'desc';
  conceptIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface LearningTrendsRequest {
  period: 'daily' | 'weekly' | 'monthly';
  metric: 'mastery' | 'sessions' | 'time' | 'concepts';
  conceptIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface TimeStatsRequest {
  period?: 'week' | 'month' | 'quarter' | 'year';
  includeBreakdown?: boolean;
  includeComparisons?: boolean;
}

export interface ExportDataRequest {
  format: 'json' | 'csv';
  dateRange?: {
    start: string;
    end: string;
  };
  includeSensitive?: boolean;
  compress?: boolean;
}

export interface ImportDataRequest {
  data: string;
  format: 'json' | 'csv';
  overwrite?: boolean;
  validateOnly?: boolean;
}

export interface ImportResult {
  recordsProcessed: number;
  recordsImported: number;
  recordsSkipped: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  record: number;
  field: string;
  message: string;
  value: any;
}

export interface ImportWarning {
  record: number;
  field: string;
  message: string;
  value: any;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Complete dashboard data for display
 */
export interface DashboardDisplay {
  overview: {
    totalSessions: number;
    totalLearningTime: string;
    currentStreak: number;
    longestStreak: number;
    conceptsLearned: number;
    averageSessionDuration: string;
    weeklyGoal: {
      target: number;
      completed: number;
      percentage: number;
    };
  };
  recentActivity: RecentActivity[];
  upcomingGoals: string[];
  weeklyProgress: {
    days: Array<{
      day: string;
      sessions: number;
      minutes: number;
      goal: number;
    }>;
    total: {
      sessions: number;
      minutes: number;
      goal: number;
      percentage: number;
    };
  };
  topTopics: Array<{
    topic: string;
    sessions: number;
    time: string;
    progress: number;
  }>;
  quickStats: {
    accuracy: number;
    engagement: number;
    consistency: number;
    improvement: number;
  };
}

/**
 * Recent activity item
 */
export interface RecentActivity {
  type: 'session' | 'achievement' | 'milestone' | 'goal_completed';
  title: string;
  description: string;
  time: string; // Relative time
  icon: string;
  color: string;
  metadata?: Record<string, any>;
}

/**
 * Progress chart data for visualization
 */
export interface ProgressChartDisplay {
  timeRange: string;
  topic: string;
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  data: ProgressDataPoint[];
  summary: {
    totalSessions: number;
    totalMinutes: number;
    totalConcepts: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    averagePerDay: number;
    bestDay: string;
  };
  insights: string[];
}

/**
 * Individual progress data point
 */
export interface ProgressDataPoint {
  date: string;
  sessions: number;
  minutes: number;
  concepts: number;
  accuracy?: number;
  engagement?: number;
}

/**
 * Achievement display with full metadata
 */
export interface AchievementDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'skill' | 'time' | 'streak' | 'social' | 'exploration';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  rewards: AchievementReward[];
  requirements: string[];
  tips?: string[];
  relatedAchievements: string[];
}

/**
 * Achievement reward information
 */
export interface AchievementReward {
  type: 'badge' | 'points' | 'title' | 'feature' | 'customization';
  value: string | number;
  description: string;
  icon?: string;
}

/**
 * Detailed usage statistics
 */
export interface UsageStatsDisplay {
  timeRange: string;
  sessions: {
    total: number;
    averagePerDay: number;
    averageDuration: string;
    completionRate: number;
    mostProductiveTime: string;
    mostProductiveDay: string;
  };
  learning: {
    conceptsLearned: number;
    skillsImproved: string[];
    topicsExplored: number;
    exercisesCompleted: number;
    accuracy: number;
  };
  engagement: {
    activeDays: number;
    consistencyStreak: number;
    averageSessionRating: number;
    featureUsage: Record<string, number>;
    dropOffPoints: string[];
  };
  patterns: {
    peakHours: number[];
    preferredTopics: string[];
    learningStyle: string;
    sessionLengthPreference: string;
    improvementAreas: string[];
  };
}

/**
 * Token usage and cost tracking
 */
export interface TokenUsageDisplay {
  timeRange: string;
  usage: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    averageTokensPerSession: number;
    peakUsageDay: string;
  };
  cost: {
    totalCost: string;
    averageCostPerSession: string;
    costPerToken: string;
    projectedMonthlyCost: string;
  };
  byProvider: Array<{
    provider: string;
    tokens: number;
    cost: string;
    percentage: number;
    model: string;
  }>;
  byFeature: Array<{
    feature: string;
    tokens: number;
    cost: string;
    sessions: number;
    efficiency: number;
  }>;
  trends: {
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    costTrend: 'increasing' | 'decreasing' | 'stable';
    efficiencyTrend: 'improving' | 'declining' | 'stable';
  };
  recommendations: string[];
}

// ============================================================================
// Analytics Configuration Types
// ============================================================================

/**
 * Analytics configuration options
 */
export interface AnalyticsConfig {
  tracking: {
    enableDetailedTracking: boolean;
    anonymizeData: boolean;
    retentionDays: number;
  };
  dashboard: {
    defaultTimeRange: '7days' | '30days' | '90days';
    showInsights: boolean;
    refreshInterval: number; // minutes
  };
  achievements: {
    enableNotifications: boolean;
    showProgress: boolean;
    autoReveal: boolean;
  };
  privacy: {
    shareAnonymousData: boolean;
    allowAnalytics: boolean;
    dataProcessingConsent: boolean;
  };
}

/**
 * Learning insight and recommendation
 */
export interface LearningInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'achievement' | 'improvement';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'productivity' | 'learning' | 'engagement' | 'goals';
  data?: Record<string, any>;
  suggestedActions: string[];
}