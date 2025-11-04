/**
 * Concept Utilities
 *
 * Utility functions for working with concepts, relationships, and learning materials.
 */

import { Concept, ProposedRelationship, LearningPath } from '@/types/concept-parsing';

/**
 * Calculate similarity between two concepts
 */
export function calculateConceptSimilarity(concept1: Concept, concept2: Concept): number {
  let similarity = 0;
  let factors = 0;

  // Name similarity (40% weight)
  const nameSimilarity = calculateStringSimilarity(concept1.name, concept2.name);
  similarity += nameSimilarity * 0.4;
  factors++;

  // Type similarity (20% weight)
  const typeSimilarity = concept1.type === concept2.type ? 1.0 : 0.0;
  similarity += typeSimilarity * 0.2;
  factors++;

  // Difficulty similarity (15% weight)
  const difficultySimilarity = 1.0 - Math.abs(concept1.difficulty - concept2.difficulty) / 4.0;
  similarity += difficultySimilarity * 0.15;
  factors++;

  // Description similarity (25% weight)
  if (concept1.description && concept2.description) {
    const descSimilarity = calculateStringSimilarity(concept1.description, concept2.description);
    similarity += descSimilarity * 0.25;
    factors++;
  } else if (concept1.description || concept2.description) {
    similarity += 0.1; // Partial credit for having one description
    factors++;
  }

  return similarity;
}

/**
 * Calculate string similarity using Jaccard similarity
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 1.0 : intersection.size / union.size;
}

/**
 * Sort concepts by relevance or confidence
 */
export function sortConcepts(
  concepts: Concept[],
  sortBy: 'confidence' | 'difficulty' | 'name' | 'recent' = 'confidence'
): Concept[] {
  return [...concepts].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'difficulty':
        return a.difficulty - b.difficulty;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'recent':
        return b.extractedAt.getTime() - a.extractedAt.getTime();
      default:
        return 0;
    }
  });
}

/**
 * Filter concepts by criteria
 */
export function filterConcepts(
  concepts: Concept[],
  criteria: {
    type?: Concept['type'][];
    difficulty?: number[];
    confidence?: [number, number];
    tags?: string[];
    hasDescription?: boolean;
    hasEvidence?: boolean;
  }
): Concept[] {
  return concepts.filter(concept => {
    if (criteria.type && !criteria.type.includes(concept.type)) {
      return false;
    }

    if (criteria.difficulty && !criteria.difficulty.includes(concept.difficulty)) {
      return false;
    }

    if (criteria.confidence) {
      const [min, max] = criteria.confidence;
      if (concept.confidence < min || concept.confidence > max) {
        return false;
      }
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const hasAllTags = criteria.tags.every(tag =>
        concept.metadata.tags.includes(tag)
      );
      if (!hasAllTags) return false;
    }

    if (criteria.hasDescription && (!concept.description || concept.description.length < 10)) {
      return false;
    }

    if (criteria.hasEvidence && concept.evidence.length === 0) {
      return false;
    }

    return true;
  });
}

/**
 * Group concepts by type
 */
export function groupConceptsByType(concepts: Concept[]): Record<Concept['type'], Concept[]> {
  const groups: Record<Concept['type'], Concept[]> = {
    topic: [],
    skill: [],
    fact: [],
    procedure: [],
    principle: []
  };

  concepts.forEach(concept => {
    groups[concept.type].push(concept);
  });

  return groups;
}

/**
 * Group concepts by difficulty
 */
export function groupConceptsByDifficulty(concepts: Concept[]): Record<number, Concept[]> {
  const groups: Record<number, Concept[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
  };

  concepts.forEach(concept => {
    groups[concept.difficulty].push(concept);
  });

  return groups;
}

/**
 * Find concepts related to a target concept
 */
export function findRelatedConcepts(
  targetConcept: Concept,
  allConcepts: Concept[],
  maxResults: number = 10,
  minSimilarity: number = 0.3
): Concept[] {
  const similarities = allConcepts
    .filter(concept => concept.id !== targetConcept.id)
    .map(concept => ({
      concept,
      similarity: calculateConceptSimilarity(targetConcept, concept)
    }))
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  return similarities.map(item => item.concept);
}

/**
 * Extract keywords from concept content
 */
export function extractKeywords(concept: Concept): string[] {
  const allText = [
    concept.name,
    concept.description || '',
    ...concept.evidence.map(e => e.text),
    ...concept.metadata.tags
  ].join(' ').toLowerCase();

  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'this', 'that', 'these', 'those', 'can', 'will', 'would', 'should'
  ]);

  const words = allText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  // Count word frequency
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  // Sort by frequency and return top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate learning path difficulty
 */
export function calculatePathDifficulty(path: LearningPath): number {
  if (path.modules.length === 0) return 1;

  const totalDifficulty = path.modules.reduce((sum, module) => sum + module.difficulty, 0);
  return Math.round(totalDifficulty / path.modules.length);
}

/**
 * Estimate learning time for a concept
 */
export function estimateConceptTime(concept: Concept): number {
  const baseTime = 15; // minutes
  const difficultyMultiplier = concept.difficulty;
  const confidenceMultiplier = concept.confidence < 0.7 ? 1.3 : 1.0;
  const evidenceMultiplier = Math.min(1.5, 1 + (concept.evidence.length * 0.1));

  return Math.round(baseTime * difficultyMultiplier * confidenceMultiplier * evidenceMultiplier);
}

/**
 * Validate concept data integrity
 */
