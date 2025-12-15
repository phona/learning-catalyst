import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConceptParsingService } from '../concept-parsing-service';

describe('concept parsing integration with pure separation', () => {
  const providerFactory: any = {
    getModel: vi.fn(async () => ({
      config: {
        modelName: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 4096,
      },
      invoke: vi.fn(async () => ({
        content: '[{"name": "Python Variables", "description": "Variables store data", "type": "concept", "difficulty": "beginner", "confidence": 0.9}]',
      })),
    })),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse Python basics and store with pure separation', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const pythonContent = `# Python Basics

Python is a versatile programming language.

## Variables and Data Types

Variables store different types of data including integers, floats, and strings.

## Control Flow

Control flow statements like if/else and loops control program execution.

## Functions

Functions are reusable blocks of code that perform specific tasks.`;

    const res = await svc.parseMaterials(
      [{ id: 'python-basics', title: 'Python Basics', content: pythonContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 300, minSegmentChars: 1 }
    );

    if (!res.success) {
      console.log('Parsing errors:', res.errors);
    }
    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify vector database was called with pure separation architecture
    expect(vectorDatabase.addDocumentBatch).toHaveBeenCalled();

    const calls = vectorDatabase.addDocumentBatch.mock.calls;
    if (calls.length > 0) {
      const documents = calls[0][0];

      // Verify each document has minimal metadata (only conceptId)
      for (const doc of documents) {
        expect(doc.doc.metadata).toHaveProperty('conceptId');
        expect(doc.doc.metadata.conceptId).toBeDefined();

        // Should NOT have type, level, path, confidence in Qdrant
        expect(doc.doc.metadata.type).toBeUndefined();
        expect(doc.doc.metadata.level).toBeUndefined();
        expect(doc.doc.metadata.path).toBeUndefined();
        expect(doc.doc.metadata.confidence).toBeUndefined();

        // Should have content
        expect(doc.doc.content).toBeDefined();
        expect(doc.doc.content.length).toBeGreaterThan(0);

        // Should have embedding
        expect(doc.embedding).toBeDefined();
        expect(doc.embedding.length).toBe(1536);
      }

      // Verify segments were created for each heading
      // H1 + 3 H2 sections = 4 segments minimum
      expect(documents.length).toBeGreaterThanOrEqual(3);

      // Verify no content duplication
      const allContents = documents.map(d => d.doc.content).join('\n');

      // Check headings appear only once
      const h1Count = (allContents.match(/^#\s+Python Basics/gm) || []).length;
      expect(h1Count).toBe(1);

      const variablesCount = (allContents.match(/^##\s+Variables and Data Types/gm) || []).length;
      expect(variablesCount).toBe(1);

      const controlFlowCount = (allContents.match(/^##\s+Control Flow/gm) || []).length;
      expect(controlFlowCount).toBe(1);

      const functionsCount = (allContents.match(/^##\s+Functions/gm) || []).length;
      expect(functionsCount).toBe(1);
    }
  });

  it('should handle JavaScript tutorial with pure separation', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const jsContent = `# JavaScript Fundamentals

## Variables

Use let, const, and var to declare variables.

## Functions

Functions can be declared or expressed.

## Arrays

Arrays store ordered collections of values.

## Objects

Objects store key-value pairs.`;

    const res = await svc.parseMaterials(
      [{ id: 'js-fundamentals', title: 'JS Fundamentals', content: jsContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Each section should be a separate document with only conceptId
      expect(documents.length).toBeGreaterThanOrEqual(4);

      for (const doc of documents) {
        expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
      }
    }
  });

  it('should handle deep heading hierarchy with pure separation', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# H1

H1 content.

## H2

H2 content.

### H3

H3 content.

#### H4

H4 content.

## Another H2

Another H2 content.`;

    const res = await svc.parseMaterials(
      [{ id: 'deep-hierarchy', title: 'Deep Hierarchy', content, format: 'markdown' }],
      { maxHeadingDepth: 3, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Verify pure separation: only conceptId in metadata
      for (const doc of documents) {
        expect(doc.doc.metadata).toEqual(
          expect.objectContaining({ conceptId: expect.any(String) })
        );
        expect(Object.keys(doc.doc.metadata).length).toBe(1);
      }
    }
  });

  it('should handle empty sections gracefully', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Title

## Section A

Content A.

## Empty Section

## Section B

Content B.`;

    const res = await svc.parseMaterials(
      [{ id: 'empty-sections', title: 'Empty Sections', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    // Even empty sections should be processed with pure separation
    expect(vectorDatabase.addDocumentBatch).toHaveBeenCalled();
  });

  it('should handle very long content with pure separation', async () => {
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
      [{ id: 'long-content', title: 'Long Content', content: longContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 300, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Verify pure separation architecture
      for (const doc of documents) {
        expect(doc.doc.metadata.conceptId).toBeDefined();
        expect(doc.doc.metadata.type).toBeUndefined();
        expect(doc.doc.metadata.level).toBeUndefined();
      }

      // Verify long content was split appropriately
      expect(documents.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should handle content with code blocks', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Programming Examples

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
      [{ id: 'code-examples', title: 'Code Examples', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 500, minSegmentChars: 1, includeCodeBlocks: true }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Verify pure separation with code blocks included
      for (const doc of documents) {
        expect(doc.doc.metadata.conceptId).toBeDefined();
        expect(Object.keys(doc.doc.metadata).length).toBe(1);
      }

      // At least one segment should contain code
      const hasCode = documents.some(doc =>
        doc.doc.content.includes('def hello') || doc.doc.content.includes('function hello')
      );
      expect(hasCode).toBe(true);
    }
  });

  it('should respect maxHeadingDepth setting', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# H1

Content 1.

## H2

Content 2.

### H3

Content 3.

#### H4

Content 4.

##### H5

Content 5.`;

    const res = await svc.parseMaterials(
      [{ id: 'depth-test', title: 'Depth Test', content, format: 'markdown' }],
      { maxHeadingDepth: 3, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Should include H1, H2, H3 but not H4, H5
      const allContent = documents.map(d => d.doc.content).join('\n');

      expect(allContent).toContain('# H1');
      expect(allContent).toContain('## H2');
      expect(allContent).toContain('### H3');
      expect(allContent).not.toContain('#### H4');
      expect(allContent).not.toContain('##### H5');

      // All with pure separation
      for (const doc of documents) {
        expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
      }
    }
  });

  it('should handle content starting without H1', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `## Variables and Data Types

In Python, variables are containers.

## Control Flow

If statements control program flow.

## Functions

Functions are reusable code blocks.`;

    const res = await svc.parseMaterials(
      [{ id: 'no-h1', title: 'No H1', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Should create segments starting with H2
      expect(documents.length).toBeGreaterThanOrEqual(3);

      // All with pure separation
      for (const doc of documents) {
        expect(doc.doc.metadata).toEqual(
          expect.objectContaining({ conceptId: expect.any(String) })
        );
      }
    }
  });

  it('should create unique concept IDs for each segment', async () => {
    const svc = createConceptParsingService({ providerFactory, vectorDatabase, loggerService });

    const content = `# Title

## Section 1

Content 1.

## Section 2

Content 2.`;

    const res = await svc.parseMaterials(
      [{ id: 'unique-ids', title: 'Unique IDs', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);

    if (vectorDatabase.addDocumentBatch.mock.calls.length > 0) {
      const documents = vectorDatabase.addDocumentBatch.mock.calls[0][0];

      // Extract all concept IDs
      const conceptIds = documents.map(doc => doc.doc.metadata.conceptId);

      // Verify all IDs are unique
      const uniqueIds = new Set(conceptIds);
      expect(uniqueIds.size).toBe(conceptIds.length);

      // Verify all IDs are defined
      for (const id of conceptIds) {
        expect(id).toBeDefined();
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });
});
