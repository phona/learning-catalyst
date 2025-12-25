# Capability: Interrupt Resume Test Coverage

## ADDED Requirements

### Requirement: `chat:start-stream` Resume Path Is Tested
When a workflow has a pending `interrupt()` for the current `thread_id`, the `chat:start-stream` IPC handler MUST resume the workflow using LangGraph `Command({ resume })`, and this behavior MUST be covered by an automated test.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Pending Interrupt + User Reply Uses Resume Mode
- **Given** a workflow checkpoint exists for `thread_id=X` with a pending interrupt
- **And** the user sends a follow-up message `"yes"` on the same `conversationId=X`
- **When** `chat:start-stream` is invoked
- **Then** the handler calls `workflowGraph.stream()` with `new Command({ resume: "yes" })`
- **And** the handler does not start a new topic parse run for `"yes"`.

### Requirement: Resume Tests Use Real LangGraph Resume API
Any test that claims to validate "resume after interrupt" MUST provide resume input using LangGraph `Command({ resume })` (not by re-invoking the graph with `null`/empty input and assuming a resume value is applied).

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Resume Test Passes `Command({ resume })`
- **Given** a graph run emits an interrupt event
- **When** the test continues execution
- **Then** the test resumes using `graph.stream(new Command({ resume: "<user text>" }))`
- **And** the resumed node sees the resume text as its user input.
