# Tasks: Design Event-Log Interrupt Architecture

## Phase 1: Service Extraction (Non-Breaking)

### Task 1.1: Create Interrupt Record Type
**File**: `src/main/services/domain/workflow/types/interrupt-record.ts`
**Description**: Define the InterruptRecord type and related types
**Acceptance**:
- [ ] InterruptRecord type with id, node, type, payload, status, timestamps
- [ ] InterruptStatus union type: 'pending' | 'resolved' | 'abandoned'
- [ ] Exported from types index

### Task 1.2: Create Interrupt Service
**File**: `src/main/services/domain/interrupt/interrupt-service.ts`
**Description**: Extract interrupt logic from chat-handlers into service
**Acceptance**:
- [ ] `createInterruptService(deps)` factory function
- [ ] `prepareRun(threadId, userInput)` extracts logic from chat-handlers
- [ ] `createInterruptRecord(params)` creates new record
- [ ] `getPendingInterrupt(history)` derives pending from history
- [ ] Uses existing `pending-interrupt.ts` utilities internally

### Task 1.3: Add Interrupt Service Unit Tests
**File**: `src/main/services/domain/interrupt/__tests__/interrupt-service.test.ts`
**Description**: Unit tests for interrupt service
**Acceptance**:
- [ ] Test prepareRun with no pending interrupt
- [ ] Test prepareRun with pending interrupt
- [ ] Test createInterruptRecord generates valid record
- [ ] Test getPendingInterrupt derivation logic
- [ ] >90% coverage on service

### Task 1.4: Refactor Chat Handler to Use Service
**File**: `src/main/handlers/chat-handlers.ts`
**Description**: Replace inline interrupt logic with service calls
**Acceptance**:
- [ ] Handler receives `interruptService` in dependencies
- [ ] `hasPendingInterrupt` check replaced with `interruptService.prepareRun()`
- [ ] Resume decision delegated to service
- [ ] Handler reduced to ~60 lines (from ~120)
- [ ] Existing behavior unchanged

### Task 1.5: Add Interrupt Resolution IPC Endpoint
**File**: `src/main/handlers/chat-handlers.ts`
**Description**: Add dedicated endpoint for structured interrupt resolution
**Acceptance**:
- [ ] `ipcMain.handle('chat:submit-interrupt-resolution')` handler added
- [ ] Accepts `{ interruptId, resolution }` payload
- [ ] Resumes workflow with `Command({ resume: resolution })`
- [ ] Does NOT create user-visible message (unlike `chat:start-stream`)
- [ ] Returns success/error response
- [ ] Added to preload/electronAPI types

**Implementation Note**: This is a **CRITICAL** fix for the gap where UI currently sends JSON as a user message (visible in chat), creating poor UX.

```typescript
ipcMainInstance.handle('chat:submit-interrupt-resolution', async (_event, payload) => {
  const { conversationId, interruptId, resolution } = payload;
  const safeConversationId = conversationId || `thread_${Date.now()}`;

  const streamConfig = {
    configurable: {
      thread_id: safeConversationId,
      checkpoint_id: await getCheckpointIdForInterrupt(interruptId),
    },
    streamMode: ['messages', 'custom', 'updates'],
  };

  const stream = await workflowGraph.stream(
    new Command({ resume: resolution }),
    streamConfig
  );

  // Stream conversion and reply port handling...
  // No message added to history
});
```

### Task 1.6: Update Chat Handler Tests
**File**: `src/main/handlers/__tests__/chat-handlers.test.ts`
**Description**: Update tests for refactored handler and new endpoint
**Acceptance**:
- [ ] Tests mock `interruptService` instead of checkpointer
- [ ] Existing tests still pass
- [ ] New tests for `chat:submit-interrupt-resolution` endpoint
- [ ] Test verifies no message created for structured resolution

## Phase 2: State Extension (Additive)

### Task 2.1: Add InterruptHistory to Workflow State
**File**: `src/main/services/domain/workflow/state.ts`
**Description**: Add interruptHistory channel with reducer
**Acceptance**:
- [ ] `interruptHistory: Annotation<InterruptRecord[]>` added
- [ ] Reducer merges updates (append new, update existing by id)
- [ ] Default value is empty array
- [ ] Re-export InterruptRecord type

### Task 2.2: Add State Reducer Tests
**File**: `src/main/services/domain/workflow/__tests__/state-reducers.test.ts`
**Description**: Test interrupt history reducer
**Acceptance**:
- [ ] Test append new record
- [ ] Test update existing record by id
- [ ] Test merge multiple updates
- [ ] Test default value

### Task 2.3: Add Interrupt Chunk Types to Stream Utils
**File**: `src/main/services/domain/workflow/utils/assistant-ui-stream.ts`
**Description**: Add interrupt-start and interrupt-end chunk types
**Acceptance**:
- [ ] `InterruptStartChunk` interface defined
- [ ] `InterruptEndChunk` interface defined
- [ ] Added to `DataStreamChunkType` union
- [ ] Added to `DataStreamChunk` union type
- [ ] `createInterruptStartChunk()` helper function
- [ ] `createInterruptEndChunk()` helper function

