# Concept Parsing System

A comprehensive AI-powered concept extraction and processing system for educational content. This module automatically extracts key learning concepts, relationships, and learning paths from markdown content using multiple AI models and rule-based patterns.

## Features

- 🤖 **AI-Powered Extraction**: Uses multiple AI models (OpenAI, ChatGLM, DeepSeek, etc.) for intelligent concept detection
- 📋 **Rule-Based Patterns**: Deterministic extraction using customizable patterns and rules
- 🔗 **Relationship Detection**: Identifies prerequisite, related, and hierarchical relationships between concepts
- ✅ **Quality Validation**: Comprehensive validation and deduplication to ensure concept quality
- 📊 **Learning Path Generation**: Automatically creates structured learning paths from extracted concepts
- 🎯 **Adaptive Processing**: Configurable extraction thresholds and validation criteria
- 📤 **Multiple Export Formats**: Export concepts as JSON, CSV, Markdown, or HTML

## Quick Start

### Basic Usage

```typescript
import { extractConceptsFromContent } from '@/modules/concept-parsing';

const markdownContent = `
# React Hooks Complete Guide

## useState Hook
The \`useState\` hook lets you add state to functional components.

### Syntax
\`\`\`javascript
import { useState } from 'react';
const [count, setCount] = useState(0);
\`\`\`
`;

// Quick extraction (rule-based only)
const result = await extractConceptsFromContent(markdownContent, {
  title: 'React Hooks Guide',
  format: 'markdown'
});

console.log(`Extracted ${result.concepts.length} concepts`);
console.log(`Found ${result.relationships.length} relationships`);
```

### Full Pipeline with AI Providers

```typescript
import { createConceptPipeline } from '@/modules/concept-parsing';
import { ModelFactory } from '@/services/ModelFactory';

// Get configured AI providers
const openaiProvider = ModelFactory.createModel('openai', {
  name: 'openai',
  api_key: 'your-api-key'
});

const chatglmProvider = await AIProviderFactory.createProvider('chatglm', {
  name: 'chatglm',
  api_key: 'your-api-key',
  base_url: 'https://open.bigmodel.cn/api/paas/v4'
});

// Create pipeline with AI providers
const pipeline = await createConceptPipeline([openaiProvider, chatglmProvider], {
  pipelineConfig: {
    enableAIExtraction: true,
    enableRuleExtraction: true,
    enableDeduplication: true,
    aiConfidenceThreshold: 0.6,
    maxConceptsPerDocument: 50
  },
  modelSelection: ['openai-gpt-4', 'chatglm-glm-4']
});

// Process content with progress tracking
const result = await pipeline.processContent({
  materialId: 'learning-material-1',
  title: 'Advanced React Concepts',
  content: markdownContent,
  format: 'markdown',
  onProgress: (stage, progress) => {
    console.log(`${stage.name}: ${Math.round(progress * 100)}%`);
  }
});
```

## Architecture

### Core Components

1. **MarkdownParser**: Parses and structures markdown content into learnable sections
2. **AIConceptExtractor**: Uses AI models to extract concepts with confidence scoring
3. **RuleBasedExtractor**: Applies deterministic patterns for concept extraction
4. **ConceptDeduplicator**: Removes duplicates and validates concept quality
5. **ConceptProcessingPipeline**: Orchestrates the entire extraction workflow

### Data Flow

```
Markdown Content
       ↓
   Markdown Parser
       ↓
   Document Sections
       ↓
┌───────────────────┐
│   AI Extraction   │ ←→ Rule-Based Extraction
└───────────────────┘
       ↓
   Raw Concepts
       ↓
  Deduplication
       ↓
  Validation
       ↓
  Final Concepts
       ↓
 Learning Material
