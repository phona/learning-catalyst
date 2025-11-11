/**
 * Vibe Detector Service
 *
 * Dedicated service for detecting learning vibes from conversation context.
 * Provides centralized vibe detection with multiple analysis strategies
 * and comprehensive fallback mechanisms. Part of Phase 1 implementation.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  VibeType,
  PracticeVibeResult,
  VibeDetectionConfig,
  DEFAULT_VIBE_DETECTION_CONFIG
} from '@/shared/types/practice';
import { LoggerFactory } from '../logger';

export interface VibeDetectionRequest {
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>;
  userContext: {
    confidenceLevel: number;
    learningVelocity: number;
    stuckPoints: string[];
    recentConcepts: Array<{ concept: string; confidence: number }>;
    lastPracticeTime?: number;
    engagementLevel: number;
  };
  currentTopic?: string;
  config?: VibeDetectionConfig;
}

export interface VibeDetectionResult {
  vibe: VibeType;
  confidence: number;
  reasoning: string;
  practiceReadiness: number;
  suggestedTopics: string[];
  detectedFrom: string[];
  keyIndicators: string[];
  timestamp: number;
}

/**
 * Vibe Detector Service
 *
 * Specialized service for detecting learning states and practice readiness
 * from conversation context with multiple analysis strategies.
 */
export class VibeDetector {
  private model: BaseLanguageModel;
  private config: VibeDetectionConfig;
  private logger = LoggerFactory.getInstance().createContextAwareLogger();

  constructor(model: BaseLanguageModel, config?: Partial<VibeDetectionConfig>) {
    this.model = model;
    this.config = { ...DEFAULT_VIBE_DETECTION_CONFIG, ...config };
  }

  /**
   * Detect vibe from conversation context
   */
  async detectVibe(request: VibeDetectionRequest): Promise<VibeDetectionResult> {
    const { conversationHistory, userContext, currentTopic } = request;
    const config = request.config || this.config;

    // Check minimum message requirement
    if (conversationHistory.length < config.minMessagesForDetection) {
      return {
        vibe: 'understanding',
        confidence: 0.5,
        reasoning: `Insufficient conversation history for accurate vibe detection (${conversationHistory.length} < ${config.minMessagesForDetection})`,
        practiceReadiness: 0.3,
        suggestedTopics: currentTopic ? [currentTopic] : [],
        detectedFrom: ['insufficient_data'],
        keyIndicators: [],
        timestamp: Date.now()
      };
    }

    try {
      // Primary AI-based detection
      const aiResult = await this.detectVibeWithAI(conversationHistory, userContext, currentTopic, config);

      // Secondary pattern-based detection for validation
      const patternResult = await this.detectVibeWithPatterns(conversationHistory, userContext);

      // Combine results with weighted confidence
      const combinedResult = this.combineDetectionResults(aiResult, patternResult, config);

      this.logger.info('Vibe detected successfully', {
        vibe: combinedResult.vibe,
        confidence: combinedResult.confidence,
        reasoning: combinedResult.reasoning,
        practiceReadiness: combinedResult.practiceReadiness
      });

      return combinedResult;

    } catch (error) {
      this.logger.warn('AI vibe detection failed, using pattern-based fallback', error as Error);

      // Fallback to pattern-based detection
      const fallbackResult = await this.detectVibeWithPatterns(conversationHistory, userContext);

      return {
        ...fallbackResult,
        reasoning: `${fallbackResult.reasoning} (AI detection failed, using pattern analysis)`,
        detectedFrom: [...fallbackResult.detectedFrom, 'fallback'],
        timestamp: Date.now()
      };
    }
  }