export function validateConcept(concept: Concept): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!concept.name || concept.name.trim().length === 0) {
    errors.push('Concept name is required');
  }

  if (!concept.type || !['topic', 'skill', 'fact', 'procedure', 'principle'].includes(concept.type)) {
    errors.push('Invalid concept type');
  }

  if (concept.difficulty < 1 || concept.difficulty > 5) {
    errors.push('Difficulty must be between 1 and 5');
  }

  if (concept.confidence < 0 || concept.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }

  // Quality checks
  if (concept.name.length > 100) {
    warnings.push('Concept name is very long');
  }

  if (!concept.description || concept.description.length < 10) {
    warnings.push('Concept has no or very short description');
  }

  if (concept.evidence.length === 0) {
    warnings.push('Concept has no supporting evidence');
  }

  if (concept.confidence < 0.5) {
    warnings.push('Concept has low confidence score');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merge two concepts
 */
export function mergeConcepts(concept1: Concept, concept2: Concept): Concept {
  // Choose the concept with higher confidence as the base
  const base = concept1.confidence >= concept2.confidence ? concept1 : concept2;
  const other = concept1.confidence >= concept2.confidence ? concept2 : concept1;

  // Merge evidence
  const allEvidence = [...base.evidence, ...other.evidence];
  const uniqueEvidence = allEvidence.filter((evidence, index, arr) =>
    arr.findIndex(e => e.text === evidence.text) === index
  );

  // Merge relationships
  const allRelationships = [...base.relationships, ...other.relationships];
  const uniqueRelationships = allRelationships.filter((rel, index, arr) =>
    arr.findIndex(r =>
      r.targetConceptName === rel.targetConceptName &&
      r.type === rel.type
    ) === index
  );

  // Merge metadata
  const mergedMetadata = {
    ...base.metadata,
    ...other.metadata,
    tags: [...new Set([...base.metadata.tags, ...other.metadata.tags])],
    extractedBy: [...new Set([...base.metadata.extractedBy, ...other.metadata.extractedBy])],
    validationScore: Math.max(base.metadata.validationScore || 0, other.metadata.validationScore || 0)
  };

  return {
    ...base,
    evidence: uniqueEvidence,
    relationships: uniqueRelationships,
    metadata: mergedMetadata,
    confidence: Math.max(base.confidence, other.confidence),
    extractedAt: new Date()
  };
}

/**
 * Format concept for display
 */
export function formatConceptForDisplay(concept: Concept): {
  title: string;
  subtitle: string;
  description: string;
  metadata: Record<string, string>;
} {
  const typeLabels = {
    topic: '📚 Topic',
    skill: '🛠️ Skill',
    fact: '💡 Fact',
    procedure: '📋 Procedure',
    principle: '🎯 Principle'
  };

  const difficultyLabels = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert'
  };

  return {
    title: concept.name,
    subtitle: `${typeLabels[concept.type]} • ${difficultyLabels[concept.difficulty]}`,
    description: concept.description || 'No description available',
    metadata: {
      Confidence: `${Math.round(concept.confidence * 100)}%`,
      'Evidence Count': concept.evidence.length.toString(),
      'Related Concepts': concept.relationships.length.toString(),
      Tags: concept.metadata.tags.slice(0, 3).join(', ') || 'None'
    }
  };
}

/**
 * Generate concept summary
 */
export function generateConceptSummary(concept: Concept): string {
  const parts = [
    `**${concept.name}**`,
    `*${concept.type.charAt(0).toUpperCase() + concept.type.slice(1)} (Difficulty: ${concept.difficulty}/5)*`,
    ''
  ];

  if (concept.description) {
    parts.push(concept.description);
    parts.push('');
  }

  if (concept.metadata.tags.length > 0) {
    parts.push(`**Tags:** ${concept.metadata.tags.join(', ')}`);
    parts.push('');
  }

  if (concept.evidence.length > 0) {
    parts.push(`**Evidence:** ${concept.evidence.length} sources`);
    parts.push(`**Confidence:** ${Math.round(concept.confidence * 100)}%`);
  }

  return parts.join('\n');
}

/**
 * Search concepts by text query
 */
export function searchConcepts(
  concepts: Concept[],
  query: string,
  options: {
    fuzzy?: boolean;
    includeDescription?: boolean;
    includeTags?: boolean;
    minScore?: number;
  } = {}
): Concept[] {
  const {
    fuzzy = true,
    includeDescription = true,
    includeTags = true,
    minScore = 0.3
  } = options;

  const queryLower = query.toLowerCase();

  return concepts
    .map(concept => {
      let score = 0;
      let maxScore = 0;

      // Name matching (highest weight)
      maxScore += 1;
      if (concept.name.toLowerCase().includes(queryLower)) {
        score += 1;
      } else if (fuzzy) {
        score += calculateStringSimilarity(concept.name.toLowerCase(), queryLower);
      }

      // Description matching
      if (includeDescription && concept.description) {
        maxScore += 0.5;
        if (concept.description.toLowerCase().includes(queryLower)) {
          score += 0.5;
        } else if (fuzzy) {
          score += calculateStringSimilarity(concept.description.toLowerCase(), queryLower) * 0.5;
        }
      }

      // Tag matching
      if (includeTags && concept.metadata.tags.length > 0) {
        maxScore += 0.3;
        const tagMatch = concept.metadata.tags.some(tag =>
          tag.toLowerCase().includes(queryLower)
        );
        if (tagMatch) {
          score += 0.3;
        } else if (fuzzy) {
          const tagSimilarity = Math.max(
            ...concept.metadata.tags.map(tag =>
              calculateStringSimilarity(tag.toLowerCase(), queryLower)
            )
          );
          score += tagSimilarity * 0.3;
        }
      }

      return { concept, score: maxScore > 0 ? score / maxScore : 0 };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map(item => item.concept);
}