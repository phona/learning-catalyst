import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

/**
 * Test for fix: providerName undefined crash
 *
 * Bug: extractSegment tried to access modelEntry.settings.providerName
 *      but getModel() returns a LangChain model without .settings property
 *
 * Fix: Removed the logging line that accessed modelEntry.settings.providerName
 */

vi.mock('../prompts', () => ({
  createSegmentExtractChain: vi.fn(() => ({
    invoke: async (input: any) => ({
      summary: 'Test summary',
      focusAreas: [],
      nodes: [
        {
          name: 'Test Concept',
          description: 'A test concept',
          type: 'concept',
          difficulty: 'beginner' as const,
          confidence: 0.8,
        },
      ],
      relationships: [],
      recommendations: [],
    }),
  })),
  SEGMENT_EXTRACTION_TEMPLATE: '',
}));

describe('concept parsing - providerName crash fix', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should not crash when provider model does not have settings property', async () => {
    // This simulates the actual LangChain model which doesn't have a .settings property
    const providerFactory: any = {
      getModel: vi.fn(async () => ({} as any)), // LangChain model instance WITHOUT .settings
      // Note: getModel() returns the model directly, not wrapped in an object
      getEmbeddingModel: vi.fn(async () => ({
        embed: vi.fn(async () => Array(1536).fill(0.1)),
      })),
    };

    const loggerService: any = {
      child: () => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    };

    const vectorDatabase: any = {
      addDocumentWithEmbedding: vi.fn(),
    };

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    // This should NOT throw "Cannot read properties of undefined (reading 'providerName')"
    const result = await svc.parseMaterials(
      [
        {
          id: 'test-1',
          title: 'Test Document',
          content: '# Test Concept\n\nThis is a test concept that should be parsed.',
          format: 'markdown',
        },
      ],
      {
        maxSegmentChars: 1000,
        minSegmentChars: 50,
        vectorize: false, // Don't need vector DB for this test
      },
    );

    // Verify the parsing completed without crashing
    expect(result.success).toBe(true);
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.concepts[0].name).toBe('Test Concept');

    // Verify the model was called
    expect(providerFactory.getModel).toHaveBeenCalled();
  });

  it('should work with various provider model return types', async () => {
    // Test different possible model return shapes
    const testCases = [
      {}, // Empty object (like a mock LangChain model)
      { someOtherProperty: 'value' }, // Object with other properties
    ];

    for (const testCase of testCases) {
      const providerFactory: any = {
        getModel: vi.fn(async () => testCase),
        getEmbeddingModel: vi.fn(async () => ({
          embed: vi.fn(async () => Array(1536).fill(0.1)),
        })),
      };

      const loggerService: any = {
        child: () => ({
          info: vi.fn(),
          debug: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        }),
      };

      const svc = createConceptParsingService({
        providerFactory,
        loggerService,
      });

      // Should not crash regardless of model shape
      const result = await svc.parseMaterials(
        [
          {
            id: 'test-3',
            title: 'Test',
            content: '# Test\n\nContent',
            format: 'markdown',
          },
        ],
        { vectorize: false },
      );

      // Each case should either succeed or fail gracefully
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });
});
