# Workflow Documentation

Welcome to the Learning Catalyst Workflow documentation. This directory contains comprehensive guides, diagrams, and references for understanding and working with the workflow system.

## 📁 Documentation Index

### Core Documentation

#### 1. [NODE-ROLE-USAGE.md](./NODE-ROLE-USAGE.md)
**Purpose**: Guide for using the workflow node role mapping system

**Contents**:
- Overview of TOOL vs ASSISTANT roles
- How role mapping works with assistant-ui
- Usage examples in components and handlers
- Best practices for node role assignment
- Adding new nodes to the role system
- Testing and validation patterns

**Key Topics**:
- Frontend component role-based rendering
- Message formatting with roles
- Graph building with role awareness
- Debugging and monitoring
- Migration from old systems

---

#### 2. [NORMALIZATION-USAGE.md](./NORMALIZATION-USAGE.md)
**Purpose**: Complete guide to data normalization utilities

**Contents**:
- Why normalization exists
- Core conversion functions (LangChain → OpenAI)
- API reference with TypeScript examples
- Use cases and patterns
- Testing strategies
- Troubleshooting guide

**Key Topics**:
- `convertToPlainMessage()` - LangChain to normalized format
- `normalizeWorkflowOutput()` - Main workflow entry point
- `createStructuredMessage()` - Tool messages
- `toOpenAIMessages()` - Final format for frontend
- Batch processing utilities
- Validation and type safety

---

### Visual Diagrams

#### 3. [workflow-graph-comprehensive.mmd](./workflow-graph-comprehensive.mmd)
**Purpose**: Mermaid diagram of the complete workflow graph

**Features**:
- All 13 workflow nodes with color-coded roles
- All edges (simple and conditional)
- Decision logic annotations
- Path flow visualization
- Example data flow
- Legend and styling

