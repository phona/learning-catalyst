# stream-cancellation-contract Specification

## Purpose
TBD - created by archiving change fix-assistant-ui-stop-cancel. Update Purpose after archive.
## Requirements
### Requirement: AbortSignal Cancels Renderer Stream
If the UI aborts the in-flight request (AbortSignal), the renderer transport MUST cancel the stream and MUST stop emitting additional bytes/chunks to the consumer.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Stop Button Aborts Stream
- **Given** a chat response is streaming to the UI
- **And** the request is created with an AbortSignal
- **When** the AbortSignal is aborted (user clicks Stop)
- **Then** the renderer cancels the active stream
- **And** no additional stream bytes are enqueued after abort

---

### Requirement: Main Supports Cancel By streamId
The main process MUST expose a cancel mechanism keyed by a per-stream identifier (e.g., `streamId`) so the backend can stop work when the UI cancels.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: Cancel Stops Backend Streaming
- **Given** a stream is started with a `streamId`
- **When** the renderer requests cancellation for that `streamId`
- **Then** main stops generating further chunks for that stream
- **And** main closes the stream transport for that stream

---

### Requirement: Exactly One Terminal Chunk Per Stream
For any single stream, the system MUST emit at most one terminal chunk (`finish`, `abort`, or `error`), and it MUST be consistent with the reason the stream ended.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Cancel Emits abort Only
- **Given** a stream is actively generating
- **When** it is cancelled by the user
- **Then** the terminal chunk is `abort`
- **And** `finish` is not emitted for that same stream

