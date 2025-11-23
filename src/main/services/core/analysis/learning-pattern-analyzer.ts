/**
 * Learning Pattern Analyzer
 *
 * Analyzes user learning patterns, stuck points, and progress
 * to provide personalized practice recommendations. Part of Phase 1 implementation.
 */

import {
  UserContext,
  ConceptMastery,
  LearningPattern,
  PracticeRecommendation,
  LearningVelocityMetrics,
} from '@/shared/types/practice';
import { LoggerFactory } from '@/main/services/logger';

export interface LearningPatternRequest {
  userContext: UserContext;
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>;
  currentTopic?: string;
  timeWindow?: number; // Hours to look back for pattern analysis
}

export interface LearningPatternResult {
  patterns: LearningPattern[];
  stuckPoints: {
    concept: string;
    stuckDuration: number; // How long stuck (minutes)
    stuckLevel: 'mild' | 'moderate' | 'severe';
    recommendedActions: string[];
  }[];
  progressIndicators: {
    concept: string;
    confidenceImprovement: number;
    masteryLevel: 'emerging' | 'developing' | 'proficient' | 'mastered';
  }[];
  practiceRecommendations: PracticeRecommendation[];
  velocityMetrics: LearningVelocityMetrics;
  nextSteps: string[];
  timestamp: number;
}

/**
 * Learning Pattern Analyzer Service
 *
 * Analyzes user learning behavior to identify patterns, stuck points,
 * and optimal practice opportunities.
 */
export class LearningPatternAnalyzer {
  private readonly logger = LoggerFactory.getInstance().createContextAwareLogger();

  /**
   * Analyze learning patterns from user context and conversation history
   */
  async analyzeLearningPatterns(request: LearningPatternRequest): Promise<LearningPatternResult> {
    const { userContext, conversationHistory, currentTopic, timeWindow = 24 } = request;

    this.logger.info('Starting learning pattern analysis', {
      userId: userContext.id,
      timeWindow,
      currentTopic,
    });

    // Analyze conversation patterns
    const patterns = this.extractLearningPatterns(conversationHistory, userContext);

    // Identify stuck points
    const stuckPoints = this.identifyStuckPoints(conversationHistory, userContext);

    // Measure progress indicators
    const progressIndicators = this.analyzeProgress(conversationHistory, userContext);

    // Generate practice recommendations
    const practiceRecommendations = await this.generatePracticeRecommendations(
      patterns,
      stuckPoints,
      progressIndicators,
      currentTopic,
      userContext,
    );

    // Calculate velocity metrics
    const velocityMetrics = this.calculateVelocityMetrics(userContext, progressIndicators);

    this.logger.info('Learning pattern analysis complete', {
      patternsFound: patterns.length,
      stuckPointsFound: stuckPoints.length,
      progressIndicators: progressIndicators.length,
      recommendationsGenerated: practiceRecommendations.length,
    });

    return {
      patterns,
      stuckPoints,
      progressIndicators,
      practiceRecommendations,
      velocityMetrics,
      nextSteps: this.generateNextSteps(patterns, stuckPoints, progressIndicators),
      timestamp: Date.now(),
    };
  }

