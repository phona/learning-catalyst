import { describe, it, expect, vi, beforeEach } from 'vitest';

const executeExtractionWorkflow = vi.fn();

vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow,
}));

describe('H1 as Root Topic Concept', () => {
  let createConceptParsingService: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ createConceptParsingService } = await import('../concept-parsing-service'));
  });

  const providerFactory: any = {
    getModel: vi.fn(async () => ({})),
    getEmbeddingModel: vi.fn(async () => ({
      embed: vi.fn(async () => Array(1536).fill(0.1)),
      embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
    })),
  };
  const vectorDatabase: any = {
    addDocumentBatch: vi.fn().mockResolvedValue(undefined),
    search: vi.fn(),
    deleteDocument: vi.fn(),
    getStats: vi.fn(),
    start: vi.fn(),
  };
  const loggerService: any = {
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };

  it('should treat H1 as ROOT TOPIC concept and create contains relationships', async () => {
    // Mock the extraction workflow to return H1 as first concept (root topic)
    executeExtractionWorkflow.mockResolvedValue({
      success: true,
      result: {
        summary: 'Python programming fundamentals',
        focusAreas: ['variables', 'functions'],
        nodes: [
          {
            name: 'Python Basics',
            description: 'Introduction to Python programming',
            type: 'topic',
            difficulty: 'beginner',
            confidence: 0.98,
            tags: ['python', 'programming'],
          },
          {
            name: 'Variables',
            description: 'How Python stores data in variables',
            type: 'fact',
            difficulty: 'beginner',
            confidence: 0.95,
            tags: ['python', 'variables'],
          },
          {
            name: 'Functions',
            description: 'Defining reusable code blocks',
            type: 'procedure',
            difficulty: 'intermediate',
            confidence: 0.92,
            tags: ['python', 'functions'],
          },
        ],
        relationships: [
          {
            from: 'Python Basics',
            to: 'Variables',
            type: 'part_of',
            strength: 0.9,
            confidence: 0.95,
            description: 'Variables are part of Python Basics',
          },
          {
            from: 'Python Basics',
            to: 'Functions',
            type: 'part_of',
            strength: 0.9,
            confidence: 0.92,
            description: 'Functions are part of Python Basics',
          },
        ],
        recommendations: ['Practice with variables', 'Write simple functions'],
      },
      attempt: 1,
      metrics: {
        chainCreationMs: 0,
        llmInvokeMs: 100,
        jsonParseMs: 0,
        validationMs: 0,
        totalMs: 100,
      },
    });

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const content = `# Python Basics

Python is a high-level programming language.

## Variables
Variables store data values.

## Functions
Functions are reusable code blocks.`;

    const result = await svc.parseMaterials(
      [
        {
          id: 'python-basics',
          title: 'Python Basics',
          content,
          format: 'markdown',
        },
      ],
      { vectorize: true, minSegmentChars: 1, maxSegmentChars: 0 },
    );

    // Verify H1 was treated as ROOT TOPIC
    expect(result.success).toBe(true);
    expect(result.concepts.length).toBeGreaterThan(0);

    // Find the ROOT TOPIC concept (should be first or have type: 'topic')
    const rootTopic = result.concepts.find((c) => c.type === 'topic');
    expect(rootTopic).toBeDefined();
    expect(rootTopic?.name).toBe('Python Basics');
    expect(rootTopic?.description).toBe('Introduction to Python programming');

    // Verify sub-concepts exist
    const variablesConcept = result.concepts.find((c) => c.name === 'Variables');
    const functionsConcept = result.concepts.find((c) => c.name === 'Functions');

    expect(variablesConcept).toBeDefined();
    expect(functionsConcept).toBeDefined();

    // Verify relationships exist (ROOT TOPIC → subtopics)
    expect(result.relationships.length).toBeGreaterThan(0);

    // Find the ROOT TOPIC concept to get its ID
    const rootTopicId = rootTopic?.id;

    const containsRelationships = result.relationships.filter(
      (r) => r.type === 'part_of' && r.sourceId === rootTopicId,
    );

    expect(containsRelationships.length).toBeGreaterThanOrEqual(2);
    expect(containsRelationships.some((r) => {
      const targetConcept = result.concepts.find(c => c.id === r.targetId);
      return targetConcept?.name === 'Variables';
    })).toBe(true);
    expect(containsRelationships.some((r) => {
      const targetConcept = result.concepts.find(c => c.id === r.targetId);
      return targetConcept?.name === 'Functions';
    })).toBe(true);

    // Verify vector database was called with all concepts
    expect(vectorDatabase.addDocumentBatch).toHaveBeenCalled();
  });

  it('should prioritize ROOT TOPIC in results', async () => {
    executeExtractionWorkflow.mockResolvedValue({
      success: true,
      result: {
        summary: 'Test summary',
        focusAreas: [],
        nodes: [
          {
            name: 'Test Topic',
            description: 'A test topic',
            type: 'topic',
            confidence: 0.95,
          },
          {
            name: 'Test Fact',
            description: 'A test fact',
            type: 'fact',
            confidence: 0.90,
          },
        ],
        relationships: [
          {
            from: 'Test Topic',
            to: 'Test Fact',
            type: 'part_of',
            strength: 0.8,
            confidence: 0.9,
          },
        ],
        recommendations: [],
      },
      attempt: 1,
      metrics: {
        chainCreationMs: 0,
        llmInvokeMs: 100,
        jsonParseMs: 0,
        validationMs: 0,
        totalMs: 100,
      },
    });

    const svc = createConceptParsingService({
      providerFactory,
      vectorDatabase,
      loggerService,
    });

    const result = await svc.parseMaterials(
      [
        {
          id: 'test',
          title: 'Test',
          content: '# Test Topic\n\nSome content',
          format: 'markdown',
        },
      ],
      { vectorize: true, minSegmentChars: 1, maxSegmentChars: 0 },
    );

    // ROOT TOPIC should be first in concepts array
    expect(result.concepts[0].type).toBe('topic');
    expect(result.concepts[0].name).toBe('Test Topic');
  });
});
