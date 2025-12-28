# Tasks: Merge Chat History Across Checkpoint Namespaces

## Checklist

- [ ] Update `chat-service.getMessages()` to query multiple namespaces
  - Query `checkpoint_ns: ''`, `'teach'`, `'practice'` via `BaseCheckpointSaver.getTuple()`
  - Query in parallel using `Promise.all()`
  - Filter out `undefined` results (missing/empty namespaces)
- [ ] Implement message merge logic
  - Extract messages from each checkpoint
  - De-duplicate by message.id, fallback to stable hash
  - Sort by timestamp with fallbacks (checkpoint.created_at, index)
- [ ] Add error handling for partial failures
  - Log errors for individual namespace failures
  - Continue with other namespaces if one fails
  - Only throw if ALL namespaces fail
- [ ] Add tests for namespace merge + de-dup ordering
  - Test session with Teach subgraph messages only
  - Test session with Practice subgraph messages only
  - Test session with messages across all namespaces
  - Test duplicate messages across namespaces
  - Test missing timestamps (use checkpoint metadata)
  - Test missing/failed namespaces (graceful degradation)
  - Test interrupt messages from subgraphs
  - Test that mock checkpoint savers work (abstraction preserved)
- [ ] Update docs if public behavior changes (CLAUDE.md + docs/)
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] `openspec validate fix-history-merge-checkpoint-namespaces`
- [ ] Archive change when complete

## Commands

Validate the proposal:

```
openspec validate fix-history-merge-checkpoint-namespaces
```

## Implementation Notes

**DO NOT:**
- Add methods to `SQLiteCheckpointSaver`
- Cast to concrete types
- Access database layer directly

**DO:**
- Use `checkpointSaver.getTuple({ configurable: { thread_id, checkpoint_ns } })`
- Preserve the `BaseCheckpointSaver` abstraction
- Make namespaces configurable if needed (const array is fine for v1)
