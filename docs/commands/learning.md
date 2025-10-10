# Learning Commands

---
title: Learning Commands Reference
description: Core learning functionality and content interaction commands for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Learning commands provide the core functionality for interacting with educational content, taking quizzes, and managing your learning journey. These commands leverage AI to provide personalized learning experiences.

## Available Commands

### `/concepts` - Browse Learning Concepts

Display and navigate through available learning concepts extracted from your workspace materials.

**Aliases**: `/topics`

**Syntax**:
```bash
/concepts                        # List all available concepts
/concepts [topic]               # Filter concepts by topic
/concepts --refresh             # Refresh concept cache
/concepts --search [keyword]    # Search concepts by keyword
/concepts --difficulty [level]  # Filter by difficulty level
```

**Examples**:
```bash
/concepts                       # Show all concepts
/concepts machine learning      # Concepts related to ML
/concepts --search python       # Search for python concepts
/concepts --difficulty beginner # Show beginner concepts
/concepts --refresh            # Re-scan workspace for concepts
```

**Output Features**:
- **Categorized Display**: Concepts organized by topic
- **Difficulty Levels**: Visual indicators for concept difficulty
- **Progress Tracking**: Shows mastery status for each concept
- **Interactive Selection**: Numbered list for easy selection

**Sample Output**:
```
📚 Available Learning Concepts (156 total)

MACHINE LEARNING (42 concepts)
  1.  🟢 Neural Networks              [Mastered]
  2.  🟡 Deep Learning               [Learning]
  3.  🔴 Supervised Learning         [Not Started]
  4.  🟡 Decision Trees              [In Progress]

PYTHON PROGRAMMING (38 concepts)
  5.  🟢 List Comprehensions         [Mastered]
  6.  🟡 Decorators                  [Learning]
  7.  🔴 Generators                  [Not Started]

DATA STRUCTURES (29 concepts)
  8.  🟢 Arrays and Lists            [Mastered]
  9.  🟡 Binary Trees                [Learning]

Select a concept number (1-50) for details, or use /explain [concept]
```

### `/explain` - Get Detailed Explanations

Request AI-generated explanations for specific concepts, topics, or questions.

**Aliases**: `/exp`

**Syntax**:
```bash
/explain [concept]                # Explain a specific concept
/explain "question"               # Ask a question
/explain --depth [level] [topic]  # Set explanation depth
/explain --example [concept]      # Include practical examples
```

**Examples**:
```bash
/explain neural networks         # Explain neural networks
/explain "How does backpropagation work?"  # Ask specific question
/explain --depth detailed python decorators  # Detailed explanation
/explain --example recursion     # Include code examples
```

**Features**:
- **Context-Aware**: Uses your learning materials as context
- **Adaptive Depth**: Adjusts explanation detail based on your level
- **Interactive Follow-up**: Ask follow-up questions
- **Code Examples**: Include practical code examples when relevant

**Sample Output**:
```
🧠 Explanation: Neural Networks

Neural networks are computing systems inspired by biological neural networks...

📖 Key Concepts:
• Neurons: Basic processing units
• Layers: Input, hidden, and output layers
• Weights: Connection strengths between neurons
• Activation Functions: Non-linear transformations

💡 Simple Example:
```python
import numpy as np

# Simple neural network neuron
def neuron(inputs, weights, bias):
    return np.dot(inputs, weights) + bias
```

❓ Ask follow-up questions:
• "How does backpropagation work?"
• "What are activation functions?"
• "Show me a complete example"

Type your follow-up question or /done to finish.
```

### `/quiz` - Take Quizzes and Challenges

Generate and complete AI-powered quizzes on specific topics to test your knowledge.

**Aliases**: `/challenge`

**Syntax**:
```bash
/quiz                            # General quiz
/quiz [topic]                   # Quiz on specific topic
/quiz --difficulty [level]       # Set difficulty level
/quiz --count [number]           # Number of questions
/quiz --type [type]              # Quiz type (multiple-choice, short-answer)
```

