# fix-chat-thread-resume-logic

## Summary
Fix a bug in the chat handler where conversation threads restart from the beginning on every message instead of resuming from the existing workflow checkpoint.

## Problem
When a user sends multiple messages in a learning conversation, each message incorrectly restarts the workflow from the beginning instead of resuming from the previous checkpoint. This causes:

1. The teaching node to re-explain concepts from scratch
2. Loss of conversation context (teaching round, gaps, user understanding level)
3. Poor user experience as the system "forgets" what was just discussed

### Example of Bug Behavior
```
User: "how to learn python"
Assistant: (explains Python basics with detailed examples)

User: "how to install python"
Assistant: "Great! Let's dive into the Python Basics..." (restarts from scratch)
```

Expected: The second message should resume the teach subgraph, classify the question, and provide installation guidance without restarting.

## Root Cause
In `src/main/handlers/chat-handlers.ts:216-217`, the resume logic checks for a pending interrupt:

```typescript
const shouldResume =
  lastUserText.trim().length > 0 && hasPendingInterrupt(checkpointTuple);
```

The problem is that `hasPendingInterrupt()` returns `false` after the interrupt is consumed by the first message. When the second message arrives:

1. `checkpointTuple` exists (thread has state)
2. `hasPendingInterrupt()` returns `false` (interrupt was consumed)
3. `shouldResume` = `false`
4. System starts fresh instead of resuming

The correct behavior should resume if a checkpoint exists for the thread, regardless of interrupt state.

## Solution
Change the resume logic to check for an existing checkpoint instead of checking for a pending interrupt:

```typescript
const hasExistingCheckpoint = !!checkpointTuple;
const shouldResume =
  hasExistingCheckpoint && lastUserText.trim().length > 0;
```

This ensures:
- **First message**: No checkpoint → starts fresh workflow
- **Subsequent messages**: Checkpoint exists → resumes from interrupt

## Related Specs
- `chat-transport-bucket2` - "Interrupt Resume Uses `Command({ resume })`"
- `workflow-interrupt-message-persistence` - "Workflow Nodes Persist User Reply After Interrupt"

## Impact
- **User-facing**: Conversations maintain context across messages
- **Technical**: One-line change in chat handler
- **Risk**: Low - change is isolated to resume condition

## Alternatives Considered
1. **Make interrupts persistent across checkpoint reads** - Rejected as it would require changes to LangGraph checkpoint handling
2. **Add a separate "active thread" state** - Rejected as checkpoint existence is sufficient
3. **Use thread metadata to track conversation state** - Rejected as over-engineering for this use case
