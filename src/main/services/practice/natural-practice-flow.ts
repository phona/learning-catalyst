/**
 * Natural Practice Flow Service
 *
 * Orchestrates the entire natural practice suggestion flow from detection to delivery.
 * Ensures practice suggestions feel natural and are timed appropriately within conversations.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ServiceError } from '../types';
import { LoggerFactory } from '../logger';
import type {
  PracticeOpportunity,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext
} from '../../../shared/types/electron-api/chat-api';
import type { VibeType } from '../../../shared/types/practice/vibe-types';
import type { PracticeAgent } from '../agents/specialized/practice-agent';
import type { UserContextTracker } from '../context/user-context-tracker';
import type { ConversationAnalyzer } from '../analysis/conversation-analyzer';

export interface NaturalPracticeFlowDependencies {
  als: AsyncLocalStorage<any>;
  logger: any;
  practiceAgent: PracticeAgent;
  userContextTracker: UserContextTracker;
  conversationAnalyzer: ConversationAnalyzer;
}

export interface NaturalPracticeFlowConfig {
  // When to check for practice opportunities
  checkInterval: number; // Every N messages
  minMessagesForAnalysis: number; // Minimum messages before checking

  // Confidence thresholds
  vibeConfidenceThreshold: number; // Minimum confidence for vibe detection
  practiceReadinessThreshold: number; // Minimum readiness for practice suggestion

  // Timing controls
  practiceCooldown: number; // Milliseconds between practice suggestions
  maxSuggestionsPerSession: number; // Maximum practice suggestions per conversation

  // Response generation
  enableNaturalLanguage: boolean; // Use natural language vs structured
  personalizeSuggestions: boolean; // Personalize based on user context
}

export const DEFAULT_NATURAL_PRACTICE_FLOW_CONFIG: NaturalPracticeFlowConfig = {
  checkInterval: 7, // Check every 7 messages
  minMessagesForAnalysis: 5,
  vibeConfidenceThreshold: 0.7,
  practiceReadinessThreshold: 0.8,
  practiceCooldown: 30 * 60 * 1000, // 30 minutes
  maxSuggestionsPerSession: 5,
  enableNaturalLanguage: true,
  personalizeSuggestions: true
};

/**
 * Natural Practice Flow Service
 *
 * Manages the entire flow of detecting practice opportunities and generating
 * natural, context-aware practice suggestions within conversations.
 */
export class NaturalPracticeFlow {
  private logger: any;
  private als: AsyncLocalStorage<any>;
  private practiceAgent: PracticeAgent;
  private userContextTracker: UserContextTracker;
  private conversationAnalyzer: ConversationAnalyzer;
  private config: NaturalPracticeFlowConfig;

  // Track practice suggestion state per conversation
  private conversationState = new Map<string, {
    messageCount: number;
    lastSuggestionTime: number;
    suggestionCount: number;
    lastCheckTime: number;
    recentMessages: Array<{
      role: string;
      content: string;
      timestamp: number;
    }>;
  }>();

  constructor(
    dependencies: NaturalPracticeFlowDependencies,
    config: Partial<NaturalPracticeFlowConfig> = {}
  ) {
    this.als = dependencies.als;
    this.logger = dependencies.logger;
    this.practiceAgent = dependencies.practiceAgent;
    this.userContextTracker = dependencies.userContextTracker;
    this.conversationAnalyzer = dependencies.conversationAnalyzer;
    this.config = { ...DEFAULT_NATURAL_PRACTICE_FLOW_CONFIG, ...config };

    this.logger.info('NaturalPracticeFlow service initialized');
  }

