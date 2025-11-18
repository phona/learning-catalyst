/**
 * Exercise Difficulty Calibrator
 *
 * Adaptive difficulty adjustment system that calibrates exercise difficulty
 * based on user performance, learning patterns, and contextual factors.
 */

export interface UserPerformanceMetrics {
  // Recent performance
  recentSuccessRate: number; // 0-1, success rate in last N exercises
  averageCompletionTime: number; // minutes, average time to complete exercises
  recentAccuracy: number; // 0-1, accuracy of solutions

  // Learning progression
  currentStreak: number; // consecutive correct answers
  longestStreak: number; // best streak achieved
  improvementRate: number; // rate of improvement over time

  // Difficulty-specific performance
  easySuccessRate: number; // success rate on easy exercises
  mediumSuccessRate: number; // success rate on medium exercises
  hardSuccessRate: number; // success rate on hard exercises

  // Contextual factors
  timeOfDay: number; // 0-24, current hour
  sessionDuration: number; // minutes spent in current session
  exercisesInSession: number; // number of exercises completed this session
  recentStruggles: string[]; // concepts or topics user struggled with

  // Self-reported factors
  confidenceLevel: number; // 0-1, user's self-assessed confidence
  difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive';
  frustrationLevel: number; // 0-1, how frustrated user seems
}

export interface DifficultyCalibrationContext {
  userId: string;
  sessionId: string;
  currentTopic?: string;
  exerciseHistory: Array<{
    exerciseId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    success: boolean;
    timeSpent: number; // minutes
    attempts: number;
    hintsUsed: number;
    timestamp: number;
    topic: string;
    userRating?: number; // 1-5, user's difficulty rating
  }>;
  userContext: {
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    learningVelocity: number; // how quickly user learns new concepts
    engagementLevel: number; // 0-1, how engaged user is
    preferences: {
      challengeLevel: 'conservative' | 'balanced' | 'aggressive';
      practiceFrequency: 'low' | 'medium' | 'high';
      feedbackStyle: 'encouraging' | 'direct' | 'detailed';
    };
  };
}

export interface DifficultyRecommendation {
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  confidence: number; // 0-1, confidence in recommendation
  reasoning: string;
  factors: {
    performanceBased: number; // 0-1, influence of performance
    contextualBased: number; // 0-1, influence of context
    preferenceBased: number; // 0-1, influence of user preferences
    adaptiveBased: number; // 0-1, influence of adaptive algorithms
  };
  adjustments: {
    shouldIncrease: boolean;
    shouldDecrease: boolean;
    magnitude: 'small' | 'medium' | 'large';
    reason: string;
  };
  alternatives: {
    easier: {
      difficulty: 'easy' | 'medium';
      reasoning: string;
      confidence: number;
    };
    harder: {
      difficulty: 'medium' | 'hard';
      reasoning: string;
      confidence: number;
    };
  };
}

export interface DifficultyCalibrationStrategy {
  name: string;
  description: string;
  weight: number; // relative weight in final decision
  calibrate: (
    metrics: UserPerformanceMetrics,
    context: DifficultyCalibrationContext
  ) => {
    recommendedDifficulty: 'easy' | 'medium' | 'hard';
    confidence: number;
    reasoning: string;
  };
}

/**
 * Difficulty Calibrator Service
 */
export class DifficultyCalibrator {
  private readonly strategies: Map<string, DifficultyCalibrationStrategy> = new Map();
  private readonly calibrationHistory = new Map<string, {
    timestamp: number;
    recommendation: DifficultyRecommendation;
    actualOutcome?: {
      exerciseDifficulty: 'easy' | 'medium' | 'hard';
      success: boolean;
      userRating?: number;
    };
  }>();

  constructor() {
    this.initializeBuiltinStrategies();
  }

