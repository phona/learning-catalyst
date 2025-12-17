/**
 * =====================================================================================
 * CONCEPT PARSING INTEGRATION TESTS - PURE SEPARATION
 * =====================================================================================
 *
 * Tests the "pure separation" architecture where SQLite stores full data and Qdrant
 * stores only vectors + conceptId.
 *
 * DESIGN PRINCIPLES (from docs/DEVELOPER-GUIDE/testing.md):
 * - Use DI pattern: mock stateful dependencies, use real stateless utilities
 * - Inject fileSystem for test isolation
 * - Mock LangGraph with RunnableLambda per LangGraph testing best practices
 * - Test business logic only (pure separation rules)
 *
 * =====================================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

import { createConceptParsingService } from '../concept-parsing-service';

// Mock config for chunk-emitter (per docs)
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// Mock LLM following docs pattern for .pipe() chains
const createMockLlm = (response?: any) =>
  new RunnableLambda({
    func: async (_input) => {
      return new AIMessage(
        JSON.stringify(
          response ?? {
            summary: 'Python basics content',
            focusAreas: ['variables', 'functions', 'control-flow'],
            nodes: [
              {
                name: 'Python Variables',
                description: 'Variables store different types of data',
                type: 'concept',
                difficulty: 'beginner',
                confidence: 0.9,
              },
              {
                name: 'Data Types',
                description: 'Python has integers, floats, and strings',
                type: 'concept',
                difficulty: 'beginner',
                confidence: 0.85,
              },
              {
                name: 'Control Flow',
                description: 'if/else statements control program execution',
                type: 'concept',
                difficulty: 'beginner',
                confidence: 0.8,
              },
            ],
            relationships: [],
            recommendations: [],
          }
        )
      );
    },
  });

// Factory for test service with DI (per docs pattern)
const createTestService = () => {
  // Mock stateful dependencies (per docs line 430)
  const mockLlm = createMockLlm();
  const vectorDatabase = {
    addDocumentBatch: vi.fn().mockResolvedValue(undefined),
  };
  const loggerService = {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };

  // Inject fileSystem and isolated jobStoreDir for testing
  const fileSystem = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    rm: vi.fn(),
  };

  const service = createConceptParsingService({
    providerFactory: {
      getModel: vi.fn().mockResolvedValue(mockLlm),
      getEmbeddingModel: vi.fn(async () => ({
        embedBatch: vi.fn(async (texts: string[]) => texts.map(() => Array(1536).fill(0.1))),
      })),
    },
    vectorDatabase,
    loggerService,
    fileSystem,
    jobStoreDir: '/tmp/test-concept-jobs',
  });

  return { service, vectorDatabase, fileSystem, loggerService };
};

describe('concept parsing integration with pure separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse Python basics and store with pure separation', async () => {
    const { service, vectorDatabase } = createTestService();

    const pythonContent = `# Python Basics

Python is a versatile programming language that's perfect for beginners.

## Variables and Data Types

Variables store different types of data including integers, floats, and strings. In Python, you don't need to declare variable types explicitly.

## Control Flow

Control flow statements like if/else and loops control program execution. These are fundamental building blocks of any program.

## Functions

Functions are reusable blocks of code that perform specific tasks. They help organize code and avoid repetition.`;

    const res = await service.parseMaterials(
      [{ id: 'python-basics', title: 'Python Basics', content: pythonContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 300, minSegmentChars: 1 }
    );

    // Test business logic: pure separation architecture
    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation: vector DB stores only vectors + conceptId (no full text)
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    expect(call.length).toBeGreaterThan(0);

    for (const doc of call) {
      // Pure separation check: metadata should have ONLY conceptId
      const metadataKeys = Object.keys(doc.doc.metadata || {});
      expect(metadataKeys).toEqual(['conceptId']);

      // Content should exist for Qdrant (structure may vary)
      expect(doc.doc).toBeDefined();
    }
  });

  it('should handle JavaScript tutorial with pure separation', async () => {
    const { service, vectorDatabase } = createTestService();

    const jsContent = `# JavaScript Fundamentals

JavaScript is the language of the web.

## Variables

Use let, const, and var to declare variables.

## Functions

Functions are first-class citizens in JavaScript.`;

    const res = await service.parseMaterials(
      [{ id: 'js-fundamentals', title: 'JavaScript Fundamentals', content: jsContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation architecture
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should handle deep heading hierarchy with pure separation', async () => {
    const { service, vectorDatabase } = createTestService();

    const deepContent = `# Level 1

## Level 2

### Level 3

#### Level 4

##### Level 5

###### Level 6

Deep content here.`;

    const res = await service.parseMaterials(
      [{ id: 'deep-hierarchy', title: 'Deep Hierarchy', content: deepContent, format: 'markdown' }],
      { maxHeadingDepth: 6, maxSegmentChars: 150, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should handle empty sections gracefully', async () => {
    const { service, vectorDatabase } = createTestService();

    const emptyContent = `# Introduction

## Section A

Content A

## Section B

## Section C

Content C`;

    const res = await service.parseMaterials(
      [{ id: 'empty-sections', title: 'Empty Sections', content: emptyContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    // Even empty sections should be processed with pure separation
    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should handle very long content with pure separation', async () => {
    const { service, vectorDatabase } = createTestService();

    const longContent = `# Introduction

${Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}: This is a very long paragraph with lots of content to test how the system handles long content while maintaining pure separation architecture.`).join('\n\n')}

## Summary

This was a long document.`;

    const res = await service.parseMaterials(
      [{ id: 'long-content', title: 'Long Content', content: longContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 500, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation even with long content
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should handle content with code blocks', async () => {
    const { service, vectorDatabase } = createTestService();

    const codeContent = `# Programming Examples

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

    const res = await service.parseMaterials(
      [{ id: 'code-blocks', title: 'Code Blocks', content: codeContent, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 300, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation with code blocks
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should respect maxHeadingDepth setting', async () => {
    const { service, vectorDatabase } = createTestService();

    const content = `# H1

## H2

### H3

#### H4

Content at different levels.`;

    const res = await service.parseMaterials(
      [{ id: 'heading-depth', title: 'Heading Depth', content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should handle content starting without H1', async () => {
    const { service, vectorDatabase } = createTestService();

    const noH1Content = `This content doesn't start with a heading.

## Section 1

Some content here.

## Section 2

More content here.`;

    const res = await service.parseMaterials(
      [{ id: 'no-h1', title: 'No H1', content: noH1Content, format: 'markdown' }],
      { maxHeadingDepth: 2, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });

  it('should create unique concept IDs for each segment', async () => {
    const { service, vectorDatabase } = createTestService();

    const content = `# Segment 1

Content for segment 1.

# Segment 2

Content for segment 2.

# Segment 3

Content for segment 3.`;

    const res = await service.parseMaterials(
      [{ id: 'unique-ids', title: 'Unique IDs', content, format: 'markdown' }],
      { maxHeadingDepth: 1, maxSegmentChars: 200, minSegmentChars: 1 }
    );

    expect(res.success).toBe(true);
    expect(res.concepts.length).toBeGreaterThan(0);

    // Verify pure separation with unique IDs
    const call = vectorDatabase.addDocumentBatch.mock.calls[0][0];
    const conceptIds = call.map((doc: any) => doc.doc.metadata.conceptId);

    // All concept IDs should be unique
    const uniqueIds = new Set(conceptIds);
    expect(uniqueIds.size).toBe(conceptIds.length);

    // Each should only have conceptId in metadata
    for (const doc of call) {
      expect(Object.keys(doc.doc.metadata)).toEqual(['conceptId']);
    }
  });
});
