/**
 * Practice Context Types
 *
 * Types for context-aware practice detection and user learning state tracking.
 * Part of Phase 1 implementation for vibe detection and natural practice flow.
 */

export type VibeType = 'understanding' | 'confused' | 'breakthrough' | 'practicing' | 'misunderstanding';

export interface PracticeVibeResult {
  vibe: VibeType;
  confidence: number; // 0-1
  reasoning: string;
  practiceReadiness: number; // 0-1
  suggestedTopics: string[];
  detectedFrom: string[]; // Which messages/indicators triggered this detection
  timestamp: number;
}

export interface UserContext {
  id: string;
  sessionId: string;
  currentTopic?: string;
  currentProject?: {
    name: string;
    type: 'react' | 'node' | 'python' | 'general' | 'vue' | 'angular';
    files: string[];
    recentActivity: string[];
  };
  confidenceLevel: number; // 0-1
  learningVelocity: number; // Concepts per session
  stuckPoints: string[];
  recentConcepts: Array<{
    concept: string;
    confidence: number;
    firstSeen: number;
    lastSeen: number;
    practiceCount: number;
  }>;
  practiceHistory: Array<{
    timestamp: number;
    type: string;
    success: boolean;
    topic: string;
    vibe: VibeType;
    duration: number;
  }>;
  lastPracticeTime?: number;
  engagementLevel: number; // 0-1
  preferences: {
    practiceFrequency: 'high' | 'medium' | 'low';
    difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive';
    feedbackStyle: 'gentle' | 'direct' | 'encouraging';
  };
  statistics: {
    totalPracticeSessions: number;
    successRate: number;
    averageSessionLength: number;
    preferredPracticeTimes: number[]; // Hours of day
  };
}

export interface ConversationContext {
  sessionId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    concepts: string[];
    confidence: number;
    vibe?: VibeType;
    practiceOpportunities: string[];
  }>;
  topicTransitions: Array<{
    from: string;
    to: string;
    timestamp: number;
    confidence: number;
    triggerMessage: string;
  }>;
  keyConcepts: Array<{
    concept: string;
    frequency: number;
    confidence: number;
    lastMentioned: number;
    context: string[];
    practicePotential: number; // 0-1
  }>;
  practiceOpportunities: Array<{
    id: string;
    concept: string;
    type: 'coding' | 'quiz' | 'discussion' | 'project' | 'debugging';
    difficulty: 'easy' | 'medium' | 'hard';
    confidence: number;
    suggestedBy: string;
    reasoning: string;
    timing: 'immediate' | 'soon' | 'later';
    naturalPrompt: string;
  }>;
}

export interface PracticeOpportunity {
  id: string;
  type: VibeType;
  concept: string;
  suggestedPractice: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reasoning: string;
  timing: 'immediate' | 'soon' | 'later';
  confidence: number;
  userProject?: string;
  naturalLanguagePrompt: string;
  prerequisites: string[];
  estimatedTime: number; // minutes
  successProbability: number; // 0-1
}

export interface VibeDetectionConfig {
  confidenceThreshold: number; // Default: 0.7
  practiceReadinessThreshold: number; // Default: 0.8
  minMessagesForDetection: number; // Default: 3
  maxConversationAge: number; // Default: 30 minutes
  practiceCooldown: number; // Default: 30 minutes
  vibeWeights: Record<VibeType, number>;
  contextWindow: number; // Default: 10 messages
  maxPracticeOpportunities: number; // Default: 3 per analysis
}

export interface LearningPattern {
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
}

export interface ContextAnalysisResult {
  userContext: UserContext;
  conversationContext: ConversationContext;
  practiceOpportunities: PracticeOpportunity[];
  recommendations: Array<{
    type: 'practice' | 'review' | 'advance' | 'break';
    priority: 'high' | 'medium' | 'low';
    description: string;
    reasoning: string;
    estimatedImpact: number; // 0-1
  }>;
  analysisMetadata: {
    totalMessages: number;
    conceptsIdentified: number;
    opportunitiesFound: number;
    analysisTime: number;
    confidence: number;
    modelUsed: string;
    tokensProcessed: number;
  };
}

export interface PracticeSuggestionRequest {
  sessionId: string;
  conversationHistory: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
  userContext: UserContext;
  currentTopic?: string;
  immediateContext?: string;
  previousSuggestions?: string[];
}

export interface PracticeSuggestionResult {
  shouldSuggest: boolean;
  suggestion?: PracticeOpportunity;
  reasoning: string;
  confidence: number;
  alternatives: PracticeOpportunity[];
  timing: {
    optimal: 'now' | 'soon' | 'later';
    reason: string;
    estimatedReadiness: number; // 0-1
  };
}

// Default configurations
export const DEFAULT_VIBE_DETECTION_CONFIG: VibeDetectionConfig = {
  confidenceThreshold: 0.7,
  practiceReadinessThreshold: 0.8,
  minMessagesForDetection: 3,
  maxConversationAge: 30 * 60 * 1000, // 30 minutes
  practiceCooldown: 30 * 60 * 1000, // 30 minutes
  vibeWeights: {
    understanding: 0.3,
    confused: 0.2,
    breakthrough: 0.25,
    practicing: 0.15,
    misunderstanding: 0.1
  },
  contextWindow: 10,
  maxPracticeOpportunities: 3
};

// Vibe type descriptions for prompting
export const VIBE_TYPE_DESCRIPTIONS: Record<VibeType, string> = {
  understanding: 'User demonstrates comprehension of concepts, asks clarifying questions, and shows readiness to apply knowledge',
  confused: 'User shows uncertainty, asks for clarification, expresses difficulty understanding concepts',
  breakthrough: 'User has sudden insight or understanding, often expressed with excitement or "aha!" moments',
  practicing: 'User is actively applying concepts, experimenting with code, or working on exercises',
  misunderstanding: 'User demonstrates incorrect understanding, needs correction or guidance'
};

// Practice opportunity templates
export const PRACTICE_TEMPLATES: Record<VibeType, string[]> = {
  understanding: [
    "Great! Now that you understand {concept}, try {practice_suggestion}",
    "Nice grasp of {concept}! Want to challenge yourself with {practice_suggestion}?",
    "You've got {concept} down. How about we apply it with {practice_suggestion}?"
  ],
  confused: [
    "Let's clarify {concept} with a hands-on approach: {practice_suggestion}",
    "Sometimes practice helps understanding. Try {practice_suggestion} to get {concept}",
    "Let's work through {concept} together with {practice_suggestion}"
  ],
  breakthrough: [
    "Excellent breakthrough! Since you've cracked {concept}, let's solidify it with {practice_suggestion}",
    "That 'aha!' moment for {concept} is perfect! Now try {practice_suggestion}",
    "Fantastic insight on {concept}! Let's build on that with {practice_suggestion}"
  ],
  practicing: [
    "Great work practicing {concept}! Here's a related challenge: {practice_suggestion}",
    "Since you're working on {concept}, try this next step: {practice_suggestion}",
    "Your {concept} practice is going well! Let's extend it with {practice_suggestion}"
  ],
  misunderstanding: [
    "Let's clear up that {concept} misunderstanding with {practice_suggestion}",
    "I see where {concept} might be confusing. Let's correct it with {practice_suggestion}",
    "That's a common {concept} misunderstanding. Try {practice_suggestion} to see the right approach"
  ]
};