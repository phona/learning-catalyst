# Design: Native Interrupt with External Storage Restore

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Workflow Node                                                          │
│  return interrupt({ type: 'qa', prompt: 'What aspect?' })              │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Handler (stream wrapper)                                               │
│  - Watches for LangGraph interrupt event                               │
│  - Stores context in SQLite                                            │
│  - Emits interrupt-start to frontend                                   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  External Storage (SQLite)                                             │
│  - interrupt_id, thread_id, checkpoint_id                              │
│  - type, payload, status, timestamps                                   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Resume (same or after reload)                                         │
│  - Lookup interrupt by id                                              │
│  - Resume from checkpoint_id                                           │
│  - Update status to resolved                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Principle

**LangGraph's native `interrupt()` pauses workflow. External storage preserves context for page reloads.**

---

## External Storage Schema

```sql
-- src/main/services/core/database/migrations/XXXX_add_interrupts.sql

CREATE TABLE IF NOT EXISTS interrupts (
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
  FOREIGN KEY (thread_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_interrupts_pending
  ON interrupts(thread_id, status)
  WHERE status = 'pending';
```

---

## Type Definitions

```typescript
// src/main/services/domain/interrupt/types.ts

export type InterruptType = 'qa' | 'select' | 'approve' | 'rate' | 'upload';

export type InterruptStatus = 'pending' | 'resolved';

export type InterruptPayload = {
  prompt: string;
  options?: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  [key: string]: unknown;
};

export type InterruptRecord {
  id: string;
  threadId: string;
  checkpointId: string;
  type: InterruptType;
  status: InterruptStatus;
  payload: InterruptPayload;
  resolution?: unknown;
  createdAt: number;
  resolvedAt?: number;
}

export type CreateInterruptInput = {
  threadId: string;
  checkpointId: string;
  type: InterruptType;
  payload: InterruptPayload;
};

export type ResolveInterruptInput = {
  value: unknown;
  resolvedAt: number;
};
```

---

## Interrupt Repository

```typescript
// src/main/services/domain/interrupt/interrupt-repo.ts

import { Kysely, sql } from 'kysely';

export interface InterruptRepository {
  create(input: CreateInterruptInput): Promise<InterruptRecord>;
  get(id: string): Promise<InterruptRecord | null>;
  getPendingByThread(threadId: string): Promise<InterruptRecord | null>;
  resolve(id: string, input: ResolveInterruptInput): Promise<void>;
  deleteResolvedOlderThan(timestamp: number): Promise<void>;
}

export function createInterruptRepository(db: Kysely<Database>): InterruptRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const now = Date.now();

      await db.insertInto('interrupts').values({
        id,
        thread_id: input.threadId,
        checkpoint_id: input.checkpointId,
        checkpoint_timestamp: now,
        type: input.type,
        status: 'pending',
        payload: JSON.stringify(input.payload),
        created_at: now,
      }).execute();

      return {
        id,
        threadId: input.threadId,
        checkpointId: input.checkpointId,
        type: input.type,
        status: 'pending',
        payload: input.payload,
        createdAt: now,
      };
    },

    async get(id) {
      const row = await db.selectFrom('interrupts')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!row) return null;

      return this.mapRow(row);
    },

    async getPendingByThread(threadId) {
      const row = await db.selectFrom('interrupts')
        .selectAll()
        .where('thread_id', '=', threadId)
        .where('status', '=', 'pending')
        .executeTakeFirst();

      if (!row) return null;

      return this.mapRow(row);
    },

    async resolve(id, input) {
      await db.updateTable('interrupts')
        .set({
          status: 'resolved',
          resolution: JSON.stringify(input.value),
          resolved_at: input.resolvedAt,
        })
        .where('id', '=', id)
        .execute();
    },

    async deleteResolvedOlderThan(timestamp) {
      await db.deleteFrom('interrupts')
        .where('status', '=', 'resolved')
        .where('resolved_at', '<', timestamp)
        .execute();
    },

    mapRow(row) {
      return {
        id: row.id,
        threadId: row.thread_id,
        checkpointId: row.checkpoint_id,
        type: row.type as InterruptType,
        status: row.status as InterruptStatus,
        payload: JSON.parse(row.payload),
        resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at ?? undefined,
      };
    },
  };
}
```

---

## Handler: Stream with Interrupt Detection

