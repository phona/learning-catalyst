# Data Normalization Utilities - Usage Guide

## Overview

This document explains how to use the data normalization utilities to transform workflow output into OpenAI message format for frontend rendering.

## Quick Start

### Basic Message Conversion

```typescript
import { convertToPlainMessage } from '@/main/services/domain/workflow/utils';

const langchainMessage = new AIMessage('Hello');
const normalized = convertToPlainMessage(langchainMessage, 'Teach');

// Returns: { role: 'assistant', content: 'Hello', agentType: 'learning', workflowNode: 'Teach' }
```

### Creating Structured Messages

```typescript
import { createStructuredMessage } from '@/main/services/domain/workflow/utils';

const message = createStructuredMessage(
  NodeName.PRACTICE,
  {
    exercises: [
      { id: '1', title: 'Exercise 1', steps: ['Step 1', 'Step 2'] }
    ],
    summary: 'Practice exercises for topic'
  },
  'practice_exercises'
);

// Returns tool message with structured content
```

## Core Concepts

### Why Normalization?

1. **LangChain Format → OpenAI Format**
   - LangChain uses internal serialization (`lc_kwargs`, `lc_serializable`)
   - OpenAI API expects plain objects
   - Normalization bridges this gap

2. **Metadata Enrichment**
   - Attach agent type to each message
   - Track which workflow node generated it
   - Add timestamps and other metadata

3. **Consistency**
   - All messages follow same structure
   - Easier to test and debug
   - Predictable behavior across the codebase

### Message Flow

```
┌─────────────────────┐
│  Workflow Node      │
│  Output             │
│  (LangChain format) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  normalizeWorkflow  │
│  Output()           │
│                     │
│  • Extract messages │
│  • Convert format   │
│  • Add metadata     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  NormalizedMessage  │
│                     │
│  {                  │
│    role,            │
│    content,         │
│    agentType,       │
│    workflowNode,    │
│    metadata         │
│  }                  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  toOpenAIMessage()  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  OpenAI Message     │
│                     │
│  {                  │
│    role: 'tool',    │
│    content: {...}   │
│  }                  │
└─────────────────────┘
```

## API Reference

### Type Definitions

#### NormalizedMessage

```typescript
interface NormalizedMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  agentType?: string;
  workflowNode?: string;
  metadata?: Record<string, unknown>;
}
```

**Fields:**
- `role` - Message role (user/assistant/tool)
- `content` - Message content (string or JSON)
- `agentType` - Optional agent type (assessment/learning/practice/tutoring)
- `workflowNode` - Optional workflow node name
- `metadata` - Optional additional metadata

#### OpenAIMessage

```typescript
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | Record<string, unknown>;
}
```

**Fields:**
- `role` - Message role
- `content` - String for assistant/user, object for tool

### Core Functions

#### convertToPlainMessage()

Converts LangChain messages to normalized format.

```typescript
function convertToPlainMessage(
  msg: InputMessage,
  nodeName?: string
): NormalizedMessage
```

**Parameters:**
- `msg` - LangChain BaseMessage or plain message object
- `nodeName` - Optional workflow node name for metadata

**Returns:** NormalizedMessage with role, content, agentType, workflowNode

**Usage:**
```typescript
// LangChain message
const msg = new AIMessage('Hello');
const normalized = convertToPlainMessage(msg, 'Teach');

// Plain message
const plainMsg = { role: 'user', content: 'Hi' };
const normalized = convertToPlainMessage(plainMsg);
```

#### convertMessagesToPlain()

Batch converts an array of messages.

```typescript
function convertMessagesToPlain(
  messages: InputMessage[],
  nodeName?: string
): NormalizedMessage[]
```

**Usage:**
```typescript
const messages = [msg1, msg2, msg3];
const normalized = convertMessagesToPlain(messages, 'Practice');
```

#### normalizeWorkflowOutput()

Main entry point for normalizing workflow node output.

```typescript
function normalizeWorkflowOutput(
  nodeName: NodeName,
  nodeOutput: WorkflowNodeOutput
): NormalizedMessage[]
```

**Parameters:**
- `nodeName` - Workflow node name (enum value)
- `nodeOutput` - Raw output from workflow node

**Usage:**
```typescript
import { normalizeWorkflowOutput } from '@/main/services/domain/workflow/utils';

const nodeOutput = {
  messages: [...],
  practicePrompt: '...',
  userAnswer: '...'
};

const normalized = normalizeWorkflowOutput(NodeName.PRACTICE, nodeOutput);
```

