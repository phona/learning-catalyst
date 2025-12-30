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

The `refactor-workflow-interrupt-usage` proposal establishes that:
- Chat Q&A uses natural message flow (no interrupt)
- Structured interactions (approve, select, upload, rate) use `interrupt()`

This creates a clear need for a proper interrupt service layer that handles structured interactions transparently, separate from the chat transport.

## Scope

### In Scope

1. **Interrupt Service Design**: Factory-based service that owns interrupt lifecycle
2. **Event-Log State Model**: Canonical storage for interrupt events with proper reducers
3. **AI SDK v5 Protocol**: Chunk types and transforms for interrupt UI rendering
4. **Interrupt Metadata in Messages**: Embed interrupt context in AIMessage for history restore
5. **Architecture Documentation**: Patterns for interrupt usage in workflow nodes

### Out of Scope

1. **Chat Q&A Changes**: Already handled by `refactor-workflow-interrupt-usage`
2. **Specific Structured Interactions**: Individual features (selectLearningPath, etc.) are separate proposals
3. **Frontend Component Implementation**: UI components for interrupt rendering

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

- **Prerequisite**: `refactor-workflow-interrupt-usage` must be applied first (establishes interrupt decision tree)
- **Related Specs**: `workflow-interrupt-control-flow`, `workflow-interrupt-message-persistence`

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complexity increase | Medium | Medium | Keep event-log for structured interrupts only |
| Checkpoint size growth | Low | Low | Add retention policy in future |
| Breaking existing tests | Low | Medium | Staged rollout with test updates |

## Success Criteria

1. Interrupt detection/resume logic moved out of `chat-handlers.ts`
2. Interrupt service is unit-testable without IPC mocking
3. Structured interrupt messages include metadata for UI rendering
4. AI SDK chunks include interrupt payload during stream
5. Documentation covers interrupt service patterns

## Effort Estimate

- **Design & Spec**: 8 hours
- **Implementation**: 16 hours
- **Testing**: 8 hours
- **Documentation**: 4 hours
- **Total**: 36 hours (4-5 days)
