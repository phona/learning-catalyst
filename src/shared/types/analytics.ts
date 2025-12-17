/**
 * Analytics Service Interface
 *
 * Pure TypeScript interface defining analytics operations.
 * Can be used by both main and renderer processes.
 */

export interface DashboardDisplay {
  recentSessions: SessionDisplay[];
  conceptProgress: ConceptProgressDisplay[];
  achievements: AchievementDisplay[];
  learningTrends: LearningTrendDisplay[];
  studyStreak: StudyStreakDisplay;
  timeStats: TimeStatsDisplay;
}

export interface SessionDisplay {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  duration: number; // in minutes
  messageCount: number;
  conceptsExplored: string[];
  masteryLevel: number; // 0-100
  tags: string[];
  summary?: string;
}

export interface ConceptProgressDisplay {
  conceptId: string;
  conceptName: string;
  masteryLevel: number; // 0-100
  totalSessions: number;
  lastStudied: Date;
  trend: 'improving' | 'stable' | 'declining';
  relatedConcepts: string[];
  prerequisites: string[];
  nextSteps: string[];
}

export interface AchievementDisplay {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  category: 'learning' | 'consistency' | 'mastery' | 'exploration';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number; // 0-100
}

export interface LearningTrendDisplay {
  period: 'daily' | 'weekly' | 'monthly';
  dataPoints: TrendDataPoint[];
  average: number;
  peak: number;
  improvement: number; // percentage change
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface StudyStreakDisplay {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date;
  streakHistory: Date[];
}

export interface TimeStatsDisplay {
  totalStudyTime: number; // in minutes
  averageSessionTime: number;
  totalSessions: number;
  mostProductiveHour: number; // 0-23
  studyDaysThisMonth: number;
  studyDaysThisWeek: number;
}

export interface UsageStatsDisplay {
  timeRange: string;
  overall: {
    totalLearningTime: number;
    totalSessions: number;
    conceptsLearned: number;
    skillsAcquired: number;
    practiceExercisesCompleted: number;
    accuracyRate: number;
  };
  patterns?: {
    dailyAverage: number;
    weeklyPattern: Record<string, number>;
    peakHours: string[];
    consistency: number;
  };
  engagement?: {
    sessionsPerDay: number;
    averageSessionLength: number;
    completionRate: number;
    returnRate: number;
  };
  metadata: {
    generatedAt: string;
    period: string;
  };
}

export interface TokenUsageDisplay {
  timeRange: string;
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
    usageTrend: string;
  };
  providers?: Array<{
    provider: string;
    tokens: number;
    cost: number;
    percentage: number;
  }>;
  features?: Array<{
    feature: string;
    tokens: number;
    percentage: number;
  }>;
  projections?: {
    nextPeriodEstimate: number;
    costEstimate: number;
    growthRate: number;
    recommendations: string[];
  };
  metadata: {
    generatedAt: string;
    period: string;
  };
}

export interface ProgressChartParams {
  period: 'week' | 'month' | 'quarter' | 'year';
  metric: 'mastery' | 'sessions' | 'time' | 'concepts';
  conceptIds?: string[];
}

export interface ProgressChartDisplay {
  title: string;
  type: 'line' | 'bar' | 'area';
  data: TrendDataPoint[];
  goal?: number;
  unit: string;
  period: string;
}

export interface LearningSession {
  id?: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  concepts: string[];
  messages?: unknown[];
  achievements?: string[];
  notes?: string;
}

export interface CreateLearningSessionRequest {
  title: string;
  concepts: string[];
  notes?: string;
  tags?: string[];
}
export interface ConceptProgressUpdate {
  conceptId: string;
  masteryLevel: number;
  sessionTime?: number;
  exerciseCompleted?: boolean;
  notes?: string;
}

// Error types specific to analytics
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export class SessionNotFoundError extends AnalyticsError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId });
  }
}

export class ConceptNotFoundError extends AnalyticsError {
  constructor(conceptId: string) {
    super(`Concept not found: ${conceptId}`, 'CONCEPT_NOT_FOUND', { conceptId });
  }
}

export class DataValidationError extends AnalyticsError {
  constructor(field: string, value: unknown, expectedType: string) {
    super(
      `Invalid data for field ${field}: expected ${expectedType}, got ${typeof value}`,
      'DATA_VALIDATION_ERROR',
      { field, value, expectedType },
    );
  }
}
