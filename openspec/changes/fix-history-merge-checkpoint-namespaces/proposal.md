# Proposal: Merge Chat History Across Checkpoint Namespaces

## Change ID
fix-history-merge-checkpoint-namespaces

## Status
Proposed

## Type
Bugfix

## Summary

History loads but misses messages because chat:get-messages only reads checkpoints with
checkpoint_ns = ''. Messages created by Teach/Practice subgraphs are stored under their own
namespaces, so they are ignored.

## User Story

As a user, I want full chat history when I reopen a session, so I can continue the
conversation without missing messages.

## Current Behavior (Problem)

- chat:get-messages reads only checkpoint_ns ''.
- Messages stored in other namespaces (Teach/Practice) are not loaded.
- Result: partial history even though data exists in SQLite.

## Root Cause

LangGraph automatically creates separate checkpoint namespaces for subgraphs. When the Teach or Practice subgraphs execute, they checkpoint state under their own namespaces (e.g., `checkpoint_ns = 'teach'` or `'practice'`). The current `getMessages()` implementation only queries the default namespace (`checkpoint_ns = ''`), so all subgraph messages are ignored.

## Goals

- Load all messages across namespaces for a thread.
- Preserve the checkpoint abstraction layer (BaseCheckpointSaver interface).
- Keep order stable and avoid duplicates.
- Keep code simple, testable, and dependency-free.

## Non-Goals

- Changing how checkpoints are written.
- Migrating existing data.
- Changing thread list or session analytics behavior.
- Adding SQLite-specific methods to the checkpoint saver interface.

## Proposed Change

Merge the latest checkpoint per namespace and return a single ordered message list.

Steps:

1) Query the latest checkpoint for each known namespace using `BaseCheckpointSaver.getTuple()`
2) Extract messages from each checkpoint
3) Merge + de-dup + sort by timestamp

Simple flow:

```
namespaces: ['', 'teach', 'practice']
        | getTuple() per namespace (parallel)
        v
checkpoints (per namespace)
        | extract messages
        v
 [messages] + [messages] + [messages]
        | merge + de-dup + sort
        v
   full history list
```

### Implementation Notes

**CRITICAL**: Preserve the checkpoint abstraction layer. The chat service depends on `BaseCheckpointSaver`, not `SQLiteCheckpointSaver`. Do NOT add SQLite-specific methods.

**Correct approach:**

```typescript
// chat-service.ts
getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
  // Known namespaces - could be made configurable
  const namespaces = ['', 'teach', 'practice'];

  // Query all namespaces in parallel through the ABSTRACTION
  const checkpoints = await Promise.all(
    namespaces.map(ns =>
      checkpointSaver.getTuple({
        configurable: { thread_id: sessionId, checkpoint_ns: ns }
      })
    )
  );

  // Filter out undefined (missing namespaces)
  const validCheckpoints = checkpoints.filter(cp => cp !== undefined);

  // Extract messages from each checkpoint
  const allMessages = validCheckpoints.flatMap(cp => extractMessages(cp));

  // De-duplicate, sort, and return
  return mergeAndSortMessages(allMessages);
}
```

**De-duplication strategy:**
- Primary key: `message.id` (if present)
- Fallback: stable hash of `role + content + timestamp + tool_calls`
- For duplicates with different timestamps: keep the earliest

**Sorting strategy:**
- Primary: `message.timestamp`
- Fallback 1: checkpoint `metadata.created_at`
- Fallback 2: original message index in checkpoint array

**Error handling:**
- If one namespace fails, log and continue with others
- Only throw if ALL namespaces fail
- Gracefully handle missing checkpoints (undefined results)

### Why Not Add SQLiteCheckpointSaver Methods?

Adding a method like `getLatestCheckpointsPerNamespace()` to `SQLiteCheckpointSaver` would:

1. **Break abstraction** - Chat service would depend on concrete implementation
2. **Reduce testability** - Can't mock with simple `getTuple` interface
3. **Limit future changes** - Can't swap checkpoint backends (Redis, Postgres, etc.)
4. **Violate LangGraph patterns** - LangGraph expects `BaseCheckpointSaver` interface

The multi-query approach (3 queries vs 1) is acceptable because:
- Queries are parallelizable
- Typical sessions have tens to hundreds of messages, not thousands
- The performance impact is negligible compared to database connection overhead
- Abstraction preservation is worth the minor cost

## Alternatives Considered

### Option A: Disable Subgraph Namespaces
Configure LangGraph to use a single namespace for all subgraphs.

**Rejected because:**
- Loses subgraph state isolation
- Breaks LangGraph's intended patterns
- Higher regression risk
- May cause state conflicts between main workflow and subgraphs

### Option C: Copy Messages to Default Namespace
Write all messages to the default namespace on checkpoint.

**Rejected because:**
- Data duplication (storage overhead)
- Migration complexity
- Doesn't prevent future splits
- Violates LangGraph's namespace design

### Option D: Extend LangGraph BaseCheckpointSaver
Submit a PR to add a `listNamespaces()` method to LangGraph's base class.

**Rejected because:**
- Depends on upstream acceptance
- Timeline uncertainty
- Overkill for this specific fix

## Acceptance Criteria

- chat:get-messages returns all messages across namespaces for a thread.
- Preserves `BaseCheckpointSaver` abstraction (no SQLite-specific methods).
- Order is consistent and stable across reloads.
- No duplicates when the same message appears in multiple namespaces.
- No new production dependencies.
- Tests updated and passing.
- `openspec validate fix-history-merge-checkpoint-namespaces` passes.

## Rollback Plan

Revert chat-service `getMessages()` to query only the default namespace (`checkpoint_ns: ''`).
