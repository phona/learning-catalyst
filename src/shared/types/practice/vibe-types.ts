/**
 * Vibe Detection Types
 *
 * Specialized types for vibe detection algorithms and confidence scoring.
 * Complements practice-context.ts with detailed detection logic types.
 */

import { VibeType, PracticeVibeResult } from './practice-context';

export interface VibeIndicator {
  type: 'keyword' | 'phrase' | 'sentiment' | 'engagement' | 'timing' | 'confidence';
  value: string | number;
  weight: number;
  detectedIn: string; // message content or metadata
  confidence: number;
}

export interface VibeDetectionRequest {
  conversationHistory: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    concepts?: string[];
    sentiment?: number; // -1 to 1
    confidence?: number; // 0 to 1
  }>;
  userContext: {
    currentTopic?: string;
    confidenceLevel: number;
    learningVelocity: number;
    stuckPoints: string[];
    recentConcepts: string[];
    lastPracticeTime?: number;
  };
  config: {
    minMessages: number;
    confidenceThreshold: number;
    maxConversationAge: number;
    contextWindow: number;
  };
}

export interface VibeDetectionResult extends PracticeVibeResult {
  indicators: VibeIndicator[];
  alternativeVibes: Array<{
    vibe: VibeType;
    confidence: number;
    reasoning: string;
  }>;
  detectionMetadata: {
    totalIndicators: number;
    confidenceDistribution: Record<VibeType, number>;
    processingTime: number;
    modelUsed: string;
  };
}

export interface VibePattern {
  id: string;
  name: string;
  description: string;
  vibe: VibeType;
  patterns: Array<{
    type: 'regex' | 'keyword' | 'sentiment' | 'timing' | 'phrase';
    pattern: string | RegExp;
    weight: number;
    context?: string; // Optional context requirement
  }>;
  conditions: {
    minConfidence?: number;
    maxAge?: number;
    minMessages?: number;
    requiredConcepts?: string[];
  };
}

export interface ConfidenceScoring {
  primary: number; // 0-1
  secondary: number; // 0-1
  factors: {
    linguistic: number; // 0-1
    contextual: number; // 0-1
    temporal: number; // 0-1
    behavioral: number; // 0-1
  };
  breakdown: {
    keywordMatches: Array<{keyword: string; confidence: number; weight: number}>;
    phrasePatterns: Array<{phrase: string; confidence: number; weight: number}>;
    sentimentAnalysis: {score: number; confidence: number};
    engagementMetrics: {level: number; consistency: number};
    timingFactors: {optimal: boolean; recency: number};
  };
}

export interface VibeTransition {
  from: VibeType;
  to: VibeType;
  timestamp: number;
  triggerMessage: string;
  confidence: number;
  context: string;
  factors: Array<{
    factor: string;
    impact: number; // -1 to 1
    confidence: number;
  }>;
}

export interface VibeAnalysisSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  initialVibe?: VibeType;
  currentVibe?: VibeType;
  transitions: VibeTransition[];
  practiceSuggestions: Array<{
    timestamp: number;
    suggestion: string;
    accepted?: boolean;
    outcome?: string;
  }>;
  effectiveness: {
    suggestionAccuracy: number;
    acceptanceRate: number;
    userSatisfaction?: number;
  };
}

