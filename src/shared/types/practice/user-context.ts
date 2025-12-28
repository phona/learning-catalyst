/**
 * User Context Types
 *
 * Detailed types for user learning context tracking and analysis.
 * Extends base practice context with user-specific learning patterns.
 */

import { VibeType, LearningPattern } from './practice-context';

export interface UserLearningProfile {
  id: string;
  sessionId: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  characteristics: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
    difficultyProgression: 'gradual' | 'aggressive' | 'steady' | 'adaptive';
    preferredPracticeLength: number; // minutes
    optimalPracticeFrequency: number; // practices per session
    attentionSpan: number; // minutes
  };
  preferences: {
    feedbackStyle: 'gentle' | 'direct' | 'encouraging' | 'technical';
    challengeLevel: 'easy' | 'medium' | 'hard' | 'adaptive';
    practiceTiming: 'immediate' | 'delayed' | 'scheduled';
    guidanceLevel: 'minimal' | 'moderate' | 'extensive';
  };
  performance: {
    overallSuccessRate: number;
    averageSessionLength: number;
    preferredTopics: string[];
    challengingTopics: string[];
    masteryProgress: Record<string, number>; // concept -> mastery percentage
  };
}

export interface UserContextTracker {
  userId: string;
  sessionId: string;
  currentContext: {
    topic?: string;
    subtopics: string[];
    confidenceLevel: number;
    engagementLevel: number;
    cognitiveLoad: number; // 0-1, how mentally taxing the current topic is
    timeOnTopic: number; // minutes spent on current topic
  };
  projectContext?: {
    name: string;
    type: 'react' | 'node' | 'python' | 'vue' | 'angular' | 'general';
    technologies: string[];
    recentFiles: Array<{
      path: string;
      lastModified: number;
      concepts: string[];
    }>;
    challenges: Array<{
      concept: string;
      difficulty: number;
      status: 'active' | 'resolved' | 'stuck';
    }>;
  };
  learningPatterns: LearningPattern[];
  recentActivity: Array<{
    type:
      | 'concept_introduction'
      | 'practice_attempt'
      | 'breakthrough'
      | 'confusion'
      | 'help_request';
    concept: string;
    timestamp: number;
    outcome?: string;
    confidence: number;
  }>;
  stuckPointAnalysis: {
    currentStuckPoints: string[];
    historicalStuckPoints: string[];
    resolutionPatterns: Array<{
      concept: string;
      resolutionMethod: string;
      effectiveness: number; // 0-1
      timeToResolution: number; // minutes
    }>;
  };
  practiceHistory: Array<{
    id: string;
    timestamp: number;
    concept: string;
    type: 'coding' | 'quiz' | 'discussion' | 'debugging' | 'project';
    difficulty: 'easy' | 'medium' | 'hard';
    success: boolean;
    duration: number;
    vibe: VibeType;
    confidence: number;
    feedback?: string;
    retryCount: number;
  }>;
  cognitiveMetrics: {
    currentVelocity: number; // concepts learned per hour
    averageVelocity: number;
    retentionRate: number; // concepts retained over time
    transferAbility: number; // ability to apply concepts to new contexts
    fatigueLevel: number; // 0-1, mental exhaustion
    motivationLevel: number; // 0-1, current motivation
  };
}

export interface ContextUpdateRequest {
  sessionId: string;
  messageType:
    | 'user_message'
    | 'assistant_message'
    | 'practice_completion'
    | 'concept_introduction';
  content: string;
  timestamp: number;
  concepts: string[];
  confidence?: number;
  sentiment?: number;
  practiceResult?: {
    success: boolean;
    concept: string;
    duration: number;
    attempts: number;
  };
  projectContext?: {
    file?: string;
    technology?: string;
    challenge?: string;
  };
}

export interface ContextUpdateResult {
  updated: boolean;
  changes: {
    newConcepts: string[];
    confidenceChanges: Record<string, number>;
    newStuckPoints: string[];
    resolvedStuckPoints: string[];
    learningPatterns: LearningPattern[];
  };
  recommendations: Array<{
    type: 'practice' | 'review' | 'advance' | 'break';
    priority: 'high' | 'medium' | 'low';
    description: string;
    reasoning: string;
  }>;
  nextSteps: {
    optimalPracticeTiming: number; // minutes from now
    suggestedDifficulty: 'easy' | 'medium' | 'hard';
    focusAreas: string[];
  };
}

