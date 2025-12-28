# OpenSpec Change Proposal: Fix SiliconFlow Reasoning Content Parsing

## Change ID
fix-siliconflow-reasoning-content-parsing

## Status
Proposed

## Type
Bug Fix

## Summary

SiliconFlow (OpenAI-compatible) can send “reasoning / thinking” text in fields like `reasoning_content`
and (via OpenRouter) `reasoning`. LangChain JS drops these fields when converting streamed deltas into
`AIMessageChunk`, so our app never sees the reasoning.

This change proposes a small SiliconFlow-only adapter fix to preserve reasoning text and a small
workflow helper extension so the UI can stream it using our existing `reasoning-*` chunk protocol.

## Why

Reasoning text is lost today, so users see an empty reasoning panel even when the model provides it.
We need to keep that text so the UI can show it.

## What Changes

- Keep raw SiliconFlow response data long enough to extract reasoning.
- Copy reasoning into `additional_kwargs.reasoning_content` and then drop the raw payload.
- Let `streamLLM()` read `additional_kwargs.reasoning_content` as a fallback source.

## Current Behavior (Problem)

- SiliconFlow streaming works for normal text (`delta.content`), but reasoning text is lost.
- Our `streamLLM()` helper only extracts reasoning from LangChain content blocks (`{ type: "reasoning" }`),
  not from `additional_kwargs.reasoning_content`.

User symptom:
- The “reasoning” panel never updates for SiliconFlow models that provide reasoning content.

## Root Cause (Simple)

LangChain JS `ChatOpenAI` (completions streaming) converts `choices[0].delta` into `AIMessageChunk` using
only `delta.content`. Unknown fields like `delta.reasoning_content` are not preserved.

So by the time our `SiliconFlowChatModel` sees the chunk, the reasoning is already gone unless we keep
the raw response payload.

ASCII data flow (today):
```
SiliconFlow API chunk
  choices[0].delta.reasoning_content = "..."
            |
            v
LangChain ChatOpenAI converts delta -> AIMessageChunk
  keeps: delta.content
  drops: delta.reasoning_content
            |
            v
Our app never sees reasoning text
```

## Goals

- Preserve SiliconFlow reasoning text for both streaming and non-streaming calls.
- Emit reasoning updates using the existing `reasoning-start`, `reasoning-delta`, `reasoning-end` protocol.
- Keep changes tightly scoped to SiliconFlow; other providers are unaffected.
- Avoid large raw payload retention in message objects.
- No new production dependencies.

## Non-Goals

- Redesigning LangChain internals.
- Adding a new UI surface for reasoning (we use what already exists).
- Persisting reasoning into chat history/checkpoints (unless requested separately).

## Proposed Change

### 1) Preserve raw response (SiliconFlow only)

Enable LangChain OpenAI’s internal raw-response capture (`__includeRawResponse`) for SiliconFlow chat
models so each chunk/message includes:
- `message.additional_kwargs.__raw_response` (raw OpenAI-compatible payload)

### 2) Extract reasoning and attach it to `additional_kwargs.reasoning_content`

In `SiliconFlowChatModel`:
- Streaming path: read reasoning from raw chunk payload, then set
  `message.additional_kwargs.reasoning_content = <delta>` (append-friendly).
- Non-streaming path: read reasoning from raw final message payload, then set the same field.

We also support the OpenRouter fallback field:
- streaming: `choices[0].delta.reasoning` when `reasoning_content` is absent.

Important memory guardrail:
- delete `message.additional_kwargs.__raw_response` after extracting reasoning so large payloads do not
  leak into checkpoints or long-lived state.

ASCII data flow (after fix):
```
SiliconFlow chunk
  choices[0].delta.reasoning_content = "..."
            |
            v
LangChain (with __includeRawResponse)
  message.additional_kwargs.__raw_response = <raw>
            |
            v
SiliconFlowChatModel extracts + stores
  message.additional_kwargs.reasoning_content += "..."
  delete __raw_response
            |
            v
streamLLM emits reasoning-* chunks
```

### 3) Teach `streamLLM()` to read `additional_kwargs.reasoning_content`

Extend `streamLLM()` reasoning extraction to accept:
- LangChain content blocks (existing behavior)
- `AIMessageChunk.additional_kwargs.reasoning_content` (new fallback)

This keeps the change minimal and avoids changing `chunk.content` shapes.

## Open Questions (Need Confirmation)

1) Should SiliconFlow reasoning be:
   - (A) streamed to the UI only (default in this proposal), or
   - (B) persisted into stored chat messages/checkpoints for later viewing?

2) Do we need to support reasoning extraction for LangChain’s Responses API path for SiliconFlow, or is
   Completions API coverage sufficient for current usage?

## Test Plan

- Unit tests for `SiliconFlowChatModel`:
  - streaming: extracts `delta.reasoning_content` and attaches it to `additional_kwargs.reasoning_content`
  - streaming: supports OpenRouter `delta.reasoning`
  - non-streaming: extracts `message.reasoning_content`
  - ensures `__raw_response` is removed after parsing
- Unit tests for `streamLLM()`:
  - reasoning is emitted when reasoning arrives via `additional_kwargs.reasoning_content`

## Acceptance Criteria

- SiliconFlow streamed reasoning is surfaced to the UI via `reasoning-*` chunks.
- Non-streaming calls return `reasoning` in the `streamLLM()` result when provided.
- Raw response payload (`__raw_response`) does not remain on emitted chunks/messages after parsing.
- No behavior change for non-SiliconFlow providers.
- `npm test` and `npm run lint` pass.

## Rollback Plan

Revert the SiliconFlow-only adapter changes and the `streamLLM()` fallback logic. No data migrations.
