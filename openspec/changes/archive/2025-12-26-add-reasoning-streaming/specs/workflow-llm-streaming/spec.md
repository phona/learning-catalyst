# workflow-llm-streaming Spec Delta

## MODIFIED Requirements

### Requirement: Stream LLM Helper Function

The `streamLLM()` helper function MUST support detection, emission, and return of reasoning content from LLM models that provide it.

**Priority**: P0 (Critical)
**Effort**: M

**Modified Rationale:**
- Modern reasoning models (ChatGLM, DeepSeek R1, OpenAI o1) output structured thinking content
- Reasoning transparency improves user trust and understanding
- LangChain content blocks provide type-safe reasoning access
- Emitter infrastructure already exists for reasoning chunks

**Modified Implementation:**
```typescript
// NEW return type
export interface StreamLLMResult {
  content: string;
  reasoning?: string;
}

// NEW helper functions
function extractReasoning(chunk: AIMessageChunk): string | undefined {
  const content = chunk.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'reasoning' && 'reasoning' in block) {
        return block.reasoning as string;
      }
    }
  }

  return undefined;
}

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

// MODIFIED streaming path
export async function streamLLM(options: StreamLLMOptions): Promise<StreamLLMResult> {
  const { model, messages, config, streamMode } = options;
  const messageId = options.messageId ?? generateId('msg');

  if (streamMode === true) {
    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);

    let fullContent = '';
    let fullReasoning = '';
    let reasoningStarted = false;

    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      // Handle reasoning
      const reasoningDelta = extractReasoning(chunk);
      if (reasoningDelta) {
        if (!reasoningStarted) {
          emitter.reasoningStart(messageId);
          reasoningStarted = true;
        }
        fullReasoning += reasoningDelta;
        emitter.reasoningDelta(messageId, reasoningDelta);
      }

      // Handle text
      const textDelta = extractText(chunk);
      if (textDelta) {
        fullContent += textDelta;
        emitter.textDelta(messageId, textDelta);
      }
    }

    if (reasoningStarted) {
      emitter.reasoningEnd(messageId);
    }

    emitter.textEnd(messageId);

    return {
      content: fullContent,
      reasoning: fullReasoning || undefined,
    };
  }

  // Non-streaming path similarly updated...
}
```

**Validation:**
- Helper returns `StreamLLMResult` object instead of string
- Helper detects reasoning in LangChain content blocks
- Helper emits reasoning chunks before text chunks
- Helper maintains backward compatibility (no reasoning = undefined)

#### Scenario: Helper Detects Reasoning in Content Blocks (NEW)
**Given** LLM model returns response with reasoning content blocks
**And** Chunk content is `[{ type: 'reasoning', reasoning: 'Let me think...' }]`
**When** Helper processes the chunk
**Then** `extractReasoning()` returns `'Let me think...'`
**And** Helper stores reasoning delta in `fullReasoning` ✅

#### Scenario: Helper Emits Reasoning Chunks (NEW)
**Given** Helper is streaming with `streamMode: true`
**And** Model returns reasoning content
**When** First reasoning chunk arrives
**Then** Helper emits `{ type: 'reasoning-start', id: messageId }`
**And** Helper emits `{ type: 'reasoning-delta', id: messageId, delta: '...' }` for each chunk
**And** On last reasoning chunk, helper emits `{ type: 'reasoning-end', id: messageId }` ✅

#### Scenario: Helper Returns Reasoning in Result (NEW)
**Given** Helper completes streaming with reasoning content
**When** Function returns
**Then** Return type is `{ content: string, reasoning?: string }`
**And** `content` field contains full text response
**And** `reasoning` field contains accumulated reasoning or undefined ✅

#### Scenario: Helper Handles Mixed Reasoning and Text Chunks (NEW)
**Given** Model returns chunk with both reasoning and text blocks
**And** Chunk content is `[{ type: 'reasoning', reasoning: 'Think...' }, { type: 'text', text: 'Answer' }]`
**When** Helper processes the chunk
**Then** Both reasoning and text are extracted
**And** Reasoning is emitted before text
**And** Both are accumulated in their respective variables ✅