export interface UserContextAnalysis {
  userContext: UserContextTracker;
  analysisResults: {
    currentLearningState: {
      state: 'struggling' | 'learning' | 'practicing' | 'mastering' | 'bored';
      confidence: number;
      readiness: number;
    };
    opportunityAnalysis: {
      readyForPractice: boolean;
      optimalTopics: Array<{
        topic: string;
        readiness: number;
        potentialImpact: number;
      }>;
      timingFactors: {
        cognitiveLoad: number;
        engagement: number;
        fatigue: number;
      };
    };
    learningProgression: {
      velocity: number;
      acceleration: number; // change in velocity
      efficiency: number; // success per time spent
      trajectory: 'improving' | 'stable' | 'declining';
    };
  };
  predictions: {
    nextLikelyConcepts: string[];
    successProbability: number;
    optimalDifficulty: 'easy' | 'medium' | 'hard';
    estimatedTimeToMastery: number; // minutes
  };
}

export interface AdaptiveLearningConfig {
  adaptiveDifficulty: boolean;
  adaptiveTiming: boolean;
  adaptiveContent: boolean;
  personalizationLevel: 'low' | 'medium' | 'high';
  constraints: {
    maxPracticePerSession: number;
    minBreakBetweenPractices: number; // minutes
    maxDifficultyJump: 'one' | 'two'; // levels at a time
  };
  adaptationTriggers: {
    successThreshold: number; // adapt after X successes
    failureThreshold: number; // adapt down after X failures
    confidenceThreshold: number; // adapt when confidence reaches this
    timeThreshold: number; // adapt after this many minutes
  };
}

// User personality and learning style indicators
export interface LearningPersonality {
  riskTolerance: 'low' | 'medium' | 'high'; // willingness to try hard challenges
  curiosity: 'low' | 'medium' | 'high'; // tendency to explore beyond requirements
  persistence: 'low' | 'medium' | 'high'; // tendency to stick with difficult problems
  socialLearning: 'solo' | 'collaborative' | 'mixed';
  feedbackResponse: 'positive' | 'neutral' | 'sensitive';
  structurePreference: 'guided' | 'exploratory' | 'balanced';
}

export interface ContextualFactors {
  timeOfDay: number; // 0-23 hours
  sessionLength: number; // minutes so far
  recentActivity: {
    lastPracticeTime: number;
    lastBreakTime: number;
    screenTime: number;
  };
  environmental: {
    deviceType: 'desktop' | 'mobile' | 'tablet';
    sessionCount: number; // sessions today
    breakFrequency: number;
  };
  cognitive: {
    mentalEnergy: number; // 0-1
    focus: number; // 0-1
    stress: number; // 0-1
  };
}

// Default user profile for new users
export const DEFAULT_USER_PROFILE: Partial<UserLearningProfile> = {
  characteristics: {
    learningStyle: 'mixed',
    difficultyProgression: 'gradual',
    preferredPracticeLength: 15,
    optimalPracticeFrequency: 2,
    attentionSpan: 25,
  },
  preferences: {
    feedbackStyle: 'encouraging',
    challengeLevel: 'adaptive',
    practiceTiming: 'immediate',
    guidanceLevel: 'moderate',
  },
  performance: {
    overallSuccessRate: 0.7,
    averageSessionLength: 30,
    preferredTopics: [],
    challengingTopics: [],
    masteryProgress: {},
  },
};

// Adaptive learning configuration defaults
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveLearningConfig = {
  adaptiveDifficulty: true,
  adaptiveTiming: true,
  adaptiveContent: true,
  personalizationLevel: 'medium',
  constraints: {
    maxPracticePerSession: 5,
    minBreakBetweenPractices: 5,
    maxDifficultyJump: 'one',
  },
  adaptationTriggers: {
    successThreshold: 3,
    failureThreshold: 2,
    confidenceThreshold: 0.8,
    timeThreshold: 20,
  },
};
