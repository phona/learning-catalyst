/**
 * User Context Tracker
 *
 * Tracks user learning journey, maintains project awareness,
 * and updates context from conversation. Part of Phase 1
 * context-aware practice system implementation.
 */

import type { ServiceDependencies } from '@/main/services/types';
import {
  UserContext,
  ContextUpdateRequest,
  ContextUpdateResult,
  AdaptiveLearningConfig,
  VibeType,
  DEFAULT_ADAPTIVE_CONFIG,
} from '@/shared/types/practice';
import { LearningPattern } from '@/shared/types/practice/practice-context';
import { LearningPatternAnalyzer } from '@/main/services/core/analysis/learning-pattern-analyzer';

type ProjectContextState = {
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

type LearningPatternState = {
  id: string;
  concept: string;
  startTime: number;
  endTime?: number;
  status: 'learning' | 'practicing' | 'mastered' | 'stuck' | 'abandoned';
  confidenceProgression: number[];
  practiceAttempts: number;
  successRate: number;
  stuckPoints: string[];
  breakthroughMoments: Array<{
    timestamp: number;
    trigger: string;
    confidenceBefore: number;
    confidenceAfter: number;
  }>;
};

type RecentConceptRecord = {
  concept: string;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  practiceCount: number;
};

type RecentActivityEntry = {
  type: 'concept_introduction' | 'practice_attempt' | 'breakthrough' | 'confusion' | 'help_request';
  concept: string;
  timestamp: number;
  outcome?: string;
  confidence: number;
};

type PracticeHistoryEntry = {
  id: string;
  timestamp: number;
  concept: string;
  type: 'coding' | 'quiz' | 'discussion' | 'debugging' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  success: boolean;
  duration: number;
  vibe: VibeType;
  confidence: number;
  retryCount: number;
};

type StuckPointAnalysisState = {
  currentStuckPoints: string[];
  historicalStuckPoints: string[];
  resolutionPatterns: Array<{
    concept: string;
    resolutionMethod: string;
    effectiveness: number;
    timeToResolution: number;
  }>;
};

type Recommendation = {
  type: 'practice' | 'review' | 'advance' | 'break';
  priority: 'high' | 'medium' | 'low';
  description: string;
  reasoning: string;
  estimatedImpact?: number;
};

type ContextChanges = ContextUpdateResult['changes'];

export const createUserContextTracker = (
  userId: string,
  sessionId: string,
  dependencies: ServiceDependencies,
  adaptiveConfig: AdaptiveLearningConfig = DEFAULT_ADAPTIVE_CONFIG,
) => {
  const currentContext = {
    topic: undefined as string | undefined,
    subtopics: [] as string[],
    confidenceLevel: 0.5,
    engagementLevel: 0.5,
    cognitiveLoad: 0.3,
    timeOnTopic: 0,
    recentConcepts: [] as RecentConceptRecord[],
  };

  let projectContext: ProjectContextState | undefined;

  const learningPatterns: LearningPatternState[] = [];
  const recentActivity: RecentActivityEntry[] = [];
  const stuckPointAnalysis: StuckPointAnalysisState = {
    currentStuckPoints: [],
    historicalStuckPoints: [],
    resolutionPatterns: [],
  };
  const practiceHistory: PracticeHistoryEntry[] = [];
  const cognitiveMetrics = {
    currentVelocity: 1.0,
    averageVelocity: 1.0,
    retentionRate: 0.8,
    transferAbility: 0.7,
    fatigueLevel: 0.2,
    motivationLevel: 0.8,
  };

  const learningPatternAnalyzer = new LearningPatternAnalyzer(dependencies.logger);
  let lastUpdateTime = 0;

  dependencies.logger.info('UserContextTracker initialized', {
    userId,
    sessionId,
    adaptiveConfig: adaptiveConfig.personalizationLevel,
  });

  const addConceptRecord = (concept: string, confidence: number, timestamp: number) => {
    const record: RecentConceptRecord = {
      concept,
      confidence,
      firstSeen: timestamp,
      lastSeen: timestamp,
      practiceCount: 0,
    };

    const pattern: LearningPatternState = {
      id: `pattern_${timestamp}_${concept}`,
      concept,
      startTime: timestamp,
      status: 'learning',
      confidenceProgression: [confidence],
      practiceAttempts: 0,
      successRate: 0,
      stuckPoints: [],
      breakthroughMoments: [],
    };

    currentContext.recentConcepts.push(record);
    learningPatterns.push(pattern);

    return { record, pattern };
  };

  const calculateMessageComplexity = (content?: string): number => {
    if (!content) return 0.5;

    const length = content.length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = length / Math.max(1, sentenceCount);

    return Math.min(1, length / 500 + (avgSentenceLength / 50) * 0.3);
  };

  const detectVibeFromRequest = (request: ContextUpdateRequest): VibeType => {
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

    return 'understanding';
  };

  const getDifficultyFromConfidence = (): 'easy' | 'medium' | 'hard' => {
    if (currentContext.confidenceLevel > 0.8) return 'hard';
    if (currentContext.confidenceLevel < 0.4) return 'easy';
    return 'medium';
  };

  const getConceptConfidence = (concept: string): number => {
    const conceptRecord = currentContext.recentConcepts.find((c) => c.concept === concept);
    return conceptRecord?.confidence ?? currentContext.confidenceLevel;
  };

  const getRecentSuccessRate = (): number => {
    const recentPractices = practiceHistory.slice(-10);
    if (recentPractices.length === 0) return 0.5;

    const successCount = recentPractices.filter((p) => p.success).length;
    return successCount / recentPractices.length;
  };

  const updateCognitiveMetrics = (request: ContextUpdateRequest, success?: boolean): void => {
    const recentConceptsCount = recentActivity.filter(
      (a) => a.timestamp > Date.now() - 3600000,
    ).length;
    cognitiveMetrics.currentVelocity = Math.max(0.1, recentConceptsCount / 10);

    if (success !== undefined) {
      const retentionChange = success ? 0.02 : -0.01;
      cognitiveMetrics.retentionRate = Math.max(
        0.1,
        Math.min(1, cognitiveMetrics.retentionRate + retentionChange),
      );
    }

    const timeSinceStart = (Date.now() - (recentActivity[0]?.timestamp ?? Date.now())) / 3600000;
    cognitiveMetrics.fatigueLevel = Math.min(
      1,
      timeSinceStart * 0.1 + currentContext.cognitiveLoad * 0.3,
    );

    const motivationChange =
      (success ? 0.05 : -0.02) + (currentContext.engagementLevel - 0.5) * 0.1;
    cognitiveMetrics.motivationLevel = Math.max(
      0.1,
      Math.min(1, cognitiveMetrics.motivationLevel + motivationChange),
    );

    cognitiveMetrics.averageVelocity =
      cognitiveMetrics.averageVelocity * 0.9 + cognitiveMetrics.currentVelocity * 0.1;
  };

  const generateRecommendations = (_changes: ContextChanges): Recommendation[] => {
    const focusAreasSet = new Set<string>(currentContext.subtopics);
    if (currentContext.topic) {
      focusAreasSet.add(currentContext.topic);
    }

    const recommendations: Recommendation[] = [];
    const practiceReady =
      currentContext.confidenceLevel > 0.7 && currentContext.engagementLevel > 0.6;

    if (practiceReady) {
      recommendations.push({
        type: 'practice',
        priority: 'high',
        description: `Practice ${Array.from(focusAreasSet).join(', ') || 'current concepts'} while engagement is high`,
        reasoning: 'High confidence and engagement indicate readiness for practice application',
      });
    }

    if (stuckPointAnalysis.currentStuckPoints.length > 0) {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        description: `Review stuck concepts: ${stuckPointAnalysis.currentStuckPoints.join(', ')}`,
        reasoning: 'Identified stuck points that need clarification',
      });
    }

    const highConfidenceConcepts = currentContext.recentConcepts.filter(
      (concept) => concept.confidence > 0.85,
    );
    if (highConfidenceConcepts.length >= 2) {
      recommendations.push({
        type: 'advance',
        priority: 'low',
        description: 'Advance to the next challenge for high-confidence concepts',
        reasoning: 'Multiple concepts show strong mastery patterns',
      });
    }

    if (currentContext.cognitiveLoad > 0.8) {
      recommendations.push({
        type: 'break',
        priority: 'high',
        description: 'Take a break to reduce cognitive load',
        reasoning: 'High cognitive load detected, break needed for optimal learning',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'advance',
        priority: 'medium',
        description: 'Explore foundational ideas at a steady pace',
        reasoning: 'No urgent signals—continue contextual exploration',
      });
    }

    return recommendations;
  };

  const calculateNextSteps = () => {
    let optimalPracticeTiming = 30;
    let suggestedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    const focusAreasSet = new Set<string>(currentContext.subtopics);
    if (currentContext.topic) {
      focusAreasSet.add(currentContext.topic);
    }

    if (currentContext.cognitiveLoad > 0.7) {
      optimalPracticeTiming = 60;
    } else if (currentContext.engagementLevel > 0.8) {
      optimalPracticeTiming = 15;
    }

    const successRate = getRecentSuccessRate();
    if (currentContext.confidenceLevel > 0.8 && successRate > 0.8) {
      suggestedDifficulty = 'hard';
    } else if (currentContext.confidenceLevel < 0.5 || successRate < 0.5) {
      suggestedDifficulty = 'easy';
    }

    if (focusAreasSet.size === 0) {
      focusAreasSet.add('general');
    }

    return {
      optimalPracticeTiming,
      optimalTiming: optimalPracticeTiming,
      suggestedDifficulty,
      focusAreas: Array.from(focusAreasSet).slice(0, 3),
    };
  };

  const handleLearningPatternDetected = (
    _request: ContextUpdateRequest,
    changes: ContextChanges,
  ): void => {
    dependencies.logger.debug('Learning pattern detected', {
      patterns: changes.learningPatterns,
      changes,
    });
  };

  const handleConceptIntroduction = (
    request: ContextUpdateRequest,
    changes: ContextChanges,
  ): void => {
    const concepts = request.concepts ?? [];
    const confidence = request.confidence ?? 0.5;

    if (request.sentiment !== undefined) {
      currentContext.engagementLevel = Math.max(
        currentContext.engagementLevel,
        (request.sentiment + 1) / 2,
      );
    }

    currentContext.confidenceLevel = Math.max(currentContext.confidenceLevel, confidence);

    for (const concept of concepts) {
      const existingConcept = currentContext.recentConcepts.find((c) => c.concept === concept);

      if (!existingConcept) {
        const { record, pattern } = addConceptRecord(concept, confidence, request.timestamp);
        changes.newConcepts.push(concept);
        // Convert LearningPatternState to LearningPattern
        const learningPattern: LearningPattern = {
          type: pattern.status,
          description: `Learning pattern for ${concept}`,
          frequency: pattern.practiceAttempts,
          confidence: pattern.confidenceProgression[pattern.confidenceProgression.length - 1] || 0,
          indicators: [`Status: ${pattern.status}`, `Attempts: ${pattern.practiceAttempts}`],
          implications:
            pattern.stuckPoints.length > 0 ? ['May need additional support'] : ['Progressing well'],
          recommendations:
            pattern.status === 'mastered' ? ['Advance to next topic'] : ['Continue practice'],
        };
        changes.learningPatterns.push(learningPattern);
      } else {
        existingConcept.lastSeen = request.timestamp;
        const oldConfidence = existingConcept.confidence;
        existingConcept.confidence = Math.max(oldConfidence, confidence);

        changes.confidenceChanges[concept] = existingConcept.confidence - oldConfidence;

        const matchingPattern = learningPatterns.find((p) => p.concept === concept && !p.endTime);
        if (matchingPattern) {
          matchingPattern.confidenceProgression.push(existingConcept.confidence);

          if (existingConcept.confidence > 0.8 && oldConfidence <= 0.6) {
            matchingPattern.breakthroughMoments.push({
              timestamp: request.timestamp,
              trigger: 'Confidence increase detected',
              confidenceBefore: oldConfidence,
              confidenceAfter: existingConcept.confidence,
            });
          }
        }
      }
    }

    if (concepts.length > 0) {
      currentContext.topic = concepts[0];
      currentContext.subtopics = concepts.slice(1);
    }
  };

  const handlePracticeCompletion = (
    request: ContextUpdateRequest,
    changes: ContextChanges,
  ): void => {
    if (!request.practiceResult) return;

    const { success, concept, duration, attempts } = request.practiceResult;

    practiceHistory.push({
      id: `practice_${Date.now()}`,
      timestamp: request.timestamp,
      concept,
      type: 'coding',
      difficulty: getDifficultyFromConfidence(),
      success,
      duration,
      vibe: detectVibeFromRequest(request),
      confidence: getConceptConfidence(concept),
      retryCount: attempts || 1,
    });

    let conceptRecord = currentContext.recentConcepts.find((c) => c.concept === concept);
    if (!conceptRecord) {
      const { record, pattern } = addConceptRecord(
        concept,
        request.confidence ?? 0.5,
        request.timestamp,
      );
      conceptRecord = record;
      changes.newConcepts.push(concept);
      // Convert LearningPatternState to LearningPattern
      const learningPattern: LearningPattern = {
        type: pattern.status,
        description: `Learning pattern for ${concept}`,
        frequency: pattern.practiceAttempts,
        confidence: pattern.confidenceProgression[pattern.confidenceProgression.length - 1] || 0,
        indicators: [`Status: ${pattern.status}`, `Attempts: ${pattern.practiceAttempts}`],
        implications:
          pattern.stuckPoints.length > 0 ? ['May need additional support'] : ['Progressing well'],
        recommendations:
          pattern.status === 'mastered' ? ['Advance to next topic'] : ['Continue practice'],
      };
      changes.learningPatterns.push(learningPattern);
    }

    const oldConfidence = conceptRecord.confidence;
    const confidenceDelta = success ? 0.1 : -0.05;
    conceptRecord.confidence = Math.min(1, Math.max(0, oldConfidence + confidenceDelta));
    conceptRecord.practiceCount++;
    conceptRecord.lastSeen = request.timestamp;
    currentContext.confidenceLevel = Math.max(
      currentContext.confidenceLevel,
      conceptRecord.confidence,
    );

    changes.confidenceChanges[concept] = conceptRecord.confidence - oldConfidence;

    const activePattern = learningPatterns.find((p) => p.concept === concept && !p.endTime);
    if (activePattern) {
      activePattern.practiceAttempts++;
      const successRate =
        activePattern.practiceAttempts > 0
          ? practiceHistory.filter((p) => p.concept === concept && p.success).length /
            activePattern.practiceAttempts
          : 0;
      activePattern.successRate = successRate;

      if (
        successRate >= 0.8 &&
        activePattern.confidenceProgression[activePattern.confidenceProgression.length - 1] > 0.8
      ) {
        activePattern.status = 'mastered';
        activePattern.endTime = request.timestamp;
      }
    }

    if (!success) {
      if (!stuckPointAnalysis.currentStuckPoints.includes(concept)) {
        stuckPointAnalysis.currentStuckPoints.push(concept);
        changes.newStuckPoints.push(concept);
      }
    } else {
      const index = stuckPointAnalysis.currentStuckPoints.indexOf(concept);
      if (index !== -1) {
        stuckPointAnalysis.currentStuckPoints.splice(index, 1);
        changes.resolvedStuckPoints.push(concept);

        stuckPointAnalysis.resolutionPatterns.push({
          concept,
          resolutionMethod: 'practice_success',
          effectiveness: 0.8,
          timeToResolution: duration,
        });
      }
    }

    updateCognitiveMetrics(request, success);
  };

  const handleMessage = (request: ContextUpdateRequest, changes: ContextChanges): void => {
    const concepts = request.concepts ?? [];
    const { sentiment, confidence } = request;

    if (sentiment !== undefined) {
      const sentimentBasedEngagement = (sentiment + 1) / 2;
      currentContext.engagementLevel = Math.max(0.1, sentimentBasedEngagement);
    }

    if (confidence !== undefined) {
      const oldConfidence = currentContext.confidenceLevel;
      currentContext.confidenceLevel = Math.max(0, Math.min(1, confidence));
      changes.confidenceChanges['overall'] = currentContext.confidenceLevel - oldConfidence;
    }

    const messageComplexity = calculateMessageComplexity(request.content);
    currentContext.cognitiveLoad = Math.min(
      1,
      currentContext.cognitiveLoad + messageComplexity * 0.1,
    );

    const primaryConcept = concepts[0] ?? 'general';
    recentActivity.push({
      type: request.messageType as any,
      concept: primaryConcept,
      timestamp: request.timestamp,
      outcome: undefined,
      confidence: confidence ?? 0.5,
    });

    if (recentActivity.length > 50) {
      recentActivity.splice(0, recentActivity.length - 50);
    }
  };

  const updateContextualFactors = (request: ContextUpdateRequest): void => {
    if (currentContext.topic && request.concepts?.includes(currentContext.topic)) {
      currentContext.timeOnTopic += (request.timestamp - lastUpdateTime) / 60000;
    }

    const now = Date.now();
    if (now - lastUpdateTime > 60000) {
      updateCognitiveMetrics(request, true);
    }
  };

  const updateContext = async (request: ContextUpdateRequest): Promise<ContextUpdateResult> => {
    try {
      const startTime = Date.now();
      lastUpdateTime = startTime;

      const changes: ContextChanges = {
        newConcepts: [],
        confidenceChanges: {},
        newStuckPoints: [],
        resolvedStuckPoints: [],
        learningPatterns: [],
      };

      switch (request.messageType) {
      case 'concept_introduction':
        handleConceptIntroduction(request, changes);
        break;
      case 'practice_completion':
        handlePracticeCompletion(request, changes);
        break;
      case 'user_message':
      case 'assistant_message':
        handleMessage(request, changes);
        break;
      default:
        dependencies.logger.debug(`Unhandled message type: ${request.messageType}`);
        break;
      }

      updateContextualFactors(request);

      try {
        const patternResult = await learningPatternAnalyzer.analyzeLearningPatterns({
          userContext: getCurrentContext(),
          conversationHistory: recentActivity.map((activity) => ({
            role: activity.type === 'concept_introduction' ? 'assistant' : 'user',
            content: activity.outcome || 'Activity',
            timestamp: activity.timestamp,
          })),
          currentTopic: currentContext.topic,
          timeWindow: 24,
        });

        // Convert LearningPatternState array to LearningPattern array
        const convertedPatterns: LearningPattern[] = learningPatterns.map((pattern) => ({
          type: pattern.status,
          description: `Learning pattern for ${pattern.concept}`,
          frequency: pattern.practiceAttempts,
          confidence: pattern.confidenceProgression[pattern.confidenceProgression.length - 1] || 0,
          indicators: [`Status: ${pattern.status}`, `Attempts: ${pattern.practiceAttempts}`],
          implications:
            pattern.stuckPoints.length > 0 ? ['May need additional support'] : ['Progressing well'],
          recommendations:
            pattern.status === 'mastered' ? ['Advance to next topic'] : ['Continue practice'],
        }));

        handleLearningPatternDetected(request, {
          ...changes,
          newConcepts: patternResult.patterns.map((p) => (p as any).concept || 'general'),
          confidenceChanges: {},
          newStuckPoints: [],
          resolvedStuckPoints: [],
          learningPatterns: [...convertedPatterns, ...patternResult.patterns],
        });
      } catch (error) {
        dependencies.logger.warn('Learning pattern analysis failed', error as Error);
      }

      const recommendations = generateRecommendations(changes);
      const nextSteps = calculateNextSteps();

      const result: ContextUpdateResult = {
        updated: true,
        changes,
        recommendations,
        nextSteps,
      };

      dependencies.logger.debug('Context updated successfully', {
        userId,
        sessionId,
        processingTime: Date.now() - startTime,
        changesCount: Object.keys(changes).length,
      });

      return result;
    } catch (error) {
      dependencies.logger.error('Failed to update user context', error as Error);

      return {
        updated: false,
        changes: {
          newConcepts: [],
          confidenceChanges: {},
          newStuckPoints: [],
          resolvedStuckPoints: [],
          learningPatterns: [],
        },
        recommendations: [],
        nextSteps: {
          optimalPracticeTiming: 30,
          suggestedDifficulty: 'medium',
          focusAreas: [],
        },
      };
    }
  };

  const getCurrentContext = (): UserContext => {
    const transformedPracticeHistory = practiceHistory.map((practice) => ({
      timestamp: practice.timestamp,
      type: practice.type,
      success: practice.success,
      topic: practice.concept,
      vibe: practice.vibe,
      duration: practice.duration,
    }));

    const transformedProjectContext = projectContext
      ? {
        name: projectContext.name,
        type: projectContext.type,
        files: projectContext.recentFiles.map((file) => file.path),
        recentActivity: projectContext.recentFiles.map(
          (file) => `${file.path}: ${file.concepts.join(', ')}`,
        ),
      }
      : undefined;

    return {
      id: userId,
      sessionId,
      currentTopic: currentContext.topic,
      currentProject: transformedProjectContext,
      confidenceLevel: currentContext.confidenceLevel,
      learningVelocity: cognitiveMetrics.currentVelocity,
      stuckPoints: stuckPointAnalysis.currentStuckPoints,
      recentConcepts: currentContext.recentConcepts,
      practiceHistory: transformedPracticeHistory,
      lastPracticeTime:
        practiceHistory.length > 0
          ? practiceHistory[practiceHistory.length - 1].timestamp
          : undefined,
      engagementLevel: currentContext.engagementLevel,
      preferences: {
        practiceFrequency: currentContext.topic ? 'medium' : 'low',
        difficultyPreference: getDifficultyFromConfidence(),
        feedbackStyle: 'encouraging',
      },
      statistics: {
        totalPracticeSessions: practiceHistory.length,
        successRate: getRecentSuccessRate(),
        averageSessionLength:
          practiceHistory.length > 0
            ? practiceHistory.reduce((sum, p) => sum + p.duration, 0) / practiceHistory.length
            : 0,
        preferredPracticeTimes: [],
      },
    };
  };

  const setProjectContext = (projectContextUpdate: UserContext['currentProject']): void => {
    projectContext = projectContextUpdate
      ? {
        name: projectContextUpdate.name,
        type: projectContextUpdate.type,
        technologies: projectContextUpdate.files || [],
        recentFiles:
            projectContextUpdate.files?.map((file) => ({
              path: file,
              lastModified: Date.now(),
              concepts: [],
            })) || [],
        challenges: [],
      }
      : undefined;

    dependencies.logger.info('Project context updated', {
      userId,
      project: projectContextUpdate?.name,
      type: projectContextUpdate?.type,
    });
  };

  const getLearningAnalytics = () => {
    const confidenceTrend = recentActivity.slice(-20).map((a) => a.confidence);

    const successRateTrend = practiceHistory.slice(-10).map(() => getRecentSuccessRate());

    const velocityTrend = recentActivity.slice(-20).map((_, index) => {
      const olderConcepts = recentActivity.slice(0, Math.max(0, index - 10));
      const newerConcepts = recentActivity.slice(Math.max(0, index - 10), index);
      return newerConcepts.length - olderConcepts.length;
    });

    return {
      patterns: learningPatterns,
      cognitiveMetrics,
      stuckPointAnalysis,
      performanceTrends: {
        confidenceTrend,
        successRateTrend,
        velocityTrend,
      },
    };
  };

  const dispose = (): void => {
    dependencies.logger.info('UserContextTracker disposed', {
      userId,
      sessionId,
      totalConceptsTracked: currentContext.recentConcepts.length,
      totalPracticeSessions: practiceHistory.length,
    });
  };

  return {
    userId,
    sessionId,
    updateContext,
    getCurrentContext,
    setProjectContext,
    getLearningAnalytics,
    dispose,
  };
};

export type UserContextTrackerService = ReturnType<typeof createUserContextTracker>;