#### createStructuredMessage()

Creates a tool message from structured data.

```typescript
function createStructuredMessage(
  nodeName: NodeName,
  data: unknown,
  messageType?: string
): NormalizedMessage
```

**Usage:**
```typescript
const message = createStructuredMessage(
  NodeName.GRADE_QUIZ,
  {
    score: 95,
    correct: true,
    feedback: 'Well done!'
  },
  'grading_result'
);
```

#### createAssistantMessage()

Creates an assistant message from text content.

```typescript
function createAssistantMessage(
  nodeName: NodeName,
  content: string
): NormalizedMessage
```

**Usage:**
```typescript
const message = createAssistantMessage(NodeName.TEACH, 'Let me explain...');
```

#### toOpenAIMessage()

Converts normalized message to OpenAI format.

```typescript
function toOpenAIMessage(message: NormalizedMessage): OpenAIMessage
```

**Usage:**
```typescript
const normalized = convertToPlainMessage(langchainMessage);
const openaiMessage = toOpenAIMessage(normalized);
```

#### toOpenAIMessages()

Batch converts to OpenAI format.

```typescript
function toOpenAIMessages(messages: NormalizedMessage[]): OpenAIMessage[]
```

**Usage:**
```typescript
const normalized = normalizeWorkflowOutput(NodeName.PRACTICE, output);
const openaiMessages = toOpenAIMessages(normalized);
```

#### createIPCMessage()

Creates IPC-ready message structure.

```typescript
function createIPCMessage(
  conversationId: string,
  nodeName: NodeName,
  nodeOutput: WorkflowNodeOutput
): IPCMessage
```

**Usage:**
```typescript
const ipcMessage = createIPCMessage('thread_123', NodeName.PRACTICE, nodeOutput);
// Returns: { conversationId, messages: [...], metadata: {...} }
```

### Utility Functions

#### getAgentType()

Gets agent type for a node name.

```typescript
function getAgentType(nodeName: string): string
```

**Returns:** 'assessment', 'learning', 'practice', or 'tutoring'

#### getAgentTypeFromNodeName()

Gets agent type from NodeName enum.

```typescript
function getAgentTypeFromNodeName(nodeName: NodeName): string
```

#### isToolNode(), isAssistantNode()

Check node role.

```typescript
function isToolNode(nodeName: NodeName): boolean
function isAssistantNode(nodeName: NodeName): boolean
```

#### getToolNodes(), getAssistantNodes()

Get all nodes of a specific role.

```typescript
function getToolNodes(): NodeName[]
function getAssistantNodes(): NodeName[]
```

## Use Cases

### 1. Handler Integration (Main Process)

**Converting workflow output in IPC handler:**

```typescript
import { normalizeWorkflowOutput, toOpenAIMessages } from '@/main/services/domain/workflow/utils';

for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
  if (!nodeOutput.messages) continue;

  // Normalize the output
  const normalizedMessages = normalizeWorkflowOutput(
    nodeName as NodeName,
    nodeOutput
  );

  // Convert to OpenAI format
  const openaiMessages = toOpenAIMessages(normalizedMessages);

  // Send to renderer
  replyPort.postMessage(openaiMessages);
}
```

### 2. Node Implementation

**Creating structured messages in workflow nodes:**

```typescript
import { createStructuredMessage } from '@/main/services/domain/workflow/utils';

export const gradeQuizNode = (deps: WorkflowDeps) => async (state) => {
  // Grade the quiz...
  const score = 95;

  // Create structured message for result
  const message = createStructuredMessage(
    NodeName.GRADE_QUIZ,
    {
      score,
      correct: true,
      feedback: 'Excellent work!'
    },
    'grading_result'
  );

  return {
    messages: [message],
    mastery: score / 100
  };
};
```

### 3. Message Validation

**Validating message format:**

```typescript
import { validateNormalizedMessage } from '@/main/services/domain/workflow/utils';

function processMessage(message: unknown) {
  if (!validateNormalizedMessage(message)) {
    throw new Error('Invalid message format');
  }

  // Process validated message
  console.log(`Role: ${message.role}, Content: ${message.content}`);
}
```

### 4. Metadata Enrichment

**Adding custom metadata:**

