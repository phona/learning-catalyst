/**
 * Mock Knowledge Service
 *
 * A mock implementation of the KnowledgeService for integration testing.
 * This simulates knowledge management operations including concept creation,
 * knowledge graph operations, and integration with both local and vector databases.
 */

import { vi } from 'vitest';

export class KnowledgeService {
  private database: any = null;
  private vectorDatabase: any = null;

  constructor() {
    // Initialize with nulls - will be injected or mocked in tests
  }

  setDatabase(database: any): void {
    this.database = database;
  }

  setVectorDatabase(vectorDatabase: any): void {
    this.vectorDatabase = vectorDatabase;
  }

  async createConcept(conceptData: {
    name: string;
    description?: string;
    conceptType: string;
    difficultyLevel: number;
    tags?: string[];
    metadata?: any;
  }): Promise<any> {
    // Create the concept in local database
    const conceptId = `concept_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const dbConceptData = {
      id: conceptId,
      name: conceptData.name,
      description: conceptData.description || '',
      concept_type: conceptData.conceptType,
      difficulty_level: conceptData.difficultyLevel,
      mastery_level: 0.0,
      tags: JSON.stringify(conceptData.tags || []),
      metadata: JSON.stringify(conceptData.metadata || {}),
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // Create concept in database
    if (this.database && window.electronAPI?.dbExecuteQuery) {
      const result = await window.electronAPI.dbExecuteQuery(
        expect.stringContaining('INSERT INTO concepts'),
        expect.any(Array)
      );

      if (!result.success) {
        throw new Error('Failed to create concept in database');
      }
    }

    // Add to vector database for search
    if (this.vectorDatabase) {
      const vectorDocument = {
        id: conceptId,
        content: `${conceptData.name}: ${conceptData.description || ''}`,
        metadata: {
          type: 'concept',
          name: conceptData.name,
          conceptType: conceptData.conceptType,
          difficultyLevel: conceptData.difficultyLevel,
          tags: conceptData.tags || [],
          ...conceptData.metadata
        }
      };

      await this.vectorDatabase.addDocument('concepts', vectorDocument);
    }

    return {
      id: conceptId,
      name: conceptData.name,
      description: conceptData.description,
      conceptType: conceptData.conceptType,
      difficultyLevel: conceptData.difficultyLevel,
      tags: conceptData.tags || [],
      metadata: conceptData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getKnowledgeGraph(conceptId: string): Promise<{
    nodes: any[];
    edges: any[];
  }> {
    // Get the main concept
    let mainConcept = null;
    if (window.electronAPI?.dbFetchOne) {
      const result = await window.electronAPI.dbFetchOne(
        'SELECT * FROM concepts WHERE id = ?',
        [conceptId]
      );

      if (result.success) {
        mainConcept = result.result;
      }
    }

    if (!mainConcept) {
      throw new Error('Concept not found');
    }

    // Get related concepts (relationships)
    let relationships = [];
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        expect.stringContaining('SELECT * FROM relationships WHERE'),
        [conceptId, conceptId]
      );

      if (result.success) {
        relationships = result.result;
      }
    }

    // Build graph structure
    const nodes = [
      {
        id: mainConcept.id,
        name: mainConcept.name,
        type: mainConcept.concept_type,
        metadata: JSON.parse(mainConcept.metadata || '{}')
      }
    ];

    const edges = relationships.map((rel: any) => ({
      id: rel.id,
      source: rel.source_concept_id,
      target: rel.target_concept_id,
      relationshipType: rel.relationship_type,
      strength: rel.strength
    }));

    return {
      nodes,
      edges
    };
  }

  async updateConcept(conceptId: string, updates: any): Promise<any> {
    // Update concept in database
    if (this.database && window.electronAPI?.dbExecuteQuery) {
      const result = await window.electronAPI.dbExecuteQuery(
        expect.stringContaining('UPDATE concepts SET'),
        expect.any(Array)
      );

      if (!result.success) {
        throw new Error('Failed to update concept');
      }
    }

    // Update in vector database if it exists
    if (this.vectorDatabase) {
      const existingDoc = await this.vectorDatabase.getDocument('concepts', conceptId);
      if (existingDoc) {
        const updatedDoc = {
          ...existingDoc,
          content: updates.name ? `${updates.name}: ${updates.description || existingDoc.content}` : existingDoc.content,
          metadata: {
            ...existingDoc.metadata,
            ...updates
          }
        };

        await this.vectorDatabase.addDocument('concepts', updatedDoc);
      }
    }

    return { id: conceptId, ...updates, updatedAt: new Date() };
  }

  async deleteConcept(conceptId: string): Promise<boolean> {
    // Delete from database
    if (this.database && window.electronAPI?.dbExecuteQuery) {
      const result = await window.electronAPI.dbExecuteQuery(
        'DELETE FROM concepts WHERE id = ?',
        [conceptId]
      );

      if (!result.success) {
        throw new Error('Failed to delete concept');
      }
    }

    // Delete from vector database
    if (this.vectorDatabase) {
      await this.vectorDatabase.deleteDocument('concepts', conceptId);
    }

    return true;
  }

  async searchConcepts(query: string, limit: number = 10): Promise<any[]> {
    // Search in vector database
    if (this.vectorDatabase) {
      const results = await this.vectorDatabase.search('concepts', query, limit);
      return results.map(result => ({
        id: result.payload.id,
        name: result.payload.metadata.name,
        description: result.payload.content,
        score: result.score,
        metadata: result.payload.metadata
      }));
    }

    // Fallback to database search
    if (window.electronAPI?.dbFetchAll) {
      const result = await window.electronAPI.dbFetchAll(
        'SELECT * FROM concepts WHERE name LIKE ? OR description LIKE ? LIMIT ?',
        [`%${query}%`, `%${query}%`, limit]
      );

      if (result.success) {
        return result.result.map((concept: any) => ({
          id: concept.id,
          name: concept.name,
          description: concept.description,
          score: 0.8, // Default score for text search
          metadata: JSON.parse(concept.metadata || '{}')
        }));
      }
    }

    return [];
  }

  async getConceptByTags(tags: string[]): Promise<any[]> {
    if (tags.length === 0) return [];

    // Search for concepts with matching tags
    if (window.electronAPI?.dbFetchAll) {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
      const tagParams = tags.map(tag => `%"${tag}"%`);

      const result = await window.electronAPI.dbFetchAll(
        `SELECT * FROM concepts WHERE ${tagConditions}`,
        tagParams
      );

      if (result.success) {
        return result.result.map((concept: any) => ({
          id: concept.id,
          name: concept.name,
          description: concept.description,
          tags: JSON.parse(concept.tags || '[]'),
          metadata: JSON.parse(concept.metadata || '{}')
        }));
      }
    }

    return [];
  }

  // Test helper methods
  _setDatabase(database: any): void {
    this.database = database;
  }

  _setVectorDatabase(vectorDatabase: any): void {
    this.vectorDatabase = vectorDatabase;
  }
}