# Workflow Architecture Best Practices

## Overview

This document outlines best practices for implementing LangGraph workflow nodes and subgraphs in this project, following official LangGraph patterns and our learnings.

## Directory Structure

```
workflow/
├── nodes/                      # Simple, single-file nodes
│   ├── topicParse.ts           # Stateless, single function
│   ├── plan.ts                 # No subgraph, no complex state
│   └── ...
│
└── subgraphs/                  # Complex, multi-file subgraphs
    ├── teach/
    │   ├── types.ts           # ZERO imports (base layer)
    │   ├── state.ts           # Annotation + reducers
    │   ├── graph.ts           # StateGraph composition
    │   ├── nodes/             # Individual node functions
    │   └── index.ts           # Public API
    │
    └── practice/
        └── (same structure)
```

---

## Core Principles

**Three-Tier Architecture:**

1. **AIMessages** → User-facing content (conversation & teaching)
2. **State Updates** → Internal orchestration (data passing between nodes)
3. **Logs/Chunks** → Development & real-time feedback

**Rule of Thumb:** Only use ToolMessage when executing external tools that need to report structured results to other nodes.

---

## Message Types

### 1. AIMessages (User-Facing Content)

**Use when:**
- User needs to see the information in chat
- Conversational content (teaching, explanations, questions)
- Feedback (evaluation, confidence scores)
- The content adds value to the conversation history

**Example:**
```typescript
const confidenceMessage = `Confidence: ${Math.round(confidence * 100)}%`;

return {
  messages: [new AIMessage(confidenceMessage)],  // User sees this
  confidence: 0.75,  // Internal routing
};
```

**DON'T use AIMessages for:**
- Internal calculations
- Debugging info
- Data that won't help the user

---

### 2. State Updates (Internal Orchestration)

**Use when:**
- Passing data between nodes
- Routing decisions (confidence, mastery, gaps)
- Workflow control signals (readyForPractice, interactionCount)
- Data that other nodes need but user doesn't need to see

**Example:**
```typescript
return {
  messages: [new AIMessage('Teaching content...')],  // User sees
  confidence: 0.75,  // Internal: routing
  gaps: ['useState', 'useEffect'],  // Internal: for other nodes
  readyForPractice: true,  // Internal: workflow control
};
```

---

### 3. ToolMessages (External Tool Results)

**Use when:**
- Executing external logic (database query, API call, file system)
- Tool returns structured results for downstream nodes
- Tool execution needs to be tracked as a distinct operation
- Results need to be shared with other nodes

**Example:**
```typescript
// ✅ GOOD: External tool with structured results
const exercises = await generateExercises(state.topic);

return {
  messages: [new AIMessage('Here are your exercises...')],  // User-facing
  tool_calls: [
    {
      id: toolCallId,
      name: 'generate_exercises',
      args: { topic: state.topic },
    },
  ],
  ToolMessage: {
    tool_call_id: toolCallId,
    name: 'generate_exercises',
    artifact: { exercises, count: exercises.length }  // Structured for other nodes
  },
  readyForPractice: true,
};
```

**DON'T use ToolMessage for:**
- Internal calculations or state updates
- Pure conversational content
- Debugging information
- Data that's already in state fields

---

### 4. Tool Notification Emitters (User-Facing Tool Progress)

**Use when:**
- User needs to see that a tool is being executed
- Providing real-time feedback during tool execution
- Long-running operations that need progress indicators
- Making tool execution transparent to the user

