# Design: Persist Interrupt User Messages

## Architecture Context

### LangGraph Message Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Workflow Message State                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Initial Call:                After Resume:                                 │
│  ┌─────────────────┐          ┌─────────────────┐                          │
│  │ HumanMessage    │          │ HumanMessage    │  ← Initial user message │
│  │ (user input)    │          │ (user input)    │                          │
│  └─────────────────┘          ├─────────────────┤                          │
│           │                    │ AIMessage       │  ← Assistant response    │
│           ▼                    │ (assistant)     │                          │
│  ┌─────────────────┐          ├─────────────────┤                          │
│  │ AIMessage       │          │ HumanMessage    │  ← MISSING: User reply   │
│  │ (assistant)     │          │ (user reply)    │    to interrupt          │
│  └─────────────────┘          ├─────────────────┤                          │
│                              │ AIMessage       │  ← Assistant response    │
│                              │ (assistant)     │    to user's reply        │
│                              └─────────────────┘                          │
│                                                                             │
│  messagesStateReducer: [...current, ...update]                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Interrupt/Resume Pattern
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Interrupt/Resume Lifecycle                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INITIAL MESSAGE                                                          │
│     ┌──────────────┐                                                         │
│     │ Renderer     │ sends { conversationId, newUserMessage }               │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            ▼                                                                 │
│     ┌──────────────┐                                                         │
│     │ chat-handler │ creates { messages: [new HumanMessage(text)] }         │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            ▼                                                                 │
│     ┌──────────────┐                                                         │
│     │ Workflow     │ processes → node calls interrupt({ prompt })            │
│     │ Node         │ ─────────────────────────────────────────┐             │
│     └──────────────┘                                         │             │
│                                Workflow PAUSES                  │             │
│                                Checkpoint saved                 │             │
│                                                                 │             │
│  2. USER REPLY ────────────────────────────────────────────────┼─────────────┤
│     ┌──────────────┐                                         │             │
│     │ Renderer     │ sends { conversationId, newUserMessage }  │             │
│     └──────┬───────┘                                         │             │
│            │                                                 │             │
│            ▼                                                 │             │
│     ┌──────────────┐                                         │             │
│     │ chat-handler │ detects pending interrupt               │             │
│     └──────┬───────┘ creates Command({ resume: text })       │             │
│            │                                                 │             │
│            ▼                                                 │             │
│     ┌──────────────┐                                         │             │
│     │ Workflow     │ RESUMES at interrupt()                  │             │
│     │ Node         │ receives resume value                   │             │
│     │              │ ─────────────────────────────────────────┘             │
│     │              │                                                              │
│     │              │ BUG: Returns { messages: [new AIMessage(content)] }         │
│     │              │      Missing: new HumanMessage(userReply)                   │
│     └──────────────┘                                                              │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Solution Design

### Pattern: Return Message Pair

All workflow nodes that use `interrupt()` will return both messages:

```typescript
export const exampleNode = (deps: WorkflowDeps) => async (
  state: typeof StateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // 1. Generate or stream assistant response
  const content = await streamLLM({ model, messages, config, streamMode });

  // 2. Interrupt for user input
  const resumeValue = await interrupt({
    type: 'example_type',
    prompt: content,
  });

  // 3. Extract user's reply from resume value
  const userAnswer = typeof resumeValue === 'string'
    ? resumeValue
    : (resumeValue as { answer?: string })?.answer ?? '';

  // 4. Return BOTH messages
  return {
    messages: [
      new HumanMessage(userAnswer),  // User's reply (ADDED)
      new AIMessage(content),        // Assistant's response
    ],
    // ... other state updates
  };
};
```

### Message Ordering Guarantees

The `messagesStateReducer` in `state.ts`:
```typescript
const messagesStateReducer = (
  current: BaseMessage[] | undefined,
  update: BaseMessage[],
): BaseMessage[] => {
  const curr = current ?? [];
  return [...curr, ...update];  // Appends in order
};
```

When a node returns `{ messages: [HumanMessage, AIMessage] }`:
1. Reducer receives `update = [HumanMessage, AIMessage]`
2. Appends both to current state: `[...current, HumanMessage, AIMessage]`
3. Result: Chronological conversation history

## Affected Nodes Analysis

### 1. handleConversation.ts (Practice Subgraph)
**Location**: `src/main/services/domain/workflow/subgraphs/practice/nodes/handleConversation.ts`

**Interrupt Points**:
- Line 241: `await interrupt({ type: 'practice_final_attempt', ... })`
- Line 293: `await interrupt({ type: 'practice_followup', ... })`

**Current Returns**:
- Line 253: `messages: [new AIMessage(maxTurnsMessage)]` (max turns case)
- Line 283: `messages: [new AIMessage(message)]` (give up case)
- Line 315: `messages: [new AIMessage(message)]` (normal case)

**Fix Required**: Add `new HumanMessage(answer)` in all three paths (preserve chronology: prompt then reply).

### 2. askQuestion.ts (Practice Subgraph)
**Location**: `src/main/services/domain/workflow/subgraphs/practice/nodes/askQuestion.ts`

