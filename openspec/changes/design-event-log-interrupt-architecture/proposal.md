# Proposal: Design Event-Log Interrupt Architecture

## Summary

Design a transparent interrupt communication layer using an event-log pattern that moves interrupt handling out of `chat-handlers.ts` into a dedicated service. This provides proper separation of concerns, testability, and prepares the architecture for AI SDK v5 integration and future structured interaction features.

## Motivation

### Current Problems

1. **Hidden Interrupt Logic**: `chat-handlers.ts` (lines 216-232) contains embedded interrupt detection and resume logic that is:
   - Hard to test in isolation
   - Tightly coupled to IPC transport
   - Not reusable for other entry points

2. **No Audit Trail**: When structured interrupts occur, there's no durable record of:
   - What prompt was shown to user
   - When the interrupt occurred
   - What response was provided
   - Whether it was resolved or abandoned

3. **Opaque State**: Interrupt state is scattered across:
   - LangGraph `INTERRUPT` channel
   - Checkpoint `pendingWrites`
   - Handler-local variables
   - No unified query interface

4. **Limited Frontend Contract**: The current `toAssistantUIStream()` emits `finish` on interrupt but doesn't provide:
   - Structured interrupt payload for UI rendering
   - Interrupt status updates
   - History restore with interrupt context

### Why Now?

The current interrupt handling in `chat-handlers.ts` is embedded and hard to test. This creates a clear need for a proper interrupt service layer that:
- Provides transparent interrupt handling separate from chat transport
- Enables unit testing without IPC mocking
- Creates an audit trail for structured interactions
- Prepares the architecture for AI SDK v5 integration

## Why

Current interrupt handling is scattered across multiple layers without proper separation of concerns. The `chat-handlers.ts` file contains embedded interrupt detection logic (lines 216-232) that is tightly coupled to IPC transport and difficult to test in isolation. When structured interrupts occur, there's no durable audit trail recording what prompt was shown, when it occurred, what response was provided, or whether it was resolved or abandoned.

This architectural debt prevents us from:
- Building a testable interrupt service layer
- Supporting structured interrupt UI components
- Implementing proper interrupt history and restore
- Preparing for AI SDK v5 integration

The solution is to implement an event-log pattern that moves interrupt handling into a dedicated service with canonical state management, creating proper separation of concerns while enabling rich frontend experiences for structured interactions.

## What Changes

This design introduces the following changes:

1. **New Interrupt Service Layer**
   - `src/main/services/domain/interrupt/interrupt-service.ts` - Factory-based service handling interrupt lifecycle
   - Extracts interrupt detection and resume logic from `chat-handlers.ts`
   - Provides `prepareRun()`, `createInterruptRecord()`, and `getPendingInterrupt()` methods

2. **Extended Workflow State**
   - `src/main/services/domain/workflow/state.ts` - Adds `interruptHistory: InterruptRecord[]` channel
   - Reducer appends new records and updates existing by ID
   - Default value is empty array
   - **IMPORTANT**: `interruptHistory` is a **derived index**; primary source of truth is `ChatMessage.metadata.interrupt`

3. **Stream Utils Enhancement**
   - `src/main/services/domain/workflow/utils/assistant-ui-stream.ts` - New chunk types:
     - `InterruptStartChunk` - emitted when interrupt detected
     - `InterruptEndChunk` - emitted when interrupt resolved
   - Helper functions: `createInterruptStartChunk()`, `createInterruptEndChunk()`

4. **Message Metadata Pattern**
   - `src/main/services/domain/workflow/utils/interrupt-message.ts` - Helper to create AIMessage with interrupt metadata
   - Embeds interrupt context in `additional_kwargs` for frontend detection
   - **NEW**: `ChatMessage.metadata.interrupt` field for history persistence

5. **Frontend Architecture**
   - Interrupt store using Zustand (`src/renderer/stores/interrupt-store.ts`)
   - Extended `AssistantMessage` component with conditional rendering
   - Stream listener hook (`src/renderer/hooks/useInterruptListener.ts`)
   - Structured interrupt UI components (SelectInterrupt, ApproveInterrupt, RateInterrupt)

6. **Updated Chat Handler**
   - `src/main/handlers/chat-handlers.ts` - Reduced to ~60 lines (from ~120)
   - Delegates interrupt handling to service
   - Maintains existing behavior

7. **New IPC Endpoint**
   - `chat:submit-interrupt-resolution` - Dedicated endpoint for structured interrupt resolution
   - Does not create visible user messages (unlike `chat:start-stream`)

8. **New Specifications**
   - `openspec/specs/interrupt-service-architecture/spec.md` - Service layer requirements
   - `openspec/specs/interrupt-event-log-state/spec.md` - State model requirements
   - `openspec/specs/interrupt-message-metadata/spec.md` - Message metadata pattern

## Scope

### In Scope