  /**
   * Extract learning patterns from conversation history
   */
  private extractLearningPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
  ): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const timeWindow = 6 * 60 * 60 * 1000; // 6 hours

    // Analyze question patterns
    const questionPattern = this.analyzeQuestionPatterns(conversationHistory, timeWindow);
    if (questionPattern) {
      patterns.push(questionPattern);
    }

    // Analyze retry patterns
    const retryPattern = this.analyzeRetryPatterns(conversationHistory, timeWindow);
    if (retryPattern) {
      patterns.push(retryPattern);
    }

    // Analyze breakthrough patterns
    const breakthroughPattern = this.analyzeBreakthroughPatterns(conversationHistory, timeWindow);
    if (breakthroughPattern) {
      patterns.push(breakthroughPattern);
    }

    // Analyze engagement patterns
    const engagementPattern = this.analyzeEngagementPatterns(
      conversationHistory,
      userContext,
      timeWindow,
    );
    if (engagementPattern) {
      patterns.push(engagementPattern);
    }

    // Analyze practice preferences
    const practicePreferencePattern = this.analyzePracticePreferences(
      conversationHistory,
      userContext,
    );
    if (practicePreferencePattern) {
      patterns.push(practicePreferencePattern);
    }

    return patterns;
  }

  /**
   * Analyze question asking patterns
   */
  private analyzeQuestionPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    timeWindow: number,
  ): LearningPattern | null {
    const recentMessages = conversationHistory.filter(
      (msg) => Date.now() - msg.timestamp <= timeWindow,
    );

    const userMessages = recentMessages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content.toLowerCase());

    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'can',
      'could',
      'would',
      'should',
      'is',
      'are',
    ];
    const questionMarkers = ['?', 'help me', 'explain', 'clarify', 'not sure', "don't understand"];

    let questionCount = 0;
    let questionComplexity = 0;

    userMessages.forEach((message) => {
      const hasQuestionWords = questionWords.some((word) => message.includes(word));
      const hasQuestionMarkers = questionMarkers.some((marker) => message.includes(marker));

      if (hasQuestionWords || hasQuestionMarkers) {
        questionCount++;
        // Estimate question complexity by length and structure
        questionComplexity += message.split(' ').length;
      }
    });

    if (questionCount === 0) return null;

    const avgComplexity = questionComplexity / questionCount;
    const questionFrequency = questionCount / userMessages.length;

    return {
      type: 'question_pattern',
      description: `User asked questions ${Math.round(questionFrequency * 100)}% of the time`,
      frequency: questionFrequency,
      confidence: Math.min(0.9, questionFrequency * 2),
      indicators: [
        `${questionCount} questions asked`,
        `Average complexity: ${Math.round(avgComplexity)} words`,
        `Question frequency: ${Math.round(questionFrequency * 100)}%`,
      ],
      implications: [
        questionFrequency > 0.3
          ? 'User actively seeks clarification'
          : 'User rarely asks questions',
        avgComplexity > 20 ? 'User asks complex questions' : 'User asks straightforward questions',
      ],
      recommendations: [
        questionFrequency > 0.3
          ? 'Continue encouraging active questioning and exploration'
          : 'Encourage more questions when unclear',
        avgComplexity > 20
          ? 'User ready for complex concepts'
          : 'Build up to more complex questioning',
      ],
    };
  }

  /**
   * Analyze retry and practice patterns
   */
  private analyzeRetryPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    timeWindow: number,
  ): LearningPattern | null {
    const recentMessages = conversationHistory.filter(
      (msg) => Date.now() - msg.timestamp <= timeWindow,
    );

    const retryWords = [
      'try again',
      'let me try',
      'attempt',
      'retry',
      'again',
      'new approach',
      'different way',
    ];
    const practiceWords = ['practice', 'implement', 'code', 'build', 'create', 'make', 'test'];

    let retryCount = 0;
    let practiceCount = 0;
    const retryTopics: string[] = [];

    recentMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      if (retryWords.some((word) => content.includes(word))) {
        retryCount++;
        // Extract topic if possible
        const topicMatch = content.match(/\b(react|useState|hooks|component|function)\b/gi);
        if (topicMatch) {
          retryTopics.push(topicMatch[0]);
        }
      }
      if (practiceWords.some((word) => content.includes(word))) {
        practiceCount++;
      }
    });

    if (retryCount === 0 && practiceCount === 0) return null;

    return {
      type: 'retry_pattern',
      description: `User shows ${retryCount > 0 ? 'retry behavior' : 'practice behavior'} with ${retryCount + practiceCount} instances`,
      frequency: (retryCount + practiceCount) / recentMessages.length,
      confidence: Math.min(0.8, ((retryCount + practiceCount) / recentMessages.length) * 3),
      indicators: [
        `${retryCount} retry attempts`,
        `${practiceCount} practice attempts`,
        `Retry topics: ${[...new Set(retryTopics)].join(', ')}`,
      ],
      implications: [
        retryCount > 2 ? 'User persists through challenges' : 'User may give up easily',
        practiceCount > 2 ? 'User actively practices' : 'User needs more practice encouragement',
      ],
      recommendations: [
        retryCount > 2
          ? 'Leverage persistence in more complex challenges'
          : 'Encourage more persistence',
        practiceCount > 2 ? 'Provide more practice opportunities' : 'Encourage hands-on practice',
      ],
    };
  }

  /**
   * Analyze breakthrough moments
   */
  private analyzeBreakthroughPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    timeWindow: number,
  ): LearningPattern | null {
    const recentMessages = conversationHistory.filter(
      (msg) => Date.now() - msg.timestamp <= timeWindow,
    );

    const breakthroughWords = [
      'aha!',
      'eureka',
      'suddenly',
      'now i get',
      'it clicked',
      'i see now',
      'breakthrough',
      'finally',
      'at last',
      'i got it',
      'makes sense now',
    ];

    const breakthroughMessages = recentMessages.filter((msg) =>
      breakthroughWords.some((word) => msg.content.toLowerCase().includes(word)),
    );

    if (breakthroughMessages.length === 0) return null;

    // Analyze breakthrough timing
    const breakthroughTimes = breakthroughMessages.map((msg) => msg.timestamp);
    const avgTimeBetweenBreakthroughs = this.calculateAverageTimeBetween(breakthroughTimes);

    return {
      type: 'breakthrough_pattern',
      description: `User experienced ${breakthroughMessages.length} breakthrough moments`,
      frequency: breakthroughMessages.length / recentMessages.length,
      confidence: Math.min(0.9, breakthroughMessages.length * 0.3),
      indicators: [
        `${breakthroughMessages.length} breakthrough moments`,
        `Time between breakthroughs: ${Math.round(avgTimeBetweenBreakthroughs / (60 * 1000))} minutes`,
      ],
      implications: [
        breakthroughMessages.length > 2
          ? 'User has frequent insights'
          : 'User may need more scaffolding for insights',
        avgTimeBetweenBreakthroughs < 30 * 60 * 1000
          ? 'User learns quickly'
          : 'User takes time to process',
      ],
      recommendations: [
        breakthroughMessages.length > 2
          ? 'Build on frequent insight moments'
          : 'Provide more structured discovery opportunities',
        avgTimeBetweenBreakthroughs < 30 * 60 * 1000
          ? 'Introduce more challenging concepts'
          : 'Break down complex concepts more',
      ],
    };
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagementPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
    timeWindow: number,
  ): LearningPattern | null {
    const recentMessages = conversationHistory.filter(
      (msg) => Date.now() - msg.timestamp <= timeWindow,
    );

    const userMessages = recentMessages.filter((msg) => msg.role === 'user');

    if (userMessages.length < 3) return null;

    // Calculate message length patterns
    const messageLengths = userMessages.map((msg) => msg.content.length);
    const avgMessageLength =
      messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length;
    const messageLengthVariance = this.calculateVariance(messageLengths);

    // Calculate response time patterns
    const responseTimes = this.calculateResponseTimes(recentMessages);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      type: 'engagement_pattern',
      description: `User engagement analysis: avg message length ${Math.round(avgMessageLength)}, avg response time ${Math.round(avgResponseTime / 1000)}s`,
      frequency: 1.0, // Always present when enough data
      confidence: Math.min(0.85, userContext.engagementLevel),
      indicators: [
        `Average message length: ${Math.round(avgMessageLength)} characters`,
        `Message length variance: ${Math.round(messageLengthVariance)}`,
        `Average response time: ${Math.round(avgResponseTime / 1000)}s`,
        `Engagement level: ${Math.round(userContext.engagementLevel * 100)}%`,
      ],
      implications: [
        avgMessageLength > 100 ? 'User provides detailed responses' : 'User gives brief responses',
        avgResponseTime < 30000 ? 'User responds quickly' : 'User takes time to respond',
        messageLengthVariance < 500
          ? 'User has consistent engagement'
          : 'User engagement varies significantly',
      ],
      recommendations: [
        avgMessageLength > 100
          ? 'Provide opportunities for detailed explanations'
          : 'Encourage more detailed responses',
        avgResponseTime < 30000
          ? 'User ready for fast-paced learning'
          : 'Allow more processing time',
        userContext.engagementLevel > 0.7
          ? 'Maintain current engagement level'
          : 'Find ways to increase engagement',
      ],
    };
  }

  /**
   * Analyze practice preferences
   */
  private analyzePracticePreferences(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
  ): LearningPattern | null {
    const practicePreferenceWords = [
      'more practice',
      'practice exercise',
      'hands-on',
      'practical example',
      'let me try',
      'can i practice',
      'need more practice',
    ];

    const avoidanceWords = [
      'no practice',
      'just theory',
      'not practice',
      'no hands-on',
      'just explain',
      'theory only',
      'no examples',
    ];

    const recentMessages = conversationHistory.filter(
      (msg) => Date.now() - msg.timestamp <= 24 * 60 * 60 * 1000, // 24 hours
    );

    const userMessages = recentMessages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content.toLowerCase());

    let practicePreferenceCount = 0;
    let practiceAvoidanceCount = 0;

    userMessages.forEach((message) => {
      if (practicePreferenceWords.some((word) => message.includes(word))) {
        practicePreferenceCount++;
      }
      if (avoidanceWords.some((word) => message.includes(word))) {
        practiceAvoidanceCount++;
      }
    });

    const totalMentions = practicePreferenceCount + practiceAvoidanceCount;
    if (totalMentions === 0) return null;

    const preferenceRatio = practicePreferenceCount / totalMentions;

    return {
      type: 'practice_preference',
      description: `User shows ${preferenceRatio > 0.6 ? 'strong' : preferenceRatio > 0.4 ? 'moderate' : 'low'} practice preference`,
      frequency: totalMentions / userMessages.length,
      confidence: Math.min(0.8, (totalMentions / userMessages.length) * 2),
      indicators: [
        `${practicePreferenceCount} practice preferences`,
        `${practiceAvoidanceCount} practice avoidances`,
        `Preference ratio: ${Math.round(preferenceRatio * 100)}%`,
      ],
      implications: [
        preferenceRatio > 0.6
          ? 'User strongly prefers practice-based learning'
          : preferenceRatio > 0.4
            ? 'User moderately prefers practice'
            : 'User may prefer theoretical learning',
      ],
      recommendations: [
        preferenceRatio > 0.6
          ? 'Provide frequent hands-on opportunities'
          : preferenceRatio > 0.4
            ? 'Balance practice with theory'
            : 'Focus on conceptual understanding first',
      ],
    };
  }

  /**
   * Identify stuck points from conversation and context
   */
  private identifyStuckPoints(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
  ): Array<{
    concept: string;
    stuckDuration: number;
    stuckLevel: 'mild' | 'moderate' | 'severe';
    recommendedActions: string[];
  }> {
    const stuckPoints: Array<{
      concept: string;
      stuckDuration: number;
      stuckLevel: 'mild' | 'moderate' | 'severe';
      recommendedActions: string[];
    }> = [];

    // Get stuck points from user context
    userContext.stuckPoints.forEach((concept) => {
      const stuckDuration = this.calculateStuckDuration(concept, conversationHistory);
      const stuckLevel = this.categorizeStuckLevel(stuckDuration, conversationHistory, concept);

      stuckPoints.push({
        concept,
        stuckDuration,
        stuckLevel,
        recommendedActions: this.generateStuckPointActions(
          concept,
          stuckLevel,
          conversationHistory,
        ),
      });
    });

    // Identify new stuck points from conversation patterns
    const newStuckConcepts = this.identifyNewStuckConcepts(conversationHistory);
    newStuckConcepts.forEach((concept) => {
      stuckPoints.push({
        concept,
        stuckDuration: 15 * 60 * 1000, // 15 minutes default
        stuckLevel: 'moderate',
        recommendedActions: [
          'Provide alternative explanations',
          'Use visual aids or diagrams',
          'Break down into smaller concepts',
          'Offer practical examples',
        ],
      });
    });

    return stuckPoints;
  }

  /**
   * Analyze progress indicators
   */
  private analyzeProgress(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
  ): Array<{
    concept: string;
    confidenceImprovement: number;
    masteryLevel: 'emerging' | 'developing' | 'proficient' | 'mastered';
  }> {
    const progressIndicators: Array<{
      concept: string;
      confidenceImprovement: number;
      masteryLevel: 'emerging' | 'developing' | 'proficient' | 'mastered';
    }> = [];

    userContext.recentConcepts.forEach((concept) => {
      const confidenceImprovement = this.calculateConfidenceImprovement(
        concept,
        conversationHistory,
      );
      const masteryLevel = this.determineMasteryLevel(concept.confidence, confidenceImprovement);

      if (confidenceImprovement > 0.1 || masteryLevel !== 'emerging') {
        progressIndicators.push({
          concept: concept.concept,
          confidenceImprovement,
          masteryLevel,
        });
      }
    });

    return progressIndicators;
  }

  /**
   * Generate practice recommendations
   */
  private async generatePracticeRecommendations(
    patterns: LearningPattern[],
    stuckPoints: Array<{ concept: string; stuckLevel: string }>,
    progressIndicators: Array<{ concept: string; masteryLevel: string }>,
    currentTopic?: string,
    userContext?: UserContext,
  ): Promise<PracticeRecommendation[]> {
    const recommendations: PracticeRecommendation[] = [];

    // Recommendations for stuck points
    stuckPoints.forEach((stuckPoint) => {
      recommendations.push({
        id: `remedial_${stuckPoint.concept}_${Date.now()}`,
        type: 'remedial_practice',
        conceptId: stuckPoint.concept,
        concept: stuckPoint.concept,
        conceptName: stuckPoint.concept,
        priority:
          stuckPoint.stuckLevel === 'severe'
            ? 'high'
            : stuckPoint.stuckLevel === 'moderate'
              ? 'medium'
              : 'low',
        description: `Address stuck point in ${stuckPoint.concept}`,
        instructions: `Targeted practice to clarify ${stuckPoint.concept}`,
        estimatedTime: 20,
        difficulty: 'easy',
        expectedOutcome: 'Clear up confusion and build confidence',
        prerequisites: [],
        learningObjectives: [`Clarify understanding of ${stuckPoint.concept}`],
        successCriteria: ['Demonstrate improved confidence', 'Complete practice without confusion'],
        personalized: true,
        customizations: {
          approach: 'gentle',
          feedbackStyle: 'encouraging',
        },
      });
    });

    // Recommendations for progress
    progressIndicators.forEach((progress) => {
      if (progress.masteryLevel === 'proficient' || progress.masteryLevel === 'mastered') {
        recommendations.push({
          id: `advancement_${progress.concept}_${Date.now()}`,
          type: 'advancement_practice',
          conceptId: progress.concept,
          concept: progress.concept,
          conceptName: progress.concept,
          priority: 'medium',
          description: `Build on existing mastery of ${progress.concept}`,
          instructions: `Advanced practice with ${progress.concept}`,
          estimatedTime: 25,
          difficulty: 'hard',
          expectedOutcome: 'Solidify and extend mastery',
          prerequisites: [],
          learningObjectives: [`Extend mastery of ${progress.concept}`],
          successCriteria: ['Complete advanced exercises', 'Apply concepts in complex scenarios'],
          personalized: true,
          customizations: {
            approach: 'challenging',
            feedbackStyle: 'constructive',
          },
        });
      }
    });

    // Recommendations based on patterns
    patterns.forEach((pattern) => {
      if (pattern.type === 'practice_preference' && pattern.frequency > 0.1) {
        recommendations.push({
          id: `preference_${currentTopic || 'general'}_${Date.now()}`,
          type: 'preference_aligned',
          conceptId: currentTopic || 'general',
          concept: currentTopic || 'general',
          conceptName: currentTopic || 'general',
          priority: 'medium',
          description: 'Align with user practice preferences',
          instructions: 'Practice opportunities matching user preferences',
          estimatedTime: 20,
          difficulty:
            (userContext?.preferences?.difficultyPreference === 'adaptive'
              ? 'medium'
              : userContext?.preferences?.difficultyPreference) || 'medium',
          expectedOutcome: 'High engagement and completion',
          prerequisites: [],
          learningObjectives: ['Practice according to user preferences'],
          successCriteria: ['Complete practice with high engagement'],
          personalized: true,
          customizations: {
            approach: 'user_preferred',
            feedbackStyle: userContext?.preferences?.feedbackStyle || 'encouraging',
          },
        });
      }
    });

    return recommendations;
  }

  /**
   * Calculate velocity metrics
   */
  private calculateVelocityMetrics(
    userContext: UserContext,
    progressIndicators: Array<{ confidenceImprovement: number }>,
  ): LearningVelocityMetrics {
    const baseVelocity = userContext.learningVelocity || 1.0;
    const confidenceImprovements = progressIndicators.map((p) => p.confidenceImprovement);
    const avgConfidenceImprovement =
      confidenceImprovements.length > 0
        ? confidenceImprovements.reduce((sum, imp) => sum + imp, 0) / confidenceImprovements.length
        : 0;

    // Adjust velocity based on recent progress
    const velocityAdjustment = Math.max(0.5, Math.min(1.5, 1 + avgConfidenceImprovement));
    const adjustedVelocity = baseVelocity * velocityAdjustment;

    return {
      userId: userContext.id,
      timeframe: 'overall',
      conceptsPerSession: 1,
      sessionsPerDay: 1,
      averageSessionLength: 30,
      masteryRate: 0.1,
      retentionRate: 0.8,
      improvementRate: avgConfidenceImprovement,
      currentVelocity: adjustedVelocity,
      velocityTrend:
        avgConfidenceImprovement > 0
          ? 'improving'
          : avgConfidenceImprovement < 0
            ? 'declining'
            : 'stable',
      confidenceVelocity: avgConfidenceImprovement,
      estimatedTimeToMastery: this.estimateTimeToMastery(adjustedVelocity),
      streakMetrics: {
        currentStreak: 0,
        longestStreak: 0,
        averageStreakLength: 0,
      },
      conceptDistribution: {},
      learningPattern: {
        peakHours: [],
        preferredDifficulty: 'medium',
        learningStyle: 'visual',
      },
      recommendations: [],
      calculatedAt: new Date(),
    };
  }

  /**
   * Generate next steps based on analysis
   */
  private generateNextSteps(
    patterns: LearningPattern[],
    stuckPoints: Array<{ concept: string; stuckLevel: string }>,
    progressIndicators: Array<{ concept: string; masteryLevel: string }>,
  ): string[] {
    const nextSteps: string[] = [];

    // Based on stuck points
    const severeStuckPoints = stuckPoints.filter((sp) => sp.stuckLevel === 'severe');
    if (severeStuckPoints.length > 0) {
      nextSteps.push('Focus on clearing up fundamental misunderstandings before advancing');
      nextSteps.push('Provide additional scaffolding and support for stuck concepts');
    }

    // Based on progress
    const masteredConcepts = progressIndicators.filter(
      (pi) => pi.masteryLevel === 'proficient' || pi.masteryLevel === 'mastered',
    );
    if (masteredConcepts.length > 2) {
      nextSteps.push('Introduce more advanced concepts to maintain challenge');
      nextSteps.push('Consider project-based practice combining multiple concepts');
    }

    // Based on patterns
    const engagementPattern = patterns.find((p) => p.type === 'engagement_pattern');
    if (engagementPattern && engagementPattern.confidence > 0.7) {
      nextSteps.push('Maintain current engagement strategies');
    }

    const practicePreferencePattern = patterns.find((p) => p.type === 'practice_preference');
    if (practicePreferencePattern && practicePreferencePattern.frequency > 0.3) {
      nextSteps.push('Increase frequency of hands-on practice opportunities');
    }

    return nextSteps.slice(0, 5); // Limit to top 5 next steps
  }

  // Helper methods
  private calculateAverageTimeBetween(times: number[]): number {
    if (times.length < 2) return 0;
    const sortedTimes = [...times].sort((a, b) => a - b);
    let totalDiff = 0;
    for (let i = 1; i < sortedTimes.length; i++) {
      totalDiff += sortedTimes[i] - sortedTimes[i - 1];
    }
    return totalDiff / (sortedTimes.length - 1);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateResponseTimes(messages: Array<{ role: string; timestamp: number }>): number[] {
    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1];
      const currentMsg = messages[i];
      if (prevMsg.role === 'assistant' && currentMsg.role === 'user') {
        responseTimes.push(currentMsg.timestamp - prevMsg.timestamp);
      }
    }
    return responseTimes;
  }

  private calculateStuckDuration(
    concept: string,
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  ): number {
    const conceptMessages = conversationHistory.filter((msg) =>
      msg.content.toLowerCase().includes(concept.toLowerCase()),
    );

    if (conceptMessages.length < 2) return 15 * 60 * 1000; // Default 15 minutes

    const firstMention = conceptMessages[0].timestamp;
    const lastMention = conceptMessages[conceptMessages.length - 1].timestamp;

    return lastMention - firstMention;
  }

  private categorizeStuckLevel(
    duration: number,
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    concept: string,
  ): 'mild' | 'moderate' | 'severe' {
    const stuckMessages = conversationHistory.filter(
      (msg) =>
        (msg.content.toLowerCase().includes(concept.toLowerCase()) &&
          msg.content.toLowerCase().includes('confused')) ||
        msg.content.toLowerCase().includes('stuck') ||
        msg.content.toLowerCase().includes("don't understand"),
    );

    const confusionFrequency = stuckMessages.length / conversationHistory.length;
    const durationInMinutes = duration / (60 * 1000);

    if (confusionFrequency > 0.3 || durationInMinutes > 30) {
      return 'severe';
    } else if (confusionFrequency > 0.15 || durationInMinutes > 15) {
      return 'moderate';
    } else {
      return 'mild';
    }
  }

  private generateStuckPointActions(
    concept: string,
    level: 'mild' | 'moderate' | 'severe',
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  ): string[] {
    const baseActions = [
      'Provide alternative explanations',
      'Use different examples or analogies',
      'Break down into smaller pieces',
    ];

    if (level === 'severe') {
      return [
        ...baseActions,
        'Return to fundamentals',
        'Use visual aids or diagrams',
        'Provide hands-on guided practice',
        'Check for prerequisite knowledge gaps',
      ];
    } else if (level === 'moderate') {
      return [
        ...baseActions,
        'Provide targeted practice exercises',
        'Use step-by-step approach',
        'Offer additional examples',
      ];
    } else {
      return baseActions;
    }
  }

  private identifyNewStuckConcepts(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  ): string[] {
    const confusionKeywords = [
      'confused',
      'stuck',
      "don't understand",
      'unclear',
      'difficult',
      'not sure',
      'lost',
      'help me',
      "can't figure",
      'struggling',
    ];

    const stuckConcepts = new Set<string>();

    conversationHistory.forEach((msg) => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();

        confusionKeywords.forEach((keyword) => {
          if (content.includes(keyword)) {
            // Try to extract the concept being discussed
            const conceptMatch = content.match(
              /\b(react|useState|hooks|component|function|class)\b/gi,
            );
            if (conceptMatch) {
              stuckConcepts.add(conceptMatch[0]);
            }
          }
        });
      }
    });

    return Array.from(stuckConcepts);
  }

  private calculateConfidenceImprovement(
    concept: { confidence: number; lastSeen: number },
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  ): number {
    const conceptMessages = conversationHistory.filter((msg) =>
      msg.content
        .toLowerCase()
        .includes((concept as any).concept?.toLowerCase() || concept.toString().toLowerCase()),
    );

    if (conceptMessages.length < 2) return 0;

    // Simple heuristic: confidence improves with successful practice and understanding indicators
    const understandingIndicators = conceptMessages.filter(
      (msg) =>
        msg.content.toLowerCase().includes('understand') ||
        msg.content.toLowerCase().includes('get it') ||
        msg.content.toLowerCase().includes('makes sense'),
    ).length;

    return Math.min(0.5, (understandingIndicators / conceptMessages.length) * 0.3);
  }

  private determineMasteryLevel(
    confidence: number,
    confidenceImprovement: number,
  ): 'emerging' | 'developing' | 'proficient' | 'mastered' {
    if (confidence < 0.3) return 'emerging';
    if (confidence < 0.6) return 'developing';
    if (confidence < 0.8) return 'proficient';
    return 'mastered';
  }

  private estimateTimeToMastery(velocity: number): number {
    // Time in hours to reach mastery (0.9 confidence) from current state (0.5)
    const confidenceGap = 0.9 - 0.5; // Assuming current confidence around 0.5
    return Math.max(1, confidenceGap / velocity);
  }
}