  /**
   * Check for practice opportunity in conversation
   * This is the main entry point for practice opportunity detection
   */
  async checkPracticeOpportunity(
    conversationId: string,
    userMessage: string,
    sessionId?: string
  ): Promise<PracticeOpportunityResult> {
    try {
      this.logger.debug('Checking practice opportunity', {
        conversationId,
        messageLength: userMessage.length
      });

      // Get or initialize conversation state
      const state = this.getConversationState(conversationId);

      // Update state with new message
      this.updateConversationState(conversationId, 'user', userMessage);

      // Check if we should analyze for practice opportunities
      if (!this.shouldCheckForOpportunity(conversationId)) {
        return this.createNoOpportunityResult('Not enough messages or too recent check');
      }

      // Get conversation history for analysis
      const conversationHistory = this.getConversationHistory(conversationId);

      // Get user context
      const userContext = await this.getUserContext(sessionId);

      // Analyze conversation for practice opportunities
      const opportunity = await this.analyzeForPracticeOpportunity(
        conversationHistory,
        userContext,
        conversationId
      );

      // Determine if we should suggest practice
      const shouldSuggest = this.shouldSuggestPractice(opportunity, userContext, conversationId);

      this.logger.info('Practice opportunity analysis complete', {
        conversationId,
        hasOpportunity: opportunity !== null,
        shouldSuggest,
        confidence: opportunity?.confidence || 0
      });

      return {
        hasOpportunity: opportunity !== null,
        opportunity: opportunity || undefined,
        shouldSuggest,
        reason: shouldSuggest
          ? 'Good timing and context for practice suggestion'
          : opportunity
            ? 'Not optimal timing for practice suggestion'
            : 'No practice opportunity detected',
        timing: shouldSuggest ? 'immediate' : 'wait',
        confidence: opportunity?.confidence || 0
      };

    } catch (error) {
      this.logger.error('Failed to check practice opportunity', error as Error, {
        conversationId
      });

      // Fallback analysis using simple heuristics
      return this.fallbackOpportunityAnalysis(conversationId, userMessage, error);
    }
  }

  /**
   * Generate natural practice suggestion
   */
  async generatePracticeSuggestion(
    opportunity: PracticeOpportunity,
    userContext?: UserLearningContext
  ): Promise<NaturalPracticeSuggestion> {
    try {
      this.logger.info('Generating practice suggestion', {
        opportunityId: opportunity.id,
        vibe: opportunity.type,
        concept: opportunity.concept
      });

      // Use the PracticeAgent to generate the suggestion
      const suggestion = await this.practiceAgent.execute({
        type: 'generate_suggestion',
        opportunity,
        userContext
      }, {
        id: `suggestion_${Date.now()}`,
        input: { opportunity, userContext },
        context: {} as any,
        options: {}
      });

      // Collect the suggestion chunks
      const suggestionChunks: any[] = [];
      for await (const chunk of suggestion) {
        suggestionChunks.push(chunk);
      }

      // Extract the final suggestion data
      const dataChunk = suggestionChunks.find(chunk => chunk.type === 'data');
      if (!dataChunk?.content?.suggestion) {
        throw new ServiceError(
          'No suggestion generated',
          'NO_SUGGESTION',
          'NaturalPracticeFlow'
        );
      }

      // Enhance with flow-specific metadata
      const enhancedSuggestion: NaturalPracticeSuggestion = {
        ...dataChunk.content.suggestion,
        id: opportunity.id,
        vibe: opportunity.type,
        metadata: {
          concept: opportunity.concept,
          relatedTopics: opportunity.suggestedTopics,
          prerequisites: [],
          nextSteps: ['Apply the concept', 'Test understanding', 'Get feedback'],
          ...dataChunk.content.suggestion.metadata
        }
      };

      // Update user context with suggestion
      if (userContext) {
        await this.userContextTracker.handlePracticeSuggestion(
          userContext.id,
          enhancedSuggestion
        );
      }

      return enhancedSuggestion;

    } catch (error) {
      this.logger.error('Failed to generate practice suggestion', error as Error, {
        opportunityId: opportunity.id
      });

      // Fallback to basic suggestion
      return this.generateFallbackSuggestion(opportunity);
    }
  }

