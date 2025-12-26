# Design: Reasoning Content Support in stream-llm.ts

## Overview

This document describes the technical design for extending `streamLLM()` to detect, emit, and return reasoning content from LLM models.

## Architecture

### Current State

```
streamLLM(options: StreamLLMOptions): Promise<string>
├── Streaming Mode (streamMode === true)
│   ├── model.stream(messages) → chunks
│   ├── For each chunk: extract chunk.content (string)
│   ├── Emit: text-start → text-delta* → text-end
│   └── Return: accumulated content string
└── Non-Streaming Mode (streamMode !== true)
    ├── model.invoke(messages) → response
    ├── Emit: text-start → text-delta → text-end (if hasWriter)
    └── Return: response.content string
```

### Target State

```
streamLLM(options: StreamLLMOptions): Promise<StreamLLMResult>
├── Streaming Mode (streamMode === true)
│   ├── model.stream(messages) → chunks
│   ├── For each chunk:
│   │   ├── Check chunk.content structure
│   │   ├── If string: emit as text-delta
│   │   ├── If array: parse content blocks
│   │   │   ├── block.type === 'text': emit text-delta
│   │   │   └── block.type === 'reasoning': emit reasoning-delta
│   ├── Emit: text-start, reasoning-start → deltas → reasoning-end, text-end
│   └── Return: { content, reasoning? }
└── Non-Streaming Mode (streamMode !== true)
    ├── model.invoke(messages) → response
    ├── Parse response.content for reasoning blocks
    ├── Emit: text-start, reasoning-start (if any) → deltas → reasoning-end (if any), text-end
    └── Return: { content, reasoning? }
```

## Data Structures

### LangChain Content Block Types

```typescript
// From @langchain/core/dist/messages/content/index.d.ts

// Standard text block
interface TextBlock {
  type: 'text';
  text: string;
  index?: number;
}

// Reasoning block (NEW for us)
interface ReasoningBlock {
  type: 'reasoning';
  reasoning: string;
  index?: number;
}

// Content can be either:
type MessageContent = string | Array<TextBlock | ReasoningBlock | ...>;
```

### New Return Type

```typescript
export interface StreamLLMResult {
  /** Main response content */
  content: string;

  /** Optional reasoning/thinking content */
  reasoning?: string;
}
```

### Chunk Emission Protocol (Extended)

```
# Without reasoning
text-start → [text-delta, ...] → text-end

# With reasoning
reasoning-start → [reasoning-delta, ...] → reasoning-end → text-start → [text-delta, ...] → text-end
```

**Note:** Reasoning is emitted before text, matching typical model behavior where thinking precedes response.

## Implementation Details

### 1. Content Block Detection Helper

```typescript
/**
 * Extract reasoning delta from a chunk
 * Handles both string content and content block arrays
 */
function extractReasoning(chunk: AIMessageChunk): string | undefined {
  const content = chunk.content;

  // Case 1: Content is array of blocks (LangChain standard)
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'reasoning' && 'reasoning' in block) {
        return block.reasoning as string;
      }
    }
  }

  // Case 2: Content is string (no reasoning in this chunk)
  // Case 3: Provider-specific raw fields (future enhancement)
  return undefined;
}

/**
 * Extract text delta from a chunk
 * Handles both string content and content block arrays
 */
function extractText(chunk: AIMessageChunk): string {
  const content = chunk.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    let text = '';
    for (const block of content) {
      if (block?.type === 'text' && 'text' in block) {
        text += block.text;
      }
    }
    return text;
  }

  return '';
}
```

### 2. Streaming Path Modifications

```typescript
export async function streamLLM(
  options: StreamLLMOptions
): Promise<StreamLLMResult> {
  const { model, messages, config, streamMode } = options;
  const messageId = options.messageId ?? generateId('msg');
  const hasWriter = !!config.writer;

  if (streamMode === true) {
    if (!hasWriter) {
      throw new Error('Streaming requires config.writer');
    }

    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);

    let fullContent = '';
    let fullReasoning = '';
    let reasoningStarted = false;
    let textStarted = false;

    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      // Handle reasoning blocks
      const reasoningDelta = extractReasoning(chunk);
      if (reasoningDelta) {
        if (!reasoningStarted) {
          emitter.reasoningStart(messageId);
          reasoningStarted = true;
        }
        fullReasoning += reasoningDelta;
        emitter.reasoningDelta(messageId, reasoningDelta);
      }

      // Handle text content
      const textDelta = extractText(chunk);
      if (textDelta) {
        fullContent += textDelta;
        emitter.textDelta(messageId, textDelta);
      }
    }

    // End reasoning if started
    if (reasoningStarted) {
      emitter.reasoningEnd(messageId);
    }

    emitter.textEnd(messageId);

    return {
      content: fullContent,
      reasoning: fullReasoning || undefined,
    };
  }

  // Non-streaming path (similar modifications)
  // ...
}
```