  /**
   * AI-based vibe detection using language model
   */
  private async detectVibeWithAI(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: any,
    currentTopic?: string,
    config: VibeDetectionConfig
  ): Promise<VibeDetectionResult> {
    const recentMessages = conversationHistory.slice(-config.contextWindow);
    const conversationText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');

    const vibeDetectionPrompt = `You are an expert learning state detector. Analyze conversation to detect user's current learning vibe.

Conversation History (last ${recentMessages.length} messages):
${conversationText}

Current Topic: ${currentTopic || 'Not specified'}
User Confidence Level: ${userContext.confidenceLevel}
Learning Velocity: ${userContext.learningVelocity}
Engagement Level: ${userContext.engagementLevel}
Stuck Points: ${userContext.stuckPoints.join(', ') || 'None'}

Analyze the conversation and determine the user's learning vibe. Consider:
1. Language patterns and emotional indicators
2. Questions asked and understanding demonstrated
3. Recent successes or struggles
4. Engagement and motivation level
5. Readiness for practice application

Vibe Types:
- understanding: User shows comprehension and clarity, confidence in concepts
- confused: User expresses uncertainty, asks clarifying questions, shows struggle
- breakthrough: User has sudden insight, "aha!" moment, conceptual leap
- practicing: User is actively applying concepts, experimenting with code
- misunderstanding: User demonstrates incorrect understanding, needs correction

Provide your analysis as JSON:
{
  "vibe": "vibe_type",
  "confidence": 0.85,
  "reasoning": "Detailed explanation with specific evidence from conversation",
  "practiceReadiness": 0.8,
  "suggestedTopics": ["topic1", "topic2"],
  "detectedFrom": ["message_content", "language_patterns", "engagement_signals"],
  "keyIndicators": ["specific_indicator1", "specific_indicator2"]
}`;

    const messages = [
      new SystemMessage("You are an expert at detecting learning states from conversation patterns."),
      new HumanMessage(vibeDetectionPrompt)
    ];

    const response = await this.model.invoke(messages);
    const content = response.content as string;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return {
      vibe: this.validateVibeType(parsed.vibe),
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || 'AI analysis of conversation patterns',
      practiceReadiness: Math.min(1, Math.max(0, parsed.practiceReadiness || 0.5)),
      suggestedTopics: Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics : (currentTopic ? [currentTopic] : []),
      detectedFrom: Array.isArray(parsed.detectedFrom) ? parsed.detectedFrom : ['ai_analysis'],
      keyIndicators: Array.isArray(parsed.keyIndicators) ? parsed.keyIndicators : [],
      timestamp: Date.now()
    };
  }

  /**
   * Pattern-based vibe detection using heuristics
   */
  private async detectVibeWithPatterns(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: any
  ): Promise<VibeDetectionResult> {
    const recentMessages = conversationHistory.slice(-10);
    const userMessages = recentMessages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
    const fullText = userMessages.join(' ');

    // Define pattern dictionaries
    const patterns = {
      understanding: [
        'i understand', 'i get it', 'got it', 'makes sense', 'i see', 'that makes sense',
        'i think i understand', 'now i get it', 'that clears it up', 'ah i see',
        'i get that', 'understood', 'makes perfect sense', 'i follow', 'i see what you mean',
        'crystal clear', 'that makes perfect sense', 'i totally get', 'completely understand'
      ],
      confused: [
        "i don't understand", "i'm confused", "doesn't make sense", "can you explain",
        "what do you mean", "i'm lost", "not sure i follow", "this is confusing",
        "i'm struggling", "help me understand", "can you clarify", "i don't get it",
        "this doesn't make sense", "i'm not following", "can you explain again"
      ],
      breakthrough: [
        'aha!', 'eureka!', 'oh i see now', 'suddenly it clicked', 'now i get it',
        'lightbulb moment', 'that just clicked', 'suddenly makes sense', 'oh!',
        'i just realized', 'it just clicked', 'breakthrough moment', 'now it makes sense'
      ],
      practicing: [
        'let me try', 'i will implement', 'here is my code', 'i am trying',
        'i attempted', 'my implementation', 'let me test', 'i will code',
        'time to practice', 'let me build', 'i am working on', 'here is what i tried'
      ],
      misunderstanding: [
        'so you mean', 'i thought you said', 'is it correct that', 'i assume',
        'so basically', 'if i understand correctly', 'i interpreted this as', 'my understanding is'
      ]
    };

    // Count pattern matches
    const patternCounts: Record<VibeType, number> = {
      understanding: 0,
      confused: 0,
      breakthrough: 0,
      practicing: 0,
      misunderstanding: 0
    };

    const detectedIndicators: string[] = [];

    userMessages.forEach(message => {
      Object.entries(patterns).forEach(([vibe, keywords]) => {
        keywords.forEach(keyword => {
          if (message.includes(keyword)) {
            patternCounts[vibe as VibeType]++;
            detectedIndicators.push(keyword);
          }
        });
      });
    });

    // Determine dominant vibe
    const totalMatches = Object.values(patternCounts).reduce((sum, count) => sum + count, 0);

    let detectedVibe: VibeType = 'understanding';
    let maxCount = 0;

    Object.entries(patternCounts).forEach(([vibe, count]) => {
      if (count > maxCount) {
        maxCount = count;
        detectedVibe = vibe as VibeType;
      }
    });

    // Calculate confidence based on pattern strength and user context
    const baseConfidence = maxCount > 0 ? Math.min(0.9, maxCount / userMessages.length) : 0.3;
    const contextualBoost = this.getContextualConfidenceBoost(detectedVibe, userContext);
    const confidence = Math.min(0.95, baseConfidence + contextualBoost);

    // Calculate practice readiness
    const practiceReadiness = this.calculatePracticeReadiness(detectedVibe, confidence, userContext);

    return {
      vibe: detectedVibe,
      confidence,
      reasoning: `Pattern-based detection: ${maxCount} matches for ${detectedVibe} out of ${userMessages.length} messages. Detected indicators: ${detectedIndicators.slice(0, 3).join(', ')}`,
      practiceReadiness,
      suggestedTopics: this.extractTopicsFromMessages(userMessages),
      detectedFrom: ['pattern_analysis'],
      keyIndicators: detectedIndicators.slice(0, 5),
      timestamp: Date.now()
    };
  }

