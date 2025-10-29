/**
 * Knowledge Graph Module (Kysely Version)
 *
 * Manages concepts and their relationships for learning organization.
 * Provides semantic search, concept discovery, and relationship mapping.
 */

import type { Database } from '../database/kysely-schema';
import { JSONFieldHelpers } from '../database/kysely-schema';
import { VectorDatabaseModule, SearchResult } from '../vector-database/vector-database';
import { Kysely } from 'kysely';

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
  conceptTypes: Record<string, number>;
  averageMasteryLevel: number;
  mostConnectedConcepts: Array<{
    conceptId: string;
    name: string;
    connectionCount: number;
  }>;
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string;
  concepts: Concept[];
  relationships: Relationship[];
  totalStrength: number;
  difficulty: number;
  estimatedDuration: number; // in minutes
  prerequisites: string[]; // concept IDs
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
  private db: Kysely<Database>;
  private vectorDatabaseModule: VectorDatabaseModule;

  // Cache for performance
  private conceptCache: Map<string, Concept> = new Map();
  private relationshipCache: Map<string, Relationship> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> concept IDs
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;
  private _isInitialized = false;

  constructor(db: Kysely<Database>, vectorDatabaseModule: VectorDatabaseModule) {
    this.db = db;
    this.vectorDatabaseModule = vectorDatabaseModule;

    // Initialize empty caches
    this.conceptCache.clear();
    this.relationshipCache.clear();
    this.searchIndex.clear();
  }

  get initialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Initialize the knowledge graph module
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Knowledge Graph Module...');

      // Warm up caches with existing data
      await this.warmupCaches();

      this._isInitialized = true;
      console.log('Knowledge Graph Module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph Module:', error);
      throw error;
    }
  }

  /**
   * Create a new concept
   */
  async createConcept(conceptData: Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount'>): Promise<Concept> {
    const id = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert to database format
    const dbConcept = {
      id,
      name: conceptData.name,
      description: conceptData.description,
      content: conceptData.content,
      concept_type: conceptData.conceptType,
      difficulty_level: conceptData.difficultyLevel,
      mastery_level: conceptData.masteryLevel,
      tags: JSONFieldHelpers.stringifyArray(conceptData.tags),
      metadata: JSONFieldHelpers.stringifyObject(conceptData.metadata),
      last_reviewed: conceptData.lastReviewed,
      review_count: 0,
      parent_concept_id: conceptData.parentConceptId,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.db.insertInto('concepts').values(dbConcept).execute();

    const concept: Concept = {
      ...conceptData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewCount: 0
    };

    // Update cache
    this.conceptCache.set(id, concept);
    this.updateSearchIndexForConcept(concept);

    // Update vector database if available
    if (this.vectorDatabaseModule?.isInitialized) {
      await this.updateVectorDatabase(concept.id);
    }

    return concept;
  }

  /**
   * Get a concept by ID
   */
  async getConcept(conceptId: string): Promise<Concept | null> {
    // Check cache first
    if (this.conceptCache.has(conceptId)) {
      return this.conceptCache.get(conceptId)!;
    }

    const result = await this.db
      .selectFrom('concepts')
      .selectAll()
      .where('id', '=', conceptId)
      .executeTakeFirst();

    if (!result) return null;

    const concept = this.convertDbConceptToConcept(result);
    this.conceptCache.set(conceptId, concept);
    return concept;
  }

  /**
   * Create a relationship between two concepts
   */
  async createRelationship(
    sourceConceptId: string,
    targetConceptId: string,
    relationshipType: Relationship['relationshipType'],
    strength: number = 0.5,
    description?: string,
    createdBySession?: string
  ): Promise<Relationship> {
    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const relationship: Relationship = {
      id,
      sourceConceptId,
      targetConceptId,
      relationshipType,
      strength: Math.max(0, Math.min(1, strength)),
      description,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBySession
    };

    const dbRelationship = {
      id,
      source_concept_id: sourceConceptId,
      target_concept_id: targetConceptId,
      relationship_type: relationshipType,
      strength,
      description,
      metadata: JSONFieldHelpers.stringifyObject({}),
      created_by_session: createdBySession,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.db.insertInto('relationships').values(dbRelationship).execute();

    // Update cache
    this.relationshipCache.set(id, relationship);

    return relationship;
  }

  /**
   * Search for concepts by text query
   */
  async searchConcepts(query: string, limit: number = 20): Promise<Concept[]> {
    if (query.trim() === '') return [];

    const results = await this.db
      .selectFrom('concepts')
      .selectAll()
      .where((eb) => eb.or([
        eb('name', 'like', `%${query}%`),
        eb('description', 'like', `%${query}%`),
        eb('content', 'like', `%${query}%`)
      ]))
      .limit(limit)
      .execute();

    return results.map(result => this.convertDbConceptToConcept(result));
  }

  /**
   * Get related concepts for a given concept
   */
  async getRelatedConcepts(conceptId: string, maxDepth: number = 2): Promise<ConceptNode[]> {
    const concept = await this.getConcept(conceptId);
    if (!concept) return [];

    // Get direct relationships
    const relationships = await this.db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) => eb.or([
        eb('source_concept_id', '=', conceptId),
        eb('target_concept_id', '=', conceptId)
      ]))
      .execute();

    const relatedConceptIds = new Set<string>();
    relationships.forEach(rel => {
      if (rel.source_concept_id !== conceptId) relatedConceptIds.add(rel.source_concept_id);
      if (rel.target_concept_id !== conceptId) relatedConceptIds.add(rel.target_concept_id);
    });

    const relatedConcepts = await Promise.all(
      Array.from(relatedConceptIds).map(id => this.getConcept(id))
    );

    const validConcepts = relatedConcepts.filter((c): c is Concept => c !== null);

    return validConcepts.map(concept => ({
      concept,
      relationships: relationships.filter(rel =>
        rel.source_concept_id === concept.id || rel.target_concept_id === concept.id
      ),
      relatedConcepts: [],
      children: [],
      parents: []
    }));
  }

  /**
   * Update vector database with concept content
   */
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
              conceptType: concept.conceptType,
              difficultyLevel: concept.difficultyLevel,
              masteryLevel: concept.masteryLevel
            }
          });
        }
      } catch (error) {
        console.warn('Failed to update vector database:', error);
      }
    }
  }

  /**
   * Get knowledge graph statistics
   */
  async getStats(): Promise<KnowledgeGraphStats> {
    const [conceptCount, relationshipCount] = await Promise.all([
      this.db.selectFrom('concepts').select(eb => eb.fn.count('id').as('count')).executeTakeFirst(),
      this.db.selectFrom('relationships').select(eb => eb.fn.count('id').as('count')).executeTakeFirst()
    ]);

    return {
      totalConcepts: Number(conceptCount?.count || 0),
      totalRelationships: Number(relationshipCount?.count || 0),
      conceptTypes: {},
      averageMasteryLevel: 0,
      mostConnectedConcepts: []
    };
  }

  /**
   * Update an existing concept
   */
  async updateConcept(conceptId: string, updates: Partial<Pick<Concept, 'name' | 'description' | 'content' | 'conceptType' | 'difficultyLevel' | 'masteryLevel' | 'tags' | 'metadata'>>): Promise<Concept | null> {
    try {
      const existingConcept = await this.getConcept(conceptId);
      if (!existingConcept) {
        return null;
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date()
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.conceptType !== undefined) updateData.concept_type = updates.conceptType;
      if (updates.difficultyLevel !== undefined) updateData.difficulty_level = updates.difficultyLevel;
      if (updates.masteryLevel !== undefined) updateData.mastery_level = updates.masteryLevel;
      if (updates.tags !== undefined) updateData.tags = JSONFieldHelpers.stringifyArray(updates.tags);
      if (updates.metadata !== undefined) updateData.metadata = JSONFieldHelpers.stringifyObject(updates.metadata);

      // Update in database
      await this.db
        .updateTable('concepts')
        .set(updateData)
        .where('id', '=', conceptId)
        .execute();

      // Update cache
      const updatedConcept = { ...existingConcept, ...updates, updatedAt: new Date() };
      this.conceptCache.set(conceptId, updatedConcept);
      this.updateSearchIndexForConcept(updatedConcept);

      // Update vector database if content changed
      if (updates.content || updates.description) {
        await this.updateVectorDatabase(conceptId);
      }

      return updatedConcept;
    } catch (error) {
      console.error('Failed to update concept:', error);
      throw error;
    }
  }

  /**
   * Get relationships for a concept
   */
  async getRelationships(conceptId: string): Promise<Relationship[]> {
    try {
      // Check cache first
      const cachedRelationships = Array.from(this.relationshipCache.values()).filter(
        rel => rel.sourceConceptId === conceptId || rel.targetConceptId === conceptId
      );

      if (cachedRelationships.length > 0) {
        return cachedRelationships;
      }

      // Query from database
      const dbRelationships = await this.db
        .selectFrom('relationships')
        .selectAll()
        .where('source_concept_id', '=', conceptId)
        .or('target_concept_id', '=', conceptId)
        .execute();

      const relationships: Relationship[] = dbRelationships.map(dbRel => ({
        id: dbRel.id,
        sourceConceptId: dbRel.source_concept_id,
        targetConceptId: dbRel.target_concept_id,
        relationshipType: dbRel.relationship_type,
        strength: dbRel.strength,
        description: dbRel.description,
        metadata: JSONFieldHelpers.parseObject(dbRel.metadata),
        createdAt: new Date(dbRel.created_at),
        updatedAt: new Date(dbRel.updated_at),
        createdBySession: dbRel.created_by_session
      }));

      // Update cache
      relationships.forEach(rel => this.relationshipCache.set(rel.id, rel));

      return relationships;
    } catch (error) {
      console.error('Failed to get relationships:', error);
      throw error;
    }
  }

  /**
   * Find a learning path between two concepts
   */
  async findPath(fromConceptId: string, toConceptId: string): Promise<Concept[]> {
    try {
      const visited = new Set<string>();
      const queue: { conceptId: string; path: Concept[] }[] = [];
      const startConcept = await this.getConcept(fromConceptId);

      if (!startConcept) {
        return [];
      }

      queue.push({ conceptId: fromConceptId, path: [startConcept] });
      visited.add(fromConceptId);

      while (queue.length > 0) {
        const { conceptId, path } = queue.shift()!;

        if (conceptId === toConceptId) {
          return path;
        }

        // Get related concepts
        const relatedConcepts = await this.getRelatedConcepts(conceptId, 1);

        for (const node of relatedConcepts) {
          if (!visited.has(node.concept.id)) {
            visited.add(node.concept.id);
            queue.push({
              conceptId: node.concept.id,
              path: [...path, node.concept]
            });
          }
        }
      }

      return []; // No path found
    } catch (error) {
      console.error('Failed to find path:', error);
      throw error;
    }
  }

  /**
   * Get next learning concepts based on current knowledge
   */
  async getNextLearningConcepts(conceptId: string, limit: number = 5): Promise<Concept[]> {
    try {
      // Get concepts that depend on the current concept
      const dependentConcepts = await this.db
        .selectFrom('relationships as r')
        .innerJoin('concepts as c', 'r.target_concept_id', 'c.id')
        .selectAll()
        .where('r.source_concept_id', '=', conceptId)
        .where('r.relationship_type', '=', 'prerequisite')
        .where('c.mastery_level', '<', 3)
        .orderBy('c.difficulty_level', 'asc')
        .limit(limit)
        .execute();

      const concepts: Concept[] = dependentConcepts.map(row => this.convertDbConceptToConcept(row));

      // If no direct prerequisites found, suggest related concepts
      if (concepts.length === 0) {
        const relatedConcepts = await this.getRelatedConcepts(conceptId, 2);
        const unmasteredRelated = relatedConcepts
          .filter(node => node.concept.masteryLevel < 3)
          .map(node => node.concept)
          .slice(0, limit);

        return unmasteredRelated;
      }

      return concepts;
    } catch (error) {
      console.error('Failed to get next learning concepts:', error);
      throw error;
    }
  }

  /**
   * Start the knowledge graph module (alias for initialize)
   */
  async start(config?: any): Promise<void> {
    await this.initialize();
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    this.conceptCache.clear();
    this.relationshipCache.clear();
    this.searchIndex.clear();
    this._isInitialized = false;
  }

  // Private helper methods

  private convertDbConceptToConcept(dbConcept: any): Concept {
    return {
      id: dbConcept.id,
      name: dbConcept.name,
      description: dbConcept.description,
      content: dbConcept.content,
      conceptType: dbConcept.concept_type,
      difficultyLevel: dbConcept.difficulty_level,
      masteryLevel: dbConcept.mastery_level,
      tags: JSONFieldHelpers.parseArray(dbConcept.tags),
      metadata: JSONFieldHelpers.parseObject(dbConcept.metadata),
      createdAt: new Date(dbConcept.created_at),
      updatedAt: new Date(dbConcept.updated_at),
      lastReviewed: dbConcept.last_reviewed ? new Date(dbConcept.last_reviewed) : undefined,
      reviewCount: dbConcept.review_count,
      parentConceptId: dbConcept.parent_concept_id
    };
  }

  private updateSearchIndexForConcept(concept: Concept): void {
    const words = [
      concept.name.toLowerCase(),
      ...(concept.description?.toLowerCase().split(' ') || []),
      ...(concept.content?.toLowerCase().split(' ') || []),
      ...concept.tags.map(tag => tag.toLowerCase())
    ];

    words.forEach(word => {
      if (word.length > 2) { // Skip very short words
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(concept.id);
      }
    });
  }

  private async warmupCaches(): Promise<void> {
    try {
      // Load all concepts into cache
      const concepts = await this.db.selectFrom('concepts').selectAll().execute();
      concepts.forEach(dbConcept => {
        const concept = this.convertDbConceptToConcept(dbConcept);
        this.conceptCache.set(concept.id, concept);
        this.updateSearchIndexForConcept(concept);
      });

      // Load all relationships into cache
      const relationships = await this.db.selectFrom('relationships').selectAll().execute();
      relationships.forEach(dbRel => {
        const relationship: Relationship = {
          id: dbRel.id,
          sourceConceptId: dbRel.source_concept_id,
          targetConceptId: dbRel.target_concept_id,
          relationshipType: dbRel.relationship_type,
          strength: dbRel.strength,
          description: dbRel.description,
          metadata: JSONFieldHelpers.parseObject(dbRel.metadata),
          createdAt: new Date(dbRel.created_at),
          updatedAt: new Date(dbRel.updated_at),
          createdBySession: dbRel.created_by_session
        };
        this.relationshipCache.set(relationship.id, relationship);
      });
    } catch (error) {
      console.warn('Failed to warm up caches:', error);
    }
  }
}

// Note: Singleton pattern removed for proper dependency injection
// Use factory to create instances with dependencies