/**
 * Concept Parsing System - Usage Examples
 *
 * This file demonstrates how to use the concept parsing system
 * for extracting concepts from educational content.
 */

import {
  createConceptPipeline,
  extractConceptsFromContent,
  ConceptProcessingPipeline,
  MarkdownParser,
  AIConceptExtractor,
  RuleBasedExtractor,
  ConceptDeduplicator
} from '../index';

// Example 1: Quick concept extraction from markdown content
export async function quickExtractionExample() {
  const markdownContent = `
# React Hooks Complete Guide

## Learning Objectives
- Understand what React Hooks are
- Master useState and useEffect hooks
- Learn to create custom hooks

## useState Hook

The \`useState\` hook lets you add state to functional components.

### Syntax
\`\`\`javascript
import { useState } from 'react';

const [count, setCount] = useState(0);
\`\`\`

### Usage Example
\`\`\`javascript
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

## Exercises
1. Create a counter component using useState
2. Build a form component with multiple state variables
3. Create a custom hook for localStorage
`;

  console.log('=== Quick Extraction Example ===');

  // Extract concepts without AI providers (rule-based only)
  const result = await extractConceptsFromContent(markdownContent, {
    title: 'React Hooks Guide',
    format: 'markdown',
    config: {
      enableAIExtraction: false, // Disable AI for this example
      enableRuleExtraction: true,
      enableDeduplication: true
    }
  });

  console.log(`✅ Success: ${result.success}`);
  console.log(`📊 Concepts extracted: ${result.concepts.length}`);
  console.log(`🔗 Relationships found: ${result.relationships.length}`);
  console.log(`⏱️ Processing time: ${result.statistics.processingTime}ms`);

  // Display extracted concepts
  console.log('\n📚 Extracted Concepts:');
  result.concepts.forEach((concept, index) => {
    console.log(`${index + 1}. ${concept.name} (${concept.type}, difficulty: ${concept.difficulty}, confidence: ${Math.round(concept.confidence * 100)}%)`);
    if (concept.description) {
      console.log(`   ${concept.description.substring(0, 100)}...`);
    }
  });

  return result;
}