#### Scenario: Helper Handles Text-Only Response (NEW)
**Given** Model returns response without reasoning
**And** Chunk content is string `'Hello'` or `[{ type: 'text', text: 'Hello' }]`
**When** Helper processes the chunk
**Then** `extractReasoning()` returns `undefined`
**And** No reasoning chunks are emitted
**And** Return value has `reasoning: undefined` ✅

#### Scenario: Helper Uses Same MessageId for Reasoning and Text (NEW)
**Given** Helper streams with custom messageId `'msg-123'`
**And** Response contains both reasoning and text
**When** Helper emits chunks
**Then** Reasoning chunks use `id: 'msg-123'`
**And** Text chunks use `id: 'msg-123'`
**And** UI can link reasoning to its associated text ✅

#### Scenario: Non-Streaming Mode Handles Reasoning (NEW)
**Given** Helper is called with `streamMode: false`
**And** `model.invoke()` returns response with reasoning blocks
**When** Helper processes the response
**Then** Reasoning is extracted via `extractReasoning()`
**And** If `config.writer` exists, reasoning chunks are emitted
**And** Return value includes reasoning field ✅

---

### Requirement: Complete Content Return

The `streamLLM()` helper SHALL return complete accumulated content and optional reasoning as an object.

**Priority**: P0 (Critical)
**Effort**: S

**Modified Rationale:**
- Nodes need both content and optional reasoning for state updates
- Object return type allows extending with additional fields in future
- Reasoning field is optional to maintain backward compatibility

**Modified Implementation:**
```typescript
// Return type is now an object
export interface StreamLLMResult {
  content: string;
  reasoning?: string;
}

// Streaming mode returns object
return {
  content: fullContent,
  reasoning: fullReasoning || undefined,
};

// Non-streaming mode returns object
return {
  content,
  reasoning: reasoning || undefined,
};
```

**Validation:**
- Helper returns `StreamLLMResult` object in both modes
- `content` field is always present and non-empty
- `reasoning` field is optional, present only when model provides reasoning

#### Scenario: Streaming Returns Content and Reasoning Object (MODIFIED)
**Given** Helper function streams with `streamMode: true`
**And** LLM generates reasoning "Let me think..." and text "Hello"
**When** Function returns
**Then** Return value is `{ content: 'Hello', reasoning: 'Let me think...' }`
**And** Node can destructure: `const { content, reasoning } = await streamLLM(...)` ✅

#### Scenario: Non-Streaming Returns Content and Reasoning Object (MODIFIED)
**Given** Helper function invokes with `streamMode: false`
**And** LLM returns reasoning "Thinking..." and text "Response"
**When** Function returns
**Then** Return value is `{ content: 'Response', reasoning: 'Thinking...' }`
**And** Node can access both fields ✅

#### Scenario: Return Without Reasoning Has Undefined Field (NEW)
**Given** Helper function processes model without reasoning
**When** Function returns
**Then** Return value is `{ content: 'Hello', reasoning: undefined }`
**And** Nodes can check `if (result.reasoning)` safely ✅

---

## ADDED Requirements

### Requirement: Reasoning Content Detection

The `streamLLM()` helper MUST detect reasoning content in LangChain message chunks using standard content block types.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- LangChain uses content blocks for structured message content
- Reasoning is a standard content block type (`{ type: 'reasoning', reasoning: string }`)
- Type-safe detection prevents runtime errors
- Future-proof as LangChain evolves content block architecture

**Implementation:**
```typescript
function extractReasoning(chunk: AIMessageChunk): string | undefined {
  const content = chunk.content;

  // Content blocks format
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'reasoning' && 'reasoning' in block) {
        return block.reasoning as string;
      }
    }
  }

  return undefined;
}
```

**Validation:**
- Function handles array content with reasoning blocks
- Function returns undefined for non-array content
- Function handles mixed content block arrays
- Type-safe with proper type guards

#### Scenario: Detect Reasoning in Content Block Array
**Given** Chunk has `content: [{ type: 'reasoning', reasoning: 'Thinking process...' }]`
**When** `extractReasoning()` is called
**Then** Function returns `'Thinking process...'` ✅

#### Scenario: Return Undefined for String Content
**Given** Chunk has `content: 'Simple text'`
**When** `extractReasoning()` is called
**Then** Function returns `undefined` ✅

#### Scenario: Return Undefined for Text-Only Blocks
**Given** Chunk has `content: [{ type: 'text', text: 'Hello' }]`
**When** `extractReasoning()` is called
**Then** Function returns `undefined` ✅

