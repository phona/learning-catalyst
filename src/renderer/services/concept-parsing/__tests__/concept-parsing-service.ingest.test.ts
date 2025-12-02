import { describe, it, expect, vi } from 'vitest';
import { createConceptParsingService } from '@/renderer/services/concept-parsing/concept-parsing-service';
import type {
  ConceptIngestionPlan,
  ConceptParsingResult,
  KnowledgeIngestionResult,
} from '@/shared/types/electron-api/knowledge-api';
import { createMockElectronAPI } from '@/test/utils/electron-api-fixture';

const parsedResult: ConceptParsingResult = {
  success: true,
  concepts: [
    {
      id: 'c1',
      name: 'Kinetic Energy',
      description: 'Energy of motion',
      type: 'fact',
      confidence: 0.42,
      difficulty: 2,
      evidence: [],
      metadata: {},
    },
    {
      id: 'c2',
      name: 'Potential Energy',
      description: 'Stored energy',
      type: 'fact',
      confidence: 0.91,
      difficulty: 3,
      evidence: [],
      metadata: {},
    },
  ],
  relationships: [
    {
      sourceId: 'c1',
      targetId: 'c2',
      type: 'related',
      strength: 0.6,
      confidence: 0.7,
      description: 'converted between forms',
    },
  ],
  statistics: {
    totalConcepts: 2,
    validConcepts: 2,
    totalRelationships: 1,
    confidenceDistribution: { high: 1, medium: 1 },
    difficultyDistribution: { 2: 1, 3: 1 },
    typeDistribution: { fact: 2 },
    processingTime: 1200,
    modelUsage: { mock: 2 },
  },
  errors: [],
  metadata: {
    processingTime: 1200,
    processedAt: new Date().toISOString(),
    inputFiles: 1,
    aiProvider: 'mock',
    aiModel: 'mock-model',
  },
};

describe('concept-parsing-service ingestParsedResult', () => {
  it('forwards parsed result, plan, and options to Electron knowledge.ingestConcepts', async () => {
    const ingestionSummary: KnowledgeIngestionResult = {
      conceptsInserted: 1,
      conceptsUpdated: 1,
      conceptsSkipped: 0,
      conceptsMerged: 0,
      relationshipsInserted: 1,
      relationshipsSkipped: 0,
      lowConfidenceSkipped: 1,
      metadata: { processedAt: new Date().toISOString(), source: 'spec' },
    };

    const plan: ConceptIngestionPlan = {
      defaultExistingAction: 'skip',
      lowConfidence: { defaultThreshold: 0.5, overrides: { c1: 0.45 } },
      actions: { c1: 'overwrite', c2: 'insert' },
      fieldToggles: {
        c1: { description: false, name: true },
        c2: { description: true, type: true },
      },
      canonicalization: { c1: { canonicalName: 'kinetic energy', applyAlias: true } },
      mergeTargets: {},
    };

    const ingestSpy = vi.fn().mockResolvedValue({ success: true, data: ingestionSummary });

    const api = createMockElectronAPI({
      knowledge: {
        ingestConcepts: ingestSpy,
      } as any,
    });

    const service = createConceptParsingService(api as any);

    const result = await service.ingestParsedResult(parsedResult, plan, {
      userId: 'u-123',
      materialId: 'm-xyz',
      sessionId: 's-abc',
      source: 'unit-test',
    });

    expect(ingestSpy).toHaveBeenCalledTimes(1);
    expect(ingestSpy).toHaveBeenCalledWith({
      result: parsedResult,
      plan,
      options: {
        userId: 'u-123',
        materialId: 'm-xyz',
        sessionId: 's-abc',
        source: 'unit-test',
      },
    });
    expect(result).toEqual(ingestionSummary);
  });
});
