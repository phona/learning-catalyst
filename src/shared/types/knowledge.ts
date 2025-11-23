/**
 * Knowledge management types
 */

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

export interface ConceptRelationship {
  sourceConceptId: string;
  targetConceptId: string;
  type: 'prerequisite' | 'related' | 'contains' | 'example' | 'application' | 'contrasts';
  strength: number; // 0-1
  bidirectional: boolean;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBySession?: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  difficulty: number; // 0-1
  concepts: LearningPathConcept[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  popularity?: number;
}

export interface LearningPathConcept {
  id: string;
  name: string;
  description?: string;
  order: number;
  isOptional: boolean;
}

export interface KnowledgeGraphStats {
  totalConcepts: number;
  totalRelationships: number;
  conceptsByType: Record<string, number>;
  averageMasteryLevel: number;
  conceptsNeedingReview: number;
  recentlyStudied: number;
}

export interface GraphSearchOptions {
  query?: string;
  conceptTypes?: string[];
  difficultyRange?: [number, number];
  masteryRange?: [number, number];
  tags?: string[];
  includeRelationships?: boolean;
  limit?: number;
  offset?: number;
}

export interface ConceptPath {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  totalStrength: number;
  difficulty: number;
}

export interface ConceptNode {
  concept: Concept;
  relationships: ConceptRelationship[];
  relatedConcepts: Concept[];
  children: ConceptNode[];
  parents: ConceptNode[];
}