```typescript
import { addMessageMetadata } from '@/main/services/domain/workflow/utils';

const message = createAssistantMessage(NodeName.TEACH, 'Hello');
const enhanced = addMessageMetadata(message, {
  source: 'workflow',
  sessionId: '123',
  priority: 'high'
});
```

### 5. IPC Message Creation

**Creating IPC-ready messages:**

```typescript
import { createIPCMessage } from '@/main/services/domain/workflow/utils';

const ipcMessage = createIPCMessage(
  conversationId,
  NodeName.PRACTICE,
  nodeOutput
);

// Send via IPC
event.sender.send('chat:stream', {
  conversationId: ipcMessage.conversationId,
  messages: ipcMessage.messages,
  metadata: ipcMessage.metadata
});
```

## Message Type Examples

### Assistant Message (Conversational)

```typescript
{
  role: 'assistant',
  content: 'Let me explain French geography to you...',
  agentType: 'learning',
  workflowNode: 'Teach',
  metadata: {
    messageType: 'assistant_response',
    timestamp: 1704067200000
  }
}
```

### Tool Message (Structured Data)

```typescript
{
  role: 'tool',
  content: JSON.stringify({
    type: 'practice_exercises',
    nodeName: 'Practice',
    data: {
      exercises: [
        {
          id: '1',
          title: 'Identify the capital',
          steps: ['Think about government seat'],
          hints: ['Eiffel Tower location']
        }
      ]
    },
    timestamp: 1704067200000
  }),
  agentType: 'practice',
  workflowNode: 'Practice',
  metadata: {
    messageType: 'practice_exercises',
    timestamp: 1704067200000
  }
}
```

## Best Practices

### 1. Use normalizeWorkflowOutput()

**DO:**
```typescript
const messages = normalizeWorkflowOutput(nodeName, nodeOutput);
```

**DON'T:**
```typescript
const messages = nodeOutput.messages?.map(m => convertToPlainMessage(m)) || [];
```

The normalization function handles all edge cases and metadata.

### 2. Validate Messages

**DO:**
```typescript
if (!validateNormalizedMessage(message)) {
  throw new Error('Invalid message');
}
```

**DON'T:**
```typescript
// Assuming message is valid
processMessage(message);
```

### 3. Use Proper Types

**DO:**
```typescript
import type { NormalizedMessage } from '@/main/services/domain/workflow/utils';

function processMessages(messages: NormalizedMessage[]) {
  // Type-safe processing
}
```

**DON'T:**
```typescript
function processMessages(messages: any[]) {
  // No type safety
}
```

### 4. Batch Process Messages

**DO:**
```typescript
const openaiMessages = toOpenAIMessages(normalizedMessages);
```

**DON'T:**
```typescript
const openaiMessages = normalizedMessages.map(m => toOpenAIMessage(m));
```

### 5. Add Metadata for Debugging

**DO:**
```typescript
const message = createStructuredMessage(nodeName, data);
const withMeta = addMessageMetadata(message, { source: 'workflow' });
```

**DON'T:**
```typescript
const message = createStructuredMessage(nodeName, data);
// No metadata for debugging
```

## Common Patterns

### Pattern 1: Handler Transformation

```typescript
// In langgraph-handler.ts
for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
  const normalized = normalizeWorkflowOutput(nodeName as NodeName, nodeOutput);
  const openaiMessages = toOpenAIMessages(normalized);

  for (const message of openaiMessages) {
    replyPort.postMessage(message);
  }
}
```

### Pattern 2: Node Output

```typescript
// In workflow node
export const practiceNode = (deps: WorkflowDeps) => async (state) => {
  // Generate exercises
  const exercises = await generateExercises(deps, state);

  // Create structured message
  const message = createStructuredMessage(
    NodeName.PRACTICE,
    exercises,
    'practice_exercises'
  );

  return {
    messages: [message],
    practicePrompt: exercises.summary
  };
};
```

### Pattern 3: IPC Creation

```typescript
// Create IPC message
const ipcMessage = createIPCMessage(conversationId, nodeName, nodeOutput);

// Send to renderer
event.sender.send('chat:stream', {
  conversationId: ipcMessage.conversationId,
  messages: ipcMessage.messages,
  metadata: ipcMessage.metadata
});
```

## Testing

### Unit Tests