**Interrupt Point**: Line ~135 (estimated) - `await interrupt({ type: 'practice_question', ... })`

**Fix Required**: Return `[new AIMessage(questionContent), new HumanMessage(userAnswer)]` (prompt then reply)

### 3. explain.ts (Teach Subgraph)
**Location**: `src/main/services/domain/workflow/subgraphs/teach/nodes/explain.ts`

**Interrupt Point**: Line 138 - `await interrupt({ type: 'teach_response', ... })`

**Current Return**: Line 153 - `messages: [new AIMessage(content)]`

**Fix Required**: Return `[new AIMessage(content), new HumanMessage(userAnswer)]` (prompt then reply)

### 4. handleQuestion.ts (Teach Subgraph)
**Location**: `src/main/services/domain/workflow/subgraphs/teach/nodes/handleQuestion.ts`

**Interrupt Point**: Needs verification - likely has `await interrupt()`

**Fix Required**: Verify and apply pattern if needed.

### 5. fastTrackQuiz.ts (Main Workflow)
**Location**: `src/main/services/domain/workflow/nodes/fastTrackQuiz.ts`

**Interrupt Point**: Line ~140 (estimated) - `await interrupt({ type: 'fasttrack_quiz', ... })`

**Current Return**: Line 207 - `messages: [new AIMessage(quizContent)]`

**Fix Required**: Return `[new AIMessage(quizContent), new HumanMessage(userAnswer)]` (prompt then reply)

## Implementation Strategy

### Phase 1: Code Audit
1. Verify all interrupt points in affected nodes
2. Document current return patterns
3. Identify any edge cases (early returns, error paths)

### Phase 2: Node Updates
1. Update each node to return `[new HumanMessage(), new AIMessage()]`
2. Ensure all return paths (including early returns) follow the pattern
3. Add imports for `HumanMessage` if missing

### Phase 3: Testing
1. Unit tests for each node to verify message return
2. Integration tests for interrupt/resume cycles
3. E2E test for refresh after interrupt

### Phase 4: Verification
1. Run full workflow test suite
2. Manual testing: refresh after practice question
3. Manual testing: refresh after teach follow-up

## Edge Cases

### Edge Case 1: Empty Resume Value
If user sends empty reply:
```typescript
const userAnswer = extractAnswer(resumeValue); // Could be empty string
return {
  messages: [
    new HumanMessage(userAnswer || ''),  // Allow empty
    new AIMessage(content),
  ],
};
```
**Decision**: Allow empty `HumanMessage` - it's still a valid user action.

### Edge Case 2: Resume Value Format Mismatch
Different interrupt types return different formats:
```typescript
// Some interrupts return string
const resumeValue = await interrupt(...);
const userAnswer = typeof resumeValue === 'string' ? resumeValue : resumeValue?.answer ?? '';

// Others return object
const resumeValue = await interrupt(...) as { answer?: string };
const userAnswer = resumeValue?.answer ?? '';
```
**Decision**: Keep existing extraction logic, just wrap result in `HumanMessage`.

### Edge Case 3: Early Return Before Interrupt
Some nodes might return early before reaching `interrupt()`:
```typescript
if (someCondition) {
  return {
    messages: [new AIMessage("Early response")],
    // No HumanMessage needed (no user input yet)
  };
}
```
**Decision**: Only add `HumanMessage` when returning after an actual `interrupt()` call.

## Testing Strategy

### Unit Tests
For each affected node:
```typescript
it('returns both HumanMessage and AIMessage after interrupt', async () => {
  const result = await node(deps)(state, config);
  expect(result.messages).toHaveLength(2);
  expect(result.messages[0]).toBeInstanceOf(HumanMessage);
  expect(result.messages[1]).toBeInstanceOf(AIMessage);
});
```

### Integration Tests
```typescript
it('persists user reply to checkpoint after interrupt/resume', async () => {
  // Start workflow
  await workflow.stream({ messages: [new HumanMessage("Start")] }, config);

  // Resume after interrupt
  await workflow.stream(new Command({ resume: "My answer" }), config);

  // Check checkpoint
  const checkpoint = await checkpointer.getTuple(config);
  const messages = checkpoint.checkpoint.channel_values.messages;

  expect(messages).toHaveLength(4); // user, assistant, user-reply, assistant-response
  expect(messages[2].content).toBe("My answer");
});
```

### E2E Tests
```typescript
it('refresh shows complete conversation after interrupt', async () => {
  // Start conversation
  await sendMessage("Teach me closures");
  await waitForResponse();

  // Reply to interrupt
  await sendMessage("Can you clarify?");
  await waitForResponse();

  // Refresh
  await page.reload();

  // Verify both user messages visible
  const messages = getVisibleMessages();
  expect(messages).toContain("Teach me closures");
  expect(messages).toContain("Can you clarify?"); // Previously missing
});
```

## Rollback Plan

If issues arise:
1. Revert node changes (remove `HumanMessage` from returns)
2. Keep tests for future reference
3. Re-evaluate Alternative 1 (chat handler modification)

No database migration or schema changes required - pure code rollback.
