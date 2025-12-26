# OpenSpec Proposal: End Turn Stream on Workflow Interrupt (AI SDK v5 Compatible)

## Change ID
end-turn-stream-on-interrupt

## Status
Proposed

## Type
Architecture + Bug Fix

## Problem
When a workflow node calls LangGraph `interrupt()` after streaming assistant content, the chat stream does not end until the user responds. The UI can show "thinking" even though the system is waiting for input.

### Observed Root Cause (current pipeline)
1. Nodes stream chunks via `config.writer()` (`text-*`, `tool-*`, etc.).
2. Node calls `interrupt()`.
3. The compiled graph stops yielding further chunks while it is paused for resume.
4. `chat:start-stream` waits in a `for await (...)` loop until the stream completes.
5. `finish` is sent in a `finally` block, so it is delayed until the loop exits.

## Goals
- Make the stream end promptly when the workflow reaches `interrupt()`.
- Keep compatibility with the existing AI SDK v5-style data stream chunks used in this repo (`text-start`, `text-delta`, `text-end`, `finish`, etc.).
- Keep `finish` ownership in one place (transport boundary), not inside workflow nodes.
- Preserve the existing interrupt resume behavior: resume via `Command({ resume })` and checkpoints.

## Non-Goals
- No new production dependencies.
- No new chunk types required by the renderer (avoid breaking changes to the stream protocol union types).
- No redesign of workflow checkpoint persistence (handled by existing specs/changes).

## Constraints (AI SDK v5-compatible restrictions)
- `finish` MUST mean "this stream is done" in this app’s transport layer.
- Nodes MUST NOT emit `finish` themselves (prevents early termination and duplicate finish).
- Interrupt is a control-flow boundary: when it happens, we end the current stream and wait for a new request to resume.

## Proposed Architecture (high level)
Treat each `chat:start-stream` call as a "turn stream":

```
Renderer sends user delta
        |
        v
Main: chat:start-stream -> start graph stream (custom + updates)
        |
        +--> custom chunks (text/tool/reasoning) forwarded to UI
        |
        +--> interrupt event detected -> stop iteration
        |
        v
Main sends finish + closes port (UI input enabled)
        |
        v
Renderer sends next user delta -> Main resumes via Command({ resume })
```

## Solution Outline
1. Ensure the workflow stream surfaces interrupt events to the handler (use LangGraph stream mode that includes interrupt-bearing events, e.g. `updates`).
2. Update the stream adapter (`toAssistantUIStream`) to detect an interrupt event and end iteration immediately.
3. Keep `finish` emission in `chat-handlers.ts` `finally` (single authority). The early iterator termination makes `finally` run immediately on interrupt.

## Alternatives Considered
### A) Emit `finish` from `streamLLM()`
- Pro: Local, easy change.
- Con: `streamLLM()` is a utility; it does not know turn boundaries. Emitting `finish` there can end the stream too early or cause duplicates in multi-step turns.

### B) Frontend stops spinner on `text-end`
- Pro: Minimal backend change.
- Con: Leaves stream open while waiting; violates the intent of `finish` as end-of-stream in this app and complicates other clients.

### C) Poll checkpoint state to detect pending interrupt
- Pro: No change to stream modes.
- Con: Adds timing complexity, extra load, and still may be delayed. Hard to reason about.

## Recommendation
Implement the "turn stream boundary" approach: detect interrupt events from the graph stream and end the stream immediately (emit `finish` once at the transport boundary).

## Risks
- Turning on additional stream modes (e.g., `updates`) could increase event volume.
  - Mitigation: filter aggressively; only act on interrupt events and ignore the rest.
- Incorrect interrupt detection could end streams early.
  - Mitigation: use the existing `isInterruptEvent` helper and add focused tests.

## Success Criteria
- `finish` is sent promptly after the workflow hits `interrupt()` (no wait for user reply).
- `finish` is sent exactly once per stream.
- Existing resume behavior remains unchanged.
- Automated tests cover the interrupt finish timing behavior.

