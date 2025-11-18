/**
 * User Context Tracker
 *
 * Tracks user learning journey, maintains project awareness,
 * and updates context from conversation. Part of Phase 1
 * context-aware practice system implementation.
 */

import { ServiceDependencies } from '../types';
import {
  UserContextTracker as IUserContextTracker,
  UserContext,
  ContextUpdateRequest,
  ContextUpdateResult,
  ContextualFactors,
  LearningPersonality,
  AdaptiveLearningConfig,
  VibeType,
  DEFAULT_ADAPTIVE_CONFIG
} from '@/shared/types/practice';
import { VibeDetector } from '../analysis/vibe-detector';
import { LearningPatternAnalyzer, LearningPatternRequest } from '../analysis/learning-pattern-analyzer';

/**
 * User Context Tracker Service
 */
export class UserContextTracker implements IUserContextTracker {
  private readonly userId: string;
  private readonly sessionId: string;
  private readonly currentContext: UserContextTracker['currentContext'];
  private projectContext?: UserContextTracker['projectContext'];
  private readonly learningPatterns: UserContextTracker['learningPatterns'];
  private recentActivity: UserContextTracker['recentActivity'];
  private readonly stuckPointAnalysis: UserContextTracker['stuckPointAnalysis'];
  private readonly practiceHistory: UserContextTracker['practiceHistory'];
  private readonly cognitiveMetrics: UserContextTracker['cognitiveMetrics'];
  private readonly dependencies: ServiceDependencies;
  private readonly adaptiveConfig: AdaptiveLearningConfig;
  private readonly vibeDetector?: VibeDetector;
  private readonly learningPatternAnalyzer?: LearningPatternAnalyzer;
  private lastUpdateTime: number = 0;

  constructor(
    userId: string,
    sessionId: string,
    dependencies: ServiceDependencies,
    adaptiveConfig?: AdaptiveLearningConfig
  ) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.dependencies = dependencies;
    this.adaptiveConfig = adaptiveConfig || DEFAULT_ADAPTIVE_CONFIG;
    this.vibeDetector = new VibeDetector(dependencies.logger);
    this.learningPatternAnalyzer = new LearningPatternAnalyzer(dependencies.logger);

    // Initialize context
    this.currentContext = {
      topic: undefined,
      subtopics: [],
      confidenceLevel: 0.5,
      engagementLevel: 0.5,
      cognitiveLoad: 0.3,
      timeOnTopic: 0,
      recentConcepts: []
    };

    this.learningPatterns = [];
    this.recentActivity = [];
    this.stuckPointAnalysis = {
      currentStuckPoints: [],
      historicalStuckPoints: [],
      resolutionPatterns: []
    };
    this.practiceHistory = [];
    this.cognitiveMetrics = {
      currentVelocity: 1.0,
      averageVelocity: 1.0,
      retentionRate: 0.8,
      transferAbility: 0.7,
      fatigueLevel: 0.2,
      motivationLevel: 0.8
    };

