# Design: Workflow LLM Streaming

## Overview

This design enables real-time token streaming for LLM calls within workflow nodes by leveraging LangGraph's `configurable` mechanism to propagate the existing `stream` config setting to individual nodes.

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Renderer Process                                                                 │
│   User sends message → electronAPI.chat.startStream()                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Main Process - IPC Handler (chat-handlers.ts)                                  │
│   workflowGraph.stream({ messages }, { configurable: { thread_id },            │
│     streamMode: ['messages', 'custom'] })                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Workflow Node (e.g., explain.ts)                                               │
│   model.invoke(messages) → [wait for full response] → emitter.textDelta(all)   │
│   ❌ User sees nothing during 2-10s LLM call                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Proposed State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Main Process - IPC Handler (chat-handlers.ts)                                  │
│   const config = await configService.getConfig()                               │
│   const llmStreamMode = config?.ai?.modelTypes?.chat?.stream  // read existing │
│   workflowGraph.stream({ messages }, {                                         │
│     configurable: { thread_id, llmStreamMode },  // ← NEW: propagate            │
│     streamMode: ['messages', 'custom']                                        │
│   })                                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Workflow Node (e.g., explain.ts)                                               │
│   const streamMode = config.configurable?.llmStreamMode                        │
│   streamLLM({ model, messages, config, streamMode })                          │
│     ├─ if (streamMode === true)                                                │
│     │   └─ model.stream() → emitter.textDelta(token) for each chunk            │
│     └─ else                                                                    │
│         └─ model.invoke() → return complete content                            │
│   ✅ User sees tokens in real-time                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. IPC Handler Change

**File:** `src/main/handlers/chat-handlers.ts`

```typescript
ipcMainInstance.on('chat:start-stream', async (event, { messages, conversationId }) => {
  // NEW: Read existing stream config
  const config = await services.configService.getConfig();
  const llmStreamMode = config?.ai?.modelTypes?.chat?.stream;

  const stream = await workflowGraph.stream(
    { messages: lcMessages },
    {
      configurable: {
        thread_id: safeConversationId,
        llmStreamMode,  // ← NEW: propagate to nodes
      },
      streamMode: ['messages', 'custom'],
    },
  );
  // ... rest of handler
});
```

**Rationale:**
- Uses existing `stream: true` default in `DEFAULT_APP_CONFIG`
- No new config property needed
- LangGraph's `configurable` automatically propagates to all nodes
- Backward compatible (undefined = current behavior)

### 2. streamLLM Helper

**File:** `src/main/services/domain/workflow/utils/stream-llm.ts` (new)

```typescript
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

  // Explicit === true check (undefined, false both use invoke)
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

**Rationale:**
- Single abstraction for streaming vs non-streaming
- Reuses existing `createChunkEmitter` infrastructure
- Explicit `=== true` check prevents unexpected behavior
- Returns complete content for both modes (nodes need full response)
- Optional `messageId` parameter for nodes that already track IDs

### 3. Node Updates

**Pattern - Before:**
```typescript
const model = await deps.providerFactory.getModel();
const response = await model.invoke(messages);
const content = String(response.content ?? '');

const emitter = createChunkEmitter(config);
const messageId = generateId('msg');
emitter.textStart(messageId);
emitter.textDelta(messageId, content);
emitter.textEnd(messageId);
```

**Pattern - After:**
```typescript
const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
const model = await deps.providerFactory.getModel();

const content = await streamLLM({
  model,
  messages,
  config,
  streamMode,
});
// No manual emitter calls - streamLLM handles it
```

**Rationale:**
- Cleaner code (no manual emitter management)
- Consistent pattern across nodes
- Streaming behavior controlled by single config
- Backward compatible (undefined = non-streaming)

## Node Classification

### Stream Enabled (User-Facing)

| Node | File | Output Type | Reason |
|------|------|-------------|--------|
| Explain | `explain.ts` | Teaching content | Visible to user, benefits from streaming |
| Ask Question | `askQuestion.ts` | Practice questions | Visible to user, benefits from streaming |
| Assess Understanding | `assessUnderstanding.ts` | Assessment feedback | Visible to user, benefits from streaming |
| Handle Conversation | `handleConversation.ts` | Hints/clarifications | Visible to user, benefits from streaming |
| Remediate Practice | `remediatePractice.ts` | Re-teaching content | Visible to user, benefits from streaming |
| Fast Track Quiz | `fastTrackQuiz.ts` | Quiz questions | Visible to user, benefits from streaming |

### Stream Disabled (Internal/Structured)

| Node | File | Reason |
|------|------|--------|
| Plan | `plan.ts` | Structured JSON output with parser |
| Evaluate | `evaluate.ts` | Internal scoring, returns HumanMessage with metadata |
| Topic Parse | `topicParse.ts` | No LLM call |
| Grade Quiz | `gradeQuiz.ts` | Internal grading, likely structured output |
| Classify Response | `classifyResponse.ts` | Internal classification |
| Classify Intent | `classifyIntent.ts` | Internal classification |
| Detect Failure | `detectFailure.ts` | Internal analysis |
| Circuit Breaker | `circuitBreaker.ts` | Internal logic |
| Grade Answer | `gradeAnswer.ts` | Internal grading |

## Data Flow

### Config Propagation

```
config-service.ts
  ↓ DEFAULT_APP_CONFIG.ai.modelTypes.chat.stream = true
  ↓ lodash.merge() ensures default is applied
