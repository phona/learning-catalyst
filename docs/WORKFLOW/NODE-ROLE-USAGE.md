# Workflow Node Role Mapping - Usage Guide

## Overview

This document explains how to use the workflow node role mapping system to enable proper UI rendering with assistant-ui.

## Quick Start

### Basic Usage

```typescript
import { getOpenAIRole, isToolNode } from '@/main/services/domain/workflow/utils';

// Get OpenAI role for a node
const role = getOpenAIRole(NodeName.PRACTICE);
// Returns: 'tool'

// Check if node produces structured output
if (isToolNode(currentNode)) {
  // Show rich UI
  renderStructuredDisplay(data);
}
```

## Use Cases

### 1. Frontend Component (Renderer Process)

**Determining how to render a node:**

```typescript
import type { NodeName } from '@/main/services/domain/workflow/types';
import { getOpenAIRole, isToolNode } from '@/main/services/domain/workflow/utils';

interface NodeRendererProps {
  nodeName: NodeName;
  nodeData: any;
  messages: any[];
}

function NodeRenderer({ nodeName, nodeData, messages }: NodeRendererProps) {
  const openAIRole = getOpenAIRole(nodeName);

  if (openAIRole === 'tool') {
    // Tool nodes get rich structured UI
    return (
      <div className="tool-node">
        <StructuredDisplay data={nodeData} />
        <DebugPanel nodeName={nodeName} />
      </div>
    );
  }

  // Assistant nodes use standard chat UI
  return (
    <div className="assistant-node">
      <ChatInterface messages={messages} />
    </div>
  );
}
```

### 2. Message Formatting (Main Process)

**Converting workflow output to OpenAI messages:**

```typescript
import { NodeName } from '@/main/services/domain/workflow/types';
import { getOpenAIRole } from '@/main/services/domain/workflow/utils';

function createMessageForNode(
  nodeName: NodeName,
  nodeOutput: any
): OpenAIMessage {
  const role = getOpenAIRole(nodeName);

  if (role === 'tool') {
    // Tool nodes return structured data
    return {
      role: 'tool',
      content: {
        type: 'workflow_output',
        nodeName,
        data: nodeOutput
      }
    };
  }

  // Assistant nodes return text
  return {
    role: 'assistant',
    content: nodeOutput.content || ''
  };
}
```

### 3. Graph Building (Main Process)

**Grouping nodes by role for enhanced processing:**

```typescript
import { getToolNodes, getAssistantNodes } from '@/main/services/domain/workflow/utils';

function createWorkflowGraph(deps: WorkflowDeps) {
  const graph = new StateGraph(WorkflowStateAnnotation);

  // Add tool nodes with enhanced logging
  const toolNodes = getToolNodes();
  toolNodes.forEach(nodeName => {
    const nodeFn = getNodeFunction(nodeName, deps);
    const enhancedNode = withDebugLogging(nodeFn, nodeName);
    graph.addNode(nodeName, enhancedNode);
  });

  // Add assistant nodes with conversational flow
  const assistantNodes = getAssistantNodes();
  assistantNodes.forEach(nodeName => {
    const nodeFn = getNodeFunction(nodeName, deps);
    const enhancedNode = withConversationalFlow(nodeFn);
    graph.addNode(nodeName, enhancedNode);
  });

  return graph;
}
```

### 4. Debugging and Monitoring

**Logging node role information:**

```typescript
import { getOpenAIRole, isToolNode } from '@/main/services/domain/workflow/utils';

function logNodeExecution(nodeName: NodeName, output: any) {
  const role = getOpenAIRole(nodeName);

  if (isToolNode(nodeName)) {
    console.log(`[TOOL NODE] ${nodeName}:`, {
      role,
      hasStructuredData: typeof output === 'object',
      dataKeys: Object.keys(output || {})
    });
  } else {
    console.log(`[ASSISTANT NODE] ${nodeName}:`, {
      role,
      contentLength: output.content?.length || 0
    });
  }
}
```

### 5. Validation

**Ensuring all nodes have role mappings:**

```typescript
import { validateNodeRoleMappings } from '@/main/services/domain/workflow/utils';

// Call at application startup
validateNodeRoleMappings();
// Throws error if any nodes are missing mappings
```

## Node Role Reference

### Tool Nodes (Structured Output)

Nodes that produce structured data benefit from rich UI rendering:

- **TOPIC_PARSE** - Concept extraction with validation UI
- **ASSESS** - Confidence analysis with metrics display
- **PLAN** - Session blueprint with structured plan UI
- **FAST_TRACK_QUIZ** - Interactive quiz with input fields
- **GRADE_QUIZ** - Score breakdown with color-coded results
- **PRACTICE** - Exercise display with steps and hints
- **EVALUATE** - Performance metrics with charts

