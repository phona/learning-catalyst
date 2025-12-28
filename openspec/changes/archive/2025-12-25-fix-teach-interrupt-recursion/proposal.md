# Proposal: Fix Teach Subgraph Interrupt Swallowing (Recursion Limit Crash)

## Why

We can hit a production crash where the teach flow loops until LangGraph stops it:

- Repeating logs like:
  - `teach:classifyResponse empty response`
  - `Skipping interrupt in non-graph context`
- Then:
  - `GraphRecursionError: Recursion limit of 25 reached without hitting a stop condition`

This is a control-flow bug, not an AI/content bug.

## Current Problem (simple picture)

What we want:

```
HANDLE_QUESTION -> interrupt(wait for user reply)
user: "..."
-> resume with Command({ resume: "..." })
-> continue
```

What happens today in the crash case:

```
HANDLE_QUESTION
  calls interrupt()
  catch swallows GraphInterrupt
  -> returns userAnswer = ""

CLASSIFY_RESPONSE sees ""
  -> teachIntent = confused

route confused -> HANDLE_QUESTION -> CLASSIFY_RESPONSE -> ... repeats
-> hits recursion limit (25)
```

## Repro Notes (minimal)

This crash happens when execution reaches `teach.handleQuestion` inside a compiled graph run (with a checkpointer), because the node should pause on `interrupt()` but instead continues.

Minimal conditions to reproduce:

- Enter TEACH mode with any valid `topic`
- Provide a user input that routes to `HANDLE_QUESTION` (classified as `question` or `confused`)
- Observe the run loops without waiting for human resume input, until the default LangGraph recursion limit (25) is hit

Expected signature logs:
- `teach:classifyResponse empty response` repeats (because the node returns `userAnswer: ""`)
- `GraphRecursionError` with `GRAPH_RECURSION_LIMIT`

## Root Cause

LangGraph `interrupt()` pauses execution by throwing a `GraphInterrupt`.

In `teach/nodes/handleQuestion.ts`, `interrupt()` is wrapped in a broad `try/catch` that treats *all* thrown values as “non-graph context”, so it also catches the expected `GraphInterrupt` and continues.

That prevents the graph from actually pausing and forces `userAnswer` to stay empty, which drives the loop.

## What Changes (high level)

1) Teach node behavior:
- Do not swallow LangGraph control-flow errors (`GraphInterrupt`).
- Only swallow the specific “Called interrupt() outside the context of a graph.” error (for unit-test direct calls), and rethrow everything else.

2) Tests:
- Add/adjust at least one graph-level regression test that proves:
  - `HANDLE_QUESTION` produces an interrupt event
  - the graph pauses (does not loop / does not hit recursion limit)
  - resuming with `Command({ resume })` continues normally

3) Docs:
- Update `src/main/services/domain/workflow/README.md` to include LangGraph interrupt best practices:
  - `interrupt()` throws `GraphInterrupt` (control flow)
  - never catch-all around `interrupt()`
  - if catching, rethrow `GraphInterrupt` (use `isGraphInterrupt`)
  - resume pattern: `graph.stream(new Command({ resume }))`

## Scope

In scope:
- Fix teach `handleQuestion` interrupt handling so teach pauses correctly
- Regression test coverage for the teach pause/resume path
- Workflow README best-practice update (interrupt/resume)

Out of scope:
- UI changes
- New production dependencies
- Refactors unrelated to interrupt/resume control flow

## Acceptance Criteria

- Teach flow no longer crashes with `GRAPH_RECURSION_LIMIT` in the reproduce case.
- There is an automated test that would fail on the buggy behavior and passes with the fix.
- Docs update is present in `src/main/services/domain/workflow/README.md`.
- After implementation: `npm test` and `npm run lint` pass.

## Risks / Mitigations

- Risk: behavior changes for any code path that calls the teach node outside a graph context.
  - Mitigation: limit the catch to *only* the known “outside graph context” error; rethrow everything else.
