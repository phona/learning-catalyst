# chat-turn-stream-termination Specification

## Purpose
Ensure chat streams end promptly when a workflow pauses at LangGraph `interrupt()`, so the UI can stop streaming and accept user input without delay, while staying compatible with the AI SDK v5-style data stream protocol used in this repo.

## ADDED Requirements

### Requirement: Interrupt Ends the Current Turn Stream
When a workflow run reaches `interrupt()`, the `chat:start-stream` streaming transport MUST end the current stream promptly (by emitting a `finish` chunk once and closing the stream/port), without waiting for the user to respond.

**Priority**: P0 (Critical)
**Effort**: M
**Related**: `chat-transport-bucket2` (resume via `Command({ resume })`), `workflow-interrupt-control-flow` (interrupt pauses execution)

#### Scenario: Streaming Explain Then Interrupt Ends Stream
- **Given** a chat run streams assistant content using `text-start`/`text-delta`/`text-end`
- **And** the workflow then calls `interrupt()` to wait for user input
- **When** the interrupt point is reached
- **Then** the main process emits a `finish` chunk promptly
- **And** the stream closes without waiting for a user reply
- **And** the UI can immediately accept user input

#### Scenario: User Reply Resumes in a New Stream
- **Given** a chat run ended due to a workflow `interrupt()`
- **When** the user sends the next delta reply on the same `conversationId=X`
- **Then** the main process resumes using `Command({ resume: "<user text>" })`
- **And** a new stream starts for the resumed execution

---

### Requirement: Finish Is Emitted Exactly Once Per Stream
The main process MUST emit at most one `finish` chunk for a given chat stream, even when errors occur.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Normal Completion Emits One Finish
- **Given** a workflow run completes normally (no interrupt)
- **When** the stream ends
- **Then** exactly one `finish` chunk is emitted

#### Scenario: Transport Error Emits One Finish
- **Given** a transport/runtime error occurs during streaming
- **When** the handler emits an `error` chunk
- **Then** exactly one `finish` chunk is emitted
- **And** the stream is closed

