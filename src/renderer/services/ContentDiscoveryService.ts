/**
 * Content Discovery Service
 * Helps users discover related concepts, learning paths, and resources
 */

import type { Concept, ConceptRelationship, LearningPath } from '@/shared/types/knowledge';
import type { ContentRecommendation, DiscoveryFilter } from '@/shared/types/content';
import type { Database } from '@/main/services/database/kysely-schema';
import { Kysely } from 'kysely';

export interface DiscoveryOptions {
  limit?: number;
  includeCompleted?: boolean;
  difficultyRange?: [number, number]; // 0-1 scale
  topicFilter?: string[];
  learningGoal?: string;
}

export interface RelatedConcept {
  concept: Concept;
  relationship: ConceptRelationship;
  relevanceScore: number; // 0-1
}

export interface LearningRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'concept' | 'path' | 'resource' | 'practice';
  difficulty: number;
  estimatedTime: number; // minutes
  prerequisites: string[];
  relatedConcepts: string[];
  relevanceScore: number;
  reason: string; // Why this is recommended
}

interface UserConcept {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | undefined;
  concept_type: "topic" | "skill" | "fact" | "procedure" | "principle";
  difficulty_level: number;
  mastery_level: number;
  tags: string;
  metadata: string;
  review_count: number;
  user_mastery: number;
  completion_date: string;
}

/**
 * Content Discovery Service
 * Provides intelligent content recommendations based on user's knowledge graph and goals
 */
export class ContentDiscoveryService {
  constructor(
    private database: Kysely<Database>
  ) {}

  /**
   * Discover concepts related to a given concept
   */
  async discoverRelatedConcepts(
    conceptId: string,
    options: DiscoveryOptions = {}
  ): Promise<RelatedConcept[]> {
    const {
      limit = 10,
      difficultyRange = [0, 1],
      topicFilter = []
    } = options;

    try {
      // Get the target concept using Kysely
      const concepts = await this.database
        .selectFrom('concepts')
        .selectAll()
        .where('id', '=', conceptId)
        .execute();

      if (concepts.length === 0) {
        return [];
      }

      // Get related concepts through relationships using Kysely
      const relationships = await this.database
        .selectFrom('relationships')
        .innerJoin('concepts', (join) =>
          join.on((eb) =>
            eb.or([
              eb('relationships.target_concept_id', '=', eb.ref('concepts.id')),
              eb('relationships.source_concept_id', '=', eb.ref('concepts.id'))
            ])
          )
        )
        .selectAll()
        .where((eb) =>
          eb.or([
            eb('relationships.source_concept_id', '=', conceptId),
            eb('relationships.target_concept_id', '=', conceptId)
          ]).and('concepts.id', '!=', conceptId)
        )
        .orderBy('relationships.strength', 'desc')
        .limit(limit * 2)
        .execute();

      const relatedConcepts: RelatedConcept[] = [];

      for (const row of relationships) {
        const concept: Concept = {
          id: row.id,
          name: row.name,
          description: row.description,
          masteryLevel: row.mastery_level as 0 | 1 | 2 | 3 | 4 | 5,
          difficultyLevel: (row.difficulty_level || 3) as 1 | 2 | 3 | 4 | 5,
          tags: JSON.parse(row.tags || '[]'),
          metadata: JSON.parse(row.metadata || '{}'),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          conceptType: 'topic',
          reviewCount: 0
        };

        const relationship: ConceptRelationship = {
          sourceConceptId: row.source_concept_id,
          targetConceptId: row.target_concept_id,
          type: row.relationship_type,
          strength: row.strength,
          bidirectional: true,
          metadata: JSON.parse(row.metadata || '{}'),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBySession: row.created_by_session
        };

        // Check if concept meets criteria
        if (this.matchesCriteria(concept, difficultyRange, topicFilter)) {
          relatedConcepts.push({
            concept,
            relationship,
            relevanceScore: this.calculateRelevanceScore(relationship, concept)
          });
        }
      }

      // Sort by relevance score and limit
      return relatedConcepts
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to discover related concepts:', error);
      return [];
    }
  }

