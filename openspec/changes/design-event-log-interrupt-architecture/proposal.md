# Proposal: Native Interrupt with External Storage Restore

## Summary

Implement a reliable interrupt system using LangGraph's native `interrupt()` for workflow pausing, combined with external SQLite storage for interrupt context persistence. This enables seamless interrupt resuming across page reloads and app restarts.

## Problem

LangGraph's native `interrupt()` provides workflow pausing but doesn't persist interrupt context:

```
LangGraph interrupt():
┌─────────────────────────────────────────────────────┐
│  ✓ Pauses workflow                                   │
│  ✓ Emits interrupt event in stream                  │
│  ✗ Checkpoint doesn't store interrupt payload       │
│  ✗ Page reload = handler gone = lose interrupt      │
└─────────────────────────────────────────────────────┘
```

**Result**: Users lose their place in structured interactions when reloading the page.

## Solution

Use external SQLite storage as the "interrupt context bridge":

```
┌─────────────────────────────────────────────────────────────────────┐
│  Workflow Node                                                       │
│  return interrupt({ type: 'qa', prompt: 'What aspect?' })           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Handler (active during stream)                                      │
│  1. Receives interrupt event from LangGraph                         │
│  2. Stores context in external storage                              │
│  3. Emits interrupt-start to frontend                               │
│  4. Workflow is paused                                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  External Storage (SQLite)                                           │
│  - interrupt_id                                                      │
│  - thread_id (conversation)                                          │
│  - checkpoint_id (for precise resume)                                │
│  - type, payload, status, timestamps                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Page Reload / App Restart                                           │
│  1. Frontend queries pending interrupts                              │
│  2. Backend returns interrupt context from SQLite                    │
│  3. Frontend restores UI state                                       │
│  4. User responds → resume-interrupt                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Why This Approach

| Aspect | Benefit |
|--------|---------|
| **Native interrupt()** | Uses LangGraph's built-in pause mechanism |
| **External storage** | Interrupt context survives app restart |
| **Checkpoint_id** | Resume from exact point, not latest |
| **Simple handler** | Just watches stream, stores record |

## What Changes

### 1. External Storage Schema

```sql
CREATE TABLE interrupts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  checkpoint_timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,           -- 'qa', 'select', 'approve', 'rate', 'upload'
  status TEXT NOT NULL DEFAULT 'pending',
  payload TEXT NOT NULL,        -- JSON: { prompt, options? }
  resolution TEXT,              -- JSON: { value } when resolved
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (thread_id) REFERENCES threads(id)
);

CREATE INDEX idx_interrupts_pending
  ON interrupts(thread_id, status)
  WHERE status = 'pending';
