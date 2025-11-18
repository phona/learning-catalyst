/**
 * Conversation Analyzer
 *
 * Analyzes conversation patterns, detects learning moments,
 * and identifies practice opportunities. Part of Phase 1
 * context-aware practice system implementation.
 */

import { ServiceDependencies } from '../types';
import {
  ConversationContext,
  PracticeOpportunity,
  UserContext,
  PracticeVibeResult,
  VibeType,
  VIBE_TYPE_DESCRIPTIONS
} from '@/shared/types/practice';

/**
 * Conversation Analysis Result
 */
export interface ConversationAnalysisResult {
  keyConcepts: ConversationContext['keyConcepts'];
  topicTransitions: ConversationContext['topicTransitions'];
  practiceOpportunities: PracticeOpportunity[];
  engagementLevel: number;
  learningVelocity: number;
  recommendations: Array<{
    type: 'practice' | 'review' | 'advance' | 'clarify';
    priority: 'high' | 'medium' | 'low';
    description: string;
    reasoning: string;
  }>;
}

/**
 * Message Analysis
 */
interface MessageAnalysis {
  concepts: string[];
  confidence: number;
  engagement: number;
  complexity: number;
  sentiment: number;
  questions: string[];
  indicators: string[];
  practiceReadiness: number;
}

/**
 * Topic Analysis
 */
interface TopicAnalysis {
  primaryTopic: string;
  subtopics: string[];
  confidence: number;
  progression: 'introducing' | 'exploring' | 'understanding' | 'practicing' | 'mastering';
  timeSpent: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Conversation Analyzer Service
 */
export class ConversationAnalyzer {
  private readonly dependencies: ServiceDependencies;
  private readonly analysisCache = new Map<string, ConversationAnalysisResult>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(dependencies: ServiceDependencies) {
    this.dependencies = dependencies;
    this.dependencies.logger.info('ConversationAnalyzer initialized');
  }

  /**
   * Analyze conversation for practice opportunities
   */
  async analyzeConversation(
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system' | 'tool';
      content: string;
      timestamp: number;
    }>,
    userContext: UserContext,
    options: {
      maxMessages?: number;
      includeSystemMessages?: boolean;
      analyzeSentiment?: boolean;
    } = {}
  ): Promise<ConversationAnalysisResult> {
    try {
      const startTime = Date.now();
      const {
        maxMessages = 50,
        includeSystemMessages = false,
        analyzeSentiment = true
      } = options;

      // Check cache first
      const cacheKey = this.generateCacheKey(messages, userContext, options);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.dependencies.logger.debug('Returning cached conversation analysis', { cacheKey });
        return cached;
      }

      // Filter messages
      const filteredMessages = this.filterMessages(messages, includeSystemMessages);
      const recentMessages = filteredMessages.slice(-maxMessages);

      if (recentMessages.length === 0) {
        return this.createEmptyAnalysisResult();
      }

      // Analyze each message
      const messageAnalyses = await Promise.all(
        recentMessages.map(msg => this.analyzeMessage(msg, analyzeSentiment))
      );

      // Extract key concepts
      const keyConcepts = this.extractKeyConcepts(messageAnalyses);

      // Detect topic transitions
      const topicTransitions = this.detectTopicTransitions(recentMessages, keyConcepts);

      // Generate practice opportunities
      const practiceOpportunities = this.generatePracticeOpportunities(
        messageAnalyses,
        keyConcepts,
        userContext
      );

      // Calculate engagement and learning metrics
      const engagementLevel = this.calculateEngagementLevel(messageAnalyses);
      const learningVelocity = this.calculateLearningVelocity(messageAnalyses, userContext);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        messageAnalyses,
        keyConcepts,
        practiceOpportunities,
        userContext
      );

      const result: ConversationAnalysisResult = {
        keyConcepts,
        topicTransitions,
        practiceOpportunities,
        engagementLevel,
        learningVelocity,
        recommendations
      };

      // Cache the result
      this.cacheResult(cacheKey, result);

      this.dependencies.logger.debug('Conversation analysis completed', {
        messagesAnalyzed: recentMessages.length,
        conceptsIdentified: keyConcepts.length,
        opportunitiesFound: practiceOpportunities.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.dependencies.logger.error('Conversation analysis failed', error as Error);
      return this.createEmptyAnalysisResult();
    }
  }