### 3. Non-Streaming Path Modifications

```typescript
// Non-streaming: invoke and parse response
const response = await model.invoke(messages);

// Extract content
const content = extractText(response);

// Extract reasoning (if present)
const reasoning = extractReasoning(response);

if (hasWriter) {
  const emitter = createChunkEmitter(config);

  // Emit reasoning if present
  if (reasoning) {
    emitter.reasoningStart(messageId);
    emitter.reasoningDelta(messageId, reasoning);
    emitter.reasoningEnd(messageId);
  }

  emitter.textStart(messageId);
  emitter.textDelta(messageId, content);
  emitter.textEnd(messageId);
}

return {
  content,
  reasoning: reasoning || undefined,
};
```

## Testing Strategy

### Unit Test Coverage

```typescript
describe('reasoning content handling', () => {
  it('should detect reasoning in content blocks');
  it('should emit reasoning chunks in streaming mode');
  it('should return reasoning in result');
  it('should handle mixed reasoning and text chunks');
  it('should handle reasoning-only response');
  it('should handle text-only response (no reasoning)');
  it('should emit reasoning in non-streaming mode');
  it('should use same messageId for reasoning and text');
  it('should handle empty reasoning block');
  it('should handle multiple reasoning blocks');
});
```

### Test Fixtures

```typescript
// Mock model with reasoning content blocks
const reasoningModel = {
  stream: vi.fn().mockImplementation(async function* () {
    yield {
      content: [
        { type: 'reasoning', reasoning: 'Let me think...' },
      ],
    };
    yield {
      content: [
        { type: 'reasoning', reasoning: ' The answer is 42.' },
      ],
    };
    yield {
      content: [
        { type: 'text', text: 'The answer is 42.' },
      ],
    };
  }),
} as unknown as BaseChatModel;
```

## Edge Cases and Considerations

### 1. Content Type Variations

| Content Type | Handling |
|--------------|----------|
| `string` | Treat as text content |
| `Array<TextBlock>` | Extract text from blocks |
| `Array<ReasoningBlock>` | Extract reasoning from blocks |
| `Array<TextBlock \| ReasoningBlock>` | Handle both in order |
| `Array<OtherBlock>` | Ignore unknown block types |

### 2. Emission Order

**Question:** Can reasoning and text interleave?

**Answer:** Theoretically yes, but practically no. Models typically emit all reasoning first, then text. Our implementation respects the order in chunks.

### 3. Empty Reasoning

If reasoning block is present but empty string:
- Emit `reasoningStart` and `reasoningEnd` with no `reasoningDelta`
- Return `reasoning: ''` in result
- UI can decide whether to display empty reasoning

### 4. Missing Reasoning

If model doesn't support reasoning:
- No reasoning blocks in content
- No reasoning chunks emitted
- Returns `reasoning: undefined`
- Backward compatible with existing behavior

## Performance Considerations

1. **Parsing Overhead:** Content block parsing adds minimal overhead (array iteration)
2. **Memory:** Accumulating both content and reasoning (both already accumulated)
3. **Network:** No additional API calls (reasoning in same response)
4. **UI:** Rendering reasoning is separate concern (renderer changes)

## Migration Path

### Phase 1: Core Implementation
- Modify `stream-llm.ts` with content block detection
- Add comprehensive unit tests
- Update type definitions

### Phase 2: Node Updates (Future)
- Update individual nodes to use reasoning from result
- Store reasoning in messages if needed
- UI rendering improvements

### Phase 3: Provider Enhancements (Future)
- Add fallback for raw provider fields if needed
- Provider-specific reasoning field mappings

## Alternatives Considered

### Alternative 1: Raw Field Checking
```typescript
const reasoning = chunk.reasoning_content || chunk.thinking || chunk.reasoning;
```

**Pros:**
- Handles current provider implementations
- Simpler type checking

**Cons:**
- Not type-safe
- Provider-specific
- Doesn't scale with new providers

**Decision:** Use content blocks (Option 1) as primary, add fallback if needed

### Alternative 2: Separate Reasoning ID
```typescript
emitter.reasoningStart(reasoningId);
emitter.textStart(messageId);
```

**Pros:**
- Independent rendering control

**Cons:**
- No link between reasoning and text
- More complex state management

**Decision:** Use same messageId to link them

## Open Questions

1. **Should we add raw field fallback now?**
   - **Recommendation:** No, start with content blocks only
   - **Rationale:** Keep it simple, add fallback when actual provider requires it

2. **Should reasoning be stored in message history?**
   - **Recommendation:** Future work, separate concern
   - **Rationale:** Focus on streaming/display first

3. **Should we add reasoning visibility toggle?**
   - **Recommendation:** UI concern, separate feature
   - **Rationale:** Keep streaming layer focused on transport