// Example 2: Full pipeline with AI providers
export async function fullPipelineExample(aiProviders: any[]) {
  const advancedContent = `
# Machine Learning Fundamentals

## Introduction to Neural Networks

Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes that process information using connectionist approaches to computation.

### Core Concepts

**Perceptron**: The basic building block of a neural network. It receives multiple inputs, applies weights, and produces a single output using an activation function.

**Backpropagation**: A supervised learning algorithm used for training neural networks by calculating the gradient of the loss function with respect to the network weights.

### Mathematical Foundation

The forward propagation in a neural network can be expressed as:
y = f(Wx + b)

Where:
- y is the output
- f is the activation function
- W is the weight matrix
- x is the input vector
- b is the bias vector

## Implementation Example

\`\`\`python
import numpy as np

class SimpleNeuralNetwork:
    def __init__(self, input_size, hidden_size, output_size):
        self.W1 = np.random.randn(input_size, hidden_size)
        self.W2 = np.random.randn(hidden_size, output_size)

    def forward(self, X):
        self.z1 = np.dot(X, self.W1)
        self.a1 = self.sigmoid(self.z1)
        self.z2 = np.dot(self.a1, self.W2)
        return self.sigmoid(self.z2)

    def sigmoid(self, x):
        return 1 / (1 + np.exp(-x))
\`\`\`

## Learning Process

1. Initialize weights randomly
2. Forward pass through the network
3. Calculate loss using loss function
4. Backward pass to compute gradients
5. Update weights using gradient descent
6. Repeat until convergence

## Advanced Topics

### Deep Learning Architectures
- **Convolutional Neural Networks (CNNs)**: Specialized for processing grid-like data such as images
- **Recurrent Neural Networks (RNNs)**: Designed for sequential data processing
- **Transformers**: Architecture based on attention mechanisms for handling long-range dependencies

### Regularization Techniques
- **Dropout**: Randomly deactivates neurons during training to prevent overfitting
- **L2 Regularization**: Adds penalty term to loss function based on weight magnitudes
- **Batch Normalization**: Normalizes layer inputs to improve training stability

## Practical Applications

Neural networks are used in:
- Image classification and object detection
- Natural language processing and translation
- Speech recognition and synthesis
- Recommendation systems
- Autonomous vehicles

## Key Takeaways

Understanding neural networks requires grasping:
1. The mathematical foundations of linear algebra and calculus
2. The concept of forward and backward propagation
3. The role of activation functions in introducing non-linearity
4. The importance of proper initialization and regularization
5. The balance between model complexity and generalization
`;

  console.log('\n=== Full Pipeline Example ===');

  // Create full pipeline with AI providers
  const pipeline = await createConceptPipeline(aiProviders, {
    pipelineConfig: {
      enableAIExtraction: true,
      enableRuleExtraction: true,
      enableDeduplication: true,
      enableValidation: true,
      aiConfidenceThreshold: 0.6,
      maxConceptsPerDocument: 30,
      strictValidation: false,
      minQualityScore: 0.4
    },
    modelSelection: ['openai-gpt-4', 'chatglm-glm-4'], // Use specific models
    autoInitialize: true
  });

  // Process the content with progress tracking
  const result = await pipeline.processContent({
    materialId: 'ml-fundamentals-example',
    title: 'Machine Learning Fundamentals',
    content: advancedContent,
    format: 'markdown',
    onProgress: (stage, progress) => {
      console.log(`🔄 ${stage.name}: ${Math.round(progress * 100)}%`);
    },
    onError: (error) => {
      console.error(`❌ Error in ${error.type}: ${error.message}`);
    }
  });

  console.log(`\n✅ Processing completed successfully!`);
  console.log(`📚 Total concepts: ${result.concepts.length}`);
  console.log(`🔗 Total relationships: ${result.relationships.length}`);
  console.log(`⏱️ Total processing time: ${result.processingTime}ms`);

  // Show concept breakdown by type
  const conceptsByType = result.concepts.reduce((acc, concept) => {
    acc[concept.type] = (acc[concept.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 Concepts by type:');
  Object.entries(conceptsByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  // Show confidence distribution
  const confidenceRanges = {
    'High (0.8-1.0)': 0,
    'Medium (0.6-0.8)': 0,
    'Low (0.0-0.6)': 0
  };

  result.concepts.forEach(concept => {
    if (concept.confidence >= 0.8) confidenceRanges['High (0.8-1.0)']++;
    else if (concept.confidence >= 0.6) confidenceRanges['Medium (0.6-0.8)']++;
    else confidenceRanges['Low (0.0-0.6)']++;
  });

  console.log('\n📊 Confidence distribution:');
  Object.entries(confidenceRanges).forEach(([range, count]) => {
    console.log(`   ${range}: ${count}`);
  });

  return result;
}

// Example 3: Batch processing multiple documents
export async function batchProcessingExample(documents: Array<{ id: string; title: string; content: string }>, aiProviders: any[]) {
  console.log('\n=== Batch Processing Example ===');

  const pipeline = await createConceptPipeline(aiProviders, {
    pipelineConfig: {
      enableParallelProcessing: true,
      maxConcurrency: 3,
      timeout: 180000 // 3 minutes
    }
  });

  console.log(`📄 Processing ${documents.length} documents...`);

  const results = await pipeline.processBatch(
    documents.map(doc => ({
      materialId: doc.id,
      title: doc.title,
      content: doc.content,
      format: 'markdown' as const
    })),
    (index, total, result) => {
      console.log(`✅ Document ${index + 1}/${total}: "${result.material?.title}" - ${result.concepts.length} concepts`);
    }
  );

  console.log('\n📊 Batch processing summary:');
  const totalConcepts = results.reduce((sum, result) => sum + result.concepts.length, 0);
  const totalRelationships = results.reduce((sum, result) => sum + result.relationships.length, 0);
  const successfulDocs = results.filter(r => r.success).length;
  const totalProcessingTime = Math.max(...results.map(r => r.processingTime));

  console.log(`   📄 Documents processed: ${successfulDocs}/${documents.length}`);
  console.log(`   📚 Total concepts extracted: ${totalConcepts}`);
  console.log(`   🔗 Total relationships: ${totalRelationships}`);
  console.log(`   ⏱️ Max processing time: ${totalProcessingTime}ms`);

  return results;
}

// Example 4: Custom configuration and rule extraction
export async function customConfigurationExample() {
  console.log('\n=== Custom Configuration Example ===');

  // Create pipeline with custom configuration
  const pipeline = new ConceptProcessingPipeline(undefined, {
    enableAIExtraction: false, // Use only rule-based extraction
    enableRuleExtraction: true,
    enableDeduplication: true,
    enableValidation: true,
    deduplicationThreshold: 0.85, // Higher threshold for deduplication
    strictValidation: true,
    minQualityScore: 0.6
  });

  // Add custom extraction rules
  const ruleExtractor = new RuleBasedExtractor();

  const content = `
# JavaScript ES6 Features

## Arrow Functions
Arrow functions provide a concise syntax for writing function expressions.

\`\`\`javascript
// Traditional function
function add(a, b) {
  return a + b;
}

// Arrow function
const add = (a, b) => a + b;
\`\`\`

## Destructuring Assignment
Destructuring allows you to unpack values from arrays or properties from objects.

\`\`\`javascript
// Array destructuring
const [first, second] = [1, 2, 3];

// Object destructuring
const {name, age} = {name: 'John', age: 30};
\`\`\`

## Template Literals
Template literals provide an easy way to create multiline strings and perform string interpolation.

\`\`\`javascript
const name = 'World';
const greeting = \`Hello, \${name}!\`;
\`\`\`
`;

  const result = await pipeline.processContent({
    materialId: 'javascript-es6-example',
    title: 'JavaScript ES6 Features',
    content: content,
    format: 'markdown'
  });

  console.log(`📚 Extracted ${result.concepts.length} concepts using rule-based extraction only`);

  // Show detailed concept information
  result.concepts.slice(0, 3).forEach((concept, index) => {
    console.log(`\n${index + 1}. ${concept.name}`);
    console.log(`   Type: ${concept.type}`);
    console.log(`   Difficulty: ${concept.difficulty}/5`);
    console.log(`   Confidence: ${Math.round(concept.confidence * 100)}%`);
    console.log(`   Evidence: ${concept.evidence.length} sources`);
    if (concept.description) {
      console.log(`   Description: ${concept.description}`);
    }
  });

  return result;
}

// Example 5: Export and formatting
export async function exportAndFormattingExample(result: any) {
  console.log('\n=== Export and Formatting Example ===');

  const { formatConceptsAsJSON, formatConceptsAsCSV, formatConceptsAsMarkdown } = await import('../utils/format-utils');

  // Format as JSON
  const jsonOutput = formatConceptsAsJSON(result.concepts, {
    includeMetadata: true,
    includeEvidence: false,
    compact: false
  });

  console.log('📄 JSON formatted concepts (first 200 chars):');
  console.log(jsonOutput.substring(0, 200) + '...');

  // Format as CSV
  const csvOutput = formatConceptsAsCSV(result.concepts.slice(0, 5), {
    includeMetadata: true
  });

  console.log('\n📊 CSV formatted concepts (first 5):');
  console.log(csvOutput);

  // Format as Markdown
  const markdownOutput = formatConceptsAsMarkdown(result.concepts.slice(0, 3), {
    includeMetadata: true,
    includeEvidence: true
  });

  console.log('\n📝 Markdown formatted concepts (first 3):');
  console.log(markdownOutput.substring(0, 500) + '...');

  return {
    json: jsonOutput,
    csv: csvOutput,
    markdown: markdownOutput
  };
}

// Main function to run all examples
export async function runAllExamples(aiProviders: any[] = []) {
  console.log('🚀 Starting Concept Parsing System Examples\n');

  try {
    // Example 1: Quick extraction
    const quickResult = await quickExtractionExample();

    // Example 2: Full pipeline (only if AI providers are available)
    if (aiProviders.length > 0) {
      const fullResult = await fullPipelineExample(aiProviders);

      // Example 5: Export and formatting
      await exportAndFormattingExample(fullResult);
    } else {
      console.log('\n⚠️  Skipping AI-powered examples (no AI providers available)');
    }

    // Example 3: Custom configuration
    await customConfigurationExample();

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Example documents for batch processing
export const sampleDocuments = [
  {
    id: 'python-basics',
    title: 'Python Programming Basics',
    content: `
# Python Programming Basics

## Variables and Data Types
Python supports various data types including integers, floats, strings, and booleans.

\`\`\`python
# Variable assignment
name = "Python"
version = 3.9
is_popular = True
\`\`\`

## Control Flow
Python uses indentation to define code blocks.

\`\`\`python
if age >= 18:
    print("You are an adult")
else:
    print("You are a minor")
\`\`\`
`
  },
  {
    id: 'web-development',
    title: 'Web Development Fundamentals',
    content: `
# Web Development Fundamentals

## HTML Structure
HTML provides the structure and content of web pages.

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
</body>
</html>
\`\`\`

## CSS Styling
CSS controls the presentation and layout of web pages.

\`\`\`css
body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
}
\`\`\`
`
  }
];

// Export for use in other modules
export default {
  quickExtractionExample,
  fullPipelineExample,
  batchProcessingExample,
  customConfigurationExample,
  exportAndFormattingExample,
  runAllExamples,
  sampleDocuments
};