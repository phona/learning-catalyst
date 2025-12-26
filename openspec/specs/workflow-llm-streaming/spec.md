# workflow-llm-streaming Specification

## Purpose
TBD - created by archiving change add-workflow-llm-streaming. Update Purpose after archive.
## Requirements
### Requirement: Propagate Stream Config to Workflow Nodes

The IPC handler MUST read the existing `ai.modelTypes.chat.stream` configuration and propagate it to workflow nodes via LangGraph's `configurable` mechanism.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- Leverages existing `stream: true` default in `DEFAULT_APP_CONFIG`
- No new configuration properties needed
- LangGraph's `configurable` automatically propagates to all nodes
- Backward compatible (undefined = current behavior)

**Implementation:**
```typescript
// chat-handlers.ts
ipcMainInstance.on('chat:start-stream', async (event, { messages, conversationId }) => {
  const config = await services.configService.getConfig();
  const llmStreamMode = config?.ai?.modelTypes?.chat?.stream;

  const stream = await workflowGraph.stream(
    { messages: lcMessages },
    {
      configurable: {
        thread_id: safeConversationId,
        llmStreamMode,  // ← propagate to nodes
      },
      streamMode: ['messages', 'custom'],
    },
  );
});
```

**Validation:**
- `llmStreamMode` is read from config service
- Value is passed via `configurable.llmStreamMode`
- No changes to IPC signature (renderer unaffected)

#### Scenario: Stream Config Propagates to Nodes
**Given** `DEFAULT_APP_CONFIG.ai.modelTypes.chat.stream = true`
**And** User starts a chat session
**When** `chat:start-stream` handler executes
**Then** Handler reads `llmStreamMode = true` from config
**And** Handler passes `{ configurable: { thread_id, llmStreamMode: true } }` to workflow
**And** All workflow nodes can access `config.configurable?.llmStreamMode`
**And** Nodes receive `true` value ✅

#### Scenario: Undefined Config Uses Default Behavior
**Given** User's config does not have `ai.modelTypes.chat.stream` set
**When** `chat:start-stream` handler executes
**Then** `lodash.merge()` applies `DEFAULT_APP_CONFIG` with `stream: true`
**And** Handler reads `llmStreamMode = true`
**And** Value propagates to nodes ✅

---

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

### Requirement: User-Facing Nodes Use Streaming Helper

Workflow nodes that output visible assistant messages MUST use the `streamLLM()` helper to enable real-time token streaming.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- Provides immediate visual feedback to users
- Creates conversational feel matching modern AI chat
- Improves perceived performance
- Consistent user experience across all visible outputs

**Nodes to Update:**
1. `explain.ts` - Teaching content
2. `askQuestion.ts` - Practice questions
3. `assessUnderstanding.ts` - Assessment feedback
4. `handleConversation.ts` - Hints/clarifications
5. `remediatePractice.ts` - Re-teaching content
6. `fastTrackQuiz.ts` - Quiz questions

**Implementation Pattern:**
```typescript
// BEFORE:
const model = await deps.providerFactory.getModel();
const response = await model.invoke(messages);
const content = String(response.content ?? '');

const emitter = createChunkEmitter(config);
const messageId = generateId('msg');
emitter.textStart(messageId);
emitter.textDelta(messageId, content);
emitter.textEnd(messageId);

// AFTER:
const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
const model = await deps.providerFactory.getModel();

const content = await streamLLM({
  model,
  messages,
  config,
  streamMode,
});
// No manual emitter calls needed
```

**Validation:**
- All 6 nodes import `streamLLM` helper
- All 6 nodes extract `streamMode` from `config.configurable?.llmStreamMode`
- All 6 nodes replace `model.invoke()` + manual emitter with `streamLLM()` call
- Manual emitter calls removed from nodes

#### Scenario: Explain Node Streams Teaching Content
**Given** `streamMode = true` in node config
**And** Explain node generates teaching explanation
**When** LLM generates tokens
**Then** Teaching content appears in real-time token-by-token
**And** User sees immediate visual feedback ✅

#### Scenario: AskQuestion Node Streams Practice Questions
**Given** `streamMode = true` in node config
**And** AskQuestion node generates practice question
**When** LLM generates tokens
**Then** Practice question appears in real-time token-by-token
**And** User sees question being generated ✅

#### Scenario: AssessUnderstanding Node Streams Feedback
**Given** `streamMode = true` in node config
**And** AssessUnderstanding node generates assessment feedback
**When** LLM generates tokens
**Then** Feedback message appears in real-time token-by-token
**And** User sees feedback being generated ✅

#### Scenario: HandleConversation Node Streams Hints
**Given** `streamMode = true` in node config
**And** User requests a hint
**When** HandleConversation node generates hint
**Then** Hint appears in real-time token-by-token
**And** User sees hint being generated ✅

#### Scenario: RemediatePractice Node Streams Re-teaching
**Given** `streamMode = true` in node config
**And** RemediatePractice node generates re-teaching content
**When** LLM generates tokens
**Then** Re-teaching content appears in real-time token-by-token
**And** User sees explanation being generated ✅