```typescript
import { convertToPlainMessage, createStructuredMessage } from '@/main/services/domain/workflow/utils';

describe('Normalization Utilities', () => {
  describe('convertToPlainMessage', () => {
    it('converts LangChain message', () => {
      const msg = new AIMessage('Hello');
      const normalized = convertToPlainMessage(msg, 'Teach');

      expect(normalized.role).toBe('assistant');
      expect(normalized.content).toBe('Hello');
      expect(normalized.agentType).toBe('learning');
      expect(normalized.workflowNode).toBe('Teach');
    });
  });

  describe('createStructuredMessage', () => {
    it('creates tool message with structured data', () => {
      const message = createStructuredMessage(
        NodeName.PRACTICE,
        { exercises: [] },
        'practice'
      );

      expect(message.role).toBe('tool');
      expect(message.agentType).toBe('practice');
      expect(message.workflowNode).toBe('Practice');
      expect(JSON.parse(message.content).type).toBe('practice');
    });
  });
});
```

### Integration Tests

```typescript
import { normalizeWorkflowOutput } from '@/main/services/domain/workflow/utils';

describe('Workflow Normalization', () => {
  it('normalizes workflow node output', () => {
    const nodeOutput = {
      messages: [new AIMessage('Test')],
      data: 'some data'
    };

    const normalized = normalizeWorkflowOutput(NodeName.TEACH, nodeOutput);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].workflowNode).toBe('Teach');
  });
});
```

## Troubleshooting

### Message Not Converting

**Problem:** Message content is empty or malformed

**Solution:**
1. Check if message has `lc_kwargs` or is plain object
2. Ensure message has `role` and `content` fields
3. Validate with `validateNormalizedMessage()`

### Missing Metadata

**Problem:** agentType or workflowNode not attached

**Solution:**
1. Ensure `nodeName` is passed to conversion function
2. Check node name is in NODE_NAME_TO_AGENT_TYPE mapping
3. Verify node name matches exactly (case-sensitive)

### Content Not JSON

**Problem:** Tool message content is string, not object

**Solution:**
1. Ensure `toOpenAIMessage()` is called after normalization
2. Check message role is 'tool'
3. Verify JSON.parse doesn't fail

### Type Errors

**Problem:** TypeScript errors with message types

**Solution:**
1. Import proper types from normalization module
2. Use `NormalizedMessage` interface for typed variables
3. Don't use `any` type - it defeats the purpose

## Migration from Old Code

### Old Approach

```typescript
// In langgraph-handler.ts
const convertToPlainMessage = (msg: any, nodeName?: string) => {
  const result = {
    role: msg.lc_kwargs?.role || 'assistant',
    content: typeof msg.lc_kwargs?.content === 'string'
      ? msg.lc_kwargs.content
      : JSON.stringify(msg.lc_kwargs?.content || ''),
  };
  if (nodeName) {
    result.agentType = getAgentTypeFromNode(nodeName);
    result.workflowNode = nodeName;
  }
  return result;
};
```

### New Approach

```typescript
// Import from utils
import { convertToPlainMessage } from '@/main/services/domain/workflow/utils';

// Use directly
const normalized = convertToPlainMessage(message, nodeName);
```

**Benefits:**
- ✅ No duplicate code
- ✅ Type-safe
- ✅ Well-documented
- ✅ Tested
- ✅ Reusable

## FAQ

**Q: When should I use createStructuredMessage vs createAssistantMessage?**
A: Use `createStructuredMessage` for tool messages with data objects. Use `createAssistantMessage` for conversational text responses.

**Q: How do I add custom metadata to messages?**
A: Use `addMessageMetadata()` function to enrich messages with additional data.

**Q: Can I validate messages before sending?**
A: Yes, use `validateNormalizedMessage()` and `validateNormalizedMessages()` for runtime validation.

**Q: What's the difference between normalizeWorkflowOutput and convertToPlainMessage?**
A: `normalizeWorkflowOutput` is for workflow node output. `convertToPlainMessage` is for individual messages.

**Q: Do I need to call toOpenAIMessage after normalization?**
A: Yes, if you're sending messages to the frontend via IPC. The OpenAI format is what assistant-ui expects.

**Q: How do I handle errors in message conversion?**
A: The utilities throw errors for invalid input. Wrap in try/catch if needed.

**Q: Can I use these utilities in renderer process?**
A: No, these are main-process utilities. The renderer receives already-normalized messages.
