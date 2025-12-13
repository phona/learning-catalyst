/**
 * Knowledge & Discovery API
 *
 * Provides access to the knowledge graph and learning content discovery.
 * Focuses on conceptual understanding and knowledge exploration.
 */

import type { APIResponse } from './index';

export interface KnowledgeAPI {
  /**
   * Ingests a parsed result into the knowledge graph for downstream queries
   */
  ingestConcepts: (params: {
    result: ConceptParsingResult;
    plan?: ConceptIngestionPlan;
    options?: {
      userId?: string;
      materialId?: string;
      sessionId?: string;
      source?: string;
    };
  }) => Promise<APIResponse<KnowledgeIngestionResult>>;

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
  }) => Promise<APIResponse<ConceptExplorationDisplay>>;

  /**
   * Gets concepts related to a given concept
   * Useful for knowledge graph navigation and discovery
   * @param conceptId - ID of the concept to find relations for
   * @returns Promise<RelatedConceptsDisplay> - Array of related concepts with relationships
   */
  getRelatedConcepts: (conceptId: string) => Promise<APIResponse<RelatedConceptsDisplay>>;

  /**
   * Gets knowledge map data for visualization
   * Returns structured data for knowledge graph rendering
   * @param sessionId - Optional session ID to focus on session-specific knowledge
   * @returns Promise<KnowledgeMapDisplay> - Knowledge graph data for visualization
   */
  getKnowledgeMap: (sessionId?: string) => Promise<APIResponse<KnowledgeMapDisplay>>;

  /**
   * Searches the knowledge base for specific content
   * Supports natural language queries and semantic search
   * @param query - Search query string
   * @returns Promise<KnowledgeSearchResultDisplay> - Search results with relevance scores
   */
  searchKnowledge: (query: string) => Promise<APIResponse<KnowledgeSearchResultDisplay>>;

  /**
   * Parse concepts from files and content using AI
   * Extracts learning concepts from markdown files and content
   * @param params - Parsing parameters including files, content, and options
   * @returns Promise<ConceptParsingResult> - Extracted concepts and relationships
   */
  parseConcepts: (params: {
    files?: Array<{
      fileName: string;
      filePath: string;
      content: string;
      title?: string;
      materialId?: string;
    }>;
    content?: string;
    materialId?: string;
    title?: string;
    format?: 'markdown' | 'text' | 'html';
    jobId?: string;
    resume?: boolean;
    options?: {
      confidenceThreshold?: number;
      maxConceptsPerFile?: number;
    };
  }) => Promise<APIResponse<ConceptParsingResult>>;

  /**
   * Clears persisted parsing job cache on disk
   */
  clearParsingJobs: () => Promise<APIResponse<{ removed: number }>>;
}

export interface KnowledgeExtractionDisplay {
  nodes: KnowledgeNodeDisplay[];
  relationships: KnowledgeRelationshipDisplay[];
  summary: string;
  focusAreas: string[];
  recommendations: string[];
  metadata: {
    source: string;
    processedAt: string;
    stats: Record<string, unknown>;
    snippetCount: number;
  };
}

export interface KnowledgeNodeDisplay {
  id: string;
  name: string;
  type: string;
  description?: string;
  difficultyLevel: number;
  masteryLevel: number;
  tags: string[];
  metadata: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export interface KnowledgeRelationshipDisplay {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  strength: number;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

/**
 * Concept parsing result display
 */
export interface ConceptParsingResult {
  success: boolean;
  concepts: ParsedConcept[];
  relationships: ParsedRelationship[];
  statistics: {
    totalConcepts: number;
    validConcepts: number;
    totalRelationships: number;
    confidenceDistribution: Record<string, number>;
    difficultyDistribution: Record<number, number>;
    typeDistribution: Record<string, number>;
    processingTime: number;
    modelUsage: Record<string, number>;
    tokenUsage?: {
      total: number;
      prompt: number;
      completion: number;
      estimated?: boolean;
    };
    deduplication?: {
      duplicatesMerged: number;
      relationshipsSkipped?: number;
      deduplicationStrategy: string;
      originalCounts?: {
        concepts: number;
        relationships: number;
      };
    };
  };
  errors: string[];
  metadata: {
    processingTime: number;
    processedAt: string;
    inputFiles: number;
    aiProvider?: string;
    aiModel?: string;
    jobId?: string;
    segmentsProcessed?: number;
    segmentsTotal?: number;
    resumed?: boolean;
  };
}

export interface KnowledgeIngestionResult {
  conceptsInserted: number;
  conceptsUpdated: number;
  relationshipsInserted: number;
  conceptsSkipped?: number;
  conceptsMerged?: number;
  relationshipsSkipped?: number;
  lowConfidenceSkipped?: number;
  metadata: {
    processedAt: string;
    source?: string;
  };
}

/**
 * Parsed concept display
 */
export interface ParsedConcept {
  id: string;
  name: string;
  canonicalName?: string;
  description: string;
  type: string;
  confidence: number;
  difficulty: number;
  evidence: Array<{
    type: string;
    text: string;
    relevance: number;
  }>;
  metadata: Record<string, any>;
}

/**
 * Parsed relationship display
 */
export interface ParsedRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  strength?: number;
  confidence?: number;
  description?: string;
}

export type ConceptIngestionAction = 'insert' | 'overwrite' | 'skip' | 'merge';

export type ConceptFieldKey = 'name' | 'type' | 'description' | 'difficulty' | 'tags';

export interface ConceptCanonicalizationChoice {
  canonicalName?: string;
  aliases?: string[];
  applyAlias?: boolean;
}

export interface ConceptIngestionPlan {
  /**
   * Default action for concepts that already exist in the database
   * when no explicit action is provided.
   */
  defaultExistingAction?: Extract<ConceptIngestionAction, 'overwrite' | 'skip'>;
  /**
   * Rules for skipping low-confidence concepts.
   */
  lowConfidence?: {
    defaultThreshold?: number;
    overrides?: Record<string, number>;
  };
  /**
   * Per-parsed-concept action overrides keyed by parsed concept id.
   */
  actions?: Record<string, ConceptIngestionAction>;
  /**
   * Field-level overwrite toggles keyed by parsed concept id.
   */
  fieldToggles?: Record<string, Partial<Record<ConceptFieldKey, boolean>>>;
  /**
   * Canonicalization and alias choices keyed by parsed concept id.
   */
  canonicalization?: Record<string, ConceptCanonicalizationChoice>;
  /**
   * Merge directives: parsed concept id -> target existing concept id.
   */
  mergeTargets?: Record<string, string>;
  /**
   * Auto-deduplication configuration for Stage 2 (knowledge base check).
   * When enabled, concepts will be checked against existing knowledge base
   * and merged if similarity exceeds threshold.
   */
  autoDeduplicate?: {
    /**
     * Enable auto-deduplication during ingestion (Stage 2).
     * @default false
     */
    enabled?: boolean;
    /**
     * Vector similarity threshold for considering concepts as duplicates.
     * Range: 0.85 - 0.99 (higher = more strict)
     * @default 0.92
     */
    threshold?: number;
    /**
     * Strategy for handling duplicates found during KB check.
     * - 'skip': Don't store new concept (keep existing)
     * - 'merge_metadata': Merge metadata into existing, don't store new
     * @default 'skip'
     */
    strategy?: 'skip' | 'merge_metadata';
    /**
     * Whether to update relationship pointers when merging.
     * @default true
     */
    updateRelationships?: boolean;
  };
}
