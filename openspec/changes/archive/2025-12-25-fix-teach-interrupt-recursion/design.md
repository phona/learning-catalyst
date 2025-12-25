# Design: Teach Interrupt Control-Flow Safety

## Context

LangGraph `interrupt()` is not a normal function return.
It pauses execution by throwing a `GraphInterrupt` (control flow).

So this pattern is dangerous:

```
try { await interrupt(...) } catch { /* continue */ }
```

Because it catches the expected `GraphInterrupt` and the graph never pauses.

## Design Goal

Make teach subgraph pause/resume reliable:

- In graph context: `interrupt()` MUST bubble up as `GraphInterrupt`
- Outside graph context (unit tests): we MAY choose to swallow the specific “outside context” error to allow direct node calls, but we must not hide other failures (like missing checkpointer)

## Options

### Option A: Remove try/catch around interrupt

Pros:
- Most correct and matches LangGraph docs
- Misuse is loud (tests or callers fail fast)

Cons:
- Any direct node calls (unit tests) will throw and must be rewritten to use a real StateGraph run + resume

### Option B: Narrow catch + rethrow GraphInterrupt (recommended)

Implementation intent (conceptual):

- If error is `GraphInterrupt` -> rethrow
- Else if error message indicates `interrupt()` was called outside graph context -> swallow (test convenience)
- Else -> rethrow (don’t hide real graph config issues like missing checkpointer)

Pros:
- Fixes the production bug with minimal behavior change
- Keeps existing “unit tests call node directly” viable (if the team still wants them)

Cons:
- Still permits a non-graph usage mode (but limited)

## Chosen Approach

Option B for this change, because it is minimal and focused:
- It fixes the recursion-limit crash directly.
- It does not require rewriting every existing teach unit test immediately.
- It aligns with `openspec/specs/test-infrastructure` guidance: tests that validate interrupt behavior must use StateGraph streaming + resume.

## Test Strategy

Add a regression test that:

1) Builds a tiny StateGraph containing the teach subgraph (or the handleQuestion node)
2) Runs `graph.stream(initialState, { streamMode: 'updates', configurable: { thread_id } })`
3) Asserts an interrupt event is emitted
4) Resumes with `graph.stream(new Command({ resume: "<text>" }), ...)`
5) Asserts state updates reflect the resume value (ex: `userAnswer` populated)

## Documentation

Update `src/main/services/domain/workflow/README.md` with an “Interrupt / Resume” section:

- `interrupt()` throws `GraphInterrupt` (control-flow)
- never swallow it
- use `isGraphInterrupt` when catching
- resume using `Command({ resume })`

