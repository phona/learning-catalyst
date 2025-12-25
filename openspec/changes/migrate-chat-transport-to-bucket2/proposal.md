# Proposal: Migrate Chat Transport to Bucket 2 (Backend-Owned State)

## Why

Today the assistant-ui / AI SDK transport sends `messages: [...]` (full chat history) on every turn.

This is a common "stateless backend" pattern, but our backend is not stateless:

- We use LangGraph with a checkpointer (conversation state is stored by `thread_id`)
- Some nodes call `interrupt()` and expect the next user input to resume execution

This mismatch causes correctness issues (ex: user replies `"yes"` to a question, but it is interpreted as a new topic string) and increases payload size over time.

## Current vs Proposed (simple picture)

### Current (Bucket 1 style)

```
UI -> main: { conversationId, messages:[full history] }
main: workflowGraph.stream({ messages:[full history] })
graph: START -> TOPIC_PARSE(last user msg)
```

### Proposed (Bucket 2)

```
UI -> main: { conversationId, newUserMessage }
main: load checkpoint by conversationId(thread_id)
  if pending interrupt: resume(Command({ resume:newUserMessage }))
  else: append newUserMessage and continue
```

## What Changes

1) **Transport contract becomes delta-based**
- Renderer/preload sends:
  - `conversationId` (stable thread id)
  - `newUserMessage` (string or "parts" payload)
- It no longer sends the full history in each `chat:start-stream` call.

2) **Main process becomes the source of truth**
- Main loads state from LangGraph checkpoints using `thread_id`
- Main appends the new message to state and continues
- If there is a pending interrupt, main resumes using LangGraph `Command({ resume })`

3) **History hydration**
- UI loads history via `chat:get-messages(conversationId)` on open/refresh
- UI displays history, but history is not re-sent each turn as input

4) **Compatibility window (optional)**
During migration, main can accept both payload shapes:
- Legacy: `{ messages:[...] }`
- New: `{ newUserMessage: ... }`
and prefer the new path when available.

## Scope

In scope:
- AI SDK / assistant-ui transport payload shape for streaming
- IPC payload shape for `chat:start-stream`
- Main handler logic to load state and append/resume
- Minimal tests for the new contract

Out of scope (for this proposal):
- Edit previous message / branching UI
- Multi-device concurrency resolution
- Changing the learning workflow architecture beyond input/resume wiring

## Acceptance Criteria

- Streaming calls do not require sending full history each turn (delta-only input is supported).
- Conversation history is still displayed correctly after refresh (via `chat:get-messages` hydration).
- Interrupt/resume works reliably: short replies like `"yes"` resume the pending node and do not trigger topic parsing.
- Existing sessions continue to work during the migration window (if compatibility mode is implemented).
- `npm test` and `npm run lint` pass after implementation.

## Risks / Mitigations

- **Risk: "Edit/regenerate" becomes ambiguous without full history**
  - Mitigation: keep out of scope for initial migration; design a follow-up proposal for branching metadata (messageId/checkpointId).

- **Risk: Contract drift between renderer/preload/main**
  - Mitigation: define the payload shape in shared types and add handler-level contract tests.

- **Risk: History hydration differences**
  - Mitigation: add a renderer test that verifies `chat:get-messages` populates the UI conversation store before streaming.

