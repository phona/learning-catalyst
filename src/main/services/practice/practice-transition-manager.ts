/**
 * Practice Transition Manager
 *
 * Manages smooth transitions between learning conversation and practice suggestions.
 * Ensures practice suggestions feel natural and don't disrupt the learning flow.
 */

import type { VibeType } from '../../../shared/types/practice/vibe-types';
import type { PracticeOpportunity, NaturalPracticeSuggestion } from '../../../shared/types/electron-api/chat-api';
import { LoggerFactory } from '../logger';

export interface TransitionContext {
  conversationId: string;
  recentMessages: Array<{ role: string; content: string; timestamp: number }>;
  currentTopic?: string;
  userEngagement: number;
  practiceHistory: Array<{
    timestamp: number;
    type: string;
    accepted: boolean;
    concept: string;
  }>;
}

export interface TransitionStrategy {
  id: string;
  name: string;
  description: string;
  isApplicable: (context: TransitionContext, opportunity: PracticeOpportunity) => boolean;
  generateTransition: (context: TransitionContext, opportunity: PracticeOpportunity, suggestion: NaturalPracticeSuggestion) => string;
  getTimingWeight: (context: TransitionContext) => number;
}

export interface TransitionTiming {
  when: 'immediate' | 'soon' | 'pause' | 'later';
  urgency: 'low' | 'medium' | 'high';
  delayMs?: number;
  reasoning: string;
}

/**
 * Practice Transition Manager
 *
 * Handles the complex logic of transitioning from natural conversation
 * to practice suggestions and back again.
 */
export class PracticeTransitionManager {
  private logger: any;
  private transitionStrategies: Map<string, TransitionStrategy> = new Map();

  constructor(logger?: any) {
    this.logger = logger || LoggerFactory.getLogger('PracticeTransitionManager');
    this.initializeTransitionStrategies();
  }

  /**
   * Initialize all transition strategies
   */
  private initializeTransitionStrategies(): void {
    // Gentle Nudge Strategy - for understanding vibe
    this.transitionStrategies.set('gentle-nudge', {
      id: 'gentle-nudge',
      name: 'Gentle Nudge',
      description: 'Soft, encouraging suggestion when user shows understanding',
      isApplicable: (context, opportunity) => opportunity.type === 'understanding',
      generateTransition: this.generateGentleNudgeTransition.bind(this),
      getTimingWeight: () => 0.8
    });

    // Collaborative Invite Strategy - for breakthrough vibe
    this.transitionStrategies.set('collaborative-invite', {
      id: 'collaborative-invite',
      name: 'Collaborative Invite',
      description: 'Inviting practice suggestion when user has breakthrough',
      isApplicable: (context, opportunity) => opportunity.type === 'breakthrough',
      generateTransition: this.generateCollaborativeInviteTransition.bind(this),
      getTimingWeight: () => 0.9
    });

    // Direct Suggestion Strategy - for confused or misunderstanding vibe
    this.transitionStrategies.set('direct-suggestion', {
      id: 'direct-suggestion',
      name: 'Direct Suggestion',
      description: 'Clear, direct practice suggestion to clarify confusion',
      isApplicable: (context, opportunity) =>
        ['confused', 'misunderstanding'].includes(opportunity.type),
      generateTransition: this.generateDirectSuggestionTransition.bind(this),
      getTimingWeight: () => 0.7
    });

    // Challenge Strategy - for practicing vibe
    this.transitionStrategies.set('challenge', {
      id: 'challenge',
      name: 'Challenge',
      description: 'Challenge-based suggestion when user is already practicing',
      isApplicable: (context, opportunity) => opportunity.type === 'practicing',
      generateTransition: this.generateChallengeTransition.bind(this),
      getTimingWeight: () => 0.6
    });

    // Context Bridge Strategy - for any vibe with strong conversation context
    this.transitionStrategies.set('context-bridge', {
      id: 'context-bridge',
      name: 'Context Bridge',
      description: 'Bridge from specific conversation topic to practice',
      isApplicable: (context, opportunity) =>
        context.currentTopic && opportunity.suggestedTopics.includes(context.currentTopic),
      generateTransition: this.generateContextBridgeTransition.bind(this),
      getTimingWeight: () => 0.85
    });

    // Pause Point Strategy - for natural conversation pauses
    this.transitionStrategies.set('pause-point', {
      id: 'pause-point',
      name: 'Pause Point',
      description: 'Suggestion at natural conversation pause points',
      isApplicable: (context, opportunity) => this.isNaturalPausePoint(context),
      generateTransition: this.generatePausePointTransition.bind(this),
      getTimingWeight: () => 0.75
    });
  }