  /**
   * Analyze individual message
   */
  private async analyzeMessage(
    message: any,
    analyzeSentiment: boolean
  ): Promise<MessageAnalysis> {
    const content = message.content || '';
    const isUserMessage = message.role === 'user';

    // Extract concepts using keyword patterns
    const concepts = this.extractConceptsFromText(content);

    // Calculate confidence based on language patterns
    const confidence = this.calculateMessageConfidence(content, isUserMessage);

    // Determine engagement level
    const engagement = this.calculateMessageEngagement(content, isUserMessage);

    // Calculate complexity
    const complexity = this.calculateMessageComplexity(content);

    // Analyze sentiment if requested
    const sentiment = analyzeSentiment ? this.analyzeSentiment(content) : 0;

    // Extract questions
    const questions = this.extractQuestions(content);

    // Identify learning indicators
    const indicators = this.identifyLearningIndicators(content, isUserMessage);

    // Calculate practice readiness
    const practiceReadiness = this.calculatePracticeReadiness(
      confidence,
      engagement,
      indicators,
      sentiment
    );

    return {
      concepts,
      confidence,
      engagement,
      complexity,
      sentiment,
      questions,
      indicators,
      practiceReadiness
    };
  }

  /**
   * Extract concepts from text using patterns
   */
  private extractConceptsFromText(text: string): string[] {
    const concepts: string[] = [];

    // Common technical concept patterns
    const conceptPatterns = [
      /\b(function|class|method|variable|algorithm|data structure|API|database|frontend|backend)\b/gi,
      /\b(React|Vue|Angular|Node\.js|Express|MongoDB|SQL|Python|JavaScript|TypeScript|HTML|CSS)\b/gi,
      /\b(hook|component|state|props|routing|middleware|authentication|authorization)\b/gi,
      /\b(array|object|string|number|boolean|null|undefined|async|await|promise)\b/gi,
      /\b(map|filter|reduce|forEach|sort|reverse|split|join|replace|match)\b/gi
    ];

    conceptPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        concepts.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Remove duplicates and return unique concepts
    return [...new Set(concepts)];
  }

