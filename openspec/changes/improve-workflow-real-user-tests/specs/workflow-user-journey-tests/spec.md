# workflow-user-journey-tests Specification

## Purpose
Add “real user journey” tests for the learning workflow to reduce regressions in streaming, interrupt, resume, and checkpoint persistence behavior.

These tests focus on the workflow engine behavior (LangGraph) and the data we persist (messages + pending interrupt prompt), not UI layout.

## ADDED Requirements

### Requirement: Journey Tests Use Stream + Interrupt + Resume
The test suite MUST include at least one journey test that:
- runs the compiled workflow via `graph.stream(..., streamMode: "updates")`
- stops when an interrupt event is emitted
- resumes via `Command({ resume })`
- asserts message history order and checkpoint persistence

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Standard Path With Teach Loop
- **Given** a new thread starts on the standard learning path (not fast-track)
- **When** the workflow reaches a Teach interrupt
- **And** the user resumes with a question
- **And** the workflow reaches another Teach interrupt
- **And** the user resumes with “ready”
- **Then** the workflow proceeds to Practice and emits the next interrupt
- **And** the checkpoint contains messages in chronological order for each resume

---

### Requirement: Fast-Track Quiz Has Pass + Fail Journey Coverage
The test suite MUST include journey coverage for the fast-track quiz path for both outcomes:
- mastery high enough to complete
- mastery low enough to fall back to Teach

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Fast-Track Pass Routes To Complete
- **Given** a thread starts with confidence at or above the fast-track threshold
- **When** the workflow reaches the FastTrackQuiz interrupt
- **And** the user resumes with quiz answers
- **Then** GradeQuiz runs
- **And** the workflow routes to Complete when mastery meets the completion threshold

#### Scenario: Fast-Track Fail Routes To Teach
- **Given** a thread starts with confidence at or above the fast-track threshold
- **When** the workflow reaches the FastTrackQuiz interrupt
- **And** the user resumes with quiz answers
- **Then** GradeQuiz runs
- **And** the workflow routes to Teach when mastery is below the completion threshold

---

### Requirement: Pending Interrupt Prompt Is Recoverable On Refresh
The test suite MUST include unit coverage for extracting the pending interrupt prompt from a checkpoint tuple so a refreshed UI can re-render “what the assistant asked” while waiting for user input.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Refresh While Waiting Shows Prompt
- **Given** a workflow run reaches an interrupt and writes a checkpoint
- **When** the checkpoint tuple is loaded
- **Then** `getPendingInterruptPrompt()` returns a non-empty prompt string

---

### Requirement: Message History Invariants For Interrupt/Resume
For interrupt-driven nodes, the persisted message history MUST include the assistant prompt and user reply as messages, in chronological order.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Resume Persists Prompt Then Reply
- **Given** an interrupt emits a prompt string
- **When** the workflow resumes with a user reply string
- **Then** messages contain `AIMessage(prompt)` followed by `HumanMessage(reply)`
- **And** the checkpoint includes the resumed `HumanMessage(reply)`

---

### Requirement: Routing Boundary Tests Cover Threshold Edges
The test suite MUST include boundary tests around the routing thresholds used by the workflow.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Confidence Threshold Boundary
- **Given** the Assess node sets confidence to exactly the fast-track threshold
- **Then** routing selects the fast-track quiz path
- **And** if confidence is slightly below the threshold, routing selects the standard teaching path

#### Scenario: Mastery Threshold Boundary
- **Given** mastery is exactly the completion threshold
- **Then** routing selects Complete
- **And** if mastery is slightly below the threshold, routing selects Practice

