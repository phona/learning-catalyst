# chat-thread-continuity Specification

## Purpose
Ensure multi-turn conversations maintain context and state across messages by correctly resuming from existing workflow checkpoints instead of restarting from the beginning.

## ADDED Requirements

### Requirement: Chat Handler Resumes From Existing Checkpoint
When a user sends a message to an existing conversation (one with a prior checkpoint), the chat handler MUST resume the workflow from the checkpoint using `Command({ resume })` instead of starting a fresh workflow with `{ messages }`.

**Priority**: P0 (Critical)
**Effort**: S
**Related**: `chat-transport-bucket2` - "Interrupt Resume Uses `Command({ resume })`"

#### Scenario: Second Message Resumes Workflow
- **Given** an existing conversation with `conversationId="thread_123"` that has a checkpoint
- **And** the workflow is paused at an interrupt in the TEACH subgraph
- **When** the user sends a second message "how to install python"
- **Then** the handler detects an existing checkpoint for `thread_123`
- **And** the handler calls `workflow.stream(new Command({ resume: "how to install python" }), config)`
- **And** the workflow resumes from the TEACH interrupt (does not restart from START)
- **And** the TEACH subgraph's `explainNode` receives "how to install python" as the resume value

#### Scenario: First Message Starts Fresh Workflow
- **Given** a new conversation with `conversationId="thread_456"` that has no prior checkpoint
- **When** the user sends the first message "how to learn python"
- **Then** the handler finds no checkpoint for `thread_456`
- **And** the handler calls `workflow.stream({ messages: [new HumanMessage("how to learn python")] }, config)`
- **And** the workflow starts from START → TOPIC_PARSE → ASSESS → PLAN → TEACH

---

### Requirement: Resume Logic Uses Checkpoint Existence
The chat handler MUST determine whether to resume based on the existence of a checkpoint for the conversation, NOT based on whether there is a pending interrupt.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Checkpoint Exists Triggers Resume
- **Given** an existing conversation with a checkpoint
- **When** the handler checks if it should resume for a new message
- **Then** `shouldResume` returns `true` because `checkpointTuple` exists
- **And** the handler does NOT call `hasPendingInterrupt()`

#### Scenario: No Checkpoint Triggers Fresh Start
- **Given** a new conversation with no checkpoint
- **When** the handler checks if it should resume for a new message
- **Then** `shouldResume` returns `false` because `checkpointTuple` is null
- **And** the handler starts a fresh workflow

#### Scenario: Empty Message Does Not Resume
- **Given** an existing conversation with a checkpoint
- **When** the user sends an empty or whitespace-only message
- **Then** `shouldResume` returns `false` because `lastUserText.trim().length > 0` is false
- **And** the handler does not attempt to resume with empty input

---

### Requirement: Conversation State Persists Across Messages
When a workflow resumes from a checkpoint, the conversation state (teaching round, gaps, topic, user understanding level) MUST be preserved and NOT reset to initial values.

**Priority**: P0 (Critical)
**Effort**: M
**Related**: `workflow-interrupt-message-persistence` - "Workflow Nodes Persist User Reply After Interrupt"

#### Scenario: Teaching Round Increases On Resume
- **Given** a conversation where `teachingRound = 1` after the first message
- **When** the user sends a second message and the workflow resumes
- **Then** the resumed workflow has `teachingRound = 2` (incremented, not reset)
- **And** the TEACH subgraph does not restart from `teachingRound = 0`

#### Scenario: Topic Remains Consistent On Resume
- **Given** a conversation with `topic = "python"` established in the first message
- **When** the user sends "how to install javascript" as the second message
- **Then** the workflow resumes with `topic = "python"` (topic does not change)
- **And** the TEACH subgraph classifies the question as "question" intent
- **And** the system provides installation guidance while staying in Python context

#### Scenario: Gaps and Understanding Persist Across Messages
- **Given** a conversation where `gaps = ["variables", "loops"]` was identified
- **When** the user sends a follow-up question
- **Then** the resumed workflow still has access to `gaps = ["variables", "loops"]`
- **And** subsequent explanations can reference these gaps

---

### Requirement: User Experience Maintains Conversation Flow
From the user's perspective, a multi-turn conversation MUST feel continuous and contextual, like a natural dialogue, NOT a series of disconnected explanations that restart from scratch each time.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Follow-Up Questions Are Handled In Context
- **Given** the user received an explanation about Python basics
- **When** the user asks "how to install python" as a follow-up
- **Then** the assistant responds with installation guidance
- **And** the assistant does NOT restart the Python basics explanation
- **And** the assistant may reference the previous explanation (e.g., "Now that you understand the basics, let's get Python installed...")

#### Scenario: Conversation History Is Visible
- **Given** a conversation with multiple message exchanges
- **When** the user sends a new message
- **Then** all previous messages remain visible in the chat UI
- **And** the new message appears after the previous messages (not replacing them)
- **And** the conversation reads chronologically from top to bottom