chat-handlers.ts
  ↓ configService.getConfig() reads stream value
  ↓ passes via configurable.llmStreamMode
workflow-graph.ts
  ↓ LangGraph passes configurable to all nodes
individual nodes
  ↓ config.configurable?.llmStreamMode
stream-llm.ts
  ↓ if (streamMode === true) stream else invoke
```

### Chunk Emission Flow (Streaming Enabled)

```
model.stream(messages)
  ↓ AsyncIterable<ChatGenerationChunk>
for await (const chunk of stream)
  ↓ chunk.content (string token)
emitter.textDelta(messageId, delta)
  ↓ config.writer(chunk)
  ↓ LangGraph custom event
assistant-ui-stream.ts
  ↓ toAssistantUIStream() converts to AI SDK protocol
  ↓ replyPort.postMessage(chunk)
Renderer
  ↓ Assistant UI receives text-delta chunks
  ↓ Displays tokens in real-time
```

## Trade-offs

### Decision: Explicit `=== true` Check

**Alternative:** Truthy check (`if (streamMode)`)
**Rejected:** Would treat `false`, `0`, `""` as streaming-enabled
**Chosen:** Explicit `=== true` ensures only true enables streaming

### Decision: Exclude Structured Output Nodes

**Alternative:** Stream then parse from accumulated content
**Rejected:** More complex, parsers expect complete response
**Chosen:** Keep structured output nodes simple (non-streaming)

### Decision: Use Helper Function vs Inline Logic

**Alternative:** Add streaming logic directly in each node
**Rejected:** Code duplication, harder to maintain
**Chosen:** Single `streamLLM()` helper for consistency

### Decision: Config via `configurable` vs State

**Alternative:** Add `llmStreamMode` to `WorkflowStateAnnotation`
**Rejected:** Stream mode is runtime concern, not application state
**Chosen:** Use LangGraph's `configurable` (same as `thread_id`)

## Error Handling

### Streaming Errors

```typescript
try {
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    // emit chunks
  }
} catch (error) {
  emitter.error(error.message);
  throw error; // Re-throw for workflow error handling
}
```

### Fallback to Non-Streaming

If streaming fails (e.g., provider doesn't support it), the helper automatically falls back to `invoke()` on next call since `streamMode` is checked per invocation.

## Testing Strategy

### Unit Tests

- `stream-llm.test.ts`: Test helper with mock model
- Verify streaming path when `streamMode = true`
- Verify non-streaming path when `streamMode = false/undefined`
- Verify complete content returned in both modes

### Integration Tests

- Update existing node tests to verify both paths
- Test with `configurable.llmStreamMode = true`
- Test with `configurable.llmStreamMode = false`
- Test with `configurable.llmStreamMode = undefined`

### Manual Testing

1. Enable `stream: true` in config
2. Start chat and observe real-time token display
3. Disable `stream: false` and verify non-streaming works
4. Test all 6 updated nodes

## Rollback Plan

If issues arise:
1. Set `DEFAULT_APP_CONFIG.ai.modelTypes.chat.stream = false`
2. Or remove `config.configurable?.llmStreamMode` checks from nodes
3. All changes are additive; no existing behavior modified when `undefined`

## Future Considerations

1. **Per-node streaming config** - Some nodes may want independent control
2. **Streaming with structured output** - Investigate parsers that support streaming
3. **User preference setting** - Add UI toggle for streaming on/off
4. **Performance metrics** - Track streaming vs non-streaming latency
