/**
 * Knowledge Graph Module (Kysely Version)
 *
 * Manages concepts and their relationships for learning organization.
 * Provides semantic search, concept discovery, and relationship mapping.
 */

import type { Database } from '../../main/services/core/database/kysely-schema';
import { JSONFieldHelpers } from '../../main/services/core/database/kysely-schema';
import { Kysely } from 'kysely';
import type { VectorDatabase } from '@/main/services/domain/knowledge/vector/vector-database';

interface SearchResult {
  id: string;
  score: number;
  metadata?: any;
}

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
  relationshipType:
    | 'prerequisite'
    | 'related'
    | 'contains'
    | 'example'
    | 'application'
    | 'contrasts';
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

export const createKnowledgeGraphModule = (
  db: Kysely<Database>,
  vectorDatabaseModule: VectorDatabase,
) => {
  const name = 'KnowledgeGraphModule';
  const version = '1.0.0';
  const conceptCache = new Map<string, Concept>();
  const relationshipCache = new Map<string, Relationship>();
  const searchIndex = new Map<string, Set<string>>();
  let _isInitialized = false;

  const convertDbConceptToConcept = (dbConcept: any): Concept => ({
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
    parentConceptId: dbConcept.parent_concept_id,
  });

  const updateSearchIndexForConcept = (concept: Concept): void => {
    const words = [
      concept.name.toLowerCase(),
      ...(concept.description?.toLowerCase().split(' ') || []),
      ...(concept.content?.toLowerCase().split(' ') || []),
      ...concept.tags.map((tag) => tag.toLowerCase()),
    ];

    words.forEach((word) => {
      if (word.length > 2) {
        if (!searchIndex.has(word)) {
          searchIndex.set(word, new Set());
        }
        searchIndex.get(word)!.add(concept.id);
      }
    });
  };

  const warmupCaches = async (): Promise<void> => {
    try {
      const concepts = await db.selectFrom('concepts').selectAll().execute();
      concepts.forEach((dbConcept) => {
        const concept = convertDbConceptToConcept(dbConcept);
        conceptCache.set(concept.id, concept);
        updateSearchIndexForConcept(concept);
      });

      const relationships = await db.selectFrom('relationships').selectAll().execute();
      relationships.forEach((dbRel) => {
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
          createdBySession: dbRel.created_by_session,
        };
        relationshipCache.set(relationship.id, relationship);
      });
    } catch (error) {
      console.warn('Failed to warm up caches:', error);
    }
  };

  const initialize = async (): Promise<void> => {
    try {
      console.log('Initializing Knowledge Graph Module...');
      await warmupCaches();
      _isInitialized = true;
      console.log('Knowledge Graph Module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Knowledge Graph Module:', error);
      throw error;
    }
  };

  const createConcept = async (
    conceptData: Omit<Concept, 'id' | 'createdAt' | 'updatedAt' | 'reviewCount'>,
  ): Promise<Concept> => {
    const id = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
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
      last_reviewed: conceptData.lastReviewed ? conceptData.lastReviewed.toISOString() : undefined,
      review_count: 0,
      parent_concept_id: conceptData.parentConceptId,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('concepts').values(dbConcept).execute();
    const concept: Concept = {
      ...conceptData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewCount: 0,
    };
    conceptCache.set(id, concept);
    updateSearchIndexForConcept(concept);
    if (vectorDatabaseModule) {
      await updateVectorDatabase(id);
    }
    return concept;
  };

  const getConcept = async (conceptId: string): Promise<Concept | null> => {
    if (conceptCache.has(conceptId)) {
      return conceptCache.get(conceptId)!;
    }
    const result = await db
      .selectFrom('concepts')
      .selectAll()
      .where('id', '=', conceptId)
      .executeTakeFirst();
    if (!result) return null;
    const concept = convertDbConceptToConcept(result);
    conceptCache.set(conceptId, concept);
    return concept;
  };

  const createRelationship = async (
    sourceConceptId: string,
    targetConceptId: string,
    relationshipType: Relationship['relationshipType'],
    strength = 0.5,
    description?: string,
    createdBySession?: string,
  ): Promise<Relationship> => {
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
      createdBySession,
    };
    const now = new Date().toISOString();
    const dbRelationship = {
      id,
      source_concept_id: sourceConceptId,
      target_concept_id: targetConceptId,
      relationship_type: relationshipType,
      strength,
      description,
      metadata: JSONFieldHelpers.stringifyObject({}),
      created_by_session: createdBySession,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('relationships').values(dbRelationship).execute();
    relationshipCache.set(id, relationship);
    return relationship;
  };

  const searchConcepts = async (query: string, limit = 20): Promise<Concept[]> => {
    if (query.trim() === '') return [];
    const results = await db
      .selectFrom('concepts')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('name', 'like', `%${query}%`),
          eb('description', 'like', `%${query}%`),
          eb('content' as any, 'like', `%${query}%`),
        ]),
      )
      .limit(limit)
      .execute();
    return results.map((result) => convertDbConceptToConcept(result));
  };

  const getRelatedConcepts = async (
    conceptId: string,
    maxDepth = 2,
  ): Promise<ConceptNode[]> => {
    const concept = await getConcept(conceptId);
    if (!concept) return [];
    const relationships = await db
      .selectFrom('relationships')
      .selectAll()
      .where((eb) =>
        eb.or([eb('source_concept_id', '=', conceptId), eb('target_concept_id', '=', conceptId)]),
      )
      .execute();
    const relatedConceptIds = new Set<string>();
    relationships.forEach((rel) => {
      if (rel.source_concept_id !== conceptId) relatedConceptIds.add(rel.source_concept_id);
      if (rel.target_concept_id !== conceptId) relatedConceptIds.add(rel.target_concept_id);
    });
    const relatedConcepts = await Promise.all(Array.from(relatedConceptIds).map((id) => getConcept(id)));
    const validConcepts = relatedConcepts.filter((c): c is Concept => c !== null);
    return validConcepts.map((c) => ({
      concept: c,
      relationships: relationships
        .filter((rel) => rel.source_concept_id === c.id || rel.target_concept_id === c.id)
        .map((rel) => ({
          id: rel.id,
          sourceConceptId: rel.source_concept_id,
          targetConceptId: rel.target_concept_id,
          relationshipType: rel.relationship_type,
          strength: rel.strength,
          description: rel.description,
          metadata: JSONFieldHelpers.parseObject(rel.metadata),
          createdAt: new Date(rel.created_at),
          updatedAt: new Date(rel.updated_at),
          createdBySession: rel.created_by_session,
        })),
      relatedConcepts: [],
      children: [],
      parents: [],
    }));
  };

  const updateVectorDatabase = async (conceptId: string): Promise<void> => {
    if (vectorDatabaseModule) {
      try {
        const concept = await getConcept(conceptId);
        if (concept) {
          const content = `${concept.name} ${concept.description || ''} ${concept.content || ''} ${concept.tags.join(' ')}`;
          await vectorDatabaseModule.addDocument({
            id: conceptId,
            content,
            metadata: {
              conceptType: concept.conceptType,
              difficultyLevel: concept.difficultyLevel,
              masteryLevel: concept.masteryLevel,
            },
          });
        }
      } catch (error) {
        console.warn('Failed to update vector database:', error);
      }
    }
  };

  const getStats = async (): Promise<KnowledgeGraphStats> => {
    const [conceptCount, relationshipCount] = await Promise.all([
      db.selectFrom('concepts').select((eb) => eb.fn.count('id').as('count')).executeTakeFirst(),
      db
        .selectFrom('relationships')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst(),
    ]);
    return {
      totalConcepts: Number(conceptCount?.count || 0),
      totalRelationships: Number(relationshipCount?.count || 0),
      conceptTypes: {},
      averageMasteryLevel: 0,
      mostConnectedConcepts: [],
    };
  };

  const updateConcept = async (
    conceptId: string,
    updates: Partial<
      Pick<
        Concept,
        | 'name'
        | 'description'
        | 'content'
        | 'conceptType'
        | 'difficultyLevel'
        | 'masteryLevel'
        | 'tags'
        | 'metadata'
      >
    >,
  ): Promise<Concept | null> => {
    try {
      const existingConcept = await getConcept(conceptId);
      if (!existingConcept) {
        return null;
      }
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.conceptType !== undefined) updateData.concept_type = updates.conceptType;
      if (updates.difficultyLevel !== undefined) updateData.difficulty_level = updates.difficultyLevel;
      if (updates.masteryLevel !== undefined) updateData.mastery_level = updates.masteryLevel;
      if (updates.tags !== undefined) updateData.tags = JSONFieldHelpers.stringifyArray(updates.tags);
      if (updates.metadata !== undefined) updateData.metadata = JSONFieldHelpers.stringifyObject(updates.metadata);
      await db.updateTable('concepts').set(updateData).where('id', '=', conceptId).execute();
      const updatedConcept = { ...existingConcept, ...updates, updatedAt: new Date() };
      conceptCache.set(conceptId, updatedConcept);
      updateSearchIndexForConcept(updatedConcept);
      if (updates.content || updates.description) {
        await updateVectorDatabase(conceptId);
      }
      return updatedConcept;
    } catch (error) {
      console.error('Failed to update concept:', error);
      throw error;
    }
  };

  const getRelationships = async (conceptId: string): Promise<Relationship[]> => {
    try {
      const cachedRelationships = Array.from(relationshipCache.values()).filter(
        (rel) => rel.sourceConceptId === conceptId || rel.targetConceptId === conceptId,
      );
      if (cachedRelationships.length > 0) {
        return cachedRelationships;
      }
      const dbRelationships = await db
        .selectFrom('relationships')
        .selectAll()
        .where((eb) =>
          eb.or([eb('source_concept_id', '=', conceptId), eb('target_concept_id', '=', conceptId)]),
        )
        .execute();
      const relationships: Relationship[] = dbRelationships.map((dbRel: any) => ({
        id: dbRel.id,
        sourceConceptId: dbRel.source_concept_id,
        targetConceptId: dbRel.target_concept_id,
        relationshipType: dbRel.relationship_type,
        strength: dbRel.strength,
        description: dbRel.description,
        metadata: JSONFieldHelpers.parseObject(dbRel.metadata),
        createdAt: new Date(dbRel.created_at),
        updatedAt: new Date(dbRel.updated_at),
        createdBySession: dbRel.created_by_session,
      }));
      relationships.forEach((rel) => relationshipCache.set(rel.id, rel));
      return relationships;
    } catch (error) {
      console.error('Failed to get relationships:', error);
      throw error;
    }
  };

  const findPath = async (fromConceptId: string, toConceptId: string): Promise<ConceptPath> => {
    try {
      const visited = new Set<string>();
      const queue: { conceptId: string; path: Concept[] }[] = [];
      const startConcept = await getConcept(fromConceptId);
      if (!startConcept) {
        return { concepts: [], relationships: [], totalStrength: 0, difficulty: 0 };
      }
      queue.push({ conceptId: fromConceptId, path: [startConcept] });
      visited.add(fromConceptId);
      while (queue.length > 0) {
        const { conceptId, path } = queue.shift()!;
        if (conceptId === toConceptId) {
          return {
            concepts: path,
            relationships: [],
            totalStrength: 1.0,
            difficulty: path.reduce((sum, c) => sum + c.difficultyLevel, 0) / path.length,
          };
        }
        const relatedConcepts = await getRelatedConcepts(conceptId, 1);
        for (const node of relatedConcepts) {
          if (!visited.has(node.concept.id)) {
            visited.add(node.concept.id);
            queue.push({ conceptId: node.concept.id, path: [...path, node.concept] });
          }
        }
      }
      return { concepts: [], relationships: [], totalStrength: 0, difficulty: 0 };
    } catch (error) {
      console.error('Failed to find path:', error);
      throw error;
    }
  };

  const getNextLearningConcepts = async (
    conceptId: string,
    limit = 5,
  ): Promise<Concept[]> => {
    try {
      const dependentConcepts = await db
        .selectFrom('relationships as r')
        .innerJoin('concepts as c', 'r.target_concept_id', 'c.id')
        .selectAll()
        .where('r.source_concept_id', '=', conceptId)
        .where('r.relationship_type', '=', 'prerequisite')
        .where('c.mastery_level', '<', 3)
        .orderBy('c.difficulty_level', 'asc')
        .limit(limit)
        .execute();
      const concepts: Concept[] = dependentConcepts.map((row) => convertDbConceptToConcept(row));
      if (concepts.length === 0) {
        const relatedConcepts = await getRelatedConcepts(conceptId, 2);
        const unmasteredRelated = relatedConcepts
          .filter((node) => node.concept.masteryLevel < 3)
          .map((node) => node.concept)
          .slice(0, limit);
        return unmasteredRelated;
      }
      return concepts;
    } catch (error) {
      console.error('Failed to get next learning concepts:', error);
      throw error;
    }
  };

  const start = async (config?: any): Promise<void> => {
    await initialize();
  };

  const cleanup = async (): Promise<void> => {
    conceptCache.clear();
    relationshipCache.clear();
    searchIndex.clear();
    _isInitialized = false;
  };

  return {
    name,
    version,
    get initialized() {
      return _isInitialized;
    },
    initialize,
    start,
    cleanup,
    createConcept,
    getConcept,
    createRelationship,
    searchConcepts,
    getRelatedConcepts,
    updateVectorDatabase,
    getStats,
    updateConcept,
    getRelationships,
    findPath,
    getNextLearningConcepts,
  };
};

export type KnowledgeGraphModule = ReturnType<typeof createKnowledgeGraphModule>;
