/**
 * Knowledge Service Interface
 *
 * Pure TypeScript interface defining knowledge management operations.
 * Can be used by both main and renderer processes.
 */

import { RelationshipType } from './relationship-types';

export interface ConceptMapDisplay {
  concepts: ConceptNode[];
  relationships: ConceptRelationship[];
  layout: MapLayout;
  filters: MapFilters;
  metadata: MapMetadata;
}

export interface ConceptNode {
  id: string;
  name: string;
  description?: string;
  masteryLevel: number; // 0-100
  category: string;
  tags: string[];
  position: Vector2D;
  size: ConceptSize;
  color: ConceptColor;
  lastStudied?: Date;
  studyCount: number;
  prerequisites: string[];
  relatedConcepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedStudyTime: number; // in minutes
}

export interface ConceptRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-1
  description?: string;
  bidirectional: boolean;
  createdAt: Date;
  lastValidated?: Date;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface ConceptSize {
  width: number;
  height: number;
  scale: number;
}

export interface ConceptColor {
  primary: string;
  secondary: string;
  border: string;
  text: string;
}

export interface MapLayout {
  algorithm: 'force' | 'hierarchical' | 'circular' | 'grid';
  center: Vector2D;
  zoom: number;
  bounds: BoundingBox;
  clustering: boolean;
  showLabels: boolean;
  showRelationships: boolean;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MapFilters {
  categories: string[];
  masteryRange: [number, number];
  tags: string[];
  relationshipTypes: RelationshipType[];
  searchText?: string;
  studiedAfter?: Date;
  studiedBefore?: Date;
}

export interface MapMetadata {
  totalConcepts: number;
  totalRelationships: number;
  averageMastery: number;
  lastUpdated: Date;
  generatedAt: Date;
  version: string;
}

export interface ConceptSearchResult {
  concept: ConceptNode;
  relevanceScore: number; // 0-1
  matchedFields: string[];
  snippet?: string;
  relatedResults: ConceptSearchResult[];
}

export interface ConceptSearchRequest {
  query: string;
  filters?: MapFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'mastery' | 'lastStudied' | 'name';
  includeRelated?: boolean;
  maxDepth?: number;
}

export interface CreateConceptRequest {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  prerequisites?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedStudyTime?: number;
}

export interface CreateRelationshipRequest {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength?: number;
  description?: string;
  bidirectional?: boolean;
}

export interface ConceptRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number;
  description?: string;
  bidirectional: boolean;
  createdAt: Date;
  lastValidated?: Date;
}

export interface ExplanationDisplay {
  conceptId: string;
  conceptName: string;
  explanation: string;
  examples: ExplanationExample[];
  relatedConcepts: RelatedConceptExplanation[];
  difficulty: string;
  estimatedReadTime: number;
  lastUpdated: Date;
}

export interface ExplanationExample {
  title: string;
  description: string;
  code?: string;
  diagram?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface RelatedConceptExplanation {
  conceptId: string;
  conceptName: string;
  relationshipType: RelationshipType;
  briefExplanation: string;
  relevanceScore: number;
}

export interface ExerciseDisplay {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  type: ExerciseType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: ExerciseQuestion[];
  estimatedTime: number;
  prerequisites: string[];
  learningObjectives: string[];
  hints?: string[];
  solution?: ExerciseSolution;
}

export type ExerciseType = 'quiz' | 'coding' | 'practical' | 'essay' | 'project' | 'simulation';

export interface ExerciseQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'text' | 'code' | 'drag-drop';
  options?: string[];
  correctAnswer?: unknown;
  explanation?: string;
  points: number;
  hints?: string[];
}

export interface ExerciseSolution {
  approach: string;
  code?: string;
  explanation: string;
  alternatives?: string[];
  commonMistakes?: string[];
}


export interface LearningPathStep {
  order: number;
  conceptId: string;
  action: 'study' | 'practice' | 'review' | 'assess';
  resources: LearningResource[];
  estimatedTime: number;
  completed: boolean;
  completedAt?: Date;
}

export interface LearningResource {
  type: 'explanation' | 'exercise' | 'video' | 'article' | 'simulation';
  id: string;
  title: string;
  description: string;
  url?: string;
  estimatedTime: number;
}

export interface LearningPathOptions {
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  maxSteps?: number;
  includeExercises?: boolean;
  includeReviews?: boolean;
  estimatedTimeLimit?: number;
}

export interface PrerequisiteValidation {
  conceptId: string;
  conceptName: string;
  prerequisitesMet: boolean;
  missingPrerequisites: MissingPrerequisite[];
  recommendedActions: string[];
}

export interface MissingPrerequisite {
  conceptId: string;
  conceptName: string;
  currentMastery: number;
  requiredMastery: number;
  gap: number;
}

export interface KnowledgeGap {
  conceptId: string;
  conceptName: string;
  currentMastery: number;
  targetMastery: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  studyPlan: StudyRecommendation[];
}

export interface StudyRecommendation {
  action: string;
  resourceType: string;
  estimatedTime: number;
  description: string;
  difficulty: string;
}

export interface LearningRecommendation {
  conceptId: string;
  conceptName: string;
  type: 'prerequisite' | 'related' | 'advanced' | 'review';
  reason: string;
  confidence: number; // 0-1
  estimatedBenefit: number;
  resources: LearningResource[];
}

export interface RelationshipValidation {
  relationshipId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  isValid: boolean;
  issues: ValidationIssue[];
  suggestedFixes: string[];
}

export interface ValidationIssue {
  type: 'circular' | 'weak_strength' | 'contradiction' | 'redundant';
  description: string;
  severity: 'error' | 'warning' | 'info';
}

// Error types specific to knowledge service
export class KnowledgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

export class ConceptNotFoundError extends KnowledgeError {
  constructor(conceptId: string) {
    super(`Concept not found: ${conceptId}`, 'CONCEPT_NOT_FOUND', { conceptId });
  }
}

export class RelationshipNotFoundError extends KnowledgeError {
  constructor(relationshipId: string) {
    super(`Relationship not found: ${relationshipId}`, 'RELATIONSHIP_NOT_FOUND', {
      relationshipId,
    });
  }
}

export class CircularDependencyError extends KnowledgeError {
  constructor(conceptIds: string[]) {
    super(`Circular dependency detected: ${conceptIds.join(' -> ')}`, 'CIRCULAR_DEPENDENCY', {
      conceptIds,
    });
  }
}

export class ValidationFailedError extends KnowledgeError {
  constructor(issues: ValidationIssue[]) {
    super(`Validation failed with ${issues.length} issues`, 'VALIDATION_FAILED', { issues });
  }
}
