# workflow-interrupt-message-persistence Specification

## Purpose
Ensures user messages exchanged during LangGraph interrupt/resume cycles are persisted to checkpoints, enabling complete conversation history retrieval after page refresh.

## ADDED Requirements

### Requirement: Workflow Nodes Persist User Reply After Interrupt
Workflow nodes that use `interrupt()` to wait for user input MUST return both the user's reply and the assistant's response in the `messages` array to ensure complete conversation history is persisted to checkpoints.

**Priority**: P0 (Critical)
**Effort**: M
**Related**: `chat-transport-bucket2` - "Refresh Still Shows Full History"

#### Scenario: Practice Node Returns Both Messages After Interrupt
- **Given** the practice workflow is paused on `interrupt()` waiting for user's answer
- **When** the workflow resumes with user's reply "the answer is 42"
- **Then** the node returns `{ messages: [new AIMessage(prompt), new HumanMessage("the answer is 42")] }`
- **And** the checkpoint contains both the assistant prompt and the user's reply

#### Scenario: Teach Node Returns Both Messages After Follow-Up
- **Given** the teach workflow is paused on `interrupt()` after user asks a question
- **When** the workflow resumes with user's follow-up "can you clarify?"
- **Then** the node returns `{ messages: [new AIMessage(prompt), new HumanMessage("can you clarify?")] }`
- **And** the checkpoint contains both the assistant prompt and the user's follow-up

#### Scenario: Fast Track Quiz Returns Both Messages After Quiz Question
- **Given** the fast track quiz is paused on `interrupt()` waiting for user's quiz answer
- **When** the workflow resumes with user's answer "option b"
- **Then** the node returns `{ messages: [new AIMessage(prompt), new HumanMessage("option b")] }`
- **And** the checkpoint contains both the quiz prompt and the user's answer

---

### Requirement: Message Return Order Preserves Conversation Chronology
When returning messages after an interrupt, nodes MUST preserve the order the user saw in the UI (usually: assistant prompt first, then user reply).

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: HumanMessage Precedes AIMessage in Return Array
- **Given** a node calls `interrupt({ prompt: "Your question" })` to show a prompt
- **When** the node resumes with user's reply "yes"
- **Then** the node returns `{ messages: [new AIMessage("Your question"), new HumanMessage("yes")] }`
- **And** the messages reducer appends them in order: `[..., AIMessage, HumanMessage]`
- **And** the conversation history shows the prompt before the reply

---

### Requirement: All Interrupt Return Paths Include HumanMessage
Workflow nodes with multiple return paths after `interrupt()` (e.g., early returns, error handling, completion states) MUST include `HumanMessage` in ALL paths that follow an actual `interrupt()` call.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: HandleConversation Includes HumanMessage in All Return Paths
- **Given** the `handleConversation` node has three return paths after interrupt:
  - Path A: Max conversation turns reached
  - Path B: User gives up (isComplete)
  - Path C: Normal conversation flow
- **When** any of these paths execute after receiving user input via `interrupt()`
- **Then** all three paths return `{ messages: [new HumanMessage(userAnswer), new AIMessage(...)] }`
- **And** no path omits the `HumanMessage`

#### Scenario: Early Return Before Interrupt Excludes HumanMessage
- **Given** a node has an early return path that executes BEFORE reaching `interrupt()`
- **When** the early return condition is met (e.g., validation error)
- **Then** the node returns `{ messages: [new AIMessage(errorMessage)] }` (no `HumanMessage`)
- **And** this is correct because no user input was received yet

---

### Requirement: Workflow README Documents Interrupt Message Pattern
The workflow README MUST document the correct pattern for returning messages after `interrupt()` to prevent future developers from omitting `HumanMessage` from return statements.

**Priority**: P2 (Medium)
**Effort**: S
**Related**: `workflow-interrupt-control-flow` - "Workflow README Documents Interrupt Best Practices"

#### Scenario: README Shows Correct Interrupt Message Pattern
- **Given** the workflow documentation file at `src/main/services/domain/workflow/README.md`
- **When** a contributor reads the "Interrupt and Message Persistence" section
- **Then** it shows the pattern: `return { messages: [new HumanMessage(userAnswer), new AIMessage(content)] }`
- **And** it explains why: "Without HumanMessage, user's reply is not saved to checkpoints"
- **And** it warns: "Always return HumanMessage before AIMessage for chronological order"

---

### Requirement: Tests Verify Interrupt Message Persistence
Test suites for workflow nodes using `interrupt()` MUST verify that both `HumanMessage` and `AIMessage` are returned after resume, ensuring message persistence is caught by tests.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Unit Test Verifies Message Types After Interrupt
- **Given** a unit test for a node that uses `interrupt()`
- **When** the test mocks `interrupt()` to return a user reply
- **Then** the test asserts `result.messages[0]` is instance of `AIMessage` (prompt)
- **And** the test asserts `result.messages[1]` is instance of `HumanMessage` (reply)
- **And** the test fails if either message type is missing

#### Scenario: Integration Test Verifies Checkpoint Contains User Reply
- **Given** an integration test that starts a workflow and resumes after interrupt
- **When** the test retrieves the checkpoint after resume
- **Then** the test verifies the checkpoint's `channel_values.messages` array contains the user's reply
- **And** the test verifies the user's reply is a `HumanMessage` with correct content
- **And** the test verifies message order matches what the user saw (prompt before reply)