**Implementation Note**: This is a **CRITICAL** fix for the gap where `DataStreamChunkType` doesn't include interrupt chunks, causing the stream adapter to stop iteration without emitting interrupt metadata.

### Task 2.4: Extend toAssistantUIStream for Interrupt Chunks
**File**: `src/main/services/domain/workflow/utils/assistant-ui-stream.ts`
**Description**: Handle interrupt events with proper chunks
**Acceptance**:
- [ ] Emit `interrupt-start` chunk when interrupt detected (before breaking iteration)
- [ ] Include full payload (id, type, payload) in chunk
- [ ] Maintain existing `finish` behavior after interrupt
- [ ] Add tests for interrupt chunk emission

**Implementation Note**: Current code breaks iteration immediately on `isInterruptEvent()`. Must emit chunk first, then break.

```typescript
// Current (WRONG):
if (isInterruptEvent(data)) {
  interrupted = true;
  break;  // No chunk emitted
}

// Fixed (CORRECT):
if (isInterruptEvent(data)) {
  const metadata = extractInterruptMetadata(data);
  yield formatSSE(createInterruptStartChunk(metadata));
  interrupted = true;
  break;
}
```

### Task 2.5: Update ChatMessage Type for Interrupt Metadata
**File**: `src/main/services/domain/chat/chat-message-types.ts`
**Description**: Add interrupt field to ChatMessage metadata
**Acceptance**:
- [ ] `interrupt?: InterruptMetadata` added to `metadata` interface
- [ ] `InterruptMetadata` type exported with id, type, status, payload, options, timestamps
- [ ] Extends existing metadata without breaking changes
- [ ] Exported for frontend use

**Implementation Note**: This is a **CRITICAL** fix for the gap where interrupt metadata doesn't survive message conversion.

```typescript
// Add to chat-message-types.ts
export interface InterruptMetadata {
  id: string;
  type: string;
  status: 'pending' | 'resolved' | 'abandoned';
  payload?: unknown;
  options?: unknown[];
  createdAt: number;
  resolvedAt?: number;
}

export interface ChatMessage {
  // ... existing fields ...
  metadata?: {
    checkpoint_id?: string;
    message_index: number;
    run_id?: string;
    // ... existing fields ...
    // NEW: Interrupt metadata (survives message conversion)
    interrupt?: InterruptMetadata;
  };
}
```

### Task 2.6: Update Message Converter for Interrupt Metadata
**File**: `src/main/services/domain/chat/message-converter.ts`
**Description**: Extract interrupt metadata from AIMessage additional_kwargs
**Acceptance**:
- [ ] Extract `interruptType`, `interruptId`, `pending`, `options` from `additional_kwargs`
- [ ] Populate `metadata.interrupt` field in converted ChatMessage
- [ ] Handle both serialized checkpoint and in-memory AIMessage instances
- [ ] Add tests for metadata extraction

**Implementation Note**: This is a **CRITICAL** fix for the gap where `message-converter.ts` strips `additional_kwargs`, preventing history reload from detecting interrupts.

```typescript
// In convertToChatMessage()
const additionalKwargs = serialized.kwargs.additional_kwargs;

// Extract interrupt metadata
if (additionalKwargs?.interruptType) {
  const interruptMetadata: InterruptMetadata = {
    id: additionalKwargs.interruptId as string,
    type: additionalKwargs.interruptType as string,
    status: additionalKwargs.pending ? 'pending' : 'resolved',
    options: additionalKwargs.options,
    createdAt: Date.now(),
  };
  // ... add to metadata.interrupt
}
```

### Task 2.7: Define Interrupt Message Metadata Pattern
**File**: `src/main/services/domain/workflow/utils/interrupt-message.ts`
**Description**: Helper to create AIMessage with interrupt metadata
**Acceptance**:
- [ ] `createInterruptMessage(record)` returns AIMessage with `additional_kwargs`
- [ ] `additional_kwargs` includes: `interruptType`, `interruptId`, `options`, `pending`
- [ ] Documented pattern for frontend detection
- [ ] Helper includes reasoning if available

**Implementation Note**: This helper ensures all interrupt messages use consistent metadata structure.

```typescript
export function createInterruptMessage(record: InterruptRecord, content: string, reasoning?: string): AIMessage {
  return new AIMessage({
    content,
    additional_kwargs: {
      interruptType: record.type,
      interruptId: record.id,
      options: record.payload.options,
      pending: record.status === 'pending',
      ...(reasoning && { reasoning_content: reasoning }),
    },
  });
}
```

## Phase 3: Documentation

### Task 3.1: Document Interrupt Service in Workflow README
**File**: `src/main/services/domain/workflow/README.md`
**Description**: Document interrupt service usage
**Acceptance**:
- [ ] Section on interrupt service architecture
- [ ] When to use interrupt service
- [ ] Pattern for structured interrupt nodes
- [ ] Message metadata pattern for frontend

