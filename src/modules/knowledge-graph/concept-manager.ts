/**
 * Concept Manager
 *
 * High-level interface for managing concepts and their relationships.
 * Provides convenience methods for common concept operations.
 */

import { KnowledgeGraphModule, Concept, Relationship } from './knowledge-graph';

export interface ConceptCreateData {
  name: string;
  description?: string;
  content?: string;
  conceptType: Concept['conceptType'];
  difficultyLevel: Concept['difficultyLevel'];
  tags?: string[];
  parentConceptId?: string;
  metadata?: Record<string, any>;
}

export interface ConceptUpdateData {
  name?: string;
  description?: string;
  content?: string;
  conceptType?: Concept['conceptType'];
  difficultyLevel?: Concept['difficultyLevel'];
  masteryLevel?: Concept['masteryLevel'];
  tags?: string[];
  parentConceptId?: string;
  metadata?: Record<string, any>;
}

export interface ConceptSearchParams {
  query?: string;
  types?: Concept['conceptType'][];
  difficultyRange?: [number, number];
  masteryRange?: [number, number];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface LearningRecommendation {
  concept: Concept;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // minutes
  prerequisites: Concept[];
}

export class ConceptManager {
  constructor(private knowledgeGraph: KnowledgeGraphModule) {}

  /**
   * Create a new concept with validation
   */
  async createConcept(data: ConceptCreateData): Promise<Concept> {
    // Validate input
    this.validateConceptData(data);

    // Check for duplicate concepts
    const existing = await this.findConceptByName(data.name);
    if (existing) {
      throw new Error(`Concept with name "${data.name}" already exists`);
    }

    // Create the concept
    const concept = await this.knowledgeGraph.createConcept({
      ...data,
      tags: data.tags || [],
      metadata: data.metadata || {},
      masteryLevel: 0,
      lastReviewed: undefined
    });

    // Auto-create relationships if parent concept is specified
    if (data.parentConceptId) {
      try {
        await this.knowledgeGraph.createRelationship(
          data.parentConceptId,
          concept.id,
          'contains',
          0.8,
          'Parent-child relationship'
        );
      } catch (error) {
        console.warn('Failed to create parent relationship:', error);
      }
    }

    return concept;
  }

  /**
   * Update an existing concept
   */
  async updateConcept(id: string, data: ConceptUpdateData): Promise<Concept | null> {
    const existing = await this.knowledgeGraph.getConcept(id);
    if (!existing) {
      throw new Error('Concept not found');
    }

    // Validate updates
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.findConceptByName(data.name);
      if (duplicate) {
        throw new Error(`Concept with name "${data.name}" already exists`);
      }
    }

    return await this.knowledgeGraph.updateConcept(id, data);
  }

  /**
   * Delete a concept and handle cleanup
   */
  async deleteConcept(id: string, force = false): Promise<boolean> {
    const concept = await this.knowledgeGraph.getConcept(id);
    if (!concept) {
      return false;
    }

    // Check for dependent concepts
    if (!force) {
      const relationships = await this.knowledgeGraph.getRelationships(id);
      const dependents = relationships.filter(rel => rel.relationshipType === 'prerequisite' && rel.targetConceptId === id);

      if (dependents.length > 0) {
        const dependentNames = [];
        for (const rel of dependents) {
          const dependentConcept = await this.knowledgeGraph.getConcept(rel.sourceConceptId);
          if (dependentConcept) {
            dependentNames.push(dependentConcept.name);
          }
        }

        throw new Error(`Cannot delete concept "${concept.name}" because it is a prerequisite for: ${dependentNames.join(', ')}. Use force=true to override.`);
      }
    }

    return await this.knowledgeGraph.deleteConcept(id);
  }

  /**
   * Search for concepts with advanced filtering
   */
  async searchConcepts(params: ConceptSearchParams = {}): Promise<Concept[]> {
    return await this.knowledgeGraph.searchConcepts({
      query: params.query,
      conceptTypes: params.types,
      difficultyRange: params.difficultyRange,
      masteryRange: params.masteryRange,
      tags: params.tags,
      limit: params.limit || 50,
      offset: params.offset || 0
    });
  }

