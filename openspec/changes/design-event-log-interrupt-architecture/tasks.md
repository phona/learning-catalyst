# Tasks: Native Interrupt with External Storage Restore

## Overview

Implement reliable interrupt restoration using:
- LangGraph's native `interrupt()` for workflow pausing
- External SQLite storage for interrupt context
- Handler watches stream and stores interrupt events

## Phase 1: Database Layer

### Task 1.1: Create Interrupt Schema Migration
**File**: `src/main/services/core/database/migrations/XXXX_add_interrupts.sql`
**Description**: Add interrupts table to database
**Acceptance**:
- [ ] Table `interrupts` with columns: id, thread_id, checkpoint_id, checkpoint_timestamp, type, status, payload, resolution, created_at, resolved_at
- [ ] Index `idx_interrupts_pending` on (thread_id, status) WHERE status = 'pending'
- [ ] Foreign key to sessions table

### Task 1.2: Create Interrupt Types
**File**: `src/main/services/domain/interrupt/types.ts`
**Description**: Define TypeScript types for interrupts
**Acceptance**:
- [ ] `InterruptType` union: 'qa' | 'select' | 'approve' | 'rate' | 'upload'
- [ ] `InterruptStatus` union: 'pending' | 'resolved'
- [ ] `InterruptPayload` interface with prompt and options
- [ ] `InterruptRecord` interface
- [ ] `CreateInterruptInput` and `ResolveInterruptInput` interfaces

### Task 1.3: Create Interrupt Repository
**File**: `src/main/services/domain/interrupt/interrupt-repo.ts`
**Description**: SQLite CRUD operations for interrupts
**Acceptance**:
- [ ] `create(input)` - Insert new interrupt, return record
- [ ] `get(id)` - Get by id, return null if not found
- [ ] `getPendingByThread(threadId)` - Get pending interrupt for thread
- [ ] `resolve(id, input)` - Update status and resolution
- [ ] `deleteResolvedOlderThan(timestamp)` - Cleanup old records
- [ ] Tests with >90% coverage

## Phase 2: Backend Handler

### Task 2.1: Add Resume-Interrupt IPC Type
**File**: `src/shared/types/electron-api/chat.ts`
**Description**: Add resume-interrupt to IPC contract
**Acceptance**:
- [ ] `chat:resume-interrupt` method with payload: { conversationId, interruptId, resolution }
- [ ] Type exported for frontend use

### Task 2.2: Update Chat Handler with Interrupt Detection
**File**: `src/main/handlers/chat-handlers.ts`
**Description**: Add interrupt event detection in stream
**Acceptance**:
- [ ] Check `chunk.event === 'interrupt'` in stream loop
- [ ] Store interrupt in repository when detected
- [ ] Emit `interrupt-start` chunk to frontend
- [ ] Break iteration after emitting interrupt

### Task 2.3: Add Resume-Interrupt Endpoint
**File**: `src/main/handlers/chat-handlers.ts`
**Description**: Handle interrupt resumption
**Acceptance**:
- [ ] Validate interrupt exists and is pending
- [ ] Update interrupt status to resolved
- [ ] Resume from stored checkpoint_id
- [ ] Handle idempotent resume (already resolved)
- [ ] Handle stale checkpoint (fallback to latest)

### Task 2.4: Update Get-Thread for Pending Interrupt
**File**: `src/main/handlers/chat-handlers.ts`
**Description**: Return pending interrupt with thread
**Acceptance**:
- [ ] Query `interruptRepo.getPendingByThread(conversationId)`
- [ ] Return `{ messages, pendingInterrupt: { id, type, prompt, options } | null }`
- [ ] Handle case where no pending interrupt exists

### Task 2.5: Handler Integration Tests
**File**: `src/main/handlers/__tests__/interrupt-handler.test.ts`
**Description**: Test handler interrupt handling
**Acceptance**:
- [ ] Test interrupt detection in stream
- [ ] Test resume-interrupt endpoint
- [ ] Test page reload query
- [ ] Test idempotent resume
- [ ] Test stale checkpoint recovery

## Phase 3: Frontend

### Task 3.1: Update Chat Service
**File**: `src/renderer/services/chat/chat-service.ts`
**Description**: Add resume method to service
**Acceptance**:
- [ ] `resumeInterrupt(params)` method added
- [ ] Calls `electronAPI.chat.resumeInterrupt`

### Task 3.2: Update ChatPage for Pending Interrupt
**File**: `src/renderer/pages/chat/ChatPage.tsx`
**Description**: Handle pending interrupt on load and submit
**Acceptance**:
- [ ] On load: call `getThread`, check for pendingInterrupt
- [ ] If pending: set state, activate interrupt store
- [ ] On submit: if pending && type === 'qa', call resumeInterrupt
- [ ] After resume: clear pending state

### Task 3.3: Frontend Tests
**File**: `src/renderer/__tests__/interrupt-chat-page.test.tsx`
**Description**: Test frontend interrupt handling
**Acceptance**:
- [ ] Test pending interrupt restoration on load
- [ ] Test QA resume via submit
- [ ] Test normal message when no pending interrupt

## Phase 4: Cleanup

### Task 4.1: Add Cleanup Job
**File**: `src/main/services/domain/interrupt/cleanup.ts`
**Description**: Remove old resolved interrupts
**Acceptance**:
- [ ] Function to delete resolved interrupts older than 30 days
- [ ] Can be run as periodic job (e.g., daily)

### Task 4.2: Documentation
**File**: `src/main/services/domain/interrupt/README.md`
**Description**: Document interrupt architecture
**Acceptance**:
- [ ] How interrupts work
- [   Recipe for adding new interrupt types
- [ ] Troubleshooting guide

## Validation Checklist

Before marking complete:
- [ ] All Phase 1 tasks (database layer)
- [ ] All Phase 2 tasks (backend handler)
- [ ] All Phase 3 tasks (frontend)
- [ ] All Phase 4 tasks (cleanup)
- [ ] Interrupt pauses workflow correctly
- [ ] Interrupt context survives page reload
- [ ] Resume works from exact checkpoint
- [ ] No regressions in existing chat flow

## Effort Estimate

| Phase | Tasks | Hours |
|-------|-------|-------|
| Phase 1: Database | 3 | 4 |
| Phase 2: Backend | 4 | 6 |
| Phase 3: Frontend | 3 | 3 |
| Phase 4: Cleanup | 2 | 2 |
| **Total** | **12** | **15 hours (2 days)** |

## Dependencies

- **Sequential**: Phase 2 depends on Phase 1
- **Sequential**: Phase 3 depends on Phase 2
- **Parallelizable**: Tasks within each phase

## Risk Level

**Low Risk**
- Uses LangGraph's native interrupt() - no workflow changes
- Simple CRUD operations - well-understood pattern
- Additive - doesn't break existing functionality