  /**
   * Get learning recommendations for a user
   */
  async getLearningRecommendations(
    userId: string,
    options: DiscoveryOptions = {}
  ): Promise<LearningRecommendation[]> {
    const {
      limit = 8,
      difficultyRange = [0, 1],
      topicFilter = [],
      learningGoal
    } = options;

    try {
      const recommendations: LearningRecommendation[] = [];

      // 1. Get user's current concepts and progress
      const userConcepts = await this.database
        .selectFrom('session_concepts as sc')
        .innerJoin('concepts as c', 'sc.concept_id', 'c.id')
        .innerJoin('learning_sessions as ls', 'sc.session_id', 'ls.id')
        .select([
          'c.id',
          'c.name',
          'c.description',
          'c.mastery_level',
          'c.difficulty_level',
          'c.concept_type',
          'c.tags',
          'c.metadata',
          'c.created_at',
          'c.updated_at',
          'c.review_count',
          'sc.mastery_after as user_mastery',
          'sc.created_at as completion_date'
        ])
        .where('ls.metadata', 'like', `%"userId":"${userId}"%`)
        .groupBy('c.id')
        .orderBy('sc.mastery_after', 'desc')
        .execute();

      const masteredTopics = userConcepts
        .filter((uc: UserConcept) => uc.user_mastery >= 0.7)
        .map((uc: UserConcept) => uc.name.toLowerCase());

      const inProgressTopics = userConcepts
        .filter((uc: UserConcept) => uc.user_mastery >= 0.3 && uc.user_mastery < 0.7)
        .map((uc: UserConcept) => uc.name.toLowerCase());

      // 2. Find concepts they should learn next
      const nextConcepts = await this.findNextConcepts(userConcepts, difficultyRange, topicFilter);

      nextConcepts.forEach(concept => {
        recommendations.push({
          id: concept.id,
          title: concept.name,
          description: concept.description || `Learn about ${concept.name}`,
          type: 'concept',
          difficulty: concept.difficultyLevel / 5, // Convert 1-5 scale to 0-1
          estimatedTime: this.estimateLearningTime(concept),
          prerequisites: this.getPrerequisites(concept),
          relatedConcepts: [concept.name],
          relevanceScore: this.calculateConceptRecommendationScore(concept, userConcepts, masteredTopics),
          reason: this.generateRecommendationReason(concept, userConcepts, masteredTopics)
        });
      });

      // 3. Suggest learning paths
      const learningPaths = await this.suggestLearningPaths(userId, masteredTopics, inProgressTopics);
      recommendations.push(...learningPaths);

      // 4. Suggest practice opportunities
      const practiceSuggestions = await this.suggestPracticeOpportunities(userConcepts, masteredTopics);
      recommendations.push(...practiceSuggestions);

      // Sort by relevance and limit
      return recommendations
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get learning recommendations:', error);
      return [];
    }
  }

  /**
   * Search for concepts with intelligent ranking
   */
  async searchConcepts(
    query: string,
    options: DiscoveryOptions = {}
  ): Promise<Concept[]> {
    const {
      limit = 20,
      difficultyRange = [0, 1],
      topicFilter = []
    } = options;

    try {
      // Enhanced search with multiple strategies
      const searchResults = await Promise.all([
        // Exact name matches
        this.searchByName(query, limit, difficultyRange, topicFilter),
        // Tag matches
        this.searchByTags(query, limit, difficultyRange, topicFilter),
        // Description matches
        this.searchByDescription(query, limit, difficultyRange, topicFilter)
      ]);

      // Combine and deduplicate results
      const allResults = searchResults.flat();
      const uniqueResults = new Map();

      for (const concept of allResults) {
        const relevanceScore = this.calculateSearchRelevance(concept, query);

        if (!uniqueResults.has(concept.id) || uniqueResults.get(concept.id).score < relevanceScore) {
          uniqueResults.set(concept.id, { concept, score: relevanceScore });
        }
      }

      // Sort by relevance score and return limited results
      return Array.from(uniqueResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.concept);

    } catch (error) {
      console.error('Failed to search concepts:', error);
      return [];
    }
  }

