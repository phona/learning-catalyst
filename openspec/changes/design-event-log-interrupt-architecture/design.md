# Design: Event-Log Interrupt Architecture

## Architecture Overview

### Current State (Problematic)

```
User Input → chat-handlers.ts → [hidden interrupt check] → workflow.stream()
                                       ↓
                              [hidden resume logic]
                                       ↓
                              toAssistantUIStream() → finish chunk
```

**Issues:**
- Interrupt detection embedded in handler (lines 207-218)
- Resume decision embedded in handler (lines 216-232)
- No service layer for testing/reuse
- No audit trail of interrupt events

### Target State (Transparent)

```
User Input → chat-handlers.ts → interruptService.prepareRun()
                                       ↓
                              { shouldResume, checkpointId }
                                       ↓
                              workflow.stream() → interrupt event
                                       ↓
                              interruptService.recordInterrupt()
                                       ↓
                              toAssistantUIStream() → interrupt chunk → finish
```

**Benefits:**
- Clear separation of concerns
- Testable interrupt service
- Audit trail via event-log
- Reusable for other entry points

## Design Decisions

### Decision 1: Interrupt Service Pattern

**Context**: Interrupt logic is currently embedded in `chat-handlers.ts`

**Options**:
- A. Keep in handler, improve organization
- B. Extract to dedicated service
- C. Put in workflow graph utilities

**Choice**: B (Dedicated service)

**Rationale**:
- Follows existing service pattern in codebase
- Enables unit testing without IPC mocking
- Single source of truth for interrupt state
- Reusable if other entry points need interrupt handling

### Decision 2: Event-Log Scope

**Context**: Need to track interrupt history for restore/audit

**Options**:
- A. Full event-log (all messages + interrupts)
- B. Interrupt metadata only (augment messages[])
- C. No event-log (query checkpoint on demand)

**Choice**: B (Interrupt metadata only)

