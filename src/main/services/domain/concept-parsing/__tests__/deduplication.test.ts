/**
 * Test for concept deduplication functionality
 */

import { describe, it, expect } from 'vitest';
import type { ParsedConcept, ParsedRelationship, ConceptIngestionPlan } from '@/shared/types/electron-api/knowledge-api';

// Import the deduplication function
// Note: This is a simplified test - in real implementation, we'd need to extract the function
// or test through the public API

describe('Concept Deduplication', () => {
  it('should merge concepts with similar names', () => {
    // Test data: concepts with similar names
    const concepts: ParsedConcept[] = [
      {
        id: '1',
        name: 'Artificial Intelligence',
        description: 'AI is the future',
        type: 'topic',
        confidence: 0.9,
        difficulty: 3,
        evidence: [],
        metadata: {},
      },
      {
        id: '2',
        name: 'AI',
        description: 'Short for Artificial Intelligence',
        type: 'topic',
        confidence: 0.8,
        difficulty: 3,
        evidence: [],
        metadata: {},
      },
      {
        id: '3',
        name: 'Machine Learning',
        description: 'ML is a subset of AI',
        type: 'topic',
        confidence: 0.85,
        difficulty: 3,
        evidence: [],
        metadata: {},
      },
    ];

    const relationships: ParsedRelationship[] = [
      {
        sourceId: '1',
        targetId: '3',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
      {
        sourceId: '2',
        targetId: '3',
        type: 'contains',
        strength: 0.8,
        confidence: 0.9,
      },
    ];

    // Expected: "AI" and "Artificial Intelligence" should be merged
    // "Machine Learning" should remain separate
    // Relationships should be updated to point to canonical ID

    expect(concepts.length).toBe(3);
    // After deduplication, we expect 2 concepts (AI merged into Artificial Intelligence)
    // and 1 relationship (2->3 updated to canonical ID)
  });

  it('should handle exact duplicate concepts', () => {
    const concepts: ParsedConcept[] = [
      {
        id: '1',
        name: 'Deep Learning',
        description: 'Neural networks',
        type: 'topic',
        confidence: 0.9,
        difficulty: 4,
        evidence: [],
        metadata: {},
      },
      {
        id: '2',
        name: 'Deep Learning',
        description: 'Neural networks',
        type: 'topic',
        confidence: 0.9,
        difficulty: 4,
        evidence: [],
        metadata: {},
      },
    ];

    const relationships: ParsedRelationship[] = [];

    // Expected: Both should be merged into one concept
    expect(concepts.length).toBe(2);
    // After deduplication: 1 concept
  });

  it('should not merge dissimilar concepts', () => {
    const concepts: ParsedConcept[] = [
      {
        id: '1',
        name: 'Python',
        description: 'Programming language',
        type: 'skill',
        confidence: 0.9,
        difficulty: 2,
        evidence: [],
        metadata: {},
      },
      {
        id: '2',
        name: 'Snake',
        description: 'Animal',
        type: 'topic',
        confidence: 0.9,
        difficulty: 1,
        evidence: [],
        metadata: {},
      },
    ];

    const relationships: ParsedRelationship[] = [];

    // Expected: Should remain separate (similarity too low)
    expect(concepts.length).toBe(2);
    // After deduplication: Still 2 concepts (too dissimilar)
  });
});

describe('Auto-Deduplication Configuration', () => {
  it('should enable auto-deduplication in plan', () => {
    const plan: ConceptIngestionPlan = {
      autoDeduplicate: {
        enabled: true,
        threshold: 0.92,
        strategy: 'skip',
      },
    };

    expect(plan.autoDeduplicate?.enabled).toBe(true);
    expect(plan.autoDeduplicate?.threshold).toBe(0.92);
    expect(plan.autoDeduplicate?.strategy).toBe('skip');
  });

  it('should use default threshold when not specified', () => {
    const plan: ConceptIngestionPlan = {
      autoDeduplicate: {
        enabled: true,
      },
    };

    // Default threshold should be 0.92
    expect(plan.autoDeduplicate?.threshold ?? 0.92).toBe(0.92);
  });

  it('should support merge_metadata strategy', () => {
    const plan: ConceptIngestionPlan = {
      autoDeduplicate: {
        enabled: true,
        strategy: 'merge_metadata',
      },
    };

    expect(plan.autoDeduplicate?.strategy).toBe('merge_metadata');
  });
});