#### Scenario: Handle Mixed Content Blocks
**Given** Chunk has `content: [{ type: 'text', text: 'Hi' }, { type: 'reasoning', reasoning: 'Think...' }]`
**When** `extractReasoning()` is called
**Then** Function returns `'Think...'` (finds reasoning block) ✅

---

### Requirement: Text Extraction from Content Blocks

The `streamLLM()` helper MUST extract text content from both string format and content block arrays.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- LangChain chunks may have string or array content
- Text may be in `{ type: 'text', text: '...' }` blocks
- Must handle both formats for backward compatibility
- Accumulates text from multiple text blocks

**Implementation:**
```typescript
function extractText(chunk: AIMessageChunk): string {
  const content = chunk.content;

  // String content (legacy format)
  if (typeof content === 'string') {
    return content;
  }

  // Content blocks format
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

**Validation:**
- Function returns string content unchanged
- Function extracts text from text blocks in arrays
- Function accumulates multiple text blocks
- Function returns empty string for unsupported formats

#### Scenario: Extract String Content Passthrough
**Given** Chunk has `content: 'Hello world'`
**When** `extractText()` is called
**Then** Function returns `'Hello world'` ✅

#### Scenario: Extract Text from Content Blocks
**Given** Chunk has `content: [{ type: 'text', text: 'Hello' }]`
**When** `extractText()` is called
**Then** Function returns `'Hello'` ✅

#### Scenario: Accumulate Multiple Text Blocks
**Given** Chunk has `content: [{ type: 'text', text: 'Hello' }, { type: 'text', text: ' World' }]`
**When** `extractText()` is called
**Then** Function returns `'Hello World'` ✅

#### Scenario: Ignore Non-Text Blocks
**Given** Chunk has `content: [{ type: 'reasoning', reasoning: 'Think' }, { type: 'text', text: 'Hi' }]`
**When** `extractText()` is called
**Then** Function returns `'Hi'` (only text blocks) ✅

---

### Requirement: Reasoning Chunk Emission Protocol

When reasoning content is detected, the helper MUST emit reasoning chunks following the AI SDK protocol before text chunks.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- Existing emitter methods support reasoning chunks
- Protocol: `reasoning-start → [reasoning-delta, ...] → reasoning-end`
- Reasoning typically precedes text in model responses
- Same messageId links reasoning to associated text

**Protocol:**
```
reasoning-start → [reasoning-delta, ...] → reasoning-end → text-start → [text-delta, ...] → text-end
```

**Validation:**
- `reasoningStart` emitted before first reasoning chunk
- `reasoningDelta` emitted for each reasoning segment
- `reasoningEnd` emitted after last reasoning chunk
- Same `messageId` used for reasoning and text
- Reasoning chunks emitted before text chunks

#### Scenario: Emit Reasoning Start on First Reasoning
**Given** Streaming is active
**And** First reasoning chunk is detected
**When** `reasoningStarted` is false
**Then** Helper emits `{ type: 'reasoning-start', id: messageId }`
**And** `reasoningStarted` is set to true ✅

#### Scenario: Emit Reasoning Delta for Each Chunk
**Given** `reasoningStarted` is true
**And** New reasoning chunk arrives with delta `' more'`
**When** Helper processes the chunk
**Then** Helper emits `{ type: 'reasoning-delta', id: messageId, delta: ' more' }`
**And** Delta is appended to `fullReasoning` ✅

#### Scenario: Emit Reasoning End After Completion
**Given** All reasoning chunks have been processed
**And** `reasoningStarted` is true
**When** Helper finishes streaming loop
**Then** Helper emits `{ type: 'reasoning-end', id: messageId }`
**And** Emission happens before `text-end` ✅

#### Scenario: Use Same MessageId for Reasoning Chunks
**Given** `messageId = 'msg-abc-123'`
**And** Reasoning chunks are being emitted
**When** Emitter is called
**Then** All reasoning chunks have `id: 'msg-abc-123'` ✅

#### Scenario: No Reasoning Chunks When No Reasoning
**Given** Model response has no reasoning content
**When** Helper completes streaming
**Then** No `reasoning-start` emitted
**And** No `reasoning-delta` emitted
**And** No `reasoning-end` emitted ✅