  /**
   * Determine optimal timing for practice suggestion
   */
  determineOptimalTiming(
    context: TransitionContext,
    opportunity: PracticeOpportunity
  ): TransitionTiming {
    this.logger.debug('Determining optimal timing', {
      opportunityType: opportunity.type,
      userEngagement: context.userEngagement,
      conversationLength: context.recentMessages.length
    });

    // High engagement and understanding = immediate
    if (context.userEngagement > 0.8 && ['understanding', 'breakthrough'].includes(opportunity.type)) {
      return {
        when: 'immediate',
        urgency: 'high',
        delayMs: 1000, // 1 second delay for natural flow
        reasoning: 'High engagement and understanding - optimal timing for immediate practice'
      };
    }

    // Moderate engagement = soon
    if (context.userEngagement > 0.5) {
      return {
        when: 'soon',
        urgency: 'medium',
        delayMs: 3000, // 3 seconds
        reasoning: 'Good engagement level - suggest practice soon'
      };
    }

    // Low engagement or confusion = pause or later
    if (context.userEngagement < 0.3 || opportunity.type === 'confused') {
      return {
        when: 'pause',
        urgency: 'low',
        delayMs: 8000, // 8 seconds
        reasoning: 'Lower engagement or confusion - allow pause before practice'
      };
    }

    // Check conversation rhythm
    if (this.isNaturalTransitionPoint(context)) {
      return {
        when: 'immediate',
        urgency: 'medium',
        delayMs: 1500,
        reasoning: 'Natural conversation transition point detected'
      };
    }

    // Default timing
    return {
      when: 'later',
      urgency: 'low',
      delayMs: 5000,
      reasoning: 'Standard timing based on conversation analysis'
    };
  }

