# OpenSpec Change Proposal: Fix Interrupt Checkpoint Persistence When Ending Turn Stream

## Change ID
fix-interrupt-checkpoint-persistence-on-stream-end

## Status
Proposed

## Type
Bug Fix + Test Quality

## Summary

We end the chat stream as soon as the workflow hits `interrupt()` (good UX: UI stops “thinking” and waits for user input).

But ending the stream by returning from a `for await (...)` loop can cancel the upstream LangGraph stream too early. In some cases, that can prevent the interrupt checkpoint from being persisted, so the next user message cannot resume and the system re-enters TEACH `Explain` instead of answering the new question.

This change proposes:
- a small fix in the stream adapter to avoid “cancel too early on interrupt”
- stronger regression tests that model a cancel-sensitive upstream stream (so we can catch this class of bug again)

## Why

Interrupt checkpoints must persist so the next user message can resume the pending interrupt. When the adapter cancels the upstream stream immediately, that persistence can be skipped, which makes the assistant restart TEACH instead of answering the new question.

## What Changes

- Avoid synchronous upstream cancellation when an interrupt is observed (defer the close by one tick).
- Add regression tests that model a cancel-sensitive upstream stream.

## Current Behavior (Problem)

Today `toAssistantUIStream()` ends immediately when it detects an interrupt event.

Current code shape (simplified):
```
for await (const evt of workflowStream) {
  if (isInterruptEvent(evt)) return;  // stop stream now
}
```

In JavaScript, returning from a `for await` loop triggers `iterator.return()` on the upstream async iterator.

If the upstream workflow does “persist interrupt checkpoint” *after* yielding the interrupt event (async), cancelling the iterator right away can cause the write to never happen.

## User-Facing Symptom

User asks a follow-up question, but the assistant “teaches again” instead of answering:
```
Turn 1: Explain -> interrupt(teach_response)
Turn 2: user asks "how to install python?"
   expected: classify -> handleQuestion answers
   actual: Explain runs again (looks like the question was ignored)
```

## Root Cause (Model)

Two timelines:

### Bad (today)
```
workflow yields interrupt event
adapter sees interrupt
adapter returns from `for await`  -> upstream iterator.return() called
upstream is cancelled before "persist interrupt checkpoint" finishes
```

### Good (after fix)
```
workflow yields interrupt event
adapter sees interrupt
adapter stops yielding to UI (turn ends)
adapter does NOT cancel upstream immediately
allow brief time for persistence to complete
then close/cancel upstream (or leave it to be GC-safe)
```

## Goals

- Interrupt checkpoints persist reliably even when we end the UI stream promptly.
- Next user message resumes pending interrupts (no TEACH restart).
- Add regression tests that fail on the old behavior and pass on the fix.
- Keep changes small; no new production dependencies.

## Non-Goals

- Redesigning LangGraph checkpoint persistence.
- Changing the streaming protocol types (`text-*`, `finish`, etc.).
- Adding a retry/backoff framework.

## Proposed Change

### 1) Refactor `toAssistantUIStream()` to avoid synchronous upstream cancellation

Instead of `for await (...)` directly over the workflow stream, use a manual iterator:
- `const it = workflowStream[Symbol.asyncIterator]();`
- loop with `await it.next()`

When an interrupt event is observed:
- stop yielding immediately (preserve “finish promptly” UX)
- *do not* synchronously call `it.return()` as part of exiting a `for await`
- schedule a deferred close/cancel:
  - wait a tiny amount (example: `setTimeout(..., 0)` or a few ms)
  - then call `it.return?.()` (best effort)

This allows “post-interrupt persistence” to run before cancellation.

### 2) Promote regression tests from RED to GREEN

We already have a red test that encodes the desired behavior.
After implementing the fix, that test becomes green and prevents regressions.

## Test Plan (per docs/DEVELOPER-GUIDE/testing.md)

We add deterministic, cancel-sensitive tests (no real Electron):
- main-process unit tests under `src/main/services/domain/workflow/utils/__tests__`
- fake upstream async iterator that models “interrupt then async persist”
- fake timers to control timing deterministically

## Acceptance Criteria

- `toAssistantUIStream` ends the turn stream promptly on interrupt (existing timing tests still pass).
- `toAssistantUIStream` does not cancel the upstream iterator synchronously on interrupt.
- The regression tests in `src/main/services/domain/workflow/utils/__tests__/assistant-ui-stream-interrupt-persistence.regression.test.ts` pass (after fix).
- `npm test` and `npm run lint` pass (excluding unrelated pre-existing failures).

## Rollback Plan

Revert the adapter changes and remove the new tests. No data migrations required.
