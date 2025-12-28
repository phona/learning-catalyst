# Proposal: Add Workflow LLM Streaming

## Status
**Proposed** | 2025-12-25

## Context

Currently, workflow nodes that generate visible assistant messages use `model.invoke()` which waits for the complete LLM response before displaying content to users. This creates a noticeable delay where users see no feedback during LLM generation, reducing the conversational feel of the learning experience.

The application already has:
- `stream: true` default in `DEFAULT_APP_CONFIG` (`config-service.ts`)
- `SelectedChatModel.stream?: boolean` type defined (`config.ts`)
- Chunk emission infrastructure (`chunk-emitter.ts`, `assistant-ui-stream.ts`)
- LangGraph streaming via `workflowGraph.stream()` with `streamMode: ['messages', 'custom']`

However, individual LLM calls **within** workflow nodes do not stream their tokens to the UI in real-time.

## Problem

Users experience poor responsiveness during LLM content generation:

1. **Delayed feedback** - No visible output during 2-10 second LLM calls
2. **Lost conversational feel** - Streaming at the workflow level doesn't help with individual node LLM calls
3. **Inconsistent experience** - Modern AI chat (ChatGPT, Claude) streams by default

**Current flow:**
```
User input → Workflow Node → model.invoke() → [Wait 2-10s] → Full message appears
```

**Desired flow:**
```
User input → Workflow Node → model.stream() → Tokens appear in real-time
```

## Solution

Enable real-time token streaming for LLM calls in user-facing workflow nodes by:

1. **Reading existing `stream` config** in IPC handler and passing via `configurable.llmStreamMode`
2. **Creating `streamLLM()` helper** that abstracts streaming vs non-streaming LLM calls
3. **Updating user-facing nodes** to use the helper (6 nodes total)

### Scope

**Include:**
- Nodes that output visible assistant messages to users
- Helper function for reusable streaming logic
- Config propagation via LangGraph's `configurable` mechanism

**Exclude:**
- Internal processing nodes (plan, evaluate, grade, classify, etc.)
- Structured output parsers (require complete response for parsing)
- Nodes without LLM calls

### Nodes to Update

| Node | Purpose | LLM Output |
|------|---------|------------|
| `explain.ts` | Teaching content | Visible to user |
| `askQuestion.ts` | Practice questions | Visible to user |
| `assessUnderstanding.ts` | Assessment feedback | Visible to user |
| `handleConversation.ts` | Hints/clarifications | Visible to user |
| `remediatePractice.ts` | Re-teaching content | Visible to user |
| `fastTrackQuiz.ts` | Quiz questions | Visible to user |

**Skip:** `plan.ts` (structured JSON), `evaluate.ts` (internal scoring), `topicParse.ts` (no LLM), `gradeQuiz.ts`, `classifyResponse.ts`, `classifyIntent.ts`, `detectFailure.ts`, `circuitBreaker.ts`, `gradeAnswer.ts`

## Alternatives Considered

### Alternative 1: Stream All LLM Calls
**Rejected** - Internal processing nodes (evaluate, grade, classify) don't benefit from streaming and structured output parsers need complete responses.

### Alternative 2: Add New IPC Parameter
**Rejected** - Extra renderer complexity. Using existing config is simpler and more consistent with app architecture.

### Alternative 3: Stream at Workflow Level Only
**Rejected** - Already implemented via `streamMode: ['messages', 'custom']`. This proposal is for **node-level** LLM streaming.

## Impact

**User Experience:**
- Immediate visual feedback during LLM generation
- More responsive, conversational feel
- Consistent with modern AI chat standards

**Code:**
- New helper function: `stream-llm.ts` (~60 lines)
- IPC handler: +3 lines
- 6 node files: ~5-10 lines each
- Total: ~8 files, ~90-120 lines

**Performance:**
- Same total LLM call time
- Better perceived performance due to progressive rendering
- Minimal overhead (chunk emission is already implemented)

## Dependencies

None - builds on existing infrastructure:
- `DEFAULT_APP_CONFIG` already has `stream: true`
- `chunk-emitter.ts` already handles token emission
- LangGraph's `configurable` already propagates to nodes

## Risks

| Risk | Mitigation |
|------|------------|
| Streaming reveals partial responses before completion | Expected behavior - users see generation in progress |
| Some nodes need complete response for parsing | Exclude structured output nodes (plan, evaluate, grade) |
| Config value changes mid-stream | Uses config snapshot at stream start |
| Increased network overhead | Tokens already streaming via workflow streamMode |

## Related Changes

None - this is a new capability.

## Success Criteria

1. [ ] User-facing nodes stream tokens in real-time when `config.stream = true`
2. [ ] Internal nodes continue working without streaming
3. [ ] All existing tests pass
4. [ ] No breaking changes to existing behavior when `config.stream = false`