  /**
   * Calculate message confidence
   */
  private calculateMessageConfidence(content: string, isUserMessage: boolean): number {
    let confidence = 0.5; // Base confidence

    // Confidence indicators
    const confidenceIndicators = [
      { pattern: /\b(I understand|got it|makes sense|clear now|I get|that's clear)\b/gi, weight: 0.3 },
      { pattern: /\b(I think|maybe|probably|not sure|unclear|confused)\b/gi, weight: -0.2 },
      { pattern: /\b(aha|brilliant|excellent|perfect|awesome)\b/gi, weight: 0.2 },
      { pattern: /\b(question|what|how|why|when|where|can you)\b/gi, weight: -0.1 }
    ];

    confidenceIndicators.forEach(({ pattern, weight }) => {
      const matches = content.match(pattern);
      if (matches) {
        confidence += weight * Math.min(matches.length, 3); // Cap influence per pattern
      }
    });

    // User messages generally indicate lower confidence (more questions)
    // Assistant messages generally indicate higher confidence (more definitive statements)
    if (isUserMessage) {
      confidence *= 0.9;
    } else {
      confidence *= 1.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate message engagement
   */
  private calculateMessageEngagement(content: string, isUserMessage: boolean): number {
    let engagement = 0.5;

    // Length contributes to engagement (longer messages = more engaged)
    const lengthScore = Math.min(1, content.length / 200);
    engagement += lengthScore * 0.2;

    // Questions show engagement
    const questionCount = (content.match(/\?/g) || []).length;
    engagement += Math.min(0.3, questionCount * 0.1);

    // Exclamations show excitement/engagement
    const exclamationCount = (content.match(/!/g) || []).length;
    engagement += Math.min(0.2, exclamationCount * 0.05);

    // Code blocks or technical content show deep engagement
    if (content.includes('```') || content.includes('function') || content.includes('class')) {
      engagement += 0.2;
    }

    // User messages are inherently more engaging than system messages
    if (isUserMessage) {
      engagement *= 1.2;
    }

    return Math.max(0, Math.min(1, engagement));
  }

  /**
   * Calculate message complexity
   */
  private calculateMessageComplexity(content: string): number {
    let complexity = 0.3; // Base complexity

    // Length contributes to complexity
    complexity += Math.min(0.3, content.length / 500);

    // Sentence complexity
    const sentences = content.split(/[.!?]+/);
    const avgSentenceLength = content.length / Math.max(1, sentences.length);
    complexity += Math.min(0.2, avgSentenceLength / 30);

    // Technical terms increase complexity
    const technicalTerms = [
      'algorithm', 'asynchronous', 'polymorphism', 'encapsulation', 'abstraction',
      'recursion', 'optimization', 'middleware', 'framework', 'library', 'dependency',
      'authentication', 'authorization', 'database', 'optimization', 'scalability'
    ];

    const technicalCount = technicalTerms.filter(term =>
      content.toLowerCase().includes(term.toLowerCase())
    ).length;

    complexity += Math.min(0.3, technicalCount * 0.1);

    // Code presence significantly increases complexity
    if (content.includes('```') || content.includes('function(') || content.includes('class ')) {
      complexity += 0.2;
    }

    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(content: string): number {
    let sentiment = 0; // Neutral

    // Positive sentiment indicators
    const positiveWords = [
      'good', 'great', 'excellent', 'awesome', 'amazing', 'fantastic', 'wonderful',
      'perfect', 'brilliant', 'outstanding', 'superb', 'love', 'like', 'enjoy',
      'happy', 'excited', 'thrilled', 'pleased', 'satisfied', 'confident'
    ];

    // Negative sentiment indicators
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed', 'frustrated',
      'confused', 'lost', 'stuck', 'difficult', 'hard', 'impossible', 'wrong',
      'error', 'mistake', 'problem', 'issue', 'concern', 'worry', 'anxious'
    ];

    const words = content.toLowerCase().split(/\s+/);

    positiveWords.forEach(word => {
      const count = words.filter(w => w.includes(word)).length;
      sentiment += count * 0.1;
    });

    negativeWords.forEach(word => {
      const count = words.filter(w => w.includes(word)).length;
      sentiment -= count * 0.1;
    });

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Extract questions from content
   */
  private extractQuestions(content: string): string[] {
    const questions: string[] = [];

    // Find sentences ending with question marks
    const sentences = content.split(/[.!?]+/);
    sentences.forEach(sentence => {
      sentence = sentence.trim();
      if (sentence.endsWith('?') && sentence.length > 3) {
        questions.push(sentence);
      }
    });

    // Find common question patterns
    const questionPatterns = [
      /\b(what|how|why|when|where|who|which|whose|can|could|would|should|is|are|do|does|did)\s+.+\?/gi,
      /\b(can you|could you|would you|will you|do you)\s+.+\?/gi
    ];

    questionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        questions.push(...matches);
      }
    });

    return [...new Set(questions)]; // Remove duplicates
  }

  /**
   * Identify learning indicators
   */
  private identifyLearningIndicators(content: string, isUserMessage: boolean): string[] {
    const indicators: string[] = [];

    // Learning state indicators
    const learningPatterns = [
      { pattern: /\b(I understand|I get it|makes sense|clear now|got it)\b/gi, indicator: 'understanding' },
      { pattern: /\b(I don't understand|not clear|confused|uncertain|not sure)\b/gi, indicator: 'confusion' },
      { pattern: /\b(aha!|eureka!|breakthrough|suddenly|now I see)\b/gi, indicator: 'breakthrough' },
      { pattern: /\b(let me try|I'll try|trying to|attempting)\b/gi, indicator: 'practicing' },
      { pattern: /\b(I thought|but isn't|wrong|incorrect)\b/gi, indicator: 'misunderstanding' },
      { pattern: /\b(help me|can you help|need help)\b/gi, indicator: 'help_needed' },
      { pattern: /\b(good work|well done|excellent|perfect)\b/gi, indicator: 'positive_feedback' },
      { pattern: /\b(try again|keep going|don't give up)\b/gi, indicator: 'encouragement' }
    ];

    learningPatterns.forEach(({ pattern, indicator }) => {
      if (pattern.test(content)) {
        indicators.push(indicator);
      }
    });

    // User-specific indicators
    if (isUserMessage) {
      if (content.length > 100) indicators.push('detailed_response');
      if (content.includes('?')) indicators.push('questioning');
    }

    return indicators;
  }

  /**
   * Calculate practice readiness
   */
  private calculatePracticeReadiness(
    confidence: number,
    engagement: number,
    indicators: string[],
    sentiment: number
  ): number {
    let readiness = 0.3; // Base readiness

    // Confidence is a major factor
    readiness += confidence * 0.4;

    // Engagement shows readiness
    readiness += engagement * 0.2;

    // Specific indicators affect readiness
    if (indicators.includes('understanding')) readiness += 0.2;
    if (indicators.includes('breakthrough')) readiness += 0.3;
    if (indicators.includes('practicing')) readiness -= 0.2; // Already practicing
    if (indicators.includes('confusion')) readiness -= 0.1; // Might need clarification first
    if (indicators.includes('misunderstanding')) readiness -= 0.3; // Clear misunderstanding first

    // Positive sentiment indicates readiness
    readiness += Math.max(0, sentiment) * 0.1;

    return Math.max(0, Math.min(1, readiness));
  }

  /**
   * Extract key concepts from message analyses
   */
  private extractKeyConcepts(messageAnalyses: MessageAnalysis[]): ConversationContext['keyConcepts'] {
    const conceptMap = new Map<string, {
      frequency: number;
      confidence: number;
      lastMentioned: number;
      context: string[];
      practicePotential: number;
    }>();

    messageAnalyses.forEach((analysis, index) => {
      analysis.concepts.forEach(concept => {
        const existing = conceptMap.get(concept);
        const practicePotential = analysis.practiceReadiness;

        if (existing) {
          existing.frequency++;
          existing.confidence = (existing.confidence + analysis.confidence) / 2;
          existing.lastMentioned = Date.now();
          existing.practicePotential = Math.max(existing.practicePotential, practicePotential);
          existing.context.push(`Message ${index + 1}`);
        } else {
          conceptMap.set(concept, {
            frequency: 1,
            confidence: analysis.confidence,
            lastMentioned: Date.now(),
            context: [`Message ${index + 1}`],
            practicePotential
          });
        }
      });
    });

    return Array.from(conceptMap.entries())
      .map(([concept, data]) => ({
        concept,
        frequency: data.frequency,
        confidence: data.confidence,
        lastMentioned: data.lastMentioned,
        context: data.context,
        practicePotential: data.practicePotential
      }))
      .sort((a, b) => b.frequency - a.frequency || b.confidence - a.confidence);
  }

  /**
   * Detect topic transitions
   */
  private detectTopicTransitions(
    messages: any[],
    keyConcepts: ConversationContext['keyConcepts']
  ): ConversationContext['topicTransitions'] {
    const transitions: ConversationContext['topicTransitions'] = [];

    // Simple topic change detection based on concept emergence
    let currentTopics = new Set<string>();

    messages.forEach((message, index) => {
      const messageConcepts = this.extractConceptsFromText(message.content);
      const newTopics = messageConcepts.filter(concept => !currentTopics.has(concept));

      if (newTopics.length > 0 && currentTopics.size > 0) {
        const fromTopics = Array.from(currentTopics).slice(0, 3).join(', ');
        const toTopics = newTopics.slice(0, 3).join(', ');

        transitions.push({
          from: fromTopics,
          to: toTopics,
          timestamp: message.timestamp,
          confidence: 0.7,
          triggerMessage: message.content.substring(0, 100) + '...'
        });
      }

      newTopics.forEach(topic => currentTopics.add(topic));
    });

    return transitions;
  }

  /**
   * Generate practice opportunities
   */
  private generatePracticeOpportunities(
    messageAnalyses: MessageAnalysis[],
    keyConcepts: ConversationContext['keyConcepts'],
    userContext: UserContext
  ): PracticeOpportunity[] {
    const opportunities: PracticeOpportunity[] = [];

    // High practice readiness concepts
    const highReadinessConcepts = keyConcepts.filter(
      concept => concept.practicePotential > 0.7 && concept.frequency > 1
    );

    highReadinessConcepts.forEach((conceptData, index) => {
      const vibe = this.detectVibeFromAnalysis(
        messageAnalyses.slice(-5),
        conceptData.concept
      );

      if (this.shouldCreatePracticeOpportunity(vibe, userContext)) {
        opportunities.push({
          id: `opportunity_${Date.now()}_${index}`,
          type: vibe,
          concept: conceptData.concept,
          suggestedPractice: this.generateSuggestedPractice(conceptData.concept, vibe),
          difficulty: this.determineDifficulty(conceptData.confidence, userContext),
          reasoning: `High practice readiness (${conceptData.practicePotential.toFixed(2)}) and concept frequency (${conceptData.frequency}) indicate good opportunity`,
          timing: 'immediate',
          confidence: conceptData.practicePotential,
          userProject: userContext.currentProject?.name,
          naturalLanguagePrompt: this.generateNaturalPrompt(conceptData.concept, vibe),
          prerequisites: this.determinePrerequisites(conceptData.concept, keyConcepts),
          estimatedTime: this.estimatePracticeTime(conceptData.concept, vibe),
          successProbability: conceptData.confidence
        });
      }
    });

    return opportunities.slice(0, 3); // Limit to top 3 opportunities
  }

  /**
   * Detect vibe from message analysis
   */
  private detectVibeFromAnalysis(analyses: MessageAnalysis[], concept: string): VibeType {
    const recentAnalyses = analyses.slice(-5);
    const avgPracticeReadiness = recentAnalyses.reduce((sum, a) => sum + a.practiceReadiness, 0) / recentAnalyses.length;
    const avgConfidence = recentAnalyses.reduce((sum, a) => sum + a.confidence, 0) / recentAnalyses.length;

    // Determine vibe based on patterns
    const allIndicators = recentAnalyses.flatMap(a => a.indicators);

    if (allIndicators.includes('breakthrough')) return 'breakthrough';
    if (allIndicators.includes('practicing')) return 'practicing';
    if (allIndicators.includes('misunderstanding')) return 'misunderstanding';
    if (allIndicators.includes('confusion')) return 'confused';
    if (avgPracticeReadiness > 0.7 && avgConfidence > 0.7) return 'understanding';

    return 'understanding'; // Default
  }

  /**
   * Should create practice opportunity based on vibe and context
   */
  private shouldCreatePracticeOpportunity(vibe: VibeType, userContext: UserContext): boolean {
    // Don't suggest practice if user recently practiced
    if (userContext.lastPracticeTime) {
      const timeSincePractice = Date.now() - userContext.lastPracticeTime;
      if (timeSincePractice < 30 * 60 * 1000) { // 30 minutes
        return false;
      }
    }

    // Vibe-based logic
    switch (vibe) {
    case 'understanding':
    case 'breakthrough':
      return true;
    case 'confused':
      return userContext.confidenceLevel > 0.4;
    case 'practicing':
      return false; // Already practicing
    case 'misunderstanding':
      return false; // Needs clarification first
    default:
      return false;
    }
  }

  /**
   * Generate suggested practice text
   */
  private generateSuggestedPractice(concept: string, vibe: VibeType): string {
    const templates = {
      understanding: `Practice applying ${concept} in a practical scenario`,
      confused: `Try a hands-on exercise to clarify ${concept}`,
      breakthrough: `Solidify your understanding of ${concept} with practice`,
      practicing: `Continue exploring ${concept} with related challenges`,
      misunderstanding: `Address the misunderstanding about ${concept} with guided practice`
    };

    return templates[vibe] || `Practice ${concept}`;
  }

  /**
   * Determine practice difficulty
   */
  private determineDifficulty(confidence: number, userContext: UserContext): 'easy' | 'medium' | 'hard' {
    const avgConfidence = (confidence + userContext.confidenceLevel) / 2;

    if (avgConfidence > 0.8) return 'hard';
    if (avgConfidence < 0.4) return 'easy';
    return 'medium';
  }

  /**
   * Generate natural language prompt
   */
  private generateNaturalPrompt(concept: string, vibe: VibeType): string {
    const prompts = {
      understanding: `Great! Now that you understand ${concept}, try applying it with a small exercise.`,
      confused: `Let's clarify ${concept} with some hands-on practice to help you understand it better.`,
      breakthrough: `Excellent insight about ${concept}! Let's solidify that understanding with some practice.`,
      practicing: `You're doing great practicing ${concept}! Here's a related challenge to try.`,
      misunderstanding: `Let's clear up that misunderstanding about ${concept} with some guided practice.`
    };

    return prompts[vibe] || `Try practicing ${concept}.`;
  }

  /**
   * Determine prerequisites for practice
   */
  private determinePrerequisites(concept: string, keyConcepts: ConversationContext['keyConcepts']): string[] {
    // Find related concepts that appeared before this one
    const relatedConcepts = keyConcepts
      .filter(kc => kc.concept !== concept && kc.frequency > 1)
      .slice(0, 2)
      .map(kc => kc.concept);

    return relatedConcepts;
  }

  /**
   * Estimate practice time
   */
  private estimatePracticeTime(concept: string, vibe: VibeType): number {
    const baseTime = 15; // minutes

    const timeAdjustments = {
      understanding: baseTime,
      confused: baseTime + 10, // More time needed
      breakthrough: baseTime, // Quick reinforcement
      practicing: baseTime + 5, // Continuing practice
      misunderstanding: baseTime + 15 // Need to correct understanding
    };

    return timeAdjustments[vibe] || baseTime;
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(messageAnalyses: MessageAnalysis[]): number {
    if (messageAnalyses.length === 0) return 0.5;

    const avgEngagement = messageAnalyses.reduce((sum, a) => sum + a.engagement, 0) / messageAnalyses.length;

    // Recent messages weigh more heavily
    const recentMessages = messageAnalyses.slice(-5);
    const recentEngagement = recentMessages.reduce((sum, a) => sum + a.engagement, 0) / recentMessages.length;

    return (avgEngagement * 0.6) + (recentEngagement * 0.4);
  }

  /**
   * Calculate learning velocity
   */
  private calculateLearningVelocity(messageAnalyses: MessageAnalysis[], userContext: UserContext): number {
    const conceptsIntroduced = messageAnalyses
      .reduce((set, analysis) => {
        analysis.concepts.forEach(concept => set.add(concept));
        return set;
      }, new Set<string>()).size;

    // Velocity based on concepts per time unit
    const timeSpan = messageAnalyses.length > 1 ?
      (messageAnalyses[messageAnalyses.length - 1].confidence || Date.now()) -
      (messageAnalyses[0].confidence || Date.now()) :
      60000; // Assume 1 minute if single message

    const conceptsPerMinute = conceptsIntroduced / Math.max(1, timeSpan / 60000);

    return Math.min(5, Math.max(0.1, conceptsPerMinute));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    messageAnalyses: MessageAnalysis[],
    keyConcepts: ConversationContext['keyConcepts'],
    practiceOpportunities: PracticeOpportunity[],
    userContext: UserContext
  ): ConversationAnalysisResult['recommendations'] {
    const recommendations: ConversationAnalysisResult['recommendations'] = [];

    // Practice recommendations based on opportunities
    practiceOpportunities.forEach(opportunity => {
      recommendations.push({
        type: 'practice',
        priority: opportunity.confidence > 0.8 ? 'high' : 'medium',
        description: `Practice ${opportunity.concept} - ${opportunity.suggestedPractice}`,
        reasoning: opportunity.reasoning
      });
    });

    // Review recommendations for stuck points
    if (userContext.stuckPoints.length > 0) {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        description: `Review stuck concepts: ${userContext.stuckPoints.join(', ')}`,
        reasoning: 'Identified concepts that need clarification'
      });
    }

    // Advance recommendations for high confidence
    const highConfidenceConcepts = keyConcepts.filter(c => c.confidence > 0.8);
    if (highConfidenceConcepts.length > 2) {
      recommendations.push({
        type: 'advance',
        priority: 'low',
        description: 'Advance to more complex topics',
        reasoning: 'Multiple concepts mastered with high confidence'
      });
    }

    // Clarification recommendations for confusion
    const confusedIndicators = messageAnalyses.some(a => a.indicators.includes('confusion'));
    if (confusedIndicators) {
      recommendations.push({
        type: 'clarify',
        priority: 'high',
        description: 'Clarify concepts before proceeding',
        reasoning: 'Detected confusion indicators in recent messages'
      });
    }

    return recommendations;
  }

  /**
   * Filter messages based on options
   */
  private filterMessages(messages: any[], includeSystemMessages: boolean): any[] {
    return messages.filter(msg => {
      if (!includeSystemMessages && msg.role === 'system') {
        return false;
      }
      return true;
    });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    messages: any[],
    userContext: UserContext,
    options: any
  ): string {
    const messageHash = messages.slice(-10).map(m => `${m.role}:${m.content.substring(0, 50)}`).join('|');
    const contextHash = `${userContext.confidenceLevel}:${userContext.engagementLevel}`;
    const optionsHash = JSON.stringify(options);

    return `${messageHash}_${contextHash}_${optionsHash}`;
  }

  /**
   * Get cached result
   */
  private getCachedResult(key: string): ConversationAnalysisResult | null {
    const cached = this.analysisCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache result
   */
  private cacheResult(key: string, result: ConversationAnalysisResult): void {
    this.analysisCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean old cache entries
    this.cleanupCache();
  }

  /**
   * Clean old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * Create empty analysis result
   */
  private createEmptyAnalysisResult(): ConversationAnalysisResult {
    return {
      keyConcepts: [],
      topicTransitions: [],
      practiceOpportunities: [],
      engagementLevel: 0.5,
      learningVelocity: 1.0,
      recommendations: []
    };
  }

  /**
   * Dispose of the analyzer
   */
  dispose(): void {
    this.analysisCache.clear();
    this.dependencies.logger.info('ConversationAnalyzer disposed');
  }
}