1. **Interrupt Service Design**: Factory-based service that owns interrupt lifecycle
2. **Event-Log State Model**: Canonical storage for interrupt events with proper reducers
3. **AI SDK v5 Protocol**: Chunk types and transforms for interrupt UI rendering
4. **Interrupt Metadata in Messages**: Embed interrupt context in AIMessage for history restore
5. **Frontend Architecture**: Complete design for interrupt state management, component hierarchy, and error handling
6. **Architecture Documentation**: Patterns for interrupt usage in workflow nodes

### Out of Scope

1. **Specific Structured Interactions**: Individual features (selectLearningPath, etc.) are separate proposals

## Design Overview

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: IPC Handlers (Transport Only)                                     │
│ chat-handlers.ts - thin, delegates to services                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Interrupt Service (Business Logic)                                │
│ interrupt-service.ts                                                        │
│ - prepareRun(threadId) → { shouldResume, checkpointId }                     │
│ - createInterruptRecord(params) → InterruptRecord                           │
│ - getPendingInterrupt(history) → InterruptRecord | null                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Workflow State (Event-Log Pattern)                                │
│ state.ts - interruptHistory: InterruptRecord[]                              │
│ - Reducer appends new records                                               │
│ - Derived pending status                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Event-Log for Structured Interrupts Only**: Chat messages stay in `messages[]`, interrupt metadata in `interruptHistory[]`

2. **Service Layer Owns Logic**: `chat-handlers.ts` becomes thin transport, service handles:
   - Interrupt detection
   - Resume decision
   - Event recording
   - State derivation

3. **AI SDK Protocol Extension**: New chunk types for interrupt events enable proper UI rendering

4. **Interrupt Context in Messages**: Structured interrupt prompts embed metadata in AIMessage `additional_kwargs` for frontend to detect and render appropriate UI on history restore (no separate API endpoint needed)

5. **Derived Pending Status**: No separate `pendingInterruptId` field; derive from `interruptHistory.findLast(e => e.status === 'pending')`

## Dependencies

- **Related Specs**: `workflow-interrupt-control-flow`, `workflow-interrupt-message-persistence`

## Risks

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| Complexity increase | Medium | Medium | Keep event-log for structured interrupts only | Mitigated |
| Checkpoint size growth | Low | Low | Add retention policy in future | Accepted |
| Breaking existing tests | Low | Medium | Staged rollout with test updates | Mitigated |
| **Message metadata not persisting** | **High** | **High** | **Add `metadata.interrupt` to ChatMessage type** | **RESOLVED** |
| **Cannot persist before interrupt()** | **High** | **High** | **Record in state, then interrupt** | **RESOLVED** |
| **Stream chunks incompatible** | **High** | **Medium** | **Add interrupt-start/interrupt-end to DataStreamChunkType** | **RESOLVED** |
| **Resolution creates visible message** | **Medium** | **Medium** | **Dedicated `chat:submit-interrupt-resolution` endpoint** | **RESOLVED** |
| **Duplicate event-log scope** | **Medium** | **Low** | **Clarified: messages[] primary, interruptHistory derived** | **RESOLVED** |

### Risk Mitigation Details

**RESOLVED: Message Metadata Persistence**
- **Issue**: `message-converter.ts` strips `additional_kwargs`, no `metadata.interrupt` field
- **Fix**: Add `interrupt` to `ChatMessage.metadata`, update converter to extract from `additional_kwargs`
- **Implementation**: Phase 2, Task 2.5

**RESOLVED: Interrupt Persistence Timing**
- **Issue**: Cannot call `createInterruptRecord()` before `interrupt()` (control flow doesn't return)
- **Fix**: Record in `interruptHistory` state, then call `interrupt()` in same node return
- **Alternative**: Use middleware handler if node pattern doesn't allow state update before interrupt
- **Implementation**: Phase 1, Task 1.2

**RESOLVED: Stream Chunk Protocol**
- **Issue**: `DataStreamChunkType` lacks `interrupt-start`/`interrupt-end`, stream stops on interrupt
- **Fix**: Add chunk types, emit interrupt-start before breaking iteration
- **Implementation**: Phase 2, Task 2.3

**RESOLVED: Resolution Endpoint**
- **Issue**: UI sends JSON string as user message (visible in chat)
- **Fix**: New `chat:submit-interrupt-resolution` endpoint for hidden control flow
- **Implementation**: Phase 1, Task 1.4

## Success Criteria

1. Interrupt detection/resume logic moved out of `chat-handlers.ts`
2. Interrupt service is unit-testable without IPC mocking
3. Structured interrupt messages include metadata for UI rendering
4. AI SDK chunks include interrupt payload during stream
5. Frontend architecture provides complete implementation blueprint
6. Documentation covers interrupt service patterns

## Effort Estimate

- **Design & Spec**: 8 hours
- **Implementation**: 16 hours
- **Testing**: 8 hours
- **Documentation**: 4 hours
- **Total**: 36 hours (4-5 days)