**Pattern: Progress Text Emitters**

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const emitter = createChunkEmitter(config);
  const messageId = generateId('msg');

  // Start streaming
  emitter.textStart(messageId);

  // Show progress to user
  emitter.textDelta(messageId, 'Analyzing your knowledge...');
  await performAnalysis();

  emitter.textDelta(messageId, 'Found 5 related concepts...');
  await findConcepts();

  emitter.textDelta(messageId, 'Calculating confidence...');
  const confidence = await calculateConfidence();

  // Final result
  const finalMessage = `Confidence: ${Math.round(confidence * 100)}%`;
  emitter.textDelta(messageId, finalMessage);

  // End streaming
  emitter.textEnd(messageId);

  return {
    messages: [new AIMessage(finalMessage)],
    confidence,
  };
};
```

**DON'T use tool lifecycle emitters** (`toolInputStart`, `toolInputAvailable`, `toolOutputAvailable`) as they are for debugging, not user display. Use text emitters to show progress instead.

**Why this approach?**
- Text emitters show user-friendly progress messages
- User sees what's happening in real-time
- No confusing "tool execution" UI
- Clean separation: text for users, logs for debugging

---

## Emitter Usage

### Text Streaming Emitters (User-Facing)

**Use for:** Real-time streaming content to UI

```typescript
const messageId = generateId('msg');
emitter.textStart(messageId);
emitter.textDelta(messageId, content);  // Stream to user
emitter.textEnd(messageId);

return {
  messages: [new AIMessage(content)],  // Add to conversation history
};
```

**Use cases:**
- Teaching content
- Practice exercises
- Feedback messages
- Any content that benefits from streaming

---

### Tool Lifecycle Emitters (DEBUG - Avoid)

**DON'T use:** `emitter.toolInputStart()`, `emitter.toolInputAvailable()`, `emitter.toolOutputAvailable()`

These are for debugging/observability and pollute the UI. Use logs instead:

```typescript
// ✅ GOOD: Use logs for debugging
logger.debug('Node execution', {
  node: 'assess',
  confidence,
  gaps: practiceMetrics.gaps,
});

// ✅ GOOD: Use text emitters for user-facing content
emitter.textDelta(messageId, 'Analyzing your knowledge...');
```

---

## When to Use Nodes vs Subgraphs

### Use `nodes/` (Simple Nodes) When:
- Single function, one file
- Uses parent `WorkflowStateAnnotation`
- No internal state management needed
- Stateless operations
- Examples: `topicParse.ts`, `plan.ts`, `complete.ts`

### Use `subgraphs/` (Complex Subgraphs) When:
- Multiple nodes working together
- Has internal state (not in parent state)
- Conversational flows with interrupts
- Complex routing logic
- Examples: `teach/`, `practice/`

---

## Subgraph Architecture

### Dependency Direction

```
types.ts (NO imports from workflow)
    ↓
state.ts (imports types.ts)
    ↓
