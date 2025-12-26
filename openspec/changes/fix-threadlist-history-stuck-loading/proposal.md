# Proposal: Fix ThreadList "history sessions loading" stuck on refresh

## Change ID
fix-threadlist-history-stuck-loading

## Status
Proposed

## Type
Bug Fix + UX

## Summary

After a page refresh, the sidebar thread list can look "stuck loading" / empty even though history sessions were retrieved.

Root cause: sessions that come back as `status: "completed"` are mapped to `threads.status = "archived"` by the thread list adapter, but the sidebar only renders the **regular** list (default `archived={false}`).

So the data is present in `threads.archivedThreadIds`, but the UI never displays it.

## Current Behavior (Bug)

- Refresh `/chat` (or open the app).
- Thread list adapter `list()` runs and returns threads.
- The sidebar shows no threads (or looks like it is still loading).

## Root Cause (Plain Explanation)

We have two buckets in assistant-ui:

- `threads.threadIds` = regular
- `threads.archivedThreadIds` = archived

Our adapter maps:

```
session.status === "completed" => thread.status = "archived"
```

But the sidebar renders only:

```
<ThreadListPrimitive.Items archived={false} />
```

So if the user has only completed sessions, the list is empty even though data exists.

### Data flow diagram (today)

```
sessions:list (IPC)
  -> createThreadListAdapter.list()
       completed => archived
  -> assistant-ui state
       threads.archivedThreadIds = [session-1, session-2]
       threads.threadIds         = []
  -> ThreadListSidebar
       renders ONLY threadIds (archived=false)
       => empty UI
```

## Goals

- If sessions exist (even if "completed"), the sidebar shows them after refresh.
- The UI makes it clear what is "active" vs "history".
- No new production dependencies.
- Add/keep a regression test that proves the bug and the fix.

## Non-Goals

- Changing backend meaning of `status: "completed"` (learning completion semantics).
- Implementing a full archive/unarchive domain model (we can follow up later if needed).
- Redesigning the entire sidebar.

## Proposed Change (High Level)

Render **both** regular and archived thread lists in the sidebar:

- Section A: "Conversations" (regular threads)
- Section B: "History" (archived threads; i.e., completed sessions today)

Implementation sketch (no code yet):

```
if threads.isLoading:
  show skeleton
else:
  render ThreadListPrimitive.Items (archived=false)
  render ThreadListPrimitive.Items (archived=true) under "History"
```

Optional UX tweak (still minimal):
- If regular list is empty but history has items, keep "History" expanded by default.

## Alternatives Considered

### A) Change mapping: completed => regular

Pros:
- Minimal UI change.

Cons:
- Breaks the meaning of the "Archive" action in the current adapter (archive uses status=completed).
- Mixes active vs completed sessions.

### B) Add a toggle to switch between regular and archived

Pros:
- Keeps UI compact.

Cons:
- Users still see an empty list unless they discover the toggle.

### C) Proper model: use `is_archived` (separate from completion status)

Pros:
- Clean semantics long-term.

Cons:
- Requires API + domain changes (bigger scope than this focused bug fix).

## Risks / Notes

- Showing "History" may increase list length; we can mitigate with simple collapse later.
- We must ensure `threads.isLoading` gates both sections consistently.

## Evidence / Repro (Test)

Renderer repro test added:
- `src/renderer/widgets/layout/__tests__/threadlist-archived-sessions-bug.test.tsx:96`

It demonstrates:

```
threadIds = []
archivedThreadIds = ["session-1", "session-2"]
=> sidebar renders 0 items today
```

The same file includes an `it.fails(...)` test that describes the expected behavior after the fix.

## Acceptance Criteria

- When `threads.threadIds` is empty but `threads.archivedThreadIds` has items, the sidebar shows those items (under "History") after refresh.
- `src/renderer/widgets/layout/__tests__/threadlist-archived-sessions-bug.test.tsx` passes without `it.fails(...)` (convert it to a normal passing test).
- Run:
  - `npm run test:renderer`
  - `npm run lint`
  - `openspec validate fix-threadlist-history-stuck-loading --strict`

