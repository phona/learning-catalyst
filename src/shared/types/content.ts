/**
 * Content Discovery Types
 * Types for content recommendations, discovery, and search functionality
 */

export interface ContentRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'concept' | 'path' | 'resource' | 'practice' | 'quiz';
  difficulty: number; // 0-1 scale
  estimatedTime: number; // minutes
  prerequisites: string[];
  relatedConcepts: string[];
  relevanceScore: number; // 0-1 scale
  reason: string;
  tags?: string[];
  imageUrl?: string;
  rating?: number;
  completedCount?: number;
}

export interface DiscoveryFilter {
  type?: ContentRecommendation['type'][];
  difficulty?: [number, number];
  topics?: string[];
  timeLimit?: number; // max minutes
  includeCompleted?: boolean;
  excludeMastered?: boolean;
  learningGoal?: string;
}

export interface SearchResult {
  id: string;
  type: 'concept' | 'path' | 'resource';
  title: string;
  description: string;
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'tag' | 'content';
  preview?: string;
  metadata?: Record<string, any>;
}

export interface LearningPathSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  estimatedDuration: number;
  concepts: Array<{
    id: string;
    name: string;
    order: number;
    isOptional: boolean;
  }>;
  completionRate?: number;
  userProgress?: number;
  recommendationScore: number;
  matchReason: string;
}

export interface RelatedContent {
  concept: {
    id: string;
    name: string;
    description: string;
    difficulty: number;
    tags: string[];
  };
  relationship: {
    type: string;
    strength: number;
    description?: string;
  };
  relevanceScore: number;
}

export interface ContentDiscoveryOptions {
  limit?: number;
  sortBy?: 'relevance' | 'difficulty' | 'popularity' | 'time';
  sortOrder?: 'asc' | 'desc';
  filters?: DiscoveryFilter;
}

export interface UserLearningProfile {
  userId: string;
  masteredConcepts: string[];
  inProgressConcepts: string[];
  preferredDifficulty: number;
  learningGoals: string[];
  averageSessionTime: number;
  preferredTopics: string[];
  skillLevel: number;
}

export interface DiscoveryAnalytics {
  searchQueries: Array<{
    query: string;
    timestamp: Date;
    resultsCount: number;
    clickedResult?: string;
  }>;
  recommendationInteractions: Array<{
    recommendationId: string;
    action: 'viewed' | 'started' | 'completed' | 'dismissed';
    timestamp: Date;
  }>;
  popularConcepts: Array<{
    conceptId: string;
    name: string;
    viewCount: number;
    completionRate: number;
  }>;
}

export interface ContentExplorationContext {
  currentConcept?: string;
  currentPath?: string;
  recentSearches: string[];
  userGoals: string[];
  sessionTopics: string[];
  timeConstraints?: number;
  skillLevel: number;
}

export interface RecommendationEngineConfig {
  weights: {
    difficultyMatch: number;
    topicRelevance: number;
    prerequisitesSatisfied: number;
    popularityBoost: number;
    recencyBoost: number;
  };
  maxRecommendations: number;
  refreshInterval: number; // minutes
  enablePersonalization: boolean;
}

export interface ContentTag {
  id: string;
  name: string;
  category: 'topic' | 'difficulty' | 'type' | 'skill' | 'domain';
  description?: string;
  usageCount: number;
  relatedTags: string[];
}

export interface DiscoverySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  startConcept?: string;
  exploredConcepts: string[];
  recommendationsGenerated: number;
  recommendationsAccepted: number;
  searchQueries: string[];
  goals: string[];
  context: ContentExplorationContext;
}

// Type guards
export function isConceptRecommendation(rec: ContentRecommendation): boolean {
  return rec.type === 'concept';
}

export function isPathRecommendation(rec: ContentRecommendation): boolean {
  return rec.type === 'path';
}

export function isResourceRecommendation(rec: ContentRecommendation): boolean {
  return rec.type === 'resource';
}

export function isPracticeRecommendation(rec: ContentRecommendation): boolean {
  return rec.type === 'practice';
}

export function isQuizRecommendation(rec: ContentRecommendation): boolean {
  return rec.type === 'quiz';
}

// Utility functions
export function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 0.3) return 'Beginner';
  if (difficulty < 0.6) return 'Intermediate';
  if (difficulty < 0.8) return 'Advanced';
  return 'Expert';
}

export function getEstimatedTimeDisplay(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}

export function getRelevanceScoreColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-blue-600';
  if (score >= 0.4) return 'text-yellow-600';
  return 'text-gray-600';
}