**Viewing**:
- Copy to [Mermaid Live Editor](https://mermaid.live)
- Import into GitHub/GitLab markdown
- Use with Mermaid CLI for rendering

---

#### 4. [WORKFLOW-ASCII-DIAGRAM.md](./WORKFLOW-ASCII-DIAGRAM.md)
**Purpose**: Text-based overview of the workflow graph

**Contents**:
- ASCII art flowchart
- Complete path descriptions
- Decision point logic
- State flow examples
- Threshold values
- File references

**Use Cases**:
- Quick reference in terminal/editor
- Copy-paste into issues/PRs
- Text-only environments
- Documentation in code comments

---

## 🎯 Quick Start

### Understanding the Workflow

1. **Start Here**: Read [WORKFLOW-ASCII-DIAGRAM.md](./WORKFLOW-ASCII-DIAGRAM.md) for a complete overview
2. **Visual Learners**: Open [workflow-graph-comprehensive.mmm](./workflow-graph-comprehensive.mmd) in Mermaid Live Editor
3. **Implementation**: Use [NODE-ROLE-USAGE.md](./NODE-ROLE-USAGE.md) for frontend integration
4. **Data Flow**: Reference [NORMALIZATION-USAGE.md](./NORMALIZATION-USAGE.md) for backend transformations

### For Frontend Developers

**Key Question**: How do I render workflow nodes?

**Answer**: Use role mapping!

```typescript
import { getOpenAIRole } from '@/main/services/domain/workflow/utils';

const role = getOpenAIRole(currentNode);
if (role === 'tool') {
  // Show rich structured UI
  renderStructuredDisplay(data);
} else {
  // Show standard chat UI
  renderChatInterface(messages);
}
```

**See**: [NODE-ROLE-USAGE.md](./NODE-ROLE-USAGE.md) - Section "Frontend Component"

### For Backend Developers

**Key Question**: How do I convert workflow output to frontend format?

**Answer**: Use normalization utilities!

```typescript
import { normalizeWorkflowOutput, toOpenAIMessages } from '@/main/services/domain/workflow/utils';

const normalized = normalizeWorkflowOutput(nodeName, nodeOutput);
const openaiMessages = toOpenAIMessages(normalized);

// Send to renderer
replyPort.postMessage(openaiMessages);
```

**See**: [NORMALIZATION-USAGE.md](./NORMALIZATION-USAGE.md) - Section "Handler Integration"

### For Workflow Developers

**Key Question**: How do I add a new workflow node?

**Steps**:

1. **Add to types.ts**:
   ```typescript
   export enum NodeName {
     NEW_NODE = 'NewNode',
   }
   ```

2. **Create node in nodes/**:
   ```typescript
   export const newNode = (deps: WorkflowDeps) => async (state) => {
     return { messages: [...], ...data };
   };
   ```

3. **Add to edges.ts**:
   ```typescript
   [NodeName.PREVIOUS, NodeName.NEW_NODE],
   ```

4. **Add role mapping**:
   ```typescript
   // In utils/role-mapping.ts
   [NodeName.NEW_NODE]: 'tool', // or 'assistant'
   ```

**See**:
- [NODE-ROLE-USAGE.md](./NODE-ROLE-USAGE.md) - "Adding New Nodes"
- [NORMALIZATION-USAGE.md](./NORMALIZATION-USAGE.md) - "Adding New Nodes Checklist"

## 🏗️ Architecture Overview

### Workflow Structure

```
┌─────────────────────────────────────────┐
│         Learning Catalyst                │
│            Workflow Graph                │
└─────────────────────────────────────────┘

13 Nodes Total:
├─ 7 TOOL Nodes (Structured Output)
└─ 6 ASSISTANT Nodes (Conversational)

3 Main Paths:
├─ Path A: Fast Track (High Confidence)
├─ Path B: Standard Learning (Low Confidence)
└─ Path C: Remediation Loop
```

### Data Flow

```
LangGraph Workflow
         ↓
   [Normalized Messages]
         ↓
   [OpenAI Format]
         ↓
   [IPC to Renderer]
         ↓
   [Assistant-UI Display]
```

### Node Roles

```
┌─────────────────────────────────────────┐
│  TOOL Nodes (7)                          │
│  ├─ TOPIC_PARSE                          │
│  ├─ ASSESS                               │
│  ├─ PLAN                                 │
│  ├─ FAST_TRACK_QUIZ                      │
│  ├─ GRADE_QUIZ                           │
│  ├─ PRACTICE                             │
│  └─ EVALUATE                             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ASSISTANT Nodes (6)                     │
│  ├─ TEACH                                │
│  ├─ QA                                   │
│  ├─ REMEDIATE                            │
│  ├─ MASTERY_CHECK                        │
│  ├─ BREAKER                              │
│  └─ COMPLETE                             │
└─────────────────────────────────────────┘
```

## 🔍 Key Concepts

### 1. Node Roles

**TOOL Nodes**: Produce structured output
- Rich UI with formatted data
- Interactive elements
- Score displays
- Charts and metrics
- Exercise generators

**ASSISTANT Nodes**: Conversational flow
- Natural dialogue
- Explanations
- Q&A interactions
- Support messages

### 2. Interrupt Handling

Nodes can pause and wait for user input:

```typescript
// FAST_TRACK_QUIZ
return {
  messages: [quizMessage],
  interrupt: 'wait_for_answer',  // Workflow pauses here
  state: { questions, answers }
};
```

### 3. Normalization

Converts LangChain format to OpenAI format:

```typescript
// Before: LangChain (with lc_kwargs)
{ lc_serializable: true, lc_kwargs: { role: 'assistant', content: 'Hello' } }

// After: OpenAI (plain object)
{ role: 'assistant', content: 'Hello' }
```

### 4. Decision Points

Conditional routing based on state:

```typescript
[NodeName.ASSESS]: (state) => {
  return state.confidence >= 0.7
    ? NodeName.FAST_TRACK_QUIZ  // Path A
    : NodeName.TEACH;           // Path B
}
```

## 📊 Flow Paths

### Path A: Fast Track Assessment
**When**: High confidence (≥ 70%)
**Flow**: START → ASSESS → FAST_TRACK_QUIZ → GRADE_QUIZ → COMPLETE
**Use Case**: Expert users, quick assessment

### Path B: Standard Learning
**When**: Low confidence (< 70%)
**Flow**: START → ASSESS → TEACH → QA → PRACTICE → EVALUATE → MASTERY_CHECK
**Use Case**: New learners, comprehensive approach

### Path C: Remediation
**When**: Practice attempts failed
**Flow**: PRACTICE → EVALUATE → REMEDIATE → PRACTICE (loop)
**Use Case**: Targeted help, alternative explanations

### Path D: Circuit Breaker
**When**: Too many failed attempts (≥ 5)
**Flow**: EVALUATE → BREAKER → END
**Use Case**: Prevent infinite loops, offer support

## 🧪 Testing

### Unit Tests

**Node Tests**: `src/main/services/domain/workflow/__tests__/*`
- Individual node behavior
- State transformations
- Interrupt handling

**Graph Tests**: `workflow-graph.test.ts`
- Edge validation
- Path coverage
- Decision logic

**Normalization Tests**: In respective test files
- Message conversion
- Type safety
- Edge cases

### Running Tests

```bash
# All workflow tests
npm run test:main -- workflow

# Specific node
npm run test:main -- assess-node

# Graph validation
npm run test:main -- workflow-graph
```

## 🔧 Configuration

### Thresholds

```typescript
// src/main/services/domain/workflow/thresholds.ts
export const THRESHOLDS = {
  CONFIDENCE_FAST_TRACK: 0.7,    // 70% - Fast track threshold
  MASTERY_PASS: 0.7,             // 70% - Minimum passing score
  MASTERY_COMPLETE: 0.9,         // 90% - Completion threshold
  BREAKER_ATTEMPTS: 5            // 5 attempts - Circuit breaker
};
```

### Adjusting Thresholds

**Development** (easier progression):
```typescript
CONFIDENCE_FAST_TRACK: 0.5,  // 50%
MASTERY_COMPLETE: 0.8,       // 80%
```

**Production** (stricter):
```typescript
CONFIDENCE_FAST_TRACK: 0.8,  // 80%
MASTERY_COMPLETE: 0.95,      // 95%
```

## 📝 Best Practices

### 1. Use Role Mapping

```typescript
// ✅ Good
const role = getOpenAIRole(nodeName);
renderByRole(role, data);

// ❌ Bad
if (nodeName === 'Practice' || nodeName === 'Assess') {
  renderTool(data);
}
```

### 2. Use Normalization Utilities

```typescript
// ✅ Good
const messages = normalizeWorkflowOutput(nodeName, output);

// ❌ Bad
const messages = output.messages?.map(m => convertToPlainMessage(m));
```

### 3. Add JSDoc for Nodes

```typescript
/**
 * PRACTICE - Generate practice exercises
 *
 * Purpose: Create interactive exercises for skill practice
 * Output: Structured exercises with steps and hints
 * Role: 'tool' - Rich UI for exercise display
 * Interrupt: Waits for user completion
 */
export const practiceNode = ...
```

### 4. Validate at Boundaries

```typescript
// In handler
if (!validateNormalizedMessages(messages)) {
  throw new Error('Invalid message format');
}
```

## 🐛 Troubleshooting

### Common Issues

**1. Node Not Rendering Correctly**
- Check role mapping in `utils/role-mapping.ts`
- Verify frontend uses `getOpenAIRole()`
- Ensure assistant-ui supports the role

**2. Message Conversion Errors**
- Check for `lc_kwargs` in LangChain messages
- Validate with `validateNormalizedMessage()`
- Review normalization documentation

**3. Missing Edges**
- Verify all nodes in `SIMPLE_EDGES` or `CONDITIONALS`
- Check decision logic returns valid node names
- Run graph validation tests

**4. Type Errors**
- Import proper types from normalization module
- Use `NormalizedMessage` interface (not `any`)
- Check NodeName enum values

**Debug Tools**

```typescript
// Log role mapping
console.log('Node role:', getOpenAIRole(nodeName));

// Validate mappings
validateNodeRoleMappings();

// Check normalization
const normalized = normalizeWorkflowOutput(node, output);
console.log('Normalized:', normalized);
```

## 📚 Additional Resources

### Code Files

- **Graph**: `src/main/services/domain/workflow/graph.ts`
- **Edges**: `src/main/services/domain/workflow/edges.ts`
- **Types**: `src/main/services/domain/workflow/types.ts`
- **Role Mapping**: `src/main/services/domain/workflow/utils/role-mapping.ts`
- **Normalization**: `src/main/services/domain/workflow/utils/normalization.ts`

### Related Documentation

- [Product Blueprint](../../product-blueprint.md) - User-focused vision
- [Developer Guide](../DEVELOPER-GUIDE/) - General development guide
- [Testing Guide](../DEVELOPER-GUIDE/testing.md) - Test strategies

### External Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Assistant UI](https://assistant-ui.com/)
- [Mermaid Diagrams](https://mermaid.js.org/)

## 🤝 Contributing

When adding new nodes or modifying the workflow:

1. **Update documentation** in this directory
2. **Add tests** in `__tests__/` directory
3. **Update diagrams** (both Mermaid and ASCII)
4. **Validate role mapping** for new nodes
5. **Add JSDoc** explaining the node's purpose
6. **Run all tests** before submitting

## 📝 Changelog

### Recent Changes

- **Dec 8, 2025**: Consolidated normalization utilities
- **Dec 8, 2025**: Simplified role mapping system
- **Dec 8, 2025**: Removed WAIT nodes (merged into parents)
- **Dec 8, 2025**: Created comprehensive documentation

---

**Need Help?**

1. Check the relevant documentation file
2. Review the ASCII diagram for flow
3. Look at existing node implementations
4. Run tests to validate behavior
5. Ask in team chat with `@workflow` tag
