# Proposal: Make assistant-ui Stop button actually cancel streams

## Change ID
fix-assistant-ui-stop-cancel

## Status
Proposed

## Type
Bug Fix + UX

## Summary

The `assistant-ui` Stop button (stop generating / stop asking) does not stop the current reply in our app.

Today, clicking Stop aborts the request in the UI, but our custom IPC transport does **not** listen to the abort signal.
So the stream keeps running until the workflow finishes (or the port closes), and in many cases the user still sees the assistant continue.

We will wire abort/cancel end-to-end:

- UI abort signal -> renderer stream cancel
- renderer cancel -> preload cancel -> main cancel
- main cancel -> stop workflow streaming + emit `abort` chunk + close stream

## Why

Users expect Stop to end generation immediately. When it does not, the UI feels broken and we waste backend work (tokens + tool calls) after the user has already decided to stop.

## What Changes

- Renderer transport now listens to AbortSignal and cancels the active IPC stream.
- Preload cancel sends a `chat:cancel-stream` IPC message keyed by `streamId`.
- Main registers active streams by `streamId` and, on cancel, emits a terminal `abort` chunk and closes the stream (without also emitting `finish`).
- Added regression tests for renderer abort wiring and main cancel behavior.

## Current Behavior (Bug)

- User sends a message.
- Assistant starts streaming.
- User clicks Stop.
- The stream often keeps going (or stops visually but the backend keeps working).

## Root Cause (Plain Explanation)

There are **two cancellation gaps**:

### Gap 1: AbortSignal is ignored in the renderer transport

Our IPC fetch shim never reads `init.signal`, so `fetch(..., { signal })` aborts do nothing.

Relevant file:
- `src/renderer/services/chat/ipcFetch.ts`

Today it only cancels when the *ReadableStream consumer* calls `cancel()`, which is not the same thing as an AbortSignal abort.

### Gap 2: "Cancel" does not stop the main workflow

Even if the renderer stops reading, the main process workflow stream has no cancel channel.
Closing the MessagePort is not a reliable "stop generating" signal for the backend.

Relevant files:
- `src/main/preload/index.ts` (cancel currently just closes `port1`)
- `src/main/handlers/chat-handlers.ts` (no cancel handler; always runs `finally` and emits `finish`)

### Flow diagram (today)

```
assistant-ui Thread
  | Stop => abort fetch signal
  v
createIpcFetch (ignores signal)  <-- BUG (gap 1)
  | starts ReadableStream
  v
electronAPI.aiSDK.stream (preload)
  | returns cancel() = port1.close() only  <-- incomplete (gap 2)
  v
ipcMain 'chat:start-stream' (main)
  | workflowGraph.stream(...) continues
  v
posts chunks until finish
```

## Goals

- Clicking Stop ends streaming quickly (human-feels-instant; target < 200ms locally).
- No more chunks are appended after Stop.
- The backend stops work (no wasted LLM tokens / tool calls after Stop).
- No new production dependencies.
- Add tests so this does not regress.

## Non-Goals

- Redesign assistant-ui usage or UI layout.
- Change the streaming protocol shape beyond using existing `abort` chunk support.
- Add new "pause/resume" UX.

## Proposed Change (High Level)

Treat Stop as a first-class "cancel stream" signal that flows across layers:

```
UI AbortSignal
  -> renderer cancels stream + calls cancel fn
  -> preload sends IPC "cancel-stream" keyed by streamId
  -> main aborts the active stream + emits `abort`
```

### Implementation outline (no code yet)

1) Renderer: connect AbortSignal to stream cancellation
   - In `createIpcFetch`, if `init.signal` aborts:
     - call the cancel function returned by `api.aiSDK.stream(...)`
     - close/error the ReadableStream controller so assistant-ui stops reading

2) Preload: cancel must notify main
   - Keep generating `streamId` in preload.
   - When cancel is called, also send `chat:cancel-stream` (or similar) with that `streamId`.

3) Main: add cancel handler + stream registry
   - Track active streams by `streamId` (replyPort + abort/iterator handle).
   - On cancel:
     - stop iteration / abort the underlying workflow stream
     - emit `abort` chunk (we already have `createAbortChunk()` available)
     - close the port
   - Ensure we do not emit both `abort` and `finish` for the same stream.

4) Tests
   - Renderer unit test: aborting the signal triggers cancel.
   - Main handler test: cancel stops further chunk posting and emits `abort`.

## Alternatives Considered

### A) Only stop rendering (ignore backend cancel)
- Pro: simpler, fewer moving parts.
- Con: still wastes work/tokens, and tool calls may keep running.

### B) Only close MessagePort and hope it stops main
- Pro: minimal changes.
- Con: not a reliable cancellation contract; main currently has no cancellation path.

## Risks / Notes

- Duplicate terminal chunks (`abort` + `finish`) can confuse the client.
  - Mitigation: centralize terminal emission per streamId and guard it.
- Races: cancel can arrive while main is already finishing.
  - Mitigation: idempotent cancel; ignore if already terminal.

## Acceptance Criteria

- When the user clicks Stop during streaming:
  - UI stops appending new text immediately.
  - Main stops streaming and emits a terminal `abort` (or equivalent) for that stream.
  - No duplicate terminal events are emitted for the same stream.
- Tests added and passing:
  - renderer transport abort test
  - main cancel-stream test
