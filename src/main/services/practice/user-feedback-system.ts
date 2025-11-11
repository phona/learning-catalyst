/**
 * User Feedback Collection System
 *
 * Collects, analyzes, and learns from user feedback to continuously
 * improve the practice suggestion system and user experience.
 */

import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { UserLearningContext, VibeType } from '../../../../shared/types/electron-api/chat-api';

export interface UserFeedback {
  id: string;
  userId: string;
  sessionId: string;
  practiceId?: string;
  timestamp: number;
  type: 'practice_suggestion' | 'exercise_quality' | 'naturalness' | 'timing' | 'overall';
  rating: number; // 1-5 stars
  feedback: string;
  context: {
    vibe: VibeType;
    topic: string;
    difficulty: string;
    practiceType: string;
    projectRelevant: boolean;
  };
  metrics: {
    responseTime: number;
    suggestionAccepted: boolean;
    timeToAccept: number;
    exerciseCompleted: boolean;
    exerciseScore: number;
  };
  metadata: {
    userAgent?: string;
    sessionLength: number;
    previousFeedback: number;
    userLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface FeedbackAnalysis {
  overallSatisfaction: number;
  satisfactionByVibe: Record<VibeType, number>;
  satisfactionByDifficulty: Record<string, number>;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }>;
  improvementAreas: string[];
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
}

export interface AdaptiveImprovement {
  area: string;
  priority: number;
  suggestedChanges: Array<{
    type: 'prompt_template' | 'timing_adjustment' | 'difficulty_scaling' | 'vibe_detection';
    change: string;
    expectedImpact: number;
    confidence: number;
  }>;
}

export interface FeedbackConfig {
  enableRealTimeAnalysis: boolean;
  enableAdaptiveLearning: boolean;
  enableABTesting: boolean;
  feedbackWeightDecay: number;
  minFeedbackCount: number;
  analysisInterval: number;
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  enableRealTimeAnalysis: true,
  enableAdaptiveLearning: true,
  enableABTesting: true,
  feedbackWeightDecay: 0.9, // Decay factor for older feedback
  minFeedbackCount: 10,
  analysisInterval: 60 * 60 * 1000 // 1 hour
};

/**
 * User Feedback System
 */
export class UserFeedbackSystem {
  private logger: any;
  private config: FeedbackConfig;

  // Feedback storage
  private feedback: Map<string, UserFeedback[]> = new Map();
  private feedbackWeights = new Map<string, number>(); // Weighted feedback importance

  // Analysis and learning
  private lastAnalysis: FeedbackAnalysis | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private improvementQueue: AdaptiveImprovement[] = [];

  // A/B testing
  private abTests = new Map<string, {
    variants: Map<string, any>;
    distribution: Map<string, number>;
    performance: Map<string, number>;
  }>();

  constructor(dependencies: ServiceDependencies, config: Partial<FeedbackConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_FEEDBACK_CONFIG, ...config };

    this.startPeriodicAnalysis();

    this.logger.info('UserFeedbackSystem initialized', {
      config: this.config
    });
  }

  /**
   * Collect user feedback
   */
  async collectFeedback(feedbackData: Partial<UserFeedback>): Promise<string> {
    const feedback: UserFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: feedbackData.userId || 'anonymous',
      sessionId: feedbackData.sessionId || 'unknown',
      practiceId: feedbackData.practiceId,
      timestamp: Date.now(),
      type: feedbackData.type || 'overall',
      rating: Math.max(1, Math.min(5, feedbackData.rating || 3)),
      feedback: feedbackData.feedback || '',
      context: {
        vibe: feedbackData.context?.vibe || 'understanding',
        topic: feedbackData.context?.topic || 'unknown',
        difficulty: feedbackData.context?.difficulty || 'medium',
        practiceType: feedbackData.context?.practiceType || 'general',
        projectRelevant: feedbackData.context?.projectRelevant || false
      },
      metrics: {
        responseTime: feedbackData.metrics?.responseTime || 0,
        suggestionAccepted: feedbackData.metrics?.suggestionAccepted || false,
        timeToAccept: feedbackData.metrics?.timeToAccept || 0,
        exerciseCompleted: feedbackData.metrics?.exerciseCompleted || false,
        exerciseScore: feedbackData.metrics?.exerciseScore || 0
      },
      metadata: {
        userAgent: feedbackData.metadata?.userAgent,
        sessionLength: feedbackData.metadata?.sessionLength || 0,
        previousFeedback: this.getUserPreviousFeedbackCount(feedbackData.userId || 'anonymous'),
        userLevel: feedbackData.metadata?.userLevel || 'intermediate'
      }
    };

