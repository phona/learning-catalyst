# workflow-interrupt-control-flow Specification

## Purpose
TBD - created by archiving change fix-teach-interrupt-recursion. Update Purpose after archive.
## Requirements
### Requirement: Teach Question Handling Pauses via LangGraph Interrupt
When the teach flow reaches a point where it needs a user follow-up (after answering a question or clarifying confusion), it MUST pause by emitting a LangGraph interrupt event, not continue execution with an empty resume value.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: HandleQuestion Emits Interrupt (No Swallow)
- **Given** a compiled graph run reaches `teach.handleQuestion`
- **When** the node calls `interrupt({ type: "teach_followup", ... })`
- **Then** the stream emits an interrupt event
- **And** the graph pauses (does not loop into `classifyResponse` again before resume)

### Requirement: Teach Does Not Crash with GRAPH_RECURSION_LIMIT During Follow-Up
The teach subgraph MUST NOT loop until `GraphRecursionError` when it is waiting for user input. It MUST pause on `interrupt()` instead.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Waiting For User Input Does Not Hit Recursion Limit
- **Given** the teach subgraph has produced a follow-up prompt
- **When** the workflow is executed up to the follow-up step
- **Then** it pauses on an interrupt event
- **And** it does not throw `GRAPH_RECURSION_LIMIT`

### Requirement: Workflow README Documents Interrupt Best Practices
The workflow best-practices README MUST document the correct `interrupt()` / `Command({ resume })` patterns so the team does not reintroduce interrupt swallowing.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: README Has Interrupt Guidance
- **Given** the workflow documentation file
- **When** a contributor reads the interrupt/resume section
- **Then** it clearly states that `interrupt()` throws `GraphInterrupt` (control flow)
- **And** it warns against catch-all `try/catch` around `interrupt()`
- **And** it shows resuming with `new Command({ resume: "<text>" })`

