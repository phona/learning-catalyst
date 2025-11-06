/**
 * Knowledge & Discovery API
 *
 * Provides access to the knowledge graph and learning content discovery.
 * Focuses on conceptual understanding and knowledge exploration.
 */

export interface KnowledgeAPI {
  /**
   * Explores a concept in detail with related information
   * Provides comprehensive concept analysis for learning
   * @param params.conceptName - Name of the concept to explore
   * @param params.depth - 'basic' | 'intermediate' | 'advanced' - depth of exploration
   * @returns Promise<ConceptExplorationDisplay> - Detailed concept information
   */
  exploreConcept: (params: {
    conceptName: string;
    depth: 'basic' | 'intermediate' | 'advanced';
  }) => Promise<ConceptExplorationDisplay>;

  /**
   * Gets concepts related to a given concept
   * Useful for knowledge graph navigation and discovery
   * @param conceptId - ID of the concept to find relations for
   * @returns Promise<RelatedConceptsDisplay> - Array of related concepts with relationships
   */
  getRelatedConcepts: (conceptId: string) => Promise<RelatedConceptsDisplay>;

  /**
   * Gets knowledge map data for visualization
   * Returns structured data for knowledge graph rendering
   * @param sessionId - Optional session ID to focus on session-specific knowledge
   * @returns Promise<KnowledgeMapDisplay> - Knowledge graph data for visualization
   */
  getKnowledgeMap: (sessionId?: string) => Promise<KnowledgeMapDisplay>;

  /**
   * Searches the knowledge base for specific content
   * Supports natural language queries and semantic search
   * @param query - Search query string
   * @returns Promise<KnowledgeSearchResultDisplay> - Search results with relevance scores
   */
  searchKnowledge: (query: string) => Promise<KnowledgeSearchResultDisplay>;

  /**
   * Gets explanation for a concept in specific style
   * Provides different ways to understand the same concept
   * @param params.conceptId - ID of the concept to explain
   * @param params.style - 'simple' | 'technical' | 'analogy' | 'example' | 'visual'
   * @returns Promise<ExplanationDisplay> - Concept explanation in requested style
   */
  getExplanation: (params: {
    conceptId: string;
    style: 'simple' | 'technical' | 'analogy' | 'example' | 'visual';
  }) => Promise<ExplanationDisplay>;

  /**
   * Gets practice exercises for a specific concept
   * Provides hands-on learning opportunities with varying difficulty
   * @param params.conceptId - ID of the concept to practice
   * @param params.difficulty - 'beginner' | 'intermediate' | 'advanced'
   * @returns Promise<ExerciseDisplay[]> - Array of practice exercises
   */
  getPracticeExercises: (params: {
    conceptId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<ExerciseDisplay[]>;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Display-ready concept exploration
 */
export interface ConceptExplorationDisplay {
  concept: {
    id: string;
    name: string;
    category: string;
  };
  definition: string;
  keyPoints: string[];
  relatedConcepts: RelatedConcept[];
  examples: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  estimatedLearningTime: string;
  visualAids?: string[];
  prerequisites: string[];
  learningOutcomes: string[];
}

/**
 * Related concept with relationship information
 */
export interface RelatedConcept {
  id: string;
  name: string;
  relationship: 'subset' | 'related' | 'foundation' | 'type' | 'application';
  strength: number; // 0-1 confidence score
  description: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Display-ready related concepts collection
 */
export interface RelatedConceptsDisplay {
  conceptId: string;
  relatedConcepts: RelatedConcept[];
  totalConnections: number;
  strongestConnection: string;
  categories: string[];
  learningPaths: Array<{
    path: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
  }>;
}

/**
 * Knowledge map data for visualization
 */
export interface KnowledgeMapDisplay {
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  layout: 'force-directed' | 'hierarchical' | 'circular';
  clusters: string[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    centerConcepts: string[];
    learningPaths: Array<{
      name: string;
      nodes: string[];
      difficulty: string;
    }>;
  };
}

/**
 * Knowledge map node for visualization
 */
export interface KnowledgeMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  category: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  mastery?: number; // 0-1 mastery level
}

/**
 * Knowledge map edge for visualization
 */
export interface KnowledgeMapEdge {
  from: string;
  to: string;
  label: string;
  strength: number;
  type: 'foundation' | 'related' | 'prerequisite' | 'application';
}

/**
 * Knowledge search results
 */
export interface KnowledgeSearchResultDisplay {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: string;
  suggestions: string[];
  filters: {
    categories: string[];
    difficulties: string[];
    types: string[];
  };
}

/**
 * Individual search result
 */
export interface SearchResult {
  id: string;
  title: string;
  type: 'concept' | 'example' | 'exercise' | 'explanation';
  category: string;
  relevanceScore: number;
  preview: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  tags: string[];
}

/**
 * Concept explanation in specific style
 */
export interface ExplanationDisplay {
  conceptId: string;
  conceptName: string;
  style: 'simple' | 'technical' | 'analogy' | 'example' | 'visual';
  explanation: string;
  examples: string[];
  visualAids: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  estimatedReadingTime: string;
  relatedConcepts: string[];
  comprehensionLevel?: number; // 0-1 estimated comprehension
}

/**
 * Practice exercise display
 */
export interface ExerciseDisplay {
  id: string;
  title: string;
  type: 'multiple-choice' | 'fill-blank' | 'coding' | 'practical' | 'discussion';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  instructions: string;
  estimatedTime: string;
  concepts: string[];
  prerequisites: string[];
  learningObjectives: string[];
  hints?: string[];
  solution?: string;
  feedback?: string;
}