### Assistant Nodes (Conversational)

Nodes that facilitate natural dialogue:

- **TEACH** - Conversational explanations
- **QA** - Interactive Q&A flow
- **REMEDIATE** - Back-and-forth help
- **MASTERY_CHECK** - Decision dialogue
- **BREAKER** - Supportive messaging
- **COMPLETE** - Completion conversation

## Common Patterns

### Pattern 1: Role-Based Rendering

```typescript
switch (getOpenAIRole(nodeName)) {
  case 'tool':
    return <RichNodeUI data={nodeData} />;
  case 'assistant':
    return <ChatInterface messages={messages} />;
}
```

### Pattern 2: Tool Node Detection

```typescript
if (isToolNode(nodeName)) {
  // Enable debug features
  enableDebugPanel();
  enableStructuredDisplay();
}
```

### Pattern 3: Message Creation

```typescript
const messages = workflowOutput.map(output => {
  const role = getOpenAIRole(output.nodeName);
  return {
    role,
    content: role === 'tool' ? output.data : output.text
  };
});
```

## Adding New Nodes

When adding a new workflow node:

1. **Add to types.ts:**
   ```typescript
   export enum NodeName {
     NEW_NODE = 'NewNode',
   }
   ```

2. **Add to role mapping** in `utils/role-mapping.ts`:
   ```typescript
   [NodeName.NEW_NODE]: 'tool', // or 'assistant'
   ```

3. **Choose the role:**
   - `tool` - Produces structured data (objects, arrays, formatted output)
   - `assistant` - Conversational (dialogue, explanations, Q&A)

4. **Add documentation** with JSDoc explaining the node's purpose and UI needs

## Migration from Old Systems

If you're migrating from a more complex role system:

### Old Approach (Don't Do This)
```typescript
// Complex role registry
const ROLE_METADATA = {
  [NodeName.PRACTICE]: {
    role: 'tool',
    category: 'interactive',
    uiPriority: 'high',
    debuggable: true,
    hasArtifacts: true
  }
};
```

### New Approach (Do This)
```typescript
// Simple direct mapping
const ROLE = {
  [NodeName.PRACTICE]: 'tool'
};
```

## Testing

### Unit Tests

```typescript
import { getOpenAIRole, isToolNode } from '@/main/services/domain/workflow/utils';

describe('Node Role Mapping', () => {
  it('maps PRACTICE to tool role', () => {
    expect(getOpenAIRole(NodeName.PRACTICE)).toBe('tool');
    expect(isToolNode(NodeName.PRACTICE)).toBe(true);
  });

  it('maps TEACH to assistant role', () => {
    expect(getOpenAIRole(NodeName.TEACH)).toBe('assistant');
    expect(isAssistantNode(NodeName.TEACH)).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { getToolNodes, getAssistantNodes } from '@/main/services/domain/workflow/utils';

describe('Node Categorization', () => {
  it('correctly categorizes all nodes', () => {
    const toolNodes = getToolNodes();
    const assistantNodes = getAssistantNodes();
    const allNodes = [...toolNodes, ...assistantNodes];

    expect(allNodes).toHaveLength(Object.values(NodeName).length);
  });
});
```

## Best Practices

1. **Always use the mapping functions** - Don't hardcode role checks
2. **Keep node logic simple** - Let the mapping handle categorization
3. **Document new nodes** - Explain why they use tool vs assistant role
4. **Run validation at startup** - Catch missing mappings early
5. **Test role assignments** - Ensure new nodes render correctly

## Troubleshooting

### Node Not Rendering Correctly

1. Check if node is in the mapping
2. Verify role assignment (tool vs assistant)
3. Ensure frontend uses `getOpenAIRole()` correctly

### Missing Role Error

1. Run `validateNodeRoleMappings()` at startup
2. Add missing node to mapping
3. Check for typos in NodeName

### Wrong UI Display

1. Verify node's intended role (structured vs conversational)
2. Check if frontend is using the role correctly
3. Test with assistant-ui Thread component

## FAQ

**Q: When should I use 'tool' vs 'assistant'?**
A: Use 'tool' for structured output (objects, arrays, formatted data). Use 'assistant' for natural conversation.

**Q: Can a node be both tool and assistant?**
A: No, each node has one primary role. If needed, split into two nodes.

**Q: What about decision nodes?**
A: Decision nodes like MASTERY_CHECK use 'assistant' since they're conversational checkpoints.

**Q: How do I add custom UI for a tool node?**
A: Don't! assistant-ui handles tool node rendering automatically. Just provide the structured data.

**Q: What if I need different rendering for different tool nodes?**
A: Use the node name as a discriminator in your frontend component, not separate roles.
