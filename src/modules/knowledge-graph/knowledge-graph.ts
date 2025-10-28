/**
 * Knowledge Graph Module
 *
 * Manages concepts and their relationships for learning organization.
 * Provides semantic search, concept discovery, and relationship mapping.
 */

import { IDatabase, DatabaseHealthStatus, ResourceUsage } from '../database/database-factory';
import { JSONUtils } from '../database/database-schema';
import { VectorDatabaseModule, SearchResult } from '../vector-database/vector-database';

export interface Concept {
  id: string;
  name: string;
  description?: string;
  content?: string;
  conceptType: 'topic' | 'skill' | 'fact' | 'procedure' | 'principle';
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastReviewed?: Date;
  reviewCount: number;
  parentConceptId?: string;
}

export interface Relationship {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: 'prerequisite' | 'related' | 'contains' | 'example' | 'application' | 'contrasts';
  strength: number; // 0-1
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBySession?: string;
}

export interface ConceptNode {
  concept: Concept;
  relationships: Relationship[];
  relatedConcepts: Concept[];
  children: ConceptNode[];
  parents: ConceptNode[];
}

export interface KnowledgeGraphStats {
  totalConcepts: number;
  totalRelationships: number;
  conceptsByType: Record<string, number>;
  averageMasteryLevel: number;
  conceptsNeedingReview: number;
  recentlyStudied: number;
}

export interface GraphSearchOptions {
  query?: string;
  conceptTypes?: string[];
  difficultyRange?: [number, number];
  masteryRange?: [number, number];
  tags?: string[];
  includeRelationships?: boolean;
  limit?: number;
  offset?: number;
}

export interface ConceptPath {
  concepts: Concept[];
  relationships: Relationship[];
  totalStrength: number;
  difficulty: number;
}


export class KnowledgeGraphModule {
  public readonly name = 'KnowledgeGraphModule';
  public readonly version = '1.0.0';
  private databaseModule: IDatabase;
  private vectorDatabaseModule: VectorDatabaseModule;

