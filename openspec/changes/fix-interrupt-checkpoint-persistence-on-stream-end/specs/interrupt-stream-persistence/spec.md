# interrupt-stream-persistence Specification

## Purpose
Prevent regressions where ending a “turn stream” at a LangGraph interrupt cancels the upstream stream too early and causes interrupt checkpoints (or equivalent post-interrupt persistence) to be lost.

## Requirements

### Requirement: Turn Stream Ends Promptly On Interrupt
When an interrupt event is observed in the workflow stream, the adapter MUST stop yielding UI chunks immediately so the transport can send `finish` promptly.

**Priority**: P0

#### Scenario: Stop Yielding On Interrupt
- **Given** an upstream stream emits `custom` chunks and then an `updates` interrupt event
- **When** `toAssistantUIStream()` processes the stream
- **Then** it yields no further chunks after the interrupt boundary

---

### Requirement: Do Not Cancel Upstream Synchronously On Interrupt
The adapter MUST NOT synchronously call (or trigger) `iterator.return()` on the upstream iterator at the moment the interrupt boundary is detected.

**Priority**: P0

#### Scenario: Upstream Not Cancelled Immediately
- **Given** an upstream stream where “persist interrupt checkpoint” happens asynchronously right after the interrupt event
- **When** `toAssistantUIStream()` ends the turn stream on interrupt
- **Then** the upstream is not cancelled immediately
- **And** the async persistence is allowed to complete

---

### Requirement: Regression Test Models Cancel-Sensitive Persistence
The test suite MUST include a deterministic fake upstream iterator that:
- emits an interrupt event
- schedules a “persistence completed” flag on a timer
- treats early cancellation as “persistence lost”

**Priority**: P0

#### Scenario: Cancel-Sensitive Regression Test
- **Given** the cancel-sensitive fake upstream stream
- **When** the adapter ends on interrupt
- **Then** tests can distinguish “cancel too early” vs “allowed to persist”