nodes/*.ts (imports state.ts, types.ts)
    ↓
graph.ts (imports state.ts, nodes/*.ts)
    ↓
index.ts (re-exports public API)
```

**Critical Rule:** Higher layers import from lower layers. Never reverse.

### State Management

**Shared Keys (Auto-mapped with Parent):**
```typescript
// Subgraph annotation
export const TeachAnnotation = Annotation.Root({
  // Auto-mapped with parent
  topic: Annotation<string>({ reducer: (_, update) => update }),
  messages: Annotation<BaseMessage[]>({ reducer: messagesReducer }),
  userAnswer: Annotation<string | undefined>({ reducer: (_, update) => update }),

  // Subgraph-owned (invisible to parent)
  teach: Annotation<TeachState>({ reducer: teachStateReducer }),
});
```

**Accessing State:**
```typescript
// ✅ GOOD: Access shared key
const topic = state.topic;

// ✅ GOOD: Access subgraph-owned key
const understandingLevel = state.teach.understandingLevel;

// ❌ BAD: Parent can't access subgraph-owned keys
// Parent sees: state.teach (exists but details hidden)
```

---

## Creating a New Subgraph

### Step 1: Create Structure
```bash
workflow/subgraphs/yourname/
├── types.ts
├── state.ts
├── graph.ts
├── nodes/
│   ├── node1.ts
│   └── node2.ts
└── index.ts
```

### Step 2: Define Types (`types.ts`)
```typescript
// ZERO imports from workflow to avoid cycles
export type YourIntent = 'intent1' | 'intent2';

export interface YourState {
  field1: string;
  field2: number;
}

export const DEFAULT_YOUR_STATE: YourState = {
  field1: '',
  field2: 0,
};
```

### Step 3: Define State (`state.ts`)
```typescript
import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { YourState, DEFAULT_YOUR_STATE } from './types';

// Reducers
const messagesReducer = (curr, update) => [...(curr ?? []), ...update];
export const yourStateReducer = (current, update) =>
  update ? { ...(current ?? DEFAULT_YOUR_STATE), ...update } : current ?? DEFAULT_YOUR_STATE;

// Annotation
export const YourAnnotation = Annotation.Root({
  // Shared with parent (auto-mapped)
  topic: Annotation<string>({ reducer: (_, update) => update }),
  messages: Annotation<BaseMessage[]>({ reducer: messagesReducer }),
  userAnswer: Annotation<string | undefined>({ reducer: (_, update) => update }),

  // Subgraph-owned
  yourName: Annotation<YourState>({ reducer: yourStateReducer, default: () => DEFAULT_YOUR_STATE }),
});
```

### Step 4: Create Nodes (`nodes/*.ts`)
```typescript
import type { WorkflowDeps } from '../../../state';
import { YourAnnotation } from '../state';
import type { YourIntent } from '../types';

export const yourNode = (deps: WorkflowDeps) =>
  async (state: typeof YourAnnotation.State, config) => {
    // Use state.yourName.field1, not state.field1
    return {
      messages: [new AIMessage('Content...')],
      yourName: { field1: 'value' },
    };
  };
```

### Step 5: Compose Graph (`graph.ts`)
```typescript
import { StateGraph, START, END } from '@langchain/langgraph';
import type { WorkflowDeps } from '../../state';
import { YourAnnotation } from './state';
import { yourNode } from './nodes/yourNode';

export const createYourSubgraph = (deps: WorkflowDeps) => {
  const graph = new StateGraph(YourAnnotation)
    .addNode('yourNode', yourNode(deps))
    .addEdge(START, 'yourNode')
    .addEdge('yourNode', END);

  return graph.compile();
};
```

### Step 6: Export API (`index.ts`)
```typescript
export { createYourSubgraph } from './graph';
export { YourAnnotation, yourStateReducer } from './state';
export type { YourIntent, YourState } from './types';
export { DEFAULT_YOUR_STATE } from './types';

// Re-export nodes for testing
export { yourNode } from './nodes/yourNode';
```

### Step 7: Update Parent (`workflow/graph.ts`)
```typescript
import { createYourSubgraph } from './subgraphs/yourname';

const yourSubgraph = createYourSubgraph(deps);

const graph = new StateGraph(WorkflowStateAnnotation)
  .addNode('yourNode', yourSubgraph)
  // ...
```

---

## Import Patterns

### For Simple Nodes (`nodes/*.ts`)
```typescript
// ✅ GOOD: Minimal, clean imports
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
```

### For Subgraph Nodes (`subgraphs/*/nodes/*.ts`)
```typescript
// ✅ GOOD: Import from parent and local
import type { WorkflowDeps } from '../../../state';
import { YourAnnotation } from '../state';
import type { YourIntent } from '../types';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';

// ❌ DON'T import WorkflowStateAnnotation in subgraphs
// Each subgraph has its own annotation
```

### For Parent Graph (`workflow/graph.ts`)
```typescript
// ✅ GOOD: Import subgraphs from index
import { createTeachSubgraph } from './subgraphs/teach';
import { createPracticeSubgraph } from './subgraphs/practice';

// ❌ DON'T import internal nodes
// import { explainNode } from './subgraphs/teach/nodes/explain';  // Internal use only
```

---

## Node Implementation Patterns

### Pattern 1: Simple Node

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Stateless operation
  const result = await process(state.topic);

  return {
    messages: [new AIMessage(result.message)],
    stateField: result.value,
  };
};
```

**Characteristics:**
- Single function
- Uses parent `WorkflowStateAnnotation`
- No internal state management

---

### Pattern 2: Subgraph Node

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof YourAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Uses subgraph-specific state
  const value = state.yourName.field1;

  // May use interrupt for user interaction
  const resumeValue = await interrupt({ type: 'custom', prompt: 'Message' });

  return {
    messages: [new AIMessage('Response...')],
    userAnswer: resumeValue,
    yourName: { field1: 'new value' },
  };
};
```

**Characteristics:**
- Uses subgraph `YourAnnotation`
- May use interrupts
- Updates subgraph-owned state
- Part of internal graph flow

---

### Pattern 3: Assessment Node

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Log for debugging
  logger.debug('Assessing user', { topic: state.topic });

  // Perform assessment
  const result = await performAssessment(state);

  // Return user-facing feedback + internal state
  const feedbackMessage = `Assessment complete: ${result.score}%`;
  return {
    messages: [new AIMessage(feedbackMessage)],
    confidence: result.confidence,
    gaps: result.gaps,
  };
};
```

**Characteristics:**
- Returns AIMessage with assessment results
- Uses logs for internal tracking
- State updates for routing decisions
- No external tool execution (just AI analysis)

---

### Pattern 4: Tool Execution Node

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Execute external logic
  const exercises = await generateExercises(state.topic);

  // Stream content to user
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, exercises.content);
  emitter.textEnd(messageId);

  // Return message + structured data
  return {
    messages: [new AIMessage(exercises.content)],
    practicePrompt: exercises.content,  // For evaluation
    userAnswer: answer,  // Will be set later
  };
};
```

**Characteristics:**
- Executes external logic (AI generation)
- Returns AIMessage with generated content
- Uses text streaming for real-time feedback
- State updates for downstream nodes

---

### Pattern 5: Decision Node

```typescript
export const exampleNode = () => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Simple decision logic
  const mastery = state.mastery ?? 0;
  const isPassing = mastery >= 0.9;

  // Just return state - no messages needed
  return { ...state };
};
```

**Characteristics:**
- No user-facing content
- Pure orchestration decision
- Returns state only
- Decision logic in edges.ts

---

## Decision Tree

```
Does the node need to show content to the user?
├─ YES → Use AIMessage
│   └─ Should it stream in real-time?
│       ├─ YES → Use text emitters (textStart/textDelta/textEnd)
│       └─ NO → Just return AIMessage
└─ NO → Skip AIMessage

Is the node executing external tools?
├─ YES → Do other nodes need the structured results?
│   ├─ YES → Use ToolMessage with artifact
│   └─ NO → Just return state updates
│
└─ Does the user need to see tool execution progress?
    ├─ YES → Use text emitters to show progress (e.g., "Analyzing...", "Found results...")
    └─ NO → Silent operation
└─ NO → Just return state updates

Need to show progress/debug info?
├─ YES → Use logger.debug() (NOT tool lifecycle emitters)
└─ NO → Silent operation
```

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: ToolMessage for Internal State

```typescript
// BAD: Using ToolMessage just to return state
return {
  messages: [new AIMessage('Confidence: 75%')],
  new ToolMessage({
    tool_call_id: id,
    artifact: { confidence: 0.75 }  // Already in state!
  }),
  confidence: 0.75,
};
```

**Fix:**
```typescript
// GOOD: Just return state directly
return {
  messages: [new AIMessage('Confidence: 75%')],
  confidence: 0.75,  // State update is enough
};
```

---

### ❌ Anti-Pattern 2: Tool Lifecycle Emitters

```typescript
// BAD: Tool lifecycle emitters pollute UI
emitter.toolInputStart(toolCallId, nodeName);
emitter.toolInputAvailable(toolCallId, nodeName, params);
emitter.toolOutputAvailable(toolCallId, { data });

return { ...state };
```

**Fix:**
```typescript
// GOOD: Use logs for debugging
logger.debug('Node execution', { params, result });

// GOOD: Use text emitters for user-facing content
emitter.textDelta(messageId, 'Processing...');

return { ...state };
```

---

### ❌ Anti-Pattern 2b: No Tool Progress Feedback

```typescript
// BAD: User doesn't know tool is executing
const exercises = await generateExercises(state.topic);  // Long operation

return {
  messages: [new AIMessage('Here are your exercises...')],
  practicePrompt: exercises.content,
};
```

**Fix:**
```typescript
// GOOD: Show progress to user
const messageId = generateId('msg');
emitter.textStart(messageId);

emitter.textDelta(messageId, 'Generating practice exercises...');
const exercises = await generateExercises(state.topic);

emitter.textDelta(messageId, 'Here are your exercises!');
emitter.textEnd(messageId);

return {
  messages: [new AIMessage('Here are your exercises!')],
  practicePrompt: exercises.content,
};
```

---

### ❌ Anti-Pattern 3: Too Many Messages

```typescript
// BAD: Every node returns a message
return {
  messages: [new AIMessage('Analyzing...')],
};
return {
  messages: [new AIMessage('Searching...')],
};
return {
  messages: [new AIMessage('Calculating...')],
};
return {
  messages: [new AIMessage('Confidence: 75%')],  // User sees 4 messages!
};
```

**Fix:**
```typescript
// GOOD: Only return meaningful messages
// Steps 1-3: Silent operation with logs
logger.debug('Analyzing knowledge...');

// Step 4: Return user-facing result
return {
  messages: [new AIMessage('Confidence: 75%')],  // Only message user sees
  confidence: 0.75,
};
```

---

### ❌ Anti-Pattern 4: Missing User-Facing Content

```typescript
// BAD: No message when user should see something
return {
  practicePrompt: 'Solve these equations...',  // User never sees this!
  userAnswer: undefined,
};
```

**Fix:**
```typescript
// GOOD: Return AIMessage so user sees the content
return {
  messages: [new AIMessage('Solve these equations...')],  // User sees this
  practicePrompt: 'Solve these equations...',  // For evaluation
  userAnswer: undefined,
};
```

---

### ❌ Anti-Pattern 5: Circular Dependencies in Subgraphs

```typescript
// BAD: types.ts imports from workflow
import { WorkflowStateAnnotation } from '../../../state';

export type YourType = ...  // Creates cycle!
```

**Fix:**
```typescript
// GOOD: types.ts has ZERO imports
export type YourType = ...;

// Import in state.ts
import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { YourType } from './types';
```

---

### ❌ Anti-Pattern 6: Mixing Subgraph Annotations

```typescript
// BAD: Node uses wrong annotation
import { WorkflowStateAnnotation } from '../state';  // Parent annotation
import { YourAnnotation } from '../state';  // Subgraph annotation

export const yourNode = (deps: WorkflowDeps) =>
  async (state: typeof WorkflowStateAnnotation.State) => {  // Wrong!
    // ...
  };
```

**Fix:**
```typescript
// GOOD: Use subgraph annotation in subgraph nodes
export const yourNode = (deps: WorkflowDeps) =>
  async (state: typeof YourAnnotation.State) => {  // Correct!
    // ...
  };
```

---

## Testing Your Implementation

**Checklist:**

1. ✅ **Structure**
   - Simple node? → `nodes/` folder
   - Complex subgraph? → `subgraphs/` folder
   - Types in correct file (types.ts for subgraphs)

2. ✅ **Imports**
   - Subgraph types.ts has ZERO imports from workflow
   - Correct import paths (../../../state, not ../../state from nodes/)
   - Using subgraph annotation, not parent

3. ✅ **State**
   - Shared keys auto-mapped (topic, messages, userAnswer)
   - Subgraph-owned keys in nested object (teach.*, practice.*)
   - Reducers properly defined

4. ✅ **Messages**
   - User-facing content → AIMessage
   - Internal routing → state updates only
   - Tool execution → ToolMessage with artifact

5. ✅ **Emitters**
   - Text emitters for streaming user content
   - No tool lifecycle emitters
   - Logs for debugging

---

## Summary

**Remember:**
- **nodes/** = Simple, stateless operations
- **subgraphs/** = Complex, stateful workflows
- **types.ts** = Zero imports (base layer)
- **state.ts** = Annotations and reducers
- **nodes/*.ts** = Individual node functions
- **graph.ts** = Subgraph composition
- **AIMessages** = What the user experiences
- **State** = What nodes need
- **Logs** = What developers need
- **ToolMessages** = External tool execution with structured results

**No overlap, no confusion!** 🎯
