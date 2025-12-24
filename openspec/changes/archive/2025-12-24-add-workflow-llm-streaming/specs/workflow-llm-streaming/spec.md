# workflow-llm-streaming Specification

## Purpose

Enables real-time token streaming for LLM calls within workflow nodes that generate visible assistant messages, providing immediate visual feedback during AI content generation.

## ADDED Requirements

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

A `streamLLM()` helper function MUST be provided that abstracts streaming vs non-streaming LLM calls for workflow nodes.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- Single abstraction for consistent streaming behavior
- Reuses existing `createChunkEmitter` infrastructure
- Eliminates code duplication across nodes
- Cleaner node code without manual emitter management

**Implementation:**
```typescript
// stream-llm.ts
export interface StreamLLMOptions {
  model: BaseChatModel;
  messages: BaseMessage[];
  config: LangGraphRunnableConfig;
  messageId?: string;
  streamMode?: boolean;
}

export async function streamLLM(options: StreamLLMOptions): Promise<string> {
  const { model, messages, config, streamMode } = options;
  const messageId = options.messageId ?? generateId('msg');

  // Explicit === true check (undefined/false use invoke)
  if (streamMode === true) {
    const emitter = createChunkEmitter(config);
    emitter.textStart(messageId);

    let fullContent = '';
    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const delta = chunk.content ?? '';
      if (typeof delta === 'string') {
        fullContent += delta;
        emitter.textDelta(messageId, delta);
      }
    }

    emitter.textEnd(messageId);
    return fullContent;
  }

  // Non-streaming: use existing invoke pattern
  const response = await model.invoke(messages);
  return String(response.content ?? '');
}
```

**Validation:**
- Helper function created at `src/main/services/domain/workflow/utils/stream-llm.ts`
- Exports `streamLLM()` function and `StreamLLMOptions` interface
- Uses explicit `=== true` check for streaming
- Returns complete content string in both modes
- Handles token emission via `createChunkEmitter`

#### Scenario: Helper Streams When StreamMode Is True
**Given** Helper function is called with `streamMode: true`
**When** LLM model generates tokens
**Then** Helper calls `model.stream(messages)`
**And** Helper emits `text-start` chunk
**And** Helper emits `text-delta` chunk for each token
**And** Helper emits `text-end` chunk
**And** Helper returns complete accumulated content ✅

#### Scenario: Helper Invokes When StreamMode Is False
**Given** Helper function is called with `streamMode: false`
**When** Function executes
**Then** Helper calls `model.invoke(messages)`
**And** Helper does NOT emit any chunks
**And** Helper returns complete response content ✅

#### Scenario: Helper Invokes When StreamMode Is Undefined
**Given** Helper function is called with `streamMode: undefined`
**When** Function executes
**Then** Helper treats `undefined` as falsy
**And** Helper calls `model.invoke(messages)` (non-streaming)
**And** Helper returns complete response content ✅

#### Scenario: Helper Generates MessageId When Not Provided
**Given** Helper function is called without `messageId` parameter
**When** Function executes in streaming mode
**Then** Helper generates unique ID via `generateId('msg')`
**And** Helper uses generated ID for all chunk emission ✅

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

The `streamLLM()` helper MUST return the complete accumulated content string regardless of streaming mode.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- Nodes need complete response for state updates
- Messages array requires full content
- Consistent return type simplifies node code
- Enables both streaming and non-streaming from same function

**Implementation:**
```typescript
// Streaming mode: accumulate and return
if (streamMode === true) {
  let fullContent = '';
  for await (const chunk of stream) {
    fullContent += delta;
    emitter.textDelta(messageId, delta);
  }
  return fullContent;  // ← complete content
}

// Non-streaming mode: return response content
const response = await model.invoke(messages);
return String(response.content ?? '');  // ← complete content
```

**Validation:**
- Helper returns complete string in streaming mode
- Helper returns complete string in non-streaming mode
- Return type is always `Promise<string>`
- Nodes can use returned value for `AIMessage` creation

#### Scenario: Streaming Returns Complete Content
**Given** Helper function streams with `streamMode = true`
**When** LLM generates "Hello, world!"
**Then** Helper accumulates tokens: "Hello" + ", " + "world" + "!"
**And** Helper returns "Hello, world!"
**And** Node can create `new AIMessage("Hello, world!")` ✅

#### Scenario: Non-Streaming Returns Complete Content
**Given** Helper function invokes with `streamMode = false`
**When** LLM returns "Hello, world!"
**Then** Helper returns "Hello, world!"
**And** Node can create `new AIMessage("Hello, world!")` ✅