```typescript
// src/main/handlers/chat-handlers.ts

ipcMain.handle('chat:start-stream', async (event, payload) => {
  const [replyPort] = event.ports;
  const { conversationId, userInput } = payload;
  const config = { configurable: { thread_id: conversationId } };

  // Check for pending interrupt in external storage
  const pendingInterrupt = await interruptRepo.getPendingByThread(conversationId);

  let stream;
  if (pendingInterrupt) {
    // Resume with Command
    stream = await workflowGraph.stream(
      new Command({ resume: userInput }),
      { ...config, streamMode: ['messages', 'custom', 'updates'] as const }
    );
  } else {
    // New conversation
    stream = await workflowGraph.stream(
      { messages: [new HumanMessage(userInput)] },
      { ...config, streamMode: ['messages', 'custom', 'updates'] as const }
    );
  }

  // Stream with interrupt detection
  for await (const chunk of stream) {
    // Check for LangGraph interrupt event
    if (chunk.event === 'interrupt') {
      const interruptValue = chunk.value;
      const checkpoint = chunk.checkpoint;

      // Store interrupt in external storage
      const interrupt = await interruptRepo.create({
        threadId: conversationId,
        checkpointId: checkpoint.id,
        type: interruptValue.type,
        payload: interruptValue,
      });

      // Emit interrupt-start chunk to frontend
      yield formatSSE({
        type: 'interrupt-start',
        interruptId: interrupt.id,
        interruptType: interrupt.type,
        prompt: interruptValue.prompt,
        options: interruptValue.options,
      });

      // Emit finish chunk
      yield formatSSE({ type: 'finish' });

      // Stop - workflow is paused
      break;
    }

    // Normal chunk handling...
  }
});
```

---

## Resume Endpoint

```typescript
// src/main/handlers/chat-handlers.ts

ipcMain.handle('chat:resume-interrupt', async (event, payload) => {
  const { conversationId, interruptId, resolution } = payload;
  const [replyPort] = event.ports;

  // 1. Validate interrupt exists and is pending
  const interrupt = await interruptRepo.get(interruptId);

  if (!interrupt) {
    throw createIPCError({
      type: 'CHAT_ERROR',
      code: 'interrupt.not_found',
      message: 'Interrupt not found',
    });
  }

  if (interrupt.status !== 'pending') {
    throw createIPCError({
      type: 'CHAT_ERROR',
      code: 'interrupt.already_resolved',
      message: 'Interrupt already resolved',
    });
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
      streamMode: ['messages', 'custom', 'updates'] as const,
    }
  );

  // 4. Stream output to frontend
  await streamMessages(replyPort, stream);
});
```

---

## Page Reload: Get Thread with Pending Interrupt

```typescript
// src/main/handlers/chat-handlers.ts

ipcMain.handle('chat:get-thread', async (event, payload) => {
  const { conversationId } = payload;

  // 1. Get messages from LangGraph checkpoint
  const checkpoint = await workflowGraph.checkpointer.get({
    configurable: { thread_id: conversationId },
  });
  const messages = checkpoint?.channel_values?.messages || [];

  // 2. Get pending interrupt from external storage
  const pendingInterrupt = await interruptRepo.getPendingByThread(conversationId);

  return {
    messages,
    pendingInterrupt: pendingInterrupt ? {
      id: pendingInterrupt.id,
      type: pendingInterrupt.type,
      prompt: pendingInterrupt.payload.prompt,
      options: pendingInterrupt.payload.options,
    } : null,
  };
});
```

---

## Frontend Integration

```typescript
// src/renderer/services/chat/chat-service.ts

export const chatService = {
  async getThread(conversationId: string) {
    return electronAPI.chat.getThread({ conversationId });
  },

  async startStream(conversationId: string, userInput: string) {
    return electronAPI.chat.startStream({ conversationId, userInput });
  },

  async resumeInterrupt(params: {
    conversationId: string;
    interruptId: string;
    resolution: unknown;
  }) {
    return electronAPI.chat.resumeInterrupt(params);
  },
};
```

```typescript
// src/renderer/pages/chat/ChatPage.tsx

export function ChatPage({ conversationId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingInterrupt, setPendingInterrupt] = useState<PendingInterrupt | null>(null);

  useEffect(() => {
    async function load() {
      const { messages, pendingInterrupt } = await chatService.getThread(conversationId);
      setMessages(messages);

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
      messages={messages}
      onSubmit={handleSubmit}
      // QA: composer stays active
      // Structured: render UI below message
    />
  );
}
```

