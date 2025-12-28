# Proposal: Fix assistant-ui "Edit message" (re-edit) not working

## Change ID
fix-assistant-ui-message-edit

## Status
Archived (2025-12-26)

## Type
Bug Fix + UX

## Summary

The `assistant-ui` "Edit" (re-edit) button shows up in our chat UI, but it does not produce a correct or stable result.

The core issue is that our chat stack is optimized for "append-only delta streaming" and "checkpoint-based history", while `assistant-ui` edit/branching expects the backend to honor a **trimmed history** when the user edits an earlier message.

Today we drop the needed context at the renderer transport boundary and (even if we passed it) the main process ignores it and runs from the latest checkpoint state.

## Why

- Showing a broken "Edit" control causes misleading behavior: the next model run can use the wrong context (latest checkpoint) instead of the user’s edited history.
- Our current chat architecture is checkpoint-driven and append-only; it cannot yet honor assistant-ui’s trimmed-history edit/branch semantics.

## What Changes

- Phase 1 (this change): hide the user-message Edit (pencil) action in the chat UI (`userMessage.allowEdit = false`), so users can’t enter a broken edit mode.
- Add a regression test to ensure the Edit action stays unavailable until true branching is implemented.

## Current Behavior (Bug)

When the user clicks the pencil icon and edits a previous user message:

- The UI can enter edit mode, but after Send:
  - the reply is generated using the wrong context (latest checkpoint history), or
  - the "edit" effect does not persist / does not behave like a true branch.

## Expected Behavior

Edit (re-edit) should be truthful:

Either:
- **Option A (short-term)**: We do not support edit/branching yet, so we hide/disable the edit action.

Or:
- **Option B (full support)**: Editing an earlier message creates a real branch:
  - the model run uses the **trimmed history** as context
  - the new branch is navigable (assistant-ui branch picker)
  - history persistence matches what the user sees

## Root Cause (Plain Explanation)

`assistant-ui` edit flow is "branching":

- it truncates the in-memory message list to `parentId`
- it sends a new message that is not at the head
- the runtime treats this as an "edit" and expects the backend to continue from that point

But our current implementation is "append-only delta":

- renderer transport (`IpcChatTransport`) intentionally sends only the latest user delta (`newUserMessage`)
- main process streaming uses `thread_id` checkpoints and ignores any trimmed history

### Flow diagram (what assistant-ui expects)

```
Click pencil (edit)
  -> build trimmed messages: [m0, m1, ... parent]
  -> sendMessage(trimmed + new user text)
  -> backend runs with that trimmed history
  -> result becomes a branch under "parent"
```

### Flow diagram (what we do today)

```
Click pencil (edit)
  -> assistant-ui trims history in memory
  -> sendMessage(...) happens
  -> IpcChatTransport keeps only last user delta  <-- context lost here
  -> main runs from latest checkpoint(thread_id)  <-- ignores trim/branch
  -> result mismatches user intent
```

### Key locations

- Renderer transport drops history on purpose:
  - `src/renderer/services/chat/IpcChatTransport.ts`
- IPC bridge only forwards `conversationId` + (`newUserMessage` or `messages`), but main only uses last user text:
  - `src/renderer/services/chat/ipcFetch.ts`
  - `src/main/preload/index.ts`
  - `src/main/handlers/chat-handlers.ts`
- assistant-ui / AI SDK runtime expects edit to work via `onEdit`:
  - `node_modules/@assistant-ui/react-ai-sdk/src/ui/use-chat/useAISDKRuntime.tsx`

## Goals

- Remove "broken control" UX: do not show an Edit action that cannot work correctly.
- Keep behavior consistent with our persistence model (LangGraph checkpoints as source of history).
- No new production dependencies.
- Add tests to prevent regressions.

## Non-Goals

- Implement full message-branch persistence in this change (requires design choices about how branches map to checkpoints + session IDs).
- Redesign the entire chat storage model.

## Proposed Change

### Phase 1 (this bug fix): disable Edit until backend supports it

We set `userMessage.allowEdit = false` in our `<Thread />` config, so the pencil icon does not appear.

This turns a "silent broken feature" into an explicit "not supported" state.

Optional (if we want): show a small UI hint near the composer like:
"Editing previous messages is not supported yet (branching coming soon)."

### Phase 2 (follow-up change): design + implement true branching

There are two viable architecture directions:

#### Direction B1: Branch = separate backend `thread_id`

- When an edit starts at `parentId`, create a derived backend thread id:
  - example: `thread_id = <sessionId>::branch::<branchId>`
- Run the workflow on that derived thread_id (separate checkpoint lineage).
- Store the mapping so:
  - switching branches in assistant-ui switches backend thread_id for subsequent sends
  - history loading can retrieve the right checkpoint history for that branch

Pros: works with LangGraph checkpoint model.
Cons: requires a mapping layer (UI branch <-> backend thread_id) and likely DB storage.

#### Direction B2: Rewind checkpoints within the same `thread_id`

- Attach enough metadata per message to identify a checkpoint boundary.
- On edit, load the earlier checkpoint state and resume from it.

Pros: keeps one sessionId/thread_id.
Cons: hard unless we store per-message checkpoint ids (today we do not).

## Acceptance Criteria (Phase 1)

- The chat UI does not show the message Edit (pencil) action.
- Existing send/stream behavior is unchanged.
- A regression test covers the "Edit is not available" UI state.

## Follow-up Acceptance Criteria (Phase 2 - separate change)

- Editing a previous user message creates a consistent new branch:
  - branch is visible/selectable in the UI
  - model responses match the trimmed history context
  - persisted history matches the selected branch
