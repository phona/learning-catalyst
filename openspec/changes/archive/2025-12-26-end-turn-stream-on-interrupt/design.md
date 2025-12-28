# Design: Turn Stream Boundary on Interrupt (AI SDK v5 Compatible)

## Summary
We make the chat streaming transport "turn-scoped":
- One `chat:start-stream` call = one stream.
- The stream ends when the workflow either completes or reaches `interrupt()`.
- The handler emits `finish` exactly once and closes the port.

This matches the mental model users expect: when the assistant is done speaking (or waiting for input), the UI should stop streaming and allow typing.

## Implementation Plan (apply stage)
Straightforward, minimal steps (no new deps, no protocol changes):

1. **Surface interrupt events from LangGraph**
   - Update `chat:start-stream` stream config so the stream includes interrupt-bearing events (e.g. add `updates` alongside `custom`).

2. **End the adapter generator on interrupt**
   - Update `toAssistantUIStream(...)` in `assistant-ui-stream.ts` to detect `__interrupt__` (via `isInterruptEvent`) on the non-custom channel and `return` immediately.
   - This makes the `for await` loop in `chat-handlers.ts` exit promptly.

3. **Keep `finish` centralized**
   - Do not emit `finish` inside nodes or `streamLLM()`.
   - Keep `finish` emission in `chat-handlers.ts` `finally` as the single authority.

4. **Tests**
   - Add a unit test for `toAssistantUIStream(...)` proving an interrupt event ends the generator promptly.
   - Add/extend a `chat:start-stream` test proving `finish` is posted promptly on interrupt and only once.

### Files expected to change (apply stage)
- `src/main/handlers/chat-handlers.ts`
- `src/main/services/domain/workflow/utils/assistant-ui-stream.ts`
- `src/main/services/domain/workflow/utils/__tests__/assistant-ui-stream.test.ts`
- `src/main/handlers/__tests__/chat-interrupt-resume.test.ts` (or a new focused test file nearby)

## Current Architecture (simplified)
```
Node code (streamLLM + chunk emitter)
  |
  | emits DataStreamChunk via config.writer()
  v
workflowGraph.stream(..., streamMode: ['messages','custom'])
  |
  v
toAssistantUIStream()  -- passes through only ['custom', chunk]
  |
  v
chat-handlers.ts for-await loop
  |
  v
finally { post finish; close }
```

### Failure Mode
```
assistant text streamed
    |
interrupt() happens
    |
graph pauses waiting for resume
    |
no more chunks arrive
    |
for-await never exits -> finally never runs -> finish delayed
```

## Proposed Architecture
### Key rule
Interrupt is a stream boundary.

### Data flow
```
workflowGraph.stream(..., streamMode: ['custom', 'updates', ...])
  |
  +--> ['custom', DataStreamChunk]  -> forwarded as SSE
  |
  +--> ['updates', evt] where evt contains __interrupt__ -> stop iteration
  |
  v
chat-handlers finally emits finish and closes port
```

### Responsibilities (clean ownership)
```
Workflow nodes:
  - emit text/tool/reasoning chunks
  - call interrupt() when waiting for user
  - MUST NOT emit finish

Stream adapter (toAssistantUIStream):
  - format DataStreamChunk as SSE
  - detect interrupt events and end the generator
  - ignore other update noise

Transport boundary (chat-handlers.ts):
  - owns finish + close
  - owns error mapping to error chunk + finish
  - owns resume logic (Command({ resume }))
```

## AI SDK v5 Compatibility Notes (in this repo)
- The repo uses a "data: { type: ... }" chunk envelope with `finish` as the stream terminator.
- Therefore, we keep:
  - `text-start`/`text-delta`/`text-end` for assistant text
  - `tool-*` for tool rendering
  - `error` for transport-level failures
  - `finish` exactly once, at the end of the stream
- We do NOT introduce new chunk types for this fix.

## Implementation Sketch (conceptual)
### Stream config
Use a LangGraph stream mode that includes:
- `custom`: for existing node-emitted `DataStreamChunk`
- `updates` (or equivalent): to surface interrupt events that carry `__interrupt__`

### Interrupt detection
Use the existing helper:
- `isInterruptEvent(evt)` from `src/main/services/domain/workflow/interrupt.ts`

When an interrupt event is observed:
- stop iterating the stream immediately (return from generator)
- let the handler `finally` emit `finish` + close the port

## Trade-offs
### Pros
- Fixes the UX delay without changing node code.
- Keeps finish semantics stable and centralized.
- Scales: any node that calls `interrupt()` benefits.

### Cons
- Requires enabling an additional stream mode (potentially more events).
- Needs careful filtering to avoid extra UI noise.

## Future Extension (optional, not required now)
If the UI ever needs structured "awaiting input" metadata (beyond the text already streamed), we can emit a standard `tool-output-available` chunk before ending the stream:
```
toolName: "AwaitUserInput"
output: { ok: true, data: { type, prompt, checkpointId } }
```
This keeps protocol compatibility while enabling richer UI, but it is not required for the initial fix.