**Examples**:
```bash
/quiz                           # General knowledge quiz
/quiz python data structures    # Topic-specific quiz
/quiz --difficulty intermediate  # Intermediate difficulty
/quiz --count 5                 # 5 questions only
/quiz --type multiple-choice    # Multiple choice format
```

**Features**:
- **Adaptive Difficulty**: Questions adapt to your skill level
- **Instant Feedback**: Immediate feedback on answers
- **Detailed Explanations**: Learn from both correct and incorrect answers
- **Progress Tracking**: Track quiz performance over time

**Sample Output**:
```
🎯 Quiz: Python Data Structures (5 questions)

Question 1/5:
What is the time complexity of adding an element to the end of a Python list?

A) O(1) - Constant time
B) O(n) - Linear time
C) O(log n) - Logarithmic time
D) O(n²) - Quadratic time

Your answer (A-D): a

✅ Correct! Lists in Python use dynamic arrays, and appending is amortized O(1).

📚 Explanation: Python lists are implemented as dynamic arrays. When there's
space at the end, appending is O(1). When the array is full, it's resized,
which is O(n), but this happens infrequently, making the amortized
complexity O(1).

Press Enter for next question, or /quit to exit quiz.
```

### `/knowledge-map` - Visualize Knowledge Structure

Display an interactive visualization of your knowledge structure and concept relationships.

**Aliases**: `/kmap`

**Syntax**:
```bash
/knowledge-map                   # Show full knowledge map
/knowledge-map [topic]          # Map for specific topic
/knowledge-map --progress        # Include progress indicators
/knowledge-map --dependencies    # Show concept dependencies
```

**Examples**:
```bash
/knowledge-map                   # Full knowledge map
/knowledge-map python            # Python knowledge map
/knowledge-map --progress        # With progress indicators
/knowledge-map --dependencies    # Show learning paths
```

**Features**:
- **Interactive Navigation**: Browse concepts and relationships
- **Progress Visualization**: See your learning progress
- **Dependency Graph**: Understand concept prerequisites
- **Learning Paths**: Suggested learning sequences

**Sample Output**:
```
🗺️ Knowledge Map: Machine Learning

📊 Progress Overview: 42% complete (18/43 concepts mastered)

CORE CONCEPTS:
├── 🟢 Mathematics Foundations
│   ├── 🟢 Linear Algebra [Mastered]
│   ├── 🟢 Calculus [Mastered]
│   └── 🟡 Probability [In Progress]
├── 🟡 Machine Learning Basics
│   ├── 🟢 Supervised Learning [Mastered]
│   ├── 🟡 Unsupervised Learning [In Progress]
│   └── 🔴 Reinforcement Learning [Not Started]
└── 🔴 Advanced Topics
    ├── 🔴 Deep Learning [Not Started]
    ├── 🔴 Computer Vision [Not Started]
    └── 🔴 Natural Language Processing [Not Started]

🎯 Recommended Learning Path:
1. Complete Probability foundations
2. Start Unsupervised Learning
3. Explore Deep Learning basics

Use /concepts to explore specific areas, or /quiz to test your knowledge.
```

## Usage Patterns

### Learning Workflow
```bash
# Start a learning session
/concepts                      # Browse available topics
/explain neural networks      # Learn about a concept
/quiz neural networks         # Test your understanding
/knowledge-map               # See your progress
```

### Targeted Learning
```bash
# Focus on specific topic
/concepts python             # Find python concepts
/explain decorators          # Learn about decorators
/quiz decorators             # Test yourself
```

### Progress Tracking
```bash
# Check your progress
/knowledge-map --progress    # See overall progress
/statistics                 # Detailed statistics
```

## Advanced Features

### Context-Aware Learning
Learning commands use your workspace content to provide relevant examples:
- Analyzes your local Markdown files
- Incorporates your code examples
- References your existing knowledge base

### Adaptive Difficulty
The system adapts to your skill level:
- Tracks your performance across quizzes
- Adjusts question difficulty automatically
- Provides appropriate explanation depth

