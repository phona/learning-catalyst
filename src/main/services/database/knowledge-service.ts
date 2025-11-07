/**
 * Knowledge Service
 *
 * 🎯 What It Is:
 * Service layer for managing knowledge graphs, embeddings, and semantic search
 * using Qdrant vector database. Handles learning content analysis and recommendations.
 *
 * ⚙️ How It Works:
 * - Integrates with AI services to generate embeddings for learning content
 * - Stores and retrieves knowledge vectors in Qdrant collections
 * - Provides semantic search and similarity-based recommendations
 * - Manages knowledge graphs and learning path relationships
 * - Tracks learning context and conversation history
 *
 * 🔗 Relationships:
 * - Uses QdrantService for vector storage operations
 * - Integrates with AI services for embedding generation
 * - Consumed by session management for context storage
 * - Provides data to analytics for learning insights
 */

import { AIProvider } from '../../types/ai';

// Types for IPC communication with main process
interface VectorPoint {
  id: string;
  vector: number[];
  payload: any;
}

export interface KnowledgeItem {
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

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  items: string[]; // Knowledge item IDs
  difficulty: number;
  estimatedTime: number;
  prerequisites: string[];
}

export class KnowledgeService {
  private readonly COLLECTIONS = {
    KNOWLEDGE: 'knowledge_items',
    CONVERSATIONS: 'conversations',
    RESOURCES: 'learning_resources',
    EMBEDDINGS: 'content_embeddings'
  };
  private readonly VECTOR_SIZE = 1536; // Default for OpenAI embeddings

  constructor() {
    this.initializeCollections();
  }

  /**
   * Initialize Qdrant collections
   */
  private async initializeCollections(): Promise<void> {
    try {
      console.log('Initializing Qdrant collections via IPC...');
      // Collections are initialized in the main process
      // This is just for logging
    } catch (error) {
      console.error('Failed to initialize Qdrant collections:', error);
    }
  }

  /**
   * IPC helper method
   */
  private async invokeIPC(channel: string, ...args: any[]): Promise<any> {
    if ((window as any).electronAPI && (window as any).electronAPI.invoke) {
      return await (window as any).electronAPI.invoke(channel, ...args);
    }
    throw new Error('Electron API not available');
  }

  /**
   * Add knowledge item with embedding
   */
  async addKnowledgeItem(
    item: KnowledgeItem,
    aiProvider: AIProvider,
    embedding?: number[]
  ): Promise<void> {
    try {
      // Generate embedding if not provided
      if (!embedding) {
        embedding = await this.generateEmbedding(item.content, aiProvider);
      }

      // Store via IPC
      const result = await this.invokeIPC('knowledge:add', {
        item,
        embedding,
        provider: aiProvider
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add knowledge item');
      }

      console.log(`Added knowledge item: ${item.id}`);
    } catch (error) {
      console.error('Failed to add knowledge item:', error);
      throw error;
    }
  }

  /**
   * Search for similar knowledge items
   */
  async searchKnowledge(
    query: string,
    aiProvider: AIProvider,
    limit: number = 10,
    filters?: {
      type?: string;
      topic?: string;
      sessionId?: string;
      tags?: string[];
    }
  ): Promise<KnowledgeSearchResult[]> {
    try {
      // Search via IPC
      const result = await this.invokeIPC('knowledge:search', {
        query,
        provider: aiProvider,
        limit,
        filters
      });

      if (!result.success) {
        console.error('Search failed:', result.error);
        return [];
      }

      return result.results || [];
    } catch (error) {
      console.error('Failed to search knowledge:', error);
      return [];
    }
  }

  /**
   * Get knowledge item by ID
   */
  async getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
    try {
      const result = await this.invokeIPC('knowledge:get', { id });

      if (!result.success) {
        console.error('Get knowledge item failed:', result.error);
        return null;
      }

      return result.item || null;
    } catch (error) {
      console.error('Failed to get knowledge item:', error);
      return null;
    }
  }

  /**
   * Update knowledge item
   */
  async updateKnowledgeItem(
    id: string,
    updates: Partial<KnowledgeItem>,
    aiProvider: AIProvider
  ): Promise<void> {
    try {
      const result = await this.invokeIPC('knowledge:update', {
        id,
        updates,
        provider: aiProvider
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update knowledge item');
      }

      console.log(`Updated knowledge item: ${id}`);
    } catch (error) {
      console.error('Failed to update knowledge item:', error);
      throw error;
    }
  }

  /**
   * Delete knowledge item
   */
  async deleteKnowledgeItem(id: string): Promise<void> {
    try {
      const result = await this.invokeIPC('knowledge:delete', { id });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete knowledge item');
      }

      console.log(`Deleted knowledge item: ${id}`);
    } catch (error) {
      console.error('Failed to delete knowledge item:', error);
      throw error;
    }
  }