  /**
   * Handle practice suggestion response
   */
  async handlePracticeResponse(
    conversationId: string,
    response: 'accept' | 'decline' | 'postpone',
    suggestionId: string
  ): Promise<void> {
    try {
      this.logger.info('Handling practice response', {
        conversationId,
        response,
        suggestionId
      });

      // Update conversation state
      const state = this.conversationState.get(conversationId);
      if (state) {
        state.lastSuggestionTime = Date.now();
      }

      // Update user context based on response
      const userContext = await this.getUserContext();
      if (userContext) {
        await this.userContextTracker.handlePracticeResponse(
          userContext.id,
          suggestionId,
          response
        );
      }

      // Start practice session if accepted
      if (response === 'accept') {
        await this.startPracticeSession(conversationId, suggestionId);
      }

    } catch (error) {
      this.logger.error('Failed to handle practice response', error as Error, {
        conversationId,
        response,
        suggestionId
      });
    }
  }

  /**
   * Get conversation state or create new one
   */
  private getConversationState(conversationId: string) {
    if (!this.conversationState.has(conversationId)) {
      this.conversationState.set(conversationId, {
        messageCount: 0,
        lastSuggestionTime: 0,
        suggestionCount: 0,
        lastCheckTime: 0,
        recentMessages: []
      });
    }
    return this.conversationState.get(conversationId)!;
  }

  /**
   * Update conversation state with new message
   */
  private updateConversationState(
    conversationId: string,
    role: string,
    content: string
  ): void {
    const state = this.getConversationState(conversationId);

    state.messageCount++;
    state.recentMessages.push({
      role,
      content,
      timestamp: Date.now()
    });

    // Keep only last 20 messages for analysis
    if (state.recentMessages.length > 20) {
      state.recentMessages = state.recentMessages.slice(-20);
    }
  }

  /**
   * Check if we should analyze for practice opportunities
   */
  private shouldCheckForOpportunity(conversationId: string): boolean {
    const state = this.getConversationState(conversationId);
    const now = Date.now();

    // Check minimum message requirement
    if (state.messageCount < this.config.minMessagesForAnalysis) {
      return false;
    }

    // Check interval
    if (state.messageCount % this.config.checkInterval !== 0) {
      return false;
    }

    // Check cooldown
    if (now - state.lastSuggestionTime < this.config.practiceCooldown) {
      return false;
    }

    // Check maximum suggestions per session
    if (state.suggestionCount >= this.config.maxSuggestionsPerSession) {
      return false;
    }

    // Check minimum time between checks
    if (now - state.lastCheckTime < 5000) { // 5 seconds
      return false;
    }

    state.lastCheckTime = now;
    return true;
  }

  /**
   * Get conversation history for analysis
   */
  private getConversationHistory(conversationId: string) {
    const state = this.getConversationState(conversationId);
    return state.recentMessages;
  }

  /**
   * Get user context
   */
  private async getUserContext(sessionId?: string): Promise<UserLearningContext | undefined> {
    try {
      const context = await this.userContextTracker.getUserContext(sessionId || 'default');

      return {
        id: context.id,
        sessionId: context.sessionId,
        confidenceLevel: context.confidenceLevel,
        learningVelocity: context.learningVelocity,
        stuckPoints: context.stuckPoints,
        recentConcepts: context.recentConcepts,
        practiceHistory: context.practiceHistory,
        lastPracticeTime: context.lastPracticeTime,
        engagementLevel: context.engagementLevel,
        preferences: context.preferences,
        statistics: context.statistics
      };
    } catch (error) {
      this.logger.warn('Failed to get user context', error as Error);
      return undefined;
    }
  }

