# Capability: Chat Transport Uses Backend-Owned State (Bucket 2)

## ADDED Requirements

### Requirement: Streaming Input Is Delta-Based
The streaming IPC call for chat MUST support sending only the new user message (delta) plus `conversationId` instead of requiring the full message history on every turn.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: UI Sends Only New Message
- **Given** an existing conversation with `conversationId=X`
- **When** the user sends a new message `"yes"`
- **Then** the renderer/preload sends a streaming payload containing `conversationId=X`
- **And** the payload contains only the new user message content (not the full history).

### Requirement: Main Process Owns Canonical Conversation State
The main process MUST treat LangGraph checkpoint state as canonical for a conversation and MUST not require the renderer to replay full history to maintain correctness.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Refresh Still Shows Full History
- **Given** a conversation `conversationId=X` has prior messages stored in checkpoints
- **When** the user reloads the app or re-opens the conversation
- **Then** the UI retrieves history via `chat:get-messages(X)`
- **And** the chat view shows the complete prior conversation.

### Requirement: Interrupt Resume Uses `Command({ resume })`
When a pending workflow interrupt exists for `conversationId=X`, the main process MUST resume using LangGraph `Command({ resume })` with the next user message delta.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Short Reply Resumes Interrupt
- **Given** the workflow for `conversationId=X` is paused on `interrupt()`
- **When** the user sends the delta message `"yes"`
- **Then** the main process resumes with `Command({ resume: "yes" })`
- **And** it does not run topic parsing for `"yes"`.

