/**
 * Analytics & Progress API
 *
 * Provides comprehensive learning analytics and progress tracking.
 * Focuses on motivation through achievement and progress visualization.
 */

export interface AnalyticsAPI {
  /**
   * Gets comprehensive learning dashboard data
   * Returns all key metrics needed for dashboard display
   * @returns Promise<DashboardDisplay> - Complete dashboard data
   */
  getDashboard: () => Promise<DashboardDisplay>;

  /**
   * Gets progress chart data for visualization
   * Returns structured data for various chart types
   * @param params.timeRange - '7days' | '30days' | '90days' | '1year'
   * @param params.topic - Optional topic filter (null for all topics)
   * @returns Promise<ProgressChartDisplay> - Chart-ready progress data
   */
  getProgressChart: (params: {
    timeRange: '7days' | '30days' | '90days' | '1year';
    topic?: string | null;
  }) => Promise<ProgressChartDisplay>;

  /**
   * Gets all user achievements and milestones
   * Returns achievements with completion status and metadata
   * @returns Promise<AchievementDisplay[]> - Array of achievements
   */
  getAchievements: () => Promise<AchievementDisplay[]>;

  /**
   * Unlocks an achievement and handles rewards
   * Called when user meets achievement criteria
   * @param achievementId - ID of the achievement to unlock
   * @returns Promise<{ success: boolean; reward?: AchievementReward }>
   */
  unlockAchievement: (achievementId: string) => Promise<{ success: boolean; reward?: AchievementReward }>;

  /**
   * Gets detailed usage statistics
   * Provides insights into learning patterns and habits
   * @param timeRange - Time range for statistics
   * @returns Promise<UsageStatsDisplay> - Detailed usage analytics
   */
  getUsageStats: (timeRange: '7days' | '30days' | '90days' | '1year') => Promise<UsageStatsDisplay>;

  /**
   * Gets token usage and cost information
   * Important for monitoring API usage and costs
   * @param timeRange - Time range for token statistics
   * @returns Promise<TokenUsageDisplay> - Token usage breakdown
   */
  getTokenUsage: (timeRange: '7days' | '30days' | '90days' | '1year') => Promise<TokenUsageDisplay>;
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