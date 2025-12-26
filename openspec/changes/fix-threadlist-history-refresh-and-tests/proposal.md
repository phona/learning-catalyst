# Proposal: Fix ThreadList history still stuck/empty on refresh + improve tests

## Change ID
fix-threadlist-history-refresh-and-tests

## Status
Proposed

## Type
Bug Fix + Test Quality

## Summary

We previously fixed one cause of an “empty history” sidebar: completed sessions were mapped to `archived`, but the sidebar only rendered regular threads.

Users still report the *same symptom* after a refresh (“history looks stuck loading / empty”), which means:
- either the real refresh path is failing in a different way than our unit tests cover
- or we shipped the UI fix but did not protect against slow/hanging IPC calls that keep the UI in a loading state

This change proposes:
1) a small runtime-safe fix so “history thread switching / refresh” cannot block forever on slow IPC
2) stronger tests (integration + contract) that exercise the real runtime wiring, not only mocked primitives

## Current Behavior (Problem)

On refresh (ex: `/chat` or `/chat/:sessionId`) users can see:
- Sidebar shows a loading state that never finishes, OR
- Sidebar shows no sessions even though sessions exist

## What We Already Fixed (but is not enough)

We added a “History” section that renders `archivedThreadIds` in `ThreadListSidebar`.

That addresses this narrow case:
```
sessions:list resolves OK
  -> completed sessions mapped to archivedThreadIds
  -> UI renders only archived=false items
  -> looks empty
```

But it does not prove the real app refresh path works, because mocked tests can still pass while:
- IPC hangs (never resolves)
- runtime never leaves `isLoading`
- switching to an archived thread blocks on `unarchive()`

## Suspected Root Causes (Why it can still fail)

### A) IPC call never resolves (hang)
If `sessions:list` or `sessions:update` never resolves, Assistant UI can stay in a loading state.

### B) Switching to an archived thread blocks
Assistant UI’s remote thread list runtime calls `unarchive()` when switching to an archived thread.
If our adapter’s `unarchive()` blocks on IPC, then “refresh into a completed session” can hang.

### C) Tests are too mocked
Our existing tests can prove the bucket mismatch, but not the end-to-end wiring:
```
ReadyApp -> useRemoteThreadListRuntime -> adapter.list/fetch/unarchive -> ThreadListSidebar
```

## Goals

- Refresh shows sessions reliably (regular and/or history).
- Switching to a history (completed) session does not block forever.
- Add tests that cover the real runtime integration path.
- Keep changes small. No new production dependencies.

## Non-Goals

- Redesigning the sidebar UX.
- A full new archive domain model.
- Adding complex retry frameworks.

## Proposed Change

### 1) Make “unarchive” non-blocking (prevent hangs)

Change the adapter so `unarchive()` cannot block the UI.

Idea (high level):
```
unarchive(remoteId):
  kick off IPC update in background (log on failure)
  return resolved Promise immediately
```

This keeps the UI responsive even if IPC is slow or stuck.

### 2) Add a small “still loading” fallback (optional, minimal UX)

If `threads.isLoading` stays true for too long:
- show a small message: “Loading history…”
- show a “Retry” button that triggers a reload

This turns “looks broken” into “actionable state”.

### 3) Add tests that match real wiring

Add a layered test set:

**Unit (fast)**
- Adapter mapping: completed -> archived
- Adapter unarchive: returns quickly even if underlying IPC never resolves

**Integration (renderer runtime)**
- Mount `ReadyApp` (or a minimal runtime wrapper) with stubbed `SessionService`
- Assert after “refresh”:
  - History header shows if archived exists
  - Clicking a history item switches thread without hanging

**Contract (main ↔ renderer shape)**
- Ensure `sessions:list` returns `SessionDisplay.status` with expected values
- Ensure adapter handles all values we can receive (`active`, `paused`, `completed`, `archived`, `undefined`)

## Data Flow Diagram (target)

```
refresh
  -> adapter.list() (must resolve or fail fast)
  -> threads.isLoading becomes false
  -> sidebar renders:
       Conversations (regular)
       History (archived)

refresh /chat/:completedSessionId
  -> switchToThread(completed)
  -> runtime calls adapter.unarchive()
       (must not block UI)
  -> history messages load
```

## Acceptance Criteria

- If only completed sessions exist, refresh `/chat` shows them under “History”.
- Refresh `/chat/:sessionId` for a completed session does not hang (UI becomes usable).
- New tests exist:
  - unit: mapping + non-blocking unarchive
  - integration: runtime wiring renders History and can switch
  - contract: sessions:list status values are handled
- `npm test` and `npm run lint` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert adapter + sidebar changes and remove new tests. No data migration required.