```

### 2. Handler: Creating Interrupt

```typescript
async function* handleStream(threadId: string, input: unknown) {
  const stream = workflowGraph.stream(input, {
    configurable: { thread_id: threadId },
  });

  for await (const chunk of stream) {
    // LangGraph emits interrupt event
    if (chunk.event === 'interrupt') {
      const interruptValue = chunk.value;
      const checkpoint = chunk.checkpoint;

      // Store in external storage
      const interrupt = await interruptRepo.create({
        id: crypto.randomUUID(),
        threadId,
        checkpointId: checkpoint.id,
        checkpointTimestamp: Date.now(),
        type: interruptValue.type,
        payload: JSON.stringify(interruptValue),
        status: 'pending',
        createdAt: Date.now(),
      });

      // Emit to frontend
      yield {
        type: 'interrupt-start',
        interruptId: interrupt.id,
        interruptType: interrupt.type,
        prompt: interruptValue.prompt,
        options: interruptValue.options,
      };

      // Stop - workflow is paused
      break;
    }

    // Normal message
    yield chunk;
  }
}
```

### 3. Resume Endpoint

```typescript
ipcMain.handle('chat:resume-interrupt', async (event, payload) => {
  const { conversationId, interruptId, resolution } = payload;

  // 1. Validate interrupt
  const interrupt = await interruptRepo.get(interruptId);
  if (!interrupt || interrupt.status !== 'pending') {
    throw createIPCError({ /* ... */ });
  }

  // 2. Update interrupt record
  await interruptRepo.resolve(interruptId, {
    value: resolution,
    resolvedAt: Date.now(),
  });

  // 3. Resume from checkpoint
  const stream = workflowGraph.stream(
    new Command({ resume: resolution }),
    {
      configurable: {
        thread_id: conversationId,
        checkpoint_id: interrupt.checkpointId,
      },
      streamMode: ['messages', 'custom', 'updates'],
    }
  );

  // 4. Stream output...
});
```

### 4. Page Reload Query

```typescript
ipcMain.handle('chat:get-thread', async (event, payload) => {
  const { conversationId } = payload;

  // 1. Get messages from LangGraph checkpoint
  const checkpoint = await workflowGraph.checkpointer.get({
    configurable: { thread_id: conversationId },
  });
  const messages = checkpoint?.channel_values?.messages || [];

  // 2. Get pending interrupt from external storage
  const pendingInterrupt = await db.query`
    SELECT * FROM interrupts
    WHERE thread_id = ${conversationId}
    AND status = 'pending'
    LIMIT 1
  `;

  return {
    messages,
    pendingInterrupt: pendingInterrupt ? {
      id: pendingInterrupt.id,
      type: pendingInterrupt.type,
      prompt: JSON.parse(pendingInterrupt.payload).prompt,
      options: JSON.parse(pendingInterrupt.payload).options,
    } : null,
  };
});
```

### 5. Frontend: Restore State

```typescript
export function ChatPage({ conversationId }: Props) {
  const [pendingInterrupt, setPendingInterrupt] = useState<PendingInterrupt | null>(null);

  useEffect(() => {
    async function load() {
      // get-thread returns messages + pendingInterrupt
      const { pendingInterrupt } = await chatService.getThread(conversationId);

      if (pendingInterrupt) {
        setPendingInterrupt(pendingInterrupt);
        useInterruptStore.getState().setActiveInterrupt(pendingInterrupt);
      }
    }
    load();
  }, [conversationId]);

  const handleSubmit = async (content: string) => {
    if (pendingInterrupt && pendingInterrupt.type === 'qa') {
      // Resume existing interrupt
      await chatService.resumeInterrupt({
        conversationId,
        interruptId: pendingInterrupt.id,
        resolution: content,
      });
      setPendingInterrupt(null);
    } else {
      // Normal message
      await chatService.startStream(conversationId, content);
    }
  };

  return (
    <Thread
      // QA: composer stays active
      // Structured: render SelectInterrupt/ApproveInterrupt below message
    />
  );
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Active Session                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  1. workflow.stream()                                                    │
│  2. Node calls interrupt({ type, payload })                             │
│  3. LangGraph: checkpoint → emit interrupt event → pause                │
│  4. Handler: receives event                                              │
│  5. Handler: creates record in interrupts table                          │
│  6. Handler: yields interrupt-start to frontend                          │
│  7. Frontend: shows message + keeps composer active (QA)                 │
│  8. User: submits response                                               │
│  9. resume-interrupt: update record, Command(resume)                     │
│  10. LangGraph: resumes from checkpoint                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Page Reload                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Frontend: get-thread (messages + pending interrupt)                  │
│  2. Backend: SELECT * FROM interrupts WHERE pending                      │
│  3. Backend: returns interrupt context                                   │
│  4. Frontend: restores UI state                                          │
│  5. User: submits response                                               │
│  6. resume-interrupt: uses stored checkpoint_id                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cost Analysis

| Cost Type | Assessment |
|-----------|------------|
| **Performance** | Negligible (async DB ops, ~5ms) |
| **Code complexity** | ~200 lines (handler + schema + endpoint) |
| **Maintenance** | Low (prune job for old records) |
| **Migration** | Low (2-3 hours) |

## Reliability Mechanisms

### 1. Idempotent Resume
```typescript
// Prevent double-resume
if (interrupt.status === 'resolved') {
  return { success: true, message: 'Already resolved' };
}
```

### 2. Stale Checkpoint Recovery
```typescript
// If checkpoint_id is gone, fallback to latest
try {
  await workflowGraph.stream(Command(resume), {
    configurable: { checkpoint_id: interrupt.checkpointId }
  });
} catch (error) {
  if (error.message.includes('checkpoint not found')) {
    // Resume from latest
    await workflowGraph.stream(Command(resume), {
      configurable: { thread_id: conversationId }
    });
  }
}
```

### 3. Cleanup Job (Optional)
```sql
-- Delete resolved interrupts older than 30 days
DELETE FROM interrupts
WHERE status = 'resolved'
AND resolved_at < (UNIXEPOCH() - 30 * 24 * 60 * 60);
```

## Files to Create/Modify

### New Files
- `src/main/services/domain/interrupt/interrupt-repo.ts` - SQLite repository
- `src/main/services/domain/interrupt/types.ts` - Interrupt types

### Modified Files
- `src/main/handlers/chat-handlers.ts` - Add resume endpoint, update stream handler
- `src/shared/types/electron-api/chat.ts` - Add `resume-interrupt` type

## Scope

### In Scope
- External SQLite storage for interrupt context
- Handler that watches stream and stores interrupts
- Resume endpoint using stored checkpoint_id
- Page reload restoration via `get-thread`

### Out of Scope
- Frontend UI components (existing design covers this)
- Workflow node patterns (existing design covers this)
- Interrupt history analytics

## Success Criteria

1. ✅ Interrupt pauses workflow correctly
2. ✅ Interrupt context persists through page reload
3. ✅ Resume works from exact checkpoint
4. ✅ Idempotent resume prevents double-processing
5. ✅ Performance impact < 10ms per operation

## Effort Estimate

- **Schema + Repository**: 2 hours
- **Handler Integration**: 2 hours
- **Resume Endpoint**: 1 hour
- **Frontend Query**: 1 hour
- **Testing**: 2 hours
- **Total**: 8 hours (1 day)