  /**
   * Get learning path suggestions
   */
  async getLearningPaths(
    userId: string,
    goal?: string,
    options: DiscoveryOptions = {}
  ): Promise<LearningPath[]> {
    try {
      // Since learning_paths table doesn't exist, we'll generate learning paths
      // based on concept relationships

      let query = this.database
        .selectFrom('concepts as c')
        .select([
          'c.id',
          'c.name',
          'c.description',
          'c.difficulty_level',
          'c.concept_type',
          'c.tags'
        ]);

      if (goal) {
        query = query.where((eb) =>
          eb.or([
            eb('c.name', 'like', `%${goal}%`),
            eb('c.description', 'like', `%${goal}%`)
          ])
        );
      }

      const concepts = await query
        .orderBy('c.difficulty_level', 'asc')
        .limit(20)
        .execute();

      // For now, return a simple learning path based on the concepts
      if (concepts.length === 0) {
        return [];
      }

      return [{
        id: `generated_path_${userId}_${Date.now()}`,
        title: goal ? `Learning Path: ${goal}` : 'Generated Learning Path',
        description: 'A personalized learning path based on your goals',
        estimatedDuration: concepts.length * 60, // 60 minutes per concept
        difficulty: concepts.reduce((sum: number, c: any) => sum + c.difficulty_level, 0) / concepts.length,
        concepts: concepts.map((c: any, index: number) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          order: index + 1,
          isOptional: false
        })),
        tags: concepts.flatMap((c: any) => JSON.parse(c.tags || '[]')),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

    } catch (error) {
      console.error('Failed to get learning paths:', error);
      return [];
    }
  }

  // Private helper methods

  private matchesCriteria(
    concept: Concept,
    difficultyRange: [number, number],
    topicFilter: string[]
  ): boolean {
    // Check difficulty range (convert 1-5 scale to 0-1)
    const normalizedDifficulty = concept.difficultyLevel / 5;
    if (normalizedDifficulty < difficultyRange[0] || normalizedDifficulty > difficultyRange[1]) {
      return false;
    }

    // Check topic filter
    if (topicFilter.length > 0) {
      const hasMatchingTag = concept.tags.some(tag =>
        topicFilter.some(filter => tag.toLowerCase().includes(filter.toLowerCase()))
      );
      const nameMatches = topicFilter.some(filter =>
        concept.name.toLowerCase().includes(filter.toLowerCase())
      );

      if (!hasMatchingTag && !nameMatches) {
        return false;
      }
    }

    return true;
  }

  private calculateRelevanceScore(
    relationship: ConceptRelationship,
    concept: Concept
  ): number {
    let score = relationship.strength;

    // Boost score for strong relationships
    if (relationship.type === 'prerequisite') {
      score *= 1.5;
    } else if (relationship.type === 'related') {
      score *= 1.2;
    }

    // Adjust based on concept difficulty (prefer not too easy/hard)
    const optimalDifficulty = 0.6; // slightly challenging
    const normalizedDifficulty = concept.difficultyLevel / 5;
    const difficultyBonus = 1 - Math.abs(normalizedDifficulty - optimalDifficulty);
    score *= (0.8 + difficultyBonus * 0.4);

    return Math.min(score, 1);
  }

  private estimateLearningTime(concept: Concept): number {
    // Base time depends on difficulty (convert 1-5 scale to 0-1)
    let baseTime = 30 + ((concept.difficultyLevel / 5) * 120); // 30-150 minutes

    // Adjust based on tags
    if (concept.tags.includes('advanced')) baseTime *= 1.5;
    if (concept.tags.includes('theoretical')) baseTime *= 1.3;
    if (concept.tags.includes('practical')) baseTime *= 0.9;

    return Math.round(baseTime);
  }

  private getPrerequisites(concept: Concept): string[] {
    // This would query relationships of type 'prerequisite'
    // For now, return empty array
    return [];
  }

  private calculateConceptRecommendationScore(
    concept: Concept,
    userConcepts: UserConcept[],
    masteredTopics: string[]
  ): number {
    let score = 0.5; // Base score

    // Boost if related to mastered concepts
    const relatedToMastered = concept.tags.some(tag =>
      masteredTopics.some(mastered => mastered.includes(tag.toLowerCase()))
    );
    if (relatedToMastered) score += 0.3;

    // Boost if at appropriate difficulty level
    const avgMastery = userConcepts.length > 0
      ? userConcepts.reduce((sum, uc) => sum + uc.user_mastery, 0) / userConcepts.length
      : 0.5;

    const difficultyMatch = 1 - Math.abs((concept.difficultyLevel / 5) - (avgMastery + 0.1));
    score += difficultyMatch * 0.2;

    return Math.min(score, 1);
  }

