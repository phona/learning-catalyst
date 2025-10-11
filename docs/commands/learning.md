# Learning Commands

---
title: Learning Commands Reference
description: Core learning functionality and content interaction commands for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-09
---

## Overview

Learning commands provide the core functionality for interacting with educational content, taking quizzes, and managing your learning journey. These commands leverage AI to provide personalized learning experiences.

### ✅ Current Status: **Documented Commands Working and Validated**
- **✅ `/knowledge-map`**: Fully functional with visualization

### 📝 Natural Learning Interactions
**Explanations and Practice Questions**: These are handled through natural conversation with the AI rather than CLI commands:
- Simply ask questions like "Can you explain [topic]?" or "Can you test me on [concept]?"
- The AI provides detailed explanations and practice questions based on your requests
- No special commands needed - just talk naturally with the AI!

### 🔗 See Real Examples
- **Knowledge Mapping**: [Basic Workflows - Knowledge Assessment](../examples/basic-workflows.md#workflow-5-interview-preparation-workflow)

## Quick Reference

**Essential Commands**:
```bash
/knowledge-map                   # Interactive knowledge map (simple view)
/knowledge-map [topic]          # Focused view on specific topic
/knowledge-map --verbose        # Detailed view with progress and relationships
```

**Interactive Navigation**:
- **Arrow Keys**: Navigate concepts
- **Enter**: Dive into concept details and relationships
- **(e)xplain**: Get AI explanation of selected concept
- **(a)sk AI**: Personalized learning guidance
- **(v)erbose**: Toggle simple/detailed views
- **(q)uit**: Exit knowledge map

**Natural Learning** (no commands needed):
- "Explain [concept]" - Get detailed explanations
- "Test me on [topic]" - Practice questions
- "Continue learning [concept]" - Resume where you left off

**Learning Workflow**:
```bash
/knowledge-map                   # See all concepts and status
[Navigate to concept] → Enter    # Explore relationships
"Explain [concept]"              # Learn naturally
"Test me on [concept]"           # Practice understanding
/checkpoint save                 # Save progress
/knowledge-map                   # Check updated status
```

## Available Commands

### `/knowledge-map` - Visualize Knowledge Structure

Display an interactive visualization of your knowledge structure and concept relationships.

**✅ Status**: **Available**
**Aliases**: `/kmap`

**Syntax**:
```bash
/knowledge-map                   # Interactive map (simple view - essential information only)
/knowledge-map [topic]          # Focused view on specific topic
/knowledge-map --verbose        # Interactive map (detailed view - shows all information)
```

**Examples**:
```bash
/knowledge-map                   # Simple interactive view
/knowledge-map python            # Python domain focused view (simple)
/knowledge-map --verbose        # Detailed interactive view with full information
```


**Features**:
- **Interactive Navigation**: Browse concepts and relationships
- **Progress Visualization**: See your learning progress
- **Dependency Graph**: Understand concept prerequisites
- **Learning Paths**: Suggested learning sequences
- **Simple vs Detailed Views**: Choose information density

## Interactive Navigation & Views

The knowledge map provides interactive navigation with two verbosity levels:

**Interactive Controls**:
- **Arrow Keys** (↑↓←→): Navigate between concepts and domains
- **Enter**: Zoom into selected concept for detailed view
- **(e)xplain**: Get AI explanation of the selected concept
- **(a)sk AI**: Get personalized learning guidance and recommendations
- **(v)erbose**: Toggle between simple and detailed views
- **(q)uit**: Exit interactive map and return to shell

**View Modes**:
- **Simple View** (default): Essential information only - concept names, basic status, and immediate progress
- **Verbose View** (--verbose flag): Complete information including detailed dependencies, time spent, practice results, and AI insights

**Visual Status Indicators**:
- **✅ [Mastered]**: Concept completed and tested
- **🔄 [In Progress]**: Currently being learned (shows percentage)
- **⏳ [Available]**: Ready to learn (prerequisites met)
- **🔒 [Locked]**: Prerequisites not yet completed

**Sample Output**:
```
🗺️ Knowledge Map: Machine Learning

📊 Progress Overview: 42% complete (18/43 concepts mastered)

┌─ Machine Learning Domain ──────────────────────────────┐
│                                                        │
│  [✅] Fundamentals (Mastered)                          │
│  │   ├── Mathematical Foundations                     │
│  │   └── ML Concepts & Terminology                    │
│                                                        │
│  [✅] Supervised Learning (Mastered)                   │
│  │   ├── Classification Algorithms                     │
│  │   └── Regression Algorithms                         │
│                                                        │
│  [✅] Unsupervised Learning (Good)                     │
│  │   ├── Clustering Methods                            │
│  │   └── Dimensionality Reduction                     │
│                                                        │
│  [🔄] Neural Networks (65% Complete)                  │
│  │   ├── ✅ Basic Concepts                             │
│  │   ├── 🔄 Backpropagation (In Progress)             │
│  │   └── ⏳ Advanced Architectures                     │
│                                                        │
│  [⏳] Deep Learning (Locked - Requires Neural Networks)│
│  │   ├── CNNs                                         │
│  │   ├── RNNs                                         │
│  │   └── Transformers                                 │
│                                                        │
│  [⏳] Specialized Topics (Locked)                      │
│      ├── Reinforcement Learning                        │
│      ├── NLP                                          │
│      └── Computer Vision                              │
└────────────────────────────────────────────────────────┘
 
Navigation: ↑↓←→ Move | Enter: Zoom In | (f)ilter | (e)xplain | (a)sk AI | (q)uit

Learning Catalyst > [Navigates to Neural Networks]
🔍 Neural Networks Deep Dive:
┌─ Neural Networks Module ───────────────────────────────┐
│  [✅] Basic Concepts (Completed 3 days ago)            │
│     ├── Perceptrons ✅                                │
│     ├── Activation Functions ✅                       │
│     └── Network Architecture ✅                       │
│                                                        │
│  [🔄] Backpropagation (Currently 45% Complete)        │
│     ├── ✅ Gradient Concept                           │
│     ├── 🔄 Chain Rule Application (Learning)          │
│     └── ⏳ Implementation Practice                     │
│                                                        │
│  [⏳] Advanced Architectures (Requirements Met)        │
│     ├── Convolutional Neural Networks (CNNs)          │
│     ├── Recurrent Neural Networks (RNNs)              │
│     └── Transformer Models                            │
│                                                        │
│  AI Insight: "You're making great progress!           │
│  Focus on mastering backpropagation to unlock         │
│  advanced architectures. I recommend practicing       │
│  with gradient descent implementation."               │
└────────────────────────────────────────────────────────┘
Current: Backpropagation | (c)ontinue | (p)ractice | (e)xplain | (b)ack

# Challenge yourself with comprehensive assessment from the map
Learning Catalyst > [Selects (a)sk AI from main ML map]
🤖 AI Learning Path Advisor:
"Based on your ML progress:
📊 Overall Mastery: 72% (Advanced Beginner → Intermediate)
🎯 Optimal Learning Path:
  1. Complete Neural Networks (35% remaining)
  2. Unlock Deep Learning architectures
  3. Specialize in NLP or Computer Vision

🚀 Recommended Next Actions:
- Finish backpropagation implementation
- Practice with PyTorch/TensorFlow basics
- Start CNN fundamentals

Would you like me to:
- (c)reate a personalized study plan?
- (g)enerate targeted practice problems?
- (s)uggest projects for your current level?"
```

### Simple vs Verbose View Examples

**Simple View (Default)**:
```bash
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: Python Programming
├─ [✅] Basic Syntax
├─ [🔄] Functions (65%)
├─ [⏳] Decorators
└─ [🔒] Classes (Requires Functions)

Navigation: ↑↓←→ Move | Enter: Details | (v)erbose | (q)uit
```

**Verbose View (--verbose flag)**:
```bash
Learning Catalyst > /knowledge-map --verbose
🗺️ Knowledge Map: Python Programming
📊 Overall Progress: 45% complete (9/20 concepts)
⏱️ Total Learning Time: 12h 35m

├─ [✅] Basic Syntax (Mastered 5 days ago)
│   ✅ Variables & Data Types (2h 15m, 95% quiz score)
│   ✅ Control Flow (1h 45m, 88% quiz score)
│   ✅ Functions & Scope (3h 20m, 92% quiz score)

├─ [🔄] Functions (65% complete, started 2 days ago)
│   ✅ Function Definition (1h 10m)
│   🔄 Parameters & Arguments (45m, in progress)
│   ⏳ Lambda Functions
│   ⏳ Decorators (Requires: Parameters & Arguments)

├─ [⏳] Decorators (Available - prerequisites met)
│   💡 AI Insight: "Ready to learn decorators! This is an advanced
│   topic that will enhance your function understanding significantly."

└─ [🔒] Classes (Locked - Requires Functions 100%)
   🚫 Prerequisite: Functions module must be completed first

Navigation: ↑↓←→ Move | Enter: Details | (e)xplain | (a)sk AI | (v)erbose | (q)uit
```

**Concept Relationships and Navigation**:
```bash
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: Web Development

┌─ Frontend Development ─────────────────────────────────┐
│  [✅] HTML (Foundation)                                  │
│  [✅] CSS (Requires: HTML)                              │
│  [🔄] JavaScript (Requires: HTML, CSS)                  │
│  [⏳] React (Requires: JavaScript 80%)                   │
└─────────────────────────────────────────────────────────┘

# User navigates to JavaScript and presses Enter
Learning Catalyst > [Navigate to JavaScript → Enter]
🔍 JavaScript Concept Details:
┌─ JavaScript Module ────────────────────────────────────┐
│  Status: 🔄 In Progress (65% complete)                 │
│  Prerequisites: ✅ HTML, ✅ CSS                         │
│  Enables: React, Node.js, Async Programming            │
│                                                        │
│  Sub-concepts:                                         │
│  ├── ✅ Basic Syntax                                    │
│  ├── 🔄 DOM Manipulation (Learning)                     │
│  ├── ⏳ Async Programming                               │
│  └── ⏳ ES6+ Features                                  │
└────────────────────────────────────────────────────────┘

🔗 Relationships to Other Concepts:
┌─ Dependencies (What you need first) ──────────────────┐
│  ✅ HTML - Completed 5 days ago                        │
│  ✅ CSS - Completed 3 days ago                         │
└─────────────────────────────────────────────────────────┘

┌─ Enables (What this unlocks) ───────────────────────────┐
│  ⏳ React - Available once JavaScript reaches 80%      │
│  ⏳ Node.js - Available once Async Programming done    │
│  ⏳ Advanced Frontend - Requires ES6+ Features         │
└─────────────────────────────────────────────────────────┘

┌─ Related Concepts (Similar or helpful) ─────────────────┐
│  ⏳ TypeScript (Optional enhancement)                  │
│  ⏳ WebAssembly (Advanced topic)                        │
│  ✅ JSON (Already learned - helps with data handling)   │
└─────────────────────────────────────────────────────────┘

Navigation: (c)heck sub-concepts | (r)elationships | (e)xplain | (b)ack | (q)uit

# User presses (c)heck to explore DOM Manipulation
Learning Catalyst > [Press (c)heck → Navigate to DOM Manipulation]
🔍 DOM Manipulation Sub-concept:
┌─ DOM Manipulation ─────────────────────────────────────┐
│  Status: 🔄 Currently Learning (45% complete)           │
│  Progress: ✅ Basic selectors, 🔄 Event handling         │
│                                                        │
│  🔗 Relationships:                                     │
│  • Depends on: JavaScript Basic Syntax ✅               │
│  • Enables: React Components, Interactive Web Apps      │
│  • Related to: CSS Selectors (helps with element access)│
│                                                        │
│  💡 AI Insight: "Great progress! Focus on event        │
│  handling to unlock React component interactions."     │
└────────────────────────────────────────────────────────┘

Actions: (c)ontinue learning | (p)ractice | (e)xplain more | (b)ack
```

### Natural Learning: Explanations and Practice Questions

**How to Get Explanations:**
Simply ask questions naturally! The AI provides detailed explanations based on your requests.

```bash
# Natural ways to ask for explanations:
Learning Catalyst > Can you explain neural networks?
Learning Catalyst > How do Python decorators work?
Learning Catalyst > Explain machine learning like I'm 10 years old
Learning Catalyst > Give me a practical example of recursion
Learning Catalyst > Can you break down how sorting algorithms work step by step?
```

**How to Get Practice Questions:**
Just ask for them naturally! The AI generates practice questions to test your understanding.

```bash
# Natural ways to ask for practice questions:
Learning Catalyst > Can you test me on Python decorators?
Learning Catalyst > Give me some practice questions about recursion
Learning Catalyst > Can you quiz me on machine learning concepts?
Learning Catalyst > Test my understanding of React hooks
Learning Catalyst > Ask me questions to see if I understand algorithms
```



## Usage Patterns

### Learning Workflow
```bash
# Start a learning session
# Ask naturally: "Can you explain neural networks?"      # Learn about a concept
# Ask naturally: "Can you test me on neural networks?"   # Test your understanding
/knowledge-map               # See your progress
```

### Targeted Learning
```bash
# Focus on specific topic
# Ask naturally: "How do decorators work?"           # Learn about decorators
# Ask naturally: "Can you test me on decorators?"   # Test yourself
```

### Progress Tracking
```bash
# Check your progress
/knowledge-map               # See overall progress and status
/knowledge-map --verbose     # Detailed progress with time spent and scores
```

## Command Features

### Content Discovery
- Automatically discovers concepts from your workspace Markdown files
- Organizes content into learning domains
- Shows concept relationships and prerequisites

### Progress Tracking
- Visual status indicators for each concept
- Learning progress percentages
- Prerequisites and unlock requirements

### Interactive Exploration
- Navigate between concepts and sub-concepts
- View relationships between different topics
- Access detailed information about each learning area

## Interactive Learning Path Examples

### Status-Driven Learning Workflow

```bash
# Step 1: Overview and Planning
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: React Development
├─ [✅] JavaScript Basics
├─ [🔄] React Components (In Progress - 70%)
├─ [⏳] State Management (Available - requires React Components 80%)
└─ [🔒] Advanced Patterns (Requires State Management)

# Step 2: Focus on In-Progress Concept
Learning Catalyst > [Navigate to React Components → Enter]
🔍 React Components Details:
┌─ React Components Module ───────────────────────────────┐
│  Status: 🔄 In Progress (70% complete)                  │
│  Current Focus: Props and State Handling                │
│                                                        │
│  🔗 Relationships:                                     │
│  • Enables: State Management, Advanced Patterns         │
│  • Related to: JavaScript Functions ✅                   │
│                                                        │
│  💡 AI Insight: "You're close to mastery! Focus on      │
│  state handling to unlock advanced patterns."           │
└────────────────────────────────────────────────────────┘

# Step 3: Targeted Learning
Learning Catalyst > Can you help me complete the remaining 30% of React Components?
🧠 Let's focus on the remaining areas: State Handling, Lifecycle Methods,
and Component Composition. These are crucial for unlocking State Management...

# Step 4: Practice and Verification
Learning Catalyst > Can you test me on React Components?
🧠 Here are some practice questions for React Components...
[Interactive quiz session]

# Step 5: Check Updated Progress
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: React Development
├─ [✅] JavaScript Basics
├─ [✅] React Components (Mastered just now!)
├─ [⏳] State Management (Now Available!)
└─ [🔒] Advanced Patterns (Requires State Management)
```

### Prerequisite-Based Learning Planning

```bash
# Identify Learning Goals
Learning Catalyst > /knowledge-map --verbose
🗺️ Knowledge Map: Machine Learning
├─ [🔄] Neural Networks (45% complete)
├─ [🔒] Deep Learning (Requires Neural Networks 80%)
├─ [🔒] Computer Vision (Requires Deep Learning)

# Plan Learning Path
Learning Catalyst > [Navigate to Deep Learning → Enter]
🔍 Deep Learning Concept Details:
┌─ Deep Learning Module ──────────────────────────────────┐
│  Status: 🔒 Locked                                       │
│  Prerequisite: Neural Networks (need 35% more)          │
│                                                        │
│  📋 To Unlock Deep Learning:                            │
│  • Complete Backpropagation (20% remaining)             │
│  • Master Weight Initialization (New)                   │
│  • Practice Implementation Exercises (15% remaining)    │
│                                                        │
│  💡 AI Recommendation: "Focus on Backpropagation first,  │
│  then practice with simple neural network implementation."│
└────────────────────────────────────────────────────────┘

# Execute Learning Plan
Learning Catalyst > Let's complete Backpropagation
🧠 Backpropagation is the cornerstone of neural network training...
[Detailed learning session with examples]

# Save Progress
Learning Catalyst > /checkpoint save
✅ Checkpoint saved: backpropagation-focus_2025-10-09_143022

# Continue Learning
Learning Catalyst > /knowledge-map
🗺️ Neural Networks now shows: 🔄 60% complete
```

### Multi-Domain Learning Integration

```bash
# Discover Cross-Topic Relationships
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: Full Stack Development

┌─ Frontend Domain ─────────────────────────────────────┐
│  [🔄] React (75% complete)                            │
│  🔗 Related to: Component Architecture (Backend)       │
│                                                        │
├─ Backend Domain ──────────────────────────────────────┐
│  [⏳] Component Architecture (Available)              │
│  🔗 Related to: React Patterns (Frontend) ✅           │
│                                                        │
└─ Shared Concepts ─────────────────────────────────────┐
│  [✅] REST APIs                                       │
│  [✅] Data Structures                                 │
│  🔗 Used in: Both Frontend and Backend                │
└────────────────────────────────────────────────────────┘

# Explore Relationships
Learning Catalyst > [Navigate to React → Check Relationships]
🔗 React Relationships:
• Enables: Advanced UI Patterns, State Management
• Related to: Component Architecture (Backend concept)
• Benefits from: Data Structures, REST APIs (Both mastered)

# Integrated Learning
Learning Catalyst > How can my React knowledge help with backend Component Architecture?
🧠 Great question! Your React component understanding directly applies...
[Cross-domain learning session]

# Update Cross-Domain Progress
Learning Catalyst > /checkpoint save react-backend-connection_2025-10-09_143045
✅ Checkpoint saved: react-backend-connection_2025-10-09_143045
```


## Workspace Content Discovery

The knowledge map automatically discovers and organizes learning content from your workspace:

### Content Discovery Process

**Empty Workspace**:
```bash
Learning Catalyst > /knowledge-map
⚠️ No learning content found in workspace
💡 Add Markdown files with educational content to enable knowledge mapping
🔍 Looking for: *.md files with learning concepts

# Solution: Add content files
Learning Catalyst > echo "# Python Basics\n\n## Variables\nPython variables are..." > python-basics.md
Learning Catalyst > echo "# React Components\n\n## Functional Components\n..." > react-guide.md

# Retry knowledge mapping
Learning Catalyst > /knowledge-map
🗺️ Knowledge Map: Workspace Content
✅ Discovered 2 domains with 8 concepts from 2 files
├─ [⏳] Python Programming (6 concepts)
└─ [⏳] React Development (2 concepts)
```

**Structured Content Discovery**:
```bash
# Organized workspace with multiple files
Learning Catalyst > /knowledge-map --verbose
🗺️ Knowledge Map: Full Stack Development
📊 Workspace Analysis: 12 files, 35 concepts discovered

┌─ Frontend Development ─────────────────────────────────┐
│  Source: react-guide.md, css-tutorial.md, html-basics.md │
│  Concepts: 12 total, 3 mastered                           │
│  [✅] HTML Basics (from html-basics.md)                   │
│  [🔄] CSS Fundamentals (from css-tutorial.md)             │
│  [⏳] React Components (from react-guide.md)              │
└─────────────────────────────────────────────────────────┘

┌─ Backend Development ──────────────────────────────────┐
│  Source: nodejs-guide.md, express-tutorial.md           │
│  Concepts: 8 total, 0 mastered                           │
│  [⏳] Node.js Fundamentals (from nodejs-guide.md)        │
│  [⏳] Express.js (from express-tutorial.md)              │
└─────────────────────────────────────────────────────────┘
```

**Content Quality and Structure**:
```bash
# Well-structured content gets better concept extraction
Learning Catalyst > /knowledge-map --verbose
🗺️ Knowledge Map: Python Programming
📝 Content Quality Analysis: 8/10 files well-structured

✅ High-Quality Sources:
│  ├── python-basics.md (Clear headings, code examples)
│  ├── algorithms.md (Structured with difficulty levels)
│  └── design-patterns.md (Practical examples included)

⚠️ Needs Improvement:
│  ├── notes.txt (Unstructured, needs Markdown format)
│  └── random-ideas.md (Missing clear concept organization)

💡 Recommendations:
   • Convert .txt files to Markdown format
   • Add clear headings (##, ###) for concept structure
   • Include code examples and practice problems
```

---

*See [Command Reference Overview](README.md) for complete command listing, [Session Commands](session.md) for checkpoint management, and [CLI Main Documentation](../README.md) for general usage information.*