#### Scenario: FastTrackQuiz Node Streams Quiz Questions
**Given** `streamMode = true` in node config
**And** FastTrackQuiz node generates quiz questions
**When** LLM generates tokens
**Then** Quiz content appears in real-time token-by-token
**And** User sees quiz being generated ✅

---

### Requirement: Internal Nodes Exclude Streaming

Workflow nodes that perform internal processing or return structured output MUST NOT use streaming and continue using `model.invoke()`.

**Priority**: P1 (High)
**Effort**: S

**Rationale:**
- Internal nodes don't benefit from streaming (no visible output)
- Structured output parsers require complete response
- Simpler to keep existing pattern for internal logic
- Reduces unnecessary complexity

**Excluded Nodes:**
- `plan.ts` - Structured JSON output with parser
- `evaluate.ts` - Internal scoring
- `topicParse.ts` - No LLM call
- `gradeQuiz.ts` - Internal grading
- `classifyResponse.ts` - Internal classification
- `classifyIntent.ts` - Internal classification
- `detectFailure.ts` - Internal analysis
- `circuitBreaker.ts` - Internal logic
- `gradeAnswer.ts` - Internal grading

**Validation:**
- Excluded nodes are NOT modified
- Excluded nodes continue using `model.invoke()`
- No `streamLLM` imports in excluded nodes

#### Scenario: Plan Node Uses Non-Streaming Invoke
**Given** Plan node executes with `streamMode = true` in config
**When** Plan node generates session blueprint
**Then** Node uses `chain.invoke()` for structured output
**And** Parser receives complete JSON response
**And** Session blueprint is correctly parsed ✅

#### Scenario: Evaluate Node Uses Non-Streaming Invoke
**Given** Evaluate node executes with `streamMode = true` in config
**When** Evaluate node grades user answer
**Then** Node uses `model.invoke()` for scoring
**And** Complete response is parsed for score extraction
**And** Mastery score is correctly calculated ✅

---

### Requirement: Backward Compatible Default Behavior

When `llmStreamMode` is `undefined` or `false`, nodes MUST use non-streaming `model.invoke()` behavior, preserving current functionality.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- No breaking changes to existing behavior
- Explicit `=== true` check prevents unexpected streaming
- Users can opt-in by setting `stream: true` in config
- Default can be changed later if needed

**Implementation:**
```typescript
// Explicit === true check in streamLLM helper
if (streamMode === true) {
  // streaming path
}
// All other values (undefined, false, null, 0, "") use invoke
```

**Validation:**
- Helper uses explicit `=== true` check
- `undefined` value triggers non-streaming path
- `false` value triggers non-streaming path
- All existing tests pass without modification

#### Scenario: Undefined StreamMode Uses Non-Streaming
**Given** Node config has `configurable.llmStreamMode = undefined`
**When** Node calls `streamLLM()` helper
**Then** Helper checks `if (streamMode === true)` - evaluates to false
**And** Helper calls `model.invoke()` (non-streaming)
**And** Behavior matches current implementation ✅

#### Scenario: False StreamMode Uses Non-Streaming
**Given** Node config has `configurable.llmStreamMode = false`
**When** Node calls `streamLLM()` helper
**Then** Helper checks `if (streamMode === true)` - evaluates to false
**And** Helper calls `model.invoke()` (non-streaming)
**And** No tokens are streamed ✅

#### Scenario: Existing Tests Pass Without Changes
**Given** Test suite runs without setting `llmStreamMode` in config
**When** Tests execute
**Then** All nodes use non-streaming path (undefined value)
**And** All existing assertions pass
**And** No test modifications required ✅

---

### Requirement: Chunk Emission Protocol

When streaming is enabled, nodes MUST emit chunks following the AI SDK protocol via `createChunkEmitter`.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- Existing infrastructure already implements AI SDK protocol
- Compatible with Assistant UI chat components
- Consistent chunk format across all streaming
- Already tested and working in codebase

**Protocol:**
```
text-start → [text-delta, text-delta, ...] → text-end
```

**Validation:**
- Helper uses `createChunkEmitter(config)` for emission
- Helper emits `text-start` before streaming
- Helper emits `text-delta` for each token
- Helper emits `text-end` after streaming completes
- Chunks follow `DataStreamChunk` types from `assistant-ui-stream.ts`

#### Scenario: Chunk Emission Follows AI SDK Protocol
**Given** Helper function streams LLM response
**When** Tokens are generated
**Then** First chunk emitted is `{ type: 'text-start', id: messageId }`
**And** Each token chunk is `{ type: 'text-delta', id: messageId, delta: token }`
**And** Final chunk is `{ type: 'text-end', id: messageId }`
**And** Chunks are compatible with Assistant UI ✅

#### Scenario: Chunks Propagate to Renderer
**Given** Node streams content with `streamMode = true`
**When** Chunks are emitted via `config.writer()`
**Then** Chunks flow through LangGraph's custom event system
**And** `toAssistantUIStream()` converts to AI SDK protocol
**And** Renderer receives chunks via `replyPort.postMessage()`
**And** Assistant UI displays tokens in real-time ✅

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