  /**
   * Find concept by exact name match
   */
  async findConceptByName(name: string): Promise<Concept | null> {
    const results = await this.knowledgeGraph.searchConcepts({
      query: name,
      limit: 1
    });

    // Find exact match
    return results.find(concept => concept.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get concepts that need review
   */
  async getConceptsNeedingReview(daysThreshold = 7): Promise<Concept[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const allConcepts = await this.knowledgeGraph.searchConcepts({ limit: 1000 });

    return allConcepts.filter(concept => {
      // Hasn't been reviewed in threshold days, or never reviewed
      const needsReview = !concept.lastReviewed || concept.lastReviewed < thresholdDate;

      // Mastery level is not yet maxed
      const canImprove = concept.masteryLevel < 5;

      return needsReview && canImprove;
    });
  }

  /**
   * Get concept suggestions based on learning progress
   */
  async getLearningRecommendations(sessionContext?: string): Promise<LearningRecommendation[]> {
    const allConcepts = await this.knowledgeGraph.searchConcepts({ limit: 1000 });
    const recommendations: LearningRecommendation[] = [];

    for (const concept of allConcepts) {
      // Skip mastered concepts
      if (concept.masteryLevel >= 5) {
        continue;
      }

      const priority = this.calculatePriority(concept);
      if (priority === 'low') {
        continue;
      }

      // Get prerequisites
      const relationships = await this.knowledgeGraph.getRelationships(concept.id);
      const prerequisiteIds = relationships
        .filter(rel => rel.relationshipType === 'prerequisite' && rel.targetConceptId === concept.id)
        .map(rel => rel.sourceConceptId);

      const prerequisites: Concept[] = [];
      for (const prereqId of prerequisiteIds) {
        const prereq = await this.knowledgeGraph.getConcept(prereqId);
        if (prereq) {
          prerequisites.push(prereq);
        }
      }

      // Check if prerequisites are met
      const unmetPrerequisites = prerequisites.filter(prereq => prereq.masteryLevel < 3);
      if (unmetPrerequisites.length > 0) {
        continue; // Skip if prerequisites aren't met
      }

      recommendations.push({
        concept,
        reason: this.generateRecommendationReason(concept, prerequisites),
        priority,
        estimatedTime: this.estimateStudyTime(concept),
        prerequisites
      });
    }

    // Sort by priority and difficulty
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // If same priority, sort by difficulty (easier first)
      return a.concept.difficultyLevel - b.concept.difficultyLevel;
    });

    return recommendations.slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Update concept mastery after study session
   */
  async updateMastery(conceptId: string, performanceScore: number, timeSpent: number): Promise<Concept | null> {
    const concept = await this.knowledgeGraph.getConcept(conceptId);
    if (!concept) {
      throw new Error('Concept not found');
    }

    // Calculate new mastery level based on performance
    let newMasteryLevel = concept.masteryLevel;

    if (performanceScore >= 90) {
      newMasteryLevel = Math.min(5, concept.masteryLevel + 1) as Concept['masteryLevel'];
    } else if (performanceScore >= 70) {
      // Maintain or slight increase
      if (concept.masteryLevel === 0 && performanceScore >= 80) {
        newMasteryLevel = 1;
      }
    } else if (performanceScore < 50) {
      // Decrease mastery level
      newMasteryLevel = Math.max(0, concept.masteryLevel - 1) as Concept['masteryLevel'];
    }

    // Update the concept
    const updated = await this.knowledgeGraph.updateConcept(conceptId, {
      masteryLevel: newMasteryLevel,
      lastReviewed: new Date(),
      reviewCount: concept.reviewCount + 1,
      metadata: {
        ...concept.metadata,
        lastStudySession: {
          date: new Date().toISOString(),
          performanceScore,
          timeSpent,
          previousMasteryLevel: concept.masteryLevel
        }
      }
    });

    return updated;
  }

  /**
   * Get learning path for a concept
   */
  async getLearningPath(conceptId: string): Promise<Concept[]> {
    const path = await this.knowledgeGraph.findPath('root', conceptId);
    if (!path) {
      // If no path from root, try to find prerequisites
      const concept = await this.knowledgeGraph.getConcept(conceptId);
      if (!concept) {
        return [];
      }

      const relationships = await this.knowledgeGraph.getRelationships(conceptId);
      const prerequisiteIds = relationships
        .filter(rel => rel.relationshipType === 'prerequisite' && rel.targetConceptId === conceptId)
        .map(rel => rel.sourceConceptId);

      const prerequisites: Concept[] = [];
      for (const prereqId of prerequisiteIds) {
        const prereq = await this.knowledgeGraph.getConcept(prereqId);
        if (prereq) {
          prerequisites.push(prereq);
        }
      }

      return prerequisites.sort((a, b) => a.difficultyLevel - b.difficultyLevel);
    }

    return path.concepts;
  }

  /**
   * Get concept statistics
   */
  async getConceptStats(conceptId: string): Promise<any> {
    const concept = await this.knowledgeGraph.getConcept(conceptId);
    if (!concept) {
      throw new Error('Concept not found');
    }

    const relationships = await this.knowledgeGraph.getRelationships(conceptId);
    const relatedConcepts = await this.knowledgeGraph.getRelatedConcepts(conceptId);

    // Calculate various metrics
    const prerequisites = relationships.filter(rel => rel.relationshipType === 'prerequisite' && rel.targetConceptId === conceptId);
    const contains = relationships.filter(rel => rel.relationshipType === 'contains' && rel.sourceConceptId === conceptId);
    const related = relationships.filter(rel => rel.relationshipType === 'related');

    const avgRelationshipStrength = relationships.length > 0
      ? relationships.reduce((sum, rel) => sum + rel.strength, 0) / relationships.length
      : 0;

    return {
      concept,
      totalRelationships: relationships.length,
      prerequisites: prerequisites.length,
      contains: contains.length,
      related: related.length,
      relatedConcepts: relatedConcepts.length,
      averageRelationshipStrength: avgRelationshipStrength,
      daysSinceLastReview: concept.lastReviewed
        ? Math.floor((Date.now() - concept.lastReviewed.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      studyEfficiency: concept.reviewCount > 0 ? concept.masteryLevel / concept.reviewCount : 0
    };
  }

  /**
   * Bulk import concepts from data
   */
  async importConcepts(conceptsData: ConceptCreateData[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const data of conceptsData) {
      try {
        await this.createConcept(data);
        imported++;
      } catch (error) {
        errors.push(`Failed to import "${data.name}": ${(error as Error).message}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Export concepts to data
   */
  async exportConcepts(conceptIds?: string[]): Promise<Concept[]> {
    if (conceptIds) {
      const concepts: Concept[] = [];
      for (const id of conceptIds) {
        const concept = await this.knowledgeGraph.getConcept(id);
        if (concept) {
          concepts.push(concept);
        }
      }
      return concepts;
    } else {
      return await this.knowledgeGraph.searchConcepts({ limit: 10000 });
    }
  }

  // Private helper methods

  private validateConceptData(data: ConceptCreateData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Concept name is required');
    }

    if (data.name.length > 200) {
      throw new Error('Concept name must be less than 200 characters');
    }

    if (data.difficultyLevel < 1 || data.difficultyLevel > 5) {
      throw new Error('Difficulty level must be between 1 and 5');
    }

    const validTypes = ['topic', 'skill', 'fact', 'procedure', 'principle'];
    if (!validTypes.includes(data.conceptType)) {
      throw new Error(`Concept type must be one of: ${validTypes.join(', ')}`);
    }

    if (data.tags && data.tags.length > 20) {
      throw new Error('Cannot have more than 20 tags');
    }
  }

  private calculatePriority(concept: Concept): 'high' | 'medium' | 'low' {
    // High priority: Low mastery, recently studied, or easy concepts that should be mastered
    if (concept.masteryLevel <= 2 && concept.difficultyLevel <= 3) {
      return 'high';
    }

    // Medium priority: Medium mastery or difficulty
    if (concept.masteryLevel <= 3 && concept.difficultyLevel <= 4) {
      return 'medium';
    }

    // Low priority: High mastery or very difficult concepts
    return 'low';
  }

  private generateRecommendationReason(concept: Concept, prerequisites: Concept[]): string {
    if (concept.masteryLevel === 0) {
      return `New concept: ${concept.name}`;
    }

    if (concept.masteryLevel <= 2) {
      return `Strengthen foundation: ${concept.name}`;
    }

    if (prerequisites.length > 0) {
      const prereqNames = prerequisites.map(p => p.name).join(', ');
      return `Build upon: ${prereqNames} → ${concept.name}`;
    }

    return `Continue learning: ${concept.name}`;
  }

  private estimateStudyTime(concept: Concept): number {
    // Base time in minutes, adjusted by difficulty and mastery
    const baseTime = 15;
    const difficultyMultiplier = concept.difficultyLevel;
    const masteryMultiplier = Math.max(0.5, (5 - concept.masteryLevel) / 5);

    return Math.round(baseTime * difficultyMultiplier * masteryMultiplier);
  }
}