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
- [ ] Handler receives interruptService in dependencies
- [ ] `hasPendingInterrupt` check replaced with `interruptService.prepareRun()`
- [ ] Resume decision delegated to service
- [ ] Handler reduced to ~60 lines (from ~120)
- [ ] Existing behavior unchanged

### Task 1.5: Update Chat Handler Tests
**File**: `src/main/handlers/__tests__/chat-handlers.test.ts`
**Description**: Update tests for refactored handler
**Acceptance**:
- [ ] Tests mock interruptService instead of checkpointer
- [ ] Existing tests still pass

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
- [ ] InterruptStartChunk interface defined
- [ ] InterruptEndChunk interface defined
- [ ] Added to DataStreamChunk union
- [ ] createInterruptStartChunk helper function
- [ ] createInterruptEndChunk helper function

### Task 2.4: Extend toAssistantUIStream for Interrupt Chunks
**File**: `src/main/services/domain/workflow/utils/assistant-ui-stream.ts`
**Description**: Handle interrupt events with proper chunks
**Acceptance**:
- [ ] Emit interrupt-start chunk when interrupt detected
- [ ] Include full payload in chunk
- [ ] Maintain existing finish behavior
- [ ] Add tests for interrupt chunk emission

### Task 2.5: Define Interrupt Message Metadata Pattern
**File**: `src/main/services/domain/workflow/utils/interrupt-message.ts`
**Description**: Helper to create AIMessage with interrupt metadata
**Acceptance**:
- [ ] `createInterruptMessage(record)` returns AIMessage with additional_kwargs
- [ ] additional_kwargs includes: interruptType, interruptId, options, pending
- [ ] Documented pattern for frontend detection

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

## Dependencies

- **Prerequisite**: `refactor-workflow-interrupt-usage` should be applied first
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