---

## Workflow Node Pattern (Unchanged)

```typescript
// src/main/services/domain/workflow/nodes/ask-question.ts

export const askQuestionNode = () =>
  async (state: WorkflowState) => {
    // Native LangGraph interrupt - no special handling needed
    return interrupt({
      type: 'qa',
      prompt: 'What aspect would you like to explore?',
    });
  };
```

The workflow node doesn't need to know about external storage. It just calls `interrupt()` and LangGraph handles the rest.

---

## Reliability Mechanisms

### 1. Idempotent Resume

```typescript
ipcMain.handle('chat:resume-interrupt', async (event, payload) => {
  const interrupt = await interruptRepo.get(payload.interruptId);

  if (interrupt?.status === 'resolved') {
    // Already resolved - return success (idempotent)
    return { success: true, message: 'Already resolved' };
  }

  // Normal resume...
});
```

### 2. Stale Checkpoint Recovery

```typescript
async function resumeWithFallback(conversationId: string, interrupt: InterruptRecord, resolution: unknown) {
  try {
    return await workflowGraph.stream(
      new Command({ resume: resolution }),
      {
        configurable: {
          thread_id: conversationId,
          checkpoint_id: interrupt.checkpointId,
        }
      }
    );
  } catch (error) {
    if (error.message.includes('checkpoint not found')) {
      // Fallback: resume from latest
      return await workflowGraph.stream(
        new Command({ resume: resolution }),
        { configurable: { thread_id: conversationId } }
      );
    }
    throw error;
  }
}
```

### 3. Cleanup Job

```typescript
// Run periodically (e.g., daily)
async function cleanupOldInterrupts() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await interruptRepo.deleteResolvedOlderThan(thirtyDaysAgo);
}
```

---

## Data Flow Diagrams

### Active Session Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  User Input → start-stream                                              │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Check: pending interrupt in SQLite?                                    │
│  - YES: Resume with Command(resume)                                     │
│  - NO: Start new with HumanMessage                                      │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Workflow executes                                                      │
│  Node calls interrupt({ type, payload })                               │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  LangGraph: checkpoint → emit interrupt event → pause                   │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Handler: watches stream, detects interrupt event                       │
│  → Creates record in interrupts table                                   │
│  → Emits interrupt-start to frontend                                    │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend: receives interrupt-start                                     │
│  → QA: composer stays active                                            │
│  → Structured: renders SelectInterrupt/ApproveInterrupt                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Page Reload Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Page Load → get-thread                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend:                                                                │
│  1. Get messages from LangGraph checkpoint                              │
│  2. Query: SELECT * FROM interrupts WHERE pending                       │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Response: { messages, pendingInterrupt }                               │
│  - pendingInterrupt null: normal chat                                   │
│  - pendingInterrupt exists: restore UI state                            │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend:                                                               │
│  → QA: composer active, no special UI                                   │
│  → Structured: render options below message                             │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  User responds → resume-interrupt                                       │
│  → Uses stored checkpoint_id                                            │
│  → Updates interrupt status to resolved                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files
- `src/main/services/domain/interrupt/types.ts` - Type definitions
- `src/main/services/domain/interrupt/interrupt-repo.ts` - SQLite repository
- `src/main/services/core/database/migrations/XXXX_add_interrupts.sql` - Schema

### Modified Files
- `src/main/handlers/chat-handlers.ts` - Add interrupt detection, resume endpoint
- `src/shared/types/electron-api/chat.ts` - Add `resume-interrupt` type
- `src/renderer/services/chat/chat-service.ts` - Add resume method
- `src/renderer/pages/chat/ChatPage.tsx` - Handle pending interrupt

---

## Comparison: This Design vs Original

| Aspect | Original Design | This Design |
|--------|-----------------|-------------|
| Storage | Dual (message metadata + interruptHistory) | Single (SQLite) |
| Complexity | High (reducers, derivations) | Low (simple CRUD) |
| Resume | Derive from messages | Direct lookup by id |
| Page Reload | Match by node/id | Query pending table |
| Workflow Changes | Nodes create records | Nodes unchanged |

This design is simpler and focuses on the core value: **reliable interrupt restore across page reloads**.