**Rationale**:
- Messages already stored in `messages[]` (don't duplicate)
- Only structured interrupts need tracking (per workflow-interrupt-control-flow spec)
- Lighter weight than full event-log
- Easier migration path from current architecture

### Decision 3: State Annotation Pattern

**Context**: Need to store interrupt records in workflow state

**Options**:
- A. Separate `interruptHistory` channel
- B. Extend existing subgraph state
- C. Store outside workflow state (SQLite)

**Choice**: A (Separate channel)

**Rationale**:
- Clean separation from existing state
- Works with LangGraph checkpointer
- Reducer pattern ensures immutability
- Doesn't pollute teach/practice state

### Decision 4: AI SDK Interrupt Chunk

**Context**: Frontend needs to render interrupt prompts

**Options**:
- A. Custom chunk type `interrupt-start/interrupt-end`
- B. Extend `tool-output-available` with interrupt metadata
- C. Use existing `text-delta` with data annotation

**Choice**: A (Custom chunk type)

**Rationale**:
- Clear semantics for UI layer
- Doesn't abuse existing protocol
- Enables specialized interrupt UI components
- Future-proof for complex interrupt types

### Decision 5: History Restore via Message Metadata

**Context**: Frontend needs to know about pending interrupts on thread load

**Options**:
- A. New `chat:get-thread-state` endpoint
- B. Extend `chat:get-messages` with `pendingInterrupt` field
- C. Embed interrupt metadata in AIMessage itself

**Choice**: C (Message metadata)

**Rationale**:
- No new API endpoint needed
- Interrupt prompt IS already an AIMessage in history
- Frontend detects interrupt from message `additional_kwargs`
- Simpler architecture - message is self-describing
- Works with existing `chat:get-messages` without changes

## Technical Design

### Interrupt Record Type

```typescript
// src/main/services/domain/workflow/types/interrupt-record.ts

export type InterruptStatus = 'pending' | 'resolved' | 'abandoned';

export type InterruptRecord = {
  id: string;                    // Unique interrupt ID
  node: string;                  // Node that triggered interrupt
  type: string;                  // Interrupt type (select, approve, rate, etc.)
  payload: {
    prompt: string;              // User-facing prompt
    options?: unknown[];         // For selection types
    [key: string]: unknown;      // Type-specific data
  };
  status: InterruptStatus;
  createdAt: number;
  resolvedAt?: number;
  resolution?: unknown;          // User's response
  reasoning?: string;            // AI reasoning (if applicable)
};
```

### State Annotation Extension

```typescript
// src/main/services/domain/workflow/state.ts (additions)

const interruptHistoryReducer = (
  current: InterruptRecord[] | undefined,
  update: InterruptRecord[],
): InterruptRecord[] => {
  const curr = current ?? [];
  // Merge updates: new records appended, existing records updated by id
  const updated = [...curr];
  for (const record of update) {
    const idx = updated.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...record };
    } else {
      updated.push(record);
    }
  }
  return updated;
};

export const WorkflowStateAnnotation = Annotation.Root({
  // ... existing fields ...

  interruptHistory: Annotation<InterruptRecord[]>({
    reducer: interruptHistoryReducer,
    default: () => [],
  }),
});
```

### Interrupt Service Interface

```typescript
// src/main/services/domain/interrupt/interrupt-service.ts

export type InterruptService = {
  /**
   * Check if thread has pending interrupt and prepare run config
   */
  prepareRun(threadId: string, userInput: string): Promise<{
    shouldResume: boolean;
    checkpointId?: string;
  }>;

  /**
   * Create a new interrupt record (called from workflow node)
   */
  createInterruptRecord(params: {
    node: string;
    type: string;
    payload: InterruptRecord['payload'];
    reasoning?: string;
  }): InterruptRecord;

  /**
   * Derive pending interrupt from history
   */
  getPendingInterrupt(interruptHistory: InterruptRecord[]): InterruptRecord | null;
};

export function createInterruptService(deps: {
  checkpointer: BaseCheckpointSaver;
  loggerService: LoggerService;
}): InterruptService;
```

### Interrupt Message Metadata

Structured interrupt prompts include metadata in the AIMessage for frontend detection:

```typescript
// When creating interrupt prompt message
const interruptMessage = new AIMessage({
  content: 'Which learning path would you like to take?',
  additional_kwargs: {
    interruptType: 'select',
    interruptId: record.id,
    options: [
      { id: 'deep', label: 'Deep Dive' },
      { id: 'quick', label: 'Quick Overview' },
    ],
    pending: true,  // Frontend checks this to render special UI
  },
});
```

Frontend detects and renders:
```typescript
// In message rendering
if (message.additional_kwargs?.interruptType && message.additional_kwargs?.pending) {
  return <InterruptUI type={message.additional_kwargs.interruptType} options={...} />;
}
```

### AI SDK Chunk Extensions

```typescript
// src/main/services/domain/workflow/utils/assistant-ui-stream.ts (additions)

/**
 * Interrupt start chunk - begins interrupt UI
 */
export interface InterruptStartChunk extends BaseChunk {
  type: 'interrupt-start';
  interruptId: string;
  interruptType: string;        // 'select', 'approve', 'rate', etc.
  payload: {
    prompt: string;
    options?: unknown[];
    [key: string]: unknown;
  };
}

/**
 * Interrupt end chunk - interrupt resolved/abandoned
 */
export interface InterruptEndChunk extends BaseChunk {
  type: 'interrupt-end';
  interruptId: string;
  status: 'resolved' | 'abandoned';
  resolution?: unknown;
}
```

### Refactored Chat Handler

```typescript
// src/main/handlers/chat-handlers.ts (simplified)

ipcMainInstance.on('chat:start-stream', async (event, payload) => {
  const [replyPort] = event.ports;
  const streamId = payload.streamId ?? generateStreamId();

  // Delegate to service (no interrupt logic in handler)
  const runConfig = await interruptService.prepareRun(
    safeConversationId,
    lastUserText
  );

  const streamConfig = {
    configurable: {
      thread_id: safeConversationId,
      llmStreamMode,
      ...(runConfig.shouldResume && runConfig.checkpointId
        ? { checkpoint_id: runConfig.checkpointId }
        : {}),
    },
    streamMode: ['messages', 'custom', 'updates'],
  };

  const stream = await workflowGraph.stream(
    runConfig.shouldResume
      ? new Command({ resume: lastUserText })
      : { messages: lcMessages },
    streamConfig,
  );

  // Stream processing unchanged...
});
```

### Workflow Node Pattern for Structured Interrupts

```typescript
// Example: src/main/services/domain/workflow/nodes/selectLearningPath.ts

export const selectLearningPathNode = (deps: WorkflowDeps) =>
  async (state: WorkflowState, config: LangGraphRunnableConfig) => {
    const interruptService = deps.interruptService;

    // Create interrupt record BEFORE calling interrupt()
    const record = interruptService.createInterruptRecord({
      node: 'selectLearningPath',
      type: 'select',
      payload: {
        prompt: 'Which learning path would you like to take?',
        options: [
          { id: 'deep', label: 'Deep Dive', description: 'Comprehensive coverage' },
          { id: 'quick', label: 'Quick Overview', description: 'Key concepts only' },
        ],
      },
    });

    // Record in state (persisted before interrupt)
    // Then call interrupt
    const selection = interrupt(record.payload);

    // After resume, update record with resolution
    const resolved: InterruptRecord = {
      ...record,
      status: 'resolved',
      resolvedAt: Date.now(),
      resolution: selection,
    };

    return {
      interruptHistory: [resolved],
      sessionBlueprint: {
        ...state.sessionBlueprint,
        learningPath: selection.id
      },
    };
  };
```

## Migration Strategy

### Phase 1: Service Extraction (Non-Breaking)

1. Create `interrupt-service.ts` with current logic extracted
2. Refactor `chat-handlers.ts` to use service
3. Existing behavior unchanged

### Phase 2: State Extension (Additive)

1. Add `interruptHistory` to `WorkflowStateAnnotation`
2. Update `toAssistantUIStream` with interrupt chunks
3. Nodes that use `interrupt()` record events and embed metadata in messages
4. Existing interrupt flows continue working

### Phase 3: Frontend Integration

1. Handle interrupt chunks in Assistant UI adapter
2. Detect interrupt metadata in message `additional_kwargs`
3. Implement interrupt UI components
4. Complete end-to-end testing

## Testing Strategy

### Unit Tests

```typescript
// interrupt-service.test.ts
describe('InterruptService', () => {
  describe('prepareRun', () => {
    it('returns shouldResume=false when no pending interrupt', async () => {
      // Test service in isolation
    });

    it('returns shouldResume=true with checkpointId when pending', async () => {
      // Test service with mock checkpointer
    });
  });

  describe('getThreadState', () => {
    it('derives pending interrupt from history', async () => {
      // Test derivation logic
    });

    it('returns correct status based on interrupt state', async () => {
      // Test status computation
    });
  });
});
```

### Integration Tests

```typescript
// chat-interrupt-flow.test.ts
describe('Interrupt Flow E2E', () => {
  it('structured interrupt persists in history', async () => {
    // Run workflow with interrupt node
    // Verify interruptHistory contains record
  });

  it('interrupt message includes metadata for UI', async () => {
    // Trigger interrupt
    // Verify AIMessage has additional_kwargs with interruptType
  });
});
```

## Rollback Plan

If issues found:

1. **Quick Rollback** (< 30 minutes):
   - Revert to inline handler logic
   - Service remains but unused
   - No data migration needed

2. **Partial Rollback**:
   - Keep service but disable event-log
   - interruptHistory stays empty
   - Basic interrupt detection still works

## Success Metrics

### Quantitative
- Test coverage: >90% for interrupt service
- Handler complexity: Reduced from ~120 lines to ~60 lines
- Interrupt-related test files: Increased (better coverage)

### Qualitative
- Clear separation of concerns
- Interrupt logic unit-testable
- Frontend can render interrupt UI from message metadata