  /**
   * Generate smooth transition message
   */
  generateSmoothTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): {
    transitionMessage: string;
    timing: TransitionTiming;
    strategy: TransitionStrategy;
  } {
    // Find applicable strategies
    const applicableStrategies = Array.from(this.transitionStrategies.values())
      .filter(strategy => strategy.isApplicable(context, opportunity));

    if (applicableStrategies.length === 0) {
      // Use default gentle nudge
      const defaultStrategy = this.transitionStrategies.get('gentle-nudge')!;
      return {
        transitionMessage: defaultStrategy.generateTransition(context, opportunity, suggestion),
        timing: this.determineOptimalTiming(context, opportunity),
        strategy: defaultStrategy
      };
    }

    // Select best strategy based on timing weight and context
    const selectedStrategy = applicableStrategies.reduce((best, current) => {
      const bestWeight = best.getTimingWeight(context);
      const currentWeight = current.getTimingWeight(context);
      return currentWeight > bestWeight ? current : best;
    });

    return {
      transitionMessage: selectedStrategy.generateTransition(context, opportunity, suggestion),
      timing: this.determineOptimalTiming(context, opportunity),
      strategy: selectedStrategy
    };
  }

  /**
   * Check if this is a natural transition point in conversation
   */
  private isNaturalTransitionPoint(context: TransitionContext): boolean {
    const recentMessages = context.recentMessages.slice(-5);

    // Look for natural transition indicators
    const transitionIndicators = [
      'i get it', 'i understand', 'makes sense', 'got it',
      'i see', 'that makes sense', 'cool', 'awesome', 'great',
      'thanks', 'thank you', 'that helps', 'perfect'
    ];

    return recentMessages.some(msg =>
      msg.role === 'user' &&
      transitionIndicators.some(indicator =>
        msg.content.toLowerCase().includes(indicator)
      )
    );
  }

  /**
   * Check if this is a natural pause point
   */
  private isNaturalPausePoint(context: TransitionContext): boolean {
    const lastUserMessage = context.recentMessages
      .filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) return false;

    // Check for pause indicators
    const pauseIndicators = [
      'hmm', 'let me think', 'interesting', 'oh i see',
      'right', 'okay', 'alright'
    ];

    return pauseIndicators.some(indicator =>
      lastUserMessage.content.toLowerCase().includes(indicator)
    );
  }

  /**
   * Generate gentle nudge transition
   */
  private generateGentleNudgeTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `Great! Since you've got the hang of ${opportunity.concept}, ${suggestion.introduction.toLowerCase()} ${suggestion.challenge}`,
      `Nice work understanding ${opportunity.concept}! ${suggestion.introduction} ${suggestion.challenge}`,
      `Awesome progress with ${opportunity.concept}! ${suggestion.introduction} ${suggestion.challenge}`,
      `Perfect! Now that you're comfortable with ${opportunity.concept}, ${suggestion.challenge}`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate collaborative invite transition
   */
  private generateCollaborativeInviteTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `Excellent breakthrough! Let's solidify that ${opportunity.concept} understanding with a quick practice exercise.`,
      `Fantastic insight about ${opportunity.concept}! Want to try applying it in a small challenge?`,
      `Brilliant! Let's turn that ${opportunity.concept} breakthrough into practical skill.`,
      `Wonderful! Let's practice ${opportunity.concept} to make that understanding stick.`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate direct suggestion transition
   */
  private generateDirectSuggestionTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `I notice ${opportunity.type === 'confused' ? 'some confusion' : 'a misunderstanding'} about ${opportunity.concept}. Let's work through it with a practice exercise.`,
      `This is a common sticking point with ${opportunity.concept}. A hands-on exercise can help clarify things.`,
      `Let's practice ${opportunity.concept} to work through this confusion and build confidence.`,
      `${opportunity.concept} can be tricky. Try this exercise to solidify your understanding.`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate challenge transition
   */
  private generateChallengeTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `Great work practicing ${opportunity.concept}! Ready for a related challenge?`,
      `Since you're already working on ${opportunity.concept}, here's a next-level exercise.`,
      `Perfect timing! Let's build on your ${opportunity.concept} practice with a new challenge.`,
      `Excellent practice with ${opportunity.concept}! Want to try extending that skill?`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate context bridge transition
   */
  private generateContextBridgeTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `Since we're discussing ${context.currentTopic}, let's try applying it with a quick practice exercise.`,
      `Building on our conversation about ${context.currentTopic}, here's a practical challenge.`,
      `Let's connect this ${context.currentTopic} discussion to hands-on practice.`,
      `Speaking of ${context.currentTopic}, want to try applying what we've covered?`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate pause point transition
   */
  private generatePausePointTransition(
    context: TransitionContext,
    opportunity: PracticeOpportunity,
    suggestion: NaturalPracticeSuggestion
  ): string {
    const templates = [
      `While you're reflecting on that, want to try a quick ${opportunity.concept} exercise?`,
      `Since you're thinking about ${opportunity.concept}, let's solidify it with practice.`,
      `Perfect timing to practice ${opportunity.concept} while it's fresh in your mind.`,
      `Let's turn those thoughts about ${opportunity.concept} into hands-on practice.`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get all available transition strategies
   */
  getTransitionStrategies(): TransitionStrategy[] {
    return Array.from(this.transitionStrategies.values());
  }

  /**
   * Add custom transition strategy
   */
  addTransitionStrategy(strategy: TransitionStrategy): void {
    this.transitionStrategies.set(strategy.id, strategy);
    this.logger.info('Added custom transition strategy', { strategyId: strategy.id });
  }

  /**
   * Remove transition strategy
   */
  removeTransitionStrategy(strategyId: string): boolean {
    const removed = this.transitionStrategies.delete(strategyId);
    if (removed) {
      this.logger.info('Removed transition strategy', { strategyId });
    }
    return removed;
  }

  /**
   * Validate transition quality
   */
  validateTransitionQuality(
    transitionMessage: string,
    context: TransitionContext,
    opportunity: PracticeOpportunity
  ): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for natural language
    if (transitionMessage.includes('{') || transitionMessage.includes('}')) {
      issues.push('Contains template placeholders');
      score -= 20;
    }

    // Check length
    if (transitionMessage.length < 20) {
      issues.push('Too short');
      score -= 15;
    } else if (transitionMessage.length > 200) {
      issues.push('Too long');
      score -= 10;
    }

    // Check for concept mention
    if (!transitionMessage.toLowerCase().includes(opportunity.concept.toLowerCase())) {
      issues.push('Does not mention the practice concept');
      score -= 25;
    }

    // Check for natural flow indicators
    const naturalIndicators = ['great!', 'since', 'now that', 'perfect!', 'excellent!'];
    const hasNaturalIndicators = naturalIndicators.some(indicator =>
      transitionMessage.toLowerCase().includes(indicator)
    );

    if (!hasNaturalIndicators) {
      suggestions.push('Add natural conversation connectors');
      score -= 10;
    }

    // Check for question or clear call to action
    if (!transitionMessage.includes('?') && !transitionMessage.includes('try') && !transitionMessage.includes('want to')) {
      suggestions.push('Include a clear call to action or question');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }
}