  get initialized(): boolean {
    return this._isInitialized;
  }

  
  // Update vector database with real module when available
  async updateVectorDatabase(conceptId: string): Promise<void> {
    if (this.vectorDatabaseModule?.isInitialized) {
      try {
        const concept = await this.getConcept(conceptId);
        if (concept) {
          const content = `${concept.name} ${concept.description || ''} ${concept.content || ''} ${concept.tags.join(' ')}`;
          await this.vectorDatabaseModule.addDocument({
            id: conceptId,
            content,
            metadata: {
              type: 'concept',
              conceptType: concept.conceptType,
              difficultyLevel: concept.difficultyLevel,
              masteryLevel: concept.masteryLevel,
              tags: concept.tags
            }
          });
        }
      } catch (error) {
        console.error('Failed to update vector database:', error);
      }
    }
  }
  private conceptCache: Map<string, Concept> = new Map();
  private relationshipCache: Map<string, Relationship[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> concept IDs
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;
  private _isInitialized = false;

  constructor(databaseModule: IDatabase, vectorDatabaseModule: VectorDatabaseModule) {
    this.databaseModule = databaseModule;
    this.vectorDatabaseModule = vectorDatabaseModule;

    // Initialize empty caches
    this.conceptCache.clear();
    this.relationshipCache.clear();
    this.searchIndex.clear();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  
  async initialize(): Promise<void> {
    try {

      // Initialize search index (simplified - don't load all concepts during init)
      // The search index will be built lazily when first needed
      this.searchIndex.clear();
      this.conceptCache.clear();
      this.relationshipCache.clear();
      this.lastCacheUpdate = 0;

      this._isInitialized = true;

      console.log('Knowledge graph initialized successfully');
    } catch (error) {
      throw error;
    }
  }

  async start(): Promise<void> {
    try {

      // Perform a simple health check (avoiding complex queries)
      const dbStats = await this.databaseModule.getDatabaseStats();
      if (!dbStats) {
        console.warn('Warning: Could not verify database connection');
      }

      console.log('Knowledge graph started successfully');
    } catch (error) {
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear caches
      this.clearCaches();

      console.log('Knowledge graph stopped successfully');
    } catch (error) {
      console.error('Error stopping knowledge graph:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.clearCaches();
      this._isInitialized = false;

      console.log('Knowledge graph cleaned up');
    } catch (error) {
      console.error('Error cleaning up knowledge graph:', error);
      throw error;
    }
  }

  
  async getResourceUsage(): Promise<ResourceUsage> {
    return {
      memory: {
        used: this.conceptCache.size * 1000, // Rough estimate
        allocated: this.conceptCache.size * 1200,
        peak: this.conceptCache.size * 1200
      },
      cpu: { usage: 0, time: 0 },
      connections: { active: 0, total: 0 },
      storage: {
        used: 0, // Storage usage is handled by database module
        allocated: 0
      }
    };
  }

  
  // Public API methods

  /**
   * Create a new concept
   */
  async createConcept(conceptData: Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount'>): Promise<Concept> {

    const id = await this.databaseModule.createConcept({
      name: conceptData.name,
      description: conceptData.description,
      content: conceptData.content,
      concept_type: conceptData.conceptType,
      difficulty_level: conceptData.difficultyLevel,
      mastery_level: conceptData.masteryLevel,
      tags: JSONUtils.stringifyArray(conceptData.tags),
      metadata: JSONUtils.stringifyObject(conceptData.metadata),
      last_reviewed: conceptData.lastReviewed,
      review_count: 0,
      parent_concept_id: conceptData.parentConceptId
    });

    const concept: Concept = {
      ...conceptData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewCount: 0
    };

    // Update cache and search index
    this.conceptCache.set(id, concept);
    this.updateSearchIndexForConcept(concept);

    // Update vector database if available
    if (this.vectorDatabaseModule?.isInitialized) {
      await this.updateKnowledgeGraph(concept.id);
    }

    // Emit event
    await this.emitEvent('concept_created', { concept });

    return concept;
  }

  /**
   * Get a concept by ID
   */
  async getConcept(id: string): Promise<Concept | null> {
    // Check cache first
    if (this.conceptCache.has(id)) {
      return this.conceptCache.get(id)!;
    }

    
    const record = await this.databaseModule.getConcept(id);
    if (!record) {
      return null;
    }

    const concept = this.mapRecordToConcept(record);
    this.conceptCache.set(id, concept);
    return concept;
  }

  /**
   * Update a concept
   */
  async updateConcept(id: string, updates: Partial<Concept>): Promise<Concept | null> {

    const existing = await this.getConcept(id);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...updates, updatedAt: new Date() };

    const success = await this.databaseModule.updateConcept(id, {
      name: updated.name,
      description: updated.description,
      content: updated.content,
      concept_type: updated.conceptType,
      difficulty_level: updated.difficultyLevel,
      mastery_level: updated.masteryLevel,
      tags: JSONUtils.stringifyArray(updated.tags),
      metadata: JSONUtils.stringifyObject(updated.metadata),
      last_reviewed: updated.lastReviewed,
      review_count: updated.reviewCount,
      parent_concept_id: updated.parentConceptId
    });

    if (success) {
      // Update cache
      this.conceptCache.set(id, updated);
      this.updateSearchIndexForConcept(updated);

    // Update vector database if available
    if (this.vectorDatabaseModule?.isInitialized) {
      await this.updateKnowledgeGraph(updated.id);
    }

      // Emit event
      await this.emitEvent('concept_updated', { concept: updated });

      return updated;
    }

    return null;
  }

  /**
   * Delete a concept
   */
  async deleteConcept(id: string): Promise<boolean> {

    const success = await this.databaseModule.deleteConcept(id);
    if (success) {
      // Remove from cache
      this.conceptCache.delete(id);
      this.relationshipCache.delete(id);

      // Update search index
      this.removeFromSearchIndex(id);

      // Emit event
      await this.emitEvent('concept_deleted', { conceptId: id });
    }

    return success;
  }

  /**
   * Search for concepts with semantic search support
   */
  async searchConcepts(options: GraphSearchOptions = {}): Promise<Concept[]> {
    const {
      query,
      conceptTypes,
      difficultyRange,
      masteryRange,
      tags,
      includeRelationships = false,
      limit = 50,
      offset = 0
    } = options;

    let concepts: Concept[] = [];

    if (query && this.vectorDatabaseModule?.isInitialized) {
      // Use semantic search for better results
      try {
        const semanticResults = await this.semanticSearch(query, { limit: limit * 2 });
        concepts = semanticResults.map(result => result.document as Concept);
      } catch (error) {
        console.warn('Semantic search failed, falling back to text search:', error);
        concepts = await this.textSearch(options);
      }
    } else {
      // Use traditional text search
      concepts = await this.textSearch(options);
    }

    // Apply filters
    return this.applyFilters(concepts, { conceptTypes, difficultyRange, masteryRange, tags, limit, offset });
  }

  /**
   * Semantic search using vector database
   */
  async semanticSearch(query: string, options: { limit?: number; threshold?: number } = {}): Promise<SearchResult[]> {
    if (!this.vectorDatabaseModule.isInitialized) {
      return [];
    }

    try {
      const searchResults = await this.vectorDatabaseModule.search(query, {
        limit: options.limit || 10,
        threshold: options.threshold || 0.7
      });

      // Convert vector search results to concepts
      const foundConcepts: Concept[] = [];
      for (const result of searchResults) {
        // Check if this is a concept document
        if (result.metadata?.type === 'concept') {
          const concept = await this.getConcept(result.document.id);
          if (concept) {
            foundConcepts.push(concept);
          }
        }
      }

      // Return SearchResult format with concept data
      return foundConcepts.map(concept => ({
        document: concept as any, // Type assertion for compatibility
        score: 0.8,
        metadata: { type: 'concept' }
      }));
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Get relationships for a concept
   */
  async getRelationships(conceptId: string): Promise<Relationship[]> {
    if (this.relationshipCache.has(conceptId)) {
      return this.relationshipCache.get(conceptId)!;
    }


    const query = `
      SELECT * FROM relationships
      WHERE source_concept_id = ? OR target_concept_id = ?
      ORDER BY strength DESC
    `;

    const result = await this.databaseModule.query(query, [conceptId, conceptId]);
    const relationships = result.map(this.mapRecordToRelationship);

    this.relationshipCache.set(conceptId, relationships);
    return relationships;
  }

  /**
   * Create a relationship between concepts
   */
  async createRelationship(
    sourceConceptId: string,
    targetConceptId: string,
    relationshipType: Relationship['relationshipType'],
    strength = 0.5,
    description?: string
  ): Promise<Relationship> {

    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO relationships (
        id, source_concept_id, target_concept_id, relationship_type,
        strength, description, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.databaseModule.runCommand(query, [
      id, sourceConceptId, targetConceptId, relationshipType,
      strength, description, '{}', new Date().toISOString(), new Date().toISOString()
    ]);

    const relationship: Relationship = {
      id,
      sourceConceptId,
      targetConceptId,
      relationshipType,
      strength,
      description,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update cache
    this.invalidateRelationshipCache(sourceConceptId);
    this.invalidateRelationshipCache(targetConceptId);

    // Emit event
    await this.emitEvent('relationship_created', { relationship });

    return relationship;
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(relationshipId: string): Promise<boolean> {

    // Get the relationship first to know which concepts are affected
    const relationships = await this.databaseModule.query(
      'SELECT * FROM relationships WHERE id = ?',
      [relationshipId]
    );

    if (relationships.length === 0) {
      return false;
    }

    const relationship = this.mapRecordToRelationship(relationships[0]);

    // Delete the relationship
    const query = 'DELETE FROM relationships WHERE id = ?';
    const result = await this.databaseModule.runCommand(query, [relationshipId]);

    if (result && result.changes > 0) {
      // Invalidate caches for both concepts
      this.invalidateRelationshipCache(relationship.sourceConceptId);
      this.invalidateRelationshipCache(relationship.targetConceptId);

      // Emit event
      await this.emitEvent('relationship_deleted', { relationshipId, relationship });

      return true;
    }

    return false;
  }

  /**
   * Get concept node with relationships and related concepts
   */
  async getConceptNode(conceptId: string, maxDepth = 2): Promise<ConceptNode | null> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      return null;
    }

    const relationships = await this.getRelationships(conceptId);
    const relatedConcepts = await this.getRelatedConcepts(conceptId);

    // Build children and parents recursively
    const children = await this.buildChildNodes(conceptId, maxDepth - 1, new Set());
    const parents = await this.buildParentNodes(conceptId, maxDepth - 1, new Set());

    return {
      concept,
      relationships,
      relatedConcepts,
      children,
      parents
    };
  }

  /**
   * Find learning path between concepts (enhanced)
   */
  async findPath(fromConceptId: string, toConceptId: string): Promise<ConceptPath | null> {
    // Enhanced pathfinding using Dijkstra's algorithm with multiple factors
    const distances = new Map<string, { cost: number; path: Concept[]; relationships: Relationship[]; strength: number }>();
    const visited = new Set<string>();

    // Initialize starting point
    distances.set(fromConceptId, {
      cost: 0,
      path: [],
      relationships: [],
      strength: 1
    });

    while (visited.size < distances.size && visited.size < 50) { // Limit iterations
      // Find unvisited node with minimum cost
      let currentId: string | null = null;
      let minCost = Infinity;

      for (const [id, data] of distances) {
        if (!visited.has(id) && data.cost < minCost) {
          currentId = id;
          minCost = data.cost;
        }
      }

      if (!currentId || currentId === toConceptId) break;

      visited.add(currentId);
      const current = distances.get(currentId)!;

      // Explore neighbors
      const relationships = await this.getRelationships(currentId);
      for (const rel of relationships) {
        const nextId = rel.sourceConceptId === currentId ? rel.targetConceptId : rel.sourceConceptId;

        if (visited.has(nextId)) continue;

        const nextConcept = await this.getConcept(nextId);
        if (!nextConcept) continue;

        // Calculate cost based on difficulty, mastery, and relationship strength
        const difficultyCost = nextConcept.difficultyLevel * 2;
        const masteryBonus = (5 - nextConcept.masteryLevel) * 0.5; // Lower mastery = higher priority
        const relationshipCost = (1 - rel.strength) * 3;
        const totalCost = current.cost + difficultyCost + masteryBonus + relationshipCost;

        const existing = distances.get(nextId);
        if (!existing || totalCost < existing.cost) {
          distances.set(nextId, {
            cost: totalCost,
            path: [...current.path, nextConcept],
            relationships: [...current.relationships, rel],
            strength: current.strength * rel.strength
          });
        }
      }
    }

    const result = distances.get(toConceptId);
    if (!result) return null;

    // Add the destination concept to the path
    const destinationConcept = await this.getConcept(toConceptId);
    if (!destinationConcept) return null;

    const fullConceptPath = [...result.path, destinationConcept];
    const avgDifficulty = fullConceptPath.reduce((sum, c) => sum + c.difficultyLevel, 0) / fullConceptPath.length;

    return {
      concepts: fullConceptPath,
      relationships: result.relationships,
      totalStrength: result.strength,
      difficulty: avgDifficulty
    };
  }

  /**
   * Get suggested next concepts for learning
   */
  async getNextLearningConcepts(conceptId: string, limit = 5): Promise<Concept[]> {
    try {
      // Get related concepts through relationships
      const relatedConcepts = await this.getRelatedConcepts(conceptId);

      // Prioritize concepts that are:
      // 1. Prerequisites for current concept (if not mastered)
      // 2. Related concepts with similar difficulty
      // 3. Applications or examples of current concept
      // 4. Popular concepts in the same topic area

      const currentConcept = await this.getConcept(conceptId);
      if (!currentConcept) return [];

      const scores = new Map<Concept, number>();

      for (const concept of relatedConcepts) {
        let score = 0;

        // Boost for similar difficulty level
        const difficultyDiff = Math.abs(concept.difficultyLevel - currentConcept.difficultyLevel);
        score += Math.max(0, 5 - difficultyDiff);

        // Boost for lower mastery level (need to learn)
        score += (5 - concept.masteryLevel) * 2;

        // Boost for popular concepts
        const relationships = await this.getRelationships(concept.id);
        score += Math.min(relationships.length * 0.5, 3);

        // Boost for prerequisite relationships
        const prerequisiteRels = relationships.filter(r =>
          (r.sourceConceptId === conceptId || r.targetConceptId === conceptId) &&
          r.relationshipType === 'prerequisite'
        );
        score += prerequisiteRels.length * 3;

        scores.set(concept, score);
      }

      // Sort by score and return top concepts
      return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([concept]) => concept);

    } catch (error) {
      console.error('Error getting next learning concepts:', error);
      return [];
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getGraphStats(): Promise<KnowledgeGraphStats> {
    // Get concept stats
    const conceptQuery = `
      SELECT
        COUNT(*) as total,
        concept_type,
        AVG(mastery_level) as avg_mastery,
        COUNT(CASE WHEN last_reviewed < date('now', '-7 days') OR last_reviewed IS NULL THEN 1 END) as need_review,
        COUNT(CASE WHEN updated_at > date('now', '-7 days') THEN 1 END) as recent
      FROM concepts
      GROUP BY concept_type
    `;

    const conceptStats = await this.databaseModule.query(conceptQuery) as any[];

    const totalConcepts = conceptStats.reduce((sum, stat) => sum + stat.total, 0);
    const conceptsByType: Record<string, number> = {};
    let totalMastery = 0;
    let conceptsNeedingReview = 0;
    let recentlyStudied = 0;

    for (const stat of conceptStats) {
      conceptsByType[stat.concept_type] = stat.total;
      totalMastery += stat.avg_mastery * stat.total;
      conceptsNeedingReview += stat.need_review;
      recentlyStudied += stat.recent;
    }

    // Get relationship count
    const relationshipResult = await this.databaseModule.query('SELECT COUNT(*) as count FROM relationships');
    const relationshipCount = relationshipResult[0]?.count || 0;

    return {
      totalConcepts,
      totalRelationships: relationshipCount,
      conceptsByType,
      averageMasteryLevel: totalConcepts > 0 ? totalMastery / totalConcepts : 0,
      conceptsNeedingReview,
      recentlyStudied
    };
  }

  // Private helper methods

  private mapRecordToConcept(record: any): Concept {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      content: record.content,
      conceptType: record.concept_type,
      difficultyLevel: record.difficulty_level,
      masteryLevel: record.mastery_level,
      tags: JSONUtils.parseArray(record.tags),
      metadata: JSONUtils.parseObject(record.metadata),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      lastReviewed: record.last_reviewed ? new Date(record.last_reviewed) : undefined,
      reviewCount: record.review_count,
      parentConceptId: record.parent_concept_id
    };
  }

  private mapRecordToRelationship(record: any): Relationship {
    return {
      id: record.id,
      sourceConceptId: record.source_concept_id,
      targetConceptId: record.target_concept_id,
      relationshipType: record.relationship_type,
      strength: record.strength,
      description: record.description,
      metadata: JSONUtils.parseObject(record.metadata),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBySession: record.created_by_session
    };
  }

  private async buildSearchIndex(): Promise<void> {
    this.searchIndex.clear();
    const concepts = await this.searchConcepts({ limit: 10000 }); // Get all concepts

    for (const concept of concepts) {
      this.updateSearchIndexForConcept(concept);
    }
  }

  private updateSearchIndexForConcept(concept: Concept): void {
    const words = this.extractWords(concept.name);
    words.push(...this.extractWords(concept.description || ''));
    words.push(...concept.tags);

    for (const word of words) {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(concept.id);
    }
  }

  private removeFromSearchIndex(conceptId: string): void {
    for (const [word, conceptIds] of this.searchIndex) {
      conceptIds.delete(conceptId);
      if (conceptIds.size === 0) {
        this.searchIndex.delete(word);
      }
    }
  }

  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private searchInIndex(query: string): string[] {
    const words = this.extractWords(query);
    const matchingIds = new Set<string>();

    for (const word of words) {
      const conceptIds = this.searchIndex.get(word);
      if (conceptIds) {
        for (const id of conceptIds) {
          matchingIds.add(id);
        }
      }
    }

    return Array.from(matchingIds);
  }

  private sortByRelevance(concepts: Concept[], query: string): Concept[] {
    const queryWords = this.extractWords(query);

    return concepts
      .map(concept => {
        let score = 0;
        const conceptText = `${concept.name} ${concept.description || ''} ${concept.tags.join(' ')}`.toLowerCase();
        const conceptWords = this.extractWords(conceptText);

        for (const queryWord of queryWords) {
          if (concept.name.toLowerCase().includes(queryWord)) {
            score += 10; // High score for name matches
          } else if (conceptWords.includes(queryWord)) {
            score += 1; // Lower score for content matches
          }
        }

        return { concept, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.concept);
  }

  public async getRelatedConcepts(conceptId: string): Promise<Concept[]> {
    const relationships = await this.getRelationships(conceptId);
    const relatedIds = relationships.map(rel =>
      rel.sourceConceptId === conceptId ? rel.targetConceptId : rel.sourceConceptId
    );

    const concepts: Concept[] = [];
    for (const id of relatedIds) {
      const concept = await this.getConcept(id);
      if (concept) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  private async buildChildNodes(conceptId: string, depth: number, visited: Set<string>): Promise<ConceptNode[]> {
    if (depth <= 0 || visited.has(conceptId)) {
      return [];
    }

    visited.add(conceptId);
    const relationships = await this.getRelationships(conceptId);
    const children: ConceptNode[] = [];

    for (const rel of relationships) {
      if (rel.sourceConceptId === conceptId) {
        const childNode = await this.getConceptNode(rel.targetConceptId, depth - 1);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    return children;
  }

  private async buildParentNodes(conceptId: string, depth: number, visited: Set<string>): Promise<ConceptNode[]> {
    if (depth <= 0 || visited.has(conceptId)) {
      return [];
    }

    visited.add(conceptId);
    const relationships = await this.getRelationships(conceptId);
    const parents: ConceptNode[] = [];

    for (const rel of relationships) {
      if (rel.targetConceptId === conceptId) {
        const parentNode = await this.getConceptNode(rel.sourceConceptId, depth - 1);
        if (parentNode) {
          parents.push(parentNode);
        }
      }
    }

    return parents;
  }

  private async warmupCaches(): Promise<void> {
    const concepts = await this.searchConcepts({ limit: 100 });
    for (const concept of concepts) {
      this.conceptCache.set(concept.id, concept);
    }

    this.lastCacheUpdate = Date.now();
  }

  private clearCaches(): void {
    this.conceptCache.clear();
    this.relationshipCache.clear();
  }

  private invalidateRelationshipCache(conceptId: string): void {
    this.relationshipCache.delete(conceptId);
    // Also invalidate related concepts
    this.relationshipCache.forEach((_, id) => {
      if (id !== conceptId) {
        this.relationshipCache.delete(id);
      }
    });
  }

  private async updateSearchIndex(): Promise<void> {
    // Only update if cache is stale
    const cacheAge = Date.now() - this.lastCacheUpdate;
    if (cacheAge > this.cacheTimeout) {
      await this.buildSearchIndex();
    }
  }

  /**
   * Get popular concepts based on usage and relationships
   */
  async getPopularConcepts(limit = 10): Promise<Concept[]> {

    try {
      // Query concepts with most relationships and highest mastery
      const query = `
        SELECT c.*,
               COUNT(r.id) as relationship_count,
               (c.mastery_level * 20 + COUNT(r.id) * 10) as popularity_score
        FROM concepts c
        LEFT JOIN relationships r ON (c.id = r.source_concept_id OR c.id = r.target_concept_id)
        GROUP BY c.id
        ORDER BY popularity_score DESC
        LIMIT ?
      `;

      const results = await this.databaseModule.query(query, [limit]);
      return results.map(this.mapRecordToConcept);
    } catch (error) {
      console.error('Error getting popular concepts:', error);
      return [];
    }
  }

  /**
   * Get concept dependencies (prerequisites)
   */
  async getConceptDependencies(conceptId: string): Promise<Concept[]> {
    const relationships = await this.getRelationships(conceptId);
    const prerequisites = relationships.filter(rel =>
      rel.targetConceptId === conceptId && rel.relationshipType === 'prerequisite'
    );

    const dependencies: Concept[] = [];
    for (const rel of prerequisites) {
      const concept = await this.getConcept(rel.sourceConceptId);
      if (concept) {
        dependencies.push(concept);
      }
    }

    return dependencies;
  }

  /**
   * Get concept descendants (concepts that depend on this one)
   */
  async getConceptDescendants(conceptId: string): Promise<Concept[]> {
    const relationships = await this.getRelationships(conceptId);
    const dependent = relationships.filter(rel =>
      rel.sourceConceptId === conceptId && rel.relationshipType === 'prerequisite'
    );

    const descendants: Concept[] = [];
    for (const rel of dependent) {
      const concept = await this.getConcept(rel.targetConceptId);
      if (concept) {
        descendants.push(concept);
      }
    }

    return descendants;
  }

  /**
   * Check for circular dependencies
   */
  async detectCircularDependency(fromConceptId: string, toConceptId: string): Promise<boolean> {
    // Simple BFS to check if adding from->to creates a cycle
    const visited = new Set<string>();
    const queue = [toConceptId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === fromConceptId) {
        return true; // Circular dependency detected
      }

      const dependencies = await this.getConceptDependencies(currentId);
      for (const dep of dependencies) {
        if (!visited.has(dep.id)) {
          queue.push(dep.id);
        }
      }
    }

    return false;
  }

  /**
   * Update knowledge graph with concept changes
   */
  async updateKnowledgeGraph(conceptId: string): Promise<void> {
    try {
      const concept = await this.getConcept(conceptId);
      if (!concept || !this.vectorDatabaseModule.isInitialized) {
        return;
      }

      // Update vector database with concept content
      const content = `${concept.name} ${concept.description || ''} ${concept.content || ''} ${concept.tags.join(' ')}`;
      await this.vectorDatabaseModule.addDocument({
        id: concept.id,
        content,
        metadata: {
          type: 'concept',
          conceptType: concept.conceptType,
          difficultyLevel: concept.difficultyLevel,
          masteryLevel: concept.masteryLevel,
          tags: concept.tags
        }
      });

      console.log(`Updated concept ${conceptId} in vector database`);
    } catch (error) {
      console.error('Error updating knowledge graph:', error);
    }
  }

  // Private helper methods

  private async textSearch(options: GraphSearchOptions = {}): Promise<Concept[]> {
    const { query, limit = 50 } = options;
    let conceptIds: string[] = [];

    if (query) {
      conceptIds = this.searchInIndex(query);
    } else {
      conceptIds = Array.from(this.conceptCache.keys());
    }

    const concepts: Concept[] = [];
    for (const id of conceptIds.slice(0, limit)) {
      const concept = await this.getConcept(id);
      if (concept) {
        concepts.push(concept);
      }
    }

    return query ? this.sortByRelevance(concepts, query) : concepts;
  }

  private applyFilters(
    concepts: Concept[],
    filters: {
      conceptTypes?: string[];
      difficultyRange?: [number, number];
      masteryRange?: [number, number];
      tags?: string[];
      limit?: number;
      offset?: number;
    }
  ): Concept[] {
    const { conceptTypes, difficultyRange, masteryRange, tags, limit = 50, offset = 0 } = filters;

    const filtered = concepts.filter(concept => {
      // Filter by concept type
      if (conceptTypes && conceptTypes.length > 0 && !conceptTypes.includes(concept.conceptType)) {
        return false;
      }

      // Filter by difficulty range
      if (difficultyRange && (concept.difficultyLevel < difficultyRange[0] || concept.difficultyLevel > difficultyRange[1])) {
        return false;
      }

      // Filter by mastery range
      if (masteryRange && (concept.masteryLevel < masteryRange[0] || concept.masteryLevel > masteryRange[1])) {
        return false;
      }

      // Filter by tags
      if (tags && tags.length > 0) {
        const hasAllTags = tags.every(tag => concept.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });

    return filtered.slice(offset, offset + limit);
  }

  private async emitEvent(type: string, data: any): Promise<void> {
    // This would use the module coordinator to emit events
    console.log(`Knowledge Graph Event: ${type}`, data);
  }
}