  /**
   * Get contextual confidence boost based on user state
   */
  private getContextualConfidenceBoost(vibe: VibeType, userContext: any): number {
    switch (vibe) {
      case 'understanding':
        return userContext.confidenceLevel > 0.7 ? 0.1 : 0;
      case 'confused':
        return userContext.stuckPoints.length > 2 ? 0.1 : 0;
      case 'breakthrough':
        return userContext.learningVelocity > 1.2 ? 0.15 : 0.05;
      case 'practicing':
        return userContext.engagementLevel > 0.8 ? 0.1 : 0;
      case 'misunderstanding':
        return -0.1; // Reduce confidence for misunderstandings
      default:
        return 0;
    }
  }

  /**
   * Calculate practice readiness based on vibe and context
   */
  private calculatePracticeReadiness(vibe: VibeType, confidence: number, userContext: any): number {
    const baseReadiness: Record<VibeType, number> = {
      understanding: 0.8,
      confused: 0.3,
      breakthrough: 0.9,
      practicing: 0.2, // Already practicing
      misunderstanding: 0.1 // Don't practice when confused
    };

    let readiness = baseReadiness[vibe];

    // Adjust based on confidence
    readiness *= confidence;

    // Adjust based on recent practice
    const timeSinceLastPractice = userContext.lastPracticeTime ?
      Date.now() - userContext.lastPracticeTime : Infinity;
    if (timeSinceLastPractice < 30 * 60 * 1000) { // 30 minutes
      readiness *= 0.3; // Reduce if recently practiced
    }

    return Math.min(1, Math.max(0, readiness));
  }

  /**
   * Extract topics from user messages
   */
  private extractTopicsFromMessages(messages: string[]): string[] {
    const topicPatterns = [
      /\b(react|vue|angular|svelte)\b/gi,
      /\b(usestate|useeffect|usecontext|usereducer|usecallback)\b/gi,
      /\b(typescript|javascript|python|java|c\+\+)\b/gi,
      /\b(express|django|flask|fastapi|spring|rails)\b/gi,
      /\b(node\.js|npm|yarn|webpack|vite)\b/gi,
      /\b(html|css|sass|less|tailwind)\b/gi,
      /\b(api|rest|graphql|grpc)\b/gi,
      /\b(database|sql|mongodb|postgresql|mysql)\b/gi
    ];

    const topics = new Set<string>();

    messages.forEach(message => {
      topicPatterns.forEach(pattern => {
        const matches = message.match(pattern);
        if (matches) {
          topics.add(matches[0].toLowerCase());
        }
      });
    });

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Combine AI and pattern-based detection results
   */
  private combineDetectionResults(
    aiResult: VibeDetectionResult,
    patternResult: VibeDetectionResult,
    config: VibeDetectionConfig
  ): VibeDetectionResult {
    // Weight AI result higher but consider pattern validation
    const aiWeight = 0.7;
    const patternWeight = 0.3;

    // If both agree, increase confidence
    if (aiResult.vibe === patternResult.vibe) {
      return {
        ...aiResult,
        confidence: Math.min(0.95, aiResult.confidence + 0.1),
        reasoning: `${aiResult.reasoning} (validated by pattern analysis)`,
        detectedFrom: [...aiResult.detectedFrom, 'pattern_validation']
      };
    }

    // If they disagree, use weighted average but favor AI
    const combinedConfidence = (aiResult.confidence * aiWeight) + (patternResult.confidence * patternWeight);

    return {
      vibe: aiResult.confidence > 0.6 ? aiResult.vibe : patternResult.vibe,
      confidence: combinedConfidence,
      reasoning: `AI detected ${aiResult.vibe} (${aiResult.confidence.toFixed(2)} confidence), patterns detected ${patternResult.vibe} (${patternResult.confidence.toFixed(2)} confidence)`,
      detectedFrom: [...aiResult.detectedFrom, ...patternResult.detectedFrom],
      keyIndicators: [...aiResult.keyIndicators, ...patternResult.keyIndicators].slice(0, 5),
      practiceReadiness: (aiResult.practiceReadiness + patternResult.practiceReadiness) / 2,
      suggestedTopics: [...new Set([...aiResult.suggestedTopics, ...patternResult.suggestedTopics])],
      timestamp: Date.now()
    };
  }

  /**
   * Validate and normalize vibe type
   */
  private validateVibeType(vibe: string): VibeType {
    const validVibes: VibeType[] = ['understanding', 'confused', 'breakthrough', 'practicing', 'misunderstanding'];

    if (validVibes.includes(vibe as VibeType)) {
      return vibe as VibeType;
    }

    // Default to understanding for invalid vibes
    return 'understanding';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VibeDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Vibe detector configuration updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): VibeDetectionConfig {
    return { ...this.config };
  }
}