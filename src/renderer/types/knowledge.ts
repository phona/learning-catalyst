/**
 * Knowledge representation optimized for UI display
 * Transforms complex knowledge graph data into frontend-friendly format
 */

export interface KnowledgeNodeDisplay {
  id: string;
  title: string;
  description: string;
  level: number;              // For visual hierarchy
  mastery: number;            // 0-100 for progress indication
  connections: number;        // Number of related concepts
  color: string;              // For visualization
  position?: { x: number; y: number }; // Pre-calculated layout
  category?: string;
  tags?: string[];
  isPrerequisite?: boolean;
  isLearned?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface KnowledgeEdgeDisplay {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'prerequisite' | 'related' | 'application' | 'similarity';
  strength: number;           // 0-1 for edge thickness/opacity
  label?: string;
}

export interface KnowledgeGraphDisplay {
  nodes: KnowledgeNodeDisplay[];
  edges: KnowledgeEdgeDisplay[];
  layout: GraphLayout;
  centerNode?: string;
  selectedNodes?: string[];
  highlightedPath?: string[];
}

export interface GraphLayout {
  type: 'force' | 'hierarchical' | 'circular' | 'grid';
  bounds: {
    width: number;
    height: number;
  };
  zoom: number;
  pan: { x: number; y: number };
}

export interface KnowledgeSearchResult {
  node: KnowledgeNodeDisplay;
  relevanceScore: number;
  matchType: 'title' | 'description' | 'tag' | 'content';
  excerpt?: string;
}

export interface KnowledgePathDisplay {
  id: string;
  title: string;
  description: string;
  nodes: KnowledgeNodeDisplay[];
  totalDuration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number;           // 0-100
  estimatedTime: string;
  prerequisites: string[];
  outcomes: string[];
}

export interface ConceptMasteryDisplay {
  conceptId: string;
  conceptTitle: string;
  masteryLevel: number;       // 0-100
  confidence: number;         // 0-100
  lastAccessed: string;
  accessCount: number;
  averageScore: number;
  improvement: number;        // Percentage change
}

export interface KnowledgeFilters {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mastery?: {
    min: number;
    max: number;
  };
  tags?: string[];
  searchQuery?: string;
}

export interface KnowledgeInteractionDisplay {
  id: string;
  type: 'view' | 'learn' | 'practice' | 'assess' | 'connect';
  conceptId: string;
  timestamp: string;
  duration: number;
  outcome?: 'success' | 'partial' | 'failed';
  score?: number;
  notes?: string;
}

export const KNOWLEDGE_NODE_COLORS = {
  learning: '#3B82F6',
  mastered: '#10B981',
  struggling: '#F59E0B',
  prerequisite: '#6B7280',
  current: '#8B5CF6'
};

export const KNOWLEDGE_EDGE_TYPES = {
  prerequisite: { color: '#EF4444', style: 'solid' },
  related: { color: '#6B7280', style: 'dashed' },
  application: { color: '#10B981', style: 'solid' },
  similarity: { color: '#3B82F6', style: 'dotted' }
};