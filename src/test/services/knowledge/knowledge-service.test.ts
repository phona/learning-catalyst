/**
 * Knowledge Service Tests
 *
 * Tests for the knowledge graph service including concept management,
 * relationship tracking, and graph operations.
 */

import { KnowledgeService } from '../../services/knowledge/knowledge-service';
import { vi } from 'vitest';

// Mock window.electronAPI for database operations
const mockElectronAPI = {
  invoke: vi.fn(),
  dbFetchAll: vi.fn(),
  dbFetchOne: vi.fn(),
  dbExecuteQuery: vi.fn(),
  dbExecuteScript: vi.fn(),
  // Vector database operations
  vectorAddDocument: vi.fn(),
  vectorSearch: vi.fn(),
  vectorDeleteDocument: vi.fn(),
  vectorGetDocument: vi.fn(),
};

beforeEach(() => {
  (window as any).electronAPI = mockElectronAPI;
  vi.clearAllMocks();
});

describe('Knowledge Service', () => {
  let knowledgeService: KnowledgeService;

  beforeEach(() => {
    knowledgeService = new KnowledgeService();
  });

  describe('Concept Management', () => {
    test('should create a new concept', async () => {
      const conceptData = {
        name: 'React Hooks',
        description: 'Functions that let you use state and other React features',
        conceptType: 'topic',
        difficultyLevel: 3,
        tags: ['react', 'hooks', 'state'],
        metadata: { category: 'frontend', estimatedHours: 8 }
      };

      // Mock successful database insertion
      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });
      mockElectronAPI.vectorAddDocument.mockResolvedValue({ success: true });

      const concept = await knowledgeService.createConcept(conceptData);

      expect(concept).toBeDefined();
      expect(concept.name).toBe('React Hooks');
      expect(concept.conceptType).toBe('topic');
      expect(concept.difficultyLevel).toBe(3);
      expect(concept.tags).toEqual(['react', 'hooks', 'state']);
      expect(concept.id).toMatch(/^concept_/); // Should have generated ID

      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO concepts'),
        expect.arrayContaining([
          expect.stringMatching(/^concept_/),
          'React Hooks',
          expect.stringContaining('React Hooks'),
          'topic',
          3,
          0.0,
          expect.stringContaining('react'),
          expect.stringContaining('frontend'),
          expect.any(String),
          expect.any(String)
        ])
      );

      // Should also add to vector database for semantic search
      expect(mockElectronAPI.vectorAddDocument).toHaveBeenCalledWith(
        'concepts',
        expect.objectContaining({
          id: expect.stringMatching(/^concept_/),
          content: expect.stringContaining('React Hooks'),
          metadata: expect.objectContaining({
            name: 'React Hooks',
            conceptType: 'topic'
          })
        })
      );
    });

    test('should get concept by ID', async () => {
      const mockConcept = {
        id: 'concept_react_hooks',
        name: 'React Hooks',
        description: 'Functions for React state management',
        concept_type: 'topic',
        difficulty_level: 3,
        mastery_level: 0.5,
        tags: '["react","hooks"]',
        metadata: '{"category":"frontend"}',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      mockElectronAPI.dbFetchOne.mockResolvedValue({
        success: true,
        result: mockConcept
      });

      const concept = await knowledgeService.getConcept('concept_react_hooks');

      expect(concept).toBeDefined();
      expect(concept.id).toBe('concept_react_hooks');
      expect(concept.name).toBe('React Hooks');
      expect(concept.conceptType).toBe('topic');
      expect(concept.tags).toEqual(['react', 'hooks']);
      expect(concept.metadata.category).toBe('frontend');

      expect(mockElectronAPI.dbFetchOne).toHaveBeenCalledWith(
        'SELECT * FROM concepts WHERE id = ?',
        ['concept_react_hooks']
      );
    });

    test('should return null for non-existent concept', async () => {
      mockElectronAPI.dbFetchOne.mockResolvedValue({
        success: true,
        result: null
      });

      const concept = await knowledgeService.getConcept('non_existent');

      expect(concept).toBeNull();
    });

    test('should update concept', async () => {
      const updates = {
        name: 'Advanced React Hooks',
        masteryLevel: 0.8,
        reviewCount: 5
      };

      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });
      mockElectronAPI.vectorAddDocument.mockResolvedValue({ success: true });

      const result = await knowledgeService.updateConcept('concept_react_hooks', updates);

      expect(result).toBe(true);
      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE concepts SET'),
        expect.arrayContaining([
          'Advanced React Hooks',
          0.8,
          5,
          'concept_react_hooks'
        ])
      );

      // Should update vector database entry
      expect(mockElectronAPI.vectorAddDocument).toHaveBeenCalled();
    });

    test('should delete concept', async () => {
      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });
      mockElectronAPI.vectorDeleteDocument.mockResolvedValue({ success: true });

      const result = await knowledgeService.deleteConcept('concept_react_hooks');

      expect(result).toBe(true);
      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        'DELETE FROM concepts WHERE id = ?',
        ['concept_react_hooks']
      );

      // Should also delete from vector database
      expect(mockElectronAPI.vectorDeleteDocument).toHaveBeenCalledWith(
        'concepts',
        'concept_react_hooks'
      );
    });

    test('should search concepts', async () => {
      const mockConcepts = [
        {
          id: 'concept_react_hooks',
          name: 'React Hooks',
          description: 'React hooks tutorial',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.5,
          tags: '["react","hooks"]',
          metadata: '{}'
        },
        {
          id: 'concept_vue_composition',
          name: 'Vue Composition API',
          description: 'Vue composition guide',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.3,
          tags: '["vue","composition"]',
          metadata: '{}'
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockConcepts
      });

      const concepts = await knowledgeService.searchConcepts('react', { limit: 10 });

      expect(concepts).toHaveLength(2);
      expect(concepts[0].name).toBe('React Hooks');
      expect(concepts[0].conceptType).toBe('topic');
      expect(concepts[0].tags).toEqual(['react', 'hooks']);

      expect(mockElectronAPI.dbFetchAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM concepts WHERE'),
        expect.arrayContaining(['%react%', 10])
      );
    });
  });

  describe('Relationship Management', () => {
    test('should create relationship between concepts', async () => {
      const relationshipData = {
        sourceConceptId: 'concept_javascript',
        targetConceptId: 'concept_react',
        relationshipType: 'prerequisite',
        strength: 0.9,
        description: 'JavaScript knowledge required for React'
      };

      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });

      const relationship = await knowledgeService.createRelationship(relationshipData);

      expect(relationship).toBeDefined();
      expect(relationship.sourceConceptId).toBe('concept_javascript');
      expect(relationship.targetConceptId).toBe('concept_react');
      expect(relationship.relationshipType).toBe('prerequisite');
      expect(relationship.strength).toBe(0.9);
      expect(relationship.id).toMatch(/^rel_/);

      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO relationships'),
        expect.arrayContaining([
          expect.stringMatching(/^rel_/),
          'concept_javascript',
          'concept_react',
          'prerequisite',
          0.9,
          expect.stringContaining('JavaScript knowledge'),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        ])
      );
    });

    test('should get relationships for concept', async () => {
      const mockRelationships = [
        {
          id: 'rel_1',
          source_concept_id: 'concept_javascript',
          target_concept_id: 'concept_react',
          relationship_type: 'prerequisite',
          strength: 0.9,
          description: 'JS prerequisite for React',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'rel_2',
          source_concept_id: 'concept_react',
          target_concept_id: 'concept_react_hooks',
          relationship_type: 'contains',
          strength: 0.8,
          description: 'Hooks are part of React',
          created_at: '2024-01-15T10:00:00Z'
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockRelationships
      });

      const relationships = await knowledgeService.getRelationships('concept_react');

      expect(relationships).toHaveLength(2);
      expect(relationships[0].relationshipType).toBe('prerequisite');
      expect(relationships[1].relationshipType).toBe('contains');

      expect(mockElectronAPI.dbFetchAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM relationships WHERE'),
        ['concept_react', 'concept_react']
      );
    });

    test('should update relationship', async () => {
      const updates = {
        strength: 0.95,
        description: 'Updated description'
      };

      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });

      const result = await knowledgeService.updateRelationship('rel_1', updates);

      expect(result).toBe(true);
      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE relationships SET'),
        expect.arrayContaining([0.95, 'Updated description', 'rel_1'])
      );
    });

    test('should delete relationship', async () => {
      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });

      const result = await knowledgeService.deleteRelationship('rel_1');

      expect(result).toBe(true);
      expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
        'DELETE FROM relationships WHERE id = ?',
        ['rel_1']
      );
    });
  });

  describe('Graph Operations', () => {
    test('should get knowledge graph for concept', async () => {
      const mockConcept = {
        id: 'concept_react',
        name: 'React',
        description: 'React library',
        concept_type: 'topic',
        difficulty_level: 3,
        mastery_level: 0.7,
        tags: '["react","library"]',
        metadata: '{}'
      };

      const mockRelationships = [
        {
          id: 'rel_1',
          source_concept_id: 'concept_javascript',
          target_concept_id: 'concept_react',
          relationship_type: 'prerequisite',
          strength: 0.9,
          description: 'JS prerequisite'
        }
      ];

      mockElectronAPI.dbFetchOne
        .mockResolvedValueOnce({ success: true, result: mockConcept })
        .mockResolvedValueOnce({ success: true, result: { count: 1 } });

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockRelationships
      });

      const graph = await knowledgeService.getKnowledgeGraph('concept_react');

      expect(graph).toBeDefined();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(1);
      expect(graph.nodes[0].id).toBe('concept_react');
      expect(graph.nodes[0].name).toBe('React');
      expect(graph.edges[0].source).toBe('concept_javascript');
      expect(graph.edges[0].target).toBe('concept_react');
    });

    test('should get related concepts with semantic search', async () => {
      const mockVectorResults = [
        { id: 'concept_react_hooks', score: 0.95 },
        { id: 'concept_react_state', score: 0.87 }
      ];

      const mockRelatedConcepts = [
        {
          id: 'concept_react_hooks',
          name: 'React Hooks',
          description: 'React hooks guide',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.6,
          tags: '["react","hooks"]',
          metadata: '{}'
        }
      ];

      mockElectronAPI.vectorSearch.mockResolvedValue({
        success: true,
        results: mockVectorResults
      });

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockRelatedConcepts
      });

      const relatedConcepts = await knowledgeService.getRelatedConcepts(
        'concept_react',
        { limit: 5, includeSemantic: true }
      );

      expect(relatedConcepts).toHaveLength(1);
      expect(relatedConcepts[0].id).toBe('concept_react_hooks');
      expect(relatedConcepts[0].relevanceScore).toBe(0.95);

      expect(mockElectronAPI.vectorSearch).toHaveBeenCalledWith(
        'concepts',
        expect.stringContaining('React'),
        10
      );
    });

    test('should find learning path', async () => {
      const mockPath = [
        {
          id: 'concept_html',
          name: 'HTML',
          description: 'HTML basics',
          difficulty_level: 1,
          concept_type: 'topic'
        },
        {
          id: 'concept_css',
          name: 'CSS',
          description: 'CSS styling',
          difficulty_level: 2,
          concept_type: 'topic'
        },
        {
          id: 'concept_javascript',
          name: 'JavaScript',
          description: 'JavaScript programming',
          difficulty_level: 3,
          concept_type: 'topic'
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockPath
      });

      const path = await knowledgeService.findLearningPath('concept_react');

      expect(path).toHaveLength(3);
      expect(path[0].name).toBe('HTML');
      expect(path[1].name).toBe('CSS');
      expect(path[2].name).toBe('JavaScript');

      expect(mockElectronAPI.dbFetchAll).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['concept_react']
      );
    });
  });

  describe('Analytics and Statistics', () => {
    test('should get concept statistics', async () => {
      const mockStats = {
        totalConcepts: 25,
        masteredConcepts: 8,
        inProgressConcepts: 12,
        averageDifficulty: 3.2,
        conceptDistribution: {
          topic: 15,
          skill: 7,
          fact: 3
        }
      };

      mockElectronAPI.dbFetchOne
        .mockResolvedValueOnce({ success: true, result: { count: 25 } })
        .mockResolvedValueOnce({ success: true, result: { count: 8 } })
        .mockResolvedValueOnce({ success: true, result: { avg: 3.2 } })
        .mockResolvedValueOnce({ success: true, result: { concept_type: 'topic', count: 15 } })
        .mockResolvedValueOnce({ success: true, result: { concept_type: 'skill', count: 7 } })
        .mockResolvedValueOnce({ success: true, result: { concept_type: 'fact', count: 3 } });

      const stats = await knowledgeService.getConceptStatistics();

      expect(stats.totalConcepts).toBe(25);
      expect(stats.masteredConcepts).toBe(8);
      expect(stats.averageDifficulty).toBe(3.2);
      expect(stats.conceptDistribution.topic).toBe(15);
    });

    test('should get relationship statistics', async () => {
      mockElectronAPI.dbFetchOne
        .mockResolvedValueOnce({ success: true, result: { count: 45 } })
        .mockResolvedValueOnce({ success: true, result: { relationship_type: 'prerequisite', count: 20 } })
        .mockResolvedValueOnce({ success: true, result: { relationship_type: 'related', count: 15 } })
        .mockResolvedValueOnce({ success: true, result: { relationship_type: 'contains', count: 10 } });

      const stats = await knowledgeService.getRelationshipStatistics();

      expect(stats.totalRelationships).toBe(45);
      expect(stats.relationshipTypes.prerequisite).toBe(20);
      expect(stats.relationshipTypes.related).toBe(15);
      expect(stats.relationshipTypes.contains).toBe(10);
    });

    test('should get learning progress metrics', async () => {
      const mockProgress = [
        {
          date: '2024-01-15',
          conceptsStudied: 3,
          averageMastery: 0.6,
          studyTime: 120
        },
        {
          date: '2024-01-14',
          conceptsStudied: 2,
          averageMastery: 0.5,
          studyTime: 90
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockProgress
      });

      const progress = await knowledgeService.getLearningProgress({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(progress).toHaveLength(2);
      expect(progress[0].date).toBe('2024-01-15');
      expect(progress[0].conceptsStudied).toBe(3);
      expect(progress[0].averageMastery).toBe(0.6);
      expect(progress[0].studyTime).toBe(120);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockElectronAPI.dbFetchOne.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      await expect(knowledgeService.getConcept('concept_test'))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle validation errors for concept creation', async () => {
      const invalidConcept = {
        name: '', // Empty name
        conceptType: 'invalid_type', // Invalid type
        difficultyLevel: 10 // Out of range
      };

      await expect(knowledgeService.createConcept(invalidConcept))
        .rejects.toThrow();
    });

    test('should handle validation errors for relationships', async () => {
      const invalidRelationship = {
        sourceConceptId: '', // Empty source
        targetConceptId: 'concept_target',
        relationshipType: 'invalid_type', // Invalid type
        strength: 1.5 // Out of range
      };

      await expect(knowledgeService.createRelationship(invalidRelationship))
        .rejects.toThrow();
    });

    test('should handle vector database errors', async () => {
      const conceptData = {
        name: 'Test Concept',
        conceptType: 'topic',
        difficultyLevel: 1
      };

      mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });
      mockElectronAPI.vectorAddDocument.mockResolvedValue({
        success: false,
        error: 'Vector database unavailable'
      });

      // Should still create concept even if vector database fails
      const concept = await knowledgeService.createConcept(conceptData);

      expect(concept).toBeDefined();
      expect(concept.name).toBe('Test Concept');
    });
  });
});