  private generateRecommendationReason(
    concept: Concept,
    userConcepts: UserConcept[],
    masteredTopics: string[]
  ): string {
    if (concept.tags.some(tag => masteredTopics.some(mastered => mastered.includes(tag.toLowerCase())))) {
      return `Builds on your knowledge of ${concept.tags.join(', ')}`;
    }

    if (concept.difficultyLevel <= 2) {
      return `Great starting point for learning ${concept.name}`;
    }

    return `Recommended based on your learning progress`;
  }

  private async findNextConcepts(
    userConcepts: UserConcept[],
    difficultyRange: [number, number],
    topicFilter: string[]
  ): Promise<Concept[]> {
    // Find concepts that are prerequisites for what user is learning
    // or that are logical next steps
    const userConceptIds = userConcepts.map(uc => uc.id);

    const nextConcepts = await this.database
      .selectFrom('concepts as c')
      .selectAll()
      .where('c.id', 'not in', userConceptIds)
      .where('c.difficulty_level', '>=', difficultyRange[0] * 5) // Convert 0-1 scale to 1-5
      .where('c.difficulty_level', '<=', difficultyRange[1] * 5)
      .orderBy('c.difficulty_level', 'asc')
      .limit(10)
      .execute();

    return this.formatConcepts(nextConcepts);
  }

  private async suggestLearningPaths(
    userId: string,
    masteredTopics: string[],
    inProgressTopics: string[]
  ): Promise<LearningRecommendation[]> {
    // This would analyze user's progress and suggest relevant learning paths
    // For now, return empty array
    return [];
  }

  private async suggestPracticeOpportunities(
    userConcepts: UserConcept[],
    masteredTopics: string[]
  ): Promise<LearningRecommendation[]> {
    // This would suggest practice exercises for mastered concepts
    // For now, return empty array
    return [];
  }

  private calculateSearchRelevance(concept: Concept, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Exact name match
    if (concept.name.toLowerCase() === queryLower) {
      score = 1.0;
    }
    // Name starts with query
    else if (concept.name.toLowerCase().startsWith(queryLower)) {
      score = 0.8;
    }
    // Name contains query
    else if (concept.name.toLowerCase().includes(queryLower)) {
      score = 0.6;
    }
    // Tag match
    else if (concept.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      score = 0.4;
    }
    // Description match
    else if (concept.description?.toLowerCase().includes(queryLower)) {
      score = 0.3;
    }

    return score;
  }

  private async searchByName(
    query: string,
    limit: number,
    difficultyRange: [number, number],
    topicFilter: string[]
  ): Promise<Concept[]> {
    const concepts = await this.database
      .selectFrom('concepts')
      .selectAll()
      .where('name', 'like', `%${query}%`)
      .where('difficulty_level', '>=', difficultyRange[0] * 5)
      .where('difficulty_level', '<=', difficultyRange[1] * 5)
      .orderBy('name', 'asc')
      .limit(limit)
      .execute();

    return this.formatConcepts(concepts);
  }

  private async searchByTags(
    query: string,
    limit: number,
    difficultyRange: [number, number],
    topicFilter: string[]
  ): Promise<Concept[]> {
    const concepts = await this.database
      .selectFrom('concepts')
      .selectAll()
      .where('tags', 'like', `%"${query}"%`)
      .where('difficulty_level', '>=', difficultyRange[0] * 5)
      .where('difficulty_level', '<=', difficultyRange[1] * 5)
      .limit(limit)
      .execute();

    return this.formatConcepts(concepts);
  }

  private async searchByDescription(
    query: string,
    limit: number,
    difficultyRange: [number, number],
    topicFilter: string[]
  ): Promise<Concept[]> {
    const concepts = await this.database
      .selectFrom('concepts')
      .selectAll()
      .where('description', 'like', `%${query}%`)
      .where('difficulty_level', '>=', difficultyRange[0] * 5)
      .where('difficulty_level', '<=', difficultyRange[1] * 5)
      .limit(limit)
      .execute();

    return this.formatConcepts(concepts);
  }

  private formatConcepts(rows: any[]): Concept[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      masteryLevel: row.mastery_level as 0 | 1 | 2 | 3 | 4 | 5,
      difficultyLevel: (row.difficulty_level || row.difficulty || 3) as 1 | 2 | 3 | 4 | 5,
      conceptType: row.concept_type || 'topic',
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      reviewCount: row.review_count || 0
    }));
  }
}

// Factory function for dependency injection
