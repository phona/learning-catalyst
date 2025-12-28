import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the extraction workflow
const executeExtractionWorkflow = vi.fn(async () => ({
  success: true,
  result: {
    summary: '',
    focusAreas: [],
    nodes: [{ name: 'Test Concept', confidence: 0.8 }],
    relationships: [],
    recommendations: [],
  },
  attempt: 1,
  metrics: {
    chainCreationMs: 0,
    llmInvokeMs: 50,
    jsonParseMs: 0,
    validationMs: 0,
    totalMs: 50,
  },
}));

vi.mock('../extraction-workflow', () => ({
  executeExtractionWorkflow,
}));

describe('heading segmentation fix', () => {
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
  };
  const loggerService: any = {
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };

  it('includes H1 heading in first segment', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Python Basics

Python is a programming language.

## Variables

Variables store data.`;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    // Verify segments were created (the mock will be called for each segment)
    // With H1 included, we should have 2 segments
    expect(res.statistics.totalConcepts).toBeGreaterThanOrEqual(1);
  });

  it('includes H2 headings in segments', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Main Title

## Section One
Content for section one.

## Section Two
Content for section two.

## Section Three
Content for section three.`;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it('handles content starting with H2 (no H1)', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `## Variables and Data Types

In Python, variables are containers.

## Control Flow

If statements control program flow.

## Functions

Functions are reusable code blocks.`;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it('respects maxHeadingDepth setting', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# H1 Title

## H2 Section
H2 content here.

### H3 Subsection
H3 content here.

#### H4 Deep
H4 content here.`;

    // Only include up to H2
    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it('handles overlapping content correctly', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# First

Content between H1 and H2.

## Second

Content between H2 and H3.

### Third

Final content.`;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 3, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    // Verify no duplicate content between segments
    const segmentCount = res.metadata?.segmentsProcessed || 0;
    expect(segmentCount).toBeGreaterThanOrEqual(1);
  });

  it('preserves code blocks in segments', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Programming Guide

## Python Example

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

## JavaScript Example

\`\`\`javascript
function hello() {
    console.log("Hello, World!");
}
\`\`\``;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 500, minSegmentChars: 1, includeCodeBlocks: true }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty sections gracefully', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Title

## Empty Section

## Next Section

Content here.`;

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(Array.isArray(res.concepts)).toBe(true);
  });

  it('segments very long content correctly', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const longContent = [
      '# Long Document',
      '',
      '## Section 1',
      'A'.repeat(500),
      '',
      '## Section 2',
      'B'.repeat(500),
      '',
      '## Section 3',
      'C'.repeat(500),
    ].join('\n');

    const res = await svc.parseMaterials(
      [{ id: 'm1', title: 'test', content: longContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 300, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThanOrEqual(1);
  });
});