### Multi-Modal Learning
Supports different learning styles:
- Visual knowledge maps
- Text-based explanations
- Interactive quizzes
- Code examples and exercises

## Performance Considerations

### Caching System
- `/concepts` results are cached for faster access
- Cache automatically updates when workspace changes
- Use `--refresh` flag to force cache update

### Response Times
- **Local operations**: `/concepts`, `/knowledge-map` (< 2s)
- **AI-powered**: `/explain`, `/quiz` (2-10s depending on complexity)
- **Cached responses**: Nearly instant on repeat queries

### Resource Usage
- **Memory**: Moderate for knowledge maps, minimal for other commands
- **Network**: Required for AI commands (`/explain`, `/quiz`)
- **CPU**: Low for most operations

## Error Handling

### Common Issues

**No Concepts Found**:
```
No learning concepts found in workspace.
Add Markdown files with educational content, or use --refresh to rescan.
```

**AI Provider Not Configured**:
```
AI provider not configured for explanations and quizzes.
Use /config to set up an AI provider, or try local learning materials.
```

**Quiz Generation Failed**:
```
Unable to generate quiz questions for this topic.
Try a different topic or check your AI provider configuration.
```

### Recovery Strategies

1. **No Content**: Add Markdown files to your workspace
2. **AI Issues**: Configure AI provider or use local content
3. **Network Problems**: Try again later or use cached content
4. **Permission Issues**: Check file permissions for workspace

## Integration Examples

### Learning Scripts
```bash
#!/bin/bash
# Daily learning routine
learning-catalyst << EOF
/concepts machine learning
/explain neural networks
/quiz neural networks
/knowledge-map --progress
/quit --save
EOF
```

### Topic-Specific Sessions
```bash
#!/bin/bash
# Python deep dive
learning-catalyst << EOF
/concepts python
/explain --depth detailed decorators
/quiz --difficulty intermediate decorators
/explain --example generators
/quit --save
EOF
```

### Progress Tracking
```bash
# Weekly progress check
echo "/knowledge-map --progress" | learning-catalyst
echo "/statistics --days=7" | learning-catalyst
```

## Best Practices

### Effective Learning
1. **Start Broad**: Use `/concepts` to discover topics
2. **Go Deep**: Use `/explain --depth detailed` for thorough understanding
3. **Test Knowledge**: Regular use of `/quiz` to reinforce learning
4. **Track Progress**: Use `/knowledge-map` to monitor advancement

### Content Organization
1. **Structured Workspace**: Organize learning materials logically
2. **Descriptive Filenames**: Use clear, descriptive filenames
3. **Hierarchical Structure**: Group related concepts together
4. **Regular Updates**: Keep content current and relevant

### Quiz Strategy
1. **Start Easy**: Begin with easier difficulty levels
2. **Build Up**: Gradually increase difficulty
3. **Review Mistakes**: Learn from incorrect answers
4. **Regular Practice**: Consistent quiz practice improves retention

## Troubleshooting

### Content Issues
```bash
# Concepts not appearing
/concepts --refresh           # Rescan workspace
# Or check file permissions
ls -la *.md                  # Verify file access
```

### AI Response Issues
```bash
# Slow or no responses
/config                      # Check AI provider
# Or try local content
/explain --local [concept]   # Use cached explanations
```

### Display Issues
```bash
# Knowledge map not displaying
/knowledge-map --simple      # Use text-based version
# Or check terminal compatibility
/clear && /knowledge-map     # Clear screen first
```

## Version History

### Version 1.0.0
- Added caching system for `/concepts`
- Improved adaptive difficulty for quizzes
- Enhanced knowledge map visualization
- Added command aliases (`/topics`, `/exp`, `/challenge`, `/kmap`)
- Better error handling and recovery

### Previous Versions
- Basic learning command functionality
- Simple quiz generation
- Static knowledge mapping

---

*See [Command Reference Overview](README.md) for complete command listing and [CLI Main Documentation](../README.md) for general usage information.*