export interface VibeDetectionModel {
  name: string;
  version: string;
  provider: string;
  capabilities: {
    vibeTypes: VibeType[];
    confidenceScoring: boolean;
    contextualAnalysis: boolean;
    multilingual: boolean;
  };
  performance: {
    accuracy: number; // Against labeled dataset
    responseTime: number; // milliseconds
    tokenUsage: number; // average tokens per request
  };
  config: {
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
}

// Pre-defined vibe patterns for common learning situations
export const VIBE_PATTERNS: Record<VibeType, VibePattern[]> = {
  understanding: [
    {
      id: 'understanding-expressions',
      name: 'Understanding Expressions',
      description: 'User expresses clear understanding of concepts',
      vibe: 'understanding',
      patterns: [
        { type: 'keyword', pattern: 'got it', weight: 0.8 },
        { type: 'keyword', pattern: 'understand', weight: 0.7 },
        { type: 'keyword', pattern: 'makes sense', weight: 0.8 },
        { type: 'phrase', pattern: /\b(I get|that makes|now I see|clear now|understood)\b/i, weight: 0.9 },
        { type: 'sentiment', pattern: 'positive', weight: 0.5 }
      ],
      conditions: {
        minConfidence: 0.6,
        minMessages: 2
      }
    }
  ],
  confused: [
    {
      id: 'confusion-indicators',
      name: 'Confusion Indicators',
      description: 'User shows confusion or uncertainty',
      vibe: 'confused',
      patterns: [
        { type: 'keyword', pattern: 'confused', weight: 0.9 },
        { type: 'keyword', pattern: "don't understand", weight: 0.8 },
        { type: 'keyword', pattern: 'unclear', weight: 0.7 },
        { type: 'phrase', pattern: /\b(I don't|not sure|what do you mean|can you explain|why does)\b/i, weight: 0.8 },
        { type: 'sentiment', pattern: 'negative', weight: 0.4 }
      ],
      conditions: {
        minConfidence: 0.6,
        minMessages: 1
      }
    }
  ],
  breakthrough: [
    {
      id: 'breakthrough-moments',
      name: 'Breakthrough Moments',
      description: 'User has sudden insight or understanding',
      vibe: 'breakthrough',
      patterns: [
        { type: 'keyword', pattern: 'aha', weight: 0.9 },
        { type: 'keyword', pattern: 'finally', weight: 0.8 },
        { type: 'keyword', pattern: 'eureka', weight: 0.9 },
        { type: 'phrase', pattern: /\b(oh I see|now I get it|that clicks|suddenly|it hits me)\b/i, weight: 0.9 },
        { type: 'sentiment', pattern: 'excited', weight: 0.7 }
      ],
      conditions: {
        minConfidence: 0.7,
        minMessages: 2
      }
    }
  ],
  practicing: [
    {
      id: 'practice-indicators',
      name: 'Practice Indicators',
      description: 'User is actively practicing or applying concepts',
      vibe: 'practicing',
      patterns: [
        { type: 'keyword', pattern: 'try', weight: 0.6 },
        { type: 'keyword', pattern: 'working on', weight: 0.7 },
        { type: 'keyword', pattern: 'implement', weight: 0.8 },
        { type: 'phrase', pattern: /\b(let me|I'll try|how do I|can I implement)\b/i, weight: 0.7 },
        { type: 'timing', pattern: 'active', weight: 0.5 }
      ],
      conditions: {
        minConfidence: 0.5,
        minMessages: 1
      }
    }
  ],
  misunderstanding: [
    {
      id: 'misunderstanding-signals',
      name: 'Misunderstanding Signals',
      description: 'User demonstrates incorrect understanding',
      vibe: 'misunderstanding',
      patterns: [
        { type: 'keyword', pattern: 'wrong', weight: 0.8 },
        { type: 'keyword', pattern: 'error', weight: 0.7 },
        { type: 'phrase', pattern: /\b(I thought|but isn't|shouldn't it|that doesn't make sense)\b/i, weight: 0.8 },
        { type: 'sentiment', pattern: 'frustrated', weight: 0.6 }
      ],
      conditions: {
        minConfidence: 0.6,
        minMessages: 2
      }
    }
  ]
};

// Confidence calculation weights
export const CONFIDENCE_WEIGHTS = {
  keywordMatch: 0.4,
  phraseMatch: 0.3,
  sentiment: 0.2,
  timing: 0.1
};

// Vibe transition patterns (what vibes can logically follow others)
export const VALID_VIBE_TRANSITIONS: Record<VibeType, VibeType[]> = {
  understanding: ['practicing', 'breakthrough', 'confused'],
  confused: ['understanding', 'breakthrough', 'misunderstanding'],
  breakthrough: ['practicing', 'understanding'],
  practicing: ['understanding', 'confused', 'breakthrough', 'misunderstanding'],
  misunderstanding: ['confused', 'understanding']
};