### Task 3.2: Add Interrupt Node Example
**File**: `src/main/services/domain/workflow/nodes/selectLearningPath.ts`
**Description**: Reference implementation for structured interrupt
**Acceptance**:
- [ ] Uses interruptService.createInterruptRecord()
- [ ] Records event before interrupt()
- [ ] Creates AIMessage with interrupt metadata
- [ ] Updates record after resume
- [ ] Documented as pattern example

### Task 3.3: Update Interrupt Specs
**Files**: `openspec/specs/workflow-interrupt-*/spec.md`
**Description**: Update specs with service layer requirements
**Acceptance**:
- [ ] Add requirement for interrupt service usage
- [ ] Add requirement for interruptHistory persistence
- [ ] Add requirement for message metadata pattern

## Phase 4: Integration Testing

### Task 4.1: Add Interrupt Flow Integration Test
**File**: `src/main/services/domain/workflow/__tests__/interrupt-flow.test.ts`
**Description**: End-to-end test for interrupt with event-log
**Acceptance**:
- [ ] Test: interrupt → record persisted → resume → resolved
- [ ] Test: interruptHistory in checkpoint
- [ ] Test: AIMessage includes interrupt metadata

### Task 4.2: Add Message Metadata Detection Test
**File**: `src/main/services/domain/workflow/__tests__/interrupt-message.test.ts`
**Description**: Test message metadata for frontend detection
**Acceptance**:
- [ ] Test: AIMessage additional_kwargs includes interruptType
- [ ] Test: pending flag is set correctly
- [ ] Test: options are included for selection types

### Task 4.3: Verify Shared Types
**File**: `src/shared/types/workflow/interrupt.ts`
**Description**: Ensure interrupt types are available for frontend
**Acceptance**:
- [ ] InterruptRecord type exported
- [ ] InterruptStatus type exported
- [ ] Frontend can import and use types

## Validation Checklist

Before marking as complete:
- [ ] All Phase 1 tasks complete (service extracted)
- [ ] All Phase 2 tasks complete (state extended)
- [ ] All Phase 3 documentation updated
- [ ] All Phase 4 integration tests passing
- [ ] Handler code reduced and simplified
- [ ] Interrupt service >90% test coverage
- [ ] No regressions in existing interrupt behavior
- [ ] Message metadata pattern documented

## Frontend Implementation Checklist

**Core Components:**
- [ ] Create `interruptStore.ts` (Zustand store)
- [ ] Extend `AssistantMessage.tsx` (conditional UI rendering)
- [ ] Create `useInterruptListener.ts` (stream subscription)
- [ ] Update `ChatPage.tsx` (mount listener)

**UI Components:**
- [ ] Create `SelectInterrupt.tsx`
- [ ] Create `ApproveInterrupt.tsx`
- [ ] Create `RateInterrupt.tsx`

**Integration:**
- [ ] Verify message metadata extraction from `message.metadata.interrupt` (not `additional_kwargs`)
- [ ] Test QA interrupt flow (main input)
- [ ] Test structured interrupt flow (UI below, uses `chat:submit-interrupt-resolution`)
- [ ] Test normal chat (no changes)

**Testing:**
- [ ] Unit test interruptStore state transitions
- [ ] Unit test AssistantMessage conditional rendering
- [ ] Integration test: QA message → input → resolution
- [ ] Integration test: structured message → UI → resolution via new endpoint

### Key Implementation Notes (UPDATED)

1. **Metadata Extraction**: Use `message.metadata.interrupt` to detect interrupt metadata (NOT `additional_kwargs`)
2. **Resolution Endpoint**: Use `chat:submit-interrupt-resolution` for structured interrupts (NOT `api.submit`)
3. **QA vs Structured**: QA uses main input via `chat:start-stream`, structured uses `chat:submit-interrupt-resolution`
4. **Store Management**: Always clear store after resolution to reset UI
5. **Default Composer**: No custom composer needed, use Assistant UI's default
6. **Backward Compatibility**: Normal chat (no `metadata.interrupt`) works unchanged

## Dependencies

- **Parallelizable**: Tasks 1.1-1.3 can run in parallel
- **Sequential**: Task 1.4 depends on 1.2
- **Sequential**: Task 2.1 depends on 1.1
- **Parallelizable**: Phase 3 can run parallel with Phase 2

## Estimated Effort

- **Phase 1**: 10 hours (service extraction)
- **Phase 2**: 8 hours (state extension)
- **Phase 3**: 4 hours (documentation)
- **Phase 4**: 6 hours (integration testing)
- **Total**: 28 hours (3-4 days)

## Risk Level

**Medium Risk**
- New service layer (but additive, not replacing)
- State extension (additive, backward compatible)
- Handler refactor (behavior preserved)

**Mitigations**:
- Phase 1 is non-breaking (existing behavior unchanged)
- Service can coexist with inline logic during transition
- Comprehensive test coverage before removal of inline code