  /**
   * Calibrate difficulty for next exercise
   */
  async calibrateDifficulty(
    context: DifficultyCalibrationContext
  ): Promise<DifficultyRecommendation> {
    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(context);

    // Get recommendations from all strategies
    const strategyResults = Array.from(this.strategies.values()).map(strategy => ({
      name: strategy.name,
      weight: strategy.weight,
      ...strategy.calibrate(metrics, context)
    }));

    // Combine recommendations using weighted average
    const recommendation = this.combineStrategyRecommendations(strategyResults, metrics, context);

    // Add adaptive adjustments
    this.applyAdaptiveAdjustments(recommendation, metrics, context);

    // Store calibration for learning
    this.storeCalibration(context.userId, recommendation);

    return recommendation;
  }

  /**
   * Record actual exercise outcome for learning
   */
  recordExerciseOutcome(
    userId: string,
    exerciseId: string,
    outcome: {
      difficulty: 'easy' | 'medium' | 'hard';
      success: boolean;
      timeSpent: number;
      attempts: number;
      hintsUsed: number;
      userRating?: number;
    }
  ): void {
    const calibration = this.calibrationHistory.get(userId);
    if (calibration && !calibration.actualOutcome) {
      calibration.actualOutcome = outcome;
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics(context: DifficultyCalibrationContext): UserPerformanceMetrics {
    const history = context.exerciseHistory;
    const recentHistory = history.slice(-10); // Last 10 exercises

    // Basic performance metrics
    const recentSuccessRate = recentHistory.length > 0
      ? recentHistory.filter(ex => ex.success).length / recentHistory.length
      : 0.5;

    const averageCompletionTime = recentHistory.length > 0
      ? recentHistory.reduce((sum, ex) => sum + ex.timeSpent, 0) / recentHistory.length
      : 15; // Default 15 minutes

    const recentAccuracy = recentHistory.length > 0
      ? recentHistory.reduce((sum, ex) => sum + (ex.success ? 1 : 0), 0) / recentHistory.length
      : 0.5;

    // Streak calculations
    const currentStreak = this.calculateCurrentStreak(recentHistory);
    const longestStreak = this.calculateLongestStreak(history);

    // Improvement rate
    const improvementRate = this.calculateImprovementRate(history);

    // Difficulty-specific performance
    const easyExercises = history.filter(ex => ex.difficulty === 'easy');
    const mediumExercises = history.filter(ex => ex.difficulty === 'medium');
    const hardExercises = history.filter(ex => ex.difficulty === 'hard');

    const easySuccessRate = easyExercises.length > 0
      ? easyExercises.filter(ex => ex.success).length / easyExercises.length
      : 0.8;

    const mediumSuccessRate = mediumExercises.length > 0
      ? mediumExercises.filter(ex => ex.success).length / mediumExercises.length
      : 0.5;

    const hardSuccessRate = hardExercises.length > 0
      ? hardExercises.filter(ex => ex.success).length / hardExercises.length
      : 0.2;

    // Contextual factors
    const now = new Date();
    const timeOfDay = now.getHours();
    const sessionDuration = (now.getTime() - this.getSessionStartTime(context)) / (1000 * 60);
    const exercisesInSession = this.getExercisesInCurrentSession(history);

    // Recent struggles
    const recentStruggles = this.identifyRecentStruggles(recentHistory);

    return {
      recentSuccessRate,
      averageCompletionTime,
      recentAccuracy,
      currentStreak,
      longestStreak,
      improvementRate,
      easySuccessRate,
      mediumSuccessRate,
      hardSuccessRate,
      timeOfDay,
      sessionDuration,
      exercisesInSession,
      recentStruggles,
      confidenceLevel: context.userContext.engagementLevel,
      difficultyPreference: context.userContext.preferences.challengeLevel === 'conservative' ? 'easy' :
        context.userContext.preferences.challengeLevel === 'aggressive' ? 'hard' : 'medium',
      frustrationLevel: this.calculateFrustrationLevel(recentHistory)
    };
  }

  /**
   * Combine strategy recommendations into final recommendation
   */
  private combineStrategyRecommendations(
    strategyResults: any[],
    metrics: UserPerformanceMetrics,
    context: DifficultyCalibrationContext
  ): DifficultyRecommendation {
    // Weight the recommendations
    const weights = strategyResults.map(s => s.weight);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Calculate weighted difficulty scores
    const difficultyScores = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    strategyResults.forEach(result => {
      const weight = result.weight / totalWeight;
      const score = result.confidence * weight;

      switch (result.recommendedDifficulty) {
      case 'easy':
        difficultyScores.easy += score;
        break;
      case 'medium':
        difficultyScores.medium += score;
        break;
      case 'hard':
        difficultyScores.hard += score;
        break;
      }
    });

    // Determine recommended difficulty
    const maxScore = Math.max(difficultyScores.easy, difficultyScores.medium, difficultyScores.hard);
    const recommendedDifficulty = maxScore === difficultyScores.easy ? 'easy' :
      maxScore === difficultyScores.medium ? 'medium' : 'hard';

    const confidence = maxScore;

    // Generate reasoning
    const reasoning = this.generateReasoning(strategyResults, metrics, context);

    // Calculate factor influences
    const factors = this.calculateFactorInfluences(strategyResults, metrics, context);

    // Determine adjustments
    const adjustments = this.calculateAdjustments(strategyResults, metrics, context);

    // Generate alternatives
    const alternatives = this.generateAlternatives(difficultyScores, strategyResults);

    return {
      recommendedDifficulty,
      confidence,
      reasoning,
      factors,
      adjustments,
      alternatives
    };
  }

  /**
   * Apply adaptive adjustments based on contextual factors
   */
  private applyAdaptiveAdjustments(
    recommendation: DifficultyRecommendation,
    metrics: UserPerformanceMetrics,
    context: DifficultyCalibrationContext
  ): void {
    // Session fatigue adjustment
    if (metrics.sessionDuration > 60 && metrics.exercisesInSession > 10) {
      // User might be getting tired, suggest easier
      if (recommendation.recommendedDifficulty === 'hard') {
        recommendation.recommendedDifficulty = 'medium';
        recommendation.reasoning += ' [Adjusted for session fatigue]';
        recommendation.confidence *= 0.9;
      } else if (recommendation.recommendedDifficulty === 'medium' && metrics.frustrationLevel > 0.6) {
        recommendation.recommendedDifficulty = 'easy';
        recommendation.reasoning += ' [Adjusted for high fatigue and frustration]';
        recommendation.confidence *= 0.8;
      }
    }

    // Time of day adjustment
    if (metrics.timeOfDay < 9 || metrics.timeOfDay > 21) {
      // Late night or early morning, suggest easier
      if (recommendation.recommendedDifficulty === 'hard') {
        recommendation.recommendedDifficulty = 'medium';
        recommendation.reasoning += ' [Adjusted for time of day]';
        recommendation.confidence *= 0.95;
      }
    }

    // Streak adjustment
    if (metrics.currentStreak >= 5) {
      // User on a hot streak, maybe increase difficulty
      if (recommendation.recommendedDifficulty === 'easy' && metrics.easySuccessRate > 0.9) {
        recommendation.recommendedDifficulty = 'medium';
        recommendation.reasoning += ' [Increased difficulty due to success streak]';
      } else if (recommendation.recommendedDifficulty === 'medium' && metrics.mediumSuccessRate > 0.8) {
        recommendation.recommendedDifficulty = 'hard';
        recommendation.reasoning += ' [Increased difficulty due to success streak]';
      }
    } else if (metrics.currentStreak <= -3) {
      // User struggling, decrease difficulty
      if (recommendation.recommendedDifficulty === 'hard') {
        recommendation.recommendedDifficulty = 'medium';
        recommendation.reasoning += ' [Decreased difficulty due to struggle streak]';
        recommendation.confidence *= 0.9;
      } else if (recommendation.recommendedDifficulty === 'medium') {
        recommendation.recommendedDifficulty = 'easy';
        recommendation.reasoning += ' [Decreased difficulty due to struggle streak]';
        recommendation.confidence *= 0.85;
      }
    }

    // Recent struggles adjustment
    if (metrics.recentStruggles.length > 0 && context.currentTopic) {
      const currentTopicStruggles = metrics.recentStruggles.includes(context.currentTopic);
      if (currentTopicStruggles && recommendation.recommendedDifficulty === 'hard') {
        recommendation.recommendedDifficulty = 'medium';
        recommendation.reasoning += ' [Adjusted for recent struggles with current topic]';
        recommendation.confidence *= 0.9;
      }
    }
  }

  /**
   * Initialize built-in calibration strategies
   */
  private initializeBuiltinStrategies(): void {
    // Performance-based strategy
    this.strategies.set('performance-based', {
      name: 'Performance-Based',
      description: 'Adjust difficulty based on recent performance metrics',
      weight: 0.4,
      calibrate: (metrics) => {
        if (metrics.recentSuccessRate > 0.8 && metrics.averageCompletionTime < 10) {
          return {
            recommendedDifficulty: 'hard',
            confidence: 0.8,
            reasoning: 'High success rate and fast completion suggest readiness for harder challenges'
          };
        } else if (metrics.recentSuccessRate < 0.4 || metrics.averageCompletionTime > 25) {
          return {
            recommendedDifficulty: 'easy',
            confidence: 0.8,
            reasoning: 'Low success rate or slow completion suggests need for easier exercises'
          };
        } else {
          return {
            recommendedDifficulty: 'medium',
            confidence: 0.6,
            reasoning: 'Moderate performance suggests current difficulty is appropriate'
          };
        }
      }
    });

    // Difficulty-specific strategy
    this.strategies.set('difficulty-specific', {
      name: 'Difficulty-Specific',
      description: 'Analyze performance across different difficulty levels',
      weight: 0.3,
      calibrate: (metrics) => {
        if (metrics.hardSuccessRate > 0.7 && metrics.hardExercises > 3) {
          return {
            recommendedDifficulty: 'hard',
            confidence: 0.9,
            reasoning: 'Strong performance on hard exercises indicates readiness for more challenges'
          };
        } else if (metrics.easySuccessRate < 0.6 && metrics.easyExercises > 3) {
          return {
            recommendedDifficulty: 'easy',
            confidence: 0.8,
            reasoning: 'Even easy exercises are challenging, focus on building confidence'
          };
        } else if (metrics.mediumSuccessRate > 0.8 && metrics.hardSuccessRate < 0.5) {
          return {
            recommendedDifficulty: 'hard',
            confidence: 0.7,
            reasoning: 'Mastered medium exercises, ready to progress to harder challenges'
          };
        } else {
          return {
            recommendedDifficulty: 'medium',
            confidence: 0.6,
            reasoning: 'Performance suggests medium difficulty is appropriate'
          };
        }
      }
    });

    // User preference strategy
    this.strategies.set('user-preference', {
      name: 'User-Preference',
      description: 'Respect user\'s stated difficulty preferences',
      weight: 0.2,
      calibrate: (metrics, context) => {
        const preference = context.userContext.preferences.challengeLevel;
        const confidenceLevel = metrics.confidenceLevel;

        if (preference === 'conservative') {
          return {
            recommendedDifficulty: 'easy',
            confidence: 0.9,
            reasoning: 'User prefers conservative challenge level'
          };
        } else if (preference === 'aggressive' && confidenceLevel > 0.7) {
          return {
            recommendedDifficulty: 'hard',
            confidence: 0.8,
            reasoning: 'User prefers aggressive challenges and shows high confidence'
          };
        } else {
          return {
            recommendedDifficulty: 'medium',
            confidence: 0.7,
            reasoning: 'Balanced approach based on user preferences'
          };
        }
      }
    });

    // Adaptive learning strategy
    this.strategies.set('adaptive-learning', {
      name: 'Adaptive-Learning',
      description: 'Adaptive algorithm considering learning velocity and patterns',
      weight: 0.1,
      calibrate: (metrics, context) => {
        const learningVelocity = context.userContext.learningVelocity;
        const improvementRate = metrics.improvementRate;

        if (learningVelocity > 1.2 && improvementRate > 0.1) {
          return {
            recommendedDifficulty: 'hard',
            confidence: 0.8,
            reasoning: 'Fast learner showing improvement, ready for increased challenge'
          };
        } else if (learningVelocity < 0.8 || improvementRate < -0.1) {
          return {
            recommendedDifficulty: 'easy',
            confidence: 0.7,
            reasoning: 'Learning slower or showing declining performance, reduce difficulty'
          };
        } else {
          return {
            recommendedDifficulty: 'medium',
            confidence: 0.6,
            reasoning: 'Stable learning rate, maintain current difficulty'
          };
        }
      }
    });
  }

  /**
   * Helper methods for calculations
   */
  private calculateCurrentStreak(history: any[]): number {
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].success) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateLongestStreak(history: any[]): number {
    let longest = 0;
    let current = 0;
    for (const exercise of history) {
      if (exercise.success) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return longest;
  }

  private calculateImprovementRate(history: any[]): number {
    if (history.length < 5) return 0;

    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstHalfSuccess = firstHalf.filter(ex => ex.success).length / firstHalf.length;
    const secondHalfSuccess = secondHalf.filter(ex => ex.success).length / secondHalf.length;

    return secondHalfSuccess - firstHalfSuccess;
  }

  private getSessionStartTime(context: DifficultyCalibrationContext): number {
    const now = Date.now();
    const sessionExercise = context.exerciseHistory
      .filter(ex => now - ex.timestamp < 2 * 60 * 60 * 1000) // Within 2 hours
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    return sessionExercise ? sessionExercise.timestamp : now - 30 * 60 * 1000; // Default 30 minutes ago
  }

  private getExercisesInCurrentSession(history: any[]): number {
    const now = Date.now();
    return history.filter(ex => now - ex.timestamp < 2 * 60 * 60 * 1000).length;
  }

  private identifyRecentStruggles(history: any[]): string[] {
    return history
      .filter(ex => !ex.success || ex.attempts > 3 || ex.hintsUsed > 2)
      .slice(-5)
      .map(ex => ex.topic);
  }

  private calculateFrustrationLevel(history: any[]): number {
    if (history.length === 0) return 0;

    const recentHistory = history.slice(-5);
    const failureRate = 1 - (recentHistory.filter(ex => ex.success).length / recentHistory.length);
    const averageAttempts = recentHistory.reduce((sum, ex) => sum + ex.attempts, 0) / recentHistory.length;
    const averageHints = recentHistory.reduce((sum, ex) => sum + ex.hintsUsed, 0) / recentHistory.length;

    // Combine factors into frustration score
    return Math.min(1, (failureRate * 0.4) + ((averageAttempts - 1) * 0.3) + (averageHints * 0.3));
  }

  private generateReasoning(strategyResults: any[], metrics: UserPerformanceMetrics, context: DifficultyCalibrationContext): string {
    const primaryStrategy = strategyResults.reduce((prev, current) =>
      current.confidence * current.weight > prev.confidence * prev.weight ? current : prev
    );

    return `Difficulty calibrated based on ${primaryStrategy.name}. ${primaryStrategy.reasoning}`;
  }

  private calculateFactorInfluences(strategyResults: any[], metrics: UserPerformanceMetrics, context: DifficultyCalibrationContext): any {
    const totalWeight = strategyResults.reduce((sum, s) => sum + s.weight, 0);

    return {
      performanceBased: strategyResults.find(s => s.name === 'Performance-Based')?.weight / totalWeight || 0,
      contextualBased: strategyResults.find(s => s.name === 'Adaptive-Learning')?.weight / totalWeight || 0,
      preferenceBased: strategyResults.find(s => s.name === 'User-Preference')?.weight / totalWeight || 0,
      adaptiveBased: strategyResults.find(s => s.name === 'Difficulty-Specific')?.weight / totalWeight || 0
    };
  }

  private calculateAdjustments(strategyResults: any[], metrics: UserPerformanceMetrics, context: DifficultyCalibrationContext): any {
    const avgRecommendation = strategyResults.reduce((sum, s) => {
      const value = s.recommendedDifficulty === 'easy' ? 1 : s.recommendedDifficulty === 'medium' ? 2 : 3;
      return sum + (value * s.confidence);
    }, 0) / strategyResults.reduce((sum, s) => sum + s.confidence, 0);

    const currentDifficulty = this.getCurrentAverageDifficulty(context.exerciseHistory);

    return {
      shouldIncrease: avgRecommendation > currentDifficulty + 0.3,
      shouldDecrease: avgRecommendation < currentDifficulty - 0.3,
      magnitude: Math.abs(avgRecommendation - currentDifficulty) > 0.6 ? 'large' :
        Math.abs(avgRecommendation - currentDifficulty) > 0.3 ? 'medium' : 'small',
      reason: `Based on performance trends and current difficulty level`
    };
  }

  private generateAlternatives(difficultyScores: any, strategyResults: any[]): any {
    const sortedScores = Object.entries(difficultyScores)
      .sort(([,a], [,b]) => b - a);

    const best = sortedScores[0][0] as 'easy' | 'medium' | 'hard';
    const second = sortedScores[1][0] as 'easy' | 'medium' | 'hard';

    return {
      easier: {
        difficulty: best === 'easy' ? 'easy' : best === 'medium' ? 'easy' : 'medium',
        reasoning: `Alternative if ${best} feels too challenging`,
        confidence: difficultyScores[second] || 0.5
      },
      harder: {
        difficulty: best === 'hard' ? 'hard' : best === 'medium' ? 'hard' : 'medium',
        reasoning: `Alternative if ${best} feels too easy`,
        confidence: difficultyScores[second] || 0.5
      }
    };
  }

  private getCurrentAverageDifficulty(history: any[]): number {
    if (history.length === 0) return 2; // Default to medium

    const recentHistory = history.slice(-5);
    const difficultySum = recentHistory.reduce((sum, ex) => {
      return sum + (ex.difficulty === 'easy' ? 1 : ex.difficulty === 'medium' ? 2 : 3);
    }, 0);

    return difficultySum / recentHistory.length;
  }

  private storeCalibration(userId: string, recommendation: DifficultyRecommendation): void {
    this.calibrationHistory.set(userId, {
      timestamp: Date.now(),
      recommendation
    });
  }

  /**
   * Get calibration statistics
   */
  getStatistics(): {
    totalCalibrations: number;
    accuracyRate: number;
    averageConfidence: number;
    difficultyDistribution: Record<string, number>;
    } {
    const calibrations = Array.from(this.calibrationHistory.values());
    const completedCalibrations = calibrations.filter(c => c.actualOutcome);

    const accuracyRate = completedCalibrations.length > 0
      ? completedCalibrations.filter(c => {
        const rec = c.recommendation.recommendedDifficulty;
        const actual = c.actualOutcome!.exerciseDifficulty;
        return rec === actual ||
                (rec === 'medium' && (actual === 'easy' || actual === 'hard')) ||
                (c.actualOutcome!.success && actual === 'hard' && rec === 'medium');
      }).length / completedCalibrations.length
      : 0;

    const averageConfidence = calibrations.length > 0
      ? calibrations.reduce((sum, c) => sum + c.recommendation.confidence, 0) / calibrations.length
      : 0;

    const difficultyDistribution = calibrations.reduce((dist, c) => {
      dist[c.recommendation.recommendedDifficulty] = (dist[c.recommendation.recommendedDifficulty] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalCalibrations: calibrations.length,
      accuracyRate,
      averageConfidence,
      difficultyDistribution
    };
  }

  /**
   * Register custom calibration strategy
   */
  registerStrategy(strategy: DifficultyCalibrationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Update strategy weights
   */
  updateStrategyWeights(weights: Record<string, number>): void {
    for (const [name, weight] of Object.entries(weights)) {
      const strategy = this.strategies.get(name);
      if (strategy) {
        strategy.weight = weight;
      }
    }
  }
}

/**
 * Global difficulty calibrator instance
 */
export const difficultyCalibrator = new DifficultyCalibrator();