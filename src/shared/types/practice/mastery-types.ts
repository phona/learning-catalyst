/**
 * Practice Mastery Types
 *
 * Types for tracking concept mastery and learning progress.
 * Part of Phase 1 context-aware practice system implementation.
 */

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  masteryLevel: number; // 0-100
  confidence: number; // 0-1
  lastAssessed: Date;
  assessmentCount: number;
  improvementRate: number; // percentage change over time
  prerequisites: string[];
  relatedConcepts: string[];
  nextMilestone?: {
    level: number;
    description: string;
    estimatedTime: number; // minutes
  };
}

export interface PracticeRecommendation {
  id: string;
  type:
    | 'exercise'
    | 'quiz'
    | 'project'
    | 'discussion'
    | 'review'
    | 'remedial_practice'
    | 'advancement_practice'
    | 'preference_aligned';
  conceptId: string;
  concept: string; // For backward compatibility with tests
  conceptName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // minutes
  description: string;
  instructions?: string;
  resources?: Array<{
    type: 'video' | 'article' | 'documentation' | 'example';
    title: string;
    url?: string;
    content?: string;
  }>;
  prerequisites: string[];
  learningObjectives: string[];
  successCriteria: string[];
  priority: 'low' | 'medium' | 'high';
  personalized: boolean;
  adaptationReason?: string;
  customizations?: {
    approach?: string;
    feedbackStyle?: string;
  };
  expectedOutcome?: string;
}

export interface LearningVelocityMetrics {
  userId: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'overall';
  conceptsPerSession: number;
  sessionsPerDay: number;
  averageSessionLength: number; // minutes
  masteryRate: number; // concepts mastered per week
  retentionRate: number; // percentage of concepts retained
  improvementRate: number; // percentage change in learning speed
  currentVelocity: number; // For backward compatibility with tests
  velocityTrend: 'improving' | 'stable' | 'declining'; // For backward compatibility with tests
  confidenceVelocity: number; // For backward compatibility with tests
  estimatedTimeToMastery: number; // For backward compatibility with tests
  streakMetrics: {
    currentStreak: number;
    longestStreak: number;
    averageStreakLength: number;
  };
  conceptDistribution: Record<string, number>; // concept category -> count
  learningPattern: {
    peakHours: number[];
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  };
  recommendations: string[];
  calculatedAt: Date;
}

export interface MasteryAssessment {
  conceptId: string;
  userId: string;
  assessmentType: 'quiz' | 'exercise' | 'project' | 'self_assessment';
  score: number; // 0-100
  confidence: number; // 0-1
  timeSpent: number; // minutes
  attempts: number;
  hints: number;
  feedback?: string;
  nextSteps: string[];
  assessedAt: Date;
}