```

## Configuration

### Pipeline Configuration

```typescript
const pipelineConfig = {
  // Processing options
  enableAIExtraction: true,
  enableRuleExtraction: true,
  enableDeduplication: true,
  enableValidation: true,

  // AI extraction settings
  aiConfidenceThreshold: 0.6,
  maxConceptsPerDocument: 50,
  aiModels: ['openai-gpt-4', 'chatglm-glm-4'],

  // Deduplication settings
  deduplicationThreshold: 0.8,
  preserveHighQualityDuplicates: true,

  // Validation settings
  strictValidation: false,
  minQualityScore: 0.3,

  // Performance settings
  enableParallelProcessing: true,
  maxConcurrency: 4,
  timeout: 300000 // 5 minutes
};
```

### Deduplication Configuration

```typescript
const deduplicationConfig = {
  similarityThreshold: 0.8,
  exactMatchThreshold: 0.95,
  semanticThreshold: 0.7,
  minEvidenceCount: 1,
  minConfidenceScore: 0.3,
  maxConceptNameLength: 100,
  requireDescription: false,
  prohibitedTerms: [
    'test', 'example', 'placeholder', 'todo',
    'click here', 'learn more', 'read more'
  ],
  requiredFields: ['name', 'type', 'difficulty']
};
```

## API Reference

### Main Functions

#### `extractConceptsFromContent(content, options)`

Quick extraction from content without requiring AI providers.

**Parameters:**
- `content: string` - The content to process
- `options: Object` - Configuration options
  - `title?: string` - Material title
  - `format?: 'markdown' | 'text'` - Content format
  - `aiProviders?: AIProvider[]` - AI providers to use
  - `config?: Partial<PipelineConfig>` - Pipeline configuration

**Returns:**
```typescript
{
  concepts: Concept[],
  relationships: ProposedRelationship[],
  statistics: ParsingStatistics,
  success: boolean,
  errors: string[]
}
```

#### `createConceptPipeline(aiProviders, config)`

Create a full-featured processing pipeline with AI integration.

**Parameters:**
- `aiProviders: AIProvider[]` - Configured AI providers
- `config?: Object` - Configuration options
  - `pipelineConfig?: Partial<PipelineConfig>`
  - `modelSelection?: string[]` - Specific models to use
  - `autoInitialize?: boolean` - Auto-initialize providers

**Returns:** `ConceptProcessingPipeline`

### ConceptProcessingPipeline Methods

#### `processContent(options)`

Process a single learning material.

**Parameters:**
- `options: ProcessingOptions`
  - `materialId: string` - Unique identifier
  - `title?: string` - Material title
  - `content: string` - Content to process
  - `format?: 'markdown' | 'text' | 'html'` - Content format
  - `onProgress?: (stage, progress) => void` - Progress callback
  - `onError?: (error) => void` - Error callback

**Returns:** `PipelineResult`

#### `processBatch(optionsList, onProgress)`

Process multiple materials in parallel.

**Parameters:**
- `optionsList: ProcessingOptions[]` - Array of processing options
- `onProgress?: (index, total, result) => void` - Progress callback

**Returns:** `PipelineResult[]`

## Data Structures

### Concept

```typescript
interface Concept {
  id: string;
  name: string;
  description?: string;
  type: 'topic' | 'skill' | 'fact' | 'procedure' | 'principle';
  difficulty: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0-1
  evidence: ConceptEvidence[];
  relationships: ProposedRelationship[];
  metadata: ConceptMetadata;
  extractedAt: Date;
}
```

### ProposedRelationship

```typescript
interface ProposedRelationship {
  targetConceptName?: string;
  targetConceptId?: string;
  type: 'prerequisite' | 'related' | 'contains' | 'example' | 'application' | 'contrasts';
  strength: number; // 0-1
  confidence: number; // 0-1
  description?: string;
  evidence: ConceptEvidence[];
}
```

### LearningMaterial

```typescript
interface LearningMaterial {
  id: string;
  title: string;
  type: 'markdown' | 'pdf' | 'video' | 'course';
  content: string;
  sections: LearningSection[];
  concepts: Concept[];
  learningPath: LearningPath;
  assessments: Assessment[];
  estimatedDuration: number;
  difficultyLevel: number;
  tags: string[];
  metadata: Record<string, any>;
  processedAt: Date;
}
```

## Examples

### Basic Rule-Based Extraction

```typescript
import { extractConceptsFromContent } from '@/modules/concept-parsing';

const result = await extractConceptsFromContent(markdownContent, {
  title: 'Learning Material',
  config: {
    enableAIExtraction: false, // Use only rules
    enableRuleExtraction: true,
    enableDeduplication: true
  }
});
```

### AI-Powered Extraction

```typescript
import { createConceptPipeline } from '@/modules/concept-parsing';

const pipeline = await createConceptPipeline([openaiProvider], {
  pipelineConfig: {
    aiConfidenceThreshold: 0.7,
    maxConceptsPerDocument: 30
  }
});

const result = await pipeline.processContent({
  materialId: 'material-1',
  content: markdownContent,
  title: 'Advanced Topics'
});
```

### Batch Processing

```typescript
const documents = [
  { id: 'doc1', title: 'Topic 1', content: content1 },
  { id: 'doc2', title: 'Topic 2', content: content2 }
];

const results = await pipeline.processBatch(
  documents.map(doc => ({
    materialId: doc.id,
    title: doc.title,
    content: doc.content,
    format: 'markdown'
  })),
  (index, total, result) => {
    console.log(`Processed ${index + 1}/${total}: ${result.concepts.length} concepts`);
  }
);
```

### Export Results

```typescript
import { formatConceptsAsJSON, formatConceptsAsCSV, formatConceptsAsMarkdown } from '@/modules/concept-parsing';

// Export as JSON
const jsonOutput = formatConceptsAsJSON(result.concepts, {
  includeMetadata: true,
  includeEvidence: true
});