  /**
   * Analyze conversation for practice opportunities
   */
  private async analyzeForPracticeOpportunity(
    conversationHistory: any[],
    userContext: UserLearningContext | undefined,
    conversationId: string
  ): Promise<PracticeOpportunity | null> {
    try {
      // Use conversation analyzer first
      const analysis = await this.conversationAnalyzer.analyzeConversation(
        conversationHistory,
        {
          context: conversationHistory,
          currentTopic: userContext?.recentConcepts[0]?.concept || 'general',
          userPreferences: userContext?.preferences
        }
      );

      // Check if analysis suggests practice opportunity
      if (analysis.shouldSuggestPractice && analysis.vibeDetection) {
        return {
          id: `opportunity_${Date.now()}_${conversationId}`,
          type: analysis.vibeDetection.vibe as VibeType,
          confidence: analysis.vibeDetection.confidence,
          timing: 'immediate',
          concept: analysis.keyConcepts[0] || 'current topic',
          reasoning: analysis.vibeDetection.reasoning,
          detectedFrom: analysis.vibeDetection.detectedFrom,
          practiceReadiness: analysis.vibeDetection.practiceReadiness,
          suggestedTopics: analysis.keyConcepts,
          estimatedTime: 15,
          difficulty: userContext?.preferences?.difficultyPreference || 'medium'
        };
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to analyze for practice opportunities', error as Error);
      return null;
    }
  }

  /**
   * Determine if we should suggest practice
   */
  private shouldSuggestPractice(
    opportunity: PracticeOpportunity | null,
    userContext: UserLearningContext | undefined,
    conversationId: string
  ): boolean {
    if (!opportunity) {
      return false;
    }

    // Check confidence threshold
    if (opportunity.confidence < this.config.vibeConfidenceThreshold) {
      return false;
    }

    // Check practice readiness
    if (opportunity.practiceReadiness < this.config.practiceReadinessThreshold) {
      return false;
    }

    // Check user preferences
    if (userContext?.preferences?.practiceFrequency === 'low') {
      // Be more conservative for users who prefer less practice
      return opportunity.confidence > 0.9;
    }

    // Check if user is currently engaged
    if (userContext?.engagementLevel && userContext.engagementLevel < 0.5) {
      return false;
    }

    return true;
  }

  /**
   * Create no opportunity result
   */
  private createNoOpportunityResult(reason: string): PracticeOpportunityResult {
    return {
      hasOpportunity: false,
      shouldSuggest: false,
      reason,
      timing: 'wait',
      confidence: 0
    };
  }

  /**
   * Generate fallback suggestion
   */
  private generateFallbackSuggestion(opportunity: PracticeOpportunity): NaturalPracticeSuggestion {
    return {
      id: opportunity.id,
      type: 'gentle-nudge',
      introduction: this.generateVibeBasedIntroduction(opportunity.type),
      challenge: `Would you like to try a practice exercise with ${opportunity.concept}?`,
      context: `This will help solidify your understanding of ${opportunity.concept}.`,
      estimatedTime: 15,
      difficulty: opportunity.difficulty || 'medium',
      vibe: opportunity.type,
      timing: {
        when: 'when you\'re ready',
        urgency: 'low'
      },
      options: {
        accept: "Yes, let's practice!",
        decline: "Maybe later",
        postpone: "In a few minutes"
      },
      metadata: {
        concept: opportunity.concept,
        relatedTopics: opportunity.suggestedTopics,
        prerequisites: [],
        nextSteps: ['Practice', 'Apply', 'Review']
      }
    };
  }

  /**
   * Generate vibe-based introduction
   */
  private generateVibeBasedIntroduction(vibe: VibeType): string {
    const introductions = {
      understanding: "Great! It looks like you're getting comfortable with this concept.",
      confused: "No worries - sometimes the best way to clear up confusion is through practice.",
      breakthrough: "Excellent breakthrough! Let's solidify that understanding.",
      practicing: "Perfect timing for some additional practice to build on what you're doing.",
      misunderstanding: "Let's work through this with a practical exercise to clarify things."
    };

    return introductions[vibe] || introductions.understanding;
  }

  /**
   * Start practice session
   */
  private async startPracticeSession(
    conversationId: string,
    suggestionId: string
  ): Promise<void> {
    this.logger.info('Starting practice session', {
      conversationId,
      suggestionId
    });

    // Update conversation state
    const state = this.getConversationState(conversationId);
    state.suggestionCount++;

    // TODO: Implement practice session management
    // This would integrate with the existing practice system
  }

  /**
   * Fallback opportunity analysis when AI detection fails
   */
  private fallbackOpportunityAnalysis(
    conversationId: string,
    userMessage: string,
    originalError: Error
  ): PracticeOpportunityResult {
    try {
      this.logger.warn('Using fallback opportunity analysis', {
        conversationId,
        error: originalError.message
      });

      // Simple heuristic-based analysis
      const state = this.getConversationState(conversationId);
      const understandingCues = this.detectUnderstandingCues(userMessage);
      const hasRecentPractice = this.hasRecentPractice(conversationId);
      const isOptimalTiming = this.isOptimalPracticeTiming(state);

      if (understandingCues && !hasRecentPractice && isOptimalTiming) {
        // Create a basic opportunity
        const concept = this.extractConceptFromMessage(userMessage);
        const opportunity: PracticeOpportunity = {
          id: `fallback_${Date.now()}_${conversationId}`,
          type: 'understanding',
          confidence: 0.6, // Lower confidence for fallback
          timing: 'immediate',
          concept: concept || 'current topic',
          reasoning: 'Simple heuristic analysis detected understanding indicators',
          detectedFrom: ['heuristic_analysis', 'language_patterns'],
          practiceReadiness: 0.7,
          suggestedTopics: concept ? [concept] : [],
          estimatedTime: 15,
          difficulty: 'medium'
        };

        return {
          hasOpportunity: true,
          opportunity,
          shouldSuggest: true,
          reason: 'Fallback analysis detected understanding cues and optimal timing',
          timing: 'immediate',
          confidence: 0.6
        };
      }

      return this.createNoOpportunityResult('Fallback analysis found no suitable opportunity');

    } catch (fallbackError) {
      this.logger.error('Fallback analysis also failed', fallbackError as Error, {
        conversationId
      });

      return this.createNoOpportunityResult('All analysis methods failed');
    }
  }

  /**
   * Detect understanding cues using simple heuristics
   */
  private detectUnderstandingCues(message: string): boolean {
    const understandingKeywords = [
      'i understand', 'i get it', 'got it', 'makes sense', 'i see',
      'that makes sense', 'i think i understand', 'now i get it',
      'that clears it up', 'ah i see', 'oh right', 'i get that',
      'understood', 'makes perfect sense', 'i follow', 'i see what you mean',
      'makes perfect', 'now i understand', 'perfect', 'excellent',
      'great', 'awesome', 'cool', 'yes i get it'
    ];

    const lowerMessage = message.toLowerCase().trim();
    return understandingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if user has practiced recently
   */
  private hasRecentPractice(conversationId: string): boolean {
    const state = this.getConversationState(conversationId);
    const now = Date.now();
    const timeSinceLastSuggestion = now - state.lastSuggestionTime;

    // Check if user practiced in the last 20 minutes
    return timeSinceLastSuggestion < 20 * 60 * 1000;
  }

  /**
   * Check if it's optimal timing for practice suggestions
   */
  private isOptimalPracticeTiming(state: any): boolean {
    // Don't suggest too early in conversation
    if (state.messageCount < 3) return false;

    // Good timing after several messages
    if (state.messageCount % 6 === 0) return true;

    // Random timing to avoid being too predictable
    return Math.random() > 0.7;
  }

  /**
   * Extract concept from user message using simple heuristics
   */
  private extractConceptFromMessage(message: string): string | null {
    // Look for common programming/learning patterns
    const patterns = [
      /(?:learn|study|practice|understand|use|work with)\s+([a-zA-Z][a-zA-Z0-9]*)/gi,
      /(?:about|regarding|concerning)\s+([a-zA-Z][a-zA-Z0-9]*)/gi,
      /(?:react|vue|angular|javascript|typescript|python|css|html|api|database|backend|frontend)/gi,
      /(?:hooks|components|functions|methods|classes|objects)/gi
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      } else if (match && match[0]) {
        return match[0];
      }
    }

    // Fallback: extract the longest word that might be a concept
    const words = message.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    return words.length > 0 ? words.reduce((a, b) => a.length > b.length ? a : b) : null;
  }

  /**
   * Enhanced error recovery for suggestion generation
   */
  async generateSuggestionWithFallback(
    opportunity: PracticeOpportunity,
    userContext?: UserLearningContext
  ): Promise<NaturalPracticeSuggestion> {
    try {
      // Try main suggestion generation first
      return await this.generatePracticeSuggestion(opportunity, userContext);
    } catch (error) {
      this.logger.warn('Primary suggestion generation failed, using fallback', error as Error);

      // Create a high-quality fallback suggestion
      return this.createRobustFallbackSuggestion(opportunity, userContext);
    }
  }

  /**
   * Create robust fallback suggestion that doesn't depend on AI
   */
  private createRobustFallbackSuggestion(
    opportunity: PracticeOpportunity,
    userContext?: UserLearningContext
  ): NaturalPracticeSuggestion {
    const difficultyMap = {
      0.0: 'easy',
      0.5: 'easy',
      0.7: 'medium',
      0.9: 'hard',
      1.0: 'hard'
    };

    const typeMap = {
      understanding: 'gentle-nudge',
      confused: 'direct-suggestion',
      breakthrough: 'collaborative-invite',
      practicing: 'challenge',
      misunderstanding: 'direct-suggestion'
    };

    const difficulty = difficultyMap[opportunity.confidence as keyof typeof difficultyMap] || 'medium';
    const suggestionType = typeMap[opportunity.type] || 'gentle-nudge';

    return {
      id: `robust_fallback_${Date.now()}`,
      type: suggestionType as any,
      introduction: this.generateContextualIntroduction(opportunity.type, opportunity.concept),
      challenge: this.generateContextualChallenge(opportunity.type, opportunity.concept, userContext),
      context: this.generateContextualContext(opportunity, userContext),
      estimatedTime: Math.max(10, Math.min(30, opportunity.estimatedTime || 15)),
      difficulty: difficulty as any,
      vibe: opportunity.type,
      timing: {
        when: 'when you\'re ready',
        urgency: 'low'
      },
      options: {
        accept: this.generateAcceptanceOption(opportunity.type),
        decline: this.generateDeclineOption(),
        postpone: this.generatePostponeOption()
      },
      metadata: {
        concept: opportunity.concept,
        relatedTopics: opportunity.suggestedTopics,
        prerequisites: this.determinePrerequisites(opportunity.concept),
        nextSteps: this.generateNextSteps(opportunity.type, opportunity.concept),
        fallbackUsed: true,
        originalConfidence: opportunity.confidence
      }
    };
  }

  /**
   * Generate contextual introduction based on vibe
   */
  private generateContextualIntroduction(vibe: string, concept: string): string {
    const introductions = {
      understanding: `Great progress with ${concept}!`,
      confused: `No worries about ${concept} - practice helps clarify things.`,
      breakthrough: `Excellent insight about ${concept}!`,
      practicing: `Building nicely on your ${concept} work!`,
      misunderstanding: `Let's clarify ${concept} with some practice.`
    };

    return introductions[vibe as keyof typeof introductions] || introductions.understanding;
  }

  /**
   * Generate contextual challenge
   */
  private generateContextualChallenge(vibe: string, concept: string, userContext?: UserLearningContext): string {
    const challenges = {
      understanding: [
        `Try applying ${concept} in a quick exercise.`,
        `Would you like to practice ${concept} with a small example?`,
        `Ready to try a ${concept} challenge?`
      ],
      confused: [
        `Let's work through ${concept} with a hands-on exercise.`,
        `Would a ${concept} practice help clarify things?`,
        `Try this ${concept} exercise to build understanding.`
      ],
      breakthrough: [
        `Excellent! Let's solidify that ${concept} understanding with practice.`,
        `Perfect timing to apply your ${concept} insight!`,
        `Let's turn that ${concept} breakthrough into practical skill.`
      ],
      practicing: [
        `Great! Here's a ${concept} challenge to build on your practice.`,
        `Ready for a ${concept} challenge that extends your work?`,
        `Try this ${concept} exercise to level up your skills.`
      ],
      misunderstanding: [
        `Let's work through ${concept} with a clarifying practice exercise.`,
        `Would a ${concept} practice help address the confusion?`,
        `Try this ${concept} exercise to clear up the misunderstanding.`
      ]
    };

    const vibeChallenges = challenges[vibe as keyof typeof challenges] || challenges.understanding;
    return vibeChallenges[Math.floor(Math.random() * vibeChallenges.length)];
  }

  /**
   * Generate contextual context explanation
   */
  private generateContextualContext(opportunity: PracticeOpportunity, userContext?: UserLearningContext): string {
    if (opportunity.detectedFrom.includes('heuristic_analysis')) {
      return 'This suggestion is based on pattern analysis of our conversation.';
    }
    return `This practice suggestion connects to what we were discussing about ${opportunity.concept}.`;
  }

  /**
   * Generate acceptance option based on vibe
   */
  private generateAcceptanceOption(vibe: string): string {
    const acceptOptions = {
      understanding: "Yes, let's practice!",
      confused: "Yes, that would help clarify things.",
      breakthrough: "Absolutely! Let's practice.",
      practicing: "Sure, let's continue practicing.",
      misunderstanding: "Yes, that would be helpful."
    };

    return acceptOptions[vibe as keyof typeof acceptOptions] || acceptOptions.understanding;
  }

  /**
   * Generate decline option
   */
  private generateDeclineOption(): string {
    const declines = [
      "Maybe later, thanks.",
      "Not right now, but thanks.",
      "I'll pass for now.",
      "Maybe in a bit.",
      "Thanks, but I'm good for now."
    ];

    return declines[Math.floor(Math.random() * declines.length)];
  }

  /**
   * Generate postpone option
   */
  private generatePostponeOption(): string {
    const postpones = [
      "In a few minutes?",
      "Can we practice this later?",
      "Maybe after we continue discussing?",
      "Let me finish this thought first.",
      "In a little while?"
    ];

    return postpones[Math.floor(Math.random() * postpones.length)];
  }

  /**
   * Determine prerequisites for a concept
   */
  private determinePrerequisites(concept: string): string[] {
    // Common programming concept prerequisites
    const prerequisites: Record<string, string[]> = {
      'react': ['javascript', 'html', 'css'],
      'vue': ['javascript', 'html', 'css'],
      'angular': ['typescript', 'javascript', 'html', 'css'],
      'hooks': ['components', 'state management'],
      'state': ['components', 'javascript'],
      'api': ['javascript', 'http', 'fetch'],
      'database': ['sql', 'data modeling'],
      'backend': ['javascript', 'api', 'server'],
      'frontend': ['html', 'css', 'javascript'],
      'typescript': ['javascript', 'types'],
      'css': ['html', 'selectors', 'styling'],
      'html': ['markup', 'tags', 'structure']
    };

    const lowerConcept = concept.toLowerCase();
    return prerequisites[lowerConcept] || [];
  }

  /**
   * Generate next steps based on vibe and concept
   */
  private generateNextSteps(vibe: string, concept: string): string[] {
    const steps = {
      understanding: ['Apply the concept', 'Test understanding', 'Get feedback'],
      confused: ['Practice exercise', 'Review basics', 'Ask questions'],
      breakthrough: ['Solidify understanding', 'Apply in new context', 'Teach someone'],
      practicing: ['Continue practice', 'Level up challenge', 'Real-world application'],
      misunderstanding: ['Clarify with practice', 'Review fundamentals', 'Get expert help']
    };

    return steps[vibe as keyof typeof steps] || steps.understanding;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.conversationState.clear();
    this.logger.info('NaturalPracticeFlow service disposed');
  }
}