    this.dependencies.logger.info('UserContextTracker initialized', {
      userId,
      sessionId,
      adaptiveConfig: this.adaptiveConfig.personalizationLevel
    });
  }

  /**
   * Update user context from new activity
   */
  async updateContext(request: ContextUpdateRequest): Promise<ContextUpdateResult> {
    try {
      const startTime = Date.now();
      this.lastUpdateTime = startTime;

      const changes = {
        newConcepts: [] as string[],
        confidenceChanges: {} as Record<string, number>,
        newStuckPoints: [] as string[],
        resolvedStuckPoints: [] as string[],
        learningPatterns: [] as any[]
      };

      // Process request based on message type
      switch (request.messageType) {
      case 'concept_introduction':
        this.handleConceptIntroduction(request, changes);
        break;
      case 'practice_completion':
        this.handlePracticeCompletion(request, changes);
        break;
      case 'user_message':
      case 'assistant_message':
        this.handleMessage(request, changes);
        break;
      default:
        this.dependencies.logger.debug(`Unhandled message type: ${request.messageType}`);
        break;
      }

      // Update contextual factors
      this.updateContextualFactors(request);

      // Add vibe detection integration
      if (this.vibeDetector && request.vibeDetection) {
        const vibeResult = await this.vibeDetector.detectVibe({
          conversationHistory: request.conversationHistory || this.recentActivity,
          userContext: this.currentContext,
          currentTopic: request.currentTopic,
          config: this.adaptiveConfig.vibeDetection
        });

        if (vibeResult.confidence > this.adaptiveConfig.vibeDetection.confidenceThreshold) {
          this.handleVibeDetected(request, {
            ...changes,
            newConcepts: [],
            confidenceChanges: {},
            newStuckPoints: [],
            resolvedStuckPoints: [],
            learningPatterns: []
          });
        }
      }

      // Add learning pattern analysis integration
      if (this.learningPatternAnalyzer && request.learningPatterns) {
        const patternResult = await this.learningPatternAnalyzer.analyzeLearningPatterns({
          userContext: this.currentContext,
          conversationHistory: request.conversationHistory || this.recentActivity,
          currentTopic: request.currentTopic,
          timeWindow: request.timeWindow
        });

        this.handleLearningPatternDetected(request, {
          ...changes,
          newConcepts: patternResult.patterns.map(p => p.concept || 'general'),
          confidenceChanges: {},
          newStuckPoints: [],
          resolvedStuckPoints: [],
          learningPatterns: [...this.learningPatterns, ...patternResult.patterns]
        });
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(changes);

      // Determine next steps
      const nextSteps = this.calculateNextSteps();

      const result: ContextUpdateResult = {
        updated: true,
        changes,
        recommendations,
        nextSteps
      };

      this.dependencies.logger.debug('Context updated successfully', {
        userId: this.userId,
        sessionId: this.sessionId,
        processingTime: Date.now() - startTime,
        changesCount: Object.keys(changes).length
      });

      return result;

    } catch (error) {
      this.dependencies.logger.error('Failed to update user context', error as Error);

      // Return safe fallback result
      return {
        updated: false,
        changes: {
          newConcepts: [],
          confidenceChanges: {},
          newStuckPoints: [],
          resolvedStuckPoints: [],
          learningPatterns: []
        },
        recommendations: [],
        nextSteps: {
          optimalPracticeTiming: 30,
          suggestedDifficulty: 'medium',
          focusAreas: []
        }
      };
    }
  }

  /**
   * Handle concept introduction in conversation
   */
  private handleConceptIntroduction(request: ContextUpdateRequest, changes: any): void {
    const { concepts, confidence = 0.5 } = request;

    for (const concept of concepts) {
      // Check if concept is new
      const existingConcept = this.currentContext.recentConcepts.find(
        c => c.concept === concept
      );

      if (!existingConcept) {
        changes.newConcepts.push(concept);
        this.currentContext.recentConcepts.push({
          concept,
          confidence,
          firstSeen: request.timestamp,
          lastSeen: request.timestamp,
          practiceCount: 0
        });

        // Start new learning pattern
        this.learningPatterns.push({
          id: `pattern_${Date.now()}_${concept}`,
          concept,
          startTime: request.timestamp,
          status: 'learning',
          confidenceProgression: [confidence],
          practiceAttempts: 0,
          successRate: 0,
          stuckPoints: []
        });
      } else {
        // Update existing concept
        existingConcept.lastSeen = request.timestamp;
        const oldConfidence = existingConcept.confidence;
        existingConcept.confidence = Math.max(oldConfidence, confidence);

        changes.confidenceChanges[concept] = existingConcept.confidence - oldConfidence;

        // Update learning pattern
        const pattern = this.learningPatterns.find(p => p.concept === concept && !p.endTime);
        if (pattern) {
          pattern.confidenceProgression.push(existingConcept.confidence);

          // Check for breakthrough
          if (existingConcept.confidence > 0.8 && oldConfidence <= 0.6) {
            pattern.breakthroughMoments.push({
              timestamp: request.timestamp,
              trigger: 'Confidence increase detected',
              confidenceBefore: oldConfidence,
              confidenceAfter: existingConcept.confidence
            });
          }
        }
      }
    }

    // Update current topic if new concepts were introduced
    if (concepts.length > 0) {
      this.currentContext.topic = concepts[0];
      this.currentContext.subtopics = concepts.slice(1);
    }
  }

  /**
   * Handle practice completion
   */
  private handlePracticeCompletion(request: ContextUpdateRequest, changes: any): void {
    if (!request.practiceResult) return;

    const { success, concept, duration, attempts } = request.practiceResult;

    // Add to practice history
    this.practiceHistory.push({
      id: `practice_${Date.now()}`,
      timestamp: request.timestamp,
      concept,
      type: 'coding', // Default, could be extracted from request
      difficulty: this.getDifficultyFromConfidence(),
      success,
      duration,
      vibe: this.detectVibeFromRequest(request),
      confidence: this.getConceptConfidence(concept),
      retryCount: attempts || 1
    });

    // Update concept confidence based on practice result
    const conceptRecord = this.currentContext.recentConcepts.find(c => c.concept === concept);
    if (conceptRecord) {
      const oldConfidence = conceptRecord.confidence;
      const confidenceDelta = success ? 0.1 : -0.05;
      conceptRecord.confidence = Math.min(1, Math.max(0, oldConfidence + confidenceDelta));
      conceptRecord.practiceCount++;
      conceptRecord.lastSeen = request.timestamp;

      changes.confidenceChanges[concept] = conceptRecord.confidence - oldConfidence;

      // Update learning pattern
      const pattern = this.learningPatterns.find(p => p.concept === concept && !p.endTime);
      if (pattern) {
        pattern.practiceAttempts++;
        const successRate = pattern.practiceAttempts > 0 ?
          (this.practiceHistory.filter(p => p.concept === concept && p.success).length / pattern.practiceAttempts) : 0;
        pattern.successRate = successRate;

        if (successRate >= 0.8 && pattern.confidenceProgression[pattern.confidenceProgression.length - 1] > 0.8) {
          pattern.status = 'mastered';
          pattern.endTime = request.timestamp;
        }
      }
    }

    // Update stuck points
    if (!success) {
      if (!this.stuckPointAnalysis.currentStuckPoints.includes(concept)) {
        this.stuckPointAnalysis.currentStuckPoints.push(concept);
        changes.newStuckPoints.push(concept);
      }
    } else {
      const index = this.stuckPointAnalysis.currentStuckPoints.indexOf(concept);
      if (index !== -1) {
        this.stuckPointAnalysis.currentStuckPoints.splice(index, 1);
        changes.resolvedStuckPoints.push(concept);

        // Record resolution pattern
        this.stuckPointAnalysis.resolutionPatterns.push({
          concept,
          resolutionMethod: 'practice_success',
          effectiveness: 0.8,
          timeToResolution: duration
        });
      }
    }

    // Update cognitive metrics
    this.updateCognitiveMetrics(request, success);
  }

  /**
   * Handle general message
   */
  private handleMessage(request: ContextUpdateRequest, changes: any): void {
    const { concepts, sentiment, confidence } = request;

    // Update engagement level based on message content and sentiment
    if (sentiment !== undefined) {
      // Map sentiment (-1 to 1) to engagement level (0 to 1)
      const sentimentBasedEngagement = (sentiment + 1) / 2;
      this.currentContext.engagementLevel = Math.max(0.1, sentimentBasedEngagement);
    }

    // Update confidence level
    if (confidence !== undefined) {
      const oldConfidence = this.currentContext.confidenceLevel;
      this.currentContext.confidenceLevel = Math.max(0, Math.min(1, confidence));
      changes.confidenceChanges['overall'] = this.currentContext.confidenceLevel - oldConfidence;
    }

    // Update cognitive load based on message complexity
    const messageComplexity = this.calculateMessageComplexity(request.content);
    this.currentContext.cognitiveLoad = Math.min(1, this.currentContext.cognitiveLoad + (messageComplexity * 0.1));

    // Add to recent activity
    this.recentActivity.push({
      type: request.messageType as any,
      concept: concepts[0] || 'general',
      timestamp: request.timestamp,
      outcome: undefined,
      confidence: confidence || 0.5
    });

    // Keep only recent activity (last 50 items)
    if (this.recentActivity.length > 50) {
      this.recentActivity = this.recentActivity.slice(-50);
    }
  }

  /**
   * Update contextual factors
   */
  private updateContextualFactors(request: ContextUpdateRequest): void {
    // Update time on topic
    if (this.currentContext.topic && request.concepts && request.concepts.includes(this.currentContext.topic)) {
      this.currentContext.timeOnTopic += (request.timestamp - this.lastUpdateTime) / 60000; // Convert to minutes
    }

    // Update cognitive metrics periodically
    const now = Date.now();
    if (now - this.lastUpdateTime > 60000) { // Every minute
      this.updateCognitiveMetrics(request, true);
    }
  }

  /**
   * Generate recommendations based on current context
   */
  private generateRecommendations(changes: any): Array<{
    type: string;
    priority: string;
    description: string;
    reasoning: string;
    estimatedImpact: number;
  }> {
    const recommendations = [];

    // Practice recommendation for understanding
    if (this.currentContext.confidenceLevel > 0.7 && this.currentContext.engagementLevel > 0.6) {
      recommendations.push({
        type: 'practice',
        priority: 'high',
        description: `Practice ${this.currentContext.topic || 'current concepts'} while engagement is high`,
        reasoning: 'High confidence and engagement indicate readiness for practice application',
        estimatedImpact: 0.8
      });
    }

    // Review recommendation for stuck points
    if (this.stuckPointAnalysis.currentStuckPoints.length > 0) {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        description: `Review stuck concepts: ${this.stuckPointAnalysis.currentStuckPoints.join(', ')}`,
        reasoning: 'Identified stuck points that need clarification',
        estimatedImpact: 0.7
      });
    }

    // Advance recommendation for mastered concepts
    const masteredConcepts = this.learningPatterns.filter(p => p.status === 'mastered');
    if (masteredConcepts.length > 0) {
      recommendations.push({
        type: 'advance',
        priority: 'low',
        description: `Advance to next level for mastered concepts`,
        reasoning: 'Several concepts have been mastered and are ready for advancement',
        estimatedImpact: 0.6
      });
    }

    // Break recommendation for cognitive overload
    if (this.currentContext.cognitiveLoad > 0.8) {
      recommendations.push({
        type: 'break',
        priority: 'high',
        description: 'Take a break to reduce cognitive load',
        reasoning: 'High cognitive load detected, break needed for optimal learning',
        estimatedImpact: 0.9
      });
    }

    return recommendations;
  }

  /**
   * Calculate next steps for user
   */
  private calculateNextSteps(): {
    optimalPracticeTiming: number;
    suggestedDifficulty: 'easy' | 'medium' | 'hard';
    focusAreas: string[];
    } {
    let optimalPracticeTiming = 30; // Default 30 minutes
    let suggestedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    const focusAreas: string[] = [];

    // Adjust timing based on cognitive load
    if (this.currentContext.cognitiveLoad > 0.7) {
      optimalPracticeTiming = 60; // Longer break needed
    } else if (this.currentContext.engagementLevel > 0.8) {
      optimalPracticeTiming = 15; // Can practice sooner
    }

    // Determine difficulty based on confidence and recent performance
    if (this.currentContext.confidenceLevel > 0.8 && this.getRecentSuccessRate() > 0.8) {
      suggestedDifficulty = 'hard';
    } else if (this.currentContext.confidenceLevel < 0.5 || this.getRecentSuccessRate() < 0.5) {
      suggestedDifficulty = 'easy';
    }

    // Determine focus areas
    if (this.stuckPointAnalysis.currentStuckPoints.length > 0) {
      focusAreas.push(...this.stuckPointAnalysis.currentStuckPoints);
    }
    if (this.currentContext.topic) {
      focusAreas.push(this.currentContext.topic);
    }

    return {
      optimalPracticeTiming,
      suggestedDifficulty,
      focusAreas: focusAreas.slice(0, 3) // Limit to top 3 focus areas
    };
  }

  /**
   * Update cognitive metrics
   */
  private updateCognitiveMetrics(request: ContextUpdateRequest, success?: boolean): void {
    // Calculate velocity based on recent concepts and practice success
    const recentConcepts = this.recentActivity.filter(a =>
      a.timestamp > Date.now() - 3600000 // Last hour
    ).length;

    this.cognitiveMetrics.currentVelocity = Math.max(0.1, recentConcepts / 10);

    // Update retention based on practice success
    if (success !== undefined) {
      const retentionChange = success ? 0.02 : -0.01;
      this.cognitiveMetrics.retentionRate = Math.max(0.1, Math.min(1,
        this.cognitiveMetrics.retentionRate + retentionChange));
    }

    // Update fatigue based on time and cognitive load
    const timeSinceStart = (Date.now() - (this.recentActivity[0]?.timestamp || Date.now())) / 3600000; // Hours
    this.cognitiveMetrics.fatigueLevel = Math.min(1, timeSinceStart * 0.1 + this.currentContext.cognitiveLoad * 0.3);

    // Update motivation based on engagement and success
    const motivationChange = (success ? 0.05 : -0.02) +
      (this.currentContext.engagementLevel - 0.5) * 0.1;
    this.cognitiveMetrics.motivationLevel = Math.max(0.1, Math.min(1,
      this.cognitiveMetrics.motivationLevel + motivationChange));

    // Update average velocity
    this.cognitiveMetrics.averageVelocity =
      (this.cognitiveMetrics.averageVelocity * 0.9) + (this.cognitiveMetrics.currentVelocity * 0.1);
  }

  /**
   * Calculate message complexity
   */
  private calculateMessageComplexity(content?: string): number {
    if (!content) return 0.5;

    const length = content.length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = length / Math.max(1, sentenceCount);

    // Simple complexity calculation based on length and structure
    return Math.min(1, (length / 500) + (avgSentenceLength / 50) * 0.3);
  }

  /**
   * Detect vibe from request
   */
  private detectVibeFromRequest(request: ContextUpdateRequest): VibeType {
    const { sentiment, confidence } = request;

    if (confidence && confidence > 0.8) {
      return 'breakthrough';
    } else if (sentiment && sentiment < -0.3) {
      return 'confused';
    } else if (confidence && confidence > 0.7) {
      return 'understanding';
    } else if (request.messageType === 'practice_completion') {
      return 'practicing';
    }

    return 'understanding'; // Default
  }

  /**
   * Get difficulty from confidence level
   */
  private getDifficultyFromConfidence(): 'easy' | 'medium' | 'hard' {
    if (this.currentContext.confidenceLevel > 0.8) return 'hard';
    if (this.currentContext.confidenceLevel < 0.4) return 'easy';
    return 'medium';
  }

  /**
   * Get confidence for a specific concept
   */
  private getConceptConfidence(concept: string): number {
    const conceptRecord = this.currentContext.recentConcepts.find(c => c.concept === concept);
    return conceptRecord?.confidence || this.currentContext.confidenceLevel;
  }

  /**
   * Get recent success rate
   */
  private getRecentSuccessRate(): number {
    const recentPractices = this.practiceHistory.slice(-10); // Last 10 practices
    if (recentPractices.length === 0) return 0.5;

    const successCount = recentPractices.filter(p => p.success).length;
    return successCount / recentPractices.length;
  }

  /**
   * Handle vibe detected event
   */
  private handleVibeDetected(request: ContextUpdateRequest, changes: any): void {
    // Implementation for handling vibe detection
    this.dependencies.logger.debug('Vibe detected', {
      vibe: request.vibeDetection,
      changes
    });
  }

  /**
   * Handle learning pattern detected event
   */
  private handleLearningPatternDetected(request: ContextUpdateRequest, changes: any): void {
    // Implementation for handling learning pattern detection
    this.dependencies.logger.debug('Learning pattern detected', {
      patterns: changes.learningPatterns,
      changes
    });
  }

  /**
   * Get current user context
   */
  getCurrentContext(): UserContext {
    return {
      id: this.userId,
      sessionId: this.sessionId,
      currentTopic: this.currentContext.topic,
      currentProject: this.projectContext,
      confidenceLevel: this.currentContext.confidenceLevel,
      learningVelocity: this.cognitiveMetrics.currentVelocity,
      stuckPoints: this.stuckPointAnalysis.currentStuckPoints,
      recentConcepts: this.currentContext.recentConcepts,
      practiceHistory: this.practiceHistory,
      lastPracticeTime: this.practiceHistory.length > 0 ?
        this.practiceHistory[this.practiceHistory.length - 1].timestamp : undefined,
      engagementLevel: this.currentContext.engagementLevel,
      preferences: {
        practiceFrequency: this.currentContext.topic ? 'medium' : 'low',
        difficultyPreference: this.getDifficultyFromConfidence(),
        feedbackStyle: 'encouraging'
      },
      statistics: {
        totalPracticeSessions: this.practiceHistory.length,
        successRate: this.getRecentSuccessRate(),
        averageSessionLength: this.practiceHistory.length > 0 ?
          this.practiceHistory.reduce((sum, p) => sum + p.duration, 0) / this.practiceHistory.length : 0,
        preferredPracticeTimes: [] // Could be implemented based on time analysis
      }
    };
  }

  /**
   * Set project context
   */
  setProjectContext(projectContext: UserContext['currentProject']): void {
    this.projectContext = projectContext;
    this.dependencies.logger.info('Project context updated', {
      userId: this.userId,
      project: projectContext?.name,
      type: projectContext?.type
    });
  }

  /**
   * Get learning analytics
   */
  getLearningAnalytics(): {
    patterns: UserContextTracker['learningPatterns'];
    cognitiveMetrics: UserContextTracker['cognitiveMetrics'];
    stuckPointAnalysis: UserContextTracker['stuckPointAnalysis'];
    performanceTrends: {
      confidenceTrend: number[];
      successRateTrend: number[];
      velocityTrend: number[];
    };
    } {
    // Calculate trends from recent data
    const confidenceTrend = this.recentActivity
      .slice(-20)
      .map(a => a.confidence);

    const successRateTrend = this.practiceHistory
      .slice(-10)
      .map(() => this.getRecentSuccessRate());

    const velocityTrend = this.recentActivity
      .slice(-20)
      .map((_, index) => {
        const olderConcepts = this.recentActivity.slice(0, Math.max(0, index - 10));
        const newerConcepts = this.recentActivity.slice(Math.max(0, index - 10), index);
        return newerConcepts.length - olderConcepts.length;
      });

    return {
      patterns: this.learningPatterns,
      cognitiveMetrics: this.cognitiveMetrics,
      stuckPointAnalysis: this.stuckPointAnalysis,
      performanceTrends: {
        confidenceTrend,
        successRateTrend,
        velocityTrend
      }
    };
  }

  /**
   * Dispose of context tracker
   */
  dispose(): void {
    this.dependencies.logger.info('UserContextTracker disposed', {
      userId: this.userId,
      sessionId: this.sessionId,
      totalConceptsTracked: this.currentContext.recentConcepts.length,
      totalPracticeSessions: this.practiceHistory.length
    });
  }
}