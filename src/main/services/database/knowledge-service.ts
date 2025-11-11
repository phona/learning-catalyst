/**
 * Knowledge Service
 *
 * Main-process implementation of the learning knowledge graph service.
 * Provides direct access to vector storage and SQLite via injected dependencies.
 */

import { randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';
import type { Database } from './kysely-schema';
import { AIProvider } from '@/shared/types/ai';
import { VectorDatabaseModule } from './vector-database';
import type { ILogger } from '@/main/services/registry/ServiceTokens';

interface KnowledgeItem {
  id: string;
  content: string;
  type: 'concept' | 'conversation' | 'resource' | 'question' | 'answer';
  metadata: {
    sessionId?: string;
    userId?: string;
    topic?: string;
    difficulty?: number;
    timestamp: number;
    source?: string;
    tags?: string[];
  };
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  similarity: number;
  relevance: string;
}

export class KnowledgeService {
  private knowledgeIndex = new Map<string, KnowledgeItem>();

  constructor(
    private readonly database: Kysely<Database>,
    private readonly vectorDB: VectorDatabaseModule,
    private readonly logger?: ILogger
  ) {}

  /**
   * Add knowledge item with embedding
   */
  async addKnowledgeItem(
    item: KnowledgeItem,
    aiProvider: AIProvider,
    embedding?: number[]
  ): Promise<void> {
    try {
      if (!embedding) {
        embedding = await this.generateEmbedding(item.content, aiProvider);
      }

      await this.vectorDB.addDocument({
        id: item.id,
        content: item.content,
        metadata: {
          ...item.metadata,
          type: item.type,
          embedding
        }
      });

      this.knowledgeIndex.set(item.id, item);
      this.logger?.info?.('Knowledge item added', { id: item.id, type: item.type });
    } catch (error) {
      this.logger?.error?.('Failed to add knowledge item', error as Error, { id: item.id });
      throw error;
    }
  }

  /**
   * Search for similar knowledge items
   */
  async searchKnowledge(
    query: string,
    _aiProvider: AIProvider,
    limit: number = 10,
    filters?: {
      type?: string;
      topic?: string;
      sessionId?: string;
      tags?: string[];
    }
  ): Promise<KnowledgeSearchResult[]> {
    try {
      const results = await this.vectorDB.search(query, { limit });

      const filtered = results.filter(({ document }) => {
        const metadata = document.metadata || {};
        if (filters?.type && metadata.type !== filters.type) return false;
        if (filters?.topic && metadata.topic !== filters.topic) return false;
        if (filters?.sessionId && metadata.sessionId !== filters.sessionId) return false;
        if (filters?.tags?.length) {
          const tags: string[] = metadata.tags || [];
          return filters.tags.every(tag => tags.includes(tag));
        }
        return true;
      });

      return filtered.map(({ document, score }) => {
        const item = this.knowledgeIndex.get(document.id) || {
          id: document.id,
          content: document.content,
          type: (document.metadata?.type as KnowledgeItem['type']) || 'concept',
          metadata: {
            timestamp: Date.now(),
            ...(document.metadata || {})
          }
        };

        return {
          item,
          similarity: score,
          relevance: this.calculateRelevance(score)
        };
      });
    } catch (error) {
      this.logger?.error?.('Knowledge search failed', error as Error, { query });
      return [];
    }
  }

  /**
   * Get a specific knowledge item
   */
  async getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
    return this.knowledgeIndex.get(id) || null;
  }

  /**
   * Update an existing knowledge item
   */
  async updateKnowledgeItem(
    id: string,
    updates: Partial<KnowledgeItem>,
    aiProvider: AIProvider
  ): Promise<void> {
    const existing = await this.getKnowledgeItem(id);
    if (!existing) {
      throw new Error(`Knowledge item not found: ${id}`);
    }

    const updatedItem: KnowledgeItem = {
      ...existing,
      ...updates,
      metadata: { ...existing.metadata, ...updates.metadata }
    };

    await this.addKnowledgeItem(updatedItem, aiProvider);
  }

  /**
   * Delete a knowledge item
   */
  async deleteKnowledgeItem(id: string): Promise<void> {
    await this.vectorDB.deleteDocument(id);
    this.knowledgeIndex.delete(id);
  }

  /**
   * Store conversation context for a session
   */
  async storeConversationContext(
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    aiProvider: AIProvider
  ): Promise<void> {
    const content = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    await this.addKnowledgeItem(
      {
        id: `conversation_${sessionId}_${Date.now()}`,
        content,
        type: 'conversation',
        metadata: {
          sessionId,
          timestamp: Date.now()
        }
      },
      aiProvider
    );
  }

  /**
   * Retrieve relevant context for a session
   */
  async getRelevantContext(
    sessionId: string,
    query: string,
    aiProvider: AIProvider,
    limit = 5
  ): Promise<string[]> {
    const results = await this.searchKnowledge(query, aiProvider, limit, { sessionId, type: 'conversation' });
    return results.map(result => result.item.content);
  }

  /**
   * Knowledge statistics snapshot
   */
  async getKnowledgeStats(): Promise<{
    totalItems: number;
    itemsByType: Record<string, number>;
    itemsByTopic: Record<string, number>;
  }> {
    const stats = {
      totalItems: this.knowledgeIndex.size,
      itemsByType: {} as Record<string, number>,
      itemsByTopic: {} as Record<string, number>
    };

    for (const item of this.knowledgeIndex.values()) {
      stats.itemsByType[item.type] = (stats.itemsByType[item.type] || 0) + 1;
      if (item.metadata.topic) {
        stats.itemsByTopic[item.metadata.topic] = (stats.itemsByTopic[item.metadata.topic] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Remove all knowledge data
   */
  async clearAllKnowledge(): Promise<void> {
    for (const itemId of this.knowledgeIndex.keys()) {
      await this.vectorDB.deleteDocument(itemId);
    }
    this.knowledgeIndex.clear();
  }

  /**
   * Search for relevant concepts (utility for agents)
   */
  async searchRelevantConcepts(
    query: string,
    options?: {
      limit?: number;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      conceptType?: string;
      sessionId?: string;
    }
  ): Promise<KnowledgeSearchResult[]> {
    const results = await this.searchKnowledge(query, 'openai' as AIProvider, options?.limit || 10, {
      type: 'concept',
      sessionId: options?.sessionId
    });

    return results.filter(result => {
      const metadata = result.item.metadata;
      if (options?.difficulty && metadata.difficulty !== undefined) {
        const difficultyLabel = metadata.difficulty <= 3 ? 'beginner' : metadata.difficulty <= 6 ? 'intermediate' : 'advanced';
        if (difficultyLabel !== options.difficulty) {
          return false;
        }
      }
      if (options?.conceptType && metadata.topic !== options.conceptType) {
        return false;
      }
      return true;
    });
  }

  /**
   * Update relationships for a concept in the database
   */
  async updateConceptRelationships(
    conceptId: string,
    relationships: Array<{
      targetConceptId: string;
      relationshipType: 'prerequisite' | 'related' | 'contains' | 'example';
      strength: number;
    }>
  ): Promise<void> {
    await this.database
      .deleteFrom('relationships')
      .where('source_concept_id', '=', conceptId)
      .execute();

    if (!relationships.length) {
      return;
    }

    await this.database
      .insertInto('relationships')
      .values(
        relationships.map(rel => ({
          id: randomUUID(),
          source_concept_id: conceptId,
          target_concept_id: rel.targetConceptId,
          relationship_type: rel.relationshipType,
          strength: rel.strength,
          metadata: JSON.stringify({ updatedAt: Date.now() }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )
      .execute();
  }

  /**
   * Create concept in SQLite and index in vector DB
   */
  async createConcept(conceptData: {
    name: string;
    description?: string;
    conceptType: string;
    difficultyLevel: number;
    tags?: string[];
    metadata?: any;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    conceptType: string;
    difficultyLevel: number;
    tags: string[];
    metadata: any;
  }> {
    const concept = {
      id: `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: conceptData.name,
      description: conceptData.description || '',
      conceptType: conceptData.conceptType,
      difficultyLevel: conceptData.difficultyLevel,
      tags: conceptData.tags || [],
      metadata: conceptData.metadata || {}
    };

    const now = new Date().toISOString();

    await this.database
      .insertInto('concepts')
      .values({
        id: concept.id,
        name: concept.name,
        description: concept.description,
        concept_type: concept.conceptType as any,
        difficulty_level: concept.difficultyLevel,
        mastery_level: 0,
        tags: JSON.stringify(concept.tags),
        metadata: JSON.stringify(concept.metadata),
        review_count: 0,
        created_at: now,
        updated_at: now
      })
      .execute();

    await this.addKnowledgeItem(
      {
        id: concept.id,
        content: `${concept.name}: ${concept.description}`,
        type: 'concept',
        metadata: {
          topic: concept.conceptType,
          difficulty: concept.difficultyLevel,
          tags: concept.tags,
          timestamp: Date.now()
        }
      },
      'openai' as AIProvider
    );

    return concept;
  }

  /**
   * Build knowledge graph representation for a concept
   */
  async getKnowledgeGraph(conceptId: string): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      type: string;
      properties: any;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationshipType: string;
      strength: number;
    }>;
  }> {
    const nodes: Array<{ id: string; name: string; type: string; properties: any }> = [];
    const edges: Array<{ source: string; target: string; relationshipType: string; strength: number }> = [];

    const concept = await this.database
      .selectFrom('concepts')
      .selectAll()
      .where('id', '=', conceptId)
      .executeTakeFirst();

    if (concept) {
      nodes.push({
        id: concept.id,
        name: concept.name,
        type: concept.concept_type,
        properties: {
          difficulty: concept.difficulty_level,
          tags: this.safeParseJSON(concept.tags || '[]', []),
          metadata: this.safeParseJSON(concept.metadata || '{}', {})
        }
      });
    }

    const relationships = await this.database
      .selectFrom('relationships')
      .selectAll()
      .where((eb) =>
        eb.or([
          eb('source_concept_id', '=', conceptId),
          eb('target_concept_id', '=', conceptId)
        ])
      )
      .execute();

    relationships.forEach(rel => {
      edges.push({
        source: rel.source_concept_id,
        target: rel.target_concept_id,
        relationshipType: rel.relationship_type,
        strength: rel.strength
      });
    });

    return { nodes, edges };
  }

  /**
   * Generate embedding placeholder
   */
  private async generateEmbedding(_text: string, _aiProvider: AIProvider): Promise<number[]> {
    // TODO: integrate with actual embedding provider
    return new Array(1536).fill(0).map(() => Math.random());
  }

  private calculateRelevance(similarity: number): string {
    if (similarity >= 0.9) return 'Very High';
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.7) return 'Medium';
    if (similarity >= 0.6) return 'Low';
    return 'Very Low';
  }

  private safeParseJSON<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger?.warn?.(`Failed to parse JSON: ${jsonString}`, error);
      return defaultValue;
    }
  }
}

/**
 * Factory function to initialize a KnowledgeService instance
 */
export function initializeKnowledgeService(
  database: Kysely<Database>,
  vectorDB: VectorDatabaseModule,
  logger?: ILogger
): KnowledgeService {
  return new KnowledgeService(database, vectorDB, logger);
}

export default KnowledgeService;