// Export as CSV
const csvOutput = formatConceptsAsCSV(result.concepts);

// Export as Markdown
const markdownOutput = formatConceptsAsMarkdown(result.concepts, {
  includeRelationships: true
});
```

## Advanced Usage

### Custom Extraction Rules

```typescript
import { RuleBasedExtractor } from '@/modules/concept-parsing';

const ruleExtractor = new RuleBasedExtractor();

// Add custom rule for API endpoints
ruleExtractor.addRules([{
  id: 'api_endpoints',
  name: 'API Endpoints',
  description: 'Extract REST API endpoints',
  pattern: /(GET|POST|PUT|DELETE|PATCH)\s+\/[^\s]+/gi,
  type: 'concept',
  confidence: 0.8,
  enabled: true,
  priority: 7,
  category: 'technical',
  action: {
    extract: '$0',
    transform: (match) => ({
      name: match[0],
      type: 'skill',
      description: `REST API endpoint: ${match[0]}`
    })
  }
}]);
```

### Custom Validation

```typescript
import { ConceptDeduplicator } from '@/modules/concept-parsing';

const deduplicator = new ConceptDeduplicator({
  similarityThreshold: 0.85,
  minConfidenceScore: 0.5,
  prohibitedTerms: ['test', 'example', 'placeholder'],
  requiredFields: ['name', 'type', 'difficulty', 'description']
});

const validation = await deduplicator.validateConcepts(concepts);
```

## Performance Considerations

- **Parallel Processing**: Enable parallel processing for batch operations
- **Model Selection**: Use specific models rather than all available ones
- **Thresholds**: Adjust confidence thresholds to balance quality vs. quantity
- **Timeout Settings**: Set appropriate timeouts for large documents
- **Memory Usage**: Monitor memory usage with large content sets

## Error Handling

The system provides comprehensive error handling:

```typescript
const result = await pipeline.processContent({
  materialId: 'test-1',
  content: largeContent,
  onError: (error) => {
    console.error(`Processing error: ${error.message}`);
    // Handle specific error types
    if (error.type === 'parsing') {
      // Handle parsing errors
    } else if (error.type === 'extraction') {
      // Handle extraction errors
    }
  }
});

if (!result.success) {
  console.log('Processing failed:', result.errors);
} else {
  console.log('Processing succeeded:', result.statistics);
}
```

## Integration with Existing Systems

### Knowledge Graph Integration

```typescript
import { ConceptManager } from '@/modules/knowledge-graph/concept-manager';

// Process content and integrate with knowledge graph
const result = await pipeline.processContent(options);

// Create concepts in knowledge graph
for (const concept of result.concepts) {
  await conceptManager.createConcept({
    name: concept.name,
    description: concept.description,
    conceptType: concept.type,
    difficultyLevel: concept.difficulty,
    tags: concept.metadata.tags
  });
}
```

### Session Service Integration

```typescript
import { sessionService } from '@/services/sessionService';

// Save processing results to session
await sessionService.saveConceptExtraction({
  materialId: result.material?.id,
  concepts: result.concepts,
  relationships: result.relationships,
  timestamp: new Date()
});
```

## Troubleshooting

### Common Issues

1. **Low Quality Concepts**
   - Increase `aiConfidenceThreshold`
   - Enable `strictValidation`
   - Adjust `minQualityScore`

2. **Too Many Duplicates**
   - Increase `deduplicationThreshold`
   - Enable `preserveHighQualityDuplicates`

3. **Slow Processing**
   - Reduce `maxConceptsPerDocument`
   - Enable `enableParallelProcessing`
   - Use specific `modelSelection`

4. **Memory Issues**
   - Reduce `maxConcurrency`
   - Process content in smaller chunks
   - Increase timeout values

### Debug Mode

```typescript
const pipeline = new ConceptProcessingPipeline(models, {
  enableAIExtraction: true,
  enableRuleExtraction: true,
  // Enable detailed logging
  enableValidation: true,
  strictValidation: true
});

// Monitor processing stages
const result = await pipeline.processContent({
  ...options,
  onProgress: (stage, progress) => {
    console.log(`Stage: ${stage.name}, Progress: ${progress}`);
    if (stage.errorMessage) {
      console.error(`Stage error: ${stage.errorMessage}`);
    }
  }
});
```

## Contributing

To contribute to the concept parsing system:

1. **Add New Extraction Rules**: Create custom patterns for specific domains
2. **Improve AI Prompts**: Optimize prompts for better concept extraction
3. **Enhance Validation**: Add new validation rules and quality checks
4. **Performance Optimization**: Improve processing speed and memory usage
5. **Add Export Formats**: Support additional export formats

## License

This module is part of Learning Catalyst and follows the project's license terms.