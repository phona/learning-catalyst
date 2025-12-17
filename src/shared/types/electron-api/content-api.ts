/**
 * Content & Discovery API
 *
 * Manages learning content import, discovery, and analysis.
 * Focuses on expanding the knowledge base with relevant content.
 */

import type { APIResponse } from './base';

export interface ContentAPI {
  /**
   * Explores local projects for learning content
   * Scans file system for code, documentation, and learning materials
   * @returns Promise<ProjectDisplay[]> - Array of discoverable local projects
   */
  exploreLocalProjects: () => Promise<APIResponse<ProjectDisplay[]>>;

  /**
   * Imports learning content from files
   * Processes files and extracts learning concepts and materials
   * @param files - FileList from file input or drag-drop
   * @returns Promise<ImportResultDisplay> - Import results and extracted content
   */
  importLearningContent: (files: FileList) => Promise<APIResponse<ImportResultDisplay>>;

  /**
   * Gets recommended learning content for a topic
   * Suggests relevant materials based on topic and skill level
   * @param params.topic - Learning topic or concept
   * @param params.level - 'beginner' | 'intermediate' | 'advanced'
   * @returns Promise<ContentRecommendationDisplay[]> - Array of recommended content
   */
  getRecommendedContent: (params: {
    topic: string;
    level: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<APIResponse<ContentRecommendationDisplay[]>>;

  /**
   * Searches learning resources across multiple sources
   * Performs comprehensive search with intelligent filtering
   * @param query - Search query string
   * @returns Promise<ResourceSearchResultDisplay> - Search results with relevance ranking
   */
  searchLearningResources: (query: string) => Promise<APIResponse<ResourceSearchResultDisplay>>;

  /**
   * Analyzes a document for learning content
   * Extracts concepts, structure, and learning value from documents
   * @param filePath - Path to the document to analyze
   * @returns Promise<DocumentAnalysisDisplay> - Detailed document analysis
   */
  analyzeDocument: (filePath: string) => Promise<APIResponse<DocumentAnalysisDisplay>>;

  /**
   * Extracts concepts from raw text content
   * Identifies key learning concepts and their relationships
   * @param content - Text content to analyze
   * @returns Promise<ConceptExtractionDisplay[]> - Array of extracted concepts
   */
  extractConcepts: (content: string) => Promise<APIResponse<ConceptExtractionDisplay[]>>;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Display-ready local project information
 */
export interface ProjectDisplay {
  id: string;
  name: string;
  path: string;
  type: 'web-development' | 'mobile' | 'desktop' | 'data-science' | 'machine-learning' | 'other';
  technologies: string[];
  estimatedLearningValue: 'beginner' | 'intermediate' | 'advanced';
  contentSummary: {
    codeFiles: number;
    documentation: number;
    concepts: string[];
    complexityScore: number;
  };
  lastModified: string;
  size: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
}

/**
 * Import results with extracted content information
 */
export interface ImportResultDisplay {
  success: boolean;
  processedFiles: number;
  totalFiles: number;
  extractedContent: {
    concepts: string[];
    codeExamples: number;
    documentation: number;
    exercises: number;
    images: number;
  };
  importedSessions: ImportSessionDisplay[];
  recommendations: string[];
  errors: ImportError[];
  summary: {
    learningValue: 'low' | 'medium' | 'high';
    estimatedTime: string;
    keyTopics: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * Imported learning session information
 */
export interface ImportSessionDisplay {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  concepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sourceFile: string;
  prerequisites: string[];
  learningObjectives: string[];
}

/**
 * Import error information
 */
export interface ImportError {
  file: string;
  error: string;
  type: 'parsing' | 'format' | 'access' | 'size' | 'corrupted';
  recoverable: boolean;
  suggestion?: string;
}

/**
 * Content recommendation for learning
 */
export interface ContentRecommendationDisplay {
  id: string;
  title: string;
  type: 'documentation' | 'tutorial' | 'video' | 'course' | 'article' | 'book' | 'interactive';
  source: string;
  url?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadingTime?: string;
  estimatedDuration?: string;
  description: string;
  relevanceScore: number;
  topics: string[];
  formats: ContentFormat[];
  preview: string;
  author?: string;
  rating?: number;
  lastUpdated?: string;
  tags: string[];
  metadata: {
    language?: string;
    prerequisites?: string[];
    learningObjectives?: string[];
    interactiveElements?: string[];
  };
}

/**
 * Content format information
 */
export type ContentFormat =
  | 'text'
  | 'video'
  | 'audio'
  | 'interactive'
  | 'code'
  | 'image'
  | 'pdf'
  | 'presentation';

/**
 * Resource search results with intelligent filtering
 */
export interface ResourceSearchResultDisplay {
  query: string;
  totalResults: number;
  results: ResourceResult[];
  filters: {
    types: string[];
    difficulties: string[];
    sources: string[];
    formats: string[];
    languages: string[];
  };
  appliedFilters: Record<string, string[]>;
  suggestions: string[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    limit: number;
  };
  searchTime: string;
  relatedQueries: string[];
}

/**
 * Individual resource search result
 */
export interface ResourceResult {
  id: string;
  title: string;
  type: 'course' | 'tutorial' | 'documentation' | 'video' | 'article' | 'book' | 'interactive';
  source: string;
  relevanceScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  description: string;
  matchHighlights: string[];
  url?: string;
  thumbnail?: string;
  author?: string;
  rating?: number;
  reviewCount?: number;
  publishedAt?: string;
  tags: string[];
  price?: 'free' | 'paid' | 'freemium';
  language: string;
  certificate?: boolean;
}

/**
 * Detailed document analysis results
 */
export interface DocumentAnalysisDisplay {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  analysis: {
    readabilityScore: number;
    technicalComplexity: 'beginner' | 'intermediate' | 'advanced';
    estimatedReadingTime: string;
    learningValue: 'low' | 'medium' | 'high';
    structure: {
      sections: number;
      codeExamples: number;
      diagrams: number;
      exercises: number;
      references: number;
    };
    quality: {
      completeness: number;
      accuracy: number;
      clarity: number;
      organization: number;
    };
  };
  extractedConcepts: ExtractedConcept[];
  learningObjectives: string[];
  suggestedUse: string;
  prerequisites: string[];
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLearningTime: string;
  relatedDocuments: string[];
  tags: string[];
}

/**
 * Extracted concept with confidence and context
 */
export interface ExtractedConcept {
  concept: string;
  confidence: number;
  context: string;
  relatedTerms: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  importanceScore: number;
  frequency: number;
  examples?: string[];
}

/**
 * Concept extraction result
 */
export interface ConceptExtractionDisplay {
  concept: string;
  confidence: number;
  context: string;
  relatedTerms: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  importanceScore: number;
  frequency: number;
  examples?: string[];
  synonyms?: string[];
  definition?: string;
}

// ============================================================================
// Content Management Types
// ============================================================================

/**
 * Content library information
 */
export interface ContentLibraryDisplay {
  id: string;
  name: string;
  description: string;
  type: 'personal' | 'shared' | 'public' | 'curated';
  itemCount: number;
  totalSize: string;
  lastUpdated: string;
  tags: string[];
  categories: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  curator?: string;
  collaborators: string[];
  privacy: 'private' | 'shared' | 'public';
}

/**
 * Content collection for organization
 */
export interface ContentCollectionDisplay {
  id: string;
  name: string;
  description: string;
  items: ContentItemDisplay[];
  metadata: {
    created: string;
    updated: string;
    itemCount: number;
    totalDuration?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
  };
  sharing: {
    isPublic: boolean;
    shareLink?: string;
    collaborators: string[];
    permissions: ('view' | 'edit' | 'comment')[];
  };
}

/**
 * Individual content item
 */
export interface ContentItemDisplay {
  id: string;
  title: string;
  type: 'document' | 'video' | 'interactive' | 'exercise' | 'project';
  url?: string;
  localPath?: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  tags: string[];
  topics: string[];
  progress: {
    completed: boolean;
    completionPercentage: number;
    timeSpent: string;
    lastAccessed: string;
  };
  metadata: {
    author?: string;
    source: string;
    fileSize?: string;
    format: string;
    language: string;
  };
  rating?: number;
  notes?: string;
  bookmarks?: string[];
}
