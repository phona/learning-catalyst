# Design: Fix Chat Thread Resume Logic

## Current Architecture

### Chat Handler Flow
```
User Message → IPC Handler → Checkpoint Check → Resume Decision → Workflow Stream
```

### Resume Logic (Current)
```typescript
// src/main/handlers/chat-handlers.ts:216-217
const shouldResume =
  lastUserText.trim().length > 0 && hasPendingInterrupt(checkpointTuple);
```

### Problem Flow
```
Message 1: "how to learn python"
├── checkpointTuple = null (first message)
├── hasPendingInterrupt() = false
├── shouldResume = false
└── workflow.stream({ messages: [msg] }) ✓ Correct

Message 2: "how to install python"
├── checkpointTuple = exists (from message 1)
├── hasPendingInterrupt() = false ❌ Bug: interrupt was consumed
├── shouldResume = false ❌ Bug: starts fresh
└── workflow.stream({ messages: [msg] }) ✗ Wrong: restarts from START
```

## Proposed Design

### Resume Logic (Fixed)
```typescript
// src/main/handlers/chat-handlers.ts:216-217
const hasExistingCheckpoint = !!checkpointTuple;
const shouldResume =
  hasExistingCheckpoint && lastUserText.trim().length > 0;
```

### Fixed Flow
```
Message 1: "how to learn python"
├── checkpointTuple = null (first message)
├── hasExistingCheckpoint = false
├── shouldResume = false
└── workflow.stream({ messages: [msg] }) ✓ Correct

Message 2: "how to install python"
├── checkpointTuple = exists (from message 1)
├── hasExistingCheckpoint = true ✓ Fix: uses checkpoint existence
├── shouldResume = true ✓ Fix: resumes correctly
└── workflow.stream(Command({ resume: msg })) ✓ Correct: resumes from interrupt
```

## LangGraph Resume Behavior

### First Message (New Thread)
```typescript
// No checkpoint exists
workflow.stream(
  { messages: [new HumanMessage("how to learn python")] },
  { configurable: { thread_id: "thread_123" } }
)
// Flow: START → TOPIC_PARSE → ASSESS → PLAN → TEACH → interrupt()
```

### Second Message (Resume Thread)
```typescript
// Checkpoint exists from first message
workflow.stream(
  new Command({ resume: "how to install python" }),
  {
    configurable: {
      thread_id: "thread_123",
      checkpoint_id: "<checkpoint_id_from_tuple>"
    }
  }
)
// Flow: Resume from TEACH interrupt → explainNode receives resume value
//        → CLASSIFY_RESPONSE → routes based on user intent
```

## Why This Works

### LangGraph Checkpoint Semantics
1. **First message**: Creates initial checkpoint at interrupt
2. **Subsequent messages**: Resume from that checkpoint if provided
3. **Interrupt consumption**: `interrupt()` returns resume value, checkpoint is saved with new state

### Key Insight
The existence of a checkpoint is sufficient to determine if we should resume. The interrupt state is transient - once consumed, the checkpoint still exists and represents the conversation state.

## Edge Cases Handled

### Empty Message
```typescript
const shouldResume = hasExistingCheckpoint && lastUserText.trim().length > 0;
// If lastUserText is empty → shouldResume = false (correct: don't resume with no input)
```

### New Conversation
```typescript
// User starts new chat (new conversationId)
checkpointTuple = null → hasExistingCheckpoint = false → shouldResume = false
// Correct: starts fresh workflow
```

### Interrupt After Multiple Rounds
```typescript
// Teach subgraph: EXPLAIN → CLASSIFY_RESPONSE → EXPLAIN (round 2) → interrupt()
// Second resume still works because checkpoint exists and has latest state
```

## Testing Strategy

### Unit Test
```typescript
describe('shouldResume logic', () => {
  it('returns false when no checkpoint exists', () => {
    const checkpointTuple = undefined;
    const lastUserText = "test message";
    expect(calculateShouldResume(checkpointTuple, lastUserText)).toBe(false);
  });

  it('returns true when checkpoint exists and message is not empty', () => {
    const checkpointTuple = { /* mock */ };
    const lastUserText = "test message";
    expect(calculateShouldResume(checkpointTuple, lastUserText)).toBe(true);
  });

  it('returns false when message is empty', () => {
    const checkpointTuple = { /* mock */ };
    const lastUserText = "   ";
    expect(calculateShouldResume(checkpointTuple, lastUserText)).toBe(false);
  });
});
```

### Integration Test
```typescript
it('resumes workflow from checkpoint on second message', async () => {
  // First message
  await streamMessage("how to learn python", conversationId);
  let checkpoint = await checkpointSaver.getTuple({ configurable: { thread_id: conversationId } });
  expect(checkpoint).toBeDefined();

  // Second message should resume, not restart
  await streamMessage("how to install python", conversationId);
  const state = await getWorkflowState(conversationId);

  // Verify teaching round increased (didn't restart)
  expect(state.teach.teachingRound).toBe(2);
  // Verify topic didn't change
  expect(state.topic).toBe("python");
});
```

## Risk Assessment

### Low Risk
- **Isolated change**: Single line modification in one file
- **Backward compatible**: New conversations start fresh as before
- **Testable**: Existing test infrastructure can verify behavior

### Potential Issues
1. **Stale checkpoints**: If a checkpoint is corrupted or incomplete, resume might fail
   - **Mitigation**: Checkpoint reads are wrapped in try/catch (line 207-214)
2. **Interrupt state mismatch**: If workflow expects different interrupt state
   - **Mitigation**: LangGraph handles this by returning error if resume doesn't match expected state

## Implementation Notes

### Dependencies
- `hasPendingInterrupt` function from `@/main/services/domain/workflow/pending-interrupt`
- Can be removed after this change (no longer needed)

### Migration Path
1. Change resume logic
2. Remove unused `hasPendingInterrupt` import
3. Add tests for new behavior
4. Update related documentation if needed
