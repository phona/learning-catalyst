# OpenSpec Change Proposal: Persist Interrupt User Messages to Checkpoints

## Why

When users refresh the chat page after an interrupt/resume cycle, **their replies are missing from the conversation history**. The user's input is streamed to the UI and processed by the workflow, but it's **not persisted as a `HumanMessage` in LangGraph checkpoints**. This breaks the "Refresh Still Shows Full History" requirement from `chat-transport-bucket2`.

### User Impact
- User replies after interrupts (e.g., practice answers, teach follow-ups) don't appear in history after refresh
- Conversation appears incomplete - shows assistant messages but missing user responses
- Confusing UX where the assistant references something the user "said" but it's not visible

### Technical Root Cause
When resuming from an interrupt, the workflow uses `Command({ resume: <userInput> })` which passes the user's input directly to the interrupt point **without creating a `HumanMessage`**. Workflow nodes return `{ messages: [new AIMessage(content)] }` for the assistant's response, but the user's reply is never added to the message state.

Compare:
- **Initial message**: `{ messages: [new HumanMessage(text)] }` → `HumanMessage` saved ✓
- **Resume after interrupt**: `Command({ resume: text })` → NO `HumanMessage` saved ✗

## What Changes

### Core Pattern
Modify workflow nodes that use `interrupt()` to return **both** the assistant prompt and the user's reply (in chronological order):

```typescript
// BEFORE (missing user message in history)
const prompt = content;
const resumeValue = await interrupt({ type: '...', prompt });
const userAnswer = extractAnswer(resumeValue);

return {
  messages: [new AIMessage(prompt)], // Only assistant prompt (user reply missing)
  // ...
};

// AFTER (complete prompt + reply pair)
const prompt = content;
const resumeValue = await interrupt({ type: '...', prompt });
const userAnswer = extractAnswer(resumeValue);

return {
  messages: [
    new AIMessage(prompt),        // Assistant prompt (what the user saw)
    new HumanMessage(userAnswer), // User's reply (resume value)
  ],
  // ...
};
```

### Affected Files
1. `src/main/services/domain/workflow/subgraphs/practice/nodes/handleConversation.ts`
2. `src/main/services/domain/workflow/subgraphs/practice/nodes/askQuestion.ts`
3. `src/main/services/domain/workflow/subgraphs/teach/nodes/explain.ts`
4. `src/main/services/domain/workflow/subgraphs/teach/nodes/handleQuestion.ts`
5. `src/main/services/domain/workflow/nodes/fastTrackQuiz.ts`

### Result
- All user inputs (including after interrupts) are persisted as `HumanMessage` in checkpoints
- `chat:get-messages` retrieves complete conversation history
- Refresh shows full conversation with both user and assistant messages

## Problem Statement

### Current Behavior
The workflow uses `interrupt()` to pause execution and wait for user input. When resuming:

```typescript
// In chat-handlers.ts
const stream = await workflowGraph.stream(
  shouldResume ? new Command({ resume: lastUserText }) : { messages: lcMessages },
  streamConfig,
);
```

The `Command({ resume: value })` pattern passes the user's input directly to the `interrupt()` call site **without creating a `HumanMessage`** in the workflow state.

Workflow nodes receive the resume value and return:
```typescript
return {
  messages: [new AIMessage(content)],  // Only assistant response
  userAnswer,  // Stored in separate state field, NOT as message
  // ...
};
```

The `userAnswer` field is used for workflow logic but **not added to the messages array**, so it's not persisted to checkpoints as part of conversation history.

### Expected Behavior
Per `chat-transport-bucket2` requirement "Refresh Still Shows Full History":
> Given a conversation `conversationId=X` has prior messages stored in checkpoints
> When the user reloads the app or re-opens the conversation
> Then the UI retrieves history via `chat:get-messages(X)`
> And the chat view shows the complete prior conversation

"Complete prior conversation" means **all** user and assistant messages, including those exchanged during interrupt/resume cycles.

### Evidence
Current checkpoint structure after an interrupt/resume:
```json
{
  "channel_values": {
    "messages": [
      { "role": "user", "content": "Teach me closures" },      // ✓ Initial message
      { "role": "assistant", "content": "Here's an explanation..." },  // ✓ First response
      // ❌ Missing: User's follow-up question after interrupt
      { "role": "assistant", "content": "Great question! Let me clarify..." }  // ✓ Second response
    ]
  }
}
```

The user's follow-up question (the resume value) is missing from the message array.

## Alternatives Considered

### Alternative 1: Modify Chat Handler to Add Message Before Resume
```typescript
// In chat-handlers.ts
if (shouldResume) {
  await workflowGraph.updateState(
    { configurable: { thread_id: safeConversationId } },
    { messages: [new HumanMessage(lastUserText)] }
  );
  const stream = await workflowGraph.stream(
    new Command({ resume: lastUserText }),
    streamConfig,
  );
}
```

**Pros**: Centralized fix, no node changes needed
**Cons**: More complex, requires testing state update ordering with resume; harder to verify correctness

### Alternative 2: Create Helper Function to Extract and Create Messages
```typescript
function createInterruptMessages(userInput: string, assistantResponse: string) {
  return [
    new HumanMessage(userInput),
    new AIMessage(assistantResponse),
  ];
}

// In nodes
return {
  messages: createInterruptMessages(userAnswer, content),
  // ...
};
```

**Pros**: DRY principle, consistent pattern
**Cons**: Adds abstraction layer; nodes have different patterns (some early return, some not)

**Selected Approach**: Direct `new HumanMessage()` in each node (simpler, explicit, easier to verify).

## Dependencies

### Related Specs
- **chat-transport-bucket2**: "Refresh Still Shows Full History" requirement
- **workflow-interrupt-control-flow**: Documents correct interrupt/resume patterns

### Related Code
- `src/main/services/domain/workflow/state.ts` - `messagesStateReducer` (appends messages)
- `src/main/handlers/chat-handlers.ts` - Resume logic with `Command({ resume })`
- `src/main/services/domain/chat/index.ts` - `getMessages()` retrieves from checkpoints

## Risks

### Risk 1: Message Ordering
**Risk**: Returning messages in the wrong order could scramble history after refresh.

**Mitigation**: The `messagesStateReducer` appends messages in order: `[...current, ...update]`. Return messages in the order the user saw them (usually prompt then reply).

### Risk 2: Missing Nodes
**Risk**: Some nodes using `interrupt()` might be missed in the change.

**Mitigation**: Used `rg -l "interrupt\("` to find all affected files. Test coverage validates all interrupt paths.

### Risk 3: Early Return Paths
**Risk**: Some nodes have early returns (e.g., `isComplete` in `handleConversation`) that might skip the pattern.

**Mitigation**: Audit all return statements in affected nodes to ensure consistent pattern.

## Success Criteria

1. ✅ All nodes using `interrupt()` return both `HumanMessage` and `AIMessage`
2. ✅ Checkpoints contain complete conversation history after interrupt/resume
3. ✅ `chat:get-messages` returns all user and assistant messages
4. ✅ Refresh shows complete conversation including user's interrupt replies
5. ✅ Tests verify interrupt/resume message persistence

## Out of Scope

- Modifying the chat handler to add messages before resume (Alternative 1)
- Changing LangGraph's interrupt/resume mechanism itself
- Modifying the renderer or UI components
- Changing the checkpoint saver or message retrieval logic