  /**
   * Store conversation context
   */
  async storeConversationContext(
    sessionId: string,
    messages: Array<{ role: string; content: string }>,
    aiProvider: AIProvider
  ): Promise<void> {
    try {
      const result = await this.invokeIPC('knowledge:storeContext', {
        sessionId,
        messages,
        provider: aiProvider
      });

      if (!result.success) {
        console.error('Failed to store conversation context:', result.error);
      }
    } catch (error) {
      console.error('Failed to store conversation context:', error);
    }
  }

  /**
   * Get relevant conversation context
   */
  async getRelevantContext(
    sessionId: string,
    query: string,
    aiProvider: AIProvider,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const result = await this.invokeIPC('knowledge:getContext', {
        sessionId,
        query,
        provider: aiProvider,
        limit
      });

      if (!result.success) {
        console.error('Failed to get relevant context:', result.error);
        return [];
      }

      return result.context || [];
    } catch (error) {
      console.error('Failed to get relevant context:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string, aiProvider: AIProvider): Promise<number[]> {
    // This would integrate with the AI service to generate embeddings
    // For now, return a mock embedding
    console.warn('Using mock embedding - integrate with AI service for real embeddings');
    return new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());
  }

  /**
   * Calculate relevance based on similarity score
   */
  private calculateRelevance(similarity: number): string {
    if (similarity >= 0.9) return 'Very High';
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.7) return 'Medium';
    if (similarity >= 0.6) return 'Low';
    return 'Very Low';
  }

  /**
   * Get knowledge statistics
   */
  async getKnowledgeStats(): Promise<{
    totalItems: number;
    itemsByType: Record<string, number>;
    itemsByTopic: Record<string, number>;
  }> {
    try {
      const result = await this.invokeIPC('knowledge:stats');

      if (!result.success) {
        console.error('Failed to get knowledge stats:', result.error);
        return {
          totalItems: 0,
          itemsByType: {},
          itemsByTopic: {}
        };
      }

      return result.stats || {
        totalItems: 0,
        itemsByType: {},
        itemsByTopic: {}
      };
    } catch (error) {
      console.error('Failed to get knowledge stats:', error);
      return {
        totalItems: 0,
        itemsByType: {},
        itemsByTopic: {}
      };
    }
  }

  /**
   * Clear all knowledge data
   */
  async clearAllKnowledge(): Promise<void> {
    try {
      const result = await this.invokeIPC('knowledge:clear');

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear knowledge data');
      }

      console.log('Cleared all knowledge data');
    } catch (error) {
      console.error('Failed to clear knowledge data:', error);
      throw error;
    }
  }

  /**
   * Search for relevant concepts based on query
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
    try {
      const result = await this.invokeIPC('knowledge:searchConcepts', {
        query,
        limit: options?.limit || 10,
        difficulty: options?.difficulty,
        conceptType: options?.conceptType,
        sessionId: options?.sessionId
      });

      if (!result.success) {
        console.error('Failed to search relevant concepts:', result.error);
        return [];
      }

      return result.concepts || [];
    } catch (error) {
      console.error('Failed to search relevant concepts:', error);
      return [];
    }
  }

  /**
   * Add knowledge (alias for addKnowledgeItem)
   */
  async addKnowledge(
    item: KnowledgeItem,
    aiProvider: AIProvider,
    embedding?: number[]
  ): Promise<void> {
    return this.addKnowledgeItem(item, aiProvider, embedding);
  }

  /**
   * Update concept relationships
   */
  async updateConceptRelationships(
    conceptId: string,
    relationships: Array<{
      targetConceptId: string;
      relationshipType: 'prerequisite' | 'related' | 'contains' | 'example';
      strength: number;
    }>
  ): Promise<void> {
    try {
      const result = await this.invokeIPC('knowledge:updateRelationships', {
        conceptId,
        relationships
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update concept relationships');
      }

      console.log(`Updated relationships for concept: ${conceptId}`);
    } catch (error) {
      console.error('Failed to update concept relationships:', error);
      throw error;
    }
  }
}

// Singleton instance
let knowledgeService: KnowledgeService | null = null;

export function getKnowledgeService(): KnowledgeService {
  if (!knowledgeService) {
    knowledgeService = new KnowledgeService();
  }
  return knowledgeService;
}

export default KnowledgeService;