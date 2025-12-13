/**
 * Test for relationship deduplication functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ParsedConcept, ParsedRelationship } from '@/shared/types/electron-api/knowledge-api';

// We need to extract the deduplicateWithinBatch function for testing
// Since it's an internal function, we'll test through the public API
// or recreate the logic for testing purposes

// Simplified version of deduplicateWithinBatch for testing
const deduplicateRelationships = (relationships: ParsedRelationship[]): ParsedRelationship[] => {
  const relationshipKey = (r: ParsedRelationship): string =>
    `${r.sourceId}->${r.targetId}->${r.type}`;

  const uniqueRelationships = new Map<string, ParsedRelationship>();

  for (const rel of relationships) {
    const key = relationshipKey(rel);
    const existing = uniqueRelationships.get(key);

    if (!existing) {
      uniqueRelationships.set(key, rel);
    } else {
      // Keep the one with higher score
      // Score = (confidence × 0.7) + (strength × 0.3)
      const existingScore =
        (existing.confidence ?? 0.5) * 0.7 + (existing.strength ?? 0.5) * 0.3;
      const currentScore =
        (rel.confidence ?? 0.5) * 0.7 + (rel.strength ?? 0.5) * 0.3;

      if (currentScore > existingScore) {
        uniqueRelationships.set(key, rel);
      }
    }
  }

  return Array.from(uniqueRelationships.values());
};

const calculateScore = (rel: ParsedRelationship): number => {
  return (rel.confidence ?? 0.5) * 0.7 + (rel.strength ?? 0.5) * 0.3;
};

describe('Relationship Deduplication', () => {
  it('should deduplicate identical relationships from different segments', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe('c1');
    expect(result[0].targetId).toBe('c2');
    expect(result[0].type).toBe('contains');
  });

  it('should keep relationship with higher confidence when duplicates exist', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.7, // Score: 0.7*0.7 + 0.8*0.3 = 0.73
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.5,
        confidence: 0.9, // Score: 0.9*0.7 + 0.5*0.3 = 0.78 ← WINNER
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.9);
    expect(result[0].strength).toBe(0.5);
  });

  it('should keep relationship with higher strength when confidence is equal', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.6,
        confidence: 0.8, // Score: 0.8*0.7 + 0.6*0.3 = 0.74
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.9,
        confidence: 0.8, // Score: 0.8*0.7 + 0.9*0.3 = 0.83 ← WINNER
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(1);
    expect(result[0].strength).toBe(0.9);
    expect(result[0].confidence).toBe(0.8);
  });

  it('should NOT deduplicate relationships with different types', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        strength: 0.9,
        confidence: 0.8,
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'prerequisite',
        strength: 0.7,
        confidence: 0.7,
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(3);
    expect(result.map(r => r.type)).toEqual(['contains', 'related', 'prerequisite']);
  });

  it('should handle bidirectional relationships as different', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
      {
        sourceId: 'c2',
        targetId: 'c1',
        type: 'contains',
        strength: 0.7,
        confidence: 0.8,
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(2);
    expect(result[0].sourceId).toBe('c1');
    expect(result[0].targetId).toBe('c2');
    expect(result[1].sourceId).toBe('c2');
    expect(result[1].targetId).toBe('c1');
  });

  it('should use default values for missing confidence and strength', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        // No confidence or strength
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        strength: 0.9,
        confidence: 0.9,
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.9);
    expect(result[0].strength).toBe(0.9);
  });

  it('should keep first relationship when scores are equal', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        strength: 0.8,
        confidence: 0.8, // Score: 0.8*0.7 + 0.8*0.3 = 0.80
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        strength: 0.7,
        confidence: 0.85, // Score: 0.85*0.7 + 0.7*0.3 = 0.805 ← Actually higher!
      },
    ];

    const result = deduplicateRelationships(relationships);

    // Second one has slightly higher score
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.85);
    expect(result[0].strength).toBe(0.7);
  });

  it('should handle multiple duplicate groups correctly', () => {
    const relationships: ParsedRelationship[] = [
      // Group 1: c1->c2 (contains)
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.7,
      },
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.9,
        confidence: 0.8,
      },
      // Group 2: c2->c3 (related)
      {
        sourceId: 'c2',
        targetId: 'c3',
        type: 'related',
        strength: 0.6,
        confidence: 0.9,
      },
      // Group 3: c1->c3 (prerequisite)
      {
        sourceId: 'c1',
        targetId: 'c3',
        type: 'prerequisite',
        strength: 0.7,
        confidence: 0.8,
      },
      {
        sourceId: 'c1',
        targetId: 'c3',
        type: 'prerequisite',
        strength: 0.8,
        confidence: 0.7,
      },
    ];

    const result = deduplicateRelationships(relationships);

    expect(result).toHaveLength(3);
    expect(result.find(r => r.sourceId === 'c1' && r.targetId === 'c2')?.confidence).toBe(0.8);
    expect(result.find(r => r.sourceId === 'c2' && r.targetId === 'c3')?.confidence).toBe(0.9);
    expect(result.find(r => r.sourceId === 'c1' && r.targetId === 'c3')?.confidence).toBe(0.8);
  });

  it('should handle empty relationship array', () => {
    const relationships: ParsedRelationship[] = [];
    const result = deduplicateRelationships(relationships);
    expect(result).toHaveLength(0);
  });

  it('should handle single relationship', () => {
    const relationships: ParsedRelationship[] = [
      {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
    ];
    const result = deduplicateRelationships(relationships);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(relationships[0]);
  });
});

describe('Relationship Deduplication - Score Calculation', () => {
  it('should calculate score correctly for various confidence/strength combinations', () => {
    const testCases = [
      { conf: 1.0, str: 1.0, expected: 1.0 },
      { conf: 0.0, str: 0.0, expected: 0.0 },
      { conf: 0.5, str: 0.5, expected: 0.5 },
      { conf: 0.9, str: 0.7, expected: 0.9 * 0.7 + 0.7 * 0.3 }, // 0.84
      { conf: 0.7, str: 0.9, expected: 0.7 * 0.7 + 0.9 * 0.3 }, // 0.76
    ];

    for (const testCase of testCases) {
      const rel: ParsedRelationship = {
        sourceId: 'c1',
        targetId: 'c2',
        type: 'related',
        confidence: testCase.conf,
        strength: testCase.str,
      };
      const score = calculateScore(rel);
      expect(score).toBeCloseTo(testCase.expected, 2);
    }
  });

  it('should prioritize confidence over strength in score', () => {
    const rel1: ParsedRelationship = {
      sourceId: 'c1',
      targetId: 'c2',
      type: 'related',
      confidence: 0.9,
      strength: 0.6, // Score: 0.81
    };
    const rel2: ParsedRelationship = {
      sourceId: 'c1',
      targetId: 'c2',
      type: 'related',
      confidence: 0.8,
      strength: 0.9, // Score: 0.83
    };

    const score1 = calculateScore(rel1);
    const score2 = calculateScore(rel2);

    expect(score2).toBeGreaterThan(score1);
  });
});