    // Store feedback
    this.storeFeedback(feedback);

    // Trigger immediate analysis if enabled
    if (this.config.enableRealTimeAnalysis) {
      this.triggerImmediateAnalysis();
    }

    // Update A/B test results if applicable
    this.updateABTestResults(feedback);

    this.logger.info('Feedback collected', {
      feedbackId: feedback.id,
      userId: feedback.userId,
      rating: feedback.rating,
      type: feedback.type
    });

    return feedback.id;
  }

  /**
   * Store feedback with weighted importance
   */
  private storeFeedback(feedback: UserFeedback): void {
    const key = this.getFeedbackKey(feedback);

    if (!this.feedback.has(key)) {
      this.feedback.set(key, []);
    }

    const feedbackList = this.feedback.get(key)!;
    feedbackList.push(feedback);

    // Apply time-based weighting
    const weight = this.calculateFeedbackWeight(feedback);
    this.feedbackWeights.set(feedback.id, weight);

    // Limit feedback list size (keep most recent 1000)
    if (feedbackList.length > 1000) {
      const removed = feedbackList.shift()!;
      this.feedbackWeights.delete(removed.id);
    }
  }

  /**
   * Get feedback key for categorization
   */
  private getFeedbackKey(feedback: UserFeedback): string {
    return `${feedback.type}_${feedback.context.vibe}_${feedback.context.difficulty}`;
  }

  /**
   * Calculate feedback weight based on recency and user level
   */
  private calculateFeedbackWeight(feedback: UserFeedback): number {
    const now = Date.now();
    const ageInHours = (now - feedback.timestamp) / (1000 * 60 * 60);

    // Time decay
    let weight = Math.pow(this.config.feedbackWeightDecay, ageInHours);

    // User level weighting
    const levelMultipliers = {
      beginner: 1.2, // Beginners' feedback is very valuable
      intermediate: 1.0,
      advanced: 0.8  // Advanced users might be more critical
    };

    weight *= levelMultipliers[feedback.metadata.userLevel];

    // Rating quality weighting
    const ratingMultiplier = feedback.rating >= 4 ? 1.1 : feedback.rating <= 2 ? 1.2 : 1.0;
    weight *= ratingMultiplier;

    return weight;
  }

  /**
   * Trigger immediate analysis for critical feedback
   */
  private triggerImmediateAnalysis(): void {
    // Check for critical feedback (rating <= 2)
    const recentFeedback = Array.from(this.feedback.values())
      .flat()
      .filter(f => Date.now() - f.timestamp < 5 * 60 * 1000) // Last 5 minutes
      .filter(f => f.rating <= 2);

    if (recentFeedback.length >= 3) {
      this.logger.warn('Multiple low ratings detected, triggering immediate analysis', {
        count: recentFeedback.length,
        ratings: recentFeedback.map(f => f.rating)
      });

      this.performAnalysis();
    }
  }

  /**
   * Get user's previous feedback count
   */
  private getUserPreviousFeedbackCount(userId: string): number {
    return Array.from(this.feedback.values())
      .flat()
      .filter(f => f.userId === userId)
      .length;
  }

  /**
   * Analyze all collected feedback
   */
  async analyzeFeedback(): Promise<FeedbackAnalysis> {
    try {
      this.logger.info('Starting feedback analysis');

      const allFeedback = Array.from(this.feedback.values()).flat();

      if (allFeedback.length < this.config.minFeedbackCount) {
        this.logger.info('Insufficient feedback for analysis', {
          current: allFeedback.length,
          required: this.config.minFeedbackCount
        });

        return this.createEmptyAnalysis();
      }

      // Calculate overall satisfaction
      const overallSatisfaction = this.calculateWeightedSatisfaction(allFeedback);

      // Analyze by vibe type
      const satisfactionByVibe = this.analyzeByVibe(allFeedback);

      // Analyze by difficulty
      const satisfactionByDifficulty = this.analyzeByDifficulty(allFeedback);

      // Identify common issues
      const commonIssues = this.identifyCommonIssues(allFeedback);

      // Determine improvement areas
      const improvementAreas = this.identifyImprovementAreas(commonIssues);

      // Analyze trends
      const trends = this.analyzeTrends(allFeedback);

      const analysis: FeedbackAnalysis = {
        overallSatisfaction,
        satisfactionByVibe,
        satisfactionByDifficulty,
        commonIssues,
        improvementAreas,
        trends
      };

      this.lastAnalysis = analysis;

      // Generate improvement suggestions
      if (this.config.enableAdaptiveLearning) {
        this.generateImprovementSuggestions(analysis);
      }

      this.logger.info('Feedback analysis completed', {
        overallSatisfaction,
        totalFeedback: allFeedback.length,
        improvementAreas: improvementAreas.length
      });

      return analysis;

    } catch (error) {
      this.logger.error('Feedback analysis failed', error as Error);
      return this.createEmptyAnalysis();
    }
  }

  /**
   * Calculate weighted satisfaction score
   */
  private calculateWeightedSatisfaction(feedback: UserFeedback[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const f of feedback) {
      const weight = this.feedbackWeights.get(f.id) || 1;
      weightedSum += f.rating * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 3;
  }

  /**
   * Analyze satisfaction by vibe type
   */
  private analyzeByVibe(feedback: UserFeedback[]): Record<VibeType, number> {
    const vibeScores: Record<VibeType, { sum: number; weight: number }> = {
      confused: { sum: 0, weight: 0 },
      understanding: { sum: 0, weight: 0 },
      breakthrough: { sum: 0, weight: 0 },
      practicing: { sum: 0, weight: 0 },
      misunderstanding: { sum: 0, weight: 0 }
    };

    for (const f of feedback) {
      const weight = this.feedbackWeights.get(f.id) || 1;
      vibeScores[f.context.vibe].sum += f.rating * weight;
      vibeScores[f.context.vibe].weight += weight;
    }

    const result: Record<VibeType, number> = {} as any;
    for (const [vibe, scores] of Object.entries(vibeScores)) {
      result[vibe as VibeType] = scores.weight > 0 ? scores.sum / scores.weight : 3;
    }

    return result;
  }

  /**
   * Analyze satisfaction by difficulty
   */
  private analyzeByDifficulty(feedback: UserFeedback[]): Record<string, number> {
    const difficultyScores: Record<string, { sum: number; weight: number }> = {};

    for (const f of feedback) {
      const difficulty = f.context.difficulty;
      if (!difficultyScores[difficulty]) {
        difficultyScores[difficulty] = { sum: 0, weight: 0 };
      }

      const weight = this.feedbackWeights.get(f.id) || 1;
      difficultyScores[difficulty].sum += f.rating * weight;
      difficultyScores[difficulty].weight += weight;
    }

    const result: Record<string, number> = {};
    for (const [difficulty, scores] of Object.entries(difficultyScores)) {
      result[difficulty] = scores.weight > 0 ? scores.sum / scores.weight : 3;
    }

    return result;
  }

  /**
   * Identify common issues from feedback
   */
  private identifyCommonIssues(feedback: UserFeedback[]): Array<{
    issue: string;
    frequency: number;
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }> {
    const issueMap = new Map<string, {
      count: number;
      avgRating: number;
      examples: string[];
      types: Set<string>;
    }>();

    // Extract issues from feedback text
    for (const f of feedback) {
      if (f.rating <= 3) { // Only consider negative/neutral feedback
        const issues = this.extractIssuesFromText(f.feedback);

        for (const issue of issues) {
          if (!issueMap.has(issue)) {
            issueMap.set(issue, {
              count: 0,
              avgRating: 0,
              examples: [],
              types: new Set()
            });
          }

          const issueData = issueMap.get(issue)!;
          issueData.count++;
          issueData.avgRating = (issueData.avgRating * (issueData.count - 1) + f.rating) / issueData.count;
          issueData.examples.push(f.feedback);
          issueData.types.add(f.type);
        }
      }
    }

    // Convert to final format with severity and suggestions
    const issues: Array<{
      issue: string;
      frequency: number;
      severity: 'low' | 'medium' | 'high';
      suggestions: string[];
    }> = [];

    for (const [issueText, data] of issueMap.entries()) {
      const severity = data.avgRating <= 2 ? 'high' : data.avgRating <= 3 ? 'medium' : 'low';
      const suggestions = this.generateSuggestionsForIssue(issueText, data.types, data.examples);

      issues.push({
        issue: issueText,
        frequency: data.count,
        severity,
        suggestions
      });
    }

    // Sort by frequency and severity
    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return severityDiff !== 0 ? severityDiff : b.frequency - a.frequency;
    });
  }

  /**
   * Extract issues from feedback text
   */
  private extractIssuesFromText(text: string): string[] {
    const issues: string[] = [];
    const lowerText = text.toLowerCase();

    // Common issue patterns
    const issuePatterns = {
      'too difficult': ['too hard', 'too difficult', 'challenging', 'complex', 'confusing'],
      'too easy': ['too easy', 'too simple', 'boring', 'not challenging'],
      'irrelevant': ['irrelevant', 'not relevant', 'doesn\'t apply', 'not related', 'off topic'],
      'timing issues': ['too soon', 'too late', 'wrong timing', 'interrupting', 'bad timing'],
      'naturalness': ['robotic', 'unnatural', 'scripted', 'fake', 'artificial', 'forced'],
      'project context': ['not using my project', 'generic', 'not specific to my code', 'irrelevant to my project'],
      'clarity': ['unclear', 'confusing', 'hard to understand', 'vague', 'ambiguous'],
      'length': ['too long', 'too short', 'verbose', 'brief', 'incomplete']
    };

    for (const [issue, keywords] of Object.entries(issuePatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Generate suggestions for specific issues
   */
  private generateSuggestionsForIssue(
    issue: string,
    types: Set<string>,
    examples: string[]
  ): string[] {
    const suggestionMap: Record<string, string[]> = {
      'too difficult': [
        'Adjust difficulty detection to be more conservative',
        'Provide more hints and guidance',
        'Break down complex exercises into smaller steps'
      ],
      'too easy': [
        'Increase difficulty detection sensitivity',
        'Add more challenging variants',
        'Implement progressive difficulty scaling'
      ],
      'irrelevant': [
        'Improve project context detection',
        'Enhance topic relevance analysis',
        'Add better filtering for user-specific content'
      ],
      'timing issues': [
        'Adjust timing algorithms for better conversation flow',
        'Implement more nuanced engagement detection',
        'Add cooldown period optimization'
      ],
      'naturalness': [
        'Review and improve prompt templates',
        'Add more varied conversational patterns',
        'Implement more human-like language generation'
      ],
      'project context': [
        'Enhance file analysis and pattern detection',
        'Improve project relevance scoring',
        'Add better project-specific challenge generation'
      ],
      'clarity': [
        'Improve instruction clarity and specificity',
        'Add more detailed explanations',
        'Enhance step-by-step guidance'
      ],
      'length': [
        'Optimize content length based on user preferences',
        'Implement adaptive content sizing',
        'Add options for different detail levels'
      ]
    };

    const baseSuggestions = suggestionMap[issue] || ['Investigate and improve the issue'];

    // Add context-specific suggestions
    if (types.has('practice_suggestion')) {
      baseSuggestions.push('Review suggestion generation algorithms');
    }
    if (types.has('exercise_quality')) {
      baseSuggestions.push('Enhance exercise validation and quality checks');
    }

    return baseSuggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Identify areas needing improvement
   */
  private identifyImprovementAreas(commonIssues: Array<{
    issue: string;
    frequency: number;
    severity: string;
    suggestions: string[];
  }>): string[] {
    return commonIssues
      .filter(issue => issue.severity === 'high' || issue.frequency >= 5)
      .map(issue => issue.issue);
  }

  /**
   * Analyze feedback trends
   */
  private analyzeTrends(feedback: UserFeedback[]): {
    improving: string[];
    declining: string[];
    stable: string[];
  } {
    // Group feedback by week
    const weeklyFeedback = this.groupFeedbackByWeek(feedback);
    const weeks = Object.keys(weeklyFeedback).sort();

    if (weeks.length < 4) {
      return { improving: [], declining: [], stable: [] };
    }

    const trends = {
      improving: [] as string[],
      declining: [] as string[],
      stable: [] as string[]
    };

    // Analyze trends for each category
    const categories = ['overall_satisfaction', 'naturalness', 'timing', 'relevance'];

    for (const category of categories) {
      const trend = this.calculateTrend(weeklyFeedback, weeks, category);
      trends[trend].push(category);
    }

    return trends;
  }

  /**
   * Group feedback by week
   */
  private groupFeedbackByWeek(feedback: UserFeedback[]): Record<string, UserFeedback[]> {
    const weekly: Record<string, UserFeedback[]> = {};

    for (const f of feedback) {
      const weekKey = this.getWeekKey(f.timestamp);
      if (!weekly[weekKey]) {
        weekly[weekKey] = [];
      }
      weekly[weekKey].push(f);
    }

    return weekly;
  }

  /**
   * Get week key for timestamp
   */
  private getWeekKey(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const week = Math.floor(date.getDate() / 7) + 1;
    return `${year}-W${week}`;
  }

  /**
   * Calculate trend for a category
   */
  private calculateTrend(
    weeklyFeedback: Record<string, UserFeedback[]>,
    weeks: string[],
    category: string
  ): 'improving' | 'declining' | 'stable' {
    const recentWeeks = weeks.slice(-4); // Last 4 weeks
    const ratings = recentWeeks.map(week => {
      const weekFeedback = weeklyFeedback[week] || [];
      return this.calculateCategoryRating(weekFeedback, category);
    });

    // Simple linear regression
    const n = ratings.length;
    if (n < 2) return 'stable';

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += ratings[i];
      sumXY += i * ratings[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable';
  }

  /**
   * Calculate rating for a specific category
   */
  private calculateCategoryRating(feedback: UserFeedback[], category: string): number {
    if (feedback.length === 0) return 3;

    const ratings = feedback.map(f => {
      switch (category) {
        case 'overall_satisfaction': return f.rating;
        case 'naturalness': return f.context.projectRelevant ? f.rating : Math.max(1, f.rating - 1);
        case 'timing': return f.metrics.suggestionAccepted ? Math.min(5, f.rating + 1) : f.rating;
        case 'relevance': return f.context.projectRelevant ? f.rating : Math.max(1, f.rating - 1);
        default: return f.rating;
      }
    });

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  /**
   * Create empty analysis result
   */
  private createEmptyAnalysis(): FeedbackAnalysis {
    return {
      overallSatisfaction: 3,
      satisfactionByVibe: {
        confused: 3,
        understanding: 3,
        breakthrough: 3,
        practicing: 3,
        misunderstanding: 3
      },
      satisfactionByDifficulty: {},
      commonIssues: [],
      improvementAreas: [],
      trends: {
        improving: [],
        declining: [],
        stable: []
      }
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(analysis: FeedbackAnalysis): void {
    const improvements: AdaptiveImprovement[] = [];

    // Generate suggestions based on analysis
    if (analysis.overallSatisfaction < 3.5) {
      improvements.push({
        area: 'overall_satisfaction',
        priority: 1,
        suggestedChanges: [
          {
            type: 'prompt_template',
            change: 'Improve prompt naturalness and relevance',
            expectedImpact: 0.3,
            confidence: 0.8
          }
        ]
      });
    }

    // Add vibe-specific improvements
    for (const [vibe, satisfaction] of Object.entries(analysis.satisfactionByVibe)) {
      if (satisfaction < 3.2) {
        improvements.push({
          area: `vibe_${vibe}`,
          priority: 2,
          suggestedChanges: [
            {
              type: 'prompt_template',
              change: `Improve ${vibe} vibe-specific prompts`,
              expectedImpact: 0.25,
              confidence: 0.7
            }
          ]
        });
      }
    }

    this.improvementQueue.push(...improvements);
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(() => {
      this.analyzeFeedback().catch(error => {
        this.logger.error('Periodic feedback analysis failed', error);
      });
    }, this.config.analysisInterval);
  }

  /**
   * Get current analysis
   */
  getAnalysis(): FeedbackAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * Get improvement queue
   */
  getImprovementQueue(): AdaptiveImprovement[] {
    return [...this.improvementQueue];
  }

  /**
   * Process improvement queue (called by system)
   */
  async processImprovements(): Promise<void> {
    const improvements = this.improvementQueue.splice(0); // Get all improvements

    for (const improvement of improvements) {
      try {
        this.logger.info('Processing improvement', {
          area: improvement.area,
          priority: improvement.priority,
          changes: improvement.suggestedChanges.length
        });

        // This would be implemented by the system that uses this service
        // For now, just log the improvement
        improvement.suggestedChanges.forEach(change => {
          this.logger.debug('Improvement suggestion', {
            type: change.type,
            change: change.change,
            impact: change.expectedImpact,
            confidence: change.confidence
          });
        });

      } catch (error) {
        this.logger.error('Failed to process improvement', error as Error, {
          area: improvement.area
        });
      }
    }
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(): {
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    feedbackByType: Record<string, number>;
    recentFeedback: UserFeedback[];
  } {
    const allFeedback = Array.from(this.feedback.values()).flat();
    const totalFeedback = allFeedback.length;

    const ratingDistribution: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    const feedbackByType: Record<string, number> = {};

    for (const feedback of allFeedback) {
      ratingDistribution[feedback.rating]++;
      feedbackByType[feedback.type] = (feedbackByType[feedback.type] || 0) + 1;
    }

    const averageRating = totalFeedback > 0
      ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

    const recentFeedback = allFeedback
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return {
      totalFeedback,
      averageRating,
      ratingDistribution,
      feedbackByType,
      recentFeedback
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.feedback.clear();
    this.feedbackWeights.clear();
    this.abTests.clear();
    this.improvementQueue.length = 0;

    this.logger.info('UserFeedbackSystem disposed');
  }
}

/**
 * Global user feedback system instance
 */
export const userFeedbackSystem = new UserFeedbackSystem({
  logger: LoggerFactory.getLogger('UserFeedbackSystem')
});