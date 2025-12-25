# Proposal: Add Interrupt Resume Test Coverage (chat:start-stream)

## Why

We hit a real bug in the learning chat:

- Assistant asks: “Do you have questions, or want to practice?”
- User replies: `yes`
- Session ends with: `I couldn't find learning materials for "yes"...`

That is a logic bug, not a missing-content problem.

The workflow had paused on `interrupt()` (waiting for the next user reply), but the app treated the reply as a **new topic query** and ran `TOPIC_PARSE("yes")`.

## Current Problem (simple picture)

What we want:

```
TEACH/explain -> interrupt(waiting)
user: "yes"
-> resume interrupt with "yes"
-> continue teach/practice
```

What we have today:

```
TEACH/explain -> interrupt(waiting)
user: "yes"
-> START -> TOPIC_PARSE("yes")
-> no matches -> error -> COMPLETE("Learning session ended...")
```

## Root Cause (where the gap is)

The bug is in the glue layer:

- `chat:start-stream` always calls `workflowGraph.stream({ messages: ... })`
- It does **not** detect “pending interrupt exists” for the current `thread_id`
- It does **not** resume using LangGraph `Command({ resume: ... })`

So any short reply like `yes`, `ok`, `sure` is interpreted as a topic string, and topic parsing can fail.

## Why Our Tests Did Not Catch It

### 1) No test executes the real IPC handler flow

Existing handler tests focus on:
- thread id mapping
- checkpoint readback for message history

They do not invoke `chat:start-stream` with a fake port and check what input is passed to the workflow.

### 2) Workflow tests mock topic parsing to always succeed

Many workflow tests mock:

- `knowledgeService.findRelatedByPrompt()` to always return matches

So `TOPIC_PARSE("yes")` never produces the error path in tests, even though it can in production.

### 3) “Resume” tests do not consistently use real resume API

LangGraph `interrupt()` expects resume input via:

```
graph.stream(new Command({ resume: "..." }))
```

Some existing tests labeled as “resume” do not actually pass `Command({ resume })` input, so they cannot validate that the app resumes correctly.

## What Changes

Add tests that cover the missing contract:

### 0) Fix: Resume pending interrupts in `chat:start-stream`
Update the `chat:start-stream` IPC handler so that when there is a pending workflow interrupt for the current `thread_id`, it resumes execution using LangGraph `Command({ resume: <user text> })` instead of starting a new run from `START -> TOPIC_PARSE`.

### A) Handler-level interrupt resume test (fake IPC channel)

Create a test that:

1) Mocks `checkpointSaver.getTuple()` to indicate a pending interrupt
2) Calls the registered `chat:start-stream` handler with a last user message `"yes"`
3) Asserts `workflowGraph.stream()` was called in **resume mode** (via `Command({ resume: "yes" })`)

This test is small, fast, and targets the real failure point (the IPC glue code).

### B) Workflow-level resume tests (Command resume)

Fix/extend workflow tests to:

- resume after interrupts using `new Command({ resume })`
- assert state updates after resume (ex: `userAnswer` becomes the resume value)

### C) Optional regression test

Add a regression test that ensures a follow-up reply like `"yes"` does not cause the topic-parse error message when an interrupt is pending.

## Scope

In scope:
- Tests for `chat:start-stream` resume behavior
- Tests for LangGraph resume (`Command`) behavior in workflow nodes/subgraphs
- Adjust existing “resume” tests that do not pass resume input correctly

Out of scope:
- UI changes
- New production dependencies
- Refactors unrelated to resume / interrupt behavior

## Acceptance Criteria

- There is at least one test that fails on the buggy behavior:
  - pending interrupt + user reply -> handler must call workflow in resume mode
- The production fix is implemented:
  - pending interrupt + user reply -> `chat:start-stream` resumes with `Command({ resume })`
- Workflow resume tests use `Command({ resume })` (not “fake resume” patterns)
- `npm test` and `npm run lint` pass after implementation

## Risks / Mitigations

- Risk: tests become brittle if LangGraph event shapes change
  - Mitigation: assert minimal stable behavior (input passed to `workflowGraph.stream`, and presence of `resume` value), avoid asserting exact internal event objects
